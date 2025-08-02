import React, { memo, useEffect, useRef, useState } from 'react';
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

// Helper function to get gradient colors matching web app
const getGradientColors = (index: number): { backgroundColor: string } => {
  const gradients = [
    '#f97316', // orange-500
    '#3b82f6', // blue-500  
    '#a855f7', // purple-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
  ];
  
  // Use deterministic color selection like web app
  return {
    backgroundColor: gradients[(index * 3 + 7) % gradients.length],
  };
};

const SourcesAvatarsSkeleton = memo(function SourcesAvatarsSkeleton({
  style,
  maxCircles = 7,
}: SourcesAvatarsSkeletonProps) {
  const [visibleCircles, setVisibleCircles] = useState(1);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const textShimmer = useRef(new Animated.Value(0)).current;

  // Progressive circle animation matching web app
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCircles((prev) => (prev >= maxCircles ? 1 : prev + 1));
    }, 800); // Add a new circle every 800ms

    return () => {
      clearInterval(interval);
    };
  }, [maxCircles]);

  useEffect(() => {
    // Pulse animation for circles
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer animation for text
    const shimmerAnimation = Animated.loop(
      Animated.timing(textShimmer, {
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
  }, [animatedValue, textShimmer]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const textOpacity = textShimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1, 0.5],
  });

  // Generate circles based on visible count
  const circles = Array.from({ length: visibleCircles }, (_, index) => index);

  return (
    <View style={[styles.container, style]}>
      <Animated.Text style={[styles.searchingText, { opacity: textOpacity }]}>
        Searching the web
      </Animated.Text>
      <View style={styles.avatarsContainer}>
        {circles.map((index) => {
          const gradientStyle = getGradientColors(index);
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.avatar,
                gradientStyle,
                { 
                  opacity,
                  zIndex: visibleCircles - index,
                },
                index > 0 && styles.avatarOverlap,
              ]}
            >
              <Animated.View 
                style={[
                  styles.skeletonContent,
                  { opacity: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  })}
                ]} 
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 12,
    height: 32,
  },
  searchingText: {
    fontSize: 14,
    color: '#9ca3af', // text-muted-foreground
    fontWeight: '400',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarOverlap: {
    marginLeft: -16, // More overlap like web app
  },
  skeletonContent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default SourcesAvatarsSkeleton; 