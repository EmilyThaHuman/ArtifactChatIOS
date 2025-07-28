import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { 
  Files, 
  Upload, 
  Trash2, 
  FileText, 
  X,
  AlertCircle,
} from 'lucide-react-native';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthHandler';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import GlassContainer from '@/components/ui/GlassContainer';

interface WorkspaceFilesProps {
  workspaceId: string;
  vectorStoreId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesChange?: (files: any[]) => void;
}

interface FileItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  metadata?: any;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Return appropriate icon based on file type
  // For now, using FileText as default, but could be expanded
  return FileText;
};

const getFileBackgroundColor = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return '#ef4444'; // red
    case 'json':
      return '#3b82f6'; // blue
    case 'csv':
    case 'xlsx':
      return '#10b981'; // green
    case 'zip':
    case 'rar':
      return '#8b5cf6'; // purple
    case 'mp3':
    case 'wav':
      return '#f59e0b'; // amber
    case 'mp4':
    case 'mov':
      return '#8b5cf6'; // purple
    default:
      return '#3b82f6'; // blue
  }
};

const getFileTypeLabel = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'PDF';
    case 'json':
      return 'JSON';
    case 'csv':
      return 'CSV';
    case 'md':
      return 'Markdown';
    case 'txt':
      return 'Text';
    case 'js':
    case 'jsx':
      return 'JavaScript';
    case 'ts':
    case 'tsx':
      return 'TypeScript';
    default:
      return 'File';
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function WorkspaceFiles({
  workspaceId,
  vectorStoreId,
  open,
  onOpenChange,
  onFilesChange,
}: WorkspaceFilesProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textFilename, setTextFilename] = useState('pasted-text');

  const { user } = useAuth();

  // Load files when dialog opens
  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [workspaceId, open]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get workspace file IDs
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('workspace_files')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;

      if (!workspace.workspace_files || workspace.workspace_files.length === 0) {
        setFiles([]);
        return;
      }

      // Get file details
      const { data: fileData, error } = await supabase
        .from('workspace_files')
        .select('*')
        .in('id', workspace.workspace_files)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFiles(fileData || []);
      
      // Notify parent of current files
      if (onFilesChange) {
        onFilesChange(fileData || []);
      }
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      // Use DocumentPicker for file selection
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const selectedFiles = result.assets || [result as any];
      
      // Filter out unsupported files
      const validFiles = selectedFiles.filter((file: any) => {
        if (file.mimeType?.startsWith('image/')) {
          return false;
        }
        const extension = file.name?.split('.').pop()?.toLowerCase();
        if (extension === 'xlsx') {
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        Alert.alert('Error', 'Image files and Excel (.xlsx) files are not supported.');
        return;
      }

      await uploadFiles(validFiles);
    } catch (error) {
      console.error('Error selecting files:', error);
      Alert.alert('Error', 'Failed to select files');
    }
  };

  const uploadFiles = async (selectedFiles: any[]) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const uploadedFiles = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          // Create file record in database
          const fileRecord = {
            workspace_id: workspaceId,
            user_id: user.id,
            created_by: user.id,
            file_name: file.name,
            file_type: file.mimeType || 'application/octet-stream',
            file_size: file.size || 0,
            file_path: `${workspaceId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
            storage_path: `vector_store/${vectorStoreId}/${file.name}`,
            metadata: {
              lastModified: file.lastModified || Date.now(),
              type: file.mimeType || 'application/octet-stream',
              purpose: 'workspace',
              original_filename: file.name,
              vector_store_attached: false,
              storage_type: 'vector_store_only',
              storage_confirmed: true,
            },
          };

          const { data: insertedFile, error: recordError } = await supabase
            .from('workspace_files')
            .insert(fileRecord)
            .select()
            .single();

          if (recordError) throw recordError;

          uploadedFiles.push(insertedFile);
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
        } catch (fileError) {
          console.error(`Error uploading file ${file.name}:`, fileError);
        }
      }

      if (uploadedFiles.length > 0) {
        // Update workspace files array
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('workspace_files')
          .eq('id', workspaceId)
          .single();

        if (!workspaceError) {
          const currentFiles = workspace.workspace_files || [];
          const newFileIds = uploadedFiles.map((f) => f.id);
          const updatedFiles = [...new Set([...currentFiles, ...newFileIds])];

          await supabase
            .from('workspaces')
            .update({ workspace_files: updatedFiles })
            .eq('id', workspaceId);
        }

        // Update local state
        setFiles((prev) => {
          const newFilesList = [...uploadedFiles, ...prev];
          
          // Notify parent
          if (onFilesChange) {
            setTimeout(() => onFilesChange(newFilesList), 0);
          }
          
          return newFilesList;
        });
      }

    } catch (error) {
      console.error('Error uploading files:', error);
      setError(error.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      setIsDeleting(true);

      // Get file info
      const { data: file, error: getError } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (getError) throw getError;

      // Optimistically remove from UI
      setFiles((prev) => {
        const newFilesList = prev.filter((f) => f.id !== fileId);
        
        // Notify parent
        if (onFilesChange) {
          setTimeout(() => onFilesChange(newFilesList), 0);
        }
        
        return newFilesList;
      });

      // Delete from database
      const { error: deleteError } = await supabase
        .from('workspace_files')
        .delete()
        .eq('id', fileId);

      if (deleteError) {
        // Restore file if deletion failed
        setFiles((prev) => {
          const restoredList = [...prev, file];
          
          if (onFilesChange) {
            setTimeout(() => onFilesChange(restoredList), 0);
          }
          
          return restoredList;
        });
        throw deleteError;
      }

      // Update workspace files array
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('workspace_files')
        .eq('id', workspaceId)
        .single();

      if (!workspaceError) {
        const updatedFiles = (workspace.workspace_files || []).filter((id: string) => id !== fileId);
        
        await supabase
          .from('workspaces')
          .update({ workspace_files: updatedFiles })
          .eq('id', workspaceId);
      }

    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePress = (fileId: string, fileName: string) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleFileDelete(fileId) },
      ]
    );
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) return;
    
    const blob = { 
      name: textFilename.endsWith('.txt') ? textFilename : `${textFilename}.txt`,
      mimeType: 'text/plain',
      size: textContent.length,
      // Create a mock file-like object
      uri: `data:text/plain;base64,${btoa(textContent)}`,
    };

    uploadFiles([blob]);
    setShowTextDialog(false);
    setTextContent('');
    setTextFilename('pasted-text');
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFiles();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderFileItem = ({ item }: { item: FileItem }) => {
    const FileIcon = getFileIcon(item.file_name);
    const bgColor = getFileBackgroundColor(item.file_name);
    const typeLabel = getFileTypeLabel(item.file_name);

    return (
      <View style={styles.fileItem}>
        <View style={[styles.fileIcon, { backgroundColor: bgColor }]}>
          <FileIcon size={20} color="white" />
        </View>
        
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.file_name}
          </Text>
          <View style={styles.fileDetails}>
            <Text style={styles.fileType}>{typeLabel}</Text>
            <Text style={styles.fileDot}>•</Text>
            <Text style={styles.fileSize}>{formatFileSize(item.file_size)}</Text>
          </View>
          
          {item.metadata?.vector_store_incompatible && (
            <View style={styles.warningContainer}>
              <AlertCircle size={12} color="#f59e0b" />
              <Text style={styles.warningText}>Not supported for search</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item.id, item.file_name)}
          disabled={isDeleting}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Files size={48} color={Colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No files uploaded yet</Text>
      <Text style={styles.emptySubtitle}>
        Upload documents, code files, text files, or audio files to make them available to your AI assistant
      </Text>
    </View>
  );

  if (!open) return null;

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onOpenChange(false)}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Project Files</Text>
            {files.length > 0 && (
              <Text style={styles.fileCount}>{files.length} files</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => onOpenChange(false)}
            activeOpacity={0.7}
          >
            <X size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Upload progress */}
        {isUploading && (
          <View style={styles.uploadProgress}>
            <LoadingSpinner size={16} color={Colors.purple500} />
            <Text style={styles.uploadText}>Uploading... {uploadProgress}%</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <LoadingSpinner size={24} />
              <Text style={styles.loadingText}>Loading files...</Text>
            </View>
          ) : files.length > 0 ? (
            <FlatList
              data={files}
              renderItem={renderFileItem}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={Colors.purple500}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filesList}
            />
          ) : (
            renderEmptyState()
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleFileUpload}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <Upload size={20} color="white" />
            <Text style={styles.actionButtonText}>Upload Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setShowTextDialog(true)}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <FileText size={20} color={Colors.purple500} />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Add Text</Text>
          </TouchableOpacity>
        </View>

        {/* Text input dialog */}
        <Modal
          visible={showTextDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTextDialog(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.textModal}>
              <View style={styles.textModalHeader}>
                <Text style={styles.textModalTitle}>Add Text Content</Text>
                <TouchableOpacity
                  onPress={() => setShowTextDialog(false)}
                  style={styles.textModalClose}
                >
                  <X size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>

              <View style={styles.textModalContent}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={textFilename}
                  onChangeText={setTextFilename}
                  placeholder="Name your content"
                  placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Content</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={textContent}
                  onChangeText={setTextContent}
                  placeholder="Type or paste in content..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.actionButton, { marginTop: 16 }]}
                  onPress={handleTextSubmit}
                  disabled={!textContent.trim()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>Add Content</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  fileCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  uploadText: {
    color: Colors.purple500,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  filesList: {
    padding: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileType: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fileDot: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginHorizontal: 6,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  warningText: {
    fontSize: 11,
    color: '#f59e0b',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.purple500,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.purple500,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButtonText: {
    color: Colors.purple500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '90%',
    maxWidth: 400,
  },
  textModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  textModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  textModalClose: {
    padding: 4,
  },
  textModalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: Colors.textLight,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
}); 