import { DiffEditor as MonacoDiffEditor, DiffOnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface Props {
    original: string;
    modified: string;
    language: string;
    theme?: string;
    options?: monaco.editor.IDiffEditorConstructionOptions;
    onMount?: (editor: monaco.editor.IStandaloneDiffEditor) => void;
    controlButtons?: boolean;
    onApply?: () => void;
    onCancel?: () => void;
}

export default function DiffEditor(props: Props) {
    const { 
        original, 
        modified, 
        language, 
        theme,
        options, 
        onMount, 
        controlButtons = false,
        onApply,
        onCancel 
    } = props;

    const handleEditorMount: DiffOnMount = (editor, monacoInstance) => {
        // 调用外部传入的 onMount 回调
        if (onMount) {
            onMount(editor);
        }

        // 设置 TypeScript 编译器选项
        monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monacoInstance.languages.typescript.JsxEmit.Preserve,
            esModuleInterop: true,
        });
    };

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            <MonacoDiffEditor
                height="100%"
                original={original}
                modified={modified}
                language={language}
                theme={theme}
                onMount={handleEditorMount}
                options={{
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    minimap: { enabled: false },
                    scrollbar: {
                        verticalScrollbarSize: 6,
                        horizontalScrollbarSize: 6,
                    },
                    lineNumbers: 'on',
                    readOnly: false,
                    renderSideBySide: true,
                    wordWrap: 'on',
                    diffWordWrap: 'on',
                    ...options
                }}
            />
            
            {controlButtons && (
                <div className="diff-editor-controls">
                    <button 
                        className="diff-editor-apply" 
                        onClick={onApply}
                        title="确认应用这些更改"
                    >
                        确认更改
                    </button>
                    <button 
                        className="diff-editor-cancel" 
                        onClick={onCancel}
                        title="放弃这些更改"
                    >
                        取消更改
                    </button>
                </div>
            )}
        </div>
    );
} 