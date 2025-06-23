import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Search, Grid, List, Filter, Menu, MoreHorizontal } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import ConversationCard from './ConversationCard';
import FileCard from './FileCard';
import ImageGrid from './ImageGrid';

interface LibraryContent {
  conversations: any[];
  images: any[];
  documents: any[];
}

interface LibraryViewProps {
  onMenuPress?: () => void;
}

export default function LibraryView({ onMenuPress }: LibraryViewProps) {
  const [content, setContent] = useState<LibraryContent>({
    conversations: [],
    images: [],
    documents: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'conversations' | 'images' | 'documents'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Load conversations (threads)
      const { data: threads } = await supabase
        .from('threads')
        .select(`
          id,
          title,
          updated_at,
          created_at,
          workspace_id,
          workspaces!inner(name)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      // Load workspace files (documents and images)
      const { data: files } = await supabase
        .from('workspace_files')
        .select(`
          id,
          name,
          file_type,
          file_size,
          file_url,
          created_at,
          workspace_id,
          workspaces!inner(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Separate images and documents
      const images = files?.filter(file => 
        file.file_type?.startsWith('image/') || 
        ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name?.split('.').pop()?.toLowerCase() || '')
      ) || [];

      const documents = files?.filter(file => 
        !images.includes(file)
      ) || [];

      setContent({
        conversations: threads || [],
        images,
        documents,
      });
    } catch (error) {
      console.error('Error loading library content:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const getFilteredContent = () => {
    let items: any[] = [];
    
    switch (activeTab) {
      case 'conversations':
        items = content.conversations;
        break;
      case 'images':
        items = content.images;
        break;
      case 'documents':
        items = content.documents;
        break;
      default:
        items = [
          ...content.conversations.map(item => ({ ...item, type: 'conversation' })),
          ...content.images.map(item => ({ ...item, type: 'image' })),
          ...content.documents.map(item => ({ ...item, type: 'document' })),
        ].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
    }

    if (searchQuery) {
      items = items.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items;
  };

  const renderTabButton = (tab: typeof activeTab, label: string, count: number) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderContentItem = (item: any, index: number) => {
    const itemType = item.type || (item.title ? 'conversation' : item.file_type?.startsWith('image/') ? 'image' : 'document');
    
    switch (itemType) {
      case 'conversation':
        return (
          <ConversationCard
            key={`conversation-${item.id}`}
            conversation={item}
            onPress={() => {/* Navigate to conversation */}}
          />
        );
      case 'image':
        return (
          <FileCard
            key={`image-${item.id}`}
            file={item}
            onPress={() => {/* Navigate to image */}}
            variant="image"
          />
        );
      case 'document':
        return (
          <FileCard
            key={`document-${item.id}`}
            file={item}
            onPress={() => {/* Navigate to document */}}
            variant="document"
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your library...</Text>
      </View>
    );
  }

  const filteredContent = getFilteredContent();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <Menu size={24} color={Colors.textLight} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Library</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Search size={20} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MoreHorizontal size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search your library...</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContent}
      >
        {renderTabButton('all', 'All', content.conversations.length + content.images.length + content.documents.length)}
        {renderTabButton('conversations', 'Conversations', content.conversations.length)}
        {renderTabButton('images', 'Images', content.images.length)}
        {renderTabButton('documents', 'Documents', content.documents.length)}
      </ScrollView>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
          onPress={() => setViewMode('list')}
        >
          <List size={18} color={viewMode === 'list' ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'grid' && styles.activeViewMode]}
          onPress={() => setViewMode('grid')}
        >
          <Grid size={18} color={viewMode === 'grid' ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredContent.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No content found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Your library content will appear here'
              }
            </Text>
          </View>
        ) : (
          <View style={[
            styles.contentGrid,
            viewMode === 'grid' && styles.gridLayout
          ]}>
            {filteredContent.map(renderContentItem)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    color: Colors.textLight,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
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
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchPlaceholder: {
    color: Colors.textTertiary,
    fontSize: 16,
    flex: 1,
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    paddingHorizontal: 16,
  },
  tabContent: {
    gap: 8,
    paddingVertical: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTabButton: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeViewMode: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
  },
  contentContainer: {
    flex: 1,
  },
  contentGrid: {
    padding: 16,
    gap: 12,
  },
  gridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    color: Colors.textLight,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 