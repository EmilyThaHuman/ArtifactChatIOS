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
import { generateUUID } from '@/lib/services/streamingUtils';
import { searchVectorStore, formatRetrievalResults, getThreadVectorStore, getWorkspaceVectorStore } from '@/lib/content';
import { VectorStoreFile } from '@/lib/content';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: Date;
  isStreaming?: boolean;
  isStreamComplete?: boolean;
  messageStatus?: 'streaming' | 'completed' | 'error';
  skipDatabaseSave?: boolean;
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
  onToolCall?: (toolCall: any, messageId?: string) => void;
  onToolCallComplete?: (toolResult: any) => void;
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
    onToolCallComplete,
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
  const completionProcessedRef = useRef<Set<string>>(new Set()); // Track processed completions per message ID

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
        // Restore file attachments from database (web app compatible format)
        files: (() => {
          // New format with mobile_files array
          if (msg.attachments?.mobile_files && Array.isArray(msg.attachments.mobile_files)) {
            return msg.attachments.mobile_files.map((attachment: any) => ({
              id: attachment.id,
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              publicUrl: attachment.publicUrl,
              uri: attachment.uri || attachment.publicUrl,
              isImage: attachment.isImage,
              status: attachment.status || 'completed',
              metadata: attachment.metadata
            }));
          }
          
          // Legacy format - old mobile app direct attachments array
          if (msg.attachments && Array.isArray(msg.attachments)) {
            return msg.attachments.map((attachment: any) => ({
              id: attachment.id,
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              publicUrl: attachment.publicUrl,
              uri: attachment.uri || attachment.publicUrl,
              isImage: attachment.isImage,
              status: attachment.status || 'completed',
              metadata: attachment.metadata
            }));
          }
          
          // Web app format - only file_ids and names, create placeholder objects
          if (msg.attachments?.file_ids && Array.isArray(msg.attachments.file_ids) && msg.attachments.file_ids.length > 0) {
            return msg.attachments.file_ids.map((fileId: string, index: number) => ({
              id: fileId,
              name: msg.attachments.current_file_names?.[index] || `File ${index + 1}`,
              type: 'application/octet-stream',
              size: 0,
              publicUrl: null,
              uri: null,
              isImage: false,
              status: 'web_reference',
              metadata: { fromWeb: true }
            }));
          }
          
          // Final fallback for legacy messages with file_ids but no attachments
          if (msg.file_ids && Array.isArray(msg.file_ids) && msg.file_ids.length > 0) {
            return msg.file_ids.map((fileId: string, index: number) => ({
              id: fileId,
              name: `File ${index + 1}`,
              type: 'application/octet-stream',
              size: 0,
              publicUrl: null,
              uri: null,
              isImage: false,
              status: 'legacy_reference',
              metadata: { fromLegacy: true }
            }));
          }
          
          return undefined;
        })(),
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

    if (message.skipDatabaseSave) {
      console.log(`Skipping database save for message ${message.id} - skipDatabaseSave flag set`);
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
        // Web app style file references in metadata for compatibility
        ...(message.files && message.files.length > 0 && {
          file_ids: message.files.map(f => f.id),
          has_files: true,
          file_count: message.files.length,
          current_file_names: message.files.map(f => f.name),
          has_images: message.files.some(f => f.isImage),
          image_count: message.files.filter(f => f.isImage).length,
        })
      };

      // Remove toolCalls from metadata since it has its own column
      delete messageMetadata.toolCalls;

      // Prepare file IDs and attachments data for persistence (web app compatible format)
      const fileIds = message.files ? message.files.map(f => f.id) : [];
      
      // Store both web app compatible format AND mobile app data for backward compatibility
      const attachments = message.files ? {
        // Web app style - minimal file references  
        file_ids: message.files.map(f => f.id),
        current_file_names: message.files.map(f => f.name),
        // Mobile app style - full file data for offline access
        mobile_files: message.files.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          publicUrl: file.publicUrl,
          uri: file.uri,
          isImage: file.isImage,
          status: file.status,
          metadata: file.metadata
        }))
      } : null;

      const { error } = await supabase
        .from('thread_messages')
        .insert({
          thread_id: threadId,
          workspace_id: workspaceId,
          message_id: message.id,
          role: message.role,
          content: message.content,
          tool_calls: message.tool_calls || message.toolCalls || null, // Store in dedicated column (handle both formats)
          file_ids: fileIds, // Store file IDs in dedicated column
          attachments: attachments, // Store full file attachment data
          metadata: messageMetadata,
        });

      if (error) {
        console.error('Error saving message:', error);
        onError?.(error);
      } else {
        console.log(`💾 [useChat] Message saved to database: ${message.id}`, {
          hasToolCalls: !!(message.tool_calls?.length || message.toolCalls?.length),
          toolCallCount: (message.tool_calls?.length || message.toolCalls?.length) || 0,
          toolCallsFormat: message.tool_calls ? 'tool_calls' : message.toolCalls ? 'toolCalls' : 'none',
          hasFiles: !!message.files?.length,
          fileCount: message.files?.length || 0,
          fileNames: message.files?.map(f => f.name) || []
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

    // Clear any previous completion tracking to prevent stale state
    completionProcessedRef.current.clear();

    lastUserMessageRef.current = content.trim();

    // Merge options with defaults
    const finalOptions = {
      temperature: messageOptions.temperature ?? temperature,
      maxTokens: messageOptions.maxTokens ?? maxTokens,
      provider: messageOptions.provider ?? provider,
      model: messageOptions.model ?? model,
    };

    // Let the AI decide which tools to use instead of preprocessing
    let processedContent = content.trim();

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
        
        console.log('🔍 [CONTEXT SETUP] Thread vector store retrieval:', {
          threadId,
          vectorStoreId,
          enableRetrieval,
          context: 'THREAD_VECTOR_STORE_FETCH'
        });
        
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
          // Get the vector store ID for this workspace
          workspaceVectorStoreId = await getWorkspaceVectorStore(workspaceId);
          
          console.log('🔍 [CONTEXT SETUP] Workspace vector store retrieval:', {
            workspaceId,
            workspaceVectorStoreId,
            context: 'WORKSPACE_VECTOR_STORE_FETCH'
          });
        } catch (error) {
          console.log('No workspace vector store found:', error);
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
        // Add storage_files for web app compatibility
        storage_files: files ? files.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          size: f.size,
          isImage: f.isImage,
          publicUrl: f.publicUrl,
          url: f.publicUrl,
          visionMetadata: f.isImage ? {
            publicUrl: f.publicUrl,
            contentType: f.type,
            isReady: true
          } : undefined
        })) : [],
        enable_retrieval: enableRetrieval,
        modelProvider: actualProvider,
        actualProviderName: actualProvider,
        vector_store_id: vectorStoreId, // Will be set if we have retrieval context
        thread_vector_store_id: vectorStoreId, // Thread vector store ID for retrieval
        workspace_vector_store_id: workspaceVectorStoreId, // Will be set if workspace has vector store
        file_ids: files ? files.map(f => f.id) : [],
        current_file_names: files ? files.map(f => f.name) : [],
      };

      console.log('🔍 [CONTEXT SETUP] Final context data for AI:', {
        threadId,
        workspaceId,
        vectorStoreId,
        workspaceVectorStoreId,
        enableRetrieval,
        isWorkspaceChat: contextData.is_workspace_chat,
        hasFiles: contextData.has_files,
        fileCount: contextData.file_count,
        hasImages: contextData.has_images,
        imageCount: contextData.image_count,
        visionImageUrls: contextData.vision_image_urls,
        storageFilesCount: contextData.storage_files.length,
        context: 'FINAL_CONTEXT_DATA'
      });

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
        },
        {
          type: 'function',
          function: {
            name: 'image_edit',
            description: 'Edit existing images using AI. Can modify, enhance, or transform uploaded images based on text instructions.',
            parameters: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Detailed instructions for how to edit the image'
                },
                name: {
                  type: 'string',
                  description: 'Name or title for the edited image'
                },
                model: {
                  type: 'string',
                  description: 'Image editing model to use',
                  enum: ['gpt-image-1', 'dall-e-3'],
                  default: 'gpt-image-1'
                },
                size: {
                  type: 'string',
                  description: 'Output image size',
                  enum: ['1024x1024', '1792x1024', '1024x1792'],
                  default: '1024x1024'
                },
                image_urls: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'URLs of the images to edit (extracted from conversation context)'
                },
                mask_url: {
                  type: 'string',
                  description: 'Optional mask image URL for selective editing'
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
            toolCallsExecuted: state.pendingToolCalls.length,
            hasToolResults: !!state.metadata.toolResults?.length,
            streamingMessageIdBeforeProcessing: streamingMessageId,
            pendingToolCallsCount: state.pendingToolCalls.length,
            hasToolCalls: state.pendingToolCalls.length > 0
          });

          // Prevent duplicate processing for the same message
          if (completionProcessedRef.current.has(assistantMessageId)) {
            console.log('⚠️ [useChat] Completion already processed for message:', assistantMessageId);
            return;
          }

          // Mark this completion as processed
          completionProcessedRef.current.add(assistantMessageId);

          // Check if this is a tool call completion with tool results
          const hasToolCalls = state.pendingToolCalls.length > 0;
          const hasToolResults = state.metadata.toolResults && state.metadata.toolResults.length > 0;

          console.log('🔍 [useChat] Completion logic check:', {
            hasToolCalls,
            hasToolResults,
            pendingToolCallsCount: state.pendingToolCalls.length,
            toolResultsCount: state.metadata.toolResults?.length || 0,
            willEnterToolCallBranch: hasToolCalls && hasToolResults,
            willEnterKeepActiveBranch: hasToolCalls && !hasToolResults,
            willEnterRegularBranch: !hasToolCalls
          });

          if (hasToolCalls && hasToolResults) {
            console.log('🔧 [useChat] Processing tool call completion with results');
            
            // Merge tool results into tool calls array (matching expected structure)
            const toolCallsWithResults = state.pendingToolCalls.map(toolCall => {
              // Find the corresponding result for this tool call
              const toolResult = state.metadata.toolResults?.find(
                (result: any) => result.tool_call_id === toolCall.id
              );
              
              if (toolResult) {
                // Parse the result content if it's a string
                let parsedResult;
                try {
                  parsedResult = typeof toolResult.content === 'string' 
                    ? JSON.parse(toolResult.content) 
                    : toolResult.content;
                } catch (error) {
                  parsedResult = toolResult.content;
                }
                
                return {
                  ...toolCall,
                  result: parsedResult,
                  llmResult: parsedResult,
                  storageResult: parsedResult,
                  isStreaming: false
                };
              }
              
              return toolCall;
            });
            
            console.log('🔧 [useChat] Tool calls with results merged:', {
              originalToolCallsCount: state.pendingToolCalls.length,
              toolResultsCount: state.metadata.toolResults?.length || 0,
              mergedToolCallsCount: toolCallsWithResults.length,
              toolCallsWithResults: toolCallsWithResults.map(tc => ({
                id: tc.id,
                name: tc.function?.name,
                hasResult: !!tc.result,
                resultKeys: tc.result ? Object.keys(tc.result) : [],
                hasSourcesInResult: !!(tc.result?.sources),
                sourcesCount: tc.result?.sources?.length || 0
              }))
            });
            
            // Create tool call message with single space content (matching expected structure)
            const toolCallMessage: Message = {
              id: assistantMessageId,
              content: ' ', // Single space as per expected structure
              role: 'assistant',
              timestamp: new Date(),
              isStreaming: false,
              isStreamComplete: true,
              messageStatus: 'completed',
              tool_calls: toolCallsWithResults, // Use merged tool calls with results
              metadata: {
                ...state.metadata,
                message_type: 'tool_call_with_results',
                save_priority: 'critical',
                save_sequence: 1,
                toolSaveAttempt: 'immediate',
                toolResultsCount: state.pendingToolCalls.length,
                isToolCallMessage: true,
                needs_persistence: true,
                hasContentInFollowUp: true,
                hasContentInToolCall: true,
                toolExecutionComplete: true,
                // Add image-specific metadata if this is an image generation tool
                ...(state.pendingToolCalls.some(tc => tc.function?.name === 'image_gen' || tc.function?.name === 'image_generation') && {
                  image_message: true,
                  has_image_generation: true,
                  image_metadata: {
                    hasImage: true,
                    timestamp: new Date().toISOString(),
                  }
                }),
              },
              reasoningContent: state.reasoningState.reasoningContent || undefined,
              reasoningMetadata: state.reasoningState.reasoningDuration ? {
                duration: state.reasoningState.reasoningDuration,
                startTime: state.reasoningState.reasoningStartTime,
              } : undefined,
            };

            // Create separate assistant response message with AI response content  
            const assistantResponseId = generateUUID();
            const assistantResponseMessage: Message = {
              id: assistantResponseId,
              content: finalContent,
              role: 'assistant',
              timestamp: new Date(),
              isStreaming: false,
              isStreamComplete: true,
              messageStatus: 'completed',
              metadata: {
                model: state.metadata.model,
                provider: state.metadata.provider,
                timestamp: new Date().toISOString(),
                save_sequence: 2,
                followUpCompleted: true,
                isFollowUpContent: true,
                toolCallMessageId: assistantMessageId,
                hasContentInFollowUp: true,
              },
            };

            console.log('🔧 [useChat] Tool call message created:', {
              messageId: toolCallMessage.id,
              hasToolCalls: !!toolCallMessage.tool_calls?.length,
              toolCallsCount: toolCallMessage.tool_calls?.length || 0,
              toolCallIds: toolCallMessage.tool_calls?.map(tc => tc.id) || [],
              contentLength: toolCallMessage.content.length,
              toolCallsWithResults: toolCallMessage.tool_calls?.map(tc => ({
                id: tc.id,
                name: tc.function?.name,
                hasResult: !!tc.result,
                resultKeys: tc.result ? Object.keys(tc.result) : [],
                hasSourcesInResult: !!tc.result?.sources,
                sourcesCount: tc.result?.sources?.length || 0
              }))
            });

            console.log('🔧 [useChat] Assistant response message created:', {
              messageId: assistantResponseMessage.id,
              contentLength: assistantResponseMessage.content.length,
              isFollowUp: true,
              toolCallMessageId: assistantResponseMessage.metadata.toolCallMessageId
            });

            // Update messages: replace streaming message with tool call message, then add assistant response
            setMessages(prev => {
              const updatedMessages = prev.map(msg => 
                msg.id === assistantMessageId ? toolCallMessage : msg
              );
              // Add the assistant response message
              updatedMessages.push(assistantResponseMessage);
              return updatedMessages;
            });

            // Save both the tool call message and assistant response to database
            try {
              await saveMessageToDatabase(toolCallMessage);
              console.log('💾 [useChat] Tool call message saved successfully');
              
              await saveMessageToDatabase(assistantResponseMessage);
              console.log('💾 [useChat] Assistant response message saved successfully');
            } catch (error: any) {
              if (error.code !== '23505') { // Ignore duplicate key errors
                console.error('💾 [useChat] Failed to save messages:', error);
              }
            }

            // Clear streaming state AFTER tool completion
            setCurrentStreamingState(null);
            setStreamingMessageId(null);

          } else if (hasToolCalls && !hasToolResults) {
            // Tool calls detected but tools haven't executed yet - keep streaming state active
            console.log('🛠️ [useChat] Tool calls detected, keeping streaming state active for shimmer text', {
              streamingMessageIdWillRemain: streamingMessageId,
              pendingToolCallsCount: state.pendingToolCalls.length,
              toolCallNames: state.pendingToolCalls.map(tc => tc.function?.name)
            });
            
            // CRITICAL FIX: Create tool call message immediately for skeleton display
            const toolCallMessage: Message = {
              id: assistantMessageId,
              content: ' ', // Single space as per expected structure
              role: 'assistant',
              timestamp: new Date(),
              isStreaming: true, // Keep streaming for skeleton
              toolCalls: state.pendingToolCalls,
              metadata: {
                ...state.metadata,
                isToolCallMessage: true,
                toolCallInProgress: true,
                hasActiveToolCall: true,
                currentToolCall: state.pendingToolCalls[0]?.function?.name,
              },
            };

            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? toolCallMessage
                : msg
            ));
            
            // DON'T clear streamingMessageId here - wait for tool execution to complete
            
          } else {
            // Regular completion without tool calls
            const finalAssistantMessage: Message = {
              id: assistantMessageId,
              content: finalContent,
              role: 'assistant',
              timestamp: new Date(),
              isStreaming: false,
              metadata: {
                ...state.metadata,
                streamingState: state,
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

            // Save assistant message to database
            try {
              await saveMessageToDatabase(finalAssistantMessage);
            } catch (error: any) {
              if (error.code !== '23505') { // Ignore duplicate key errors
                console.error('💾 [useChat] Failed to save regular message:', error);
              }
            }

            // Clear streaming state for regular messages only
            setCurrentStreamingState(null);
            setStreamingMessageId(null);
          }
        },

        onError: (error: Error) => {
          console.error('❌ [useChat] Streaming error:', error);
          setCurrentStreamingState(null);
          setStreamingMessageId(null); // Clear on error
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
          console.log('🛠️ [useChat] Tool call detected:', {
            toolName: toolCall.function?.name,
            toolId: toolCall.id,
            assistantMessageId: assistantMessageId,
            streamingMessageIdAtCallback: streamingMessageId,
            isStreamingMessageIdSet: !!streamingMessageId
          });

          // CRITICAL FIX: Use assistantMessageId directly since streamingMessageId might be stale
          const targetMessageId = assistantMessageId;
          
          setMessages(prev => prev.map(msg => 
            msg.id === targetMessageId 
              ? { 
                  ...msg, 
                  tool_calls: msg.tool_calls ? [...msg.tool_calls, toolCall] : [toolCall],
                  metadata: { 
                    ...msg.metadata, 
                    hasActiveToolCall: true,
                    currentToolCall: toolCall.function?.name,
                    toolCallInProgress: true
                  }
                }
              : msg
          ));

          // Pass the assistantMessageId when calling the callback
          onToolCall?.(toolCall, targetMessageId);
        },

        onToolCallComplete: (toolResult: any) => {
          console.log('✅ [useChat] Tool call completed:', {
            toolCallId: toolResult.tool_call_id,
            toolName: toolResult.name,
            hasResult: !!toolResult.result,
            assistantMessageId: assistantMessageId
          });

          // Update message state to clear tool call in progress
          const targetMessageId = assistantMessageId;
          setMessages(prev => prev.map(msg => 
            msg.id === targetMessageId 
              ? { 
                  ...msg, 
                  metadata: { 
                    ...msg.metadata, 
                    toolCallInProgress: false,
                    hasActiveToolCall: false,
                  }
                }
              : msg
          ));

          onToolCallComplete?.(toolResult);
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
      // Note: streamingMessageId is now cleared in onComplete after tool execution
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