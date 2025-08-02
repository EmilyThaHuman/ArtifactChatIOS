import React, { useState, useCallback, useEffect } from 'react';
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
  Moon,
  Sun,
  Monitor,
  Globe,
  Bell,
  Smartphone,
  Save,
  Loader2,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface PreferenceSettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function PreferenceSettings({ user, onClose }: PreferenceSettingsProps) {
  const [preferences, setPreferences] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    notifications: {
      push: true,
      email: true,
      marketing: false,
    },
    accessibility: {
      reduceMotion: false,
      highContrast: false,
      largeText: false,
    },
    privacy: {
      analytics: true,
      crashReports: true,
    },
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      if (profile?.settings?.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...profile.settings.preferences,
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handlePreferenceChange = useCallback((section: string, key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value,
      },
    }));
    setIsDirty(true);
  }, []);

  const handleThemeChange = useCallback((theme: 'light' | 'dark' | 'system') => {
    setPreferences(prev => ({
      ...prev,
      theme,
    }));
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    if (!isDirty || !user?.id) return;

    setIsSaving(true);
    try {
      // Get current settings
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      const currentSettings = currentProfile?.settings || {};

      // Update preferences
      const settingsUpdate = {
        ...currentSettings,
        preferences: preferences,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          settings: settingsUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsDirty(false);
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const renderThemeOption = (theme: 'light' | 'dark' | 'system', label: string, icon: React.ReactNode) => (
    <TouchableOpacity
      key={theme}
      style={[
        styles.themeOption,
        preferences.theme === theme && styles.themeOptionSelected
      ]}
      onPress={() => handleThemeChange(theme)}
    >
      <View style={styles.themeIconContainer}>
        {icon}
      </View>
      <Text style={[
        styles.themeOptionText,
        preferences.theme === theme && styles.themeOptionTextSelected
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderLanguageOption = (code: string, label: string) => (
    <TouchableOpacity
      key={code}
      style={[
        styles.languageOption,
        preferences.language === code && styles.languageOptionSelected
      ]}
      onPress={() => handlePreferenceChange('', 'language', code)}
    >
      <Text style={[
        styles.languageOptionText,
        preferences.language === code && styles.languageOptionTextSelected
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.sectionDescription}>
          Choose how Artifact looks on this device
        </Text>
        
        <View style={styles.themeContainer}>
          {renderThemeOption('light', 'Light', <Sun size={20} color="#9ca3af" />)}
          {renderThemeOption('dark', 'Dark', <Moon size={20} color="#9ca3af" />)}
          {renderThemeOption('system', 'System', <Monitor size={20} color="#9ca3af" />)}
        </View>
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <Text style={styles.sectionDescription}>
          Choose your preferred language
        </Text>
        
        <View style={styles.languageContainer}>
          {renderLanguageOption('en', 'English')}
          {renderLanguageOption('es', 'Spanish')}
          {renderLanguageOption('fr', 'French')}
          {renderLanguageOption('de', 'German')}
          {renderLanguageOption('zh', 'Chinese')}
          {renderLanguageOption('ja', 'Japanese')}
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionDescription}>
          Manage your notification preferences
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive push notifications on this device
            </Text>
          </View>
          <Switch
            value={preferences.notifications.push}
            onValueChange={(value) => handlePreferenceChange('notifications', 'push', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Email Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive notifications via email
            </Text>
          </View>
          <Switch
            value={preferences.notifications.email}
            onValueChange={(value) => handlePreferenceChange('notifications', 'email', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Marketing Communications</Text>
            <Text style={styles.settingDescription}>
              Receive product updates and tips
            </Text>
          </View>
          <Switch
            value={preferences.notifications.marketing}
            onValueChange={(value) => handlePreferenceChange('notifications', 'marketing', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Accessibility Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessibility</Text>
        <Text style={styles.sectionDescription}>
          Customize Artifact for your accessibility needs
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Reduce Motion</Text>
            <Text style={styles.settingDescription}>
              Minimize animations and transitions
            </Text>
          </View>
          <Switch
            value={preferences.accessibility.reduceMotion}
            onValueChange={(value) => handlePreferenceChange('accessibility', 'reduceMotion', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>High Contrast</Text>
            <Text style={styles.settingDescription}>
              Increase contrast for better visibility
            </Text>
          </View>
          <Switch
            value={preferences.accessibility.highContrast}
            onValueChange={(value) => handlePreferenceChange('accessibility', 'highContrast', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Large Text</Text>
            <Text style={styles.settingDescription}>
              Use larger text throughout the app
            </Text>
          </View>
          <Switch
            value={preferences.accessibility.largeText}
            onValueChange={(value) => handlePreferenceChange('accessibility', 'largeText', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Data</Text>
        <Text style={styles.sectionDescription}>
          Control how your data is used to improve Artifact
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Analytics</Text>
            <Text style={styles.settingDescription}>
              Help improve Artifact by sharing usage data
            </Text>
          </View>
          <Switch
            value={preferences.privacy.analytics}
            onValueChange={(value) => handlePreferenceChange('privacy', 'analytics', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Crash Reports</Text>
            <Text style={styles.settingDescription}>
              Automatically send crash reports to help fix bugs
            </Text>
          </View>
          <Switch
            value={preferences.privacy.crashReports}
            onValueChange={(value) => handlePreferenceChange('privacy', 'crashReports', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Save Button */}
      {isDirty && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 size={18} color="#ffffff" />
            ) : (
              <Save size={18} color="#ffffff" />
            )}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  themeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  themeOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  themeIconContainer: {
    marginBottom: 8,
  },
  themeOptionText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  themeOptionTextSelected: {
    color: '#ffffff',
  },
  languageContainer: {
    gap: 8,
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  languageOptionText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  languageOptionTextSelected: {
    color: '#ffffff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
  saveContainer: {
    padding: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});