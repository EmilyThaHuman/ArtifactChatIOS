import React, { memo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { X, ExternalLink } from 'lucide-react-native';
import { WebSearchSource } from '@/lib/services/webSearchService';

interface SourcesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sources?: WebSearchSource[];
  title?: string;
}

// Helper function to extract domain from URL
const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

// Helper function to get favicon URL
const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
};

// Helper function to get random gradient colors for fallback
const getRandomGradient = (index: number): { backgroundColor: string } => {
  const gradients = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
  ];
  
  return {
    backgroundColor: gradients[index % gradients.length],
  };
};

const SourceItem = memo(function SourceItem({ 
  source, 
  index 
}: { 
  source: WebSearchSource; 
  index: number; 
}) {
  const domain = extractDomain(source.url);
  const faviconUrl = getFaviconUrl(source.url);
  const fallbackStyle = getRandomGradient(index);

  const handlePress = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(source.url);
      if (supported) {
        await Linking.openURL(source.url);
      } else {
        Alert.alert('Error', 'Unable to open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL');
    }
  }, [source.url]);

  return (
    <TouchableOpacity
      style={styles.sourceItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.sourceHeader}>
        <View style={[styles.sourceIcon, fallbackStyle]}>
          {faviconUrl ? (
            <Image
              source={{ uri: faviconUrl }}
              style={styles.favicon}
              onError={() => {
                // Fallback handled by conditional rendering
              }}
            />
          ) : (
            <Text style={styles.domainInitial}>
              {domain.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceTitle} numberOfLines={2}>
            {source.title}
          </Text>
          <Text style={styles.sourceDomain} numberOfLines={1}>
            {domain}
          </Text>
        </View>
        
        <ExternalLink size={16} color="#6b7280" />
      </View>
      
      {source.description && (
        <Text style={styles.sourceDescription} numberOfLines={3}>
          {source.description}
        </Text>
      )}
      
      {source.published && (
        <Text style={styles.sourceDate}>
          {new Date(source.published).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const SourcesSidebar = memo(function SourcesSidebar({
  isOpen,
  onClose,
  sources = [],
  title = 'Citations',
}: SourcesSidebarProps) {
  // Handle hardware back button on Android
  useEffect(() => {
    const handleCloseAllSidebars = () => {
      if (isOpen) {
        onClose();
      }
    };

    // You could add hardware back button handling here for Android
    // BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      // BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Sources Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {sources.length} source{sources.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Sources List */}
        <ScrollView
          style={styles.sourcesList}
          contentContainerStyle={styles.sourcesContent}
          showsVerticalScrollIndicator={true}
        >
          {sources.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No sources available</Text>
            </View>
          ) : (
            sources.map((source, index) => (
              <SourceItem
                key={`${source.url}-${index}`}
                source={source}
                index={index}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
  },
  countText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  sourcesList: {
    flex: 1,
  },
  sourcesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sourceItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  favicon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  domainInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  sourceInfo: {
    flex: 1,
    marginRight: 8,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  sourceDomain: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  sourceDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  sourceDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default SourcesSidebar; 