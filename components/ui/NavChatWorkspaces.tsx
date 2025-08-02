import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Folder,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthHandler';

interface Workspace {
  id: string;
  name: string;
  is_team: boolean;
  metadata?: {
    color?: string;
    avatar_url?: string;
    icon?: string;
    description?: string;
  };
  workspace_threads?: string[];
}

interface NavChatWorkspacesProps {
  onWorkspaceSelect?: (workspaceId: string) => void;
  currentWorkspaceId?: string;
}

export default function NavChatWorkspaces({ 
  onWorkspaceSelect, 
  currentWorkspaceId 
}: NavChatWorkspacesProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true);

      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkspaces(workspaces || []);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspacePress = (workspace: Workspace) => {
    console.log('🚀 NavChatWorkspaces: Navigating to workspace:', workspace.id, workspace.name);
    
    // Navigate to the individual workspace page
    router.push(`/workspace/${workspace.id}`);
    
    // Also notify parent if needed
    onWorkspaceSelect?.(workspace.id);
  };

  const handleCreateWorkspace = () => {
    // For now, show an alert that creation will be implemented
    Alert.alert(
      'Create Project', 
      'Project creation dialog will be implemented soon',
      [
        { text: 'OK' }
      ]
    );
  };

  const renderWorkspaceItem = ({ item }: { item: Workspace }) => {
    const isSelected = currentWorkspaceId === item.id;
    const threadCount = item.workspace_threads?.length || 0;

    return (
      <TouchableOpacity
        style={[
          styles.workspaceItem,
          isSelected && styles.workspaceItemSelected,
        ]}
        onPress={() => handleWorkspacePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.workspaceLeft}>
          <View style={styles.workspaceIcon}>
            {item.metadata?.avatar_url ? (
              <Image 
                source={{ uri: item.metadata.avatar_url }}
                style={styles.workspaceAvatar}
                defaultSource={require('@/assets/images/icon.png')}
              />
            ) : (
              <View style={styles.workspaceIconFallback}>
                {item.is_team ? (
                  <Users size={16} color="#6b7280" />
                ) : (
                  <Folder size={16} color="#6b7280" />
                )}
              </View>
            )}
          </View>
          
          <View style={styles.workspaceInfo}>
            <Text 
              style={[
                styles.workspaceName,
                isSelected && styles.workspaceNameSelected,
              ]} 
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={styles.workspaceSubtitle}>
              {threadCount} chat{threadCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.workspaceMenu}
          onPress={() => {
            // Handle workspace menu actions
            Alert.alert(
              item.name,
              'Workspace options will be implemented soon',
              [{ text: 'OK' }]
            );
          }}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No projects yet</Text>
      <TouchableOpacity
        style={styles.createFirstButton}
        onPress={handleCreateWorkspace}
        activeOpacity={0.7}
      >
        <Plus size={12} color="#ffffff" />
        <Text style={styles.createFirstButtonText}>Create your first project</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsCollapsed(!isCollapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {isCollapsed ? (
            <ChevronRight size={16} color="#ffffff" />
          ) : (
            <ChevronDown size={16} color="#ffffff" />
          )}
          <Text style={styles.headerTitle}>Projects</Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateWorkspace}
          disabled={isCreating}
          activeOpacity={0.7}
        >
          {isCreating ? (
            <ActivityIndicator size={12} color="#ffffff" />
          ) : (
            <Plus size={12} color="#ffffff" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Content */}
      {!isCollapsed && (
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size={16} color={Colors.textSecondary} />
              <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
          ) : workspaces.length > 0 ? (
            <FlatList
              data={workspaces}
              renderItem={renderWorkspaceItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false} // Disable scroll since it's in sidebar
            />
          ) : (
            renderEmptyState()
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  createButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginLeft: 8,
    marginTop: 4,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  workspaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  workspaceItemSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
  },
  workspaceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workspaceIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  workspaceAvatar: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  workspaceIconFallback: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  workspaceInfo: {
    flex: 1,
  },
  workspaceName: {
    color: Colors.textLight,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 1,
  },
  workspaceNameSelected: {
    color: '#9ca3af',
  },
  workspaceSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  workspaceMenu: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  emptyState: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  createFirstButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
}); 