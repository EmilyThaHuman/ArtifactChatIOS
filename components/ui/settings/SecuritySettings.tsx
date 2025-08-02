import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import {
  Shield,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Lock,
  UserX,
} from 'lucide-react-native';

interface SecuritySettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function SecuritySettings({ user, onClose }: SecuritySettingsProps) {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    biometricEnabled: true,
    sessionTimeout: 30,
    loginNotifications: true,
  });

  const handleToggle = useCallback((setting: string, value: boolean) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  }, []);

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'This feature will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleSetupTwoFactor = () => {
    Alert.alert(
      'Two-Factor Authentication',
      'This feature will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Logout All Devices',
      'Are you sure you want to logout from all devices? You will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout All', style: 'destructive' },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Password Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Password & Authentication</Text>
        <Text style={styles.sectionDescription}>
          Manage your password and authentication methods
        </Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
          <Key size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      {/* Two-Factor Authentication */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
            <Text style={styles.settingDescription}>
              Add an extra layer of security to your account
            </Text>
          </View>
          <Switch
            value={securitySettings.twoFactorEnabled}
            onValueChange={(value) => handleToggle('twoFactorEnabled', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        {securitySettings.twoFactorEnabled && (
          <TouchableOpacity style={styles.subActionButton} onPress={handleSetupTwoFactor}>
            <Smartphone size={18} color="#3b82f6" />
            <Text style={styles.subActionButtonText}>Setup Authenticator App</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Biometric Authentication */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Biometric Authentication</Text>
            <Text style={styles.settingDescription}>
              Use Face ID or Touch ID to secure your account
            </Text>
          </View>
          <Switch
            value={securitySettings.biometricEnabled}
            onValueChange={(value) => handleToggle('biometricEnabled', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Login Notifications */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Login Notifications</Text>
            <Text style={styles.settingDescription}>
              Get notified when someone signs into your account
            </Text>
          </View>
          <Switch
            value={securitySettings.loginNotifications}
            onValueChange={(value) => handleToggle('loginNotifications', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Session Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Management</Text>
        <Text style={styles.sectionDescription}>
          Control your active sessions and security
        </Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleLogoutAllDevices}>
          <UserX size={20} color="#ef4444" />
          <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
            Logout All Devices
          </Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Controls</Text>
        <Text style={styles.sectionDescription}>
          Manage your privacy and data visibility
        </Text>
        
        <View style={styles.privacyInfo}>
          <Shield size={24} color="#3b82f6" />
          <View style={styles.privacyText}>
            <Text style={styles.privacyTitle}>Your data is secure</Text>
            <Text style={styles.privacyDescription}>
              We use industry-standard encryption to protect your conversations and data.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  subActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 8,
    marginTop: 12,
  },
  subActionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3b82f6',
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
});