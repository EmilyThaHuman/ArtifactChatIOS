import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import {
  History,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Bookmark,
  Copy,
  Link,
  Loader2,
} from 'lucide-react-native';
import { ArtifactLogo } from './ArtifactLogo';

interface Thread {
  id: string;
  title: string;
  updated_at: string;
  metadata?: {
    moved_to_history_at?: string;
    bookmarked?: boolean;
    is_shared_thread?: boolean;
    shared_in_workspace?: boolean;
  };
  is_team?: boolean;
}

interface HistoryGroup {
  label: string;
  threads: Thread[];
}

interface NavChatHistoryProps {
  threads?: Thread[];
  currentThreadId?: string;
  onThreadSelect?: (threadId: string) => void;
  onThreadDelete?: (threadId: string) => void;
  onThreadRename?: (threadId: string, newTitle: string) => void;
  onThreadShare?: (threadId: string) => void;
  onThreadClone?: (threadId: string) => void;
  onToggleBookmark?: (threadId: string) => void;
  isCollapsed?: boolean;
  searchQuery?: string;
}

const initialHistoryGroups: HistoryGroup[] = [
  { label: 'Today', threads: [] },
  { label: 'Yesterday', threads: [] },
  { label: 'Previous 7 days', threads: [] },
  { label: 'Previous 30 days', threads: [] },
  { label: 'Older', threads: [] },
];

export function NavChatHistory({
  threads = [],
  currentThreadId,
  onThreadSelect,
  onThreadDelete,
  onThreadRename,
  onThreadShare,
  onThreadClone,
  onToggleBookmark,
  isCollapsed = false,
  searchQuery = '',
}: NavChatHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Group threads by date
  const historyGroups = useMemo(() => {
    try {
      const movedThreads = threads.filter(t => t.metadata?.moved_to_history_at);
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const groupThreads = (thread: Thread): string | null => {
        const dateField = thread?.updated_at;
        if (!dateField) return null;
        
        try {
          const threadDate = new Date(dateField);
          if (isNaN(threadDate.getTime())) return null;

          if (threadDate.toDateString() === today.toDateString()) return 'Today';
          if (threadDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
          if (threadDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) return 'Previous 7 days';
          if (threadDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) return 'Previous 30 days';
          return 'Older';
        } catch (err) {
          console.error('Error parsing thread date:', err);
          return null;
        }
      };

      // Filter threads and remove duplicates
      const threadIds = new Set();
      const uniqueThreads = threads.filter(thread => {
        if (threadIds.has(thread.id)) return false;
        threadIds.add(thread.id);
        
        // Exclude certain types of threads
        if (thread?.title === 'New Chat') return false;
        if (thread.metadata?.excludeFromNavHistory || thread.metadata?.isScheduledTask) return false;
        
        return true;
      });

      // Filter by search query if provided
      const filteredThreads = searchQuery.trim() 
        ? uniqueThreads.filter(thread =>
            thread.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            thread.id?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : uniqueThreads;

      const groupedThreads = filteredThreads.reduce((acc, thread) => {
        const group = groupThreads(thread);
        if (group) {
          acc[group] = acc[group] || [];
          acc[group].push(thread);
        }
        return acc;
      }, {} as Record<string, Thread[]>);

      return [
        { label: 'Today', threads: groupedThreads['Today'] || [] },
        { label: 'Yesterday', threads: groupedThreads['Yesterday'] || [] },
        { label: 'Previous 7 days', threads: groupedThreads['Previous 7 days'] || [] },
        { label: 'Previous 30 days', threads: groupedThreads['Previous 30 days'] || [] },
        { label: 'Older', threads: groupedThreads['Older'] || [] },
      ];
    } catch (err) {
      console.error('Error grouping threads:', err);
      return initialHistoryGroups;
    }
  }, [threads, searchQuery]);

  // Calculate total threads count
  const totalThreadsCount = useMemo(() => 
    historyGroups.reduce((total, group) => total + (group.threads?.length || 0), 0),
    [historyGroups]
  );

  // Toggle expansion
  const toggleExpansion = useCallback(() => {
    if (isCollapsed) return; // Don't allow expansion when sidebar is collapsed
    setIsExpanded(!isExpanded);
  }, [isExpanded, isCollapsed]);

  // Handle thread selection
  const handleThreadSelect = useCallback((threadId: string) => {
    onThreadSelect?.(threadId);
  }, [onThreadSelect]);

  // Handle thread rename
  const handleThreadRename = useCallback(async (threadId: string, newName: string) => {
    if (!newName.trim()) return;
    
    setIsLoading(true);
    try {
      await onThreadRename?.(threadId, newName.trim());
      setIsRenaming(null);
      setNewTitle('');
    } catch (error) {
      console.error('Error renaming thread:', error);
      Alert.alert('Error', 'Failed to rename thread');
    } finally {
      setIsLoading(false);
    }
  }, [onThreadRename]);

  // Handle thread delete
  const handleThreadDelete = useCallback(async (threadId: string) => {
    Alert.alert(
      'Delete Thread',
      'Are you sure you want to delete this thread? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onThreadDelete?.(threadId);
            } catch (error) {
              console.error('Error deleting thread:', error);
              Alert.alert('Error', 'Failed to delete thread');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [onThreadDelete]);

  // Handle other thread actions
  const handleThreadShare = useCallback((threadId: string) => {
    setOpenDropdownId(null);
    onThreadShare?.(threadId);
  }, [onThreadShare]);

  const handleThreadClone = useCallback((threadId: string) => {
    setOpenDropdownId(null);
    onThreadClone?.(threadId);
  }, [onThreadClone]);

  const handleToggleBookmark = useCallback((threadId: string) => {
    setOpenDropdownId(null);
    onToggleBookmark?.(threadId);
  }, [onToggleBookmark]);

  // Start renaming
  const startRenaming = useCallback((thread: Thread) => {
    setOpenDropdownId(null);
    setIsRenaming(thread.id);
    setNewTitle(thread.title || '');
  }, []);

  // Cancel renaming
  const cancelRenaming = useCallback(() => {
    setIsRenaming(null);
    setNewTitle('');
  }, []);

  // Render thread item
  const renderThreadItem = useCallback((thread: Thread) => {
    const isSelected = currentThreadId === thread.id;
    const isThreadRenaming = isRenaming === thread.id;

    return (
      <View key={thread.id} style={styles.threadContainer}>
        <TouchableOpacity
          style={[styles.threadItem, isSelected && styles.threadItemSelected]}
          onPress={() => !isThreadRenaming && handleThreadSelect(thread.id)}
          disabled={isThreadRenaming}
        >
          <View style={styles.threadContent}>
            {thread.metadata?.bookmarked && (
              <Bookmark size={14} color="#a855f7" style={styles.bookmarkIcon} />
            )}
            
            <ArtifactLogo style={styles.threadIcon} />
            
            {isThreadRenaming ? (
              <TextInput
                style={styles.threadInput}
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={() => handleThreadRename(thread.id, newTitle)}
                onBlur={() => {
                  if (newTitle.trim()) {
                    handleThreadRename(thread.id, newTitle);
                  } else {
                    cancelRenaming();
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

          {!isThreadRenaming && (
            <TouchableOpacity
              style={styles.threadMenuButton}
              onPress={() => setOpenDropdownId(openDropdownId === thread.id ? null : thread.id)}
            >
              <MoreHorizontal size={14} color="#6b7280" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Thread dropdown menu */}
        {openDropdownId === thread.id && (
          <View style={styles.threadDropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleToggleBookmark(thread.id)}
            >
              <Bookmark size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>
                {thread.metadata?.bookmarked ? 'Remove Bookmark' : 'Bookmark'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => startRenaming(thread)}
            >
              <Pencil size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleThreadShare(thread.id)}
            >
              <Link size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>Share as link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleThreadClone(thread.id)}
            >
              <Copy size={16} color="#ffffff" />
              <Text style={styles.dropdownItemText}>Clone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dropdownItem, styles.dropdownItemDestructive]}
              onPress={() => handleThreadDelete(thread.id)}
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
    currentThreadId,
    isRenaming,
    newTitle,
    openDropdownId,
    handleThreadSelect,
    handleThreadRename,
    handleToggleBookmark,
    startRenaming,
    handleThreadShare,
    handleThreadClone,
    handleThreadDelete,
    cancelRenaming,
  ]);

  // Render history group
  const renderHistoryGroup = useCallback((group: HistoryGroup) => {
    if (group.threads.length === 0) return null;

    return (
      <View key={group.label} style={styles.historyGroup}>
        <View style={styles.historyGroupHeader}>
          <Text style={styles.historyGroupLabel}>{group.label}</Text>
        </View>
        {group.threads.map(renderThreadItem)}
      </View>
    );
  }, [renderThreadItem]);

  if (threads.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* History Header */}
      <TouchableOpacity
        style={styles.historyHeader}
        onPress={toggleExpansion}
        disabled={isCollapsed}
      >
        <View style={styles.historyHeaderContent}>
          {totalThreadsCount > 0 ? (
            <View style={styles.historyHeaderIcon}>
              <History size={18} color="#9ca3af" />
              {!isCollapsed && (
                isExpanded ? (
                  <ChevronDown size={18} color="#9ca3af" />
                ) : (
                  <ChevronRight size={18} color="#9ca3af" />
                )
              )}
            </View>
          ) : (
            <History size={18} color="#6b7280" />
          )}
          
          {!isCollapsed && (
            <Text style={styles.historyHeaderText}>
              History {totalThreadsCount > 0 && `(${totalThreadsCount})`}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* History Groups */}
      {isExpanded && !isCollapsed && totalThreadsCount > 0 && (
        <ScrollView 
          style={styles.historyContent} 
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {historyGroups.map(renderHistoryGroup)}
        </ScrollView>
      )}

      {/* No results message */}
      {searchQuery && totalThreadsCount === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            No threads found matching "{searchQuery}"
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  historyHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  historyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyHeaderIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyHeaderText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  historyContent: {
    flex: 1,
    paddingLeft: 8,
  },
  historyGroup: {
    marginBottom: 8,
  },
  historyGroupHeader: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyGroupLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
  threadContainer: {
    position: 'relative',
    marginVertical: 1,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  threadItemSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  threadContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkIcon: {
    flexShrink: 0,
  },
  threadIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
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
    flexShrink: 0,
  },
  threadDropdown: {
    position: 'absolute',
    right: 8,
    top: 32,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 160,
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
  noResults: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default NavChatHistory; 