import { ChatCompletionService } from './chatCompletionService';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tool call interfaces
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
  isStreaming?: boolean;
  result?: any; // Tool execution result
}

export interface ToolResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
  name?: string;
}

// Message interface
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// Context data interface
export interface ContextData {
  threadId?: string;
  workspaceId?: string;
  vectorStoreId?: string;
  workspace_initiated?: boolean;
  is_workspace_chat?: boolean;
  files?: any[];
  attachments?: any[];
  [key: string]: any;
}

// Simple LRU Cache implementation
class SimpleLRUCache {
  private cache = new Map<string, any>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): any {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: string, value: any): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

// Global cache instance
const globalCache = new SimpleLRUCache(1000);

/**
 * Handle tool calls execution
 */
export async function handleToolCalls(
  toolCall: ToolCall,
  updateState: (stateUpdate: any) => void,
  toolRegistry: any,
  provider: string = 'openai'
): Promise<any> {
  try {
    const functionName = toolCall.function?.name;
    const args = toolCall.function?.arguments;

    if (!functionName) {
      console.error('❌ [handleToolCalls] Tool function name is required');
      throw new Error('Tool function name is required');
    }

    // Parse arguments
    let parsedArgs: any = {};
    try {
      if (args && typeof args === 'string') {
        parsedArgs = JSON.parse(args);
      } else if (args && typeof args === 'object') {
        parsedArgs = args;
      }
    } catch (parseError: any) {
      console.error(`❌ [handleToolCalls] Failed to parse arguments for ${functionName}:`, parseError?.message || 'Parse error');
      throw new Error(`Invalid tool arguments: ${args}`);
    }

    // Get tool from registry
    const tool = toolRegistry?.getTool(functionName);
    if (!tool) {
      console.error(`❌ [handleToolCalls] Tool '${functionName}' not found in registry`);
      
      // Try to log available tools if registry exists
      if (toolRegistry && typeof toolRegistry.getStats === 'function') {
        try {
          const stats = toolRegistry.getStats();
          console.error(`❌ [handleToolCalls] Available tools in registry:`, stats);
        } catch (e: any) {
          console.error(`❌ [handleToolCalls] Could not get registry stats:`, e?.message || 'Unknown error');
        }
      }
      
      throw new Error(`Tool '${functionName}' not found in registry`);
    }

    console.log(`✅ [handleToolCalls] Tool found in registry: ${functionName}`, {
      toolType: typeof tool,
      hasExecute: typeof tool.execute === 'function',
      toolId: tool.id || 'no-id'
    });

    console.log(`🔧 [handleToolCalls] Executing tool: ${functionName}`, {
      parsedArgs,
      toolInstance: !!tool
    });

    // Execute the tool
    const result = await tool.execute(parsedArgs);

    console.log(`✅ [handleToolCalls] Tool execution completed: ${functionName}`, {
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'non-object',
      resultPreview: JSON.stringify(result).substring(0, 200)
    });

    const toolResult = {
      tool_call_id: toolCall.id,
      role: 'tool' as const,
      content: JSON.stringify(result),
      name: functionName,
    };

    console.log(`✅ [handleToolCalls] Returning tool result:`, {
      toolCallId: toolResult.tool_call_id,
      role: toolResult.role,
      contentLength: toolResult.content.length,
      functionName: toolResult.name
    });

    return toolResult;

  } catch (error: any) {
    console.error(`❌ [handleToolCalls] Tool execution failed:`, error);

    return {
      tool_call_id: toolCall.id,
      role: 'tool' as const,
      content: JSON.stringify({
        error: error.message || 'Tool execution failed',
        tool_name: toolCall.function?.name,
      }),
      name: toolCall.function?.name,
    };
  }
}

/**
 * Clean tool arguments string
 */
export function cleanToolArguments(argsString: string, debug: boolean = false): string {
  if (!argsString || typeof argsString !== 'string') {
    return argsString || '';
  }

  // Remove common streaming artifacts
  let cleaned = argsString
    .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
    .replace(/,\s*]/g, ']'); // Remove trailing commas before closing brackets

  if (debug) {
    console.log('🧹 [cleanToolArguments] Cleaned:', { original: argsString, cleaned });
  }

  return cleaned;
}

/**
 * Accumulate tool calls from streaming deltas
 */
export function accumulateToolCalls(
  accumulatedToolCalls: ToolCall[] = [],
  newToolCalls: ToolCall[] = [],
  provider: string = 'unknown'
): ToolCall[] {
  if (!newToolCalls || newToolCalls.length === 0) {
    return accumulatedToolCalls;
  }

  let updated = [...accumulatedToolCalls];

  for (const newToolCall of newToolCalls) {
    const existingIndex = updated.findIndex(tc => tc.id === newToolCall.id);

    if (existingIndex >= 0) {
      // Update existing tool call
      const existing = updated[existingIndex];
      const oldArguments = existing.function?.arguments || '';
      const newArguments = newToolCall.function?.arguments || '';
      
      // OpenAI streams complete accumulated arguments in each chunk, not incremental pieces
      // So we should replace, not concatenate
      const combinedArguments = newArguments;
      
      updated[existingIndex] = {
        ...existing,
        type: newToolCall.type || existing.type,
        function: {
          name: newToolCall.function?.name || existing.function?.name || '',
          arguments: combinedArguments,
        },
        isStreaming: newToolCall.isStreaming !== undefined ? newToolCall.isStreaming : existing.isStreaming,
      };
    } else {
      // Add new tool call
      console.log('🔧 [accumulateToolCalls] Adding new tool call:', {
        id: newToolCall.id,
        functionName: newToolCall.function?.name,
        argumentsLength: newToolCall.function?.arguments?.length || 0,
        type: newToolCall.type
      });
      
      updated.push({
        id: newToolCall.id,
        type: newToolCall.type || 'function',
        function: {
          name: newToolCall.function?.name || '',
          arguments: newToolCall.function?.arguments || '',
        },
        isStreaming: newToolCall.isStreaming !== undefined ? newToolCall.isStreaming : true,
      });
    }
  }

  return updated;
}

/**
 * Finalize tool call arguments by parsing and validating JSON
 */
export function finalizeToolCallArguments(toolCalls: ToolCall[], provider: string = 'unknown'): ToolCall[] {
  return toolCalls.map(tc => {
    let args = tc.function?.arguments || '';
    
    // Clean the arguments
    args = cleanToolArguments(args);
    
    // Try to parse and re-stringify to validate JSON
    try {
      const parsed = JSON.parse(args);
      args = JSON.stringify(parsed);
    } catch (parseError) {
      console.warn(`Invalid JSON in tool call ${tc.id}:`, args);
      // Keep original args if parsing fails
    }

    return {
      ...tc,
      function: {
        ...tc.function,
        arguments: args,
      },
      isStreaming: false,
    };
  });
}

/**
 * Get provider for a given model name
 */
export function getProviderForModel(modelName: string): string {
  if (!modelName) return 'openai';

  const lowerModel = modelName.toLowerCase();

  // OpenAI models
  if (lowerModel.includes('gpt') || lowerModel.includes('o1') || lowerModel.includes('dall-e')) {
    return 'openai';
  }

  // Anthropic models
  if (lowerModel.includes('claude')) {
    return 'anthropic';
  }

  // Google models
  if (lowerModel.includes('gemini') || lowerModel.includes('palm') || lowerModel.includes('bison')) {
    return 'gemini';
  }

  // Mistral models
  if (lowerModel.includes('mistral') || lowerModel.includes('mixtral')) {
    return 'mistral';
  }

  // DeepSeek models
  if (lowerModel.includes('deepseek')) {
    return 'deepseek';
  }

  // xAI models
  if (lowerModel.includes('grok') || lowerModel.includes('xai')) {
    return 'xai';
  }

  // Groq models
  if (lowerModel.includes('llama') || lowerModel.includes('mixtral-8x7b')) {
    return 'groq';
  }

  // Cohere models
  if (lowerModel.includes('command') || lowerModel.includes('cohere')) {
    return 'cohere';
  }

  // Perplexity models
  if (lowerModel.includes('sonar') || lowerModel.includes('perplexity')) {
    return 'perplexity';
  }

  // Default to OpenAI
  return 'openai';
}

/**
 * Check if a model is a reasoning model
 */
export function isReasoningModel(modelName: string): boolean {
  if (!modelName) return false;

  const lowerModel = modelName.toLowerCase();
  const reasoningModels = [
    'o1-preview',
    'o1-mini',
    'o1-pro',
    'deepseek-reasoner',
    'grok-3-beta',
    'claude-3-opus', // Has some reasoning capabilities
  ];

  return reasoningModels.some(model => lowerModel.includes(model));
}

/**
 * Check if content contains reasoning patterns
 */
export function isReasoningContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;

  const reasoningPatterns = [
    /<thinking>/,
    /<think>/,
    /let me think/i,
    /reasoning:/i,
    /step by step/i,
    /first.*second.*third/i,
  ];

  return reasoningPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if a JSON string is complete
 */
export function isCompleteJsonObject(str: string): boolean {
  if (!str || typeof str !== 'string') return false;

  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate tool message ID
 */
export function generateToolMessageId(toolCallId: string): string {
  return `tool_${toolCallId}_${Date.now()}`;
}

/**
 * Get default chat parameters for a model
 */
export function getDefaultChatParams(
  modelName: string,
  messages: ChatMessage[],
  providerName: string,
  contextData: ContextData = {}
): any {
  const baseParams = {
    provider: providerName,
    model: modelName,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  // Add reasoning effort for reasoning models
  if (isReasoningModel(modelName)) {
    (baseParams as any).reasoning_effort = 'medium';
  }

  return baseParams;
}

/**
 * Remove unsupported parameters for specific models/providers
 */
export function removeUnsupportedParams(params: any, modelName: string, providerName: string): any {
  const cleanParams = { ...params };

  // Anthropic doesn't support frequency_penalty and presence_penalty
  if (providerName === 'anthropic') {
    delete cleanParams.frequency_penalty;
    delete cleanParams.presence_penalty;
    delete cleanParams.top_p; // Claude uses different parameter names
  }

  // Reasoning models have different parameter constraints
  if (isReasoningModel(modelName)) {
    // Remove parameters that reasoning models don't support
    delete cleanParams.temperature;
    delete cleanParams.top_p;
    delete cleanParams.frequency_penalty;
    delete cleanParams.presence_penalty;
  }

  return cleanParams;
}

/**
 * Process vision files for multimodal models
 */
export function processVisionFiles(contextData: ContextData): any[] {
  const visionContent: any[] = [];

  if (contextData.files || contextData.attachments) {
    const files = [...(contextData.files || []), ...(contextData.attachments || [])];
    
    for (const file of files) {
      if (file.isImage || file.type?.startsWith('image/') || file.mimeType?.startsWith('image/')) {
        if (file.publicUrl || file.url) {
          visionContent.push({
            type: 'image_url',
            image_url: {
              url: file.publicUrl || file.url,
              detail: 'high',
            },
          });
        }
      }
    }
  }

  return visionContent;
}

/**
 * Check if messages need vision formatting
 */
export function messagesNeedVisionFormatting(messages: ChatMessage[]): boolean {
  return messages.some(msg => 
    Array.isArray(msg.content) && 
    msg.content.some((item: any) => item.type === 'image_url')
  );
}

/**
 * Safely update streaming message with batching
 */
export function safelyUpdateStreamingMessage(
  updateMessageState: (messageId: string, updates: any) => void,
  messageId: string,
  content: string,
  status: string = 'streaming',
  forceBatch: boolean = true,
  metadata: any = {},
  threadId: string | null = null,
  role: string | null = null
): void {
  try {
    const updates: any = {
      content,
      status,
      metadata: {
        ...metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    if (role) {
      updates.role = role;
    }

    if (threadId) {
      updates.threadId = threadId;
    }

    updateMessageState(messageId, updates);
  } catch (error) {
    console.error('Error updating streaming message:', error);
  }
}

/**
 * Clean message data for database storage
 */
export function cleanMessageForDatabase(messageData: any): any {
  const cleaned = { ...messageData };

  // Remove functions and non-serializable objects
  Object.keys(cleaned).forEach(key => {
    if (typeof cleaned[key] === 'function') {
      delete cleaned[key];
    }
    if (cleaned[key] && typeof cleaned[key] === 'object' && cleaned[key].constructor === Object) {
      cleaned[key] = cleanMessageForDatabase(cleaned[key]);
    }
  });

  return cleaned;
}

/**
 * Get backend provider service instance
 */
export function getBackendProviderService(): any {
  // This would return the backend provider service instance
  // For now, we'll use a placeholder
  return {
    createChatCompletionStream: async (params: any, onUpdate: any, options: any) => {
      throw new Error('Backend provider service not implemented');
    },
  };
}

/**
 * Safely accumulate arguments for tool calls
 */
export function safelyAccumulateArguments(current: string, addition: string): string {
  if (!current) return addition || '';
  if (!addition) return current;
  
  return current + addition;
}

/**
 * Create provider wrapper for backend service
 */
export function createProviderWrapper(providerName: string, options: any = {}): any {
  // This would create a provider wrapper for the backend service
  // For now, we'll return a placeholder
  return {
    providerName,
    options,
    createChatCompletionStream: async (params: any, onUpdate: any, options: any) => {
      throw new Error(`Provider wrapper for ${providerName} not implemented`);
    },
  };
}

/**
 * Format retrieval results to XML
 */
export function formatRetrievalResults(searchResults: any[]): string {
  if (!searchResults || searchResults.length === 0) {
    return '';
  }

  let formatted = '<files>\n';
  
  for (const result of searchResults) {
    const filename = result.filename || result.name || result.file_name || 'unknown';
    const fileId = result.file_id || result.id || 'unknown';
    
    // Extract content from different formats
    let content = '';
    if (typeof result.content === 'string') {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      // Handle new API format: content is array of objects with text
      content = result.content
        .filter(item => item && item.type === 'text')
        .map(item => item.text)
        .join('\n');
    } else if (result.content && typeof result.content === 'object') {
      content = JSON.stringify(result.content);
    } else {
      content = result.text || '';
    }
    
    console.log('📝 [StreamingUtils] Processing result:', {
      fileId,
      filename,
      contentType: typeof result.content,
      contentLength: content.length
    });
    
    formatted += `<file_snippet file_id='${fileId}' file_name='${filename}'>`;
    formatted += `<content>${content}</content>`;
    formatted += '</file_snippet>\n';
  }
  
  formatted += '</files>';
  
  return formatted;
}

/**
 * Cache management utilities
 */
export const CacheUtils = {
  get: (key: string) => globalCache.get(key),
  set: (key: string, value: any) => globalCache.set(key, value),
  has: (key: string) => globalCache.has(key),
  
  // Async storage utilities
  async getFromStorage(key: string): Promise<any> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Failed to get ${key} from storage:`, error);
      return null;
    }
  },

  async setToStorage(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to set ${key} to storage:`, error);
    }
  },

  async removeFromStorage(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from storage:`, error);
    }
  },
};

/**
 * Model and provider detection utilities
 */
export const ModelUtils = {
  isReasoningModel,
  getProviderForModel,
  isReasoningContent,
  
  /**
   * Get model capabilities
   */
  getModelCapabilities(modelName: string): {
    supportsVision: boolean;
    supportsTools: boolean;
    supportsStreaming: boolean;
    maxTokens: number;
    supportedFormats: string[];
  } {
    const lowerModel = modelName.toLowerCase();
    
    // Default capabilities
    let capabilities = {
      supportsVision: false,
      supportsTools: true,
      supportsStreaming: true,
      maxTokens: 4096,
      supportedFormats: ['text'],
    };

    // GPT-4 Vision models
    if (lowerModel.includes('gpt-4') && (lowerModel.includes('vision') || lowerModel.includes('gpt-4o'))) {
      capabilities.supportsVision = true;
      capabilities.supportedFormats.push('image');
    }

    // Claude models with vision
    if (lowerModel.includes('claude-3')) {
      capabilities.supportsVision = true;
      capabilities.supportedFormats.push('image');
      capabilities.maxTokens = 200000;
    }

    // Gemini models
    if (lowerModel.includes('gemini')) {
      capabilities.supportsVision = true;
      capabilities.supportedFormats.push('image', 'video', 'audio');
      capabilities.maxTokens = 1000000;
    }

    // Reasoning models
    if (isReasoningModel(modelName)) {
      capabilities.supportsTools = false; // Most reasoning models don't support tools
      capabilities.maxTokens = 32768;
    }

    return capabilities;
  },
};

/**
 * Export all utilities
 */
export default {
  handleToolCalls,
  cleanToolArguments,
  accumulateToolCalls,
  finalizeToolCallArguments,
  getProviderForModel,
  isReasoningModel,
  isReasoningContent,
  isCompleteJsonObject,
  generateUUID,
  generateToolMessageId,
  getDefaultChatParams,
  removeUnsupportedParams,
  processVisionFiles,
  messagesNeedVisionFormatting,
  safelyUpdateStreamingMessage,
  cleanMessageForDatabase,
  getBackendProviderService,
  safelyAccumulateArguments,
  createProviderWrapper,
  formatRetrievalResults,
  CacheUtils,
  ModelUtils,
}; 