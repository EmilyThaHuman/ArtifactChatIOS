import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { ChatCompletionService } from './services/chatCompletionService';
import { ApiClient } from './apiClient';

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
  metadata?: any;
}

export interface RetrievalResult {
  content: string;
  filename: string;
  fileId: string;
  score?: number;
}

// File Upload Hook for React Native with Backend API Integration
export function useFileUpload(threadId?: string, workspaceId?: string) {
  const [files, setFiles] = useState<VectorStoreFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPickerActive, setIsPickerActive] = useState(false);

  const pickDocument = useCallback(async () => {
    // Prevent concurrent picker operations
    if (isPickerActive) {
      console.log('Document picker already active, ignoring request');
      return;
    }

    try {
      setIsPickerActive(true);
      setError(null);
      
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
      const errorMessage = 'Failed to pick document';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsPickerActive(false);
    }
  }, [isPickerActive]);

  const pickImage = useCallback(async () => {
    // Prevent concurrent picker operations
    if (isPickerActive) {
      console.log('Image picker already active, ignoring request');
      return;
    }

    try {
      setIsPickerActive(true);
      setError(null);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: VectorStoreFile[] = result.assets.map((asset, index) => ({
          id: `img-${Date.now()}-${index}`,
          name: asset.fileName || `image-${Date.now()}-${index}.jpg`,
          size: asset.fileSize || 0,
          type: 'image/jpeg',
          uri: asset.uri,
          status: 'uploading',
          isImage: true
        }));

        setFiles(prev => [...prev, ...newFiles]);
        
        // Process images individually using backend API (same as web app)
        for (const file of newFiles) {
          try {
            console.log('🖼️ [pickImage] Uploading image:', file.name);
            
            // Read file as base64 for backend API
            const base64Content = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.Base64
            });
            
            // Add data URL prefix for proper base64 format
            const base64WithPrefix = `data:${file.type};base64,${base64Content}`;
            
            // Upload via backend API (same as web app)
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/ai/files/upload`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                file: base64WithPrefix,
                purpose: 'vision',
                filename: file.name,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Upload failed: ${errorData.error || response.status}`);
            }
            
            const uploadResult = await response.json();
            const publicUrl = uploadResult.file?.url || uploadResult.publicUrl;
            
            // Update file with completed status and public URL
            setFiles(prev => 
              prev.map(f => 
                f.id === file.id 
                  ? { 
                      ...f, 
                      status: 'completed',
                      publicUrl,
                      metadata: { ...uploadResult.file }
                    }
                  : f
              )
            );
            
            console.log('✅ [pickImage] Image uploaded successfully:', file.name);
            
          } catch (uploadError) {
            console.error('❌ [pickImage] Upload failed:', uploadError);
            // Mark file as error
            setFiles(prev => 
              prev.map(f => 
                f.id === file.id 
                  ? { ...f, status: 'error' }
                  : f
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      const errorMessage = 'Failed to pick image';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsPickerActive(false);
    }
  }, [isPickerActive]);

  const captureImage = useCallback(async () => {
    // Prevent concurrent picker operations
    if (isPickerActive) {
      console.log('Camera already active, ignoring request');
      return;
    }

    try {
      setIsPickerActive(true);
      setError(null);
      
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required to take photos.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: VectorStoreFile[] = result.assets.map((asset, index) => ({
          id: `cam-${Date.now()}-${index}`,
          name: asset.fileName || `camera-${Date.now()}-${index}.jpg`,
          size: asset.fileSize || 0,
          type: 'image/jpeg',
          uri: asset.uri,
          status: 'uploading',
          isImage: true
        }));

        setFiles(prev => [...prev, ...newFiles]);
        
        // Process images individually using backend API (same as web app)
        for (const file of newFiles) {
          try {
            console.log('📷 [captureImage] Uploading captured image:', file.name);
            
            // Read file as base64 for backend API
            const base64Content = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.Base64
            });
            
            // Add data URL prefix for proper base64 format
            const base64WithPrefix = `data:${file.type};base64,${base64Content}`;
            
            // Upload via backend API (same as web app)
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/ai/files/upload`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                file: base64WithPrefix,
                purpose: 'vision',
                filename: file.name,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Upload failed: ${errorData.error || response.status}`);
            }
            
            const uploadResult = await response.json();
            const publicUrl = uploadResult.file?.url || uploadResult.publicUrl;
            
            // Update file with completed status and public URL
            setFiles(prev => 
              prev.map(f => 
                f.id === file.id 
                  ? { 
                      ...f, 
                      status: 'completed',
                      publicUrl,
                      metadata: { ...uploadResult.file }
                    }
                  : f
              )
            );
            
            console.log('✅ [captureImage] Image uploaded successfully:', file.name);
            
          } catch (uploadError) {
            console.error('❌ [captureImage] Upload failed:', uploadError);
            // Mark file as error
            setFiles(prev => 
              prev.map(f => 
                f.id === file.id 
                  ? { ...f, status: 'error' }
                  : f
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      const errorMessage = 'Failed to capture image';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsPickerActive(false);
    }
  }, [isPickerActive]);

  const addImageFromUri = useCallback(async (uri: string, filename: string, width?: number, height?: number) => {
    try {
      setError(null);
      
      const newFile: VectorStoreFile = {
        id: `selected-${Date.now()}`,
        name: filename || `image-${Date.now()}.jpg`,
        size: 0, // We don't have size info for selected photos
        type: 'image/jpeg',
        uri: uri,
        status: 'uploading',
        isImage: true
      };

      setFiles(prev => [...prev, newFile]);
      
      // Only process files if we have a context, otherwise just add to state for display
      if (threadId || workspaceId) {
        try {
          // Upload image using backend API (same as web app)
          console.log('🖼️ [addImageFromUri] Uploading selected image:', filename);
          
          // Read file as base64 for backend API
          const base64Content = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          // Add data URL prefix for proper base64 format
          const base64WithPrefix = `data:image/jpeg;base64,${base64Content}`;
          
          // Upload via backend API (same as web app)
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/ai/files/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file: base64WithPrefix,
              purpose: 'vision',
              filename: filename,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Upload failed: ${errorData.error || response.status}`);
          }
          
          const result = await response.json();
          const publicUrl = result.file?.url || result.publicUrl;
          
          if (!publicUrl) {
            throw new Error('No public URL returned from upload');
          }
          
          // Update file with completed status and public URL
          setFiles(prev => 
            prev.map(f => 
              f.id === newFile.id 
                ? { 
                    ...f, 
                    status: 'completed',
                    publicUrl,
                    metadata: { ...result.file }
                  }
                : f
            )
          );
          
          console.log('✅ [addImageFromUri] Image uploaded successfully:', filename);
          
        } catch (uploadError) {
          console.error('❌ [addImageFromUri] Upload failed:', uploadError);
          // Mark file as error
          setFiles(prev => 
            prev.map(f => 
              f.id === newFile.id 
                ? { ...f, status: 'error' }
                : f
            )
          );
          throw uploadError;
        }
      } else {
        console.log('No thread/workspace context - image added for display only');
        // Update the file status to completed since we're not uploading
        setFiles(prev => 
          prev.map(f => 
            f.id === newFile.id 
              ? { ...f, status: 'completed' }
              : f
          )
        );
      }
    } catch (error) {
      console.error('Error adding image from URI:', error);
      const errorMessage = 'Failed to add selected image';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  }, [threadId, workspaceId]);

  const processFiles = useCallback(async (filesToProcess: VectorStoreFile[]) => {
    if (!threadId && !workspaceId) {
      console.warn('No thread ID or workspace ID provided for file upload');
      setError('Missing thread or workspace context');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('🗂️ [useFileUpload] Processing files:', {
        fileCount: filesToProcess.length,
        threadId,
        workspaceId,
        fileNames: filesToProcess.map(f => f.name)
      });

      // Create or get vector store for thread/workspace
      let vectorStoreId = await getOrCreateVectorStore(threadId, workspaceId);
      if (!vectorStoreId) {
        throw new Error('Failed to create or get vector store');
      }

      const chatService = new ChatCompletionService();
      const totalFiles = filesToProcess.length;

      // Process each file
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        
        try {
          console.log(`📄 [useFileUpload] Processing file ${i + 1}/${totalFiles}: ${file.name}`);
          updateFileStatus(file.id, 'processing');

          if (file.isImage) {
            // Upload image for vision to Supabase storage
            const publicUrl = await uploadImageForVision(file, threadId || workspaceId);
            updateFileStatus(file.id, 'completed', { publicUrl });
            console.log(`🖼️ [useFileUpload] Image uploaded: ${file.name}`);
          } else {
            // Upload document to vector store via backend API
            const { fileId, vectorStoreFileId } = await uploadFileToVectorStore(
              file, 
              vectorStoreId, 
              chatService
            );
            
            updateFileStatus(file.id, 'completed', { 
              openaiFileId: fileId, 
              vectorStoreId,
              metadata: { vectorStoreFileId }
            });
            console.log(`📄 [useFileUpload] Document uploaded: ${file.name}`);
          }

          // Update progress
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));

        } catch (fileError) {
          console.error(`❌ [useFileUpload] Error processing file ${file.name}:`, fileError);
          updateFileStatus(file.id, 'error');
          setError(`Failed to upload ${file.name}: ${(fileError as Error).message}`);
        }
      }

      console.log('✅ [useFileUpload] All files processed successfully');

    } catch (error) {
      console.error('❌ [useFileUpload] Error processing files:', error);
      const errorMessage = `Failed to upload files: ${(error as Error).message}`;
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      
      // Mark all files as error
      filesToProcess.forEach(file => {
        updateFileStatus(file.id, 'error');
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [threadId, workspaceId]);

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
    setError(null);
    setUploadProgress(0);
  }, []);

  const getVectorStoreForContext = useCallback(async (): Promise<string | null> => {
    return await getOrCreateVectorStore(threadId, workspaceId);
  }, [threadId, workspaceId]);

  return {
    files,
    isUploading,
    uploadProgress,
    error,
    isPickerActive,
    pickDocument,
    pickImage,
    captureImage,
    addImageFromUri,
    removeFile,
    clearFiles,
    getVectorStoreForContext
  };
}

/**
 * Get or create vector store for thread/workspace
 */
async function getOrCreateVectorStore(threadId?: string, workspaceId?: string): Promise<string | null> {
  try {
    console.log('🗄️ [getOrCreateVectorStore] Getting vector store:', { threadId, workspaceId });

    // Try to get existing vector store ID from database
    let vectorStoreId: string | null = null;

    if (threadId) {
      const { data: thread } = await supabase
        .from('threads')
        .select('vector_store_id')
        .eq('id', threadId)
        .single();
      
      vectorStoreId = thread?.vector_store_id;
    } else if (workspaceId) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('vector_store_id')
        .eq('id', workspaceId)
        .single();
      
      vectorStoreId = workspace?.vector_store_id;
    }

    // Create new vector store if none exists
    if (!vectorStoreId) {
      console.log('📝 [getOrCreateVectorStore] Creating new vector store');
      const chatService = new ChatCompletionService();
      const name = threadId ? `Thread-${threadId}` : `Workspace-${workspaceId}`;
      vectorStoreId = await chatService.createVectorStore(name);

      // Update database with new vector store ID
      if (threadId) {
        await supabase
          .from('threads')
          .update({ vector_store_id: vectorStoreId })
          .eq('id', threadId);
      } else if (workspaceId) {
        await supabase
          .from('workspaces')
          .update({ vector_store_id: vectorStoreId })
          .eq('id', workspaceId);
      }

      console.log('✅ [getOrCreateVectorStore] Created vector store:', vectorStoreId);
    } else {
      console.log('✅ [getOrCreateVectorStore] Using existing vector store:', vectorStoreId);
    }

    return vectorStoreId;

  } catch (error) {
    console.error('❌ [getOrCreateVectorStore] Error:', error);
    return null;
  }
}

/**
 * Upload file to vector store using backend API
 */
async function uploadFileToVectorStore(
  file: VectorStoreFile,
  vectorStoreId: string,
  chatService: ChatCompletionService
): Promise<{ fileId: string; vectorStoreFileId: string }> {
  try {
    console.log('📤 [uploadFileToVectorStore] Uploading file:', file.name);

    // Read file content as base64
    const base64Content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Create data URL
    const dataUrl = `data:${file.type};base64,${base64Content}`;

    // Upload and attach to vector store in one operation
    const result = await chatService.uploadAndAttachToVectorStore(
      vectorStoreId,
      dataUrl,
      file.name
    );

    console.log('✅ [uploadFileToVectorStore] File uploaded:', {
      fileName: file.name,
      fileId: result.fileId,
      vectorStoreFileId: result.vectorStoreFileId
    });

    return result;

  } catch (error) {
    console.error('❌ [uploadFileToVectorStore] Error:', error);
    throw error;
  }
}

/**
 * Upload image for vision to backend API (similar to web app)
 */
async function uploadImageForVision(
  file: VectorStoreFile,
  contextId?: string
): Promise<string> {
  try {
    console.log('🖼️ [uploadImageForVision] Uploading image:', file.name);

    // Read file as base64 for backend API
    const base64Content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    // Add data URL prefix for proper base64 format
    const base64WithPrefix = `data:${file.type};base64,${base64Content}`;
    
    // Upload via backend API (same as web app)
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/ai/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64WithPrefix,
        purpose: 'vision',
        filename: file.name,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Upload failed: ${errorData.error || response.status}`);
    }
    
    const result = await response.json();
    const publicUrl = result.file?.url || result.publicUrl;
    
    if (!publicUrl) {
      throw new Error('No public URL returned from upload');
    }
    
    console.log('✅ [uploadImageForVision] Image uploaded:', {
      fileName: file.name,
      publicUrl
    });
    
    return publicUrl;

  } catch (error) {
    console.error('❌ [uploadImageForVision] Error:', error);
    throw error;
  }
}

/**
 * Search vector store using backend API
 */
export async function searchVectorStore(
  vectorStoreId: string,
  query: string,
  maxResults = 5,
  options: {
    scoreThreshold?: number;
    enableStrictFiltering?: boolean;
  } = {}
): Promise<RetrievalResult[]> {
  try {
    console.log('🔍 [searchVectorStore] Searching:', {
      vectorStoreId,
      query: query.substring(0, 100),
      maxResults
    });

    const chatService = new ChatCompletionService();
    const results = await chatService.searchVectorStore(
      vectorStoreId,
      query,
      maxResults,
      {
        score_threshold: options.scoreThreshold || 0.4,
        enable_strict_filtering: options.enableStrictFiltering !== false,
        ...options
      }
    );

    console.log('✅ [searchVectorStore] Search completed:', {
      resultCount: results.length,
      vectorStoreId
    });

    return results;

  } catch (error) {
    console.error('❌ [searchVectorStore] Error:', error);
    return [];
  }
}

/**
 * Format retrieval results for AI context
 */
export function formatRetrievalResults(results: RetrievalResult[]): string {
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

/**
 * Get thread vector store ID
 */
export async function getThreadVectorStore(threadId: string): Promise<string | null> {
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

/**
 * Get workspace vector store ID
 */
export async function getWorkspaceVectorStore(workspaceId: string): Promise<string | null> {
  try {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('vector_store_id')
      .eq('id', workspaceId)
      .single();
    
    return workspace?.vector_store_id || null;
  } catch (error) {
    console.error('Error getting workspace vector store:', error);
    return null;
  }
}

/**
 * Delete file from vector store
 */
export async function deleteFileFromVectorStore(
  vectorStoreId: string,
  fileId: string
): Promise<boolean> {
  try {
    console.log('🗑️ [deleteFileFromVectorStore] Deleting file:', { vectorStoreId, fileId });

    const chatService = new ChatCompletionService();
    await chatService.deleteFileFromVectorStore(vectorStoreId, fileId);

    console.log('✅ [deleteFileFromVectorStore] File deleted successfully');
    return true;

  } catch (error) {
    console.error('❌ [deleteFileFromVectorStore] Error:', error);
    return false;
  }
}

/**
 * Create vector store
 */
export async function createVectorStore(name: string): Promise<string | null> {
  try {
    console.log('📝 [createVectorStore] Creating vector store:', name);

    const chatService = new ChatCompletionService();
    const vectorStoreId = await chatService.createVectorStore(name);

    console.log('✅ [createVectorStore] Vector store created:', vectorStoreId);
    return vectorStoreId;

  } catch (error) {
    console.error('❌ [createVectorStore] Error:', error);
    return null;
  }
}