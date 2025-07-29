import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { ThreadManager } from '@/lib/threads';
import { useAssistantStore } from '@/lib/assistantStore';
import { 
  StreamProviderChat,
  StreamingChatParams,
  StreamingCallbacks,
  StreamingState 
} from '@/lib/services/streamProviderChat';
import { ChatCompletionService } from '@/lib/services/chatCompletionService';
import { webSearchService } from '@/lib/services/webSearchService';
import { buildStructuredSystemPrompt } from '@/lib/services/systemPromptBuilder';
import { searchVectorStore, formatRetrievalResults, getThreadVectorStore } from '@/lib/content';
import { VectorStoreFile } from '@/lib/content';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: any;
  files?: VectorStoreFile[];
  toolCalls?: any[];
  toolCallId?: string;
  name?: string;
  reasoningContent?: string;
  reasoningMetadata?: any;
}

export interface UseChatOptions {
  threadId?: string;
  workspaceId?: string;
  model?: string;
  provider?: string;
  instructions?: string;
  tools?: any[];
  toolChoice?: any;
  temperature?: number;
  maxTokens?: number;
  enableRetrieval?: boolean;
  enableMemories?: boolean;
  onError?: (error: Error) => void;
  onThreadTitleUpdated?: (threadId: string, newTitle: string) => void;
  onToolCall?: (toolCall: any) => void;
  onReasoningUpdate?: (content: string) => void;
}

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  streamingMessageId: string | null;
  sendMessage: (
    content: string, 
    files?: VectorStoreFile[], 
    toolChoice?: { toolId: string; toolName: string } | null,
    options?: { 
      temperature?: number;
      maxTokens?: number;
      provider?: string;
      model?: string;
    }
  ) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  loadMessages: () => Promise<void>;
  retryLastMessage: () => Promise<void>;
  getCurrentStreamingState: () => StreamingState | null;
  switchModel: (newModel: string) => Promise<boolean>;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    threadId,
    workspaceId,
    model = 'gpt-4o',
    provider = 'openai',
    instructions,
    tools,
    toolChoice,
    temperature = 0.7,
    maxTokens = 4096,
    enableRetrieval = true,
    enableMemories = true,
    onError,
    onThreadTitleUpdated,
    onToolCall,
    onReasoningUpdate,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentStreamingState, setCurrentStreamingState] = useState<StreamingState | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');
  const streamProviderChatRef = useRef<StreamProviderChat | null>(null);

  // Initialize StreamProviderChat
  useEffect(() => {
    if (!streamProviderChatRef.current) {
      streamProviderChatRef.current = new StreamProviderChat();
      console.log('🌊 [useChat] StreamProviderChat initialized');
    }
  }, []);

  // Sync with assistant store changes
  useEffect(() => {
    const unsubscribe = useAssistantStore.subscribe((state) => {
      if (state.currentAssistant) {
        console.log('🔄 [useChat] Assistant changed, new model:', state.currentAssistant.model);
      }
    });

    return unsubscribe;
  }, []);

  // Network connectivity monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });

    return unsubscribe;
  }, []);

  // Load existing messages if threadId is provided
  useEffect(() => {
    if (threadId) {
      // Clear messages when switching threads to prevent showing old messages briefly
      setMessages([]);
      loadMessages();
    } else {
      // Clear messages if no threadId
      setMessages([]);
    }
  }, [threadId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamProviderChatRef.current) {
        streamProviderChatRef.current.abortAllStreams();
      }
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!threadId) {
      console.log('Skipping message load - no threadId provided');
      return;
    }

    try {
      console.log('🔄 [useChat] Loading messages for thread:', threadId);
      
      // Use ThreadManager to load messages
      const messagesData = await ThreadManager.getThreadMessages(threadId);
      
      const formattedMessages: Message[] = messagesData.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata,
        // Check tool_calls column first (new format), then fall back to metadata (old format)
        toolCalls: msg.tool_calls || msg.metadata?.toolCalls,
        toolCallId: msg.metadata?.toolCallId,
        name: msg.metadata?.name,
        reasoningContent: msg.metadata?.reasoningContent,
        reasoningMetadata: msg.metadata?.reasoningMetadata,
      }));

      console.log(`🔄 [useChat] Loaded ${formattedMessages.length} messages for thread ${threadId}`);
      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('🔄 [useChat] Error loading thread messages:', error);
      onError?.(error);
    }
  }, [threadId, onError]);

  const saveMessageToDatabase = useCallback(async (message: Message) => {
    if (!threadId || !workspaceId) {
      console.log('Skipping database save - no threadId or workspaceId provided');
      return;
    }

    try {
      // Prepare metadata with all message properties except toolCalls (which goes in dedicated column)
      const messageMetadata = {
        ...message.metadata,
        toolCallId: message.toolCallId,
        name: message.name,
        reasoningContent: message.reasoningContent,
        reasoningMetadata: message.reasoningMetadata,
        isStreaming: message.isStreaming,
      };

      // Remove toolCalls from metadata since it has its own column
      delete messageMetadata.toolCalls;

      const { error } = await supabase
        .from('thread_messages')
        .insert({
          thread_id: threadId,
          workspace_id: workspaceId,
          message_id: message.id,
          role: message.role,
          content: message.content,
          tool_calls: message.toolCalls || null, // Store in dedicated column
          metadata: messageMetadata,
        });

      if (error) {
        console.error('Error saving message:', error);
        onError?.(error);
      } else {
        console.log(`💾 [useChat] Message saved to database: ${message.id}`, {
          hasToolCalls: !!message.toolCalls?.length,
          toolCallCount: message.toolCalls?.length || 0
        });
      }
    } catch (error: any) {
      console.error('Error saving message to database:', error);
      onError?.(error);
    }
  }, [threadId, workspaceId, onError]);

  const getCurrentStreamingState = useCallback(() => {
    return currentStreamingState;
  }, [currentStreamingState]);

  const sendMessage = useCallback(async (
    content: string, 
    files?: VectorStoreFile[], 
    toolChoiceOverride?: { toolId: string; toolName: string } | null,
    messageOptions: { 
      temperature?: number;
      maxTokens?: number;
      provider?: string;
      model?: string;
    } = {}
  ) => {
    if (!content.trim() || isLoading) return;

    if (!isConnected) {
      Alert.alert('No Internet Connection', 'Please check your internet connection and try again.');
      return;
    }

    if (!streamProviderChatRef.current) {
      Alert.alert('Error', 'Chat service not initialized');
      return;
    }

    lastUserMessageRef.current = content.trim();

    // Merge options with defaults
    const finalOptions = {
      temperature: messageOptions.temperature ?? temperature,
      maxTokens: messageOptions.maxTokens ?? maxTokens,
      provider: messageOptions.provider ?? provider,
      model: messageOptions.model ?? model,
    };

    // Handle special tool processing before sending to AI
    let processedContent = content.trim();
    let shouldBypassAI = false;
    
    // Handle image generation tool
    if (toolChoiceOverride?.toolId === 'create-image') {
      console.log('🎨 [useChat] Processing image generation request');
      try {
        const chatService = new ChatCompletionService();
        const imageResult = await chatService.generateImage({
          prompt: processedContent,
          model: 'gpt-image-1', // Default image model
          size: '1024x1024',
          quality: 'medium',
          n: 1,
        });

        // Create image response message
        const imageMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `I've generated an image based on your request: "${processedContent}"`,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            toolResult: true,
            toolType: 'image_generation',
            imageData: imageResult.data[0],
            prompt: processedContent,
          },
        };

        // Add user message and image result
        const userMessage: Message = {
          id: Date.now().toString(),
          content: processedContent,
          role: 'user',
          timestamp: new Date(),
          files: files && files.length > 0 ? files : undefined,
        };

        setMessages(prev => [...prev, userMessage, imageMessage]);
        
        // Save messages to database
        await saveMessageToDatabase(userMessage);
        await saveMessageToDatabase(imageMessage);
        
        // Clear tool selection
        if (onToolCall) {
          onToolCall({ type: 'image_generation', result: imageResult });
        }
        
        return;
      } catch (error) {
        console.error('❌ [useChat] Image generation error:', error);
        Alert.alert('Error', 'Failed to generate image. Please try again.');
        return;
      }
    }

    // Handle web search tool
    if (toolChoiceOverride?.toolId === 'web-search') {
      console.log('🔍 [useChat] Processing web search request');
      try {
        const searchResult = await webSearchService.search({
          query: processedContent,
          limit: 10,
          searchContextSize: 'medium',
        });

        if ('error' in searchResult) {
          throw new Error(searchResult.message);
        }

        // Format search results for context
        const searchContext = `Here are the search results for "${processedContent}":\n\n${searchResult.content}\n\nSources:\n${searchResult.sources.map((source, index) => `${index + 1}. ${source.title} - ${source.url}`).join('\n')}`;
        
        // Update content to include search context and continue with AI processing
        processedContent = `Based on the following web search results, please provide a comprehensive answer to the user's question: "${content}"\n\n${searchContext}`;
        
        console.log('🔍 [useChat] Web search completed, proceeding with AI processing');
      } catch (error) {
        console.error('❌ [useChat] Web search error:', error);
        Alert.alert('Error', 'Failed to perform web search. Please try again.');
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(), // Use original content for display
      role: 'user',
      timestamp: new Date(),
      files: files && files.length > 0 ? files : undefined,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setStreamingMessageId(assistantMessageId);

    // Save user message to database
    await saveMessageToDatabase(userMessage);

    // Update thread title if this is the first message
    if (threadId && messages.length === 0) {
      // Update title in background - don't wait for it
      ThreadManager.updateThreadTitle(threadId, userMessage.content).then((success) => {
        if (success) {
          // Get the updated title and notify parent component
          ThreadManager.getThread(threadId).then((thread) => {
            if (thread) {
              onThreadTitleUpdated?.(threadId, thread.title);
            }
          });
        }
      }).catch((error) => {
        console.error('Error updating thread title:', error);
      });
    }

    try {
      console.log('🚀 [useChat] Starting message send:', {
        provider: finalOptions.provider,
        model: finalOptions.model,
        hasInstructions: !!instructions,
        hasTools: !!tools?.length,
        enableRetrieval,
        enableMemories,
        threadId,
        workspaceId,
        toolSelected: toolChoiceOverride?.toolId
      });

      // Get current assistant and model from assistant store
      const currentAssistant = useAssistantStore.getState().currentAssistant;
      const actualModel = currentAssistant?.model || finalOptions.model || model;
      
      // Determine provider based on the current model
      const getProviderForModel = (modelName: string): string => {
        if (!modelName) return 'openai';
        const lowerModel = modelName.toLowerCase();
        
        if (lowerModel.includes('gpt') || lowerModel.includes('o1') || lowerModel.includes('dall-e')) {
          return 'openai';
        }
        if (lowerModel.includes('claude')) {
          return 'anthropic';
        }
        if (lowerModel.includes('gemini') || lowerModel.includes('palm') || lowerModel.includes('bison')) {
          return 'gemini';
        }
        if (lowerModel.includes('mistral') || lowerModel.includes('mixtral')) {
          return 'mistral';
        }
        if (lowerModel.includes('deepseek')) {
          return 'deepseek';
        }
        if (lowerModel.includes('grok') || lowerModel.includes('xai')) {
          return 'xai';
        }
        if (lowerModel.includes('llama') || lowerModel.includes('mixtral-8x7b')) {
          return 'groq';
        }
        if (lowerModel.includes('command') || lowerModel.includes('cohere')) {
          return 'cohere';
        }
        if (lowerModel.includes('sonar') || lowerModel.includes('perplexity')) {
          return 'perplexity';
        }
        return 'openai';
      };

      const actualProvider = getProviderForModel(actualModel);

      console.log('🚀 [useChat] Using assistant model:', {
        assistantId: currentAssistant?.id,
        assistantName: currentAssistant?.name,
        actualModel,
        actualProvider,
        requestedProvider: finalOptions.provider,
        requestedModel: finalOptions.model
      });

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Prepare retrieval context if enabled
      let retrievalContext = '';
      let vectorStoreId: string | null = null;
      let workspaceVectorStoreId: string | null = null;
      
      if (enableRetrieval && threadId) {
        vectorStoreId = await getThreadVectorStore(threadId);
        
        if (vectorStoreId) {
          console.log('🔍 [useChat] Performing vector store search for context');
          const searchResults = await searchVectorStore(
            vectorStoreId,
            userMessage.content,
            5,
            {
              scoreThreshold: 0.4,
              enableStrictFiltering: true,
            }
          );
          
          if (searchResults.length > 0) {
            retrievalContext = formatRetrievalResults(searchResults);
            console.log(`✅ [useChat] Found ${searchResults.length} relevant documents`);
          }
        }
      }

      // Get workspace vector store if in workspace context
      if (workspaceId) {
        try {
          // You might need to implement this function based on your workspace setup
          // workspaceVectorStoreId = await getWorkspaceVectorStore(workspaceId);
        } catch (error) {
          console.log('No workspace vector store found');
        }
      }

      // Prepare conversation history
      const conversationHistory: any[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.toolCalls,
        tool_call_id: msg.toolCallId,
        name: msg.name,
      }));

      // Use processed content (which may include search results) for AI processing
      let userContent = processedContent;
      if (retrievalContext) {
        userContent = `${processedContent}\n\n${retrievalContext}`;
      }

      // Add vision images if any
      if (files && files.length > 0) {
        const imageFiles = files.filter(f => f.isImage && f.publicUrl);
        if (imageFiles.length > 0) {
          // For vision, create content array with text and images
          const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            { type: 'text', text: userContent }
          ];
          
          for (const imageFile of imageFiles) {
            if (imageFile.publicUrl) {
              contentArray.push({
                type: 'image_url',
                image_url: { url: imageFile.publicUrl }
              });
            }
          }
          
          conversationHistory.push({
            role: 'user',
            content: contentArray,
          });
        } else {
          conversationHistory.push({
            role: 'user',
            content: userContent,
          });
        }
      } else {
        conversationHistory.push({
          role: 'user',
          content: userContent,
        });
      }

      // Prepare context data to match web app format
      const contextData = {
        threadId,
        workspaceId,
        messageId: assistantMessageId,
        is_workspace_chat: !!workspaceId,
        workspace_initiated: !!workspaceId,
        from_workspace_chat: !!workspaceId,
        has_files: !!(files && files.length > 0),
        file_count: files ? files.length : 0,
        has_images: !!(files && files.some(f => f.isImage)),
        image_count: files ? files.filter(f => f.isImage).length : 0,
        vision_image_urls: files ? files.filter(f => f.isImage && f.publicUrl).map(f => f.publicUrl!) : [],
        enable_retrieval: enableRetrieval,
        modelProvider: actualProvider,
        actualProviderName: actualProvider,
        vector_store_id: vectorStoreId, // Will be set if we have retrieval context
        workspace_vector_store_id: workspaceVectorStoreId, // Will be set if workspace has vector store
        file_ids: files ? files.map(f => f.id) : [],
        current_file_names: files ? files.map(f => f.name) : [],
      };

      // Prepare available tools for the AI (not forced tool choice)
      const availableTools = [
        {
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search the web for current information and real-time data',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to execute'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 10)',
                  default: 10
                },
                searchContextSize: {
                  type: 'string',
                  description: 'Search context size - affects cost and quality (default: medium)',
                  enum: ['low', 'medium', 'high'],
                  default: 'medium'
                }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'image_gen',
            description: 'Generate images using AI. Can create detailed, high-quality images from text descriptions.',
            parameters: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Detailed description of the image to generate'
                },
                name: {
                  type: 'string',
                  description: 'Name or title for the generated image'
                },
                model: {
                  type: 'string',
                  description: 'Image generation model to use',
                  enum: ['gpt-image-1', 'dall-e-3', 'flux-1.1-pro'],
                  default: 'gpt-image-1'
                },
                size: {
                  type: 'string',
                  description: 'Image size',
                  enum: ['1024x1024', '1792x1024', '1024x1792'],
                  default: '1024x1024'
                },
                quality: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Image quality level',
                  default: 'medium'
                }
              },
              required: ['prompt', 'name']
            }
          }
        }
      ];

      // Build structured system prompt using systemPromptBuilder
      let systemPrompt = '';
      try {
        systemPrompt = await buildStructuredSystemPrompt(
          currentAssistant?.instructions || instructions || '',
          contextData,
          {
            enableExamples: true,
            enableAntiPatterns: true,
            enableQuantifiedGuidelines: true,
            enableMemories: enableMemories,
          }
        );
      } catch (error) {
        console.warn('Failed to build structured system prompt, using basic instructions:', error);
        systemPrompt = currentAssistant?.instructions || instructions || '';
      }

      // Prepare streaming parameters to match web app format
      const streamParams: StreamingChatParams = {
        provider: actualProvider,
        model: actualModel,
        messages: conversationHistory,
        instructions: systemPrompt,
        contextData,
        temperature: finalOptions.temperature,
        max_tokens: finalOptions.maxTokens,
        tools: tools || availableTools,
        tool_choice: toolChoice || 'auto',
        stream: true,
        parallel_tool_calls: true,
      };

      // Log tool choice if specified for debugging
      if (toolChoiceOverride || toolChoice) {
        console.log(`🛠️ [useChat] Tool choice specified:`, toolChoiceOverride || toolChoice);
      }

      // Set up streaming callbacks
      const callbacks: StreamingCallbacks = {
        onUpdate: (content: string, state: StreamingState) => {
          setCurrentStreamingState(state);
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content,
                  isStreaming: true,
                  metadata: { ...msg.metadata, ...state.metadata }
                }
              : msg
          ));
        },

        onComplete: async (finalContent: string, state: StreamingState) => {
          console.log('✅ [useChat] Stream completed:', {
            contentLength: finalContent.length,
            messageId: assistantMessageId,
            toolCallsExecuted: state.pendingToolCalls.length
          });

          const finalAssistantMessage: Message = {
            id: assistantMessageId,
            content: finalContent,
            role: 'assistant',
            timestamp: new Date(),
            isStreaming: false,
            toolCalls: state.pendingToolCalls.length > 0 ? state.pendingToolCalls : undefined,
            metadata: {
              ...state.metadata,
              streamingState: state,
              originalToolChoice: toolChoiceOverride,
            },
            reasoningContent: state.reasoningState.reasoningContent || undefined,
            reasoningMetadata: state.reasoningState.reasoningDuration ? {
              duration: state.reasoningState.reasoningDuration,
              startTime: state.reasoningState.reasoningStartTime,
            } : undefined,
          };

          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? finalAssistantMessage : msg
          ));

          setCurrentStreamingState(null);

          // Save assistant message to database
          await saveMessageToDatabase(finalAssistantMessage);

          // Add tool result messages if any
          if (state.metadata.toolResults && state.metadata.toolResults.length > 0) {
            const toolMessages: Message[] = state.metadata.toolResults.map((result: any, index: number) => ({
              id: `${assistantMessageId}-tool-${index}`,
              content: result.content,
              role: 'tool' as const,
              timestamp: new Date(),
              toolCallId: result.tool_call_id,
              name: result.name,
              metadata: { toolResult: result },
            }));

            // Add tool messages to the conversation
            setMessages(prev => [...prev, ...toolMessages]);

            // Save tool messages to database
            for (const toolMessage of toolMessages) {
              await saveMessageToDatabase(toolMessage);
            }
          }
        },

        onError: (error: Error) => {
          console.error('❌ [useChat] Streaming error:', error);
          setCurrentStreamingState(null);
          onError?.(error);

          // Update message with error
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: 'Sorry, I encountered an error. Please try again.', 
                  isStreaming: false,
                  metadata: { ...msg.metadata, error: error.message }
                }
              : msg
          ));
        },

        onToolCall: (toolCall: any) => {
          console.log('🛠️ [useChat] Tool call detected:', toolCall.function?.name);
          onToolCall?.(toolCall);
        },

        onReasoningUpdate: (reasoningContent: string) => {
          onReasoningUpdate?.(reasoningContent);
        },

        onReasoningComplete: (reasoningContent: string, duration?: number) => {
          console.log('🧠 [useChat] Reasoning completed:', {
            duration: duration ? `${duration}ms` : 'unknown',
            contentLength: reasoningContent.length
          });
        },
      };

      // Start the stream
      const streamingState = await streamProviderChatRef.current.streamChatCompletion(
        streamParams,
        callbacks,
        { signal: abortControllerRef.current.signal }
      );

      console.log('🏁 [useChat] Streaming completed:', {
        messageId: assistantMessageId,
        success: !streamingState.error,
        toolCallsExecuted: streamingState.pendingToolCalls.length
      });

    } catch (error: any) {
      console.error('❌ [useChat] Error sending message:', error);
      setCurrentStreamingState(null);
      
      if (error.name === 'AbortError') {
        // Request was aborted
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      } else {
        // Update message with error
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: 'Sorry, I encountered an error. Please try again.', 
                isStreaming: false,
                metadata: { ...msg.metadata, error: error.message }
              }
            : msg
        ));
        
        Alert.alert(
          'Error', 
          'Failed to send message. Please check your connection and try again.'
        );
        
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  }, [
    isLoading, 
    isConnected, 
    messages, 
    model, 
    provider, 
    instructions,
    tools,
    toolChoice,
    temperature,
    maxTokens,
    enableRetrieval,
    enableMemories,
    threadId,
    workspaceId,
    saveMessageToDatabase, 
    onError,
    onToolCall,
    onReasoningUpdate,
    onThreadTitleUpdated,
  ]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('🛑 [useChat] Generation stopped by user');
    }
    
    if (streamProviderChatRef.current) {
      streamProviderChatRef.current.abortAllStreams();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentStreamingState(null);
    console.log('🧹 [useChat] Messages cleared');
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      console.log('🔄 [useChat] Retrying last message:', lastUserMessageRef.current.substring(0, 50));
      
      // Remove the last assistant message if it exists and has an error
      setMessages(prev => {
        const filtered = prev.filter(msg => 
          !(msg.role === 'assistant' && (
            msg.content.includes('error') || 
            msg.metadata?.error
          ))
        );
        return filtered;
      });
      
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  const switchModel = useCallback(async (newModel: string): Promise<boolean> => {
    try {
      console.log(`🔄 [useChat] Switching model to: ${newModel}`);
      
      // Use the assistant store to update the current assistant's model
      const updateCurrentAssistantModel = useAssistantStore.getState().updateCurrentAssistantModel;
      const result = await updateCurrentAssistantModel(newModel);
      
      if (result) {
        console.log(`✅ [useChat] Successfully switched to model: ${newModel}`);
        return true;
      } else {
        console.log(`❌ [useChat] Failed to switch model to: ${newModel}`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ [useChat] Error switching model to ${newModel}:`, error);
      Alert.alert('Error', `Failed to switch model: ${error.message}`);
      return false;
    }
  }, []);

  return {
    messages,
    isLoading,
    isConnected,
    streamingMessageId,
    sendMessage,
    stopGeneration,
    clearMessages,
    loadMessages,
    retryLastMessage,
    getCurrentStreamingState,
    switchModel,
  };
} 