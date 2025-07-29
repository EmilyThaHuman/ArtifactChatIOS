import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  X,
  User,
  Settings,
  Shield,
  CreditCard,
  Database,
  Palette,
  Sliders,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import {
  ProfileSettings,
  SecuritySettings,
  AccountSettings,
  PreferenceSettings,
  PersonalizationSettings,
  DataControls,
} from './settings';

const { width } = Dimensions.get('window');

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
  user?: any;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

const tabs: TabItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    component: ProfileSettings,
  },
  {
    id: 'account',
    label: 'Account',
    icon: CreditCard,
    component: AccountSettings,
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Sliders,
    component: PreferenceSettings,
  },
  {
    id: 'personalization',
    label: 'Personalization',
    icon: Palette,
    component: PersonalizationSettings,
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    component: SecuritySettings,
  },
  {
    id: 'data',
    label: 'Data Controls',
    icon: Database,
    component: DataControls,
  },
];

export default function SettingsSheet({
  isOpen,
  onClose,
  defaultTab = 'profile',
  user,
}: SettingsSheetProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleTabPress = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const renderTabButton = useCallback((tab: TabItem) => {
    const isActive = activeTab === tab.id;
    const IconComponent = tab.icon;

    return (
      <TouchableOpacity
        key={tab.id}
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive,
        ]}
        onPress={() => handleTabPress(tab.id)}
        activeOpacity={0.7}
      >
        <IconComponent
          size={16}
          color={isActive ? Colors.white : Colors.gray400}
        />
        <Text
          style={[
            styles.tabButtonText,
            isActive && styles.tabButtonTextActive,
          ]}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeTab, handleTabPress]);

  const renderActiveTabContent = useCallback(() => {
    const activeTabItem = tabs.find(tab => tab.id === activeTab);
    if (!activeTabItem) return null;

    const Component = activeTabItem.component;
    return <Component user={user} onClose={handleClose} />;
  }, [activeTab, user, handleClose]);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Settings size={20} color={Colors.textLight} />
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <X size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {tabs.map(renderTabButton)}
            </ScrollView>
          </View>

          {/* Active Tab Content */}
          <View style={styles.tabContent}>
            <ScrollView
              style={styles.tabContentScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.tabContentScrollContent}
            >
              {renderActiveTabContent()}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 12,
    gap: 8,
    minWidth: 100,
  },
  tabButtonActive: {
    backgroundColor: Colors.purple500,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray400,
  },
  tabButtonTextActive: {
    color: Colors.white,
  },
  tabContent: {
    flex: 1,
  },
  tabContentScroll: {
    flex: 1,
  },
  tabContentScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: '100%',
  },
});