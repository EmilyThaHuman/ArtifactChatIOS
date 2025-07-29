import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Shield, Key, Smartphone } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface SecuritySettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function SecuritySettings({ user, onClose }: SecuritySettingsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
        <Text style={styles.sectionDescription}>
          Add an extra layer of security to your account
        </Text>
        
        <TouchableOpacity style={styles.button} disabled>
          <Smartphone size={16} color={Colors.gray400} />
          <Text style={styles.disabledText}>2FA setup coming soon</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backup Codes</Text>
        <Text style={styles.sectionDescription}>
          Generate backup codes for account recovery
        </Text>
        
        <TouchableOpacity style={styles.button} disabled>
          <Key size={16} color={Colors.gray400} />
          <Text style={styles.disabledText}>Backup codes coming soon</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Management</Text>
        <Text style={styles.sectionDescription}>
          Manage active sessions and devices
        </Text>
        
        <TouchableOpacity style={styles.button} disabled>
          <Shield size={16} color={Colors.gray400} />
          <Text style={styles.disabledText}>Session management coming soon</Text>
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