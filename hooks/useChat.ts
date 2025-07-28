import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { OpenAIService, ChatMessage, VectorStoreFile, RetrievalResult } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import { ThreadManager } from '@/lib/threads';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: any;
  files?: VectorStoreFile[];
}

export interface UseChatOptions {
  threadId?: string;
  workspaceId?: string;
  model?: string;
  onError?: (error: Error) => void;
  onThreadTitleUpdated?: (threadId: string, newTitle: string) => void;
}

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  streamingMessageId: string | null;
  sendMessage: (content: string, files?: VectorStoreFile[]) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  loadMessages: () => Promise<void>;
  retryLastMessage: () => Promise<void>;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    threadId,
    workspaceId,
    model = 'gpt-4o',
    onError,
    onThreadTitleUpdated,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');

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

  const loadMessages = useCallback(async () => {
    if (!threadId) {
      console.log('Skipping message load - no threadId provided');
      return;
    }

    try {
      console.log('🔄 useChat: Loading messages for thread:', threadId);
      
      // Use ThreadManager to load messages
      const messagesData = await ThreadManager.getThreadMessages(threadId);
      
      const formattedMessages: Message[] = messagesData.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant' | 'system',
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata,
      }));

      console.log(`🔄 useChat: Loaded ${formattedMessages.length} messages for thread ${threadId}`);
      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('🔄 useChat: Error loading thread messages:', error);
      onError?.(error);
    }
  }, [threadId, onError]);

  const saveMessageToDatabase = useCallback(async (message: Message) => {
    if (!threadId || !workspaceId) {
      console.log('Skipping database save - no threadId or workspaceId provided');
      return;
    }

    try {
      const { error } = await supabase
        .from('thread_messages')
        .insert({
          thread_id: threadId,
          workspace_id: workspaceId,
          message_id: message.id,
          role: message.role,
          content: message.content,
          metadata: message.metadata,
        });

      if (error) {
        console.error('Error saving message:', error);
        onError?.(error);
      }
    } catch (error: any) {
      console.error('Error saving message to database:', error);
      onError?.(error);
    }
  }, [threadId, workspaceId, onError]);

  const sendMessage = useCallback(async (content: string, files?: VectorStoreFile[]) => {
    if (!content.trim() || isLoading) return;

    if (!isConnected) {
      Alert.alert('No Internet Connection', 'Please check your internet connection and try again.');
      return;
    }

    // Validate OpenAI API key
    if (!OpenAIService.validateApiKey()) {
      Alert.alert(
        'API Key Missing', 
        'OpenAI API key is not configured. Please add EXPO_PUBLIC_OPENAI_API_KEY to your environment variables.'
      );
      return;
    }

    lastUserMessageRef.current = content.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
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
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Check if we need to perform retrieval from vector store
      let retrievalContext = '';
      if (threadId) {
        const { data: thread } = await supabase
          .from('threads')
          .select('vector_store_id')
          .eq('id', threadId)
          .single();
        
        if (thread?.vector_store_id) {
          console.log('🔍 Performing vector store search for context');
          const searchResults = await OpenAIService.searchVectorStore(
            thread.vector_store_id,
            userMessage.content,
            5
          );
          
          if (searchResults.length > 0) {
            retrievalContext = OpenAIService.formatRetrievalResults(searchResults);
            console.log(`✅ Found ${searchResults.length} relevant documents`);
          }
        }
      }

      // Prepare conversation history
      const conversationHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add the new user message with retrieval context if available
      let userContent = userMessage.content;
      if (retrievalContext) {
        userContent = `${userMessage.content}\n\n${retrievalContext}`;
      }

      // Add vision images if any
      if (files && files.length > 0) {
        const imageFiles = files.filter(f => f.isImage && f.publicUrl);
        if (imageFiles.length > 0) {
          userContent += '\n\nImages attached for analysis.';
          // Note: For vision, we'd need to modify the message format to include images
          // This is a simplified version - full implementation would use the vision API
        }
      }

      conversationHistory.push({
        role: 'user',
        content: userContent,
      });

      // Stream the response
      await OpenAIService.streamChatCompletion({
        model,
        messages: conversationHistory,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk: string) => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: msg.content + chunk, isStreaming: true }
              : msg
          ));
        },
        onComplete: async (fullResponse: string) => {
          const finalAssistantMessage: Message = {
            id: assistantMessageId,
            content: fullResponse,
            role: 'assistant',
            timestamp: new Date(),
            isStreaming: false,
          };

          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? finalAssistantMessage : msg
          ));

          // Save assistant message to database
          await saveMessageToDatabase(finalAssistantMessage);
        },
        onError: (error: Error) => {
          console.error('Streaming error:', error);
          onError?.(error);
        },
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      
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
                isStreaming: false 
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
  }, [isLoading, isConnected, messages, model, saveMessageToDatabase, onError]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove the last assistant message if it exists and has an error
      setMessages(prev => {
        const filtered = prev.filter(msg => 
          !(msg.role === 'assistant' && msg.content.includes('error'))
        );
        return filtered;
      });
      
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

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
  };
} 