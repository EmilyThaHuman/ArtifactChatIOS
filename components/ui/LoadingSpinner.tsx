import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  Easing 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/constants/Colors';

interface LoadingSpinnerProps {
  size?: number;
  gradient?: readonly [string, string, ...string[]];
}

export default function LoadingSpinner({ 
  size = 24, 
  gradient = Gradients.primary 
}: LoadingSpinnerProps) {
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  }, [rotation]);

  return (
    <View style={styles.container}>
      <Animated.View style={[animatedStyle, { width: size, height: size }]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.spinner, { borderRadius: size / 2 }]}
        />
        <View style={[styles.innerCircle, { 
          width: size - 4, 
          height: size - 4, 
          borderRadius: (size - 4) / 2,
          top: 2,
          left: 2
        }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    position: 'absolute',
  },
  innerCircle: {
    position: 'absolute',
    backgroundColor: Colors.background,
  },
});