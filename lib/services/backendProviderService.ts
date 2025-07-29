import { ApiClient, ApiError } from '../apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface StreamCompletionParams {
  provider: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: string };
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
  parallel_tool_calls?: boolean;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Backend Provider Service for iOS
 * Mirrors the web app's backend integration patterns
 */
export class BackendProviderService {
  private defaultProvider: string = 'openai';
  private apiKey: string | null = null;

  constructor(options: { defaultProvider?: string; apiKey?: string } = {}) {
    this.defaultProvider = options.defaultProvider || 'openai';
    this.apiKey = options.apiKey || null;
  }

  /**
   * Stream chat completion from backend API
   */
  static async streamChatCompletion(
    params: StreamCompletionParams,
    onUpdate: (content: string) => void,
    onComplete?: (finalContent: string) => void,
    onError?: (error: ApiError) => void,
    signal?: AbortSignal
  ): Promise<string> {
    try {
      console.log('🌊 [BackendProviderService] Creating streaming chat completion:', {
        provider: params.provider,
        model: params.model,
        messageCount: params.messages.length,
      });

      // Validate required parameters
      if (!params.provider || !params.model || !params.messages?.length) {
        throw new ApiError('Missing required parameters for streaming chat completion');
      }

      // Prepare the request data
      const requestData = {
        provider: params.provider,
        model: params.model,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 4096,
        top_p: params.top_p || 1,
        frequency_penalty: params.frequency_penalty || 0,
        presence_penalty: params.presence_penalty || 0,
        response_format: params.response_format,
        tools: params.tools,
        tool_choice: params.tool_choice,
        stream: params.stream !== false, // Default to true
        parallel_tool_calls: params.parallel_tool_calls !== false, // Default to true
        // Include any additional parameters
        ...Object.fromEntries(
          Object.entries(params).filter(([key]) => 
            !['provider', 'model', 'messages', 'temperature', 'max_tokens', 'top_p', 
              'frequency_penalty', 'presence_penalty', 'response_format', 'tools', 
              'tool_choice', 'stream', 'parallel_tool_calls'].includes(key)
          )
        ),
      };

      console.log('📤 [BackendProviderService] Stream request data:', {
        provider: requestData.provider,
        model: requestData.model,
        messageCount: requestData.messages.length,
        hasTools: !!requestData.tools?.length,
        toolChoice: requestData.tool_choice,
      });

      let accumulatedContent = '';
      let chunkCount = 0;

      const result = await ApiClient.stream(
        '/api/ai/chat/stream',
        requestData,
        (chunk: string) => {
          chunkCount++;
          accumulatedContent += chunk;
          console.log(`🧩 [BackendProviderService] Received chunk ${chunkCount}:`, {
            chunkLength: chunk.length,
            preview: chunk.substring(0, 50),
            accumulatedLength: accumulatedContent.length
          });
          onUpdate(chunk);
        },
        (finalContent: string) => {
          console.log(`✅ [BackendProviderService] Stream completed:`, {
            totalChunks: chunkCount,
            finalLength: finalContent.length,
            accumulatedLength: accumulatedContent.length,
            preview: finalContent.substring(0, 100)
          });
          onComplete?.(finalContent);
        },
        (error: ApiError) => {
          console.error('❌ [BackendProviderService] Stream error:', error);
          onError?.(error);
        },
        signal
      );

      return result;
    } catch (error: any) {
      console.error('❌ [BackendProviderService] Stream error:', error);
      
      if (error instanceof ApiError) {
        onError?.(error);
        throw error;
      }
      
      const apiError = new ApiError(
        error.message || 'Streaming chat completion failed',
        error.status || 0,
        error
      );
      onError?.(apiError);
      throw apiError;
    }
  }

  /**
   * Create a non-streaming chat completion
   */
  async createChatCompletion(params: StreamCompletionParams): Promise<CompletionResponse> {
    console.log('💬 [BackendProviderService] Creating chat completion:', {
      provider: params.provider,
      model: params.model,
      messageCount: params.messages.length
    });

    try {
      // Ensure we have required parameters
      if (!params.provider || !params.model || !params.messages) {
        throw new Error('Missing required parameters: provider, model, or messages');
      }

      // Prepare request data (remove stream parameter for non-streaming)
      const { stream, ...requestData } = params;

      const response = await ApiClient.ai.chatCompletion(requestData);

      console.log('✅ [BackendProviderService] Chat completion successful');
      return response.result || response;

    } catch (error: any) {
      console.error('❌ [BackendProviderService] Chat completion error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error.message || 'Chat completion failed',
        error.status || 0,
        { originalError: error }
      );
    }
  }

  /**
   * List available models from a provider
   */
  async listModels(provider: string = this.defaultProvider): Promise<any[]> {
    console.log('📋 [BackendProviderService] Listing models for provider:', provider);

    try {
      // This would typically be an API call to get available models
      // For now, we'll return a static list based on provider
      const modelMap: { [key: string]: any[] } = {
        openai: [
          { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
        ],
        anthropic: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
        ],
        gemini: [
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
          { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'gemini' },
          { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'gemini' },
        ],
        deepseek: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
          { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek' },
        ],
        xai: [
          { id: 'grok-3-beta', name: 'Grok 3 Beta', provider: 'xai' },
          { id: 'grok-vision-beta', name: 'Grok Vision Beta', provider: 'xai' },
        ],
        mistral: [
          { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral' },
          { id: 'mistral-medium-latest', name: 'Mistral Medium', provider: 'mistral' },
        ],
        perplexity: [
          { id: 'sonar', name: 'Sonar', provider: 'perplexity' },
          { id: 'sonar-pro', name: 'Sonar Pro', provider: 'perplexity' },
        ],
      };

      return modelMap[provider] || [];

    } catch (error: any) {
      console.error('❌ [BackendProviderService] List models error:', error);
      return [];
    }
  }

  /**
   * Get available providers
   */
  async getProviders(): Promise<string[]> {
    console.log('🔍 [BackendProviderService] Getting available providers');

    try {
      // Return list of supported providers
      return [
        'openai',
        'anthropic', 
        'gemini',
        'deepseek',
        'xai',
        'mistral',
        'perplexity',
        'groq',
        'cohere',
        'openrouter'
      ];

    } catch (error: any) {
      console.error('❌ [BackendProviderService] Get providers error:', error);
      return ['openai']; // Fallback to OpenAI
    }
  }

  /**
   * Check if a provider is available and properly configured
   */
  async checkAvailability(provider: string = this.defaultProvider): Promise<boolean> {
    console.log('🔍 [BackendProviderService] Checking availability for:', provider);

    try {
      // For iOS, we assume all providers are available through the backend
      // The backend handles API key validation and provider availability
      const providers = await this.getProviders();
      return providers.includes(provider);

    } catch (error: any) {
      console.error('❌ [BackendProviderService] Availability check error:', error);
      return false;
    }
  }

  /**
   * Format message history for the provider
   * This mirrors the web app's message formatting logic
   */
  formatMessageHistory(messages: ChatMessage[], instructions?: string): ChatMessage[] {
    console.log('📝 [BackendProviderService] Formatting message history:', {
      messageCount: messages.length,
      hasInstructions: !!instructions
    });

    try {
      let formattedMessages = [...messages];

      // Add system message if instructions are provided
      if (instructions?.trim()) {
        // Check if first message is already a system message
        const hasSystemMessage = formattedMessages[0]?.role === 'system';
        
        if (hasSystemMessage) {
          // Update existing system message
          formattedMessages[0] = {
            role: 'system',
            content: instructions.trim()
          };
        } else {
          // Add new system message at the beginning
          formattedMessages.unshift({
            role: 'system',
            content: instructions.trim()
          });
        }
      }

      // Ensure messages are properly formatted
      formattedMessages = formattedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('✅ [BackendProviderService] Message history formatted:', {
        originalCount: messages.length,
        formattedCount: formattedMessages.length,
        hasSystemMessage: formattedMessages[0]?.role === 'system'
      });

      return formattedMessages;

    } catch (error: any) {
      console.error('❌ [BackendProviderService] Message formatting error:', error);
      return messages; // Return original messages as fallback
    }
  }

  /**
   * Validate and fix tool call sequences
   * This ensures tool calls are properly formatted
   */
  validateAndFixToolCallSequences(messages: ChatMessage[]): ChatMessage[] {
    console.log('🔧 [BackendProviderService] Validating tool call sequences');

    try {
      // For now, just return the messages as-is
      // The backend handles tool call validation
      return messages;

    } catch (error: any) {
      console.error('❌ [BackendProviderService] Tool call validation error:', error);
      return messages;
    }
  }

  /**
   * Check if a model is a reasoning model
   */
  isReasoningModel(modelName: string): boolean {
    const reasoningModels = [
      'o1-preview',
      'o1-mini', 
      'deepseek-reasoner',
      'grok-3-beta'
    ];

    return reasoningModels.some(model => 
      modelName.toLowerCase().includes(model.toLowerCase())
    );
  }

  /**
   * Get default model for a provider
   */
  getDefaultModelForProvider(providerName: string): string {
    const defaults: { [key: string]: string } = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-sonnet-20241022',
      gemini: 'gemini-2.0-flash',
      mistral: 'mistral-large-latest',
      deepseek: 'deepseek-chat',
      xai: 'grok-3-beta',
      groq: 'llama3-70b-8192',
      cohere: 'command-a-03-2025',
      perplexity: 'sonar',
      openrouter: 'openai/o1-mini',
    };

    return defaults[providerName] || 'gpt-4o-mini';
  }

  /**
   * Cache management for performance
   */
  private static readonly CACHE_PREFIX = '@BackendProviderService:';
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async getFromCache(key: string): Promise<any> {
    try {
      const cacheKey = `${BackendProviderService.CACHE_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp > BackendProviderService.CACHE_TTL) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  private async setCache(key: string, data: any): Promise<void> {
    try {
      const cacheKey = `${BackendProviderService.CACHE_PREFIX}${key}`;
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(BackendProviderService.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('🗑️ [BackendProviderService] Cache cleared');
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }
}

// Export a default instance
export default new BackendProviderService(); 