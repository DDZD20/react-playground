import MonacoEditor, { OnMount, EditorProps } from "@monaco-editor/react";
import { createATA } from "./ata";
import * as monaco from "monaco-editor";
import { Position } from "monaco-editor";
import aiService from "../../../services/AIService";
import { useEffect, useRef, useState } from "react";
import diffService from "../../../services/DiffService";
import { CodingAction, DiffBlock, DiffContext } from "../../../services/type";
import "./diffStyles.css";
import codeAnalysisService from "../../../services/CodeAnalysisService";

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
  onGetCodingActions?: (getActions: () => CodingAction[]) => void;
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

// 高效去除 current 尾部与 suggestion 头部重叠部分，KMP 算法实现
function stripPrefix(current: string, suggestion: string): string {
  if (!current || !suggestion) return suggestion;
  // 拼接字符串，中间加分隔符避免误匹配
  const combined = current + '#' + suggestion;
  const next = new Array(combined.length).fill(0);
  for (let i = 1; i < combined.length; i++) {
    let j = next[i - 1];
    while (j > 0 && combined[i] !== combined[j]) {
      j = next[j - 1];
    }
    if (combined[i] === combined[j]) {
      j++;
    }
    next[i] = j;
  }
  // next[combined.length - 1] 即最大重叠长度
  const overlap = next[combined.length - 1];
  return suggestion.slice(overlap);
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
    onGetCodingActions,
  } = props;

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([]);
  const cleanupRef = useRef<() => void>(() => {});
  // const [isProcessing, setIsProcessing] = useState(false);
  // const [showModelSelector, setShowModelSelector] = useState(false);

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
        onWidgetsUpdated: () => {
          // 不再保存widget，但接口需要这个回调
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

  // 将 getCodingActions 方法暴露给父组件
  useEffect(() => {
    if (onGetCodingActions) {
      // 创建一个函数传递给父组件，允许父组件随时获取行为片段
      onGetCodingActions(
        codeAnalysisService.getCodingActions.bind(codeAnalysisService)
      );
    }
  }, [onGetCodingActions]);

  // ========== 原有编辑器挂载逻辑 ==========
  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // 调用外部传入的 onMount 回调
    if (onMount) {
      onMount(editor);
    }

    // 初始化代码分析服务
    const codeAnalysisCleanup = codeAnalysisService.initialize(
      editor,
      monacoInstance
    );

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
    // 否则设置普通编辑器功能
    const inlineCompletionProvider: monaco.languages.InlineCompletionsProvider =
      {
        provideInlineCompletions: async (
          model: monaco.editor.ITextModel,
          position: Position
        ): Promise<monaco.languages.InlineCompletions> => {
          try {
            const wordUntilPosition = model.getWordUntilPosition(position);

            const suggestions = await fetchAISuggestions({
              code: model.getValue(),
              position: position,
              wordUntilPosition: wordUntilPosition,
            });

            // 获取当前行（到光标前）的内容
            const currentLinePrefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
            return {
              items: suggestions.map((suggestion) => {
                // 去除重复部分，仅补全新内容
                const insertText = stripPrefix(currentLinePrefix, suggestion);
                return {
                  insertText,
                  range: new monacoInstance.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                };
              }),
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
      codeAnalysisCleanup(); // 清理代码分析服务
    };
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
