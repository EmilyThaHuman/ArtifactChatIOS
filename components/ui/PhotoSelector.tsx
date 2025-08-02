import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RecentPhoto {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
}

interface PhotoSelectorProps {
  onPhotoSelect: (photo: RecentPhoto) => void;
  onCameraPress: () => void;
  onShowAllPress: () => void;
  maxPhotos?: number;
}

const PhotoSelector: React.FC<PhotoSelectorProps> = ({
  onPhotoSelect,
  onCameraPress,
  onShowAllPress,
  maxPhotos = 8,
}) => {
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  useEffect(() => {
    loadRecentPhotos();
  }, []);

  const loadRecentPhotos = async () => {
    try {
      setLoadingPhotos(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('📸 Media library permission not granted');
        Alert.alert(
          'Permission Required',
          'Photo library access is required to show recent photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('📸 Fetching recent photos...');
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: maxPhotos,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      // Process photos with enhanced URI handling for iOS ph:// format
      const photos: RecentPhoto[] = [];
      
      for (const asset of assets.assets) {
        try {
          // For iOS ph:// URIs, we need to get asset info to get a usable URI
          if (asset.uri.startsWith('ph://')) {
            console.log('📸 Processing ph:// URI for asset:', asset.id);
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
            
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

      console.log('📸 Successfully processed photos:', photos.length);
      setRecentPhotos(photos);
    } catch (error) {
      console.error('📸 Error loading recent photos:', error);
      setRecentPhotos([]);
      
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

  const handlePhotoPress = (photo: RecentPhoto) => {
    setSelectedPhotoId(photo.id);
    onPhotoSelect(photo);
    
    // Clear selection after a brief delay for visual feedback
    setTimeout(() => {
      setSelectedPhotoId(null);
    }, 200);
  };

  const renderPhotoItem = (photo: RecentPhoto, index: number) => {
    const isSelected = selectedPhotoId === photo.id;
    const imageSize = 64; // Fixed size for horizontal row

    return (
      <TouchableOpacity
        key={photo.id}
        style={[
          styles.photoItem,
          { width: imageSize, height: imageSize },
          isSelected && styles.selectedPhoto
        ]}
        onPress={() => handlePhotoPress(photo)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: photo.uri }}
          style={styles.photoImage}
          resizeMode="cover"
        />
        
        {/* Circular overlay indicator */}
        <View style={styles.circleOverlay}>
          <View style={[
            styles.circle,
            isSelected && styles.selectedCircle
          ]} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderCameraButton = () => {
    const imageSize = 64; // Fixed size for horizontal row

    return (
      <TouchableOpacity
        style={[
          styles.cameraButton,
          { width: imageSize, height: imageSize }
        ]}
        onPress={onCameraPress}
        activeOpacity={0.7}
      >
        <Camera size={24} color="#666666" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
        <TouchableOpacity
          style={styles.showAllButton}
          onPress={onShowAllPress}
          activeOpacity={0.7}
        >
          <Text style={styles.showAllText}>Show All</Text>
        </TouchableOpacity>
      </View>

      {/* Photos Row */}
      {loadingPhotos ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666666" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScrollView}
          contentContainerStyle={styles.photosContent}
        >
          {/* Camera button as first item */}
          {renderCameraButton()}
          
          {/* Recent photos */}
          {recentPhotos.slice(0, maxPhotos - 1).map((photo, index) => 
            renderPhotoItem(photo, index)
          )}
          
          {/* Show message if no photos */}
          {recentPhotos.length === 0 && !loadingPhotos && (
            <View style={styles.noPhotosContainer}>
              <Text style={styles.noPhotosText}>No recent photos</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  showAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  showAllText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666666',
    fontSize: 14,
  },
  photosScrollView: {
    flexDirection: 'row',
  },
  photosContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  photoItem: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 8,
  },
  selectedPhoto: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  circleOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'transparent',
  },
  selectedCircle: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  cameraButton: {
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(102, 102, 102, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  noPhotosContainer: {
    width: 120,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  noPhotosText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PhotoSelector;