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
import { useRouter } from 'expo-router';
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
import { ThreadManager } from '@/lib/threads';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onNewChat?: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToCanvases: () => void;
  user?: any;
  profile?: any;
  currentWorkspace?: any;
  currentThreadId?: string; // Optional - we'll get from router if not provided
  // Thread-related props are now optional since we handle them internally
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
  currentThreadId: propCurrentThreadId,
  threads: propThreads,
  workspaces = [],
  notifications = [],
  unreadCount = 0,
  onWorkspaceSelect,
  onThreadSelect: propOnThreadSelect,
  onThreadDelete: propOnThreadDelete,
  onThreadRename: propOnThreadRename,
  onThreadShare,
  onThreadClone,
  onToggleBookmark,
  onLogout,
  onSettingsOpen,
  onProfileOpen,
  onToggleTheme,
  isDarkTheme = true,
}: SidebarProps) {
  // Internal state for threads (self-sufficient)
  const [internalThreads, setInternalThreads] = useState<any[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  
  // Use internal threads if parent doesn't provide them
  const threads = propThreads || internalThreads;
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const searchInputRef = useRef<TextInput>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const router = useRouter();

  // Load threads if parent doesn't provide them
  useEffect(() => {
    if (!propThreads && user) {
      loadInternalThreads();
    }
  }, [propThreads, user, isVisible]);

  const loadInternalThreads = async () => {
    if (threadsLoading) return;
    
    try {
      setThreadsLoading(true);
      console.log('🗂️ Sidebar: Loading threads internally...');
      
      const fetchedThreads = await ThreadManager.getHistoryThreads(50);
      console.log(`🗂️ Sidebar: Loaded ${fetchedThreads.length} threads`);
      
      setInternalThreads(fetchedThreads);
    } catch (error) {
      console.error('🗂️ Sidebar: Error loading threads:', error);
      setInternalThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  };

  // Get current thread ID from router if not provided
  const getCurrentThreadId = () => {
    if (propCurrentThreadId) return propCurrentThreadId;
    
    // Try to extract from router pathname
    if (router && router.pathname) {
      const match = router.pathname.match(/\/conversation\/([^/?]+)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  };

  const currentThreadId = getCurrentThreadId();

  // Internal thread action handlers
  const handleInternalThreadSelect = (threadId: string) => {
    if (propOnThreadSelect) {
      propOnThreadSelect(threadId);
    } else {
      // Navigate to thread using router
      router.push(`/conversation/${threadId}`);
      onClose(); // Close sidebar after navigation
    }
  };

  const handleInternalThreadDelete = async (threadId: string) => {
    if (propOnThreadDelete) {
      propOnThreadDelete(threadId);
    } else {
      try {
        const success = await ThreadManager.deleteThread(threadId);
        if (success) {
          // Reload threads after deletion
          await loadInternalThreads();
        }
      } catch (error) {
        console.error('🗂️ Sidebar: Error deleting thread:', error);
        Alert.alert('Error', 'Failed to delete thread');
      }
    }
  };

  const handleInternalThreadRename = async (threadId: string, newTitle: string) => {
    if (propOnThreadRename) {
      propOnThreadRename(threadId, newTitle);
    } else {
      try {
        const success = await ThreadManager.updateThread(threadId, { title: newTitle });
        if (success) {
          // Reload threads after rename
          await loadInternalThreads();
        }
      } catch (error) {
        console.error('🗂️ Sidebar: Error renaming thread:', error);
        Alert.alert('Error', 'Failed to rename thread');
      }
    }
  };

  const handleInternalNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      // Navigate to main chat page for new chat
      router.push('/');
      onClose();
    }
  };

  // Animation effects
  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);



  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      // Simple search implementation - filter threads by title
      const results: SearchResult[] = threads
        .filter(thread => 
          thread.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(thread => ({
          id: thread.id,
          title: thread.title,
          type: 'thread' as const,
        }));
      
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, threads]);

  const handleSearchResultSelect = (result: SearchResult) => {
    if (result.type === 'thread') {
      handleInternalThreadSelect(result.id);
    }
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleNotificationsToggle = () => {
    setShowNotifications(!showNotifications);
  };

  const handleSearchFocus = () => {
    setIsSearchMode(true);
  };

  const handleSearchBlur = () => {
    if (!searchQuery.trim()) {
      setIsSearchMode(false);
    }
  };

  const handleSearchCancel = () => {
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
              width: isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
              paddingTop: safeAreaInsets.top,
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={toggleCollapse} style={styles.logoContainer}>
                <ArtifactLogo size={isCollapsed ? 24 : 32} />
                {!isCollapsed && (
                  <Text style={styles.logoText}>Artifact</Text>
                )}
              </TouchableOpacity>
              
              {!isCollapsed && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search */}
            {!isCollapsed && (
              <View style={styles.searchSection}>
                <View style={[styles.searchContainer, isSearchMode && styles.searchActive]}>
                  <Search size={16} color={Colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search conversations..."
                    placeholderTextColor={Colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                  />
                  {isSearchMode && (
                    <TouchableOpacity onPress={handleSearchCancel} style={styles.searchCancel}>
                      <X size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Navigation */}
            {!isSearchMode && (
              <>
                <View style={styles.navigation}>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={handleInternalNewChat}
                  >
                    <PenSquare size={18} color="#ffffff" />
                    {!isCollapsed && (
                      <Text style={styles.navButtonText}>New Chat</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={onNavigateToLibrary}
                  >
                    <Images size={18} color="#ffffff" />
                    {!isCollapsed && (
                      <Text style={styles.navButtonText}>Library</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={onNavigateToCanvases}
                  >
                    <FileText size={18} color="#ffffff" />
                    {!isCollapsed && (
                      <Text style={styles.navButtonText}>Canvases</Text>
                    )}
                  </TouchableOpacity>
                </View>

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
                    onThreadSelect={handleInternalThreadSelect}
                    onThreadDelete={handleInternalThreadDelete}
                    onThreadRename={handleInternalThreadRename}
                    onThreadShare={onThreadShare}
                    onThreadClone={onThreadClone}
                    onToggleBookmark={onToggleBookmark}
                    isCollapsed={isCollapsed}
                    searchQuery={searchQuery}
                  />
                </View>
              </>
            )}

            {/* Search Results */}
            {isSearchMode && searchResults.length > 0 && (
              <View style={styles.searchResults}>
                <Text style={styles.searchResultsTitle}>Search Results</Text>
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSearchResultSelect(result)}
                  >
                    <Text style={styles.searchResultText}>{result.title}</Text>
                    <Text style={styles.searchResultType}>{result.type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
      </View>

      {/* Search Dialog */}
      {isSearchMode && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.searchDialog}
        >
          <TouchableOpacity
            style={styles.searchDialogBackdrop}
            onPress={handleSearchCancel}
          />
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sidebar: {
    backgroundColor: '#252628',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchActive: {
    borderColor: '#9333ea',
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  searchCancel: {
    padding: 4,
  },
  navigation: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
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
  searchDialog: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  searchDialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  searchResults: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 11,
    padding: 16,
  },
  searchResultsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchResultText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  searchResultType: {
    color: '#6b7280',
    fontSize: 12,
  },
});

export default Sidebar; 