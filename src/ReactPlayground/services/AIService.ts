import { Position } from 'monaco-editor';

// API 密钥（实际应用中应从环境变量获取）
const API_KEY = 'sk-hwgtlynsdffsfwnhesyavbxmvhuvvshqgbjpbaesdwndijrt';
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 支持的模型列表
export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'Qwen/Qwen2.5-Coder-7B-Instruct',
    name: 'Qwen 2.5 Coder (7B)',
    description: '通义千问编程模型，适合代码相关任务'
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen 2.5 (72B)',
    description: '通义千问大模型，适合通用任务'
  },
  {
    id: 'Qwen/Qwen1.5-110B-Chat',
    name: 'Qwen 1.5 (110B)',
    description: '通义千问1.5版本大模型'
  },
  {
    id: 'Qwen/Qwen1.5-32B-Chat',
    name: 'Qwen 1.5 (32B)',
    description: '通义千问1.5版本中型模型'
  },
  {
    id: 'Qwen/Qwen1.5-14B-Chat',
    name: 'Qwen 1.5 (14B)',
    description: '通义千问1.5版本小型模型'
  }
];

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

// AI 服务类
class AIService {
  private apiKey: string;
  private apiUrl: string;
  private currentModel: string;

  constructor(
    apiKey: string = API_KEY,
    apiUrl: string = API_URL,
    defaultModel: string = AI_MODELS[0].id
  ) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.currentModel = defaultModel;
  }
  
  // 获取当前使用的模型
  getCurrentModel(): string {
    return this.currentModel;
  }
  
  // 设置当前使用的模型
  setCurrentModel(modelId: string): void {
    // 验证模型是否在支持列表中
    const isValidModel = AI_MODELS.some(model => model.id === modelId);
    if (isValidModel) {
      this.currentModel = modelId;
    } else {
      console.warn(`模型 ${modelId} 不在支持列表中，将使用默认模型`);
      this.currentModel = AI_MODELS[0].id;
    }
  }

  // 通用 AI 聊天请求方法
  async chatCompletion(request: AIChatRequest): Promise<string> {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.currentModel,
        stream: request.stream || false,
        max_tokens: request.max_tokens || 1024,
        temperature: request.temperature || 0.7,
        messages: request.messages
      })
    };

    try {
      const response = await fetch(this.apiUrl, options);
      if (!response.ok) {
        throw new Error('AI 服务请求失败');
      }

      const data = await response.json();
      return data.choices && data.choices[0]?.message?.content
        ? data.choices[0].message.content
        : '抱歉，无法获取有效回答。';
    } catch (error) {
      console.error('AI API 调用失败:', error);
      throw error;
    }
  }

  // 获取 AI 助手回答
  async getAssistantResponse(
    question: string,
    fileContext: string = '',
    previousMessages: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<string> {
    // 构建对话历史
    const conversationHistory = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 构建系统提示
    const systemPrompt = `你是一个专业的编程助手，擅长解答编程相关问题。
当前用户正在编辑一个React项目，你需要根据用户提供的代码上下文回答问题。
回答要简洁明了，代码示例应当符合现代JavaScript/TypeScript最佳实践。
${fileContext ? `\n\n当前正在编辑的文件内容:\n${fileContext}` : ''}`;

    // 构建请求
    const request: AIChatRequest = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationHistory,
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.7
    };

    return this.chatCompletion(request);
  }

  // 获取代码补全建议
  async getCodeCompletion(request: CodeCompletionRequest): Promise<string[]> {
    // 获取光标位置的上下文代码
    const contextCode = request.code;

    // 构建系统提示
    const systemPrompt = `你是一个代码补全助手，请根据当前代码上下文提供合适的代码补全建议。
请遵循以下规则：
1. 只返回补全的代码，不要包含任何解释或说明
2. 补全应该符合上下文中的编程语言和风格
3. 补全应该是当前上下文中最可能的下一部分代码
4. 如果是在写函数调用，优先补全上下文中已存在的函数
5. 如果是在写对象属性，优先使用上下文中已出现的属性名
6. 补全长度应该在1-3行之间
7. 一定要切记不要重复我给你的代码，只需要返回补全的代码

当前代码上下文（|表示光标位置）:
\`\`\`typescript
${contextCode}|
\`\`\``;

    // 构建请求
    const request2: AIChatRequest = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 256
    };

    try {
      const content = await this.chatCompletion(request2);
      
      // 提取代码内容，移除可能的代码块标记和多余空白
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
    } catch (error) {
      console.error('获取代码补全失败:', error);
      return [];
    }
  }
}

// 导出单例实例
export const aiService = new AIService();

// 导出默认实例
export default aiService;
