import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';

interface ImageGridProps {
  images: Array<{
    id: string;
    url: string;
    title?: string;
  }>;
  onImagePress: (image: any) => void;
}

const { width } = Dimensions.get('window');
const numColumns = 2;
const imageSize = (width - 48) / numColumns; // 48 = padding + margins

export default function ImageGrid({ images, onImagePress }: ImageGridProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {images.map((image) => (
          <TouchableOpacity
            key={image.id}
            style={styles.imageContainer}
            onPress={() => onImagePress(image)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: image.url }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    shadowColor: Colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});