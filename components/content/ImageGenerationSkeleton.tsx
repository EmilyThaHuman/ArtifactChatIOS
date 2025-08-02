import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { OpenAIIcon } from '@/components/ui/OpenAIIcon';
import { Bot, Palette } from 'lucide-react-native';

interface ImageGenerationSkeletonProps {
  style?: any;
  toolName?: string;
}

const ImageGenerationSkeleton = memo(function ImageGenerationSkeleton({
  style,
  toolName,
}: ImageGenerationSkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the entire component
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer animation for the loading bar
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    shimmerAnimation.start();

    return () => {
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [pulseAnim, shimmerAnim]);

  // Determine display text based on tool name
  const getDisplayText = () => {
    if (toolName === 'image_edit' || toolName?.includes('image_edit')) {
      return 'Editing image';
    }
    return 'Generating image';
  };

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <Animated.View style={[styles.container, style, { opacity: pulseOpacity }]}>
      {/* Header with icon and text */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Palette size={18} color="#8b5cf6" />
        </View>
        <Text style={styles.loadingText}>{getDisplayText()}</Text>
      </View>

      {/* Image placeholder with shimmer effect */}
      <View style={styles.imagePlaceholder}>
        <View style={styles.imageFrame}>
          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
          />
          
          {/* Content skeleton */}
          <View style={styles.skeletonContent}>
            <Bot size={32} color="#6b7280" />
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    opacity: pulseOpacity,
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.2, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '500',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#374151',
    marginBottom: 12,
  },
  imageFrame: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 100,
  },
  skeletonContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  progressBar: {
    width: 120,
    height: 4,
    backgroundColor: '#4b5563',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8b5cf6',
  },
});

export default ImageGenerationSkeleton;