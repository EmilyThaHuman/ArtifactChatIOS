import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

interface SourcesAvatarsSkeletonProps {
  style?: any;
  maxCircles?: number;
}

// Helper function to get random gradient colors
const getRandomGradient = (index: number): { backgroundColor: string } => {
  const gradients = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
  ];
  
  return {
    backgroundColor: gradients[index % gradients.length],
  };
};

const SourcesAvatarsSkeleton = memo(function SourcesAvatarsSkeleton({
  style,
  maxCircles = 7,
}: SourcesAvatarsSkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Generate 3-5 skeleton circles randomly
  const circleCount = Math.floor(Math.random() * 3) + 3; // 3-5 circles
  const circles = Array.from({ length: Math.min(circleCount, maxCircles) }, (_, index) => index);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.avatarsContainer}>
        {circles.map((index) => {
          const gradientStyle = getRandomGradient(index);
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.avatar,
                gradientStyle,
                { opacity },
                index > 0 && styles.avatarOverlap,
              ]}
            >
              <View style={styles.skeletonContent} />
            </Animated.View>
          );
        })}
      </View>
      
      <Animated.View style={[styles.textSkeleton, { opacity }]}>
        <View style={styles.skeletonText} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  skeletonContent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  textSkeleton: {
    justifyContent: 'center',
  },
  skeletonText: {
    width: 60,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb', // gray-200
  },
});

export default SourcesAvatarsSkeleton; 