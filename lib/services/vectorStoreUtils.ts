import { ChatCompletionService, RetrievalResult } from './chatCompletionService';

// Interface for vector store processing parameters
export interface VectorStoreProcessingParams {
  contextData: any;
  threadId: string;
  messages: any[];
}

// Interface for vector store processing result
export interface VectorStoreProcessingResult {
  enhancedMessages: any[];
  retrievedFileIds: string[];
  contextData: any;
}

// Interface for formatted file results
export interface FormattedFileResult {
  fileId: string;
  filename: string;
  content: string;
  score?: number;
}

/**
 * Vector Store Utilities for iOS App
 * Handles document retrieval and query enhancement similar to web app
 */
export class VectorStoreUtils {
  private chatService: ChatCompletionService;

  constructor() {
    this.chatService = new ChatCompletionService();
  }

  /**
   * Main function to process vector store retrieval
   * This matches the web app's processVectorStoreRetrieval function
   */
  async processVectorStoreRetrieval(params: VectorStoreProcessingParams): Promise<VectorStoreProcessingResult> {
    const { contextData, threadId, messages } = params;

    console.log('🔍 [VectorStoreUtils] Starting vector store retrieval processing', {
      threadId,
      messageCount: messages.length,
      hasContextData: !!contextData,
      workspaceVectorStoreId: contextData?.workspace_vector_store_id,
      threadVectorStoreId: contextData?.thread_vector_store_id,
      isWorkspaceChat: contextData?.is_workspace_chat,
      fromWorkspaceChat: contextData?.from_workspace_chat,
      workspaceInitiated: contextData?.workspace_initiated
    });

    // Initialize result with original data
    let enhancedMessages = [...messages];
    let retrievedFileIds: string[] = [];
    let updatedContextData = { ...contextData };

    // Check for vector store ID - prioritize based on context
    const workspaceVectorStoreId = contextData?.workspace_vector_store_id;
    const threadVectorStoreId = contextData?.thread_vector_store_id;
    
    // Determine if we're in a workspace context that should use workspace vector store
    const isInWorkspaceView = contextData?.is_workspace_chat === true || 
                             contextData?.from_workspace_chat === true ||
                             contextData?.workspace_initiated === true;
    
    // Prioritize thread vector store for regular chat, workspace vector store only when explicitly in workspace context
    const vectorStoreId = isInWorkspaceView ? 
                         (workspaceVectorStoreId || threadVectorStoreId) : 
                         (threadVectorStoreId || workspaceVectorStoreId);
    const isWorkspaceVectorStore = !!workspaceVectorStoreId && vectorStoreId === workspaceVectorStoreId;
    
    if (!vectorStoreId) {
      console.log('📝 [VectorStoreUtils] No vector store ID found (workspace or thread), skipping retrieval');
      return {
        enhancedMessages,
        retrievedFileIds,
        contextData: updatedContextData
      };
    }
    
    // Check if this is a different vector store than what was recently used for file uploads
    // This helps handle cases where files are uploaded to one thread but search happens in another
    const userRecentUploads = await this.checkRecentFileUploads(contextData?.threadId, contextData?.workspaceId);
    if (userRecentUploads.length > 0) {
      console.log('🔍 [VECTOR RETRIEVAL] Found recent file uploads, will search additional vector stores:', {
        currentVectorStore: vectorStoreId,
        additionalStores: userRecentUploads.map(u => u.vectorStoreId),
        recentUploads: userRecentUploads.length
      });
    }

    console.log('🔍 [VECTOR RETRIEVAL] Vector store selection and context:', {
      vectorStoreId,
      workspaceVectorStoreId,
      threadVectorStoreId,
      isWorkspaceVectorStore,
      isInWorkspaceView,
      source: isWorkspaceVectorStore ? 'workspace' : 'thread',
      priority: isInWorkspaceView ? 'workspace-first' : 'thread-first',
      threadId: contextData?.threadId,
      workspaceId: contextData?.workspaceId,
      context: 'VECTOR_RETRIEVAL_START'
    });

    try {
      // Get the last user message for search query
      const lastUserMessage = this.getLastUserMessage(messages);
      if (!lastUserMessage || !lastUserMessage.content) {
        console.log('📝 [VectorStoreUtils] No user message found for retrieval');
        return {
          enhancedMessages,
          retrievedFileIds,
          contextData: updatedContextData
        };
      }

      let searchQuery = typeof lastUserMessage.content === 'string' 
        ? lastUserMessage.content 
        : JSON.stringify(lastUserMessage.content);
      
      // OpenAI vector search has a 4096 character limit for queries
      const MAX_QUERY_LENGTH = 4000; // Leave some buffer
      if (searchQuery.length > MAX_QUERY_LENGTH) {
        // Extract just the user's actual question, not the attached file content
        const fileContentStart = searchQuery.indexOf('<files>');
        if (fileContentStart > 0) {
          // User's message is before the file content, use that
          searchQuery = searchQuery.substring(0, fileContentStart).trim();
        } else {
          // No file markers, just truncate
          searchQuery = searchQuery.substring(0, MAX_QUERY_LENGTH);
        }
        
        console.log('⚠️ [VECTOR RETRIEVAL] Query truncated:', {
          originalLength: (typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content)).length,
          truncatedLength: searchQuery.length,
          truncatedQuery: searchQuery.substring(0, 100) + '...'
        });
      }

      console.log('🔍 [VECTOR RETRIEVAL] Performing vector store search:', {
        vectorStoreId,
        queryLength: searchQuery.length,
        queryPreview: searchQuery.substring(0, 100),
        isWorkspaceVectorStore,
        source: isWorkspaceVectorStore ? 'workspace' : 'thread',
        threadId: contextData?.threadId,
        workspaceId: contextData?.workspaceId,
        context: 'VECTOR_SEARCH_CALL'
      });

      // Search the primary vector store
      let allResults: any[] = [];
      
      const retrievalResults = await this.chatService.searchVectorStore(
        vectorStoreId,
        searchQuery,
        10, // maxNumResults
        {} // options
      );

      // Ensure retrievalResults is an array
      const resultsArray = Array.isArray(retrievalResults) ? retrievalResults : [];
      allResults.push(...resultsArray);

      console.log('📊 [VECTOR RETRIEVAL] Primary vector store search completed:', {
        vectorStoreId,
        resultsCount: resultsArray.length,
        source: isWorkspaceVectorStore ? 'workspace' : 'thread',
        threadId: contextData?.threadId,
        workspaceId: contextData?.workspaceId,
        results: resultsArray.map((r: any) => ({
          fileId: r.fileId || r.file_id,
          filename: r.filename || r.file_name,
          contentLength: Array.isArray(r.content) ? r.content.length : (r.content?.length || 0),
          score: r.score,
          contentType: typeof r.content
        })),
        context: 'VECTOR_SEARCH_RESULTS'
      });
      
      // If no results found in primary vector store, search recent uploads
      if (resultsArray.length === 0 && userRecentUploads.length > 0) {
        console.log('🔍 [VECTOR RETRIEVAL] No results in primary store, searching recent upload vector stores:', {
          recentUploadsCount: userRecentUploads.length,
          recentUploads: userRecentUploads
        });
        
        for (const upload of userRecentUploads) {
          try {
            const additionalResults = await this.chatService.searchVectorStore(
              upload.vectorStoreId,
              searchQuery,
              5, // fewer results per additional store
              {} // options
            );
            
            const additionalArray = Array.isArray(additionalResults) ? additionalResults : [];
            if (additionalArray.length > 0) {
              console.log('🎯 [VECTOR RETRIEVAL] Found results in additional vector store:', {
                vectorStoreId: upload.vectorStoreId,
                threadId: upload.threadId,
                resultsCount: additionalArray.length
              });
              allResults.push(...additionalArray);
            }
          } catch (error) {
            console.error('Error searching additional vector store:', upload.vectorStoreId, error);
          }
        }
      }

      if (allResults.length > 0) {
        // Format and append retrieval results to the last user message
        const formattedResults = this.formatRetrievalResults(allResults);
        enhancedMessages = this.appendRetrievalResultsToLastMessage(enhancedMessages, formattedResults);
        
        // Track retrieved file IDs
        retrievedFileIds = allResults.map(r => r.fileId || r.file_id || 'unknown');
        
        console.log('✅ [VECTOR RETRIEVAL] Final results summary:', {
          totalResults: allResults.length,
          primaryStoreResults: resultsArray.length,
          additionalStoreResults: allResults.length - resultsArray.length,
          retrievedFileIds
        });

        // Update context data with retrieval info
        updatedContextData = {
          ...updatedContextData,
          retrieved_file_ids: retrievedFileIds,
          retrieval_results_count: resultsArray.length,
          retrieval_performed: true
        };

        console.log('✅ [VectorStoreUtils] Successfully enhanced messages with retrieval results', {
          retrievedFileCount: retrievedFileIds.length,
          enhancedMessageCount: enhancedMessages.length
        });
      } else {
        console.log('📝 [VectorStoreUtils] No retrieval results found');
      }

    } catch (error) {
      console.error('❌ [VectorStoreUtils] Vector store retrieval failed:', error);
      // Continue without retrieval results on error
    }

    return {
      enhancedMessages,
      retrievedFileIds,
      contextData: updatedContextData
    };
  }

  /**
   * Format retrieval results for inclusion in messages
   * Matches the web app's formatting approach
   */
  private formatRetrievalResults(results: any[]): string {
    if (results.length === 0) return '';

    console.log('📝 [VectorStoreUtils] Formatting retrieval results', {
      resultsCount: results.length,
      sampleResult: results[0],
      fullResults: results
    });

    let formatted = '\n\n<files>\n';
    
    for (const result of results) {
      // Handle both old and new API response formats
      const fileId = result.fileId || result.file_id || 'unknown';
      const filename = result.filename || result.file_name || 'unknown_file';
      
      // Extract content from the API response format
      let content = '';
      if (typeof result.content === 'string') {
        content = result.content;
      } else if (Array.isArray(result.content)) {
        // Handle new API format: content is array of objects with text
        content = result.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
      } else if (result.content && typeof result.content === 'object') {
        // Handle object content - stringify it
        content = JSON.stringify(result.content);
      }
      
      console.log('📝 [VectorStoreUtils] Processing result:', {
        fileId,
        filename,
        contentType: typeof result.content,
        contentLength: content.length,
        contentPreview: content.substring(0, 100),
        rawContent: result.content,
        extractedContent: content
      });

      formatted += `<file_snippet file_id='${fileId}' file_name='${filename}'>`;
      formatted += `<content>${content}</content>`;
      formatted += '</file_snippet>\n';
    }
    
    formatted += '</files>';

    console.log('📝 [VectorStoreUtils] Formatted results', {
      formattedLength: formatted.length,
      preview: formatted.substring(0, 300)
    });

    return formatted;
  }

  /**
   * Append retrieval results to the last user message
   */
  private appendRetrievalResultsToLastMessage(messages: any[], formattedResults: string): any[] {
    if (!formattedResults || messages.length === 0) {
      return messages;
    }

    const enhancedMessages = [...messages];
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];

    if (lastMessage.role === 'user') {
      const originalContent = typeof lastMessage.content === 'string' 
        ? lastMessage.content 
        : JSON.stringify(lastMessage.content);

      enhancedMessages[lastMessageIndex] = {
        ...lastMessage,
        content: originalContent + formattedResults
      };

      console.log('📝 [VectorStoreUtils] Enhanced last user message with retrieval results', {
        originalLength: originalContent.length,
        enhancedLength: enhancedMessages[lastMessageIndex].content.length,
        addedLength: formattedResults.length
      });
    }

    return enhancedMessages;
  }

  /**
   * Get the last user message from the conversation
   */
  private getLastUserMessage(messages: any[]): any | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i];
      }
    }
    return null;
  }
  
  private async checkRecentFileUploads(threadId?: string, workspaceId?: string): Promise<Array<{vectorStoreId: string, threadId: string}>> {
    try {
      // Check for recent file uploads in the last 10 minutes that might be in different vector stores
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      console.log('🔍 [RECENT UPLOADS] Checking for recent file uploads:', {
        tenMinutesAgo,
        currentThreadId: threadId,
        userId: user.id
      });
      
      // Get recent threads with vector stores for this user
      // Try both updated_at and created_at to catch recent file uploads
      const { data: recentThreads, error } = await supabase
        .from('threads')
        .select('id, vector_store_id, updated_at, created_at')
        .eq('user_id', user.id)
        .not('vector_store_id', 'is', null)
        .or(`updated_at.gte.${tenMinutesAgo},created_at.gte.${tenMinutesAgo}`)
        .neq('id', threadId || '') // Exclude current thread
        .order('updated_at', { ascending: false })
        .limit(5);
      
      console.log('📋 [RECENT UPLOADS] Query results:', {
        error,
        resultCount: recentThreads?.length || 0,
        recentThreads: recentThreads?.map(t => ({
          id: t.id,
          vectorStoreId: t.vector_store_id,
          updatedAt: t.updated_at,
          createdAt: t.created_at
        }))
      });
      
      if (error || !recentThreads) return [];
      
      const results = recentThreads
        .filter(t => t.vector_store_id)
        .map(t => ({ vectorStoreId: t.vector_store_id, threadId: t.id }));
      
      console.log('✅ [RECENT UPLOADS] Returning recent upload vector stores:', results);
      
      return results;
    } catch (error) {
      console.error('Error checking recent file uploads:', error);
      return [];
    }
  }

  /**
   * Extract file IDs from retrieval results
   */
  extractFileIds(results: RetrievalResult[]): string[] {
    return results.map(result => result.fileId);
  }

  /**
   * Check if context data has vector store information
   */
  hasVectorStoreContext(contextData: any): boolean {
    return !!(contextData?.workspace_vector_store_id || contextData?.thread_vector_store_id || contextData?.project_vector_store_id);
  }

  /**
   * Get vector store ID from context data
   */
  getVectorStoreId(contextData: any): string | null {
    return contextData?.workspace_vector_store_id || contextData?.thread_vector_store_id || contextData?.project_vector_store_id || null;
  }

  /**
   * Create enhanced query with context
   * This can be used to improve search relevance
   */
  createEnhancedQuery(originalQuery: string, contextData: any): string {
    let enhancedQuery = originalQuery;

    // Add workspace context if available
    if (contextData?.workspace_name) {
      enhancedQuery += `\n\nWorkspace: ${contextData.workspace_name}`;
    }

    // Add project context if available
    if (contextData?.project_name) {
      enhancedQuery += `\nProject: ${contextData.project_name}`;
    }

    return enhancedQuery;
  }

  /**
   * Validate retrieval results
   */
  validateRetrievalResults(results: any[]): RetrievalResult[] {
    if (!Array.isArray(results)) {
      console.warn('🔍 [VectorStoreUtils] Invalid retrieval results format');
      return [];
    }

    return results.filter(result => {
      const isValid = result && 
        typeof result.fileId === 'string' && 
        typeof result.filename === 'string' && 
        typeof result.content === 'string';
      
      if (!isValid) {
        console.warn('🔍 [VectorStoreUtils] Invalid retrieval result:', result);
      }
      
      return isValid;
    });
  }

  /**
   * Get retrieval statistics
   */
  getRetrievalStats(results: RetrievalResult[]): {
    totalResults: number;
    totalContentLength: number;
    averageScore: number;
    fileIds: string[];
  } {
    const totalResults = results.length;
    const totalContentLength = results.reduce((sum, r) => sum + r.content.length, 0);
    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
      : 0;
    const fileIds = results.map(r => r.fileId);

    return {
      totalResults,
      totalContentLength,
      averageScore,
      fileIds
    };
  }
}

// Export singleton instance
export const vectorStoreUtils = new VectorStoreUtils();

// Export class for custom instantiation
export default VectorStoreUtils;