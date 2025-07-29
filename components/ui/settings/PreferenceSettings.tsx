import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Sliders } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface PreferenceSettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function PreferenceSettings({ user, onClose }: PreferenceSettingsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Preferences</Text>
        <Text style={styles.sectionDescription}>
          Configure your preferred AI models and providers
        </Text>
        
        <TouchableOpacity style={styles.button} disabled>
          <Sliders size={16} color={Colors.gray400} />
          <Text style={styles.disabledText}>Model preferences coming soon</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interface Settings</Text>
        <Text style={styles.sectionDescription}>
          Customize your app interface and behavior
        </Text>
        
        <TouchableOpacity style={styles.button} disabled>
          <Text style={styles.disabledText}>Interface settings coming soon</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray400,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    gap: 8,
    opacity: 0.5,
  },
  disabledText: {
    fontSize: 14,
    color: Colors.gray400,
  },
});