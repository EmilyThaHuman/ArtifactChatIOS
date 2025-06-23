import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/constants/Colors';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  gradient?: readonly [string, string, ...string[]];
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
}

export default function GradientButton({
  title,
  onPress,
  gradient = Gradients.primary,
  disabled = false,
  style,
  textStyle,
  size = 'medium'
}: GradientButtonProps) {
  const buttonStyle = [
    styles.button,
    styles[`${size}Button`],
    style,
    disabled && styles.disabled
  ];

  const textStyleCombined = [
    styles.text,
    styles[`${size}Text`],
    textStyle,
    disabled && styles.disabledText
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? [Colors.textTertiary, Colors.textTertiary] as const : gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { borderRadius: size === 'small' ? 8 : size === 'large' ? 16 : 12 }]}
      >
        <Text style={textStyleCombined}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  smallButton: {
    height: 36,
  },
  mediumButton: {
    height: 48,
  },
  largeButton: {
    height: 56,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  text: {
    color: Colors.textLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: Colors.textTertiary,
  },
});