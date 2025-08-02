import { ApiClient, ApiError } from '../apiClient';
import { BackendProviderService } from './backendProviderService';
import { ChatCompletionService } from './chatCompletionService';
import { webSearchService } from './webSearchService';
import { editImage } from './imageEditingService';
import { imageGenerationService } from './imageGenerationService';
import { buildStructuredSystemPrompt } from './systemPromptBuilder';
import {
  processStreamDelta,
  initializeReasoningState,
  extractDeltaContent,
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
    
    // Initialize with built-in tools (web search and image generation)
    // Create a proper tool registry interface that matches what handleToolCalls expects
    this.toolRegistry = {
      // Map of tool implementations
      tools: {
        web_search: {
          id: 'web_search',
          execute: async (args: any) => {
            console.log(`🛠️ [StreamProviderChat] Executing web_search tool:`, args);
            const webSearchService = await import('../services/webSearchService');
            return await webSearchService.webSearchService.search(args);
          }
        },
        image_gen: {
          id: 'image_gen',
          execute: async (args: any) => {
            console.log(`🛠️ [StreamProviderChat] Executing image_gen tool:`, args);
            const imageService = await import('../services/imageGenerationService');
            return await imageService.ImageGenerationService.getInstance().generateImage(args);
          }
        },
        generate_image: {
          id: 'generate_image',
          execute: async (args: any) => {
            console.log(`🛠️ [StreamProviderChat] Executing generate_image tool:`, args);
            const imageService = await import('../services/imageGenerationService');
            return await imageService.ImageGenerationService.getInstance().generateImage(args);
          }
        },
        image_edit: {
          id: 'image_edit',
          execute: async (args: any) => {
            console.log(`🛠️ [StreamProviderChat] Executing image_edit tool:`, args);
            const imageEditService = await import('../services/imageEditingService');
            return await imageEditService.editImage(args);
          }
        }
      },
      
      // Method to get a tool by name (required by handleToolCalls)
      getTool: function(toolName: string) {
        console.log(`🔍 [StreamProviderChat] getTool called for: ${toolName}`, {
          availableTools: Object.keys(this.tools),
          hasRequestedTool: !!this.tools[toolName]
        });
        return this.tools[toolName] || null;
      },
      
      // Method to get tool statistics (useful for debugging)
      getStats: function() {
        return {
          totalTools: Object.keys(this.tools).length,
          availableTools: Object.keys(this.tools),
          toolDetails: Object.entries(this.tools).map(([name, tool]: [string, any]) => ({
            name,
            id: tool.id,
            hasExecute: typeof tool.execute === 'function'
          }))
        };
      },
      
      // Legacy method for backward compatibility
      executeTool: async function(toolName: string, args: any) {
        console.log(`🛠️ [StreamProviderChat] Legacy executeTool called for: ${toolName}`, args);
        const tool = this.tools[toolName];
        if (tool && typeof tool.execute === 'function') {
          return await tool.execute(args);
        }
        throw new Error(`Unknown tool: ${toolName}`);
      }
    };
    
    console.log('🌊 [StreamProviderChat] Initialized with built-in tool registry');
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
        originalMessages: params.messages, // Store original messages for follow-up stream
        instructions: params.instructions,
        contextData: params.contextData,
        temperature: params.temperature,
        maxTokens: params.max_tokens,
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
          // Parse the JSON chunk data from ApiClient
          let parsedChunk: any;
          try {
            parsedChunk = JSON.parse(chunk);
          } catch (error) {
            console.warn('🔄 [StreamProviderChat] Failed to parse chunk JSON, treating as text:', error);
            parsedChunk = { content: chunk };
          }

          // console.log(`🔍 [StreamProviderChat] Parsed chunk:`, {
          //   hasChoices: !!parsedChunk.choices,
          //   hasContent: !!parsedChunk.choices?.[0]?.delta?.content,
          //   hasToolCalls: !!parsedChunk.choices?.[0]?.delta?.tool_calls,
          //   toolCallsCount: parsedChunk.choices?.[0]?.delta?.tool_calls?.length || 0,
          //   finishReason: parsedChunk.choices?.[0]?.finish_reason,
          //   contentPreview: parsedChunk.choices?.[0]?.delta?.content?.substring(0, 30)
          // });

          // Process each chunk through delta processing with the correct format
          const deltaResult = processStreamDelta({
            delta: parsedChunk, // Pass the parsed chunk with proper structure
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
            toolCallsCount: deltaResult.pendingToolCalls.length,
            streamCompleted: deltaResult.streamCompleted,
            toolCallsFullyAccumulated: deltaResult.toolCallsFullyAccumulated,
            bufferingForToolCall: deltaResult.bufferingForToolCall,
            finishReason: parsedChunk.choices?.[0]?.finish_reason,
            toolCallIds: deltaResult.pendingToolCalls.map(tc => tc.id),
            toolCallNames: deltaResult.pendingToolCalls.map(tc => tc.function?.name),
            toolCallArgsLengths: deltaResult.pendingToolCalls.map(tc => tc.function?.arguments?.length || 0)
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
              toolNames: deltaResult.pendingToolCalls.map(tc => tc.function?.name),
              streamCompleted: deltaResult.streamCompleted,
              toolCallsFullyAccumulated: deltaResult.toolCallsFullyAccumulated
            });
            for (const toolCall of deltaResult.pendingToolCalls) {
              callbacks.onToolCall?.(toolCall);
            }
          }

          // Check if we should finalize due to tool calls completion
          if (deltaResult.streamCompleted || 
              (deltaResult.hasDetectedToolCall && 
               deltaResult.toolCallsFullyAccumulated && 
               deltaResult.pendingToolCalls.length > 0)) {
            console.log('🏁 [StreamProviderChat] Stream finalization triggered by tool calls:', {
              streamCompleted: deltaResult.streamCompleted,
              hasDetectedToolCall: deltaResult.hasDetectedToolCall,
              toolCallsFullyAccumulated: deltaResult.toolCallsFullyAccumulated,
              pendingToolCallsCount: deltaResult.pendingToolCalls.length,
              toolCallIds: deltaResult.pendingToolCalls.map(tc => tc.id),
              toolCallNames: deltaResult.pendingToolCalls.map(tc => tc.function?.name)
            });
            // Don't call finalize here - let the onComplete callback handle it
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
            toolCallsCount: state.pendingToolCalls.length,
            hasToolCalls: state.pendingToolCalls.length > 0,
            preview: actualContent.substring(0, 100),
            toolCallDetails: state.pendingToolCalls.map(tc => ({
              id: tc.id,
              name: tc.function?.name,
              argsLength: tc.function?.arguments?.length || 0,
              argsPreview: tc.function?.arguments?.substring(0, 50) || ''
            }))
          });

          state.content = actualContent;
          state.isCompleted = true;
          
          // If we have tool calls, finalize them before calling onComplete
          if (state.pendingToolCalls.length > 0) {
            console.log('🛠️ [StreamProviderChat] Tool calls detected in completion, finalizing...');
            // Don't call onComplete yet - let finalizeStream handle it
            this.finalizeStream(state, callbacks);
          } else {
            // Only call onComplete if not already called
            if (!state.metadata.completionCallbackCalled) {
              state.metadata.completionCallbackCalled = true;
          callbacks.onComplete?.(actualContent, state);
            }
          }
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
        console.log('🔄 [StreamProviderChat] Stream not marked complete, finalizing...');
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
        console.log('🔧 [StreamProviderChat] Finalizing tool calls:', {
          toolCallCount: state.pendingToolCalls.length,
          toolCalls: state.pendingToolCalls.map(tc => ({
            id: tc.id,
            name: tc.function?.name,
            argsLength: tc.function?.arguments?.length || 0,
            isStreaming: tc.isStreaming
          })),
          hasToolRegistry: !!this.toolRegistry
        });

        state.pendingToolCalls = finalizeToolCallArguments(
          state.pendingToolCalls,
          state.metadata.provider
        );

        console.log('🔧 [StreamProviderChat] After finalization:', {
          toolCallCount: state.pendingToolCalls.length,
          toolCalls: state.pendingToolCalls.map(tc => ({
            id: tc.id,
            name: tc.function?.name,
            argsLength: tc.function?.arguments?.length || 0,
            argsPreview: tc.function?.arguments?.substring(0, 50) || '',
            isStreaming: tc.isStreaming
          }))
        });

        // Execute tool calls if tool registry is available


        if (this.toolRegistry) {
          if (typeof this.toolRegistry.getTool === 'function') {
            await this.executeToolCalls(state, callbacks);
          } else {
            console.error('❌ [StreamProviderChat] Tool registry missing getTool method');
          }
        } else {
          console.warn('⚠️ [StreamProviderChat] Tool registry not set, skipping tool execution');
        }
      }

      // Update final metadata
      state.metadata.endTime = Date.now();
      state.metadata.duration = state.metadata.endTime - state.metadata.startTime;
      state.metadata.finalContentLength = state.content.length;

      // Call completion callback only if not already completed
      if (!state.metadata.completionCallbackCalled) {
        state.metadata.completionCallbackCalled = true;
      callbacks.onComplete?.(state.content, state);
      }

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

    const toolResults: any[] = [];

    // Execute each tool call
    for (let i = 0; i < state.pendingToolCalls.length; i++) {
      const toolCall = state.pendingToolCalls[i];
      
      try {
        console.log(`🔧 [StreamProviderChat] Executing tool: ${toolCall.function?.name} (${i + 1}/${state.pendingToolCalls.length})`);

        let result: any;

        // Handle built-in tools first
        if (toolCall.function?.name === 'web_search') {
          result = await this.handleWebSearchTool(toolCall);
        } else if (toolCall.function?.name === 'image_gen' || toolCall.function?.name === 'generate_image') {
          result = await this.handleImageGenerationTool(toolCall);
        } else if (toolCall.function?.name === 'image_edit') {
          result = await this.handleImageEditingTool(toolCall, state.metadata);
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
          // Create a default error result for unknown tools
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

        // 📊 LOG TOOL RESULT - Detailed logging for debugging
        console.log(`📊 [StreamProviderChat] Tool result received for "${toolCall.function?.name}":`, {
          toolCallId: toolCall.id,
          toolName: toolCall.function?.name,
          resultType: typeof result,
          resultSize: typeof result === 'string' ? result.length : JSON.stringify(result).length,
          hasError: result && typeof result === 'object' && 'error' in result,
          resultPreview: typeof result === 'string' 
            ? result.substring(0, 200) + (result.length > 200 ? '...' : '')
            : JSON.stringify(result, null, 2).substring(0, 300) + (JSON.stringify(result, null, 2).length > 300 ? '...' : ''),
          fullResult: result // Full result for debugging
        });

        // Format the tool result properly
        const formattedResult = {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: typeof result === 'string' ? result : JSON.stringify(result),
          name: toolCall.function?.name,
          result: result // Keep the original result for metadata
        };

        toolResults.push(formattedResult);
        
        // Add result to the tool call itself
        toolCall.result = result;

        console.log(`✅ [StreamProviderChat] Tool "${toolCall.function?.name}" executed successfully`);

        // Notify callback about tool completion
        callbacks.onToolCallComplete?.(formattedResult);

      } catch (error) {
        console.error(`❌ [StreamProviderChat] Tool "${toolCall.function?.name}" execution failed:`, error);
        
        // Create error result
        const errorResult = {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed',
            tool_name: toolCall.function?.name,
            timestamp: new Date().toISOString()
          }),
          name: toolCall.function?.name,
          result: { error: true, message: error instanceof Error ? error.message : 'Unknown error' }
        };

        toolResults.push(errorResult);
        toolCall.result = errorResult.result;
      }
    }

    // Store tool results in state metadata
    state.metadata.toolResults = toolResults;
    
    // 🏁 LOG TOOL EXECUTION SUMMARY - Complete overview of all tool results
    console.log(`🏁 [StreamProviderChat] All ${state.pendingToolCalls.length} tools executed. Results summary:`);
    console.log('📈 [StreamProviderChat] Tool execution results:', {
      totalTools: state.pendingToolCalls.length,
      successfulTools: toolResults.filter(r => !r.result?.error).length,
      failedTools: toolResults.filter(r => r.result?.error).length,
      toolSummary: toolResults.map((result, index) => ({
        index: index + 1,
        toolName: result.name,
        toolCallId: result.tool_call_id,
        success: !result.result?.error,
        resultSize: result.content.length,
        hasData: !!result.result && typeof result.result === 'object' && Object.keys(result.result).length > 0,
        errorMessage: result.result?.error ? (result.result.message || 'Unknown error') : null
      })),
      nextStep: 'follow-up-stream',
      timestamp: new Date().toISOString()
    });

    // Now start the follow-up stream to get AI's response based on tool results
    try {
      await this.executeFollowUpStream(state, toolResults, callbacks);
    } catch (followUpError) {
      console.error('❌ [StreamProviderChat] Follow-up stream failed:', followUpError);
      // Even if follow-up fails, we should still call completion with tool results
      callbacks.onComplete?.(state.content, state);
    }
  }

  /**
   * Execute follow-up stream after tool calls to get AI's response based on tool results
   * This matches the web app's proven pattern
   */
  private async executeFollowUpStream(
    state: StreamingState,
    toolResults: any[],
    callbacks: StreamingCallbacks
  ): Promise<void> {
    try {
      console.log('🌊 [StreamProviderChat] Starting follow-up stream with tool results');

      // Create follow-up messages array that includes:
      // 1. Original conversation history
      // 2. Assistant message with tool calls
      // 3. Tool result messages
      const followUpMessages: any[] = [];

      // Get the original conversation context from state
      const originalMessages = state.metadata.originalMessages || [];
      
      // Add original conversation history (excluding the last user message which will be re-added)
      followUpMessages.push(...originalMessages.slice(0, -1));

      // Add the last user message
      if (originalMessages.length > 0) {
        followUpMessages.push(originalMessages[originalMessages.length - 1]);
      }

      // Add assistant message with tool calls (minimal content)
      followUpMessages.push({
        role: 'assistant',
        content: ' ', // Minimal content as per web app pattern
        tool_calls: state.pendingToolCalls
      });

      // Add tool result messages
      for (const toolResult of toolResults) {
        followUpMessages.push({
          role: 'tool',
          tool_call_id: toolResult.tool_call_id,
          content: toolResult.content,
          name: toolResult.name
        });
      }

      // Prepare follow-up stream parameters
      const followUpParams: StreamingChatParams = {
        provider: state.metadata.provider,
        model: state.metadata.model,
        messages: followUpMessages,
        instructions: state.metadata.instructions,
        contextData: state.metadata.contextData,
        temperature: state.metadata.temperature || 0.7,
        max_tokens: state.metadata.maxTokens || 4096,
        stream: true,
        tools: [], // Disable tools in follow-up to prevent recursion
        tool_choice: 'none' // Explicitly disable tool choice
      };

      // 🌊 LOG FOLLOW-UP STREAM START - Detailed request body logging
      console.log('🌊 [StreamProviderChat] Follow-up stream starting after tool execution:');
      console.log('📊 [StreamProviderChat] Follow-up stream summary:', {
        messageCount: followUpParams.messages.length,
        toolResultsCount: toolResults.length,
        provider: followUpParams.provider,
        model: followUpParams.model,
        temperature: followUpParams.temperature,
        maxTokens: followUpParams.max_tokens,
        hasInstructions: !!followUpParams.instructions,
        hasContextData: !!followUpParams.contextData,
        toolsDisabled: followUpParams.tools?.length === 0,
        toolChoice: followUpParams.tool_choice
      });

      // 📋 LOG COMPLETE REQUEST BODY - Full request for debugging
      console.log('📋 [StreamProviderChat] Follow-up stream complete request body:', {
        ...followUpParams,
        messages: followUpParams.messages.map((msg, index) => {
          const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          const contentPreview = contentStr.substring(0, 100) + (contentStr.length > 100 ? '...' : '');
          return {
            index,
            role: msg.role,
            contentLength: contentStr.length,
            contentPreview,
            hasToolCalls: !!msg.tool_calls,
            toolCallsCount: msg.tool_calls?.length || 0,
            toolCallId: msg.tool_call_id,
            name: msg.name
          };
        }),
        instructions: followUpParams.instructions ? 
          followUpParams.instructions.substring(0, 150) + (followUpParams.instructions.length > 150 ? '...' : '') 
          : null
      });

      // 🔍 LOG TOOL RESULTS BEING SENT
      console.log('🔍 [StreamProviderChat] Tool results being included in follow-up:', 
        toolResults.map((result, index) => ({
          index,
          toolCallId: result.tool_call_id,
          toolName: result.name,
          contentLength: result.content.length,
          contentPreview: result.content.substring(0, 150) + (result.content.length > 150 ? '...' : ''),
          hasResult: !!result.result,
          resultType: typeof result.result
        }))
      );

      // Create a new stream ID for the follow-up
      const followUpStreamId = this.generateStreamId();
      const followUpMessageId = `${state.messageId}_followup`;

      // Create follow-up streaming state
      const followUpState: StreamingState = {
        messageId: followUpMessageId,
        threadId: state.threadId,
        content: '',
        reasoningState: initializeReasoningState(),
        pendingToolCalls: [],
        hasDetectedToolCall: false,
        bufferingForToolCall: false,
        toolCallsFullyAccumulated: false,
        isCompleted: false,
        error: null,
        metadata: {
          ...state.metadata,
          isFollowUpStream: true,
          originalMessageId: state.messageId,
          toolResults: toolResults
        }
      };

      // Set up follow-up callbacks that will update the original message
      const followUpCallbacks: StreamingCallbacks = {
        onUpdate: (content: string, followUpStreamState: StreamingState) => {
          // Update the original message with accumulated follow-up content
          callbacks.onUpdate?.(content, {
            ...state,
            content: content,
            metadata: {
              ...state.metadata,
              followUpContent: content,
              toolResults: toolResults
            }
          });
        },
        onComplete: (finalContent: string, followUpStreamState: StreamingState) => {
          console.log('✅ [StreamProviderChat] Follow-up stream completed');
          
          // Update the final state with complete content and tool results
          const finalState: StreamingState = {
            ...state,
            content: finalContent,
            isCompleted: true,
            metadata: {
              ...state.metadata,
              followUpContent: finalContent,
              toolResults: toolResults,
              toolExecutionComplete: true
            }
          };

          callbacks.onComplete?.(finalContent, finalState);
        },
        onError: (error: Error) => {
          console.error('❌ [StreamProviderChat] Follow-up stream error:', error);
          callbacks.onError?.(error);
        },
        onReasoningUpdate: callbacks.onReasoningUpdate,
        onReasoningComplete: callbacks.onReasoningComplete
      };

      // 🚀 LOG STREAM INITIATION - Right before making the API call
      console.log('🚀 [StreamProviderChat] Initiating follow-up stream API call:', {
        streamId: followUpStreamId,
        messageId: followUpMessageId,
        timestamp: new Date().toISOString(),
        endpoint: 'BackendProviderService.streamChatCompletion',
        isFollowUpStream: true,
        originalMessageId: state.messageId,
        toolExecutionComplete: true
      });

      // Start the follow-up stream
      await BackendProviderService.streamChatCompletion(
        followUpParams,
        (chunk: string) => {
          // Parse the JSON chunk data from ApiClient (same as main stream)
          let parsedChunk: any;
          try {
            parsedChunk = JSON.parse(chunk);
          } catch (error) {
            console.warn('🔄 [StreamProviderChat] Follow-up: Failed to parse chunk JSON, treating as text:', error);
            parsedChunk = { content: chunk };
          }

          const { content: deltaContent } = extractDeltaContent(parsedChunk, followUpParams.provider);
          followUpState.content += deltaContent;
          followUpCallbacks.onUpdate?.(followUpState.content, followUpState);
        },
        (finalContent: string) => {
          followUpState.content = finalContent;
          followUpState.isCompleted = true;
          followUpCallbacks.onComplete?.(finalContent, followUpState);
        },
        (error: any) => {
          followUpCallbacks.onError?.(error);
        }
      );

    } catch (error) {
      console.error('❌ [StreamProviderChat] Follow-up stream execution failed:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate a unique stream ID
   */
  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
      const name = args.name || 'Generated Image';
      const model = args.model || 'gpt-image-1';
      const size = args.size || '1024x1024';
      const quality = args.quality || 'medium';

      if (!prompt) {
        throw new Error('Image prompt is required');
      }

      console.log('🎨 [StreamProviderChat] Executing image generation:', { prompt, name, model, size, quality });

      const imageResult = await imageGenerationService.generateImage({
        prompt,
        name,
        model,
        size: size as any,
        quality: quality as any,
      });

      if (!imageResult.success) {
        throw new Error(imageResult.error || 'Image generation failed');
      }

      const formattedResult = {
        prompt,
        name,
        model,
        size,
        quality,
        url: imageResult.result.data.url,
        image_data: imageResult.result.data,
        metadata: {
          generated_at: imageResult.result.metadata.timestamp,
          provider: imageResult.result.data.provider,
          format: imageResult.result.metadata.format,
          is_direct_url: imageResult.result.data.isDirectUrl,
        }
      };

      return {
        tool_call_id: toolCall.id,
        role: 'tool' as const,
        content: JSON.stringify(formattedResult, null, 2),
        name: 'image_gen'
      };

    } catch (error) {
      console.error('❌ [StreamProviderChat] Image generation tool error:', error);
      throw error;
    }
  }

  /**
   * Handle image editing tool execution
   */
  private async handleImageEditingTool(toolCall: ToolCall, contextData?: any): Promise<any> {
    try {
      const args = JSON.parse(toolCall.function?.arguments || '{}');
      const prompt = args.prompt;
      const model = args.model || 'gpt-image-1';
      const size = args.size || '1024x1024';
      const name = args.name || 'Edited Image';
      let imageUrls = args.image_urls || [];
      const maskUrl = args.mask_url;

      if (!prompt) {
        throw new Error('Image editing prompt is required');
      }

      // If no image URLs provided in arguments, try to extract from conversation context
      if (!imageUrls || imageUrls.length === 0) {
        console.log('🎨 [StreamProviderChat] Extracting image URLs from context');
        
        // Extract from context data (vision_image_urls)
        if (contextData?.vision_image_urls && contextData.vision_image_urls.length > 0) {
          imageUrls = contextData.vision_image_urls;
          console.log('🎨 [StreamProviderChat] Found images in vision context:', imageUrls.length);
        }
        // Also check for file URLs if files are available
        else if (contextData?.file_ids && contextData.current_file_names) {
          const imageFiles = contextData.current_file_names.filter((name: string) => 
            /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name)
          );
          if (imageFiles.length > 0) {
            console.log('🎨 [StreamProviderChat] Found image files in context:', imageFiles);
            // Would need to convert file IDs to URLs based on your storage system
            // For now, we'll still need the URLs to be provided
          }
        }

        // If still no images found, throw an error
        if (!imageUrls || imageUrls.length === 0) {
          throw new Error('No images found for editing. Please upload an image first or provide image URLs.');
        }
      }

      console.log('🎨 [StreamProviderChat] Executing image editing:', { 
        prompt: prompt.substring(0, 100) + '...', 
        model, 
        size, 
        imageCount: imageUrls.length,
        hasMask: !!maskUrl
      });

      const editResult = await editImage({
        prompt,
        imageUrls,
        maskUrl,
        size: size as any,
        n: 1,
        model,
      });

      if (!editResult.success) {
        throw new Error(editResult.error || 'Image editing failed');
      }

      const formattedResult = {
        prompt,
        model,
        size,
        name,
        original_images: imageUrls,
        edited_images: editResult.result.data.images,
        metadata: {
          edited_at: new Date().toISOString(),
          provider: model,
          mask_used: !!maskUrl,
          image_count: editResult.result.data.images.length,
        }
      };

      return {
        tool_call_id: toolCall.id,
        role: 'tool' as const,
        content: JSON.stringify(formattedResult, null, 2),
        name: 'image_edit'
      };

    } catch (error) {
      console.error('❌ [StreamProviderChat] Image editing tool error:', error);
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