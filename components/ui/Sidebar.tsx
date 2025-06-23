import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Search,
  Plus,
  Library,
  FileText,
  Folder,
  User,
  Edit3,
  Users,
  Settings,
  Bell,
  Shield,
  LogOut,
  ChevronDown,
} from 'lucide-react-native';
import { Colors, Gradients } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/lib/auth';
import { ThreadManager } from '@/lib/threads';

const { width } = Dimensions.get('window');

interface SidebarItem {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  type: 'creation' | 'project' | 'thread';
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onItemSelect: (item: SidebarItem) => void;
  selectedItem?: string;
  onNewChat?: (threadId: string, workspaceId: string) => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  settings: any;
  user_workspaces: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  user_id: string;
  avatar_url: string;
  is_personal: boolean;
  is_home: boolean;
  workspace_threads: string[];
  workspace_files: string[];
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

const creationItems: SidebarItem[] = [
  { id: 'library', title: 'Library', icon: Library, type: 'creation' },
  { id: 'canvases', title: 'Canvases', icon: FileText, type: 'creation' },
];

export default function Sidebar({ isOpen, onClose, onItemSelect, selectedItem, onNewChat }: SidebarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { user: currentUser } = await AuthManager.getCurrentUser();
      if (!currentUser) {
        console.log('📱 Sidebar: No current user found');
        setIsLoading(false);
        return;
      }

      // Fetch user profile
      const { data: userProfile, error: profileError } = await AuthManager.fetchUserProfile(currentUser.id);
      if (profileError) {
        console.error('📱 Sidebar: Profile fetch error:', profileError);
      } else if (userProfile) {
        setProfile(userProfile);
        console.log('📱 Sidebar: Profile loaded:', {
          name: userProfile.full_name,
          email: userProfile.email,
          avatar: userProfile.avatar_url ? 'Present' : 'None'
        });
      }

      // Fetch user workspaces
      const { data: userWorkspaces, error: workspacesError } = await AuthManager.fetchUserWorkspaces(currentUser.id);
      if (workspacesError) {
        console.error('📱 Sidebar: Workspaces fetch error:', workspacesError);
      } else if (userWorkspaces) {
        setWorkspaces(userWorkspaces);
        console.log(`📱 Sidebar: ${userWorkspaces.length} workspaces loaded`);
      }

      // Load recent threads
      const { data: threadsData } = await supabase
        .from('threads')
        .select('id, title, updated_at')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (threadsData) {
        setThreads(threadsData);
      }

    } catch (error) {
      console.error('📱 Sidebar: Load user data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCreationItem = (item: SidebarItem) => {
    const isSelected = selectedItem === item.id;
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, isSelected && styles.selectedItem]}
        onPress={() => onItemSelect(item)}
        activeOpacity={0.7}
      >
        <IconComponent 
          size={20} 
          color={isSelected ? '#a855f7' : '#9ca3af'} 
        />
        <Text style={[
          styles.menuItemText,
          isSelected && styles.selectedItemText
        ]}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWorkspace = (workspace: Workspace) => {
    const IconComponent = workspace.is_personal ? Folder : Users;
    
    return (
      <TouchableOpacity
        key={workspace.id}
        style={styles.menuItem}
        onPress={() => onItemSelect({
          id: workspace.id,
          title: workspace.name,
          icon: IconComponent,
          type: 'project'
        })}
        activeOpacity={0.7}
      >
        <IconComponent size={20} color="#9ca3af" />
        <Text style={styles.menuItemText}>{workspace.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderThread = (thread: Thread) => (
    <TouchableOpacity
      key={thread.id}
      style={styles.threadItem}
      onPress={() => handleThreadSelect(thread)}
      activeOpacity={0.7}
    >
      <Text style={styles.threadText} numberOfLines={1}>
        {thread.title}
      </Text>
    </TouchableOpacity>
  );

  const handleSignOut = async () => {
    try {
      console.log('📱 Sidebar: Starting sign out...');
      await AuthManager.signOut();
      onClose();
    } catch (error) {
      console.error('📱 Sidebar: Sign out error:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      console.log('📱 Sidebar: Creating new chat...');
      const newThread = await ThreadManager.createNewThread();
      
      if (newThread) {
        console.log('📱 Sidebar: New chat created:', newThread.id);
        
        // Add the new thread to the local state
        setThreads(prev => [newThread, ...prev]);
        
        onNewChat?.(newThread.id, newThread.workspace_id);
        onClose(); // Close sidebar after creating new chat
      } else {
        console.error('📱 Sidebar: Failed to create new chat');
      }
    } catch (error) {
      console.error('📱 Sidebar: Error creating new chat:', error);
    }
  };

  const handleThreadSelect = async (thread: Thread) => {
    try {
      console.log('📱 Sidebar: Selecting thread:', thread.id);
      
      // Find the workspace for this thread
      const threadWorkspace = workspaces.find(w => 
        w.workspace_threads?.includes(thread.id) || 
        // Fallback: assume it belongs to personal workspace if not found
        w.is_personal
      );
      
      const workspaceId = threadWorkspace?.id;
      if (!workspaceId) {
        console.error('📱 Sidebar: Could not find workspace for thread');
        return;
      }

      onNewChat?.(thread.id, workspaceId);
      onClose(); // Close sidebar after selecting thread
    } catch (error) {
      console.error('📱 Sidebar: Error selecting thread:', error);
    }
  };

  const renderUserMenu = () => {
    if (!showUserMenu) return null;

    const displayName = profile?.full_name || profile?.user_metadata?.full_name || profile?.user_metadata?.name || 'User';
    const displayEmail = profile?.email || profile?.user_metadata?.email || '';
    const avatarUrl = profile?.avatar_url || profile?.user_metadata?.avatar_url;

    return (
      <View style={styles.userMenuOverlay}>
        <View style={styles.userMenuContainer}>
          {/* User Profile Header */}
          <View style={styles.userMenuHeader}>
            <View style={styles.userMenuAvatar}>
              {avatarUrl ? (
                <Image 
                  source={{ uri: avatarUrl }} 
                  style={styles.menuAvatar}
                  onError={() => console.log('📱 Sidebar: Avatar failed to load')}
                />
              ) : (
                <View style={[styles.menuAvatarPlaceholder, { backgroundColor: '#9333ea' }]}>
                  <Text style={styles.menuAvatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.userMenuInfo}>
              <Text style={styles.menuUserName}>{displayName}</Text>
              <Text style={styles.menuUserEmail}>{displayEmail}</Text>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.userMenuItems}>
            <TouchableOpacity style={styles.userMenuItem}>
              <Settings size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.userMenuItem}>
              <Bell size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.userMenuItem}>
              <FileText size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Files</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.userMenuItem}>
              <Shield size={20} color="#d1d5db" />
              <Text style={styles.userMenuItemText}>Admin Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.userMenuItem} onPress={handleSignOut}>
              <LogOut size={20} color="#ef4444" />
              <Text style={[styles.userMenuItemText, { color: '#ef4444' }]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderUserProfile = () => {
    if (isLoading || !profile) {
      return (
        <TouchableOpacity style={styles.userProfile} onPress={() => setShowUserMenu(!showUserMenu)}>
          <View style={styles.userAvatar}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#374151' }]} />
          </View>
          <View style={styles.userInfo}>
            <View style={[styles.namePlaceholder, { backgroundColor: '#374151' }]} />
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>pro</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const displayName = profile?.full_name || profile?.user_metadata?.full_name || profile?.user_metadata?.name || 'User';
    const avatarUrl = profile?.avatar_url || profile?.user_metadata?.avatar_url;

    return (
      <TouchableOpacity style={styles.userProfile} onPress={() => setShowUserMenu(!showUserMenu)}>
        <View style={styles.userAvatar}>
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.avatar}
              onError={() => console.log('📱 Sidebar: Avatar failed to load')}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#9333ea' }]}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
        <View style={styles.proBadge}>
          <Text style={styles.proText}>pro</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarContent}>
          <SafeAreaView style={styles.safeArea}>
                        {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/images/artifact-transparent-01.webp')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.logoText}>Artifact</Text>
              </View>
              <TouchableOpacity style={styles.headerButton}>
                <Edit3 size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={16} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#6b7280"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Creations Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Creations</Text>
                {creationItems.map(renderCreationItem)}
              </View>

              {/* Projects Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Projects</Text>
                  <TouchableOpacity style={styles.addButton} onPress={handleNewChat}>
                    <Plus size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                {workspaces.map(renderWorkspace)}
              </View>

              {/* Today Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today</Text>
                {threads.map(renderThread)}
              </View>
            </ScrollView>

            {/* User Profile at Bottom */}
            <View style={styles.bottomSection}>
              {renderUserProfile()}
            </View>
            
            {/* User Menu */}
            {renderUserMenu()}
          </SafeAreaView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.75,
    zIndex: 1000,
  },
  sidebarContent: {
    flex: 1,
    backgroundColor: '#1f2937', // Dark gray background
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 24,
    height: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(75, 85, 99, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '400',
  },
  scrollContent: {
    flex: 1,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 2,
    gap: 12,
  },
  selectedItem: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  menuItemText: {
    color: '#d1d5db',
    fontSize: 15,
    fontWeight: '400',
    flex: 1,
  },
  selectedItemText: {
    color: '#a855f7',
    fontWeight: '500',
  },
  threadItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 1,
  },
  threadText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '400',
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 16,
    paddingBottom: 16,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
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
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  proBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  proText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  namePlaceholder: {
    height: 16,
    width: 60,
    borderRadius: 4,
  },
  userMenuOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    zIndex: 1001,
  },
  userMenuContainer: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
    gap: 12,
  },
  userMenuAvatar: {
    width: 48,
    height: 48,
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  menuAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  userMenuInfo: {
    flex: 1,
  },
  menuUserName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuUserEmail: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '400',
  },
  userMenuItems: {
    paddingTop: 8,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  userMenuItemText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '400',
  },
}); 