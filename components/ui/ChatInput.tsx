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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Colors } from '@/constants/Colors';
import { useFileUpload } from '@/lib/content';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

interface ImageStyle {
  name: string;
  value: string;
  imageUrl: any; // Can be require() or URI string
  prompt: string;
}

// Image style options using kitty images
const IMAGE_STYLES: ImageStyle[] = [
  // Row 1 - Top row
  {
    name: "Cyberpunk",
    value: "cyberpunk",
    imageUrl: require("@/assets/images/kitties/cyberpunk.webp"),
    prompt: "Create an image in a cyberpunk aesthetic: vivid neon accents, futuristic textures, glowing details, and high-contrast lighting.",
  },
  {
    name: "Anime",
    value: "anime",
    imageUrl: require("@/assets/images/kitties/anime.webp"),
    prompt: "Create an image in a detailed anime aesthetic: expressive eyes, smooth cel-shaded coloring, and clean linework. Emphasize emotion and character presence, with a sense of motion or atmosphere typical of anime scenes.",
  },
  {
    name: "Dramatic Headshot",
    value: "headshot",
    imageUrl: require("@/assets/images/kitties/headshot.webp"),
    prompt: "Create an ultra-realistic high-contrast black-and-white headshot, close up, black shadow background, 35mm lens, 4K quality, aspect ratio 4:3.",
  },
  // Row 2 - Middle row
  {
    name: "Coloring Book",
    value: "coloring-book",
    imageUrl: require("@/assets/images/kitties/coloring-book.webp"),
    prompt: "Create an image in a children's coloring book style: bold, even black outlines on white, no shading or tone. Simplify textures into playful, easily recognizable shapes.",
  },
  {
    name: "Photo Shoot",
    value: "photoshoot",
    imageUrl: require("@/assets/images/kitties/photoshoot.webp"),
    prompt: "Create an ultra-realistic professional photo shoot with soft lighting.",
  },
  {
    name: "Retro Cartoon",
    value: "retro",
    imageUrl: require("@/assets/images/kitties/retro.webp"),
    prompt: "Create a retro 1950s cartoon style image, minimal vector art, Art Deco inspired, clean flat colors, geometric shapes, mid-century modern design, elegant silhouettes, UPA style animation, smooth lines, limited color palette (black, red, beige, brown, white), grainy paper texture background, vintage jazz club atmosphere, subtle lighting, slightly exaggerated character proportions, classy and stylish mood.",
  },
  // Row 3 - Bottom row
  {
    name: "80s Glam",
    value: "80s",
    imageUrl: require("@/assets/images/kitties/80s.webp"),
    prompt: "Create a selfie styled like a cheesy 1980s mall glamour shot, foggy soft lighting, teal and magenta lasers in the background, feathered hair, shoulder pads, portrait studio vibes, ironic 'glam 4 life' caption.",
  },
  {
    name: "Art Nouveau",
    value: "art-nouveau",
    imageUrl: require("@/assets/images/kitties/art-nouveu.webp"),
    prompt: "Create an image in an Art Nouveau style: flowing lines, organic shapes, floral motifs, and soft, decorative elegance.",
  },
  {
    name: "Synthwave",
    value: "synthwave",
    imageUrl: require("@/assets/images/kitties/synthwave.webp"),
    prompt: "Create an image in a synthwave aesthetic: retro-futuristic 1980s vibe with neon grids, glowing sunset, vibrant magenta-and-cyan gradients, chrome highlights, and a nostalgic outrun atmosphere.",
  },
];

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
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedTool, setSelectedTool] = useState<{ toolId: string; toolName: string } | null>(null);
  const [showStylesModal, setShowStylesModal] = useState(false);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ImageStyle | null>(null);
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
    if (loadingPhotos) return; // Prevent multiple simultaneous loads
    
    try {
      setLoadingPhotos(true);
      console.log('📸 Starting to load recent photos...');
      
      // Check permissions first
      const { status } = await MediaLibrary.getPermissionsAsync();
      console.log('📸 Current permission status:', status);
      
      if (status !== 'granted') {
        console.log('📸 Requesting media library permissions...');
        const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
        console.log('📸 New permission status:', newStatus);
        if (newStatus !== 'granted') {
          console.log('📸 Photo library permission denied');
          setRecentPhotos([]); // Set empty array to show "No recent photos"
          return;
        }
      }

      console.log('📸 Fetching assets from media library...');
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 8,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      console.log('📸 Raw assets response:', {
        totalCount: assets.totalCount,
        assetsLength: assets.assets.length,
        hasNextPage: assets.hasNextPage,
        endCursor: assets.endCursor
      });

      // Process photos with enhanced URI handling for iOS ph:// format
      const photos: RecentPhoto[] = [];
      
      for (const asset of assets.assets) {
        try {
          // For iOS ph:// URIs, we need to get asset info to get a usable URI
          if (asset.uri.startsWith('ph://')) {
            console.log('📸 Processing ph:// URI for asset:', asset.id);
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
            console.log('📸 Asset info:', assetInfo);
            
            // Use localUri if available, otherwise fall back to original uri
            const usableUri = assetInfo.localUri || asset.uri;
            
            photos.push({
              id: asset.id,
              uri: usableUri,
              filename: asset.filename,
              width: asset.width,
              height: asset.height,
            });
          } else {
            // Standard URI format
            photos.push({
              id: asset.id,
              uri: asset.uri,
              filename: asset.filename,
              width: asset.width,
              height: asset.height,
            });
          }
        } catch (assetError) {
          console.warn('📸 Failed to process asset:', asset.id, assetError);
          // Skip this asset and continue with others
        }
      }

      console.log('📸 Successfully processed photos:', photos);
      setRecentPhotos(photos);
      console.log(`📸 Successfully loaded ${photos.length} recent photos`);
    } catch (error) {
      console.error('📸 Error loading recent photos:', error);
      setRecentPhotos([]); // Set empty array to show "No recent photos"
      
      // Show user-friendly error for specific cases
      if (error instanceof Error && error.message?.includes('permission')) {
        Alert.alert(
          'Photo Access',
          'Unable to access your photo library. Please check permissions in Settings.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || disabled || isLoading) return;
    
    const messageContent = inputText.trim();
    const attachedFiles = files.filter(f => f.status === 'completed');
    
    setInputText('');
    clearFiles();
    
    // Send the message with tool choice - the tool logic is now handled in useChat
    onSendMessage(messageContent, attachedFiles, selectedTool);
    
    // Clear tool selection after sending
    setSelectedTool(null);
    setSelectedImageStyle(null);
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

  const tools: Tool[] = [
    {
      id: 'create-image',
      title: 'Create image',
      icon: Palette,
      onPress: () => toggleTool('create-image', 'Create image')
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

  const renderToolItem = (tool: Tool) => {
    const isSelected = selectedTool?.toolId === tool.id;
    const isToggleTool = tool.id === 'create-image' || tool.id === 'web-search';
    
    return (
      <TouchableOpacity
        key={tool.id}
        style={[
          styles.toolItem,
          isSelected && styles.toolItemSelected
        ]}
        onPress={tool.onPress}
      >
        <View style={[styles.toolIcon, isSelected && styles.toolIconSelected]}>
          <tool.icon size={24} color={isSelected ? "#9333ea" : "#ffffff"} />
          {isSelected && isToggleTool && (
            <View style={styles.toolBadge}>
              <View style={styles.toolBadgeDot} />
            </View>
          )}
        </View>
        <Text style={[styles.toolText, isSelected && styles.toolTextSelected]}>
          {tool.title}
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

              {/* Styles Chip for Image Generation */}
              {selectedTool.toolId === 'create-image' && (
                <TouchableOpacity 
                  style={styles.stylesChip}
                  onPress={() => setShowStylesModal(true)}
                >
                  <Palette size={12} color="#a855f7" />
                  <Text style={styles.stylesChipText}>
                    {selectedImageStyle ? selectedImageStyle.name : 'Styles'}
                  </Text>
                  <ChevronDown size={12} color="#a855f7" />
                </TouchableOpacity>
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
                       try {
                         hideBottomSheet();
                         
                         // Check camera permissions first
                         const { status } = await ImagePicker.getCameraPermissionsAsync();
                         console.log('📷 Camera permission status:', status);
                         
                         if (status !== 'granted') {
                           console.log('📷 Requesting camera permissions...');
                           const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
                           console.log('📷 New camera permission status:', newStatus);
                           
                           if (newStatus !== 'granted') {
                             Alert.alert(
                               'Camera Permission',
                               'Camera access is required to take photos. Please enable it in Settings.',
                               [{ text: 'OK' }]
                             );
                             return;
                           }
                         }
                         
                         console.log('📷 Using camera via pickImage...');
                         // Use the existing pickImage function with camera option
                         await pickImage();
                       } catch (error) {
                         console.error('📷 Camera error:', error);
                         Alert.alert(
                           'Camera Error',
                           'Unable to access camera. Please try again.',
                           [{ text: 'OK' }]
                         );
                       }
                     }}
                   >
                     <Camera size={24} color="#666" />
                   </TouchableOpacity>
                   
                   {/* Recent photos */}
                   {loadingPhotos ? (
                     <View style={styles.loadingPhotosContainer}>
                       <ActivityIndicator size="small" color="#8b5cf6" />
                       <Text style={styles.loadingPhotosText}>Loading photos...</Text>
                     </View>
                   ) : recentPhotos.length > 0 ? (
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

      {/* Styles Selection Modal */}
      <Modal
        visible={showStylesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStylesModal(false)}
      >
        <View style={styles.stylesModalOverlay}>
          <TouchableOpacity 
            style={styles.stylesModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowStylesModal(false)}
          />
          <View style={styles.stylesModalContainer}>
            <View style={styles.stylesModalHeader}>
              <Text style={styles.stylesModalTitle}>Image Styles</Text>
              <TouchableOpacity 
                style={styles.stylesModalClose}
                onPress={() => setShowStylesModal(false)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.stylesScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.stylesGrid}>
                {IMAGE_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style.value}
                    style={[
                      styles.styleItem,
                      selectedImageStyle?.value === style.value && styles.styleItemSelected
                    ]}
                                         onPress={() => {
                       setSelectedImageStyle(style);
                       setShowStylesModal(false);
                       
                       // Append style prompt to current input text
                       const currentText = inputText.trim();
                       let newMessage;
                       
                       if (currentText) {
                         // If there's existing text, prepend the style prompt with line breaks
                         newMessage = `${style.prompt}\n\n${currentText}`;
                       } else {
                         // If no existing text, just use the style prompt
                         newMessage = style.prompt;
                       }
                       
                       setInputText(newMessage);
                     }}
                  >
                    <View style={styles.styleImageContainer}>
                      <Image 
                        source={typeof style.imageUrl === 'string' ? { uri: style.imageUrl } : style.imageUrl}
                        style={styles.styleImage}
                        resizeMode="cover"
                      />
                      {selectedImageStyle?.value === style.value && (
                        <View style={styles.styleSelectedOverlay}>
                          <View style={styles.styleSelectedIcon}>
                            <Text style={styles.styleSelectedCheckmark}>✓</Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <Text style={styles.styleItemText} numberOfLines={2}>
                      {style.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
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
  loadingPhotosContainer: {
    width: 120,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    gap: 4,
  },
  loadingPhotosText: {
    color: '#8b5cf6',
    fontSize: 11,
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
  selectedToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stylesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  stylesChipText: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '500',
  },
  stylesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stylesModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stylesModalContainer: {
    backgroundColor: '#161618',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  stylesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  stylesModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  stylesModalClose: {
    padding: 4,
  },
  stylesScrollView: {
    maxHeight: 400,
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
    justifyContent: 'space-between',
  },
  styleItem: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
  },
  styleItemSelected: {
    transform: [{ scale: 0.95 }],
  },
  styleImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  styleImage: {
    width: '100%',
    height: '100%',
  },
  styleSelectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(147, 51, 234, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleSelectedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleSelectedCheckmark: {
    color: '#9333ea',
    fontSize: 14,
    fontWeight: 'bold',
  },
  styleItemText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
}); 