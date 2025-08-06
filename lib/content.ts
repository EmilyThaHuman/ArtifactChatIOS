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
    console.log('📁 [useFileUpload] pickDocument called');
    
    // Prevent concurrent picker operations
    if (isPickerActive) {
      console.log('📁 [useFileUpload] Document picker already active, ignoring request');
      return;
    }

    try {
      console.log('📁 [useFileUpload] Setting picker active and clearing errors');
      setIsPickerActive(true);
      setError(null);
      
      console.log('📁 [useFileUpload] Calling DocumentPicker.getDocumentAsync...');
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true
      });

      console.log('📁 [useFileUpload] DocumentPicker result:', {
        canceled: result.canceled,
        hasAssets: !!result.assets,
        assetsLength: result.assets?.length || 0
      });

      if (!result.canceled && result.assets) {
        console.log('📁 [useFileUpload] Processing selected files:', result.assets.length);
        
        const newFiles: VectorStoreFile[] = result.assets.map((asset, index) => ({
          id: `doc-${Date.now()}-${index}`,
          name: asset.name,
          size: asset.size || 0,
          type: asset.mimeType || 'application/octet-stream',
          uri: asset.uri,
          status: 'uploading',
          isImage: asset.mimeType?.startsWith('image/') || false
        }));

        console.log('📁 [useFileUpload] Created file objects:', newFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));

        setFiles(prev => [...prev, ...newFiles]);
        await processFiles(newFiles);
      } else if (result.canceled) {
        console.log('📁 [useFileUpload] User canceled file picker');
      } else {
        console.log('📁 [useFileUpload] No assets in result');
      }
    } catch (error) {
      console.error('📁 [useFileUpload] Error picking document:', error);
      const errorMessage = 'Failed to pick document';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('📁 [useFileUpload] Setting picker inactive');
      setIsPickerActive(false);
    }
  }, [isPickerActive]);

  const pickImage = useCallback(async () => {
    // Prevent concurrent picker operations
    if (isPickerActive) {
      console.log('🖼️ [pickImage] Image picker already active, ignoring request');
      return;
    }

    try {
      setIsPickerActive(true);
      setError(null);
      
      // Request media library permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media library permission not granted');
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newFiles: VectorStoreFile[] = result.assets.map((asset, index) => ({
          id: `img-${Date.now()}-${index}`,
          name: asset.fileName || `image-${Date.now()}-${index}.jpg`,
          size: asset.fileSize || 0,
          type: asset.type || 'image/jpeg',
          uri: asset.uri,
          status: 'uploading',
          isImage: true
        }));

        setFiles(prev => [...prev, ...newFiles]);
        
        // Process images individually using direct Supabase upload
        for (const file of newFiles) {
          try {
            console.log('🖼️ [pickImage] Uploading image:', file.name);
            
            // Upload directly to Supabase storage
            const publicUrl = await uploadToSupabaseStorage(file);
            
            // Update file status with public URL
            setFiles(prev => 
              prev.map(f => 
                f.id === file.id 
                  ? { 
                      ...f, 
                      status: 'completed',
                      publicUrl,
                      metadata: { uploaded: true }
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
      
      // Determine correct MIME type based on filename
      const extension = filename?.split('.').pop()?.toLowerCase();
      let mimeType = 'image/jpeg'; // default
      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'gif') mimeType = 'image/gif';
      else if (extension === 'webp') mimeType = 'image/webp';
      else if (extension === 'svg') mimeType = 'image/svg+xml';
      
      const newFile: VectorStoreFile = {
        id: `selected-${Date.now()}`,
        name: filename || `image-${Date.now()}.${extension || 'jpg'}`,
        size: 0, // We don't have size info for selected photos
        type: mimeType,
        uri: uri,
        status: 'uploading',
        isImage: true
      };

      console.log('📁 [addImageFromUri] Created file object:', {
        id: newFile.id,
        name: newFile.name,
        type: newFile.type,
        isImage: newFile.isImage,
        hasUri: !!newFile.uri,
        extension,
        mimeType
      });
      
      setFiles(prev => [...prev, newFile]);
      
      // Only process files if we have a context, otherwise just add to state for display
      if (threadId || workspaceId) {
        try {
          // Upload image directly to Supabase storage (skip backend API for images)
          console.log('🖼️ [addImageFromUri] Uploading image directly to Supabase:', filename);
          
          const tempFileForUpload: VectorStoreFile = {
            id: `image-${Date.now()}`,
            name: filename,
            uri: uri,
            type: mimeType,
            size: 0,
            status: 'uploading',
            isImage: true
          };
          
          console.log('📤 [addImageFromUri] Starting direct Supabase upload:', {
            filename,
            type: mimeType,
            uri: uri.substring(0, 50) + '...'
          });
          
          const publicUrl = await uploadToSupabaseStorage(tempFileForUpload);
          
          // Update file with completed status and public URL
          setFiles(prev => 
            prev.map(f => 
              f.id === newFile.id 
                ? { 
                    ...f, 
                    status: 'completed',
                    publicUrl
                  }
                : f
            )
          );
          
          console.log('✅ [addImageFromUri] Image uploaded successfully:', {
            filename,
            publicUrl,
            fileId: newFile.id,
            uploadMethod: 'direct-supabase'
          });
          
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
    console.log('📁 [FILE UPLOAD] Starting processFiles with context:', {
      originalThreadId: threadId,
      originalWorkspaceId: workspaceId,
      fileCount: filesToProcess.length,
      context: 'PROCESS_FILES_START'
    });
    
    // Check if we have context for file upload - if not, try to create one
    let effectiveThreadId = threadId;
    let effectiveWorkspaceId = workspaceId;

    if (!effectiveThreadId && !effectiveWorkspaceId) {
      console.warn('No thread ID or workspace ID provided for file upload, attempting fallback...');
      
      try {
        // Get current user to find their personal workspace and recent thread
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // First try to get the most recent thread for this user (might be the current one being used)
        const { data: recentThread, error: threadError } = await supabase
          .from('threads')
          .select('id, workspace_id, vector_store_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!threadError && recentThread && recentThread.length > 0) {
          const thread = recentThread[0];
          effectiveThreadId = thread.id;
          effectiveWorkspaceId = thread.workspace_id;
          console.log('✅ Using most recent thread for file upload:', {
            threadId: thread.id,
            workspaceId: thread.workspace_id,
            hasVectorStore: !!thread.vector_store_id
          });
        } else {
          // Fallback to personal workspace approach
          const { data: workspaces, error: workspaceError } = await supabase
            .from('workspaces')
            .select('id, name, is_personal')
            .eq('user_id', user.id)
            .eq('is_personal', true)
            .limit(1);

          if (!workspaceError && workspaces && workspaces.length > 0) {
            effectiveWorkspaceId = workspaces[0].id;
            console.log('✅ Using user personal workspace for file upload:', workspaces[0].name);
          } else {
            // If no personal workspace, get any workspace owned by user
            const { data: anyWorkspace, error: anyWorkspaceError } = await supabase
              .from('workspaces')
              .select('id, name')
              .eq('user_id', user.id)
              .limit(1);

            if (!anyWorkspaceError && anyWorkspace && anyWorkspace.length > 0) {
              effectiveWorkspaceId = anyWorkspace[0].id;
              console.log('✅ Using user workspace for file upload:', anyWorkspace[0].name);
            } else {
              // If no workspace available, create a new thread which will create workspace too
              console.log('No workspaces available, creating new thread...');
              
              // Import ThreadManager dynamically to avoid circular dependencies
              const { ThreadManager } = await import('./threads');
              const newThread = await ThreadManager.createNewThread({
                title: 'File Upload Chat'
              });
              
              if (newThread) {
                effectiveThreadId = newThread.id;
                effectiveWorkspaceId = newThread.workspace_id;
                console.log('✅ Created new thread for file upload:', newThread.id);
                
                // TODO: We should update the parent component's state here
                // For now, we'll proceed with the upload
              } else {
                console.error('❌ Failed to create thread for file upload');
                setError('Failed to create chat for file upload');
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error setting up context for file upload:', error);
        setError('Failed to create chat for file upload');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('🗂️ [useFileUpload] Processing files:', {
        fileCount: filesToProcess.length,
        threadId: effectiveThreadId,
        workspaceId: effectiveWorkspaceId,
        fileNames: filesToProcess.map(f => f.name)
      });

      // Create or get vector store for thread/workspace - prioritize thread vector store
      let vectorStoreId: string | null = null;
      
      // If we have a thread ID, try to get/create its vector store first
      if (effectiveThreadId) {
        console.log('🔍 [FILE UPLOAD] Attempting to use thread vector store for:', effectiveThreadId);
        vectorStoreId = await getOrCreateVectorStore(effectiveThreadId, effectiveWorkspaceId);
      } else if (effectiveWorkspaceId) {
        console.log('🔍 [FILE UPLOAD] No thread ID, using workspace vector store for:', effectiveWorkspaceId);
        vectorStoreId = await getOrCreateVectorStore(null, effectiveWorkspaceId);
      }
      
      if (!vectorStoreId) {
        throw new Error('Failed to create or get vector store');
      }
      
      console.log('🔍 [FILE UPLOAD] Vector Store ID for upload:', {
        vectorStoreId,
        threadId: effectiveThreadId,
        workspaceId: effectiveWorkspaceId,
        fileCount: filesToProcess.length,
        prioritizedThread: !!effectiveThreadId,
        context: 'FILE_UPLOAD_PROCESSING'
      });

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
            const publicUrl = await uploadImageForVision(file, effectiveThreadId || effectiveWorkspaceId);
            updateFileStatus(file.id, 'completed', { publicUrl });
            console.log(`🖼️ [useFileUpload] Image uploaded: ${file.name}`);
          } else {
            // Upload document to vector store via backend API
            console.log(`🗄️ [FILE UPLOAD] Uploading document to vector store:`, {
              fileName: file.name,
              vectorStoreId,
              threadId: effectiveThreadId,
              workspaceId: effectiveWorkspaceId,
              context: 'DOCUMENT_UPLOAD_START'
            });
            
            const { fileId, vectorStoreFileId } = await uploadFileToVectorStore(
              file, 
              vectorStoreId, 
              chatService
            );
            
            console.log(`✅ [FILE UPLOAD] Document successfully uploaded to vector store:`, {
              fileName: file.name,
              fileId,
              vectorStoreFileId,
              vectorStoreId,
              threadId: effectiveThreadId,
              workspaceId: effectiveWorkspaceId,
              context: 'DOCUMENT_UPLOAD_COMPLETE'
            });
            
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
      
      // Notify completion with current context
      console.log('📋 [FILE UPLOAD] Upload completion context:', {
        threadId: effectiveThreadId,
        workspaceId: effectiveWorkspaceId,
        originalThreadId: threadId,
        originalWorkspaceId: workspaceId,
        filesUploaded: filesToProcess.length,
        context: 'UPLOAD_COMPLETION'
      });

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
 * Upload image for vision directly to Supabase storage
 */
async function uploadImageForVision(
  file: VectorStoreFile,
  contextId?: string
): Promise<string> {
  try {
    console.log('🖼️ [uploadImageForVision] Uploading image:', file.name);

    // Use direct Supabase upload for better reliability
    const publicUrl = await uploadToSupabaseStorage(file);
    
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
export function formatRetrievalResults(results: any[]): string {
  if (results.length === 0) return '';
  
  console.log('📝 [lib/content] formatRetrievalResults called with:', {
    resultsCount: results.length,
    sampleResult: results[0]
  });
  
  let formatted = '<files>\n';
  for (const result of results) {
    // Handle both old and new API response formats
    const fileId = result.fileId || result.file_id || 'undefined';
    const filename = result.filename || result.file_name || 'unknown_file';
    
    // Extract content from the API response format
    let content = '';
    if (typeof result.content === 'string') {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      // Handle new API format: content is array of objects with text
      content = result.content
        .filter(item => item && item.type === 'text')
        .map(item => item.text)
        .join('\n');
    } else if (result.content && typeof result.content === 'object') {
      // Handle object content - stringify it
      content = JSON.stringify(result.content);
    }
    
    console.log('📝 [lib/content] Processing result:', {
      fileId,
      filename,
      contentType: typeof result.content,
      contentLength: content.length,
      rawContent: result.content
    });
    
    formatted += `<file_snippet file_id='${fileId}' file_name='${filename}'>`;
    formatted += `<content>${content}</content>`;
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

/**
 * Upload file directly to Supabase storage
 */
async function uploadToSupabaseStorage(file: VectorStoreFile): Promise<string> {
  try {
    console.log('📤 [uploadToSupabaseStorage] Uploading to Supabase:', file.name);

    // Get current user for file path
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated for file upload');
    }

    // Read file for Supabase upload
    // React Native requires different handling for file:// URIs
    let fileData: Blob | File;
    
    if (file.uri.startsWith('file://')) {
      // For React Native local file URIs, we need to use the blob directly
      // Create a form data to properly handle the file
      const formData = new FormData();
      
      // React Native handles file:// URIs specially in FormData
      const fileObj = {
        uri: file.uri,
        type: file.type || 'image/png',
        name: file.name
      } as any;
      
      // Test if we can create a proper blob
      try {
        // For React Native, we can pass the file object directly to Supabase
        // Supabase's React Native client can handle this format
        fileData = fileObj;
        
        console.log('📤 [uploadToSupabaseStorage] Using React Native file object:', {
          uri: file.uri,
          type: file.type,
          name: file.name,
          size: file.size || 'unknown'
        });
      } catch (error) {
        console.error('❌ [uploadToSupabaseStorage] Failed to create file object:', error);
        throw new Error(`Failed to prepare file for upload: ${error}`);
      }
    } else {
      // For HTTP/HTTPS URIs, use standard fetch
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      fileData = await response.blob();
      
      if ((fileData as Blob).size === 0) {
        throw new Error(`File is empty: ${file.name}`);
      }
    }
    
    // Use the same file naming convention as web app
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000);
    
    // Sanitize the original filename to be safe for storage paths
    const safeOriginalName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
      .replace(/_{2,}/g, '_'); // Replace multiple underscores with single

    // Extract the file extension
    const fileExtension = file.name.includes('.')
      ? `.${file.name.split('.').pop()}`
      : '';

    // Keep extension only once (don't duplicate)
    const nameWithoutExtension = safeOriginalName.endsWith(fileExtension)
      ? safeOriginalName.slice(0, -fileExtension.length)
      : safeOriginalName;

    // Create a filename with clear separators between parts, organized by user ID
    // Format: {userId}/origname=[original-filename]_[timestamp]_[random].ext
    const fileName = `${user.id}/origname=${nameWithoutExtension}_${timestamp}_${randomNum}${fileExtension}`;

    // Ensure we have a proper content type for images
    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      // Infer content type from file extension
      const ext = fileExtension.toLowerCase();
      const typeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp'
      };
      contentType = typeMap[ext] || 'image/jpeg';
    }

    // Create file metadata including original filename and user info
    const fileMetadata = {
      original_name: file.name,
      content_type: contentType,
      file_size: (fileData as any).size || 0,
      user_id: user.id,
      uploaded_at: new Date().toISOString(),
    };

    console.log('📤 [uploadToSupabaseStorage] Upload details:', {
      bucket: 'chat',
      fileName,
      userId: user.id,
      originalName: file.name,
      contentType,
      fileDataType: typeof fileData,
      fileDataSize: (fileData as any).size || 'unknown'
    });

    // Upload directly to the 'chat' bucket using the exact same approach as web app
    const result = await supabase.storage
      .from('chat')
      .upload(fileName, fileData, {
        cacheControl: '3600',
        upsert: true, // Use true like web app
        contentType: contentType, // Use the corrected content type
        metadata: fileMetadata,
      });
    
    const { data, error: uploadError } = result;

    if (uploadError) {
      console.error('❌ [uploadToSupabaseStorage] Supabase error:', uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no path returned');
    }

    // Get public URL from chat bucket
    const { data: urlData } = supabase.storage
      .from('chat')
      .getPublicUrl(data.path);
    
    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL from Supabase chat bucket');
    }
    
    const publicUrl = urlData.publicUrl;

    console.log('✅ [uploadToSupabaseStorage] File uploaded successfully:', {
      fileName: file.name,
      path: data.path,
      publicUrl
    });

    return publicUrl;

  } catch (error) {
    console.error('❌ [uploadToSupabaseStorage] Error:', error);
    throw error;
  }
}