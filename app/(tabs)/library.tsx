import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, Share, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const imageSize = (screenWidth - 32) / 2 - 8; // 2 columns with padding

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  threadId: string;
  threadTitle: string;
  messageId: string;
  createdAt: string;
  toolName: string;
  imageName?: string;
  imageSize?: string;
  imageModel?: string;
  imageProvider?: string;
}

export default function LibraryScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [deletingImages, setDeletingImages] = useState(new Set<string>());
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all user threads and their images using the efficient SQL function
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[LibraryScreen] Starting to fetch threads and images');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[LibraryScreen] No authenticated user');
        setGeneratedImages([]);
        return;
      }

      // First fetch all threads
      const { data: threads, error: threadsError } = await supabase
        .from('threads')
        .select('id, title')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (threadsError) {
        console.error('[LibraryScreen] Error fetching threads:', threadsError);
        setGeneratedImages([]);
        return;
      }

      if (!threads || threads.length === 0) {
        console.log('[LibraryScreen] No threads found');
        setGeneratedImages([]);
        return;
      }

      console.log(`[LibraryScreen] Fetched ${threads.length} threads`);

      // Get all thread IDs
      const threadIds = threads.map((thread) => thread.id).filter(Boolean);

      // Use the efficient SQL function to get all image data
      const { data: imageData, error } = await supabase.rpc(
        'get_user_images_by_threads',
        {
          thread_ids: threadIds,
        }
      );

      if (error) {
        console.error('[LibraryScreen] Error calling get_user_images_by_threads:', error);
        setGeneratedImages([]);
        return;
      }

      console.log(`[LibraryScreen] Retrieved ${imageData?.length || 0} images from SQL function`);

      // Transform the SQL function results to match our expected format
      const transformedImages = (imageData || []).map((row: any) => {
        return {
          id: `${row.message_id}-${row.tool_call_id}`,
          url: row.image_url,
          prompt: row.image_prompt || 'Generated Image',
          toolName: 'image_gen',
          createdAt: row.created_at,
          threadId: row.thread_id,
          threadTitle: threads.find((t) => t.id === row.thread_id)?.title || 'Untitled Chat',
          messageId: row.message_id,
          // Additional data from the SQL function
          imageName: row.image_name,
          imageSize: row.image_size,
          imageModel: row.image_model,
          imageProvider: row.image_provider,
        };
      });

      // Sort by creation date (newest first)
      const sortedImages = transformedImages.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(`[LibraryScreen] Processed ${sortedImages.length} images`);
      setGeneratedImages(sortedImages);
    } catch (error) {
      console.error('[LibraryScreen] Error fetching images:', error);
      setGeneratedImages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadImages();
    setRefreshing(false);
  }, [loadImages]);

  // Handle image deletion
  const handleImageDelete = useCallback(
    async (imageId: string, messageId: string) => {
      if (deletingImages.has(imageId)) return;

      setDeletingImages((prev) => new Set(prev).add(imageId));

      try {
        console.log('[LibraryScreen] Deleting image:', imageId, 'from message:', messageId);

        // Update the database to set tool_calls to empty array
        const { error } = await supabase
          .from('thread_messages')
          .update({ tool_calls: [] })
          .eq('message_id', messageId);

        if (error) {
          console.error('[LibraryScreen] Error deleting image:', error);
          throw error;
        }

        // Update local state by removing the image
        setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId));

        // Close carousel if the current image was deleted
        if (carouselOpen) {
          const currentImage = generatedImages[currentImageIndex];
          if (currentImage && currentImage.id === imageId) {
            setCarouselOpen(false);
          }
        }

        console.log('[LibraryScreen] Successfully deleted image with ID:', imageId);
      } catch (error) {
        console.error('[LibraryScreen] Failed to delete image:', error);
        Alert.alert('Error', 'Failed to delete image. Please try again.');
      } finally {
        setDeletingImages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
      }
    },
    [deletingImages, carouselOpen, currentImageIndex, generatedImages]
  );

  // Handle download
  const handleDownload = async (imageUrl: string, filename?: string) => {
    try {
      const downloadFilename = filename || `generated-image-${Date.now()}.png`;
      const fileUri = FileSystem.documentDirectory + downloadFilename;
      
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('Success', 'Image saved to device');
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('[LibraryScreen] Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image. Please try again.');
    }
  };

  // Handle share
  const handleShare = async (image: GeneratedImage) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(image.url, {
          mimeType: 'image/png',
          dialogTitle: `Share: ${image.prompt}`,
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('[LibraryScreen] Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    }
  };

  // Handle image click to open carousel
  const handleImageClick = (imageIndex: number) => {
    setCurrentImageIndex(imageIndex);
    setCarouselOpen(true);
  };

  // Handle carousel navigation
  const handlePrevImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex((prev) =>
      prev === 0 ? generatedImages.length - 1 : prev - 1
    );
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleNextImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex((prev) =>
      prev === generatedImages.length - 1 ? 0 : prev + 1
    );
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const renderImageItem = ({ item, index }: { item: GeneratedImage; index: number }) => (
    <TouchableOpacity
      style={styles.imageContainer}
      onPress={() => handleImageClick(index)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      
      {/* Delete button - appears in top right corner */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleImageDelete(item.id, item.messageId)}
        disabled={deletingImages.has(item.id)}
      >
        {deletingImages.has(item.id) ? (
          <ActivityIndicator size="small" color={Colors.textLight} />
        ) : (
          <X size={16} color={Colors.textLight} />
        )}
      </TouchableOpacity>

      {/* Action buttons - appear at bottom */}
      <View style={styles.imageActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            const filename = `${item.prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${item.id}.png`;
            handleDownload(item.url, filename);
          }}
        >
          <Download size={16} color={Colors.textLight} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShare(item)}
        >
          <Share size={16} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCarousel = () => {
    if (!carouselOpen || generatedImages.length === 0) return null;

    const currentImage = generatedImages[currentImageIndex];

    return (
      <Modal
        visible={carouselOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCarouselOpen(false)}
      >
        <View style={styles.carouselContainer}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.9)']}
            style={styles.carouselOverlay}
          >
            {/* Header */}
            <View style={styles.carouselHeader}>
              <TouchableOpacity
                style={styles.carouselCloseButton}
                onPress={() => setCarouselOpen(false)}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
              
              <View style={styles.carouselTitleContainer}>
                <Text style={styles.carouselTitle} numberOfLines={2}>
                  {currentImage?.prompt?.split(' ').slice(0, 10).join(' ')}
                  {currentImage?.prompt?.split(' ').length > 10 ? '...' : ''}
                </Text>
                <Text style={styles.carouselDate}>
                  {new Date(currentImage?.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.carouselActions}>
                <TouchableOpacity
                  style={styles.carouselActionButton}
                  onPress={() => {
                    const filename = `${currentImage?.prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${currentImage?.id}.png`;
                    handleDownload(currentImage?.url, filename);
                  }}
                >
                  <Download size={20} color={Colors.textLight} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.carouselActionButton}
                  onPress={() => handleShare(currentImage)}
                >
                  <Share size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Image Container */}
            <View style={styles.carouselImageContainer}>
              <Image
                source={{ uri: currentImage?.url }}
                style={styles.carouselImage}
                contentFit="contain"
                transition={200}
              />

              {/* Navigation Buttons */}
              {generatedImages.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.carouselNavButton, styles.carouselNavLeft]}
                    onPress={handlePrevImage}
                    disabled={isTransitioning}
                  >
                    <ChevronLeft size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.carouselNavButton, styles.carouselNavRight]}
                    onPress={handleNextImage}
                    disabled={isTransitioning}
                  >
                    <ChevronRight size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Bottom Controls */}
            <View style={styles.carouselBottom}>
              <Text style={styles.carouselCounter}>
                {currentImageIndex + 1} of {generatedImages.length}
              </Text>
              
              {/* Dot Indicators */}
              {generatedImages.length > 1 && generatedImages.length <= 10 && (
                <View style={styles.carouselDots}>
                  {generatedImages.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.carouselDot,
                        index === currentImageIndex && styles.carouselDotActive,
                      ]}
                      onPress={() => {
                        if (index !== currentImageIndex && !isTransitioning) {
                          setIsTransitioning(true);
                          setCurrentImageIndex(index);
                          setTimeout(() => setIsTransitioning(false), 300);
                        }
                      }}
                      disabled={isTransitioning}
                    />
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={styles.loadingText}>Loading your images...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (generatedImages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No images generated yet</Text>
          <Text style={styles.emptySubtitle}>
            Start generating images in your chats and they'll appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={generatedImages}
        renderItem={renderImageItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />
      {renderCarousel()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  grid: {
    padding: 16,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    marginRight: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageActions: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.9,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Carousel Styles
  carouselContainer: {
    flex: 1,
  },
  carouselOverlay: {
    flex: 1,
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  carouselCloseButton: {
    padding: 8,
  },
  carouselTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 4,
  },
  carouselDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  carouselActions: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselActionButton: {
    padding: 8,
  },
  carouselImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  carouselImage: {
    width: screenWidth - 32,
    height: screenHeight * 0.6,
    maxWidth: screenWidth - 32,
    maxHeight: screenHeight * 0.6,
  },
  carouselNavButton: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  carouselNavLeft: {
    left: 16,
  },
  carouselNavRight: {
    right: 16,
  },
  carouselBottom: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  carouselCounter: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  carouselDots: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  carouselDotActive: {
    backgroundColor: Colors.textLight,
    transform: [{ scale: 1.25 }],
  },
}); 