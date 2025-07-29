import { ApiClient, ApiError } from '../apiClient';
import { BackendProviderService } from './backendProviderService';
import { ChatCompletionService } from './chatCompletionService';
import { webSearchService } from './webSearchService';
import { buildStructuredSystemPrompt } from './systemPromptBuilder';
import {
  processStreamDelta,
  initializeReasoningState,
  ReasoningState,
  DeltaProcessingResult
} from './deltaProcessing';
import {
  ToolCall,
  ChatMessage,
  ContextData,
  handleToolCalls,
  finalizeToolCallArguments,
  generateUUID,
  getProviderForModel,
  isReasoningModel,
  safelyUpdateStreamingMessage,
  ModelUtils
} from './streamingUtils';
import { supabase } from '../supabase';

// Interfaces for streaming chat
export interface StreamingChatParams {
  provider: string;
  model: string;
  messages: ChatMessage[];
  instructions?: string;
  contextData?: ContextData;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  tools?: any[];
  tool_choice?: any;
  response_format?: any;
  stream?: boolean;
  parallel_tool_calls?: boolean;
}

export interface StreamingState {
  messageId: string;
  threadId?: string;
  content: string;
  reasoningState: ReasoningState;
  pendingToolCalls: ToolCall[];
  hasDetectedToolCall: boolean;
  bufferingForToolCall: boolean;
  toolCallsFullyAccumulated: boolean;
  isCompleted: boolean;
  error: Error | null;
  metadata: any;
}

export interface StreamingCallbacks {
  onUpdate?: (content: string, state: StreamingState) => void;
  onComplete?: (finalContent: string, state: StreamingState) => void;
  onError?: (error: Error) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolCallComplete?: (toolResult: any) => void;
  onReasoningUpdate?: (reasoningContent: string) => void;
  onReasoningComplete?: (reasoningContent: string, duration?: number) => void;
}

/**
 * StreamProviderChat - Handles streaming chat with tool integration for iOS
 */
export class StreamProviderChat {
  private backendService: BackendProviderService;
  private chatService: ChatCompletionService;
  private activeStreams: Map<string, AbortController> = new Map();
  private toolRegistry: any = null; // Will be set via setToolRegistry

  constructor() {
    this.backendService = new BackendProviderService();
    this.chatService = new ChatCompletionService();
  }

  /**
   * Set tool registry for tool call execution
   */
  setToolRegistry(toolRegistry: any): void {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Stream chat completion with full tool and reasoning support
   */
  async streamChatCompletion(
    params: StreamingChatParams,
    callbacks: StreamingCallbacks = {},
    options: { signal?: AbortSignal } = {}
  ): Promise<StreamingState> {
    const streamId = generateUUID();
    const messageId = params.contextData?.messageId || generateUUID();
    
    console.log('🌊 [StreamProviderChat] Starting streaming chat:', {
      streamId,
      messageId,
      provider: params.provider,
      model: params.model,
      messageCount: params.messages.length,
      hasTools: !!params.tools?.length,
      hasInstructions: !!params.instructions
    });

    // Create abort controller for this stream
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);

    // Handle external abort signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        abortController.abort();
      });
    }

    // Initialize streaming state
    const state: StreamingState = {
      messageId,
      threadId: params.contextData?.threadId,
      content: '',
      reasoningState: initializeReasoningState(),
      pendingToolCalls: [],
      hasDetectedToolCall: false,
      bufferingForToolCall: false,
      toolCallsFullyAccumulated: false,
      isCompleted: false,
      error: null,
      metadata: {
        streamId,
        provider: params.provider,
        model: params.model,
        startTime: Date.now(),
        tokenCount: 0,
        reasoning: {
          isReasoningModel: isReasoningModel(params.model),
          startTime: null,
          duration: null
        }
      }
    };

    try {
      // Build system prompt if instructions are provided
      let formattedMessages = [...params.messages];
      if (params.instructions?.trim()) {
        const systemPrompt = await buildStructuredSystemPrompt(
          params.instructions,
          params.contextData || {},
          { enableMemories: true }
        );

        // Check if first message is already a system message
        if (formattedMessages[0]?.role === 'system') {
          formattedMessages[0] = { role: 'system', content: systemPrompt };
        } else {
          formattedMessages.unshift({ role: 'system', content: systemPrompt });
        }
      }

      // Get provider for the model
      const detectedProvider = getProviderForModel(params.model);
      const finalProvider = params.provider || detectedProvider;

      // Get model capabilities
      const modelCapabilities = ModelUtils.getModelCapabilities(params.model);

      // Prepare streaming parameters
      const streamParams: any = {
        provider: finalProvider,
        model: params.model,
        messages: formattedMessages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || Math.min(modelCapabilities.maxTokens, 4096),
        top_p: params.top_p || 1,
        frequency_penalty: params.frequency_penalty || 0,
        presence_penalty: params.presence_penalty || 0,
        stream: params.stream !== false, // Default to true
        parallel_tool_calls: params.parallel_tool_calls !== false, // Default to true
      };

      // Add tools if provided and supported
      if (params.tools?.length && modelCapabilities.supportsTools) {
        streamParams.tools = params.tools;
        if (params.tool_choice) {
          streamParams.tool_choice = params.tool_choice;
        }
      }

      // Add response format if provided
      if (params.response_format) {
        streamParams.response_format = params.response_format;
      }

      // Add contextData to match web app format
      if (params.contextData) {
        streamParams.contextData = params.contextData;
      }

      // Add instructions to match web app format
      if (params.instructions?.trim()) {
        streamParams.instructions = params.instructions;
      }

      console.log('📤 [StreamProviderChat] Stream parameters:', {
        provider: streamParams.provider,
        model: streamParams.model,
        messageCount: streamParams.messages.length,
        hasTools: !!streamParams.tools,
        maxTokens: streamParams.max_tokens,
        supportsTools: modelCapabilities.supportsTools,
        supportsVision: modelCapabilities.supportsVision
      });

      // Start the stream using BackendProviderService
      console.log('🚀 [StreamProviderChat] Starting stream with backend provider');
      
      await BackendProviderService.streamChatCompletion(
        streamParams,
        (chunk: string) => {
          console.log(`🔄 [StreamProviderChat] Processing chunk:`, {
            chunkLength: chunk.length,
            preview: chunk.substring(0, 50),
            currentContentLength: state.content.length
          });

          // Process each chunk through delta processing
          const deltaResult = processStreamDelta({
            delta: { content: chunk },
            modelProvider: finalProvider,
            modelName: params.model,
            messageId: state.messageId,
            reasoningState: state.reasoningState,
            pendingToolCalls: state.pendingToolCalls,
            bufferingForToolCall: state.bufferingForToolCall,
            hasDetectedToolCall: state.hasDetectedToolCall,
            toolCallsFullyAccumulated: state.toolCallsFullyAccumulated,
            toolChoice: params.tool_choice,
            contextData: params.contextData
          });

          console.log(`🔍 [StreamProviderChat] Delta processing result:`, {
            hasDeltaContent: !!deltaResult.deltaContent,
            deltaContentLength: deltaResult.deltaContent?.length || 0,
            hasReasoningContent: !!deltaResult.reasoningDeltaContent,
            reasoningContentLength: deltaResult.reasoningDeltaContent?.length || 0,
            hasToolCalls: deltaResult.hasDetectedToolCall,
            toolCallsCount: deltaResult.pendingToolCalls.length
          });

          // Update state from processing result
          state.reasoningState = deltaResult.reasoningState;
          state.pendingToolCalls = deltaResult.pendingToolCalls;
          state.bufferingForToolCall = deltaResult.bufferingForToolCall;
          state.hasDetectedToolCall = deltaResult.hasDetectedToolCall;
          state.toolCallsFullyAccumulated = deltaResult.toolCallsFullyAccumulated;

          // Handle reasoning content
          if (deltaResult.reasoningDeltaContent) {
            console.log(`🧠 [StreamProviderChat] Reasoning update: ${deltaResult.reasoningDeltaContent.length} chars`);
            callbacks.onReasoningUpdate?.(deltaResult.reasoningDeltaContent);
          }

          // Handle regular content
          if (deltaResult.deltaContent) {
            const beforeLength = state.content.length;
            state.content += deltaResult.deltaContent;
            state.metadata.tokenCount = (state.metadata.tokenCount || 0) + 1;

            console.log(`📝 [StreamProviderChat] Content update:`, {
              deltaLength: deltaResult.deltaContent.length,
              beforeLength,
              afterLength: state.content.length,
              preview: deltaResult.deltaContent.substring(0, 30)
            });

            callbacks.onUpdate?.(state.content, state);
          } else {
            console.log(`⚠️ [StreamProviderChat] No delta content in chunk`);
          }

          // Handle tool calls
          if (deltaResult.hasDetectedToolCall && deltaResult.pendingToolCalls.length > 0) {
            console.log(`🛠️ [StreamProviderChat] Tool calls detected:`, {
              toolCallCount: deltaResult.pendingToolCalls.length,
              toolNames: deltaResult.pendingToolCalls.map(tc => tc.function?.name)
            });
            for (const toolCall of deltaResult.pendingToolCalls) {
              callbacks.onToolCall?.(toolCall);
            }
          }
        },
        (finalContent: string) => {
          console.log('✅ [StreamProviderChat] Stream completed:', {
            messageId: state.messageId,
            finalContentLength: finalContent.length,
            stateContentLength: state.content.length,
            toolCallsCount: state.pendingToolCalls.length,
            finalPreview: finalContent.substring(0, 100),
            statePreview: state.content.substring(0, 100)
          });

          // Finalize reasoning if needed
          if (state.reasoningState.reasoningContent) {
            const reasoningDuration = state.reasoningState.reasoningStartTime 
              ? Date.now() - state.reasoningState.reasoningStartTime 
              : undefined;
            
            console.log('🧠 [StreamProviderChat] Finalizing reasoning:', {
              reasoningLength: state.reasoningState.reasoningContent.length,
              duration: reasoningDuration
            });
            
            callbacks.onReasoningComplete?.(state.reasoningState.reasoningContent, reasoningDuration);
            
            // Update state with reasoning info
            state.reasoningState = {
              ...state.reasoningState,
              reasoningDuration
            };
          }

          // Use the accumulated content from state, not the finalContent parameter
          // This ensures we have all the processed delta content
          const actualContent = state.content || finalContent;
          
          console.log('📤 [StreamProviderChat] Calling onComplete with:', {
            actualContentLength: actualContent.length,
            preview: actualContent.substring(0, 100)
          });

          state.content = actualContent;
          state.isCompleted = true;
          
          callbacks.onComplete?.(actualContent, state);
        },
        (error: any) => {
          console.error('❌ [StreamProviderChat] Stream error:', error);
          state.error = error;
          callbacks.onError?.(error);
        },
        options?.signal
      );

      // If we reach here without completion, mark as completed
      if (!state.isCompleted) {
        state.isCompleted = true;
        await this.finalizeStream(state, callbacks);
      }

    } catch (error: any) {
      console.error('❌ [StreamProviderChat] Stream error:', error);
      state.error = error;
      state.isCompleted = true;
      callbacks.onError?.(error);
    } finally {
      // Cleanup
      this.activeStreams.delete(streamId);
      console.log('🧹 [StreamProviderChat] Stream cleanup completed:', streamId);
    }

    return state;
  }

  /**
   * Update state from delta processing result
   */
  private updateStateFromProcessingResult(
    state: StreamingState,
    result: DeltaProcessingResult
  ): void {
    state.reasoningState = result.reasoningState;
    state.hasDetectedToolCall = result.hasDetectedToolCall;
    state.bufferingForToolCall = result.bufferingForToolCall;
    state.pendingToolCalls = result.pendingToolCalls;
    state.toolCallsFullyAccumulated = result.toolCallsFullyAccumulated;

    // Update metadata
    if (result.canvasTriggered) {
      state.metadata.canvasTriggered = true;
    }
    if (result.hasCodeInterpreterUpdates) {
      state.metadata.hasCodeInterpreterUpdates = true;
    }
  }

  /**
   * Finalize stream and handle tool calls
   */
  private async finalizeStream(
    state: StreamingState,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    try {
      console.log('🏁 [StreamProviderChat] Finalizing stream:', {
        messageId: state.messageId,
        contentLength: state.content.length,
        hasToolCalls: state.pendingToolCalls.length > 0,
        toolCallCount: state.pendingToolCalls.length
      });

      // Finalize tool calls if any
      if (state.pendingToolCalls.length > 0) {
        state.pendingToolCalls = finalizeToolCallArguments(
          state.pendingToolCalls,
          state.metadata.provider
        );

        // Execute tool calls if tool registry is available
        if (this.toolRegistry) {
          await this.executeToolCalls(state, callbacks);
        } else {
          console.warn('⚠️ [StreamProviderChat] Tool registry not set, skipping tool execution');
        }
      }

      // Update final metadata
      state.metadata.endTime = Date.now();
      state.metadata.duration = state.metadata.endTime - state.metadata.startTime;
      state.metadata.finalContentLength = state.content.length;

      // Call completion callback
      callbacks.onComplete?.(state.content, state);

      console.log('✅ [StreamProviderChat] Stream finalized successfully:', {
        messageId: state.messageId,
        duration: `${state.metadata.duration}ms`,
        tokenCount: state.metadata.tokenCount,
        toolCallsExecuted: state.pendingToolCalls.length
      });

    } catch (error) {
      console.error('❌ [StreamProviderChat] Error finalizing stream:', error);
      state.error = error as Error;
      callbacks.onError?.(error as Error);
    }
  }

  /**
   * Execute tool calls with built-in handlers for web search and image generation
   */
  private async executeToolCalls(
    state: StreamingState,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    if (state.pendingToolCalls.length === 0) {
      return;
    }

    console.log('🛠️ [StreamProviderChat] Executing tool calls:', {
      messageId: state.messageId,
      toolCallCount: state.pendingToolCalls.length,
      toolNames: state.pendingToolCalls.map(tc => tc.function?.name)
    });

    const toolResults: any[] = [];

    // Create a map to track tool call results
    const toolCallResultsMap = new Map<string, any>();

    for (let i = 0; i < state.pendingToolCalls.length; i++) {
      const toolCall = state.pendingToolCalls[i];
      
      try {
        console.log(`🔧 [StreamProviderChat] Executing tool: ${toolCall.function?.name}`);

        let result: any;

        // Handle built-in tools first
        if (toolCall.function?.name === 'web_search') {
          result = await this.handleWebSearchTool(toolCall);
        } else if (toolCall.function?.name === 'image_gen' || toolCall.function?.name === 'generate_image') {
          result = await this.handleImageGenerationTool(toolCall);
        } else if (this.toolRegistry) {
          // Use external tool registry for other tools
          result = await handleToolCalls(
            toolCall,
            (stateUpdate: any) => {
              // Handle state updates during tool execution
              console.log('📊 [StreamProviderChat] Tool state update:', stateUpdate);
            },
            this.toolRegistry,
            state.metadata.provider
          );
        } else {
          // Create a default result for unknown tools
          result = {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            content: JSON.stringify({
              error: `Tool "${toolCall.function?.name}" is not available`,
              tool_name: toolCall.function?.name
            }),
            name: toolCall.function?.name
          };
        }

        // Store result for separate tool messages
        toolResults.push(result);

        // Extract the actual tool execution result from the wrapped result
        let actualToolResult = result;
        
        // For image generation and web search, extract the nested result
        if (result.result && typeof result.result === 'object') {
          actualToolResult = result.result;
        } else if (result.content && typeof result.content === 'string') {
          try {
            // Try to parse JSON content for tool results
            const parsedContent = JSON.parse(result.content);
            if (parsedContent && typeof parsedContent === 'object') {
              actualToolResult = parsedContent;
            }
          } catch {
            // If parsing fails, use the original result
            actualToolResult = result;
          }
        }

        // Attach the result directly to the tool call (matching database structure)
        state.pendingToolCalls[i] = {
          ...toolCall,
          result: actualToolResult
        };

        // Store in map for quick lookup
        toolCallResultsMap.set(toolCall.id, actualToolResult);

        // Notify callback about tool completion
        callbacks.onToolCallComplete?.(result);

        console.log(`✅ [StreamProviderChat] Tool completed: ${toolCall.function?.name}`);

      } catch (toolError) {
        console.error(`❌ [StreamProviderChat] Tool error: ${toolCall.function?.name}:`, toolError);
        
        // Create error result
        const errorResult = {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify({
            error: (toolError as Error).message || 'Tool execution failed',
            tool_name: toolCall.function?.name
          }),
          name: toolCall.function?.name
        };

        // Store error result for separate tool messages
        toolResults.push(errorResult);

        // Attach error result to the tool call
        const errorToolResult = {
          error: (toolError as Error).message || 'Tool execution failed',
          tool_name: toolCall.function?.name,
          success: false
        };

        state.pendingToolCalls[i] = {
          ...toolCall,
          result: errorToolResult
        };

        // Store in map for quick lookup
        toolCallResultsMap.set(toolCall.id, errorToolResult);

        callbacks.onToolCallComplete?.(errorResult);
      }
    }

    // Store tool results in state metadata for backward compatibility
    state.metadata.toolResults = toolResults;
    state.metadata.toolCallResults = toolCallResultsMap;

    console.log('🏆 [StreamProviderChat] All tool calls completed:', {
      messageId: state.messageId,
      totalTools: state.pendingToolCalls.length,
      successfulTools: toolResults.filter(r => !r.content?.includes('error')).length,
      failedTools: toolResults.filter(r => r.content?.includes('error')).length,
      toolCallsWithResults: state.pendingToolCalls.filter(tc => tc.result).length
    });
  }

  /**
   * Handle web search tool execution
   */
  private async handleWebSearchTool(toolCall: ToolCall): Promise<any> {
    try {
      const args = JSON.parse(toolCall.function?.arguments || '{}');
      const query = args.query;
      const limit = args.limit || 10;

      if (!query) {
        throw new Error('Search query is required');
      }

      console.log('🔍 [StreamProviderChat] Executing web search:', { query, limit });

      const searchResult = await webSearchService.search({
        query,
        limit,
        searchContextSize: 'medium',
      });

      if ('error' in searchResult) {
        throw new Error(searchResult.message);
      }

      // Format search results for the AI
      const formattedResult = {
        query,
        results_found: searchResult.sources.length,
        summary: searchResult.content,
        sources: searchResult.sources.map((source, index) => ({
          position: index + 1,
          title: source.title,
          url: source.url,
          description: source.description,
          text_snippet: source.text?.substring(0, 300) + (source.text?.length > 300 ? '...' : ''),
        })),
        search_metadata: {
          timestamp: searchResult.metadata.timestamp,
          search_time: searchResult.metadata.searchTime,
          total_results: searchResult.totalResults,
        }
      };

      return {
        tool_call_id: toolCall.id,
        role: 'tool' as const,
        content: JSON.stringify(formattedResult, null, 2),
        name: 'web_search'
      };

    } catch (error) {
      console.error('❌ [StreamProviderChat] Web search tool error:', error);
      throw error;
    }
  }

  /**
   * Handle image generation tool execution
   */
  private async handleImageGenerationTool(toolCall: ToolCall): Promise<any> {
    try {
      const args = JSON.parse(toolCall.function?.arguments || '{}');
      const prompt = args.prompt;
      const model = args.model || 'gpt-image-1';
      const size = args.size || '1024x1024';

      if (!prompt) {
        throw new Error('Image prompt is required');
      }

      console.log('🎨 [StreamProviderChat] Executing image generation:', { prompt, model, size });

      const chatService = new ChatCompletionService();
      const imageResult = await chatService.generateImage({
        prompt,
        model,
        size,
        quality: 'medium',
        n: 1,
      });

      const formattedResult = {
        prompt,
        model,
        size,
        image_data: imageResult.data[0],
        metadata: {
          generated_at: new Date().toISOString(),
          provider: imageResult.model || model,
        }
      };

      return {
        tool_call_id: toolCall.id,
        role: 'tool' as const,
        content: JSON.stringify(formattedResult, null, 2),
        name: 'generate_image'
      };

    } catch (error) {
      console.error('❌ [StreamProviderChat] Image generation tool error:', error);
      throw error;
    }
  }

  /**
   * Abort a streaming session
   */
  abortStream(streamId: string): boolean {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      console.log('🛑 [StreamProviderChat] Stream aborted:', streamId);
      return true;
    }
    return false;
  }

  /**
   * Abort all active streams
   */
  abortAllStreams(): void {
    const streamIds = Array.from(this.activeStreams.keys());
    for (const streamId of streamIds) {
      this.abortStream(streamId);
    }
    console.log('🛑 [StreamProviderChat] All streams aborted:', streamIds.length);
  }

  /**
   * Get active stream count
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId);
  }

  /**
   * Create a simple chat completion (non-streaming)
   */
  async createChatCompletion(
    params: StreamingChatParams
  ): Promise<{ content: string; toolCalls?: ToolCall[]; metadata: any }> {
    console.log('💬 [StreamProviderChat] Creating chat completion (non-streaming):', {
      provider: params.provider,
      model: params.model,
      messageCount: params.messages.length
    });

    try {
      // Build system prompt if instructions are provided
      let formattedMessages = [...params.messages];
      if (params.instructions?.trim()) {
        const systemPrompt = await buildStructuredSystemPrompt(
          params.instructions,
          params.contextData || {},
          { enableMemories: true }
        );

        if (formattedMessages[0]?.role === 'system') {
          formattedMessages[0] = { role: 'system', content: systemPrompt };
        } else {
          formattedMessages.unshift({ role: 'system', content: systemPrompt });
        }
      }

      // Prepare completion parameters
      const completionParams = {
        provider: params.provider,
        model: params.model,
        messages: formattedMessages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 4096,
        top_p: params.top_p || 1,
        frequency_penalty: params.frequency_penalty || 0,
        presence_penalty: params.presence_penalty || 0,
        tools: params.tools,
        tool_choice: params.tool_choice,
        response_format: params.response_format
      };

      // Use backend service for completion
      const result = await this.backendService.createChatCompletion(completionParams);

      const content = result.choices[0].message.content || '';
      const toolCalls = result.choices[0].message.tool_calls || [];

      console.log('✅ [StreamProviderChat] Chat completion successful:', {
        contentLength: content.length,
        toolCallCount: toolCalls.length,
        finishReason: result.choices[0].finish_reason
      });

      return {
        content,
        toolCalls,
        metadata: {
          provider: params.provider,
          model: params.model,
          usage: result.usage,
          finishReason: result.choices[0].finish_reason,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ [StreamProviderChat] Chat completion error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const streamProviderChat = new StreamProviderChat();

export default StreamProviderChat; 