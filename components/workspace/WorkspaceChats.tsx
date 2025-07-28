import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { 
  MessageCircle, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  Share, 
  Copy,
  Plus,
  Calendar,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthHandler';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface WorkspaceChatsProps {
  workspace: any;
  threadDetails: any;
  threadFirstMessages?: any;
  loadingThreads?: boolean;
  onCreateChat?: () => void;
  creatingChat?: boolean;
  onRefreshThreads?: () => void;
}

interface ThreadItemProps {
  thread: any;
  index: number;
  workspace: any;
  firstMessage?: string;
  onThreadSelect: (threadId: string) => void;
  onThreadDelete: (threadId: string) => void;
  onThreadShare: (threadId: string) => void;
}

const ThreadItem = React.memo(({ 
  thread, 
  index, 
  workspace, 
  firstMessage, 
  onThreadSelect, 
  onThreadDelete, 
  onThreadShare 
}: ThreadItemProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    
    switch (action) {
      case 'delete':
        Alert.alert(
          'Delete Thread',
          'Are you sure you want to delete this thread? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onThreadDelete(thread.id) },
          ]
        );
        break;
      case 'share':
        onThreadShare(thread.id);
        break;
    }
  };

  return (
    <View style={[styles.threadItem, index > 0 && styles.threadItemBorder]}>
      <TouchableOpacity
        style={styles.threadButton}
        onPress={() => onThreadSelect(thread.id)}
        activeOpacity={0.7}
      >
        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text style={styles.threadTitle} numberOfLines={1}>
              {thread.title || 'Untitled Chat'}
            </Text>
            <Text style={styles.threadTime}>
              {formatRelativeTime(thread.lastMessageAt)}
            </Text>
          </View>
          
          {firstMessage && (
            <Text style={styles.threadPreview} numberOfLines={2}>
              {firstMessage}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(!showMenu)}
        activeOpacity={0.7}
      >
        <MoreHorizontal size={16} color={Colors.textSecondary} />
      </TouchableOpacity>

      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction('share')}
          >
            <Share size={16} color={Colors.textLight} />
            <Text style={styles.menuItemText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuAction('delete')}
          >
            <Trash2 size={16} color="#ef4444" />
            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export default function WorkspaceChats({
  workspace,
  threadDetails,
  threadFirstMessages = {},
  loadingThreads = false,
  onCreateChat,
  creatingChat = false,
  onRefreshThreads,
}: WorkspaceChatsProps) {
  const [threads, setThreads] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  // Process thread details into array
  useEffect(() => {
    if (threadDetails && typeof threadDetails === 'object') {
      const threadArray = Object.values(threadDetails).sort((a: any, b: any) => {
        const dateA = new Date(a.lastMessageAt || a.updated_at || 0);
        const dateB = new Date(b.lastMessageAt || b.updated_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setThreads(threadArray);
    } else {
      setThreads([]);
    }
  }, [threadDetails]);

  const handleThreadSelect = useCallback((threadId: string) => {
    console.log('🚀 WorkspaceChats: Loading thread:', threadId);
    
    // Navigate to main chat page with the thread
    router.push({
      pathname: '/(tabs)',
      params: { threadId: threadId }
    });
  }, [router]);

  const handleThreadDelete = useCallback(async (threadId: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      // Remove from workspace
      if (workspace?.workspace_threads) {
        const updatedThreads = workspace.workspace_threads.filter((id: string) => id !== threadId);
        
        const { error: updateError } = await supabase
          .from('workspaces')
          .update({ workspace_threads: updatedThreads })
          .eq('id', workspace.id);

        if (updateError) throw updateError;
      }

      // Refresh the threads list
      onRefreshThreads?.();
    } catch (error) {
      console.error('Error deleting thread:', error);
      Alert.alert('Error', 'Failed to delete thread');
    }
  }, [workspace, onRefreshThreads]);

  const handleThreadShare = useCallback(async (threadId: string) => {
    try {
      // For now, just show an alert
      Alert.alert('Share Thread', 'Thread sharing will be implemented soon');
    } catch (error) {
      console.error('Error sharing thread:', error);
      Alert.alert('Error', 'Failed to share thread');
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshThreads?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshThreads]);

  const renderThread = useCallback(({ item, index }: { item: any; index: number }) => (
    <ThreadItem
      thread={item}
      index={index}
      workspace={workspace}
      firstMessage={threadFirstMessages[item.id]}
      onThreadSelect={handleThreadSelect}
      onThreadDelete={handleThreadDelete}
      onThreadShare={handleThreadShare}
    />
  ), [workspace, threadFirstMessages, handleThreadSelect, handleThreadDelete, handleThreadShare]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MessageCircle size={48} color={Colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No chats yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a new conversation in this workspace to see it here
      </Text>
      
      {onCreateChat && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={onCreateChat}
          disabled={creatingChat}
          activeOpacity={0.7}
        >
          {creatingChat ? (
            <LoadingSpinner size={16} color="white" />
          ) : (
            <Plus size={16} color="white" />
          )}
          <Text style={styles.createButtonText}>
            {creatingChat ? 'Creating...' : 'Start New Chat'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <LoadingSpinner size={24} />
      <Text style={styles.loadingText}>Loading chats...</Text>
    </View>
  );

  if (loadingThreads) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Chats</Text>
        <Text style={styles.headerCount}>
          {threads.length} chat{threads.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Threads list */}
      {threads.length > 0 ? (
        <View style={styles.threadsList}>
          {threads.map((thread, index) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              index={index}
              workspace={workspace}
              firstMessage={threadFirstMessages[thread.id]}
              onThreadSelect={handleThreadSelect}
              onThreadDelete={handleThreadDelete}
              onThreadShare={handleThreadShare}
            />
          ))}
        </View>
      ) : (
        renderEmptyState()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  headerCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  threadsList: {
    flex: 1,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    position: 'relative',
  },
  threadItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  threadButton: {
    flex: 1,
    marginRight: 8,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    flex: 1,
    marginRight: 8,
  },
  threadTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  threadPreview: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuDropdown: {
    position: 'absolute',
    right: 8,
    top: 44,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purple500,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
}); 