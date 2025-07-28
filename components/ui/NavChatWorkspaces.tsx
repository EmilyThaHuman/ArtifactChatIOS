import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import {
  Folder,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Bookmark,
  Copy,
  Link,
  X,
  Loader2,
} from 'lucide-react-native';
import { ArtifactLogo } from './ArtifactLogo';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  is_personal?: boolean;
  is_home?: boolean;
  workspace_threads?: string[];
  color?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface Thread {
  id: string;
  title: string;
  updated_at: string;
  metadata?: any;
  workspace_id?: string;
}

interface NavChatWorkspacesProps {
  workspaces?: Workspace[];
  currentWorkspace?: Workspace;
  user?: any;
  threads?: Thread[];
  onWorkspaceSelect?: (workspaceId: string) => void;
  onThreadSelect?: (threadId: string) => void;
  onCreateChat?: (workspaceId: string) => void;
  isCollapsed?: boolean;
}

export function NavChatWorkspaces({
  workspaces = [],
  currentWorkspace,
  user,
  threads = [],
  onWorkspaceSelect,
  onThreadSelect,
  onCreateChat,
  isCollapsed = false,
}: NavChatWorkspacesProps) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get threads for a specific workspace
  const getWorkspaceThreads = useCallback((workspaceId: string): Thread[] => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace?.workspace_threads) return [];
    
    return threads.filter(thread => 
      workspace.workspace_threads?.includes(thread.id) ||
      thread.workspace_id === workspaceId
    );
  }, [workspaces, threads]);

  // Toggle workspace expansion
  const toggleWorkspaceExpansion = useCallback((workspaceId: string) => {
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  }, []);

  // Handle workspace selection
  const handleWorkspaceSelect = useCallback((workspaceId: string) => {
    onWorkspaceSelect?.(workspaceId);
  }, [onWorkspaceSelect]);

  // Handle thread selection
  const handleThreadSelect = useCallback((threadId: string) => {
    onThreadSelect?.(threadId);
  }, [onThreadSelect]);

  // Handle creating new chat in workspace
  const handleCreateChat = useCallback(async (workspaceId: string) => {
    setIsLoading(true);
    try {
      await onCreateChat?.(workspaceId);
    } finally {
      setIsLoading(false);
    }
  }, [onCreateChat]);

  // Handle thread rename
  const handleThreadRename = useCallback(async (threadId: string, newName: string) => {
    // Implementation would go here
    console.log('Rename thread:', threadId, newName);
    setIsRenaming(null);
    setNewTitle('');
  }, []);

  // Handle thread delete
  const handleThreadDelete = useCallback(async (threadId: string) => {
    Alert.alert(
      'Delete Thread',
      'Are you sure you want to delete this thread?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implementation would go here
            console.log('Delete thread:', threadId);
          },
        },
      ]
    );
  }, []);

  // Get workspace color
  const getWorkspaceColor = useCallback((workspace: Workspace) => {
    return workspace.color || (workspace.is_personal ? '#9333ea' : '#3b82f6');
  }, []);

  // Render workspace avatar
  const renderWorkspaceAvatar = useCallback((workspace: Workspace) => {
    const color = getWorkspaceColor(workspace);
    
    if (workspace.avatar_url) {
      return (
        <Image
          source={{ uri: workspace.avatar_url }}
          style={[styles.workspaceAvatar, { backgroundColor: color }]}
          onError={() => console.log('Workspace avatar failed to load')}
        />
      );
    }

    const IconComponent = workspace.is_personal ? Folder : Users;
    return (
      <View style={[styles.workspaceAvatar, { backgroundColor: color }]}>
        <IconComponent size={16} color="#ffffff" />
      </View>
    );
  }, [getWorkspaceColor]);

  // Render thread item
  const renderThreadItem = useCallback((thread: Thread, workspaceId: string) => {
    const isExpanded = expandedWorkspaces.has(workspaceId);
    if (!isExpanded) return null;

    return (
      <View key={thread.id} style={styles.threadContainer}>
        <TouchableOpacity
          style={styles.threadItem}
          onPress={() => handleThreadSelect(thread.id)}
        >
          <View style={styles.threadContent}>
            <ArtifactLogo style={styles.threadIcon} />
            {isRenaming === thread.id ? (
              <TextInput
                style={styles.threadInput}
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={() => handleThreadRename(thread.id, newTitle)}
                onBlur={() => {
                  if (newTitle.trim()) {
                    handleThreadRename(thread.id, newTitle);
                  } else {
                    setIsRenaming(null);
                    setNewTitle('');
                  }
                }}
                autoFocus
                placeholder="Thread name"
                placeholderTextColor="#6b7280"
              />
            ) : (
              <Text style={styles.threadTitle} numberOfLines={1}>
                {thread.title || 'Untitled Chat'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.threadMenuButton}
            onPress={() => setOpenDropdownId(openDropdownId === thread.id ? null : thread.id)}
          >
            <MoreHorizontal size={16} color="#6b7280" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Thread dropdown menu */}
        {openDropdownId === thread.id && (
          <View style={styles.threadDropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setIsRenaming(thread.id);
                setNewTitle(thread.title || '');
                setOpenDropdownId(null);
              }}
            >
              <Pencil size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>Rename</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                // Handle bookmark toggle
                setOpenDropdownId(null);
              }}
            >
              <Bookmark size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>
                {thread.metadata?.bookmarked ? 'Remove Bookmark' : 'Bookmark'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                // Handle share
                setOpenDropdownId(null);
              }}
            >
              <Link size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                // Handle clone
                setOpenDropdownId(null);
              }}
            >
              <Copy size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>Clone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, styles.dropdownItemDestructive]}
              onPress={() => {
                setOpenDropdownId(null);
                handleThreadDelete(thread.id);
              }}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text style={[styles.dropdownItemText, styles.dropdownItemDestructiveText]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [
    expandedWorkspaces,
    isRenaming,
    newTitle,
    openDropdownId,
    handleThreadSelect,
    handleThreadRename,
    handleThreadDelete,
  ]);

  // Render workspace item
  const renderWorkspaceItem = useCallback((workspace: Workspace) => {
    const workspaceThreads = getWorkspaceThreads(workspace.id);
    const isExpanded = expandedWorkspaces.has(workspace.id);
    const isSelected = currentWorkspace?.id === workspace.id;

    return (
      <View key={workspace.id} style={styles.workspaceContainer}>
        <TouchableOpacity
          style={[styles.workspaceItem, isSelected && styles.workspaceItemSelected]}
          onPress={() => handleWorkspaceSelect(workspace.id)}
        >
          <View style={styles.workspaceContent}>
            {renderWorkspaceAvatar(workspace)}
            
            {!isCollapsed && (
              <>
                <Text style={styles.workspaceName} numberOfLines={1}>
                  {workspace.name}
                </Text>
                
                <View style={styles.workspaceActions}>
                  {workspaceThreads.length > 0 && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => toggleWorkspaceExpansion(workspace.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} color="#9ca3af" />
                      ) : (
                        <ChevronRight size={16} color="#9ca3af" />
                      )}
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.addChatButton}
                    onPress={() => handleCreateChat(workspace.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={16} color="#9ca3af" />
                    ) : (
                      <Plus size={16} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Workspace threads */}
        {!isCollapsed && workspaceThreads.map(thread => 
          renderThreadItem(thread, workspace.id)
        )}
      </View>
    );
  }, [
    getWorkspaceThreads,
    expandedWorkspaces,
    currentWorkspace,
    isCollapsed,
    isLoading,
    renderWorkspaceAvatar,
    handleWorkspaceSelect,
    toggleWorkspaceExpansion,
    handleCreateChat,
    renderThreadItem,
  ]);

  if (workspaces.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No workspaces found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isCollapsed && (
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Projects</Text>
        </View>
      )}
      
      <ScrollView 
        style={styles.workspacesList} 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {workspaces.map(renderWorkspaceItem)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 14,
  },
  workspacesList: {
    flex: 1,
  },
  workspaceContainer: {
    marginBottom: 4,
  },
  workspaceItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  workspaceItemSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  workspaceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workspaceAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  workspaceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandButton: {
    padding: 4,
  },
  addChatButton: {
    padding: 4,
  },
  threadContainer: {
    position: 'relative',
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 6,
  },
  threadContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  threadIcon: {
    width: 16,
    height: 16,
  },
  threadTitle: {
    flex: 1,
    color: '#d1d5db',
    fontSize: 13,
  },
  threadInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    backgroundColor: '#374151',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  threadMenuButton: {
    padding: 4,
  },
  threadDropdown: {
    position: 'absolute',
    right: 8,
    top: 32,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 150,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  dropdownItemDestructive: {
    // Additional styling for destructive actions
  },
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 14,
  },
  dropdownItemDestructiveText: {
    color: '#ef4444',
  },
});

export default NavChatWorkspaces; 