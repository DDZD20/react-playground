import MonacoEditor, { OnMount, EditorProps } from '@monaco-editor/react'
import { createATA } from './ata';
import * as monaco from 'monaco-editor';
import { Position } from 'monaco-editor';

export interface EditorFile {
    name: string
    value: string
    language: string
}

interface Props {
    file: EditorFile
    onChange?: EditorProps['onChange'],
    options?: monaco.editor.IStandaloneEditorConstructionOptions
}

interface AICompletionRequest {
    code: string;
    position: Position;
    wordUntilPosition: monaco.editor.IWordAtPosition;
}

async function fetchAISuggestions(request: AICompletionRequest): Promise<string[]> {
    // 获取光标前的代码上下文（最多前5行）
    const currentLineNumber = request.position.lineNumber;
    const startLine = Math.max(1, currentLineNumber - 5);
    const lines = request.code.split('\n');
    
    // 获取当前行到光标位置的文本
    const currentLineUntilCursor = lines[currentLineNumber - 1]?.slice(0, request.position.column - 1) || '';
    
    // 获取前面几行的上下文
    const previousLines = lines.slice(startLine - 1, currentLineNumber - 1);
    
    // 组合上下文，确保当前行在最后
    const contextCode = [...previousLines, currentLineUntilCursor].join('\n');
    
    const options = {
        method: 'POST',
        headers: {
            Authorization: 'Bearer sk-hwgtlynsdffsfwnhesyavbxmvhuvvshqgbjpbaesdwndijrt',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "Qwen/Qwen2.5-Coder-7B-Instruct",
            stream: false,
            max_tokens: 512,
            temperature: 0.6, // 降低温度以获得更精确的补全
            top_p: 0.7,
            top_k: 50,
            frequency_penalty: 0.5,
            n: 1,
            messages: [{
                role: "user",
                content: `作为代码补全助手，请根据以下TypeScript/JavaScript代码片段，补全光标位置之后的代码。

规则：
1. 只输出补全的代码，不要有任何注释或解释
2. 补全必须是语法正确的代码片段
3. 补全应该是当前上下文中最可能的下一部分代码
4. 如果是在写函数调用，优先补全上下文中已存在的函数
5. 如果是在写对象属性，优先使用上下文中已出现的属性名
6. 补全长度应该在1-3行之间
7. 一定要切记不要重复我给你的代码，只需要返回补全的代码

当前代码上下文（|表示光标位置）:
\`\`\`typescript
${contextCode}|
\`\`\``
            }]
        })
    };

    try {
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
        if (!response.ok) {
            throw new Error('AI service request failed');
        }

        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
            // 提取代码内容，移除可能的代码块标记和多余空白
            const content = data.choices[0].message.content;
            const codeMatch = content.match(/```(?:javascript|typescript)?\n?([\s\S]*?)(?:\n```|$)/);
            const suggestion = codeMatch ? codeMatch[1].trim() : content.trim();
            
            // 如果建议是空的或只包含空白字符，返回空数组
            if (suggestion.length === 0 || /^\s*$/.test(suggestion)) {
                return [];
            }
            
            // 移除可能的行号和前导空格
            const cleanedSuggestion = suggestion
                .split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line && !line.match(/^\d+[\s|]+/)) // 移除可能的行号
                .join('\n');
            
            return [cleanedSuggestion];
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch AI suggestions:', error);
        return [];
    }
}

export default function Editor(props: Props) {
    const { file, onChange, options } = props;

    const handleEditorMount: OnMount = (editor, monacoInstance) => {
        editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyJ, () => {
            editor.getAction('editor.action.formatDocument')?.run()
        });

        monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monacoInstance.languages.typescript.JsxEmit.Preserve,
            esModuleInterop: true,
        });

        const inlineCompletionProvider: monaco.languages.InlineCompletionsProvider = {
            provideInlineCompletions: async (
                model: monaco.editor.ITextModel,
                position: Position,
                _context: monaco.languages.InlineCompletionContext,
                _token: monaco.CancellationToken
            ): Promise<monaco.languages.InlineCompletions> => {
                try {
                    const wordUntilPosition = model.getWordUntilPosition(position);

                    const suggestions = await fetchAISuggestions({
                        code: model.getValue(),
                        position: position,
                        wordUntilPosition: wordUntilPosition
                    });

                    return {
                        items: suggestions.map(suggestion => ({
                            insertText: suggestion,
                            range: new monacoInstance.Range(
                                position.lineNumber,
                                position.column,
                                position.lineNumber,
                                position.column
                            )
                        }))
                    };
                } catch (error) {
                    console.error('Inline completion error:', error);
                    return { items: [] };
                }
            },
            freeInlineCompletions: () => { }
        };

        const disposable = monacoInstance.languages.registerInlineCompletionsProvider(
            ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'],
            inlineCompletionProvider
        );

        editor.updateOptions({
            inlineSuggest: {
                enabled: true,
                mode: 'prefix'
            }
        });

        const ata = createATA((code, path) => {
            monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
        });

        editor.onDidChangeModelContent(() => {
            ata(editor.getValue());
        });

        ata(editor.getValue());

        return () => {
            disposable.dispose();
        };
    }

    return <MonacoEditor
        height={'100%'}
        path={file.name}
        language={file.language}
        onMount={handleEditorMount}
        onChange={onChange}
        value={file.value}
        options={{
            fontSize: 14,
            scrollBeyondLastLine: false,
            minimap: {
                enabled: false,
            },
            scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
            },
            ...options
        }}
    />
}
