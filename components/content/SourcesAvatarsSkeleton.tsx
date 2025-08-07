import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SourcesAvatarsSkeletonProps {
  style?: any;
  maxCircles?: number;
}

// Helper function to get gradient colors matching web app exactly
const getGradientColors = (index: number): string[] => {
  const gradients = [
    ['#f472b6', '#f87171', '#fbbf24'], // pink-400 via red-400 to yellow-300
    ['#60a5fa', '#06b6d4', '#4ade80'], // blue-400 via cyan-400 to green-300
    ['#a78bfa', '#e879f9', '#f9a8d4'], // purple-400 via fuchsia-400 to pink-300
    ['#fb923c', '#facc15', '#a3e635'], // orange-400 via yellow-400 to lime-300
    ['#818cf8', '#60a5fa', '#0ea5e9'], // indigo-400 via blue-400 to sky-300
    ['#2dd4bf', '#34d399', '#4ade80'], // teal-400 via emerald-400 to green-300
    ['#fb7185', '#f472b6', '#e879f9'], // rose-400 via pink-400 to fuchsia-300
    ['#c084fc', '#a78bfa', '#818cf8'], // violet-400 via purple-400 to indigo-300
  ];
  
  // Use deterministic color selection like web app
  return gradients[(index * 3 + 7) % gradients.length];
};

// AnimatedShinyText component matching web app
const AnimatedShinyText = memo(function AnimatedShinyText({ 
  children, 
  style 
}: { 
  children: React.ReactNode;
  style?: any;
}) {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false, // We need to animate opacity which doesn't support native driver
      })
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [shimmerValue]);

  const shimmerOpacity = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  return (
    <Animated.Text style={[
      {
        fontSize: 14,
        color: '#9ca3af', // text-muted-foreground
        fontWeight: '400',
        opacity: shimmerOpacity,
      },
      style
    ]}>
      {children}
    </Animated.Text>
  );
});

const SourcesAvatarsSkeleton = memo(function SourcesAvatarsSkeleton({
  style,
  maxCircles = 7,
}: SourcesAvatarsSkeletonProps) {
  const [visibleCircles, setVisibleCircles] = useState(1);
  const animatedValue = useRef(new Animated.Value(0)).current;

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

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  // Generate circles based on visible count
  const circles = Array.from({ length: visibleCircles }, (_, index) => index);

  return (
    <View style={[styles.container, style]}>
      <AnimatedShinyText>
        Searching the web
      </AnimatedShinyText>
      <View style={styles.avatarsContainer}>
        {circles.map((index) => {
          const gradientColors = getGradientColors(index);
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.avatar,
                { 
                  opacity,
                  zIndex: visibleCircles - index,
                },
                index > 0 && styles.avatarOverlap,
              ]}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientCircle}
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
    justifyContent: 'flex-start', // Align to start of line
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 12,
    height: 32,
    alignSelf: 'flex-start', // Ensure container aligns to start
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
    overflow: 'hidden',
    position: 'relative',
  },
  avatarOverlap: {
    marginLeft: -16, // Overlap like web app (-space-x-4)
  },
  gradientCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

export default SourcesAvatarsSkeleton; 