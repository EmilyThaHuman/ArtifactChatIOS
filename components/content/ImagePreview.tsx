import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Download, Eye } from 'lucide-react-native';

interface ImagePreviewProps {
  imageData: {
    url: string;
    name?: string;
    prompt?: string;
    metadata?: any;
  };
  onImageClick?: (imageData: any) => void;
  className?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ImagePreview({ imageData, onImageClick, className }: ImagePreviewProps) {
  if (!imageData?.url) {
    return null;
  }

  const handleImagePress = () => {
    if (onImageClick) {
      onImageClick(imageData);
    }
  };

  const handleDownload = async () => {
    // TODO: Implement image download functionality
    console.log('Download image:', imageData.url);
  };

  return (
    <View style={styles.container}>
      {/* Image container */}
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={handleImagePress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: imageData.url }}
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Overlay with controls */}
        <View style={styles.overlay}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleImagePress}
          >
            <Eye size={16} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDownload}
          >
            <Download size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Image info */}
      {(imageData.name || imageData.prompt) && (
        <View style={styles.infoContainer}>
          {imageData.name && (
            <Text style={styles.imageName} numberOfLines={1}>
              {imageData.name}
            </Text>
          )}
          {imageData.prompt && (
            <Text style={styles.imagePrompt} numberOfLines={2}>
              {imageData.prompt}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    maxWidth: Math.min(screenWidth - 32, 400),
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: 12,
  },
  imageName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  imagePrompt: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
});