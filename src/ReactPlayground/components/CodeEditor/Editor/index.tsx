import MonacoEditor, { OnMount, EditorProps } from '@monaco-editor/react'
import { createATA } from './ata';
import * as monaco from 'monaco-editor';
import { Position } from 'monaco-editor';
import aiService from '../../../services/AIService';
import { useEffect, useRef, useState } from 'react';
import { diffLines } from 'diff';
import './diffStyles.css';

export interface EditorFile {
    name: string
    value: string
    language: string
}

export interface DiffBlock {
    id: string;
    startLine: number;
    endLine: number;
    content: string;
    type: 'added' | 'removed' | 'unchanged';
    decorationIds: string[];
}

interface Props {
    file: EditorFile
    onChange?: EditorProps['onChange'],
    options?: monaco.editor.IStandaloneEditorConstructionOptions,
    onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void,
    isDiffMode?: boolean,
    originalCode?: string,
    pendingCode?: string,
    onApplyChanges?: () => void,
    onCancelChanges?: () => void
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
    const { 
        file, 
        onChange, 
        options, 
        onMount,
        isDiffMode = false, 
        originalCode = '',
        pendingCode = '',
        onApplyChanges,
        onCancelChanges
    } = props;

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([]);
    const widgetsRef = useRef<HTMLDivElement[]>([]);
    const cleanupRef = useRef<() => void>(() => {});

    // 差异编辑模式相关函数
    // 生成唯一ID
    const generateId = () => {
        return Math.random().toString(36).substring(2, 9);
    };

    // 计算差异块
    const calculateDiff = (originalCode: string, modifiedCode: string): DiffBlock[] => {
        const diffResult = diffLines(originalCode, modifiedCode);
        const blocks: DiffBlock[] = [];
        let lineNumber = 1;

        diffResult.forEach((part: any) => {
            const lines = part.value.split('\n');
            const linesCount = part.value.endsWith('\n') ? lines.length - 1 : lines.length;
            
            // 确定差异类型
            let type: 'added' | 'removed' | 'unchanged';
            if (part.added) {
                type = 'added';
            } else if (part.removed) {
                type = 'removed';
            } else {
                type = 'unchanged';
            }

            // 只添加非空的差异块
            if (linesCount > 0) {
                blocks.push({
                    id: generateId(),
                    startLine: lineNumber,
                    endLine: lineNumber + linesCount - 1,
                    content: part.value,
                    type,
                    decorationIds: []
                });
            }

            // 只有非移除的部分会影响当前行号
            if (!part.removed) {
                lineNumber += linesCount;
            }
        });

        return blocks;
    };

    // 应用装饰器到编辑器
    const applyDecorations = (editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof monacoRef.current, blocks: DiffBlock[]) => {
        if (!editor || !monaco) return;

        // 清除现有装饰器
        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        // 为每个差异块创建装饰器
        blocks.forEach(block => {
            if (block.type === 'unchanged') return;

            const range = new monaco.Range(
                block.startLine,
                1,
                block.endLine,
                1
            );

            // 根据类型设置不同的装饰器样式
            if (block.type === 'added') {
                decorations.push({
                    range,
                    options: {
                        isWholeLine: true,
                        className: 'diff-added-line',
                        glyphMarginClassName: 'diff-added-glyph',
                        zIndex: 1
                    }
                });
            } else if (block.type === 'removed') {
                decorations.push({
                    range,
                    options: {
                        isWholeLine: true,
                        className: 'diff-removed-line',
                        glyphMarginClassName: 'diff-removed-glyph',
                        zIndex: 1
                    }
                });
            }
        });

        // 应用装饰器并保存ID到每个块
        const decorationIds = editor.deltaDecorations([], decorations);
        
        let idCounter = 0;
        return blocks.map(block => {
            if (block.type !== 'unchanged') {
                return {
                    ...block,
                    decorationIds: [decorationIds[idCounter++]]
                };
            }
            return block;
        });
    };

    // 创建差异操作控件
    const createDiffActionWidgets = (editor: monaco.editor.IStandaloneCodeEditor, blocks: DiffBlock[]) => {
        // 移除现有控件
        widgetsRef.current.forEach(widget => {
            if (widget.parentElement) {
                widget.parentElement.removeChild(widget);
            }
        });
        widgetsRef.current = [];

        const editorDomNode = editor.getDomNode();
        if (!editorDomNode || !editorDomNode.parentElement) return;

        blocks.forEach(block => {
            if (block.type === 'unchanged') return;

            // 获取位置信息
            const startPosition = editor.getScrolledVisiblePosition({ lineNumber: block.startLine, column: 1 });
            if (!startPosition) return;

            // 创建控件容器
            const widget = document.createElement('div');
            widget.className = 'diff-action-widget';
            widget.style.position = 'absolute';
            widget.style.top = `${startPosition.top - 20}px`;
            widget.style.left = `${startPosition.left}px`;
            widget.dataset.blockId = block.id;

            // 创建Accept按钮
            const acceptBtn = document.createElement('button');
            acceptBtn.innerText = '接受';
            acceptBtn.className = 'diff-action-accept';
            acceptBtn.onclick = () => handleAccept(editor, block);
            widget.appendChild(acceptBtn);

            // 创建Reject按钮
            const rejectBtn = document.createElement('button');
            rejectBtn.innerText = '拒绝';
            rejectBtn.className = 'diff-action-reject';
            rejectBtn.onclick = () => handleReject(editor, block);
            widget.appendChild(rejectBtn);

            // 添加到DOM
            if (editorDomNode.parentElement) {
                editorDomNode.parentElement.appendChild(widget);
                widgetsRef.current.push(widget);
            }
        });
    };

    // 更新控件位置
    const updateWidgetPositions = (editor: monaco.editor.IStandaloneCodeEditor) => {
        widgetsRef.current.forEach(widget => {
            const blockId = widget.dataset.blockId;
            const block = diffBlocks.find(b => b.id === blockId);
            if (!block) return;

            const startPosition = editor.getScrolledVisiblePosition({ lineNumber: block.startLine, column: 1 });
            if (!startPosition) return;

            widget.style.top = `${startPosition.top - 20}px`;
            widget.style.left = `${startPosition.left}px`;
        });
    };

    // 处理接受差异块
    const handleAccept = (editor: monaco.editor.IStandaloneCodeEditor, block: DiffBlock) => {
        const model = editor.getModel();
        if (!model || !monacoRef.current) return;

        // 根据差异类型执行不同的操作
        if (block.type === 'removed') {
            // 接受删除 - 需要从编辑器中删除这段代码
            const range = new monacoRef.current.Range(
                block.startLine,
                1,
                block.endLine + 1,
                1
            );
            model.pushEditOperations([], [{ range, text: '' }], () => null);
            
            // 更新其他块的行号
            const linesToRemove = block.endLine - block.startLine + 1;
            setDiffBlocks(prev => 
                prev.map(b => {
                    if (b.startLine > block.endLine) {
                        return {
                            ...b,
                            startLine: b.startLine - linesToRemove,
                            endLine: b.endLine - linesToRemove
                        };
                    }
                    return b;
                }).filter(b => b.id !== block.id)
            );
        } else {
            // 接受添加 - 不需要做什么，因为代码已经存在
            // 只需从差异列表中移除该块
            setDiffBlocks(prev => prev.filter(b => b.id !== block.id));
        }

        // 移除该块的装饰器
        editor.deltaDecorations(block.decorationIds, []);
    };

    // 处理拒绝差异块
    const handleReject = (editor: monaco.editor.IStandaloneCodeEditor, block: DiffBlock) => {
        const model = editor.getModel();
        if (!model || !monacoRef.current) return;

        // 根据差异类型执行不同的操作
        if (block.type === 'added') {
            // 拒绝添加 - 需要从编辑器中删除这段代码
            const range = new monacoRef.current.Range(
                block.startLine,
                1,
                block.endLine + 1,
                1
            );
            model.pushEditOperations([], [{ range, text: '' }], () => null);
            
            // 更新其他块的行号
            const linesToRemove = block.endLine - block.startLine + 1;
            setDiffBlocks(prev => 
                prev.map(b => {
                    if (b.startLine > block.endLine) {
                        return {
                            ...b,
                            startLine: b.startLine - linesToRemove,
                            endLine: b.endLine - linesToRemove
                        };
                    }
                    return b;
                }).filter(b => b.id !== block.id)
            );
        } else {
            // 拒绝删除 - 不需要做什么，因为我们保留了原始代码
            // 只需从差异列表中移除该块
            setDiffBlocks(prev => prev.filter(b => b.id !== block.id));
        }

        // 移除该块的装饰器
        editor.deltaDecorations(block.decorationIds, []);
    };

    // 初始化差异编辑模式
    const initializeDiffMode = () => {
        if (!editorRef.current || !monacoRef.current || !isDiffMode) return;

        // 计算差异并应用到编辑器
        const blocks = calculateDiff(originalCode, pendingCode);
        const updatedBlocks = applyDecorations(editorRef.current, monacoRef.current, blocks);
        if (updatedBlocks) {
            setDiffBlocks(updatedBlocks);
            createDiffActionWidgets(editorRef.current, updatedBlocks);
        }

        // 监听滚动事件以更新控件位置
        const scrollDisposable = editorRef.current.onDidScrollChange(() => {
            updateWidgetPositions(editorRef.current!);
        });

        // 监听编辑器内容变化
        const contentDisposable = editorRef.current.onDidChangeModelContent(() => {
            updateWidgetPositions(editorRef.current!);
        });

        // 存储清理函数
        cleanupRef.current = () => {
            scrollDisposable.dispose();
            contentDisposable.dispose();
            
            // 移除所有控件
            widgetsRef.current.forEach(widget => {
                if (widget.parentElement) {
                    widget.parentElement.removeChild(widget);
                }
            });
            widgetsRef.current = [];
            
            // 清除所有装饰器
            if (editorRef.current) {
                const allDecorationIds = diffBlocks.flatMap(block => block.decorationIds);
                editorRef.current.deltaDecorations(allDecorationIds, []);
            }
        };

        // 监听窗口大小变化
        const resizeHandler = () => {
            setTimeout(() => {
                if (editorRef.current) {
                    updateWidgetPositions(editorRef.current);
                }
            }, 100);
        };
        window.addEventListener('resize', resizeHandler);

        return () => {
            window.removeEventListener('resize', resizeHandler);
            cleanupRef.current();
        };
    };

    // 当isDiffMode改变时，初始化或清理差异模式
    useEffect(() => {
        if (isDiffMode) {
            return initializeDiffMode();
        } else {
            cleanupRef.current();
        }
    }, [isDiffMode, originalCode, pendingCode]);

    // 检查是否所有差异都已处理
    const allDiffsProcessed = diffBlocks.every(block => block.type === 'unchanged');

    const handleEditorMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

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

        // 如果是差异模式，初始化差异显示
        if (isDiffMode) {
            initializeDiffMode();
        } else {
            // 否则设置普通编辑器功能
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
    }

    return (
        <div className={`editor-container ${isDiffMode ? 'diff-mode' : ''}`} style={{ position: 'relative', height: '100%' }}>
            <MonacoEditor
                height={'100%'}
                path={file.name}
                language={file.language}
                onMount={handleEditorMount}
                onChange={onChange}
                value={isDiffMode ? pendingCode : file.value}
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
                    glyphMargin: isDiffMode, // 差异模式下启用左侧标记区域
                    ...options
                }}
            />

            {isDiffMode && (
                <div className="diff-editor-controls">
                    <button 
                        className="diff-editor-apply" 
                        onClick={onApplyChanges}
                        title="确认应用这些更改"
                        disabled={!allDiffsProcessed}
                    >
                        确认全部更改
                    </button>
                    <button 
                        className="diff-editor-cancel" 
                        onClick={onCancelChanges}
                        title="放弃这些更改"
                    >
                        取消更改
                    </button>
                    {!allDiffsProcessed && (
                        <div className="diff-editor-message">
                            请处理所有标记的代码差异
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
