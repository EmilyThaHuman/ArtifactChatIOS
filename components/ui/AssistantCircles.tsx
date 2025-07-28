import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';

interface Assistant {
  id: string;
  name: string;
  avatar_url?: string;
  image_url?: string;
  model?: string;
}

interface AssistantCirclesProps {
  assistants: Assistant[];
  onAssistantSelect?: (assistantId: string) => void;
  onAddAssistant?: (assistant: Assistant) => void;
  currentAssistantId?: string;
  storedAssistantIds?: string[];
  className?: string;
  limit?: number;
  size?: number;
}

export function AssistantCircles({
  assistants = [],
  onAssistantSelect,
  onAddAssistant,
  currentAssistantId,
  storedAssistantIds = [],
  limit = 3,
  size = 32,
}: AssistantCirclesProps) {
  if (!assistants || assistants.length === 0) {
    return null;
  }

  // Limit the number of assistants to display
  const displayedAssistants = assistants.slice(0, limit);
  const remainingCount = Math.max(0, assistants.length - limit);

  const getZIndex = (index: number) => {
    return limit - index + 10; // Higher index = higher z-index
  };

  const getMarginLeft = (index: number) => {
    if (index === 0) return 0;
    return -(size * 0.4); // 40% overlap
  };

  return (
    <View style={styles.container}>
      {displayedAssistants.map((assistant, index) => (
        <TouchableOpacity
          key={assistant.id}
          style={[
            styles.assistantCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              zIndex: getZIndex(index),
              marginLeft: getMarginLeft(index),
            },
            currentAssistantId === assistant.id && styles.currentAssistant,
          ]}
          onPress={() => onAssistantSelect?.(assistant.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatarContainer, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}>
            <ProviderAvatar
              message={{ assistant_id: assistant.id }}
              isStreaming={false}
              hasContent={true}
              size={size - 8}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* Show count if there are more assistants */}
      {remainingCount > 0 && (
        <View
          style={[
            styles.moreIndicator,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              zIndex: getZIndex(displayedAssistants.length),
              marginLeft: getMarginLeft(displayedAssistants.length),
            },
          ]}
        >
          <Text style={[styles.moreText, { fontSize: size * 0.3 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}

      {/* Add button if there are assistants not in workspace */}
      {storedAssistantIds && storedAssistantIds.length > assistants.length && (
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              zIndex: getZIndex(displayedAssistants.length + (remainingCount > 0 ? 1 : 0)),
              marginLeft: getMarginLeft(displayedAssistants.length + (remainingCount > 0 ? 1 : 0)),
            },
          ]}
          onPress={() => {
            // Find first assistant not in workspace
            const availableAssistant = storedAssistantIds.find(id => 
              !assistants.some(a => a.id === id)
            );
            if (availableAssistant && onAddAssistant) {
              // This would need to be implemented to find the full assistant object
              // For now, we'll just trigger the add flow
            }
          }}
          activeOpacity={0.7}
        >
          <Plus size={size * 0.4} color={Colors.textLight} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantCircle: {
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  currentAssistant: {
    borderColor: '#8b5cf6',
    borderWidth: 3,
  },
  avatarContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIndicator: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#4b5563',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 