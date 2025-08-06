import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {
  Plus,
  ArrowUp,
  X,
  Camera,
  Folder,
  Search,
  Zap,
  Palette,
  ChevronDown,
  FileText,
  Download,
  Upload,
  Edit3,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Colors } from '@/constants/Colors';
import { useFileUpload } from '@/lib/content';
import PhotoSelector from './PhotoSelector';
import ImageModelSelector from './ImageModelSelector';
import ImageStyleSelector, { ImageStyle, IMAGE_STYLES } from './ImageStyleSelector';
import { AVAILABLE_IMAGE_MODELS, DEFAULT_IMAGE_MODEL, ImageModelInfo } from '@/constants/ImageModels';
import { editImage, supportsImageEditing } from '@/lib/services/imageEditingService';
import {
  ClaudeIcon,
  CohereIcon,
  DeepSeekIcon,
  FluxIcon,
  GeminiIcon,
  GroqIcon,
  GrokIcon,
  MistralIcon,
  PerplexityIcon,
  OpenRouterIcon,
} from './icons';
import { OpenAIIcon } from './OpenAIIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper function to get image model provider icons
const getImageModelIcon = (provider: string, size: number = 12) => {
  switch (provider.toLowerCase()) {
    case 'openai':
      return <OpenAIIcon size={size} color="#ffffff" />;
    case 'fal':
      return <FluxIcon size={size} color="#ffffff" />;
    case 'google':
      return <GeminiIcon size={size} />;
    case 'xai':
      return <GrokIcon size={size} color="#ffffff" />;
    case 'anthropic':
      return <ClaudeIcon size={size} />;
    case 'deepseek':
      return <DeepSeekIcon size={size} />;
    case 'groq':
      return <GroqIcon size={size} color="#ffffff" />;
    case 'mistral':
      return <MistralIcon size={size} />;
    case 'cohere':
      return <CohereIcon size={size} />;
    case 'perplexity':
      return <PerplexityIcon size={size} />;
    case 'openrouter':
      return <OpenRouterIcon size={size} color="#ffffff" />;
    case 'flux':
      return <FluxIcon size={size} color="#ffffff" />;
    default:
      return <OpenAIIcon size={size} color="#ffffff" />;
  }
};

// File utility functions
const getFileBackgroundColor = (filename: string) => {
  if (!filename) return { backgroundColor: '#3b82f6' };
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return { backgroundColor: '#ef4444' };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return { backgroundColor: '#3b82f6' };
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'php':
    case 'json':
      return { backgroundColor: '#3b82f6' };
    case 'txt':
    case 'md':
    case 'doc':
    case 'docx':
      return { backgroundColor: '#3b82f6' };
    case 'csv':
    case 'xls':
    case 'xlsx':
      return { backgroundColor: '#10b981' };
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z':
      return { backgroundColor: '#8b5cf6' };
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'm4a':
      return { backgroundColor: '#f59e0b' };
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return { backgroundColor: '#8b5cf6' };
    default:
      return { backgroundColor: '#3b82f6' };
  }
};

const getFileIcon = (filename: string) => {
  if (!filename) return <FileText size={16} color="#ffffff" />;
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'md':
      return <FileText size={16} color="#ffffff" />;
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z':
      return <Folder size={16} color="#ffffff" />;
    default:
      return <FileText size={16} color="#ffffff" />;
  }
};

const getFileTypeLabel = (filename: string) => {
  if (!filename) return 'File';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'PDF';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return 'Image';
    case 'doc':
    case 'docx':
      return 'Document';
    case 'txt':
      return 'Text';
    case 'md':
      return 'Markdown';
    default:
      return 'File';
  }
};

interface ChatInputProps {
  onSendMessage: (content: string, files?: any[], toolChoice?: { toolId: string; toolName: string } | null) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isConnected?: boolean;
  threadId?: string;
  workspaceId?: string;
  streamingMessageId?: string | null;
  onStopGeneration?: () => void;
  showAdvancedFeatures?: boolean;
  maxLength?: number;
}

interface RecentPhoto {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
}

interface Tool {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
}



export default function ChatInput({
  onSendMessage,
  placeholder = "Ask anything...",
  disabled = false,
  isLoading = false,
  isConnected = true,
  threadId,
  workspaceId,
  streamingMessageId,
  onStopGeneration,
  showAdvancedFeatures = true,
  maxLength = 4000,
}: ChatInputProps) {
  const [inputText, setInputText] = useState('');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedTool, setSelectedTool] = useState<{ toolId: string; toolName: string } | null>(null);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle | null>(null);
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModelInfo>(DEFAULT_IMAGE_MODEL);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [showImageModelModal, setShowImageModelModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [slideAnimation] = useState(new Animated.Value(0));

  // File upload hook
  const {
    files,
    isUploading,
    isPickerActive,
    pickDocument,
    pickImage,
    captureImage,
    addImageFromUri,
    removeFile,
    clearFiles
  } = useFileUpload(threadId, workspaceId);

  const effectiveDisabled = disabled || !isConnected;
  const effectivePlaceholder = !isConnected ? "Connecting..." : placeholder;



  const handleSendMessage = async () => {
    if (!inputText.trim() || disabled || isLoading) return;
    
    console.log('📤 [ChatInput] Sending message with context:', {
      threadId,
      workspaceId,
      hasFiles: files.length > 0,
      fileCount: files.length,
      context: 'MESSAGE_SEND_START'
    });
    
    let messageContent = inputText.trim();
    const attachedFiles = files.filter(f => f.status === 'completed');
    
    // If image generation is selected, enhance the message with style and model info
    if (selectedTool?.toolId === 'create-image') {
      // Add style prompt if a style is selected
      if (selectedImageStyle) {
        messageContent = `${selectedImageStyle.prompt}\n\n${messageContent}`;
      }
      
      // Create enhanced tool object with model and style information
      const enhancedTool = {
        ...selectedTool,
        model: selectedImageModel.model,
        modelName: selectedImageModel.name,
        style: selectedImageStyle ? {
          name: selectedImageStyle.name,
          value: selectedImageStyle.value,
          prompt: selectedImageStyle.prompt
        } : null
      };
      
      setInputText('');
      clearFiles();
      
      // Send the message with enhanced tool information
      onSendMessage(messageContent, attachedFiles, enhancedTool);
    } else {
    setInputText('');
    clearFiles();
    
      // Send the message with regular tool choice
    onSendMessage(messageContent, attachedFiles, selectedTool);
    }
    
    // Clear tool selection after sending
    setSelectedTool(null);
    setSelectedImageStyle(null);
  };

  const handleSubmitEditing = () => {
    // Only send message if there's content and we're not loading
    if (inputText.trim() && !isLoading && !effectiveDisabled) {
      handleSendMessage();
    }
  };

  const handlePlusPress = async () => {
    try {
      setShowBottomSheet(true);
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error opening bottom sheet:', error);
    }
  };

  const hideBottomSheet = () => {
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowBottomSheet(false);
    });
  };

  const handlePhotoSelect = async (photo: RecentPhoto) => {
    try {
      hideBottomSheet();
      
      // Use the new addImageFromUri function to directly add the selected photo
      await addImageFromUri(photo.uri, photo.filename, photo.width, photo.height);
      
      console.log('Successfully selected and uploaded photo:', photo.filename);
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert(
        'Upload Error',
        'Failed to upload the selected photo. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleShowAllPhotos = async () => {
    hideBottomSheet();
    // Use the existing pickImage function
    await pickImage();
  };

  const toggleTool = (toolId: string, toolName: string) => {
    if (selectedTool?.toolId === toolId) {
      // Deselect if already selected
      setSelectedTool(null);
      // Clear style when deselecting image generation
      if (toolId === 'create-image') {
        setSelectedImageStyle(null);
      }
    } else {
      // Select the new tool
      setSelectedTool({ toolId, toolName });
      // Clear style when switching to a different tool
      if (selectedTool?.toolId === 'create-image' && toolId !== 'create-image') {
        setSelectedImageStyle(null);
      }
    }
    hideBottomSheet();
  };

  const handleImageEdit = async () => {
    try {
      if (files.length === 0) {
        Alert.alert('No Images', 'Please upload an image first to edit it.');
        return;
      }

      const imageFiles = files.filter(file => file.isImage);
      if (imageFiles.length === 0) {
        Alert.alert('No Images', 'Please upload an image file to edit.');
        return;
      }

      if (!inputText.trim()) {
        Alert.alert('No Instructions', 'Please provide instructions for how you want to edit the image.');
        return;
      }

      if (!supportsImageEditing(selectedImageModel.id)) {
        Alert.alert('Model Not Supported', `The ${selectedImageModel.name} model does not support image editing. Please select a different model.`);
        return;
      }

      hideBottomSheet();
      setIsEditingImage(true);

      const imageUrls = imageFiles.map(file => file.uri);
      const editResult = await editImage({
        prompt: inputText,
        imageUrls,
        model: selectedImageModel.model,
        size: '1024x1024',
        n: 1,
      });

      if (editResult.success) {
        // Clear input and show success
        setInputText('');
        Alert.alert('Success', 'Image has been edited successfully!');
        
        // Optionally add the edited images to the message
        const editedImageUrls = editResult.result.data.images.map(img => img.url);
        if (onSendMessage && editedImageUrls.length > 0) {
          onSendMessage(`Here are your edited images:\n\n${editedImageUrls.map(url => `![Edited Image](${url})`).join('\n\n')}`);
        }
      } else {
        Alert.alert('Error', editResult.error || 'Failed to edit image');
      }
    } catch (error) {
      console.error('Error editing image:', error);
      Alert.alert('Error', 'Failed to edit image. Please try again.');
    } finally {
      setIsEditingImage(false);
    }
  };

  const tools: Tool[] = [
    {
      id: 'create-image',
      title: 'Create image',
      icon: Palette,
      onPress: () => toggleTool('create-image', 'Create image')
    },
    {
      id: 'edit-image',
      title: 'Edit image',
      icon: Edit3,
      onPress: handleImageEdit
    },
    {
      id: 'web-search',
      title: 'Web search',
      icon: Search,
      onPress: () => toggleTool('web-search', 'Web search')
    },
    {
      id: 'add-files',
      title: 'Add files',
      icon: Folder,
      onPress: async () => {
        console.log('📁 [ChatInput] Add files button pressed');
        hideBottomSheet();
        
        // Show action sheet to let user choose between documents and photos
        Alert.alert(
          'Add Files',
          'What would you like to add?',
          [
            {
              text: 'Documents',
              onPress: async () => {
                try {
                  console.log('📁 [ChatInput] Calling pickDocument...');
                  await pickDocument();
                  console.log('📁 [ChatInput] pickDocument completed successfully');
                } catch (error) {
                  console.error('📁 [ChatInput] Error in pickDocument:', error);
                  Alert.alert('File Picker Error', 'Failed to open file picker. Please try again.');
                }
              }
            },
            {
              text: 'Photos',
              onPress: async () => {
                try {
                  console.log('📸 [ChatInput] Calling pickImage...');
                  await pickImage();
                  console.log('📸 [ChatInput] pickImage completed successfully');
                } catch (error) {
                  console.error('📸 [ChatInput] Error in pickImage:', error);
                  Alert.alert('Photo Picker Error', 'Failed to open photo picker. Please try again.');
                }
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
    },
  ];



  const renderToolItem = (tool: Tool) => {
    const isSelected = selectedTool?.toolId === tool.id;
    const isToggleTool = tool.id === 'create-image' || tool.id === 'web-search';
    const isEditImageTool = tool.id === 'edit-image';
    const isLoading = isEditImageTool && isEditingImage;
    
    return (
      <TouchableOpacity
        key={tool.id}
        style={[
          styles.toolItem,
          isSelected && styles.toolItemSelected,
          isLoading && styles.toolItemLoading
        ]}
        onPress={isLoading ? undefined : tool.onPress}
        disabled={isLoading}
      >
        <View style={[styles.toolIcon, isSelected && styles.toolIconSelected]}>
          {isLoading ? (
            <ActivityIndicator size={24} color="#9333ea" />
          ) : (
          <tool.icon size={24} color={isSelected ? "#9333ea" : "#ffffff"} />
          )}
          {isSelected && isToggleTool && (
            <View style={styles.toolBadge}>
              <View style={styles.toolBadgeDot} />
            </View>
          )}
        </View>
        <Text style={[styles.toolText, isSelected && styles.toolTextSelected]}>
          {isLoading ? 'Editing...' : tool.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const slideTranslateY = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  const backdropOpacity = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const renderImageModelSelector = () => (
    <Modal
      visible={showImageModelModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowImageModelModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowImageModelModal(false)}
      >
        <View style={styles.modelSelectorContainer}>
          <Text style={styles.modelSelectorTitle}>Choose Image Model</Text>
          <ScrollView 
            style={styles.modelOptionsScroll}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.modelOptionsContent}
          >
            {AVAILABLE_IMAGE_MODELS.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelOption,
                  selectedImageModel.id === model.id && styles.selectedModelOption
                ]}
                onPress={() => {
                  setSelectedImageModel(model);
                  setShowImageModelModal(false);
                }}
                disabled={isLoading}
              >
                <View style={styles.modelIcon}>
                  {getImageModelIcon(model.provider, 20)}
                </View>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelProvider}>{model.provider}</Text>
                </View>
                {selectedImageModel.id === model.id && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderStyleSelector = () => (
    <Modal
      visible={showStyleModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStyleModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowStyleModal(false)}
      >
        <View style={styles.modelSelectorContainer}>
          <Text style={styles.modelSelectorTitle}>Choose Style</Text>
          <ScrollView 
            style={styles.modelOptionsScroll}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.modelOptionsContent}
          >
            {IMAGE_STYLES.map((style) => (
              <TouchableOpacity
                key={style.value}
                style={[
                  styles.modelOption,
                  selectedImageStyle?.value === style.value && styles.selectedModelOption
                ]}
                onPress={() => {
                  setSelectedImageStyle(style);
                  setShowStyleModal(false);
                }}
                disabled={isLoading}
              >
                <View style={styles.modelIcon}>
                  <Image 
                    source={style.imageUrl} 
                    style={styles.stylePreviewImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{style.name}</Text>
                  <Text style={styles.modelProvider}>{style.category || 'Style'}</Text>
                </View>
                {selectedImageStyle?.value === style.value && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <>
      <View style={styles.container}>
        {/* Stop generation button */}
        {streamingMessageId && onStopGeneration && (
          <TouchableOpacity style={styles.stopButton} onPress={onStopGeneration}>
            <Text style={styles.stopButtonText}>Stop generating</Text>
          </TouchableOpacity>
        )}
        
        {/* Enhanced File Previews */}
        {files.length > 0 && (
          <View style={styles.filePreviewContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fileScrollContent}
            >
              {files.map((file, index) => {
                const isImage = file.type?.startsWith('image/');
                const fileIsUploading = isUploading || file.status === 'uploading';
                
                return (
                  <View key={file.id || index} style={styles.filePreviewItem}>
                    {isImage ? (
                      // Image Preview
                      <View style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: file.uri || file.publicUrl }}
                          style={styles.imagePreview}
                          resizeMode="cover"
                        />
                        {fileIsUploading && (
                          <View style={styles.uploadingOverlay}>
                            <ActivityIndicator size="small" color="#ffffff" />
                          </View>
                        )}
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => removeFile(file.id)}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // File Preview
                      <View style={styles.filePreviewCard}>
                        <View style={[styles.fileIcon, getFileBackgroundColor(file.name || 'unknown')]}>
                          {fileIsUploading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            getFileIcon(file.name || 'unknown')
                          )}
                        </View>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.name || 'Unknown file'}
                          </Text>
                          <Text style={styles.fileType}>
                            {getFileTypeLabel(file.name || 'unknown')}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.removeButton}
                          onPress={() => removeFile(file.id)}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
        
        {/* Selected Tool Indicator */}
        {selectedTool && (
          <View style={styles.selectedToolContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedToolsRow}
            >
              {/* Main Tool Chip */}
              <View style={styles.selectedToolChip}>
                <View style={styles.selectedToolIcon}>
                  <View style={styles.selectedToolBadgeDot} />
                </View>
                <Text style={styles.selectedToolText}>{selectedTool.toolName}</Text>
                <TouchableOpacity 
                  style={styles.selectedToolClear}
                  onPress={() => {
                    setSelectedTool(null);
                    setSelectedImageStyle(null);
                  }}
                >
                  <Text style={styles.selectedToolClearText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Image Generation Controls */}
              {selectedTool.toolId === 'create-image' && (
                <>
                  {/* Image Model Badge */}
                <TouchableOpacity 
                    style={styles.imageModelBadge}
                    onPress={() => setShowImageModelModal(true)}
                    disabled={isLoading}
                  >
                    <View style={styles.imageModelIcon}>
                      {getImageModelIcon(selectedImageModel.provider, 12)}
                    </View>
                    <Text style={styles.imageModelBadgeText}>
                      {selectedImageModel.name}
                  </Text>
                </TouchableOpacity>

                  {/* Style Badge */}
                  <TouchableOpacity 
                    style={styles.styleBadge}
                    onPress={() => setShowStyleModal(true)}
                    disabled={isLoading}
                  >
                    <View style={styles.styleIcon}>
                      {selectedImageStyle ? (
                        <Image 
                          source={selectedImageStyle.imageUrl} 
                          style={styles.styleIconImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Palette size={12} color="#8B5CF6" />
                      )}
                    </View>
                    <Text style={styles.styleBadgeText}>
                      {selectedImageStyle ? selectedImageStyle.name : 'Style'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* Input Container */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder={effectivePlaceholder}
            placeholderTextColor="#6b7280"
            value={inputText}
            onChangeText={setInputText}
            multiline={false}
            maxLength={maxLength}
            editable={!effectiveDisabled}
            returnKeyType="send"
            onSubmitEditing={handleSubmitEditing}
            enablesReturnKeyAutomatically={true}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.plusButton, effectiveDisabled && styles.disabledButton]}
              onPress={handlePlusPress}
              disabled={effectiveDisabled}
            >
              <Plus size={20} color={effectiveDisabled ? Colors.textSecondary : "#ffffff"} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!inputText.trim() || effectiveDisabled || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || effectiveDisabled || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <ArrowUp size={20} color="#161618" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={showBottomSheet}
        transparent={true}
        animationType="none"
        onRequestClose={hideBottomSheet}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <Animated.View 
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <TouchableOpacity 
              style={styles.backdropTouchable}
              onPress={hideBottomSheet}
            />
          </Animated.View>

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: slideTranslateY }],
              },
            ]}
          >
            <SafeAreaView style={styles.bottomSheetContent}>
              {/* Handle */}
              <View style={styles.handle} />

              {/* Photos Section */}
              <PhotoSelector
                onPhotoSelect={handlePhotoSelect}
                onCameraPress={async () => {
                         hideBottomSheet();
                  await captureImage();
                }}
                onShowAllPress={handleShowAllPhotos}
                maxPhotos={8}
              />

              {/* Tools Section */}
              <View style={styles.toolsSection}>
                {tools.map(renderToolItem)}
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      {/* Image Model Selection Modal */}
      {renderImageModelSelector()}

      {/* Style Selection Modal */}
      {renderStyleSelector()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 0,
    paddingTop: 16,
    backgroundColor: '#161618',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  filePreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  fileScrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  filePreviewItem: {
    marginRight: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 200,
    maxWidth: 240,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileType: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  // Legacy styles (kept for compatibility)
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: 200,
  },
  filePreviewText: {
    color: '#ffffff',
    fontSize: 14,
    marginRight: 8,
    flex: 1,
  },
  fileRemoveButton: {
    padding: 4,
  },
  inputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 48,
  },
  textInput: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 0,
    marginBottom: 12,
    minHeight: 24,
    maxHeight: 120,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.5,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#161618',
  },
  backdropTouchable: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  bottomSheetContent: {
    flex: 1,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#48484a',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  

  
  // Tools Section
  toolsSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  toolItemSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 8,
  },
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  toolIconSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderWidth: 1,
    borderColor: '#9333ea',
  },
  toolBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  toolText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '400',
  },
  toolTextSelected: {
    color: '#a855f7',
    fontWeight: '500',
  },
  selectedToolContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedToolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  selectedToolIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedToolBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  selectedToolText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  selectedToolClear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedToolClearText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 12,
  },

  toolItemLoading: {
    opacity: 0.6,
  },
  selectedToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Image Model Badge (Blue themed)
  imageModelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue background
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  imageModelIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6', // Blue background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  imageModelBadgeText: {
    color: '#3b82f6', // Blue text
    fontSize: 12,
    fontWeight: '500',
  },

  // Style Badge (Purple themed - matching existing)
  styleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.15)', // Purple background
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  styleIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6', // Purple background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  styleIconImage: {
    width: '100%',
    height: '100%',
  },
  styleBadgeText: {
    color: '#8B5CF6', // Purple text
    fontSize: 12,
    fontWeight: '500',
  },

  // Modal styles matching ChatInterface.tsx
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelSelectorContainer: {
    backgroundColor: '#353535',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    minWidth: 280,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#525252',
  },
  modelOptionsScroll: {
    maxHeight: 400,
  },
  modelOptionsContent: {
    paddingBottom: 8,
  },
  modelSelectorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
    gap: 12,
  },
  selectedModelOption: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  modelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#525252',
    overflow: 'hidden',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modelProvider: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  stylePreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },

}); 