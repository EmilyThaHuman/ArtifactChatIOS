import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/constants/Colors';

interface ArtifactLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon' | 'text';
  showTagline?: boolean;
  style?: any;
}

export default function ArtifactLogo({ 
  size = 'medium', 
  variant = 'full',
  showTagline = false,
  style
}: ArtifactLogoProps) {
  const getSizes = () => {
    switch (size) {
      case 'small':
        return { logo: 24, text: 16, tagline: 12 };
      case 'large':
        return { logo: 64, text: 32, tagline: 16 };
      default:
        return { logo: 40, text: 24, tagline: 14 };
    }
  };

  const sizes = getSizes();

  if (variant === 'icon') {
    return (
      <View style={[styles.container, { width: sizes.logo, height: sizes.logo }, style]}>
        <Image
          source={require('../../assets/images/artifact-transparent-01.webp')}
          style={[styles.logoImage, { width: sizes.logo, height: sizes.logo }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (variant === 'text') {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.logoText, { fontSize: sizes.text }]}>
          Artifact Intelligence
        </Text>
        {showTagline && (
          <Text style={[styles.tagline, { fontSize: sizes.tagline }]}>
            Unified AI Workspace & Team Collaboration Platform
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.fullLogo}>
        <Image
          source={require('../../assets/images/artifact-transparent-01.webp')}
          style={[styles.logoImage, { width: sizes.logo, height: sizes.logo }]}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <Text style={[styles.logoText, { fontSize: sizes.text }]}>
            Artifact Intelligence
          </Text>
          {showTagline && (
            <Text style={[styles.tagline, { fontSize: sizes.tagline }]}>
              Unified AI Workspace & Team Collaboration Platform
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  fullLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    borderRadius: 8,
  },
  iconContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconText: {
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  logoText: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  tagline: {
    color: Colors.textSecondary,
    fontWeight: '500',
    lineHeight: 16,
  },
}); 