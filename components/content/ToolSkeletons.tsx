import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import SourcesAvatarsSkeleton from './SourcesAvatarsSkeleton';
import ImageGenerationSkeleton from './ImageGenerationSkeleton';

interface ToolSkeletonsProps {
  isUser: boolean;
  skipToolCalls?: boolean;
  hasToolCalls?: boolean;
  effectiveIsStreaming?: boolean;
  toolCalls?: any[];
  messageId?: string;
  currentToolCallName?: string;
  currentMessageId?: string;
}

// Shimmer Text Component for "shiny" animated text
const ShimmerText = memo(function ShimmerText({ text }: { text: string }) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [shimmerAnimation]);

  const shimmerStyle = {
    opacity: shimmerAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.5, 1, 0.5],
    }),
  };

  return (
    <View style={styles.shimmerContainer}>
      <Animated.Text style={[styles.shimmerText, shimmerStyle]}>
        {text}
      </Animated.Text>
    </View>
  );
});

const ToolSkeletons = memo(function ToolSkeletons({
  isUser,
  skipToolCalls = false,
  hasToolCalls = false,
  effectiveIsStreaming = false,
  toolCalls = [],
  messageId,
  currentToolCallName,
  currentMessageId,
}: ToolSkeletonsProps) {
  // Don't render for user messages or if tool calls are skipped
  if (isUser || skipToolCalls) {
    return null;
  }

  const isCurrentStreamingMessage = messageId === currentMessageId;



  // Helper functions to identify tool types
  const isImageGenerationTool = (toolName?: string) => {
    if (!toolName) return false;
    return (
      toolName === 'image_gen' ||
      toolName === 'image_generation' ||
      toolName === 'generate_image' ||
      toolName === 'image_edit'
    );
  };

  const isWebSearchTool = (toolName?: string) => {
    if (!toolName) return false;
    return (
      toolName === 'web_search' ||
      toolName === 'search' ||
      toolName === 'firecrawl_search'
    );
  };

  const isCodeInterpreterTool = (toolName?: string) => {
    if (!toolName) return false;
    return (
      toolName === 'code_interpreter' ||
      toolName === 'python' ||
      toolName === 'execute_code'
    );
  };

  // Check for specific tool types in tool calls
  const hasImageGenerationTool = toolCalls.some((call) =>
    isImageGenerationTool(call.function?.name || call.name)
  );

  const hasWebSearchTool = toolCalls.some((call) =>
    isWebSearchTool(call.function?.name || call.name)
  );

  const hasCodeInterpreterTool = toolCalls.some((call) =>
    isCodeInterpreterTool(call.function?.name || call.name)
  );

  // Check if current streaming tool matches specific types
  const isCurrentImageGenerationTool = currentToolCallName && isImageGenerationTool(currentToolCallName);
  const isCurrentWebSearchTool = currentToolCallName && isWebSearchTool(currentToolCallName);
  const isCurrentCodeInterpreterTool = currentToolCallName && isCodeInterpreterTool(currentToolCallName);

  // Helper function to get tool text
  const getToolText = (toolName?: string) => {
    if (!toolName) return 'Processing...';
    
    if (isImageGenerationTool(toolName)) {
      return 'Generating Image...';
    }
    if (isWebSearchTool(toolName)) {
      return 'Searching Web...';
    }
    if (isCodeInterpreterTool(toolName)) {
      return 'Executing Code...';
    }
    return `Running ${toolName}...`;
  };

  // Render skeletons based on tool type and streaming state

  // Show shimmer text immediately when tool call is detected and streaming
  if (
    effectiveIsStreaming &&
    isCurrentStreamingMessage &&
    currentToolCallName
  ) {
    return (
      <View style={styles.container}>
        <ShimmerText text={getToolText(currentToolCallName)} />
      </View>
    );
  }

  // Image Generation Skeleton (when tool call has completed and has results)
  if (
    (hasImageGenerationTool && effectiveIsStreaming && isCurrentStreamingMessage) ||
    (isCurrentImageGenerationTool && effectiveIsStreaming && isCurrentStreamingMessage && hasImageGenerationTool)
  ) {
    return (
      <View style={styles.container}>
        <ShimmerText text={getToolText(currentToolCallName)} />
        <ImageGenerationSkeleton toolName={currentToolCallName} />
      </View>
    );
  }

  // Web Search Skeleton (when tool call has completed and has results)
  if (
    (hasWebSearchTool && effectiveIsStreaming && isCurrentStreamingMessage) ||
    (isCurrentWebSearchTool && effectiveIsStreaming && isCurrentStreamingMessage && hasWebSearchTool)
  ) {
    return (
      <View style={styles.container}>
        <ShimmerText text={getToolText(currentToolCallName)} />
        <SourcesAvatarsSkeleton />
      </View>
    );
  }

  // Code Interpreter Skeleton (when tool call has completed and has results)
  if (
    (hasCodeInterpreterTool && effectiveIsStreaming && isCurrentStreamingMessage) ||
    (isCurrentCodeInterpreterTool && effectiveIsStreaming && isCurrentStreamingMessage && hasCodeInterpreterTool)
  ) {
    return (
      <View style={styles.container}>
        <ShimmerText text={getToolText(currentToolCallName)} />
        <SourcesAvatarsSkeleton />
      </View>
    );
  }

  return null;
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  shimmerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  shimmerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8b5cf6', // Purple shimmer color
    textAlign: 'center',
  },
});

export default ToolSkeletons;