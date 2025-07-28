import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { WebSearchSource } from '@/lib/services/webSearchService';

interface SourcesAvatarsProps {
  sources?: WebSearchSource[];
  onSourcesClick?: () => void;
  style?: any;
  maxCircles?: number;
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

const SourcesAvatars = memo(function SourcesAvatars({
  sources = [],
  onSourcesClick,
  style,
  maxCircles = 7,
}: SourcesAvatarsProps) {
  const processedSources = useMemo(() => {
    if (!sources || sources.length === 0) return [];
    
    // Remove duplicates based on domain
    const seenDomains = new Set();
    const uniqueSources = sources.filter(source => {
      const domain = extractDomain(source.url);
      if (seenDomains.has(domain)) {
        return false;
      }
      seenDomains.add(domain);
      return true;
    });

    return uniqueSources.slice(0, maxCircles);
  }, [sources, maxCircles]);

  const handleClick = () => {
    if (onSourcesClick) {
      onSourcesClick();
    }
  };

  if (processedSources.length === 0) {
    return null;
  }

  const displaySources = processedSources.slice(0, maxCircles - 1);
  const remainingCount = Math.max(0, processedSources.length - (maxCircles - 1));

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={handleClick}
      activeOpacity={0.7}
    >
      <View style={styles.avatarsContainer}>
        {displaySources.map((source, index) => {
          const domain = extractDomain(source.url);
          const faviconUrl = getFaviconUrl(source.url);
          const fallbackStyle = getRandomGradient(index);
          
          return (
            <View
              key={`${domain}-${index}`}
              style={[
                styles.avatar,
                fallbackStyle,
                index > 0 && styles.avatarOverlap,
              ]}
            >
              {faviconUrl ? (
                <Image
                  source={{ uri: faviconUrl }}
                  style={styles.favicon}
                  onError={() => {
                    // If favicon fails to load, show domain initial
                  }}
                />
              ) : (
                <Text style={styles.domainInitial}>
                  {domain.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          );
        })}
        
        {remainingCount > 0 && (
          <View style={[styles.avatar, styles.remainingCount, displaySources.length > 0 && styles.avatarOverlap]}>
            <Text style={styles.remainingText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.sourcesText}>
        {processedSources.length} source{processedSources.length !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  domainInitial: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  remainingCount: {
    backgroundColor: '#6b7280', // gray-500
  },
  remainingText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  sourcesText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280', // gray-500
  },
});

export default SourcesAvatars; 