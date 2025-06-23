import OpenAI from 'openai';
import { fetch } from 'expo/fetch';

// Initialize OpenAI client with expo/fetch for streaming support
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  fetch: fetch as any, // Use expo/fetch for streaming support in React Native
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export class OpenAIService {
  static async streamChatCompletion(options: StreamingChatOptions): Promise<string> {
    const {
      model,
      messages,
      temperature = 0.7,
      maxTokens = 2000,
      signal,
      onChunk,
      onComplete,
      onError,
    } = options;

    try {
      const stream = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }, {
        signal,
      });

      let accumulatedContent = '';

      for await (const chunk of stream) {
        if (signal?.aborted) {
          break;
        }

        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          accumulatedContent += delta;
          onChunk?.(delta);
        }
      }

      onComplete?.(accumulatedContent);
      return accumulatedContent;

    } catch (error: any) {
      onError?.(error);
      throw error;
    }
  }

  static async createChatCompletion(
    model: string,
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error creating chat completion:', error);
      throw error;
    }
  }

  static validateApiKey(): boolean {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    return !!(apiKey && apiKey.length > 0 && apiKey.startsWith('sk-'));
  }

  static getAvailableModels() {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        version: 'Latest',
        model: 'gpt-4o',
        description: 'Most capable model, best for complex tasks',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4',
        version: 'Turbo',
        model: 'gpt-4-turbo-preview',
        description: 'High-quality responses, good for most tasks',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5',
        version: 'Turbo',
        model: 'gpt-3.5-turbo',
        description: 'Fast and efficient, good for simple tasks',
      },
    ];
  }
}

export default openai; 