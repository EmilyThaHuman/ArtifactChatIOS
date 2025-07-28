import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Code,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Maximize2,
  X,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import GlassContainer from '@/components/ui/GlassContainer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');

interface Canvas {
  id: string;
  messageId: string;
  threadId: string;
  name: string;
  content: any;
  type: string;
  language: string;
  version: number;
  created_at: string;
  metadata: any;
  toolCallType: string;
}

// Component to render content preview
const ContentPreview: React.FC<{ content: any; type: string }> = ({ content, type }) => {
  const getPreviewContent = () => {
    if (!content) return 'No content available';

    // Handle different content types
    if (typeof content === 'string') {
      // For string content, show first 200 characters
      const lines = content.split('\n').slice(0, 8);
      return lines.join('\n');
    } else if (Array.isArray(content)) {
      // For block content, extract text from blocks
      const textContent = content
        .map((block) => {
          if (block.content) {
            if (Array.isArray(block.content)) {
              return block.content.map((item) => item.text || '').join('');
            }
            return block.content;
          }
          return block.text || '';
        })
        .filter(Boolean)
        .slice(0, 6)
        .join('\n');
      return textContent || 'Block content';
    }

    return 'Preview not available';
  };

  const previewText = getPreviewContent();

  return (
    <View style={styles.previewContainer}>
      <Text style={styles.previewText} numberOfLines={8}>
        {previewText}
      </Text>
    </View>
  );
};

// Component for canvas card
const CanvasCard: React.FC<{
  canvas: Canvas;
  onCanvasClick: (canvas: Canvas) => void;
  onCanvasDelete: (messageId: string) => Promise<void>;
}> = ({ canvas, onCanvasClick, onCanvasDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    Alert.alert(
      'Delete Canvas',
      'Are you sure you want to delete this canvas? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onCanvasDelete(canvas.messageId);
            } catch (error) {
              console.error('Error deleting canvas:', error);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getIcon = () => {
    const iconSize = 20;
    const iconColor = Colors.primary;
    const contentType = canvas.type;
    const language = canvas.language;

    if (contentType === 'spreadsheet' || language === 'csv') {
      return <FileSpreadsheet size={iconSize} color={iconColor} />;
    }

    if (contentType === 'code') {
      switch (language?.toLowerCase()) {
        case 'javascript':
        case 'js':
        case 'jsx':
        case 'typescript':
        case 'ts':
        case 'tsx':
          return <FileCode size={iconSize} color={iconColor} />;
        case 'json':
          return <FileJson size={iconSize} color={iconColor} />;
        case 'python':
        case 'py':
          return <FileCode size={iconSize} color={iconColor} />;
        case 'html':
        case 'css':
          return <Code size={iconSize} color={iconColor} />;
        default:
          return <FileCode size={iconSize} color={iconColor} />;
      }
    }

    if (contentType === 'image') {
      return <ImageIcon size={iconSize} color={iconColor} />;
    }

    return <FileText size={iconSize} color={iconColor} />;
  };

  const getDisplayText = () => {
    const contentType = canvas.type;
    const language = canvas.language;

    if (contentType === 'spreadsheet' || language === 'csv') {
      return 'Spreadsheet';
    }

    if (contentType === 'code') {
      switch (language?.toLowerCase()) {
        case 'javascript':
        case 'js':
          return 'JavaScript';
        case 'jsx':
          return 'React JSX';
        case 'typescript':
        case 'ts':
          return 'TypeScript';
        case 'tsx':
          return 'React TSX';
        case 'python':
        case 'py':
          return 'Python';
        case 'json':
          return 'JSON';
        case 'html':
          return 'HTML';
        case 'css':
          return 'CSS';
        default:
          return language?.charAt(0).toUpperCase() + language?.slice(1);
      }
    }

    if (contentType === 'image') {
      return 'Image';
    }

    return 'Document';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <GlassContainer style={styles.canvasCard}>
      {/* Delete button - appears in top right corner */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <X size={16} color={Colors.text} />
        )}
      </TouchableOpacity>

      {/* Content Preview */}
      <View style={styles.canvasContent}>
        <ContentPreview content={canvas.content} type={canvas.type} />
      </View>

      {/* Footer */}
      <View style={styles.canvasFooter}>
        <TouchableOpacity
          style={styles.canvasButton}
          onPress={() => onCanvasClick(canvas)}
        >
          <View style={styles.canvasButtonContent}>
            {getIcon()}
            <Text style={styles.canvasButtonText} numberOfLines={1}>
              {canvas.name || getDisplayText()}
            </Text>
            <Maximize2 size={16} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.canvasDate}>
          {formatDate(canvas.created_at)}
        </Text>
      </View>
    </GlassContainer>
  );
};

// Loading skeleton component
const CanvasCardSkeleton: React.FC = () => (
  <GlassContainer style={styles.canvasCard}>
    <View style={styles.canvasContent}>
      <View style={[styles.skeleton, { height: 16, width: '80%', marginBottom: 8 }]} />
      <View style={[styles.skeleton, { height: 16, width: '60%', marginBottom: 8 }]} />
      <View style={[styles.skeleton, { height: 16, width: '70%', marginBottom: 8 }]} />
      <View style={[styles.skeleton, { height: 16, width: '40%' }]} />
    </View>
    <View style={styles.canvasFooter}>
      <View style={[styles.skeleton, { height: 32, width: '100%', marginBottom: 8 }]} />
      <View style={[styles.skeleton, { height: 12, width: '50%' }]} />
    </View>
  </GlassContainer>
);

export default function CanvasesScreen() {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [allCanvases, setAllCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const CANVASES_PER_PAGE = 10;

  // Handle canvas deletion
  const handleCanvasDelete = useCallback(async (messageId: string) => {
    try {
      console.log('[CanvasesScreen] Deleting canvas from message:', messageId);

      // Update the database to set tool_calls to empty array
      const { error } = await supabase
        .from('thread_messages')
        .update({ tool_calls: [] })
        .eq('message_id', messageId);

      if (error) {
        console.error('[CanvasesScreen] Error deleting canvas:', error);
        throw error;
      }

      // Remove from local state
      setAllCanvases((prev) =>
        prev.filter((canvas) => canvas.messageId !== messageId)
      );
      setCanvases((prev) =>
        prev.filter((canvas) => canvas.messageId !== messageId)
      );

      console.log('[CanvasesScreen] Successfully deleted canvas from message:', messageId);
    } catch (error) {
      console.error('[CanvasesScreen] Failed to delete canvas:', error);
      throw error;
    }
  }, []);

  // Fetch all canvases using the efficient SQL function
  const fetchAllCanvases = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[CanvasesScreen] Fetching canvases with SQL function');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[CanvasesScreen] No authenticated user');
        setAllCanvases([]);
        setCanvases([]);
        setHasMore(false);
        return;
      }

      // First fetch all threads
      const { data: threads, error: threadsError } = await supabase
        .from('threads')
        .select('id, title')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (threadsError) {
        console.error('[CanvasesScreen] Error fetching threads:', threadsError);
        setAllCanvases([]);
        setCanvases([]);
        setHasMore(false);
        return;
      }

      if (!threads || threads.length === 0) {
        console.log('[CanvasesScreen] No threads found');
        setAllCanvases([]);
        setCanvases([]);
        setHasMore(false);
        return;
      }

      // Get all thread IDs
      const threadIds = threads.map((thread) => thread.id).filter(Boolean);

      // Use the efficient SQL function to get all canvas data
      const { data: canvasData, error } = await supabase.rpc(
        'get_user_canvases_by_threads',
        {
          thread_ids: threadIds,
        }
      );

      if (error) {
        console.error('[CanvasesScreen] Error calling get_user_canvases_by_threads:', error);
        setAllCanvases([]);
        setCanvases([]);
        setHasMore(false);
        return;
      }

      console.log(`[CanvasesScreen] Retrieved ${canvasData?.length || 0} canvases from SQL function`);

      // Transform the SQL function results to match our expected format
      const transformedCanvases = (canvasData || []).map((row: any) => {
        // Parse the content with the same priority logic as the web app
        let canvasContent = null;

        try {
          // Try to parse canvas_content as JSON first (for blocks)
          if (
            row.canvas_content &&
            typeof row.canvas_content === 'string' &&
            row.canvas_content.startsWith('[')
          ) {
            canvasContent = JSON.parse(row.canvas_content);
          } else if (row.canvas_content) {
            canvasContent = row.canvas_content;
          } else {
            canvasContent = 'No content available';
          }
        } catch (e) {
          // If JSON parsing fails, use as string
          canvasContent = row.canvas_content || 'No content available';
        }

        return {
          id: `${row.message_id}_${row.tool_call_id}`,
          messageId: row.message_id,
          threadId: row.thread_id,
          name: row.canvas_name || 'Untitled Canvas',
          content: canvasContent,
          type: row.canvas_type || 'text',
          language: row.canvas_language || 'javascript',
          version: row.canvas_version || 1,
          created_at: row.created_at,
          metadata: {
            fromToolCall: true,
            toolCallType: row.tool_call_id.includes('canvas_create')
              ? 'canvas_create'
              : row.tool_call_id.includes('canvas_edit')
                ? 'canvas_edit'
                : 'canvas_stream',
            messageId: row.message_id,
            threadId: row.thread_id,
            fullToolCallData: row.tool_call_data,
          },
          toolCallType: row.tool_call_id.includes('canvas_create')
            ? 'canvas_create'
            : row.tool_call_id.includes('canvas_edit')
              ? 'canvas_edit'
              : 'canvas_stream',
        };
      });

      // Remove duplicates (keep the latest version of each canvas by message ID)
      const uniqueCanvases = transformedCanvases.reduce((acc: Canvas[], canvas: Canvas) => {
        const existing = acc.find((c) => c.messageId === canvas.messageId);
        if (!existing || canvas.version > existing.version) {
          if (existing) {
            const index = acc.indexOf(existing);
            acc[index] = canvas;
          } else {
            acc.push(canvas);
          }
        }
        return acc;
      }, []);

      // Sort by creation date (newest first)
      uniqueCanvases.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log(`[CanvasesScreen] Processed ${uniqueCanvases.length} unique canvases`);

      // Store all canvases and set initial page
      setAllCanvases(uniqueCanvases);
      setCurrentPage(0);
      setHasMore(uniqueCanvases.length > CANVASES_PER_PAGE);

      // Set initial canvases (first page)
      const initialCanvases = uniqueCanvases.slice(0, CANVASES_PER_PAGE);
      setCanvases(initialCanvases);
    } catch (error) {
      console.error('[CanvasesScreen] Error fetching canvases:', error);
      setAllCanvases([]);
      setCanvases([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more canvases for infinite scroll
  const loadMoreCanvases = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = nextPage * CANVASES_PER_PAGE;
      const endIndex = startIndex + CANVASES_PER_PAGE;

      const newCanvases = allCanvases.slice(0, endIndex);
      const hasMoreCanvases = endIndex < allCanvases.length;

      setCurrentPage(nextPage);
      setCanvases(newCanvases);
      setHasMore(hasMoreCanvases);
      setLoadingMore(false);
    }, 300);
  }, [currentPage, loadingMore, hasMore, allCanvases]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllCanvases();
    setRefreshing(false);
  }, [fetchAllCanvases]);

  // Fetch canvases when component mounts
  useEffect(() => {
    fetchAllCanvases();
  }, [fetchAllCanvases]);

  const handleCanvasClick = useCallback((canvas: Canvas) => {
    // TODO: Implement canvas opening functionality
    console.log('[CanvasesScreen] Opening canvas:', canvas.name);
    Alert.alert('Canvas Preview', `Canvas: ${canvas.name}\nType: ${canvas.type}\nLanguage: ${canvas.language}`);
  }, []);

  const renderCanvasItem = ({ item }: { item: Canvas }) => (
    <CanvasCard
      canvas={item}
      onCanvasClick={handleCanvasClick}
      onCanvasDelete={handleCanvasDelete}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingMoreText}>Loading more canvases...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No canvases yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first canvas by asking the AI to generate code, documents, or other content.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={styles.loadingText}>Loading your canvases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats */}
      {!loading && canvases.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Showing {canvases.length} of {allCanvases.length} canvases
            {hasMore && ' (scroll for more)'}
          </Text>
        </View>
      )}

      <FlatList
        data={canvases}
        renderItem={renderCanvasItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        onEndReached={loadMoreCanvases}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  canvasCard: {
    padding: 16,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  canvasContent: {
    marginBottom: 16,
  },
  previewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  previewText: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  canvasFooter: {
    gap: 8,
  },
  canvasButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvasButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  canvasButtonText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  canvasDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 