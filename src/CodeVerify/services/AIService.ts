import type { AIModel, AIChatRequest, CodeCompletionRequest } from './type';

// 从环境变量获取API密钥和URL
const API_KEY = import.meta.env.VITE_REACT_APP_API_KEY || '';
const API_URL = import.meta.env.VITE_REACT_APP_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';

// 支持的模型列表
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
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Qwen 2.5 Coder(32B)',
    description: 'Qwen2.5-Coder-32B-Instruct 是基于 Qwen2.5 开发的代码特定大语言模型。该模型通过 5.5 万亿 tokens 的训练，在代码生成、代码推理和代码修复方面都取得了显著提升。它是当前最先进的开源代码语言模型，编码能力可与 GPT-4 相媲美。模型不仅增强了编码能力，还保持了在数学和通用能力方面的优势，并支持长文本处理'
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    name: 'DeepSeek-R1-Distill-Qwen (7B)',
    description: 'DeepSeek-R1-Distill-Qwen，适合代码相关任务'
  },
  {
    id: 'Qwen/Qwen1.5-14B-Chat',
    name: 'Qwen 1.5 (14B)',
    description: '通义千问1.5版本小型模型'
  }
];

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
  async chatCompletion(request: AIChatRequest): Promise<Response> {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.currentModel,
        stream: true, // 始终使用流式传输
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
      return response;
    } catch (error) {
      console.error('AI API 调用失败:', error);
      throw error;
    }
  }

  // 获取 AI 助手回答
  async getAssistantResponse(
    question: string,
    fileContext: string = '',
    previousMessages: { role: 'user' | 'assistant'; content: string }[] = [],
    onUpdate?: (content: string) => void
  ): Promise<void> {
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

    try {
      const response = await this.chatCompletion(request);
      const reader = response.body?.getReader();  // 获取响应流
      if (!reader) throw new Error('无法获取响应流');

      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解析返回的数据
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(5);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              accumulatedText += content;
              
              // 调用回调函数更新内容
              if (onUpdate) {
                onUpdate(accumulatedText);
              }
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('AI API 调用失败:', error);
      throw error;
    }
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
      const response = await this.chatCompletion(request2);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解析返回的数据
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(5);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              accumulatedText += content;
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      }
      
      // 提取代码内容，移除可能的代码块标记和多余空白
      const codeMatch = accumulatedText.match(/```(?:javascript|typescript)?\n?([\s\S]*?)(?:\n```|$)/);
      const suggestion = codeMatch ? codeMatch[1].trim() : accumulatedText.trim();
      
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
