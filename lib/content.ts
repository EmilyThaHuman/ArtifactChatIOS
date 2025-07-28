import { supabase, Database } from './supabase';
import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { OpenAIService, VectorStoreFile } from './openai';

type Thread = Database['public']['Tables']['threads']['Row'];
type ThreadMessage = Database['public']['Tables']['thread_messages']['Row'];
type WorkspaceFile = Database['public']['Tables']['workspace_files']['Row'];

export interface ContentItem {
  id: string;
  type: 'conversation' | 'image' | 'document' | 'canvas';
  title: string;
  preview?: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// File Upload Hook for React Native
export function useFileUpload(threadId?: string, workspaceId?: string) {
  const [files, setFiles] = useState<VectorStoreFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets) {
        const newFiles: VectorStoreFile[] = result.assets.map((asset, index) => ({
          id: `doc-${Date.now()}-${index}`,
          name: asset.name,
          size: asset.size || 0,
          type: asset.mimeType || 'application/octet-stream',
          uri: asset.uri,
          status: 'uploading',
          isImage: asset.mimeType?.startsWith('image/') || false
        }));

        setFiles(prev => [...prev, ...newFiles]);
        await processFiles(newFiles);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: false
      });

      if (!result.canceled && result.assets) {
        const newFiles: VectorStoreFile[] = result.assets.map((asset, index) => ({
          id: `img-${Date.now()}-${index}`,
          name: asset.fileName || `image-${Date.now()}.jpg`,
          size: asset.fileSize || 0,
          type: 'image/jpeg',
          uri: asset.uri,
          status: 'uploading',
          isImage: true
        }));

        setFiles(prev => [...prev, ...newFiles]);
        await processFiles(newFiles);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const processFiles = useCallback(async (filesToProcess: VectorStoreFile[]) => {
    if (!threadId) {
      console.warn('No thread ID provided for file upload');
      return;
    }

    setIsUploading(true);

    try {
      // Create or get vector store for thread
      let vectorStoreId = await getThreadVectorStore(threadId);
      if (!vectorStoreId) {
        vectorStoreId = await OpenAIService.createVectorStore(`Thread-${threadId}`, threadId);
      }

      // Process each file
      for (const file of filesToProcess) {
        try {
          if (file.isImage) {
            // Upload image for vision
            const publicUrl = await OpenAIService.uploadImageForVision(file, threadId);
            updateFileStatus(file.id, 'completed', { publicUrl });
          } else {
            // Upload to vector store
            const openaiFileId = await OpenAIService.uploadFileToVectorStore(file, vectorStoreId);
            updateFileStatus(file.id, 'completed', { 
              openaiFileId, 
              vectorStoreId 
            });
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          updateFileStatus(file.id, 'error');
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      Alert.alert('Error', 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  }, [threadId]);

  const updateFileStatus = useCallback((fileId: string, status: VectorStoreFile['status'], updates?: any) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status, ...updates }
        : file
    ));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    isUploading,
    pickDocument,
    pickImage,
    removeFile,
    clearFiles
  };
}

async function getThreadVectorStore(threadId: string): Promise<string | null> {
  try {
    const { data: thread } = await supabase
      .from('threads')
      .select('vector_store_id')
      .eq('id', threadId)
      .single();
    
    return thread?.vector_store_id || null;
  } catch (error) {
    console.error('Error getting thread vector store:', error);
    return null;
  }
}

export class ContentManager {
  static async fetchConversations(workspaceId: string): Promise<{ data: Thread[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async fetchConversationMessages(threadId: string): Promise<{ data: ThreadMessage[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('thread_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async fetchWorkspaceFiles(workspaceId: string): Promise<{ data: WorkspaceFile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async searchContent(query: string, workspaceId: string, type?: string): Promise<{ data: any[] | null; error: any }> {
    try {
      let results: any[] = [];
      
      // Search conversations
      if (!type || type === 'conversation') {
        const { data: conversations, error: convError } = await supabase
          .from('threads')
          .select('*')
          .eq('workspace_id', workspaceId)
          .or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
        
        if (conversations && !convError) {
          results.push(...conversations.map(c => ({ ...c, type: 'conversation' })));
        }
      }
      
      // Search files
      if (!type || type === 'document' || type === 'image') {
        const { data: files, error: filesError } = await supabase
          .from('workspace_files')
          .select('*')
          .eq('workspace_id', workspaceId)
          .or(`file_name.ilike.%${query}%,file_content.ilike.%${query}%`);
        
        if (files && !filesError) {
          results.push(...files.map(f => ({ 
            ...f, 
            type: f.file_type.startsWith('image/') ? 'image' : 'document' 
          })));
        }
      }
      
      return { data: results, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}