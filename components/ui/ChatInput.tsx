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
  Send,
  X,
  Camera,
  Folder,
  Search,
  Zap,
  Palette,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Colors } from '@/constants/Colors';
import { useFileUpload } from '@/lib/content';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatInputProps {
  onSendMessage: (content: string, files?: any[]) => void;
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
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([]);
  const [slideAnimation] = useState(new Animated.Value(0));

  // File upload hook
  const {
    files,
    isUploading,
    pickDocument,
    pickImage,
    removeFile,
    clearFiles
  } = useFileUpload(threadId, workspaceId);

  const effectiveDisabled = disabled || !isConnected;
  const effectivePlaceholder = !isConnected ? "Connecting..." : placeholder;

  // Don't load photos on mount - wait until user opens bottom sheet
  // This prevents permission prompts on app startup

  const loadRecentPhotos = async () => {
    try {
      // Check permissions first
      const { status } = await MediaLibrary.getPermissionsAsync();
      
      if (status !== 'granted') {
        const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log('Photo library permission denied');
          return;
        }
      }

      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 8,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      const photos: RecentPhoto[] = assets.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
      }));

      setRecentPhotos(photos);
      console.log(`Loaded ${photos.length} recent photos`);
    } catch (error) {
      console.error('Error loading recent photos:', error);
      // Don't show alert for photo access issues, just log it
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || disabled || isLoading) return;
    
    const messageContent = inputText.trim();
    const attachedFiles = files.filter(f => f.status === 'completed');
    
    setInputText('');
    clearFiles();
    
    onSendMessage(messageContent, attachedFiles);
  };

  const handlePlusPress = async () => {
    try {
      setShowBottomSheet(true);
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Try to load photos when the sheet opens, but don't block the UI if it fails
      if (recentPhotos.length === 0) {
        await loadRecentPhotos();
      }
    } catch (error) {
      console.error('Error opening bottom sheet:', error);
      // Still show the bottom sheet even if photo loading fails
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
      
      // Use the existing image picker with the selected photo URI
      // This will trigger the same flow as pickImage but with a specific photo
      const result = {
        canceled: false,
        assets: [
          {
            uri: photo.uri,
            fileName: photo.filename,
            fileSize: 0,
            width: photo.width,
            height: photo.height,
          }
        ]
      };

      // Process the photo like pickImage does
      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset, index) => ({
          id: `photo-${Date.now()}-${index}`,
          name: asset.fileName || `image-${Date.now()}.jpg`,
          size: asset.fileSize || 0,
          type: 'image/jpeg',
          uri: asset.uri,
          status: 'uploading' as const,
          isImage: true
        }));

        // This would need to be handled by the parent component
        console.log('Selected photo for upload:', newFiles[0]);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
    }
  };

  const handleShowAllPhotos = async () => {
    hideBottomSheet();
    // Use the existing pickImage function
    await pickImage();
  };

  const tools: Tool[] = [
    {
      id: 'agent-mode',
      title: 'Agent mode',
      icon: Zap,
      onPress: () => {
        hideBottomSheet();
        Alert.alert('Agent Mode', 'AI agent functionality coming soon!');
      }
    },
    {
      id: 'deep-research',
      title: 'Deep research',
      icon: Search,
      onPress: () => {
        hideBottomSheet();
        Alert.alert('Deep Research', 'Deep research functionality coming soon!');
      }
    },
    {
      id: 'create-image',
      title: 'Create image',
      icon: Palette,
      onPress: () => {
        hideBottomSheet();
        Alert.alert('Create Image', 'Image generation functionality coming soon!');
      }
    },
    {
      id: 'web-search',
      title: 'Web search',
      icon: Search,
      onPress: () => {
        hideBottomSheet();
        Alert.alert('Web Search', 'Web search functionality coming soon!');
      }
    },
    {
      id: 'add-files',
      title: 'Add files',
      icon: Folder,
      onPress: async () => {
        hideBottomSheet();
        await pickDocument();
      }
    },
  ];

  const renderPhotoItem = (photo: RecentPhoto, index: number) => (
    <TouchableOpacity
      key={photo.id}
      style={styles.photoItem}
      onPress={() => handlePhotoSelect(photo)}
    >
      <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
    </TouchableOpacity>
  );

  const renderToolItem = (tool: Tool) => (
    <TouchableOpacity
      key={tool.id}
      style={styles.toolItem}
      onPress={tool.onPress}
    >
      <View style={styles.toolIcon}>
        <tool.icon size={24} color="#ffffff" />
      </View>
      <Text style={styles.toolText}>{tool.title}</Text>
    </TouchableOpacity>
  );

  const slideTranslateY = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  const backdropOpacity = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <>
      <View style={styles.container}>
        {/* Stop generation button */}
        {streamingMessageId && onStopGeneration && (
          <TouchableOpacity style={styles.stopButton} onPress={onStopGeneration}>
            <Text style={styles.stopButtonText}>Stop generating</Text>
          </TouchableOpacity>
        )}
        
        {/* File Previews */}
        {files.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filePreviewContainer}
          >
                         {files.map((file, index) => (
               <View key={file.id} style={styles.filePreview}>
                 <Text style={styles.filePreviewText} numberOfLines={1}>{file.name}</Text>
                 <TouchableOpacity onPress={() => removeFile(file.id)} style={styles.fileRemoveButton}>
                   <X size={16} color="#ffffff" />
                 </TouchableOpacity>
               </View>
             ))}
          </ScrollView>
        )}
        
        {/* Input Container */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder={effectivePlaceholder}
            placeholderTextColor="#6b7280"
            value={inputText}
            onChangeText={setInputText}
            multiline={true}
            maxLength={maxLength}
            editable={!effectiveDisabled}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
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
                <Send size={20} color="#000000" />
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
              <View style={styles.photosSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Photos</Text>
                  <TouchableOpacity onPress={handleShowAllPhotos}>
                    <Text style={styles.showAllButton}>Show All</Text>
                  </TouchableOpacity>
                </View>
                
                                 <ScrollView
                   horizontal
                   showsHorizontalScrollIndicator={false}
                   style={styles.photosScrollView}
                 >
                   {/* Camera button */}
                   <TouchableOpacity 
                     style={styles.cameraButton}
                     onPress={async () => {
                       hideBottomSheet();
                       // Launch camera
                       const result = await ImagePicker.launchCameraAsync({
                         mediaTypes: ImagePicker.MediaTypeOptions.Images,
                         quality: 0.8,
                         exif: false
                       });
                       
                       if (!result.canceled && result.assets) {
                         // Process camera photo similar to pickImage
                         console.log('Camera photo taken:', result.assets[0]);
                       }
                     }}
                   >
                     <Camera size={24} color="#666" />
                   </TouchableOpacity>
                   
                   {/* Recent photos */}
                   {recentPhotos.length > 0 ? (
                     recentPhotos.map(renderPhotoItem)
                   ) : (
                     <View style={styles.noPhotosContainer}>
                       <Text style={styles.noPhotosText}>No recent photos</Text>
                     </View>
                   )}
                 </ScrollView>
              </View>

              {/* Tools Section */}
              <View style={styles.toolsSection}>
                {tools.map(renderToolItem)}
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 0,
    paddingTop: 16,
    backgroundColor: '#000000',
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
    maxHeight: 80,
    marginBottom: 8,
  },
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
    backgroundColor: Colors.purple500,
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
    backgroundColor: '#000000',
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
  
  // Photos Section
  photosSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  showAllButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '400',
  },
  photosScrollView: {
    flexDirection: 'row',
  },
  cameraButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  photoItem: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  noPhotosContainer: {
    width: 120,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  noPhotosText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
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
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '400',
  },
}); 