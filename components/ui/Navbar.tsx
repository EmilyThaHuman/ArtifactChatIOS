import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import ArtifactLogo from './ArtifactLogo';

interface NavbarProps {
  title: string;
  onMenuPress: () => void;
  showLogo?: boolean;
}

export default function Navbar({ title, onMenuPress, showLogo = false }: NavbarProps) {
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.navbar}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            activeOpacity={0.7}
          >
            <Menu size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            {showLogo ? (
              <ArtifactLogo size="small" variant="full" />
            ) : (
              <Text style={styles.title}>{title}</Text>
            )}
          </View>
          
          {/* Right side spacer to balance the layout */}
          <View style={styles.rightSpacer} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161618', // Match main chat background
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: '#161618',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  rightSpacer: {
    width: 44,
  },
}); 