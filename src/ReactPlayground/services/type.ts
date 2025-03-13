import { Position } from 'monaco-editor';

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
  position: Position;
  wordAtPosition?: {
    word: string;
    startColumn: number;
    endColumn: number;
  };
}