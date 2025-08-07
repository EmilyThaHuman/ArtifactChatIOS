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
  sources?: any; // More flexible to handle different data structures
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
    console.log('🔍 [SourcesAvatars] Processing sources:', {
      sources,
      sourceType: typeof sources,
      isArray: Array.isArray(sources),
      hasData: !!sources,
      sourcesKeys: sources && typeof sources === 'object' ? Object.keys(sources) : null,
    });
    
    if (!sources) return [];

    // Handle different data structures (matching web app logic)
    let sourceData = sources;

    // If sources is already an array, use it directly
    if (Array.isArray(sources)) {
      sourceData = sources;
    }
    // If sources is a nested object, extract the actual data
    else if (sources.sources && Array.isArray(sources.sources)) {
      // Handle the structure: {sources: [...], hasResults: true}
      sourceData = sources.sources;
      console.log('✅ [SourcesAvatars] Using sources.sources array:', sourceData.length);
    } else if (sources.result?.data) {
      sourceData = sources.result.data;
    } else if (sources.data) {
      sourceData = sources.data;
    } else if (sources.result?.result?.data) {
      sourceData = sources.result.result.data;
    }

    // For the new web search format, filter out the main content (first item with no URL)
    // and only keep the source citations
    if (Array.isArray(sourceData)) {
      sourceData = sourceData.filter((item: any) => item.url && item.url !== null);
    }

    // If sourceData is a string, parse it
    if (typeof sourceData === 'string') {
      const results: any[] = [];
      const entries = sourceData
        .split('\n\n\n')
        .filter((entry: string) => entry.trim());

      for (const entry of entries) {
        const lines = entry.split('\n').filter((line: string) => line.trim());

        let url = '';
        let title = '';
        let description = '';

        for (const line of lines) {
          if (line.startsWith('URL: ')) {
            url = line.replace('URL: ', '').trim();
          } else if (line.startsWith('Title: ')) {
            title = line.replace('Title: ', '').trim();
          } else if (line.startsWith('Description: ')) {
            description = line.replace('Description: ', '').trim();
          }
        }

        if (url && title) {
          results.push({
            url,
            title,
            description,
            favicon: getFaviconUrl(url),
          });
        }
      }

      sourceData = results;
    }

    // If sourceData is already an array, format it
    if (Array.isArray(sourceData)) {
      sourceData = sourceData.map((source: any) => ({
        ...source,
        favicon: source.favicon || getFaviconUrl(source.url),
      }));
    }

    // Check if sourceData is an object with numeric keys (like {0: {...}, 1: {...}, ...})
    if (
      sourceData &&
      typeof sourceData === 'object' &&
      !Array.isArray(sourceData)
    ) {
      // Check if it has numeric keys
      const keys = Object.keys(sourceData);
      const isNumericKeys = keys.every((key) => !isNaN(parseInt(key)));

      if (isNumericKeys) {
        // Convert object with numeric keys to array
        const arrayData: any[] = [];
        for (let i = 0; i < keys.length; i++) {
          if (sourceData[i]) {
            arrayData.push(sourceData[i]);
          }
        }
        sourceData = arrayData
          .map((source: any) => ({
            ...source,
            favicon: source.favicon || (source.url ? getFaviconUrl(source.url) : null),
          }))
          .filter((source: any) => source.url); // Filter out entries without URLs
      }
    }

    if (!Array.isArray(sourceData)) {
      return [];
    }
    
    // Remove duplicates based on domain
    const seenDomains = new Set();
    const uniqueSources = sourceData.filter((source: any) => {
      if (!source.url) return false;
      const domain = extractDomain(source.url);
      if (seenDomains.has(domain)) {
        return false;
      }
      seenDomains.add(domain);
      return true;
    });

    const finalSources = uniqueSources.slice(0, maxCircles);
    console.log('✅ [SourcesAvatars] Final processed sources:', {
      finalCount: finalSources.length,
      originalSourcesType: typeof sources,
      willRender: finalSources.length > 0,
      firstSourcePreview: finalSources[0] ? {
        url: finalSources[0].url,
        title: finalSources[0].title?.substring(0, 50) + '...'
      } : null
    });
    
    return finalSources;
  }, [sources, maxCircles]);

  const handleClick = () => {
    if (onSourcesClick) {
      onSourcesClick();
    }
  };

  console.log('🎯 [SourcesAvatars] Render decision:', {
    processedSourcesLength: processedSources.length,
    willRenderComponent: processedSources.length > 0
  });

  if (processedSources.length === 0) {
    console.log('❌ [SourcesAvatars] Not rendering - no processed sources');
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