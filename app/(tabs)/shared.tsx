import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Users, ExternalLink } from 'lucide-react-native';
import { Colors, Gradients } from '@/constants/Colors';
import SearchBar from '@/components/ui/SearchBar';
import GlassContainer from '@/components/ui/GlassContainer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SharedContent {
  id: string;
  title: string;
  type: 'canvas' | 'conversation' | 'document';
  sharedBy: string;
  sharedAt: string;
  memberCount: number;
  lastActivity: string;
}

export default function SharedScreen() {
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSharedContent();
  }, []);

  const loadSharedContent = async () => {
    try {
      // Mock data for now - replace with actual API calls
      const mockData: SharedContent[] = [
        {
          id: '1',
          title: 'Marketing Campaign Strategy',
          type: 'canvas',
          sharedBy: 'Sarah Johnson',
          sharedAt: '2024-01-15T10:00:00Z',
          memberCount: 5,
          lastActivity: '2024-01-15T14:30:00Z',
        },
        {
          id: '2',
          title: 'Product Roadmap Discussion',
          type: 'conversation',
          sharedBy: 'Mike Chen',
          sharedAt: '2024-01-14T09:15:00Z',
          memberCount: 8,
          lastActivity: '2024-01-15T11:20:00Z',
        },
        {
          id: '3',
          title: 'Brand Guidelines 2024',
          type: 'document',
          sharedBy: 'Emma Wilson',
          sharedAt: '2024-01-13T16:45:00Z',
          memberCount: 12,
          lastActivity: '2024-01-14T13:10:00Z',
        },
      ];
      
      setSharedContent(mockData);
    } catch (error) {
      console.error('Error loading shared content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSharedContent();
    setRefreshing(false);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'canvas':
        return <ExternalLink size={20} color={Colors.primary} />;
      case 'conversation':
        return <Share2 size={20} color={Colors.accent} />;
      case 'document':
        return <Share2 size={20} color={Colors.success} />;
      default:
        return <Share2 size={20} color={Colors.textSecondary} />;
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'canvas':
        return Colors.primary;
      case 'conversation':
        return Colors.accent;
      case 'document':
        return Colors.success;
      default:
        return Colors.textSecondary;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient colors={Gradients.secondary} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Shared Canvases</Text>
          <Text style={styles.headerSubtitle}>
            Collaborate on shared content with your team
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderSharedItem = (item: SharedContent) => (
    <TouchableOpacity key={item.id} activeOpacity={0.7}>
      <GlassContainer style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: getContentTypeColor(item.type) + '20' }]}>
            {getContentTypeIcon(item.type)}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardSharedBy}>
              Shared by {item.sharedBy}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardMetadata}>
          <View style={styles.metadataItem}>
            <Users size={14} color={Colors.textSecondary} />
            <Text style={styles.metadataText}>
              {item.memberCount} members
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataText}>
              Active {formatTimeAgo(item.lastActivity)}
            </Text>
          </View>
        </View>
      </GlassContainer>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={styles.loadingText}>Loading shared content...</Text>
        </View>
      );
    }

    const filteredContent = sharedContent.filter(item =>
      searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sharedBy.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredContent.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Share2 size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>No shared content</Text>
          <Text style={styles.emptyStateMessage}>
            When team members share canvases or conversations with you, they'll appear here.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.contentList}>
          {filteredContent.map(renderSharedItem)}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search shared content..."
      />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: 8,
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentList: {
    padding: 16,
  },
  contentCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cardSharedBy: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cardMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});