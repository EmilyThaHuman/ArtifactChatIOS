import OpenAI from 'openai';
import { fetch } from 'expo/fetch';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

// Initialize OpenAI client with expo/fetch for streaming support
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  fetch: fetch as any, // Use expo/fetch for streaming support in React Native
  dangerouslyAllowBrowser: true,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VectorStoreFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uri: string;
  vectorStoreId?: string;
  openaiFileId?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  isImage?: boolean;
  publicUrl?: string;
}

export interface RetrievalResult {
  content: string;
  filename: string;
  fileId: string;
  score?: number;
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

  // Vector Store Management
  static async createVectorStore(name: string, threadId?: string): Promise<string> {
    try {
      const vectorStore = await openai.vectorStores.create({
        name,
        expires_after: { anchor: 'last_active_at', days: 30 }
      });
      
      if (threadId) {
        await supabase
          .from('threads')
          .update({ vector_store_id: vectorStore.id })
          .eq('id', threadId);
      }
      
      return vectorStore.id;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  static async uploadFileToVectorStore(
    file: VectorStoreFile,
    vectorStoreId: string
  ): Promise<string> {
    try {
      const base64Content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      const byteCharacters = atob(base64Content);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      
      const blob = new Blob([byteArray], { type: file.type });
      const fileForUpload = new File([blob], file.name, { type: file.type });
      
      const uploadedFile = await openai.files.create({
        file: fileForUpload,
        purpose: 'assistants'
      });
      
      await openai.vectorStores.files.create(vectorStoreId, {
        file_id: uploadedFile.id
      });
      
      return uploadedFile.id;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  static async searchVectorStore(
    vectorStoreId: string,
    query: string,
    maxResults = 5
  ): Promise<RetrievalResult[]> {
    try {
      const searchResults = await openai.vectorStores.search(vectorStoreId, {
        query
      });
      
      // Take only the first maxResults items
      const limitedResults = searchResults.data.slice(0, maxResults);
      
      return limitedResults.map((result: any) => ({
        content: result.content || '',
        filename: result.metadata?.filename || 'Unknown',
        fileId: result.file_id || result.id,
        score: result.score || 0
      }));
    } catch (error) {
      console.error('Error searching vector store:', error);
      return [];
    }
  }

  static formatRetrievalResults(results: RetrievalResult[]): string {
    if (results.length === 0) return '';
    
    let formatted = '<files>\n';
    for (const result of results) {
      formatted += `<file_snippet file_id='${result.fileId}' file_name='${result.filename}'>`;
      formatted += `<content>${result.content}</content>`;
      formatted += '</file_snippet>\n';
    }
    formatted += '</files>';
    
    return formatted;
  }

  static async uploadImageForVision(
    file: VectorStoreFile,
    threadId?: string
  ): Promise<string> {
    try {
      const base64Content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `chat/${threadId || 'temp'}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, base64Content, {
          contentType: file.type,
          upsert: false
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
}

export default openai; 