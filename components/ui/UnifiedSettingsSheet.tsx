import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Switch,
} from 'react-native';
import {
  X,
  Mail,
  Phone,
  CreditCard,
  Star,
  RotateCcw,
  Database,
  Shield,
  Settings,
  Globe,
  Mic,
  Palette,
  Smartphone,
  Type,
  LogOut,
  ChevronRight,
  ChevronLeft,
  User,
} from 'lucide-react-native';
import ProfileSettings from './settings/ProfileSettings';
import PersonalizationSettings from './settings/PersonalizationSettings';
import PreferenceSettings from './settings/PreferenceSettings';
import SecuritySettings from './settings/SecuritySettings';
import AccountSettings from './settings/AccountSettings';
import DataControls from './settings/DataControls';

const { width: screenWidth } = Dimensions.get('window');

interface UnifiedSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
  user?: any;
  onLogout?: () => void;
}

interface SettingsItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  type: 'info' | 'action' | 'navigation' | 'toggle';
  value?: string;
  component?: React.ComponentType<any>;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

// Settings items will be generated dynamically based on user data

type ScreenType = 'menu' | string;

export default function UnifiedSettingsSheet({
  isOpen,
  onClose,
  defaultTab = 'profile',
  user,
  onLogout,
}: UnifiedSettingsSheetProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('menu');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [toggleStates, setToggleStates] = useState({
    dictation: false,
    haptic: true,
    spelling: true,
  });

  // Reset to menu when sheet opens
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen('menu');
      slideAnim.setValue(0);
    }
  }, [isOpen, slideAnim]);

  // Navigate to specific screen if defaultTab is provided
  useEffect(() => {
    if (isOpen && defaultTab && defaultTab !== 'menu') {
      setTimeout(() => {
        handleItemPress(defaultTab);
      }, 100);
    }
  }, [isOpen, defaultTab]);

  const handleClose = useCallback(() => {
    setCurrentScreen('menu');
    slideAnim.setValue(0);
    onClose();
  }, [onClose, slideAnim]);

  const handleItemPress = useCallback((itemId: string) => {
    setCurrentScreen(itemId);
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleBackToMenu = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen('menu');
    });
  }, [slideAnim]);

  const handleLogoutPress = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            handleClose();
            onLogout?.();
          },
        },
      ]
    );
  }, [handleClose, onLogout]);

  const handleToggle = useCallback((itemId: string, value: boolean) => {
    setToggleStates(prev => ({ ...prev, [itemId]: value }));
  }, []);

  const renderMenuScreen = useCallback(() => {
    const displayEmail = user?.email || '';
    const displayPhone = user?.user_metadata?.phone || '';
    const displaySubscription = 'Artifact Free'; // TODO: Get from subscription data

    return (
      <View style={styles.screenContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <View style={styles.closeButtonCircle}>
              <X size={20} color="#d1d5db" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Account Info Section */}
          <View style={[styles.section, { paddingTop: 16 }]}>
            {displayEmail && (
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <Mail size={20} color="#ffffff" />
                  <Text style={styles.menuItemTitle}>Email</Text>
                </View>
                <Text style={styles.menuItemValue}>{displayEmail}</Text>
              </View>
            )}
            
            {displayPhone && (
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <Phone size={20} color="#ffffff" />
                  <Text style={styles.menuItemTitle}>Phone number</Text>
                </View>
                <Text style={styles.menuItemValue}>{displayPhone}</Text>
              </View>
            )}
            
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <CreditCard size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Subscription</Text>
              </View>
              <Text style={styles.menuItemValue}>{displaySubscription}</Text>
            </View>
            
            {displaySubscription === 'Artifact Free' && (
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <Star size={20} color="#ffffff" />
                  <Text style={styles.menuItemTitle}>Upgrade to Artifact Pro</Text>
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <RotateCcw size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Restore purchases</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Main Settings Navigation */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('profile')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <User size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Profile</Text>
              </View>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('account')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <CreditCard size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Account</Text>
              </View>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('personalization')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Palette size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Personalization</Text>
              </View>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('preferences')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Settings size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Preferences</Text>
              </View>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('data')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Database size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Data Controls</Text>
              </View>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('security')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Shield size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Security</Text>
              </View>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* App Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP</Text>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('preferences')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Globe size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>App Language</Text>
              </View>
              <View style={styles.menuItemRight}>
                <Text style={styles.menuItemValue}>English</Text>
                <ChevronRight size={16} color="#6b7280" />
              </View>
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Mic size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Auto Send with Dictation</Text>
              </View>
              <Switch
                value={toggleStates.dictation}
                onValueChange={(value) => handleToggle('dictation', value)}
                trackColor={{ false: '#374151', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleItemPress('preferences')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Palette size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Color Scheme</Text>
              </View>
              <View style={styles.menuItemRight}>
                <Text style={styles.menuItemValue}>System</Text>
                <ChevronRight size={16} color="#6b7280" />
              </View>
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Smartphone size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Haptic Feedback</Text>
              </View>
              <Switch
                value={toggleStates.haptic}
                onValueChange={(value) => handleToggle('haptic', value)}
                trackColor={{ false: '#374151', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
              <View style={styles.menuItemLeft}>
                <Type size={20} color="#ffffff" />
                <Text style={styles.menuItemTitle}>Correct Spelling Automatically</Text>
              </View>
              <Switch
                value={toggleStates.spelling}
                onValueChange={(value) => handleToggle('spelling', value)}
                trackColor={{ false: '#374151', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Logout Section */}
          {onLogout && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogoutPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <LogOut size={20} color="#ef4444" />
                  <Text style={[styles.menuItemTitle, styles.logoutText]}>
                    Sign Out
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }, [handleClose, handleItemPress, handleLogoutPress, handleToggle, onLogout, user, toggleStates]);

  const renderContentScreen = useCallback(() => {
    let Component;
    let title;

    switch (currentScreen) {
      case 'profile':
        Component = ProfileSettings;
        title = 'Profile';
        break;
      case 'account':
        Component = AccountSettings;
        title = 'Account';
        break;
      case 'personalization':
        Component = PersonalizationSettings;
        title = 'Personalization';
        break;
      case 'preferences':
        Component = PreferenceSettings;
        title = 'Preferences';
        break;
      case 'data':
        Component = DataControls;
        title = 'Data Controls';
        break;
      case 'security':
        Component = SecuritySettings;
        title = 'Security';
        break;
      default:
        return null;
    }

    return (
      <View style={styles.screenContainer}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToMenu}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <View style={styles.closeButtonCircle}>
              <X size={20} color="#d1d5db" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Component user={user} onClose={handleClose} />
      </View>
    );
  }, [currentScreen, user, handleClose, handleBackToMenu]);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
        <SafeAreaView style={styles.container}>
          <Animated.View 
            style={[
              styles.slidingContainer,
              {
                transform: [{ translateX: slideAnim }]
              }
            ]}
          >
            {/* Menu Screen */}
            <View style={styles.screen}>
              {renderMenuScreen()}
            </View>

            {/* Content Screen */}
            <View style={styles.screen}>
              {currentScreen !== 'menu' && renderContentScreen()}
            </View>
          </Animated.View>
        </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  slidingContainer: {
    flexDirection: 'row',
    width: screenWidth * 2,
    flex: 1,
  },
  screen: {
    width: screenWidth,
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    padding: 4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentScrollView: {
    flex: 1,
  },
  contentScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#ffffff',
  },
  menuItemValue: {
    fontSize: 16,
    color: '#9ca3af',
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#ef4444',
  },
});