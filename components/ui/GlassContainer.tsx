import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
}

export default function GlassContainer({ 
  children, 
  style, 
  intensity = 20, 
  tint = 'light',
  borderRadius = 12 
}: GlassContainerProps) {
  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <BlurView 
        intensity={intensity} 
        tint={tint}
        style={[styles.blurView, { borderRadius }]}
      >
        <View style={[styles.content, { borderRadius }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.glassBackground,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  blurView: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});