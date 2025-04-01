import * as monaco from 'monaco-editor';

// AI模型接口
export interface AIModel {
  id: string;
  name: string;
  description: string;
}

// 消息接口
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// AI 聊天请求接口
export interface AIChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// 代码补全请求接口
export interface CodeCompletionRequest {
  code: string;
  position: monaco.Position;
  wordAtPosition?: {
    word: string;
    startColumn: number;
    endColumn: number;
  };
}



// diff 类型
// 差异块接口
export interface DiffBlock {
  id: string;
  startLine: number;
  endLine: number;
  content: string;
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  decorationIds: string[];
}

// 差异处理上下文接口
export interface DiffContext {
  editor: monaco.editor.IStandaloneCodeEditor;
  monaco: typeof monaco;
}

// 差异块操作处理回调接口
export interface DiffActionCallbacks {
  onDiffBlocksChanged: (blocks: DiffBlock[]) => void;
  onWidgetsUpdated: (widgets: HTMLDivElement[]) => void;
}

// 装饰器应用选项
export interface DecorationOptions {
  isWholeLine: boolean;
  className: string;
  glyphMarginClassName?: string;
  zIndex?: number;
}

// 接受/拒绝操作结果接口
export interface DiffActionResult {
  newBlocks: DiffBlock[];
  removedBlockId: string;
  affectedLineRange?: {
      startLine: number;
      endLine: number;
      linesToRemove?: number;
  };
}

// 控件位置接口
export interface WidgetPosition {
  top: number;
  blockId: string;
} 