import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Bell,
  Settings,
  User,
  LogOut,
  FileText,
  Shield,
  HelpCircle,
  Moon,
  Sun,
  ChevronRight,
  X,
  Trash2,
} from 'lucide-react-native';
import SettingsSheet from './SettingsSheet';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  settings?: any;
  user_metadata?: any;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
}

interface NavChatUserProps {
  user?: UserProfile;
  notifications?: Notification[];
  unreadCount?: number;
  isCollapsed?: boolean;
  onNotificationsOpen?: () => void;
  onSettingsOpen?: () => void;
  onProfileOpen?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  isDarkTheme?: boolean;
}

export function NavChatUser({
  user,
  notifications = [],
  unreadCount = 0,
  isCollapsed = false,
  onNotificationsOpen,
  onSettingsOpen,
  onProfileOpen,
  onLogout,
  onToggleTheme,
  isDarkTheme = true,
}: NavChatUserProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);

  // Get display name and avatar
  const displayName = user?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     'User';
  const displayEmail = user?.email || user?.user_metadata?.email || '';
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;

  // Handle logout
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            setIsUserMenuOpen(false);
            onLogout?.();
          },
        },
      ]
    );
  }, [onLogout]);

  // Handle notifications
  const handleNotificationsToggle = useCallback(() => {
    setIsNotificationsOpen(!isNotificationsOpen);
    onNotificationsOpen?.();
  }, [isNotificationsOpen, onNotificationsOpen]);

  // Handle settings - now opens the comprehensive settings sheet
  const handleSettings = useCallback(() => {
    setIsUserMenuOpen(false);
    setIsSettingsSheetOpen(true);
    onSettingsOpen?.();
  }, [onSettingsOpen]);

  // Handle profile
  const handleProfile = useCallback(() => {
    setIsUserMenuOpen(false);
    setIsSettingsSheetOpen(true);
    onProfileOpen?.();
  }, [onProfileOpen]);

  // Render user avatar
  const renderUserAvatar = useCallback(() => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatar}
          onError={() => console.log('User avatar failed to load')}
        />
      );
    }

    return (
      <View style={[styles.avatarPlaceholder, { backgroundColor: '#9333ea' }]}>
        <Text style={styles.avatarText}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }, [avatarUrl, displayName]);

  // Render notifications modal
  const renderNotificationsModal = useCallback(() => (
    <Modal
      visible={isNotificationsOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsNotificationsOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.notificationsModal}>
          <View style={styles.notificationsHeader}>
            <View style={styles.notificationsHeaderLeft}>
              <Bell size={20} color="#9333ea" />
              <Text style={styles.notificationsTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsNotificationsOpen(false)}
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notificationsContent}>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.is_read && styles.notificationItemUnread,
                  ]}
                >
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationDate}>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.notificationDeleteButton}>
                    <Trash2 size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.noNotifications}>
                <Bell size={48} color="#6b7280" />
                <Text style={styles.noNotificationsText}>
                  No notifications to show
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  ), [isNotificationsOpen, notifications, unreadCount]);

  // Render user menu modal
  const renderUserMenuModal = useCallback(() => (
    <Modal
      visible={isUserMenuOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsUserMenuOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.userMenuModal}>
          {/* User Info Header */}
          <View style={styles.userMenuHeader}>
            <View style={styles.userMenuAvatar}>
              {renderUserAvatar()}
            </View>
            <View style={styles.userMenuInfo}>
              <Text style={styles.userMenuName}>{displayName}</Text>
              <Text style={styles.userMenuEmail}>{displayEmail}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsUserMenuOpen(false)}
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.userMenuItems}>
            <TouchableOpacity style={styles.userMenuItem} onPress={handleProfile}>
              <User size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Profile</Text>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userMenuItem} onPress={handleSettings}>
              <Settings size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Settings</Text>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userMenuItem} onPress={handleNotificationsToggle}>
              <View style={styles.menuItemLeft}>
                <Bell size={20} color="#d1d5db" />
                <Text style={styles.userMenuItemText}>Notifications</Text>
              </View>
              <View style={styles.menuItemRight}>
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                  </View>
                )}
                <ChevronRight size={16} color="#6b7280" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.userMenuItem}>
              <FileText size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Files</Text>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userMenuItem} onPress={onToggleTheme}>
              <View style={styles.menuItemLeft}>
                {isDarkTheme ? (
                  <Sun size={20} color="#d1d5db" />
                ) : (
                  <Moon size={20} color="#d1d5db" />
                )}
                <Text style={styles.userMenuItemText}>
                  {isDarkTheme ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </View>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userMenuItem}>
              <Shield size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Admin Dashboard</Text>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userMenuItem}>
              <HelpCircle size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Help & Support</Text>
              <ChevronRight size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.userMenuItem, styles.userMenuItemDestructive]} 
              onPress={handleLogout}
            >
              <LogOut size={20} color="#ef4444" />
              <Text style={[styles.userMenuItemText, styles.userMenuItemDestructiveText]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [
    isUserMenuOpen,
    displayName,
    displayEmail,
    renderUserAvatar,
    handleProfile,
    handleSettings,
    handleNotificationsToggle,
    unreadCount,
    onToggleTheme,
    isDarkTheme,
    handleLogout,
  ]);

  if (!user) {
    return (
      <View style={styles.signInPrompt}>
        <View style={styles.signInContent}>
          <View style={styles.signInIcon}>
            <User size={24} color="#9333ea" />
          </View>
          <Text style={styles.signInText}>Sign in to access</Text>
          <Text style={styles.signInSubtext}>Chat history & projects</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Collapsed view - just avatar or user icon */}
      {isCollapsed ? (
        <TouchableOpacity
          style={styles.collapsedUserButton}
          onPress={() => setIsUserMenuOpen(true)}
        >
          {renderUserAvatar()}
          {unreadCount > 0 && (
            <View style={styles.collapsedNotificationBadge}>
              <Text style={styles.collapsedNotificationBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        /* Expanded view - full user profile */
        <View style={styles.userProfile}>
          <TouchableOpacity
            style={styles.userProfileButton}
            onPress={() => setIsUserMenuOpen(true)}
          >
            <View style={styles.userProfileContent}>
              <View style={styles.userAvatarContainer}>
                {renderUserAvatar()}
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {displayEmail}
                </Text>
              </View>

              <View style={styles.proBadge}>
                <Text style={styles.proText}>pro</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Quick action buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleNotificationsToggle}
            >
              <Bell size={18} color="#9ca3af" />
              {unreadCount > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleSettings}
            >
              <Settings size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      {renderUserMenuModal()}
      {renderNotificationsModal()}

      {/* Settings Sheet */}
      <SettingsSheet
        isOpen={isSettingsSheetOpen}
        onClose={() => setIsSettingsSheetOpen(false)}
        defaultTab="profile"
        user={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  // Collapsed view styles
  collapsedUserButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  collapsedNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  collapsedNotificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Expanded view styles
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userProfileButton: {
    flex: 1,
  },
  userProfileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    color: '#9ca3af',
    fontSize: 12,
  },
  proBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 4,
  },
  quickActionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickActionBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  // Sign in prompt styles
  signInPrompt: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signInContent: {
    alignItems: 'center',
  },
  signInIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  signInText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  signInSubtext: {
    color: '#6b7280',
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  // User menu modal
  userMenuModal: {
    backgroundColor: '#374151',
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    maxHeight: '80%',
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
    gap: 12,
  },
  userMenuAvatar: {
    width: 48,
    height: 48,
  },
  userMenuInfo: {
    flex: 1,
  },
  userMenuName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userMenuEmail: {
    color: '#9ca3af',
    fontSize: 14,
  },
  modalCloseButton: {
    padding: 4,
  },
  userMenuItems: {
    paddingVertical: 8,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  userMenuItemDestructive: {
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userMenuItemText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  userMenuItemDestructiveText: {
    color: '#ef4444',
  },
  notificationBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  // Notifications modal
  notificationsModal: {
    backgroundColor: '#374151',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  notificationsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  notificationsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    minWidth: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationsContent: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
    gap: 12,
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(147, 51, 234, 0.05)',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationMessage: {
    color: '#d1d5db',
    fontSize: 13,
    marginBottom: 4,
  },
  notificationDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  notificationDeleteButton: {
    padding: 4,
  },
  noNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  noNotificationsText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default NavChatUser; 