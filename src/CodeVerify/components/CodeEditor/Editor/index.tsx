import MonacoEditor, { OnMount, EditorProps } from "@monaco-editor/react";
import { createATA } from "./ata";
import * as monaco from "monaco-editor";
import { Position } from "monaco-editor";
import aiService from "../../../services/AIService";
import { useEffect, useRef, useState } from "react";
import diffService from "../../../services/DiffService";
import { DiffBlock, DiffContext } from "../../../services/type";
import "./diffStyles.css";

export interface EditorFile {
  name: string;
  value: string;
  language: string;
}

interface Props {
  file: EditorFile;
  onChange?: EditorProps["onChange"];
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  isDiffMode?: boolean;
  originalCode?: string;
  pendingCode?: string;
  onApplyChanges?: () => void;
  onCancelChanges?: () => void;
}

interface AICompletionRequest {
  code: string;
  position: Position;
  wordUntilPosition: monaco.editor.IWordAtPosition;
}

async function fetchAISuggestions(
  request: AICompletionRequest
): Promise<string[]> {
  try {
    // 使用 AI 服务获取代码补全建议
    return await aiService.getCodeCompletion({
      code: request.code,
      position: request.position,
      wordAtPosition: request.wordUntilPosition,
    });
  } catch (error) {
    console.error("Failed to fetch AI suggestions:", error);
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
    originalCode = "",
    pendingCode = "",
    onApplyChanges,
    onCancelChanges,
  } = props;

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([]);
  const [diffWidgets, setDiffWidgets] = useState<HTMLDivElement[]>([]);
  const cleanupRef = useRef<() => void>(() => {});

  // 初始化差异编辑模式
  const initializeDiffMode = () => {
    if (!editorRef.current || !monacoRef.current || !isDiffMode) return;

    // 创建差异处理上下文
    const diffContext: DiffContext = {
      editor: editorRef.current,
      monaco: monacoRef.current,
    };

    // 使用DiffService初始化差异模式
    const cleanup = diffService.initializeDiffMode(
      diffContext,
      originalCode,
      pendingCode,
      {
        onDiffBlocksChanged: (blocks) => {
          setDiffBlocks(blocks);
        },
        onWidgetsUpdated: (widgets) => {
          setDiffWidgets(widgets);
        },
      }
    );

    // 存储清理函数
    cleanupRef.current = cleanup;

    return cleanup;
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
  const allDiffsProcessed = diffService.allDiffsProcessed(diffBlocks);

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // 调用外部传入的 onMount 回调
    if (onMount) {
      onMount(editor);
    }

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyJ,
      () => {
        editor.getAction("editor.action.formatDocument")?.run();
      }
    );

    monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monacoInstance.languages.typescript.JsxEmit.Preserve,
      esModuleInterop: true,
    });

    // 如果是差异模式，初始化差异显示
    if (isDiffMode) {
      initializeDiffMode();
    } else {
      // 否则设置普通编辑器功能
      const inlineCompletionProvider: monaco.languages.InlineCompletionsProvider =
        {
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
                wordUntilPosition: wordUntilPosition,
              });

              return {
                items: suggestions.map((suggestion) => ({
                  insertText: suggestion,
                  range: new monacoInstance.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                })),
              };
            } catch (error) {
              console.error("Inline completion error:", error);
              return { items: [] };
            }
          },
          freeInlineCompletions: () => {},
        };

      const disposable =
        monacoInstance.languages.registerInlineCompletionsProvider(
          ["typescript", "javascript", "typescriptreact", "javascriptreact"],
          inlineCompletionProvider
        );

      editor.updateOptions({
        inlineSuggest: {
          enabled: true,
          mode: "prefix",
        },
      });

      const ata = createATA((code, path) => {
        monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
          code,
          `file://${path}`
        );
      });

      editor.onDidChangeModelContent(() => {
        ata(editor.getValue());
      });

      ata(editor.getValue());

      return () => {
        disposable.dispose();
      };
    }
  };

  return (
    <div
      className={`editor-container ${isDiffMode ? "diff-mode" : ""}`}
      style={{ position: "relative", height: "100%" }}
    >
      <MonacoEditor
        height={"100%"}
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
          ...options,
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
            <div className="diff-editor-message">请处理所有标记的代码差异</div>
          )}
        </div>
      )}
    </div>
  );
}
