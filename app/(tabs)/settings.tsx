import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Bell, 
  Moon, 
  Globe, 
  Download, 
  Shield, 
  HelpCircle, 
  ChevronRight,
  Palette
} from 'lucide-react-native';
import { Colors, Gradients } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import GlassContainer from '@/components/ui/GlassContainer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UserSettings {
  profile: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  system: {
    notifications: boolean;
    autoSync: boolean;
  };
  personalization: {
    defaultWorkspace: string | null;
    contentView: 'grid' | 'list';
  };
}

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Failed to get user data');
        return;
      }
      
      setUser(user);

      // Get user settings from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();
      
      if (profileData?.settings) {
        setSettings(profileData.settings);
      } else {
        // Default settings
        const defaultSettings: UserSettings = {
          profile: {
            theme: 'system',
            language: 'en',
          },
          system: {
            notifications: true,
            autoSync: true,
          },
          personalization: {
            defaultWorkspace: null,
            contentView: 'list',
          },
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: UserSettings) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        Alert.alert('Error', 'Failed to update settings');
      } else {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const toggleNotifications = (value: boolean) => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      system: {
        ...settings.system,
        notifications: value,
      },
    };
    updateSettings(newSettings);
  };

  const toggleAutoSync = (value: boolean) => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      system: {
        ...settings.system,
        autoSync: value,
      },
    };
    updateSettings(newSettings);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient colors={Gradients.accent} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Customize your Artifact Intelligence experience
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    onPress: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassContainer style={styles.settingItem}>
        <View style={styles.settingContent}>
          <View style={styles.settingIcon}>
            {icon}
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{title}</Text>
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.settingRight}>
            {rightElement || <ChevronRight size={20} color={Colors.textSecondary} />}
          </View>
        </View>
      </GlassContainer>
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSection('Appearance', (
          <>
            {renderSettingItem(
              <Palette size={20} color={Colors.primary} />,
              'Theme',
              'Choose your preferred app theme',
              () => Alert.alert('Theme', 'Theme selection coming soon!'),
              <Text style={styles.settingValue}>
                {settings?.profile.theme === 'system' ? 'System' : 
                 settings?.profile.theme === 'dark' ? 'Dark' : 'Light'}
              </Text>
            )}
            {renderSettingItem(
              <Globe size={20} color={Colors.accent} />,
              'Language',
              'Select your preferred language',
              () => Alert.alert('Language', 'Language selection coming soon!'),
              <Text style={styles.settingValue}>English</Text>
            )}
          </>
        ))}

        {renderSection('Notifications', (
          <>
            {renderSettingItem(
              <Bell size={20} color={Colors.warning} />,
              'Push Notifications',
              'Receive notifications for updates',
              () => {},
              <Switch
                value={settings?.system.notifications || false}
                onValueChange={toggleNotifications}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.background}
              />
            )}
          </>
        ))}

        {renderSection('Sync & Storage', (
          <>
            {renderSettingItem(
              <Download size={20} color={Colors.success} />,
              'Auto Sync',
              'Automatically sync your content',
              () => {},
              <Switch
                value={settings?.system.autoSync || false}
                onValueChange={toggleAutoSync}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.background}
              />
            )}
          </>
        ))}

        {renderSection('Privacy & Security', (
          <>
            {renderSettingItem(
              <Shield size={20} color={Colors.error} />,
              'Privacy Settings',
              'Manage your data and privacy preferences',
              () => Alert.alert('Privacy', 'Privacy settings coming soon!')
            )}
          </>
        ))}

        {renderSection('Support', (
          <>
            {renderSettingItem(
              <HelpCircle size={20} color={Colors.info} />,
              'Help & Support',
              'Get help or contact support',
              () => Alert.alert('Support', 'Help center coming soon!')
            )}
          </>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Artifact Intelligence v1.0.0
          </Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ for AI productivity
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  settingItem: {
    marginBottom: 8,
    padding: 16,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});