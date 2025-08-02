import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Bell,
  User,
  X,
  Trash2,
} from 'lucide-react-native';
import UnifiedSettingsSheet from './UnifiedSettingsSheet';

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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [selectedSettingsTab, setSelectedSettingsTab] = useState('menu');

  // Get display name and avatar
  const displayName = user?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     'User';
  const displayEmail = user?.email || user?.user_metadata?.email || '';
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;



  // Handle notifications
  const handleNotificationsToggle = useCallback(() => {
    setIsNotificationsOpen(!isNotificationsOpen);
    onNotificationsOpen?.();
  }, [isNotificationsOpen, onNotificationsOpen]);

  // Handle user profile click - opens unified settings sheet
  const handleUserClick = useCallback(() => {
    setSelectedSettingsTab('menu');
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
          onPress={handleUserClick}
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
            onPress={handleUserClick}
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


        </View>
      )}

      {/* Modals */}
      {renderNotificationsModal()}

      {/* Unified Settings Sheet */}
      <UnifiedSettingsSheet
        isOpen={isSettingsSheetOpen}
        onClose={() => setIsSettingsSheetOpen(false)}
        defaultTab={selectedSettingsTab}
        user={user}
        onLogout={onLogout}
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
  modalCloseButton: {
    padding: 4,
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