import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert,
  Share as RNShare,
} from 'react-native';
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Edit,
  Share,
  Check,
  MoreHorizontal,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import SourcesAvatars from '../content/SourcesAvatars';
import { OpenAIIcon } from './OpenAIIcon';

interface ActionButtonsProps {
  isUser: boolean;
  hasToolCalls?: boolean;
  hasCompletedToolCalls?: boolean;
  effectiveIsStreaming?: boolean;
  showButtons: boolean;
  displayContent: string;
  handleStartEditing?: () => void;
  message: any;
  content: string;
  handleModelSwitchAndRerun?: () => Promise<void>;
  handleShareClick?: () => void;
  firecrawlSearchData?: any;
  onSourcesClick?: (sources: any) => void;
  hasFileAttachments?: boolean;
  dalleImageData?: any;
  onImageClick?: (imageData: any) => void;
  canvasData?: any;
  onCanvasClick?: (canvasData: any) => void;
  previousMessageHasDeepResearch?: boolean;
  previousMessageFirecrawlData?: any;
  previousMessageImageData?: any;
  previousMessageCanvasData?: any;
}

const ActionButtons = memo(({
  isUser,
  hasToolCalls = false,
  hasCompletedToolCalls = false,
  effectiveIsStreaming = false,
  showButtons,
  displayContent,
  handleStartEditing,
  message,
  content,
  handleModelSwitchAndRerun,
  handleShareClick,
  firecrawlSearchData,
  onSourcesClick,
  hasFileAttachments = false,
  dalleImageData,
  onImageClick,
  canvasData,
  onCanvasClick,
  previousMessageHasDeepResearch = false,
  previousMessageFirecrawlData,
  previousMessageImageData,
  previousMessageCanvasData,
}: ActionButtonsProps) => {
  const [rating, setRating] = useState<number | null>(message?.rating || null);
  const [isUpdatingRating, setIsUpdatingRating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isOptimisticUpdate = useRef(false);
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  // Update rating from message prop when not optimistic update
  useEffect(() => {
    if (!isOptimisticUpdate.current) {
      setRating(message?.rating || null);
    }
  }, [message?.rating]);

  // Animate button visibility
  useEffect(() => {
    Animated.timing(animatedOpacity, {
      toValue: showButtons ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showButtons, animatedOpacity]);

  // Copy to clipboard function
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      // For React Native, we'll use a simple clipboard implementation
      // You might want to install @react-native-clipboard/clipboard for better support
      Alert.alert('Copied', 'Message copied to clipboard');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      Alert.alert('Error', 'Failed to copy message');
    }
  }, []);

  // Rating update function
  const updateMessageRating = useCallback(async (messageId: string, ratingValue: number | null) => {
    try {
      setIsUpdatingRating(true);

      const { error } = await supabase
        .from('thread_messages')
        .update({
          rating: ratingValue,
          updated_at: new Date().toISOString(),
        })
        .eq('message_id', messageId);

      if (error) {
        console.error('Error updating rating:', error);
        throw error;
      }

      console.log(`Successfully updated rating to ${ratingValue} for message ${messageId}`);
    } catch (error) {
      console.error('Failed to update rating:', error);
      // Revert local state on error
      setRating(rating);
      Alert.alert('Error', 'Failed to update rating');
    } finally {
      setIsUpdatingRating(false);
    }
  }, [rating]);

  // Rating handlers
  const handleThumbsUp = useCallback(async () => {
    if (isUpdatingRating) return;

    const newRating = rating === 1 ? null : 1;
    
    isOptimisticUpdate.current = true;
    setRating(newRating);

    try {
      await updateMessageRating(message.id, newRating);
    } finally {
      isOptimisticUpdate.current = false;
    }
  }, [rating, isUpdatingRating, message.id, updateMessageRating]);

  const handleThumbsDown = useCallback(async () => {
    if (isUpdatingRating) return;

    const newRating = rating === -1 ? null : -1;
    
    isOptimisticUpdate.current = true;
    setRating(newRating);

    try {
      await updateMessageRating(message.id, newRating);
    } finally {
      isOptimisticUpdate.current = false;
    }
  }, [rating, isUpdatingRating, message.id, updateMessageRating]);

  // Share message
  const handleShare = useCallback(async () => {
    try {
      if (handleShareClick) {
        handleShareClick();
      } else {
        await RNShare.share({
          message: displayContent,
          title: 'AI Response',
        });
      }
    } catch (error) {
      console.error('Error sharing message:', error);
    }
  }, [displayContent, handleShareClick]);

  // Model switch and rerun
  const handleModelRerun = useCallback(async () => {
    try {
      if (handleModelSwitchAndRerun) {
        await handleModelSwitchAndRerun();
      }
    } catch (error) {
      console.error('Error rerunning with model:', error);
      Alert.alert('Error', 'Failed to rerun with selected model');
    }
  }, [handleModelSwitchAndRerun]);

  // Hide buttons for assistant messages that follow deep research messages
  if (!isUser && previousMessageHasDeepResearch) {
    return null;
  }

  // Check for tool data
  const hasToolData = firecrawlSearchData || dalleImageData || canvasData;
  const shouldShowButtons = hasToolData ? true : showButtons;

  // Hide buttons for assistant messages with tool calls but no content
  if (
    !isUser &&
    hasToolCalls &&
    (!content || content.trim() === '' || content.trim() === ' ')
  ) {
    return null;
  }

  // Enhanced button visibility
  const showThumbsUp = rating === null || rating === 1;
  const showThumbsDown = rating === null || rating === -1;

  // Determine effective tool data (current or previous message)
  const shouldShowCurrentToolData = !hasToolCalls;
  const effectiveFirecrawlData = 
    (shouldShowCurrentToolData ? firecrawlSearchData : null) || previousMessageFirecrawlData;
  const effectiveDalleData = 
    (shouldShowCurrentToolData ? dalleImageData : null) || previousMessageImageData;
  const effectiveCanvasData = 
    (shouldShowCurrentToolData ? canvasData : null) || previousMessageCanvasData;
  const effectiveHasToolData = 
    effectiveFirecrawlData || effectiveDalleData || effectiveCanvasData;

  console.log('🔍 [ActionButtons] Tool data analysis:', {
    isUser,
    hasToolCalls,
    shouldShowCurrentToolData,
    firecrawlSearchData: !!firecrawlSearchData,
    firecrawlSearchDataSources: firecrawlSearchData?.sources?.length || 0,
    previousMessageFirecrawlData: !!previousMessageFirecrawlData,
    effectiveFirecrawlData: !!effectiveFirecrawlData,
    effectiveFirecrawlDataSources: effectiveFirecrawlData?.sources?.length || 0,
    effectiveHasToolData,
    messageId: message.id,
  });

  const shouldShowAssistantButtons = 
    !message.isStreaming || hasCompletedToolCalls || (content && content.trim());

  console.log('🔍 [ActionButtons] Button visibility analysis:', {
    effectiveHasToolData,
    shouldShowButtons,
    shouldShowAssistantButtons,
    messageId: message.id,
  });



  if (isUser) {
    // User message buttons (right side)
    if (!effectiveIsStreaming) {
      return (
        <Animated.View 
          style={[
            styles.userButtonContainer,
            { opacity: animatedOpacity },
            (firecrawlSearchData || dalleImageData || canvasData) && styles.userButtonContainerWithToolData
          ]}
          pointerEvents={shouldShowButtons ? 'auto' : 'none'}
        >
          {/* Copy Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => copyToClipboard(displayContent)}
            accessibilityLabel="Copy message"
          >
            {isCopied ? (
              <Check size={14} color="#22c55e" />
            ) : (
              <Copy size={14} color="#9ca3af" />
            )}
          </TouchableOpacity>

          {/* Edit Button (only if no file attachments) */}
          {!hasFileAttachments && !dalleImageData && handleStartEditing && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleStartEditing}
              accessibilityLabel="Edit message"
            >
              <Edit size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {/* Model Switch & Rerun Button (only if no file attachments) */}
          {!hasFileAttachments && !dalleImageData && handleModelSwitchAndRerun && (
            <TouchableOpacity
              style={[styles.actionButton, styles.modelSwitchButton]}
              onPress={handleModelRerun}
              accessibilityLabel="Rerun with different model"
            >
              <MoreHorizontal size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </Animated.View>
      );
    }
  } else {
    // Assistant message buttons (left side)
    const finalShouldShowButtons = effectiveHasToolData ? true : shouldShowButtons;
    
    console.log('🔍 [ActionButtons] Assistant render decision:', {
      effectiveHasToolData,
      shouldShowButtons,
      finalShouldShowButtons,
      shouldShowAssistantButtons,
      willRender: shouldShowAssistantButtons && finalShouldShowButtons,
      messageId: message.id,
    });

    return (
      <Animated.View 
        style={[
          styles.assistantButtonContainer,
          { opacity: animatedOpacity },
          effectiveHasToolData ? styles.assistantButtonContainerWithToolData : styles.assistantButtonContainerHover
        ]}
        pointerEvents={shouldShowAssistantButtons && finalShouldShowButtons ? 'auto' : 'none'}
      >
        {/* Rating Buttons */}
        <View style={styles.ratingContainer}>
          {/* Thumbs Up */}
          {showThumbsUp && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                rating === 1 && styles.ratingButtonActive
              ]}
              onPress={handleThumbsUp}
              disabled={isUpdatingRating}
              accessibilityLabel={rating === 1 ? "Remove positive rating" : "Rate positively"}
            >
              {rating === 1 ? (
                // Filled thumbs up
                <ThumbsUp size={14} color="#000000" fill="#000000" />
              ) : (
                <ThumbsUp size={14} color="#9ca3af" />
              )}
            </TouchableOpacity>
          )}

          {/* Thumbs Down */}
          {showThumbsDown && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                rating === -1 && styles.ratingButtonActive
              ]}
              onPress={handleThumbsDown}
              disabled={isUpdatingRating}
              accessibilityLabel={rating === -1 ? "Remove negative rating" : "Rate negatively"}
            >
              {rating === -1 ? (
                // Filled thumbs down
                <ThumbsDown size={14} color="#000000" fill="#000000" />
              ) : (
                <ThumbsDown size={14} color="#9ca3af" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          accessibilityLabel="Share message"
        >
          <Share size={14} color="#9ca3af" />
        </TouchableOpacity>

        {/* Copy Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => copyToClipboard(displayContent)}
          accessibilityLabel="Copy message"
        >
          {isCopied ? (
            <Check size={14} color="#22c55e" />
          ) : (
            <Copy size={14} color="#9ca3af" />
          )}
        </TouchableOpacity>

        {/* Tool Data Buttons */}
        {effectiveFirecrawlData && onSourcesClick ? (
          <>
            {console.log('🎯 [ActionButtons] Rendering SourcesAvatars:', {
              hasEffectiveFirecrawlData: !!effectiveFirecrawlData,
              sourcesCount: effectiveFirecrawlData?.sources?.length || 0,
              hasOnSourcesClick: !!onSourcesClick,
              messageId: message.id
            })}
            <SourcesAvatars
              sources={effectiveFirecrawlData}
              onSourcesClick={() => onSourcesClick(effectiveFirecrawlData)}
              style={styles.toolDataButton}
            />
          </>
        ) : (
          console.log('❌ [ActionButtons] NOT rendering SourcesAvatars:', {
            hasEffectiveFirecrawlData: !!effectiveFirecrawlData,
            hasOnSourcesClick: !!onSourcesClick,
            messageId: message.id
          })
        )}

        {effectiveDalleData && onImageClick && (
          <TouchableOpacity
            style={styles.toolDataButton}
            onPress={() => onImageClick(effectiveDalleData)}
            accessibilityLabel="View generated image"
          >
            <Text style={styles.toolDataButtonText}>🖼️</Text>
          </TouchableOpacity>
        )}

        {effectiveCanvasData && onCanvasClick && (
          <TouchableOpacity
            style={styles.toolDataButton}
            onPress={() => onCanvasClick(effectiveCanvasData)}
            accessibilityLabel="Open canvas"
          >
            <Text style={styles.toolDataButtonText}>📋</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  return null;
});

const styles = StyleSheet.create({
  userButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row-reverse',
    gap: 8,
    transform: [{ translateY: 32 }],
    zIndex: 20,
  },
  userButtonContainerWithToolData: {
    transform: [{ translateY: 64 }],
  },
  assistantButtonContainer: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    gap: 8,
    zIndex: 50,
  },
  assistantButtonContainerWithToolData: {
    top: '100%',
    marginTop: 12,
  },
  assistantButtonContainerHover: {
    bottom: 8,
    transform: [{ translateY: 32 }],
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  ratingButtonActive: {
    backgroundColor: 'transparent',
  },
  modelSwitchButton: {
    // Additional styles for model switch button if needed
  },
  toolDataButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolDataButtonText: {
    fontSize: 12,
  },
});

export { ActionButtons }; 