import MonacoEditor, { OnMount, EditorProps } from '@monaco-editor/react'
import { createATA } from './ata';
import * as monaco from 'monaco-editor';
import { Position } from 'monaco-editor';
import aiService from '../../../services/AIService';

export interface EditorFile {
    name: string
    value: string
    language: string
}

interface Props {
    file: EditorFile
    onChange?: EditorProps['onChange'],
    options?: monaco.editor.IStandaloneEditorConstructionOptions,
    onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void
}

interface AICompletionRequest {
    code: string;
    position: Position;
    wordUntilPosition: monaco.editor.IWordAtPosition;
}

async function fetchAISuggestions(request: AICompletionRequest): Promise<string[]> {
    try {
        // 使用 AI 服务获取代码补全建议
        return await aiService.getCodeCompletion({
            code: request.code,
            position: request.position,
            wordAtPosition: request.wordUntilPosition
        });
    } catch (error) {
        console.error('Failed to fetch AI suggestions:', error);
        return [];
    }
}

export default function Editor(props: Props) {
    const { file, onChange, options, onMount } = props;

    const handleEditorMount: OnMount = (editor, monacoInstance) => {
        // 调用外部传入的 onMount 回调
        if (onMount) {
            onMount(editor);
        }

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
