import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  PenSquare,
  Images,
  FileText,
  Menu,
  X,
  Bell,
  Settings,
  User,
  History,
  ChevronDown,
  ChevronRight,
  // PanelLeft,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import ArtifactLogo from './ArtifactLogo';
import LoadingSpinner from './LoadingSpinner';
import NavChatHistory from './NavChatHistory';
import NavChatUser from './NavChatUser';
import NavChatWorkspaces from './NavChatWorkspaces';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onNewChat?: () => void; // Changed from onCreateChat
  onNavigateToLibrary: () => void;
  onNavigateToCanvases: () => void;
  user?: any;
  profile?: any; // Added profile prop
  currentWorkspace?: any;
  currentThreadId?: string;
  threads?: any[];
  workspaces?: any[];
  notifications?: any[];
  unreadCount?: number;
  onWorkspaceSelect?: (workspaceId: string) => void;
  onThreadSelect?: (threadId: string) => void;
  onThreadDelete?: (threadId: string) => void;
  onThreadRename?: (threadId: string, newTitle: string) => void;
  onThreadShare?: (threadId: string) => void;
  onThreadClone?: (threadId: string) => void;
  onToggleBookmark?: (threadId: string) => void;
  onLogout?: () => void;
  onSettingsOpen?: () => void;
  onProfileOpen?: () => void;
  onToggleTheme?: () => void;
  isDarkTheme?: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'thread' | 'workspace';
}

const SIDEBAR_WIDTH = 320;
const COLLAPSED_WIDTH = 64;

export function Sidebar({
  isVisible,
  onClose,
  onNewChat,
  onNavigateToLibrary,
  onNavigateToCanvases,
  user,
  currentWorkspace,
  currentThreadId,
  threads = [],
  workspaces = [],
  notifications = [],
  unreadCount = 0,
  onWorkspaceSelect,
  onThreadSelect,
  onThreadDelete,
  onThreadRename,
  onThreadShare,
  onThreadClone,
  onToggleBookmark,
  onLogout,
  onSettingsOpen,
  onProfileOpen,
  onToggleTheme,
  isDarkTheme = true,
}: SidebarProps) {
  const insets = useSafeAreaInsets();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const slideAnim = useRef(new Animated.Value(isVisible ? 0 : -SIDEBAR_WIDTH)).current;

  // Animate sidebar in/out
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Search threads and workspaces
    const threadResults = threads
      .filter(thread => 
        thread.title?.toLowerCase().includes(query.toLowerCase()) ||
        thread.id?.toLowerCase().includes(query.toLowerCase())
      )
      .map(thread => ({
        id: thread.id,
        title: thread.title || 'Untitled Chat',
        type: 'thread' as const,
      }));

    const workspaceResults = workspaces
      .filter(workspace =>
        workspace.name?.toLowerCase().includes(query.toLowerCase())
      )
      .map(workspace => ({
        id: workspace.id,
        title: workspace.name,
        type: 'workspace' as const,
      }));

    setSearchResults([...threadResults, ...workspaceResults].slice(0, 10));
  }, [threads, workspaces]);

  // Handle keyboard shortcuts (web-like functionality)
  const handleKeyboardShortcut = useCallback((key: string, metaKey: boolean) => {
    if (metaKey && key === 'k') {
      setIsSearchOpen(true);
    } else if (metaKey && key === 'm') {
      handleNewChat();
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    console.log('🔄 Sidebar: handleNewChat called', { isCreatingChat, hasOnNewChat: !!onNewChat });
    
    if (isCreatingChat) {
      console.log('🔄 Sidebar: Already creating chat, skipping');
      return;
    }
    
    if (!onNewChat) {
      console.error('🔄 Sidebar: No onNewChat prop provided');
      return;
    }
    
    setIsCreatingChat(true);
    try {
      console.log('🔄 Sidebar: Calling onNewChat');
      await onNewChat();
      console.log('🔄 Sidebar: onNewChat completed successfully');
    } catch (error) {
      console.error('🔄 Sidebar: Error in onNewChat:', error);
    } finally {
      setIsCreatingChat(false);
      console.log('🔄 Sidebar: Chat creation finished');
    }
  }, [isCreatingChat, onNewChat]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSearchToggle = () => {
    setIsSearchOpen(true);
  };

  const handleNotificationsToggle = () => {
    setIsNotificationsOpen(true);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
              width: isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {!isCollapsed ? (
                <View style={styles.logoContainer}>
                  <ArtifactLogo style={styles.logo} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={toggleCollapse}
                >
                  <Menu size={18} color="#ffffff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={isCollapsed ? toggleCollapse : onClose}
              >
                {isCollapsed ? (
                  <Menu size={20} color="#ffffff" />
                ) : (
                  <Menu size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!isCollapsed && (
              <>
                {/* Search Bar */}
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleSearchToggle}
                >
                  <Search size={16} color="#9ca3af" />
                  <Text style={styles.searchButtonText}>Search</Text>
                  <Text style={styles.searchShortcut}>⌘K</Text>
                </TouchableOpacity>

                {/* New Chat Button */}
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    (!onNewChat || isCreatingChat) && styles.navButtonDisabled,
                  ]}
                  onPress={handleNewChat}
                  disabled={!onNewChat || isCreatingChat}
                  activeOpacity={0.7}
                >
                  {isCreatingChat ? (
                    <LoadingSpinner size={18} color="#ffffff" />
                  ) : (
                    <PenSquare size={18} color="#ffffff" />
                  )}
                  <Text style={styles.navButtonText}>
                    {isCreatingChat ? 'Creating...' : 'Chat'}
                  </Text>
                  <Text style={styles.navShortcut}>⌘M</Text>
                </TouchableOpacity>

                {/* Library Button */}
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={onNavigateToLibrary}
                >
                  <Images size={18} color="#ffffff" />
                  <Text style={styles.navButtonText}>Library</Text>
                </TouchableOpacity>

                {/* Canvases Button */}
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={onNavigateToCanvases}
                >
                  <FileText size={18} color="#ffffff" />
                  <Text style={styles.navButtonText}>Canvases</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Main Content Area - Workspaces and History */}
            <View style={styles.mainContent}>
              {!isCollapsed && (
                <NavChatWorkspaces
                  onWorkspaceSelect={onWorkspaceSelect}
                  currentWorkspaceId={currentWorkspace?.id}
                />
              )}
              
              <NavChatHistory
                threads={threads}
                currentThreadId={currentThreadId}
                onThreadSelect={onThreadSelect}
                onThreadDelete={onThreadDelete}
                onThreadRename={onThreadRename}
                onThreadShare={onThreadShare}
                onThreadClone={onThreadClone}
                onToggleBookmark={onToggleBookmark}
                isCollapsed={isCollapsed}
                searchQuery={searchQuery}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <NavChatUser
              user={user}
              notifications={notifications}
              unreadCount={unreadCount}
              isCollapsed={isCollapsed}
              onNotificationsOpen={handleNotificationsToggle}
              onSettingsOpen={onSettingsOpen}
              onProfileOpen={onProfileOpen}
              onLogout={onLogout}
              onToggleTheme={onToggleTheme}
              isDarkTheme={isDarkTheme}
            />
          </View>
        </Animated.View>

        {/* Search Dialog */}
        <Modal
          visible={isSearchOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSearchOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.searchOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.searchModal}>
              <View style={styles.searchHeader}>
                <Search size={20} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search chats..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.searchCloseButton}
                  onPress={() => setIsSearchOpen(false)}
                >
                  <X size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.searchResults}>
                {/* New Chat Option */}
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => {
                    setIsSearchOpen(false);
                    handleNewChat();
                  }}
                >
                  <PenSquare size={18} color="#9ca3af" />
                  <Text style={styles.searchResultText}>New chat</Text>
                </TouchableOpacity>

                {/* Search Results */}
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setIsSearchOpen(false);
                      // Handle result selection
                    }}
                  >
                    <ArtifactLogo style={styles.searchResultIcon} />
                    <Text style={styles.searchResultText}>{result.title}</Text>
                  </TouchableOpacity>
                ))}

                {searchQuery && searchResults.length === 0 && (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>
                      No chats found matching "{searchQuery}"
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Notifications Dialog */}
        <Modal
          visible={isNotificationsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsNotificationsOpen(false)}
        >
          <View style={styles.notificationsOverlay}>
            <View style={styles.notificationsModal}>
              <View style={styles.notificationsHeader}>
                <Bell size={20} color="#9333ea" />
                <Text style={styles.notificationsTitle}>Notifications</Text>
                <TouchableOpacity
                  style={styles.notificationsCloseButton}
                  onPress={() => setIsNotificationsOpen(false)}
                >
                  <X size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.notificationsContent}>
                <Text style={styles.noNotificationsText}>
                  No notifications to show
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    backgroundColor: '#252628',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  searchButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  searchShortcut: {
    color: '#6b7280',
    fontSize: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.15)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  navShortcut: {
    color: '#6b7280',
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
    marginTop: 16,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  // Search Modal Styles
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchModal: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 8,
  },
  searchCloseButton: {
    padding: 4,
  },
  searchResults: {
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchResultIcon: {
    width: 20,
    height: 20,
  },
  searchResultText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 12,
  },
  noResults: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#6b7280',
    fontSize: 14,
  },
  // Notifications Modal Styles
  notificationsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notificationsModal: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  notificationsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  notificationsCloseButton: {
    padding: 4,
  },
  notificationsContent: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  noNotificationsText: {
    color: '#6b7280',
    fontSize: 14,
  },
});

export default Sidebar; 