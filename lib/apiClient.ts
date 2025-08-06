import { Platform } from 'react-native';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://assistantservicesapi.onrender.com';

// Default headers for React Native requests
const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': `ArtifactApp/${Platform.OS}`,
  'X-Requested-With': 'XMLHttpRequest',
});

// API Client class
export class ApiClient {
  private static baseURL = API_BASE_URL;

  /**
   * Make a GET request
   */
  static async get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Make a POST request
   */
  static async post(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a PUT request
   */
  static async put(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a DELETE request
   */
  static async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  /**
   * Stream data from an endpoint (React Native compatible)
   */
  static async stream(
    endpoint: string,
    data: any,
    onChunk: (chunk: string) => void,
    onComplete?: (content: string) => void,
    onError?: (error: ApiError) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log(`🌊 [API] STREAM ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...getDefaultHeaders(),
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(data),
        signal,
      });

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // Check if streaming is supported
      const reader = response.body?.getReader();
      if (!reader) {
        console.log('🔄 [API] Streaming not supported, falling back to full response');
        
        // Fallback: Read the full response and simulate streaming
        const fullResponse = await response.text();
        console.log('📥 [API] Full response received:', {
          length: fullResponse.length,
          preview: fullResponse.substring(0, 200),
          contentType: response.headers.get('content-type')
        });
        
        // Try to parse as SSE format
        const lines = fullResponse.split('\n');
        let accumulatedContent = '';
        let processedChunks = 0;
        

        
        for (const line of lines) {
          if (line.trim() === '') continue;
          

          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log('🏁 [API] Received [DONE] signal');
              onComplete?.(accumulatedContent);
              return accumulatedContent;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Handle different message types from backend
              if (parsed.type === 'connection') {
                console.log('🔌 [API] Connection established:', parsed.sessionId);
                continue; // Don't process connection messages as content
              }
              
              if (parsed.type === 'complete') {
                console.log('🏁 [API] Received completion signal');
                onComplete?.(accumulatedContent);
                return accumulatedContent;
              }
              
              if (parsed.type === 'chunk' && parsed.chunk) {
                // Extract all delta data (content, tool calls, etc.)
                const delta = parsed.chunk?.choices?.[0]?.delta;
                const content = delta?.content || '';
                const toolCalls = delta?.tool_calls;
                const finishReason = parsed.chunk?.choices?.[0]?.finish_reason;
                
                // Only accumulate actual text content
                if (content) {
                  accumulatedContent += content;
                }
                


                // Pass the chunk if it has ANY delta data (content, tool calls, finish reason, etc.)
                if (delta && (content || toolCalls || finishReason)) {
                  processedChunks++;
                  
                  // Pass the complete chunk structure to preserve all data
                  const chunkString = JSON.stringify(parsed.chunk);
                  onChunk(chunkString);
                  
                  // Add small delay to simulate streaming
                  await new Promise(resolve => setTimeout(resolve, 50));
                } else {
                  console.log('⚠️ [API] Chunk has no processable delta data:', {
                    hasChoices: !!parsed.chunk?.choices?.length,
                    hasDelta: !!delta,
                    deltaKeys: delta ? Object.keys(delta) : 'no delta',
                    finishReason
                  });
                }
              } else {
                console.log('⚠️ [API] Unknown chunk type or missing chunk data:', {
                  type: parsed.type,
                  hasChunk: !!parsed.chunk,
                  keys: Object.keys(parsed)
                });
              }
            } catch (parseError) {
              console.warn('❌ [API] Failed to parse SSE data:', data.substring(0, 100), parseError);
            }
          } else {
            console.log('ℹ️ [API] Non-data line:', line.substring(0, 100));
          }
        }
        
        console.log('📊 [API] Processing complete:', {
          totalLines: lines.length,
          processedChunks,
          accumulatedLength: accumulatedContent.length
        });
        
        onComplete?.(accumulatedContent);
        return accumulatedContent;
      }

      // Use streaming if available
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          if (signal?.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last potentially incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                onComplete?.(accumulatedContent);
                return accumulatedContent;
              }

              try {
                const parsed = JSON.parse(data);
                
                // Handle backend's custom SSE format
                if (parsed.type === 'connection') {
                  console.log('🔌 [API] Connection established (native):', parsed.sessionId);
                  continue;
                }
                
                if (parsed.type === 'complete') {
                  console.log('🏁 [API] Received completion signal (native)');
                  onComplete?.(accumulatedContent);
                  return accumulatedContent;
                }
                
                if (parsed.type === 'chunk' && parsed.chunk) {
                  // Pass the entire chunk data to preserve tool calls, content, and other delta information
                  const delta = parsed.chunk.choices?.[0]?.delta;
                  const content = delta?.content || '';
                  const toolCalls = delta?.tool_calls;
                  const finishReason = parsed.chunk.choices?.[0]?.finish_reason;
                  
                  // Only accumulate actual text content
                  if (content) {
                    accumulatedContent += content;
                  }
                  
                  // Always pass the chunk if it has ANY delta data (content, tool calls, finish reason, etc.)
                  if (delta && (content || toolCalls || finishReason)) {

                    
                    // Pass the complete chunk structure to preserve all data
                    const nativeChunkString = JSON.stringify(parsed.chunk);

                    onChunk(nativeChunkString);
                  } else {
                    console.log('⚠️ [API] Native chunk has no processable delta data:', {
                      hasChoices: !!parsed.chunk?.choices?.length,
                      hasDelta: !!delta,
                      deltaKeys: delta ? Object.keys(delta) : 'no delta',
                      finishReason
                    });
                  }
                } else {
                  // Fallback: try direct OpenAI format for compatibility
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
                  const finishReason = parsed.choices?.[0]?.finish_reason;
                  
                  if (content) {
                    accumulatedContent += content;
                  }
                  
                  if (content || toolCalls || finishReason) {
                    const fallbackChunkString = JSON.stringify(parsed);
                    console.log(`🚀 [ApiClient] *** CALLING onChunk CALLBACK (FALLBACK) ***:`, {
                      chunkStringLength: fallbackChunkString.length,
                      callbackType: typeof onChunk,
                      chunkPreview: fallbackChunkString.substring(0, 200),
                      timestamp: Date.now()
                    });
                    onChunk(fallbackChunkString);
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }

        onComplete?.(accumulatedContent);
        return accumulatedContent;
        
      } finally {
        reader.releaseLock();
      }

    } catch (error: any) {
      console.error(`💥 [API] Stream Error:`, error);
      
      if (error.name === 'AbortError') {
        throw error;
      }
      
      if (error instanceof ApiError) {
        onError?.(error);
        throw error;
      }
      
      const apiError = new ApiError(
        error.message || 'Streaming request failed',
        0,
        { originalError: error }
      );
      onError?.(apiError);
      throw apiError;
    }
  }

  /**
   * Core request method with error handling and retry logic
   */
  private static async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...options.headers,
      },
    };

    console.log(`🌐 [API] ${config.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, config);
      
      // Log response details
      console.log(`📊 [API] Response: ${response.status} ${response.statusText}`);
      
      // Handle different response types
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const error = new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
        console.error(`❌ [API] Error:`, error);
        throw error;
      }

      // Parse successful response
      const data = await this.parseSuccessResponse(response);
      console.log(`✅ [API] Success:`, data);
      return data;
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(`🚫 [API] Network Error: Cannot reach ${url}`);
        throw new ApiError('Network connection failed. Please check your internet connection.', 0);
      }
      
      console.error(`💥 [API] Unexpected Error:`, error);
      throw new ApiError('An unexpected error occurred', 0, { originalError: error });
    }
  }

  /**
   * Parse error response from API
   */
  private static async parseErrorResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        return { error: text || response.statusText };
      }
    } catch (parseError) {
      console.warn('Failed to parse error response:', parseError);
      return { error: response.statusText };
    }
  }

  /**
   * Parse successful response from API
   */
  private static async parseSuccessResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text();
      } else {
        // For binary data or unknown content types
        return await response.blob();
      }
    } catch (parseError) {
      console.warn('Failed to parse response:', parseError);
      throw new ApiError('Failed to parse response', response.status);
    }
  }

  /**
   * Backend AI API convenience methods
   */
  static ai = {
    /**
     * Create chat completion
     */
    chatCompletion: (data: any) => ApiClient.post('/api/ai/chat/completion', data),

    /**
     * Stream chat completion
     */
    streamChatCompletion: (
      data: any,
      onChunk: (chunk: string) => void,
      onComplete?: (fullResponse: string) => void,
      onError?: (error: Error) => void,
      signal?: AbortSignal
    ) => ApiClient.stream('/api/ai/chat/stream', data, onChunk, onComplete, onError, signal),

    /**
     * Generate title
     */
    generateTitle: (data: any) => ApiClient.post('/api/ai/chat/title', data),

    /**
     * Generate summary
     */
    generateSummary: (data: any) => ApiClient.post('/api/ai/chat/summary', data),

    /**
     * Ask AI about image content (vision endpoint)
     */
    ask: (data: any) => ApiClient.post('/api/ai/ask', data),

    /**
     * Upload file
     */
    uploadFile: (data: any) => ApiClient.post('/api/ai/files/upload', data),

    /**
     * Vector store operations
     */
    vectorStore: {
      create: (data: any) => ApiClient.post('/api/ai/vector-store/create', data),
      get: (id: string) => ApiClient.get(`/api/ai/vector-store/${id}`),
      list: (params?: any) => ApiClient.get('/api/ai/vector-store/list', { 
        headers: { 'Content-Type': 'application/json' } 
      }),
      delete: (id: string) => ApiClient.delete(`/api/ai/vector-store/${id}`),
      search: (id: string, data: any) => ApiClient.post(`/api/ai/vector-store/${id}/search`, data),
      uploadAndAttach: (id: string, data: any) => ApiClient.post(`/api/ai/vector-store/${id}/files/upload-and-attach`, data),
      attachFile: (id: string, data: any) => ApiClient.post(`/api/ai/vector-store/${id}/files/attach`, data),
      deleteFile: (vectorStoreId: string, fileId: string) => ApiClient.delete(`/api/ai/vector-store/${vectorStoreId}/files/${fileId}`),
    },

    /**
     * Image generation
     */
    generateImage: (model: string, data: any) => ApiClient.post(`/api/ai/image/generate/openai/${model}`, data),

    /**
     * File operations
     */
    files: {
      get: (id: string) => ApiClient.get(`/api/ai/files/${id}`),
      list: (params?: any) => ApiClient.get('/api/ai/files', { 
        headers: { 'Content-Type': 'application/json' } 
      }),
      delete: (id: string) => ApiClient.delete(`/api/ai/files/${id}`),
      getContent: (id: string) => ApiClient.get(`/api/ai/files/${id}/content`),
    },

    /**
     * Assistant operations
     */
    assistant: {
      generateAvatarPrompt: (data: any) => ApiClient.post('/api/ai/assistant/avatar-prompt', data),
      suggestTools: (data: any) => ApiClient.post('/api/ai/assistant/suggest-tools', data),
    },

    /**
     * Memory operations
     */
    memory: {
      generateFilename: (data: any) => ApiClient.post('/api/ai/memory/filename', data),
    },
  };

  /**
   * Tool operations
   */
  static tools = {
    codeInterpreter: (data: any) => ApiClient.post('/api/tools/code-interpreter', data),
  };

  /**
   * Get base URL for the API
   */
  static getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Set base URL for the API (useful for testing)
   */
  static setBaseURL(url: string): void {
    this.baseURL = url;
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number = 0, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }
}

// Export a default instance
export default ApiClient; 