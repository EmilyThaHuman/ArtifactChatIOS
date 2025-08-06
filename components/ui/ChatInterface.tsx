import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import {
  Menu,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Mic,
  Send,
  Sliders,
  WifiOff,
  Copy,
  Bot,
  Check,
  X,
} from 'lucide-react-native';
import { Colors, Gradients } from '@/constants/Colors';
import { useChat } from '@/hooks/useChat';
import { useAssistantStore } from '@/lib/assistantStore';
import { OpenAIService } from '@/lib/openai';
import { useFileUpload } from '@/lib/content';
import { FileAttachments } from '@/components/content/FileAttachments';
import { ToolSelector } from '@/components/ui/ToolSelector';
import { OpenAIIcon } from '@/components/ui/OpenAIIcon';
import { 
  ClaudeIcon,
  CohereIcon,
  DeepSeekIcon,
  FluxIcon,
  GeminiIcon,
  GroqIcon,
  GrokIcon,
  MistralIcon,
  PerplexityIcon,
  OpenRouterIcon,
} from '@/components/ui/icons';
import { ActionButtons } from '@/components/ui/ActionButtons';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import ChatInput from '@/components/ui/ChatInput';
import { ALL_MODELS, MODEL_CATEGORY_COLORS, ModelInfo } from '@/constants/Models';
import { extractToolData, extractSpecificToolData } from '@/lib/utils/toolDataExtractors';
import ImagePreview from '@/components/content/ImagePreview';
import ToolSkeletons from '@/components/content/ToolSkeletons';
import SourcesAvatarsSkeleton from '@/components/content/SourcesAvatarsSkeleton';
import ImageGenerationSkeleton from '@/components/content/ImageGenerationSkeleton';

interface ChatInterfaceProps {
  onMenuPress: () => void;
  title: string;
  showInput?: boolean;
  showSuggestions?: boolean;
  showHeader?: boolean;
  threadId?: string;
  workspaceId?: string;
  onThreadTitleUpdated?: (threadId: string, newTitle: string) => void;
  pendingMessage?: string | null;
  onPendingMessageSent?: () => void;
}

interface ModelOption {
  id: string;
  name: string;
  version: string;
  color: string;
  model: string;
  description: string;
  category?: string;
  provider: string;
}

const modelOptions: ModelOption[] = ALL_MODELS.map((model: ModelInfo) => ({
  id: model.id,
  name: model.name,
  version: model.version,
  color: MODEL_CATEGORY_COLORS[model.category || 'flagship'],
  model: model.model,
  description: model.description,
  category: model.category,
  provider: model.provider,
}));

const suggestionCards = [
  "Help me write a professional email",
  "Explain quantum computing in simple terms",
  "Create a workout plan for beginners",
  "Debug this React Native code",
];

// Define gradient backgrounds for avatar fallbacks (similar to web app)
const GRADIENT_BACKGROUNDS = [
  ['#ec4899', '#f97316'], // Pink to orange
  ['#3b82f6', '#06b6d4'], // Blue to cyan
  ['#9333ea', '#6366f1'], // Purple to indigo
  ['#10b981', '#34d399'], // Green to emerald
  ['#fbbf24', '#f59e0b'], // Yellow to amber
  ['#ef4444', '#f43f5e'], // Red to rose
  ['#6366f1', '#3b82f6'], // Indigo to blue
  ['#06b6d4', '#14b8a6'], // Cyan to teal
  ['#8b5cf6', '#a855f7'], // Violet to purple
  ['#f59e0b', '#fde047'], // Amber to yellow
];

// Function to determine gradient background based on assistant id or name
const getGradientBackground = (assistant: any) => {
  if (!assistant) return GRADIENT_BACKGROUNDS[0];

  // Use assistant ID if available, otherwise use name
  const idString = assistant.id || assistant.name || "default";

  // Sum the char codes to create a number
  const charSum = idString
    .split("")
    .reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);

  // Use modulo to get an index within our array bounds
  const index = charSum % GRADIENT_BACKGROUNDS.length;

  return GRADIENT_BACKGROUNDS[index];
};

// AssistantAvatar component similar to web app
const AssistantAvatar = ({ assistant, size = 32 }: { assistant: any; size?: number }) => {
  const [imageError, setImageError] = useState(false);
  const gradientColors = getGradientBackground(assistant);

  const handleImageError = () => {
    setImageError(true);
  };

  if (!assistant || (!assistant.avatar_url && imageError)) {
    return (
      <View 
        style={[
          styles.avatarFallback, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
          }
        ]}
      >
        <Bot size={size * 0.6} color="#ffffff" />
      </View>
    );
  }

  if (assistant.avatar_url && !imageError) {
    return (
      <Image
        source={{ uri: assistant.avatar_url }}
        style={[
          styles.avatarImage,
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
          }
        ]}
        onError={handleImageError}
      />
    );
  }

  // Fallback with gradient and initials
  return (
    <View 
      style={[
        styles.avatarFallback,
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: gradientColors[0], // Use first color as fallback
        }
      ]}
    >
      <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>
        {assistant?.name?.[0] || "A"}
      </Text>
    </View>
  );
};

export default function ChatInterface({ 
  onMenuPress, 
  title,
  showInput = true,
  showSuggestions = false,
  showHeader = true,
  threadId,
  workspaceId,
  onThreadTitleUpdated,
  pendingMessage,
  onPendingMessageSent
}: ChatInterfaceProps) {
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showAssistantSelector, setShowAssistantSelector] = useState(false);
  const [activeMessageButtons, setActiveMessageButtons] = useState<string | null>(null);
  
  // Tool call state tracking (similar to web app's thread store)
  const [currentToolCallName, setCurrentToolCallName] = useState<string | null>(null);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Get assistant store data
  const { 
    assistants, 
    currentAssistant, 
    setCurrentAssistant,
    initializeAssistants 
  } = useAssistantStore();

  // Sync selectedModel with currentAssistant's model
  useEffect(() => {
    if (currentAssistant?.model) {
      const matchingModel = modelOptions.find(option => option.model === currentAssistant.model);
      if (matchingModel && matchingModel.id !== selectedModel.id) {
        console.log(`🔄 [ChatInterface] Syncing selectedModel to assistant model: ${currentAssistant.model}`);
        setSelectedModel(matchingModel);
      }
    }
  }, [currentAssistant?.model, modelOptions, selectedModel.id]);


  const {
    messages,
    isLoading,
    isConnected,
    streamingMessageId,
    sendMessage,
    stopGeneration,
    switchModel,
  } = useChat({
    threadId,
    workspaceId,
    model: selectedModel.model,
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onThreadTitleUpdated,
    onToolCall: (toolCall: any, messageId?: string) => {
      // Use the messageId passed from useChat or fall back to streamingMessageId
      const actualMessageId = messageId || streamingMessageId;
      console.log('🛠️ [ChatInterface] Tool call detected:', {
        toolName: toolCall.function?.name || toolCall.name,
        toolId: toolCall.id,
        streamingMessageId,
        actualMessageId,
        currentState: { currentToolCallName, currentMessageId }
      });
      setCurrentToolCallName(toolCall.function?.name || toolCall.name);
      setCurrentMessageId(actualMessageId);
    },
    onToolCallComplete: (toolResult: any) => {
      console.log('✅ [ChatInterface] Tool call completed:', {
        toolCallId: toolResult.tool_call_id,
        toolName: toolResult.name,
        hasResult: !!toolResult.result,
        currentState: { currentToolCallName, currentMessageId }
      });
      // Don't clear immediately - let the skeleton show for a moment
      setTimeout(() => {
        setCurrentToolCallName(null);
        setCurrentMessageId(null);
      }, 1000);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handle pending message auto-send
  useEffect(() => {
    console.log('🧵 ChatInterface: Auto-send useEffect triggered', {
      pendingMessage: !!pendingMessage,
      threadId: !!threadId,
      isLoading,
      pendingMessageValue: pendingMessage
    });
    
    if (pendingMessage && threadId && !isLoading) {
      console.log('🧵 ChatInterface: Auto-sending pending message:', pendingMessage);
      
      // Send the message after a brief delay to ensure UI is ready
      setTimeout(async () => {
        try {
          console.log('🧵 ChatInterface: Calling sendMessage with:', pendingMessage);
          await sendMessage(pendingMessage);
          console.log('🧵 ChatInterface: Message sent successfully');
          
          if (onPendingMessageSent) {
            onPendingMessageSent();
          }
        } catch (error) {
          console.error('🧵 ChatInterface: Error sending pending message:', error);
        }
      }, 500);
    }
  }, [pendingMessage, threadId, isLoading]);

  // Message action handlers
  const handleEditMessage = useCallback((messageId: string) => {
    // TODO: Implement message editing functionality
    Alert.alert('Edit Message', 'Message editing will be implemented in a future update');
  }, []);

  const handleModelRerun = useCallback(async (messageId: string, content: string) => {
    try {
      // Find the message to rerun
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

      Alert.alert(
        'Rerun with Model',
        `Rerun this message with ${selectedModel.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Rerun',
            onPress: async () => {
              try {
                await sendMessage(content);
              } catch (error) {
                console.error('Error rerunning message:', error);
                Alert.alert('Error', 'Failed to rerun message');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleModelRerun:', error);
      Alert.alert('Error', 'Failed to rerun message');
    }
  }, [messages, selectedModel, sendMessage]);

  const handleAssistantSelect = useCallback(async (assistant: any) => {
    try {
      console.log('🤖 [ChatInterface] Switching to assistant:', assistant.name);
      setCurrentAssistant(assistant);
      setShowAssistantSelector(false);
      
      // Also call switchModel to update the backend with the assistant's model
      if (switchModel) {
        await switchModel(assistant.model);
      }
    } catch (error) {
      console.error('❌ [ChatInterface] Failed to switch assistant:', error);
      Alert.alert('Error', 'Failed to switch assistant. Please try again.');
    }
  }, [setCurrentAssistant, switchModel]);

  const handleShareMessage = useCallback((message: any) => {
    try {
      const shareContent = `${message.content}\n\n---\nShared from Artifact Intelligence`;
      
      // Use React Native Share API (already imported at top)
      Alert.alert(
        'Share Message',
        'Share this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              try {
                const { Share } = await import('react-native');
                await Share.share({
                  message: shareContent,
                  title: 'AI Response from Artifact',
                });
              } catch (error) {
                console.error('Error sharing:', error);
                Alert.alert('Error', 'Failed to share message');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sharing message:', error);
      Alert.alert('Error', 'Failed to share message');
    }
  }, []);

  const handleSourcesClick = useCallback((sources: any) => {
    // TODO: Implement sources sidebar functionality
    console.log('Sources clicked:', sources);
    Alert.alert('Sources', 'Sources view will be implemented in a future update');
  }, []);

  const handleImageClick = useCallback((imageData: any) => {
    // TODO: Implement image viewer functionality  
    console.log('Image clicked:', imageData);
    Alert.alert('Image Viewer', 'Image viewer will be implemented in a future update');
  }, []);

  const handleCanvasClick = useCallback((canvasData: any) => {
    // TODO: Implement canvas functionality
    console.log('Canvas clicked:', canvasData);
    Alert.alert('Canvas', 'Canvas view will be implemented in a future update');
  }, []);

  const handleSendMessage = async (content: string, files?: any[], toolChoice?: { toolId: string; toolName: string } | null) => {
    await sendMessage(content, files, toolChoice);
  };

  const handleSuggestionPress = (suggestion: string) => {
    // Send the suggestion directly since ChatInput handles the input state
    handleSendMessage(suggestion);
  };

  const handleModelSelect = async (model: ModelOption) => {
    try {
      // Show the new model immediately for better UX
      setSelectedModel(model);
      setShowModelSelector(false);
      
      // Update the assistant in the database
      console.log(`🔄 [ChatInterface] Switching model to: ${model.model}`);
      const success = await switchModel(model.model);
      
      if (!success) {
        // Revert the selection if the update failed
        console.log(`❌ [ChatInterface] Failed to switch model, reverting selection`);
        // We could revert here, but for now we'll keep the optimistic update
        Alert.alert('Error', 'Failed to update model. Please try again.');
      } else {
        console.log(`✅ [ChatInterface] Successfully switched to model: ${model.name}`);
      }
    } catch (error: any) {
      console.error('❌ [ChatInterface] Error in handleModelSelect:', error);
      Alert.alert('Error', `Failed to switch model: ${error.message}`);
    }
  };

  const handleCopyMessage = (content: string) => {
    // Note: For production, install @react-native-clipboard/clipboard
    console.log('Copy message:', content);
  };

  const getProviderIcon = (provider: string, size: number = 20) => {
    switch (provider) {
      case 'openai':
        return <OpenAIIcon size={size} color="#ffffff" />;
      case 'anthropic':
        return <ClaudeIcon size={size} />;
      case 'google':
        return <GeminiIcon size={size} />;
      case 'cohere':
        return <CohereIcon size={size} />;
      case 'deepseek':
        return <DeepSeekIcon size={size} />;
      case 'groq':
        return <GroqIcon size={size} color="#ffffff" />;
      case 'xai':
        return <GrokIcon size={size} color="#ffffff" />;
      case 'mistral':
        return <MistralIcon size={size} />;
      case 'perplexity':
        return <PerplexityIcon size={size} />;
      case 'openrouter':
        return <OpenRouterIcon size={size} color="#ffffff" />;
      case 'fal':
        return <FluxIcon size={size} color="#ffffff" />;
      case 'flux':
        return <FluxIcon size={size} color="#ffffff" />;
      default:
        return <OpenAIIcon size={size} color="#ffffff" />;
    }
  };

  const markdownStyles = {
    body: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 24,
      backgroundColor: 'transparent',
    },
    paragraph: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 8,
    },
    text: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 24,
    },
    code_inline: {
      backgroundColor: '#374151',
      color: '#e5e7eb',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    code_block: {
      backgroundColor: '#1f2937',
      color: '#e5e7eb',
      padding: 16,
      borderRadius: 8,
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginVertical: 8,
    },
    fence: {
      backgroundColor: '#1f2937',
      color: '#e5e7eb',
      padding: 16,
      borderRadius: 8,
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginVertical: 8,
    },
    blockquote: {
      backgroundColor: 'rgba(55, 65, 81, 0.3)',
      borderLeftWidth: 4,
      borderLeftColor: '#8b5cf6',
      paddingLeft: 16,
      paddingVertical: 12,
      marginVertical: 8,
      borderRadius: 4,
    },
    heading1: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 8,
      lineHeight: 32,
    },
    heading2: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 6,
      lineHeight: 28,
    },
    heading3: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '600',
      marginTop: 8,
      marginBottom: 4,
      lineHeight: 24,
    },
    link: {
      color: '#60a5fa',
      textDecorationLine: 'underline' as const,
    },
    list_item: {
      color: '#ffffff',
      marginVertical: 2,
      fontSize: 16,
      lineHeight: 24,
    },
    bullet_list: {
      marginVertical: 8,
      paddingLeft: 16,
    },
    ordered_list: {
      marginVertical: 8,
      paddingLeft: 16,
    },
  };

  const renderMessage = (message: any, index: number) => {
    const isUser = message.role === 'user';
    const isStreaming = message.isStreaming;
    const hasToolCalls = message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0;
    const hasFileAttachments = message.files && message.files.length > 0;
    
    // Check previous message for tool data context
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const previousMessageHasToolData = false; // Placeholder for now

    // Check if this message should show buttons
    const showButtons = activeMessageButtons === message.id;

    // For action buttons, extract tool data from the PREVIOUS message (like web app)
    // This is because the assistant response message should show sources/images from the previous tool call message
    const currentIndex = messages.findIndex(msg => msg.id === message.id);
    const prevMessage = currentIndex > 0 ? messages[currentIndex - 1] : null;
    
    // Check if previous message has tool calls (this is the pattern from web app)
    const previousMessageHasToolCalls = prevMessage?.toolCalls && Array.isArray(prevMessage.toolCalls) && prevMessage.toolCalls.length > 0;
    
    let firecrawlSearchData = undefined;
    let finalImageData = null;
    let canvasData = undefined;
    
    if (previousMessageHasToolCalls && !isUser) {
      // Extract web search sources from PREVIOUS message's tool calls
      const webSearchToolCall = prevMessage.toolCalls?.find((call: any) => {
        const toolName = call.function?.name || call.name;
        return toolName === 'web_search' || toolName === 'search' || toolName === 'firecrawl_search';
      });

      const webSearchSources = webSearchToolCall?.result?.sources || [];

      // Create firecrawl search data structure for ActionButtons
      firecrawlSearchData = webSearchSources.length > 0 ? {
        sources: webSearchSources,
        hasResults: true,
      } : undefined;

      // Extract image generation results from PREVIOUS message's tool calls
      const imageGenerationResult = prevMessage.toolCalls?.find((call: any) => {
        const toolName = call.function?.name || call.name;
        return toolName === 'image_gen' || toolName === 'image_generation' || toolName === 'generate_image' || toolName === 'image_edit';
      })?.result;

      // Use tool call image data if available
      const toolCallImageData = imageGenerationResult ? {
        url: imageGenerationResult.image_url || imageGenerationResult.url,
        alt: imageGenerationResult.alt_text || 'Generated image',
        prompt: imageGenerationResult.prompt,
        model: imageGenerationResult.model,
        metadata: imageGenerationResult.metadata,
      } : null;

      finalImageData = toolCallImageData;
      canvasData = undefined; // Canvas extraction not yet implemented in iOS
    } else {
      // Fallback: If no previous message with tool calls, check current message (for backwards compatibility)
      const toolData = extractToolData(message);
      const imageToolData = extractSpecificToolData(message, 'imageGen');
      const imageData = imageToolData?.hasImages && imageToolData.images?.length > 0 ? imageToolData.images[0] : null;
      
      // Extract from current message (fallback)
      const webSearchToolCall = message.toolCalls?.find((call: any) => {
        const toolName = call.function?.name || call.name;
        return toolName === 'web_search' || toolName === 'search' || toolName === 'firecrawl_search';
      });

      const webSearchSources = webSearchToolCall?.result?.sources || [];
      firecrawlSearchData = webSearchSources.length > 0 ? {
        sources: webSearchSources,
        hasResults: true,
      } : undefined;

      const imageGenerationResult = message.toolCalls?.find((call: any) => {
        const toolName = call.function?.name || call.name;
        return toolName === 'image_gen' || toolName === 'image_generation' || toolName === 'generate_image' || toolName === 'image_edit';
      })?.result;

      const toolCallImageData = imageGenerationResult ? {
        url: imageGenerationResult.image_url || imageGenerationResult.url,
        alt: imageGenerationResult.alt_text || 'Generated image',
        prompt: imageGenerationResult.prompt,
        model: imageGenerationResult.model,
        metadata: imageGenerationResult.metadata,
      } : null;

      finalImageData = toolCallImageData || imageData;
      canvasData = undefined;
    }

    return (
      <View 
        key={message.id} 
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          !isUser && !isStreaming && styles.assistantMessageWithSpacing,
        ]}
        onTouchStart={() => setActiveMessageButtons(message.id)}
        onTouchEnd={() => setTimeout(() => setActiveMessageButtons(null), 3000)}
      >
        {/* Assistant message layout - full width, no background */}
        {!isUser && (
          <View style={styles.assistantMessageLayout}>
            {/* Provider Avatar for assistant messages */}
            <View style={styles.providerIconWrapper}>
              <ProviderAvatar
                message={message}
                isStreaming={isStreaming}
                hasContent={message.content && message.content.trim().length > 0}
                size={18}
              />
            </View>

            {/* File attachments for assistant messages - positioned ABOVE content like web app */}
            {hasFileAttachments && (
              <View style={styles.messageFileAttachments}>
                <FileAttachments files={message.files} messageId={message.id} />
              </View>
            )}

            {/* Message content wrapper - full width */}
            <View style={styles.assistantMessageContent}>
              {/* No background bubble for assistant messages - content renders directly */}
              <View style={styles.assistantMessageText}>
                <Markdown style={markdownStyles}>
                  {message.content}
                </Markdown>
                
                {/* Tool Skeletons - Show during tool execution */}
                <ToolSkeletons
                  isUser={false}
                  skipToolCalls={false}
                  hasToolCalls={hasToolCalls}
                  effectiveIsStreaming={isStreaming || (streamingMessageId === message.id && currentToolCallName !== null)}
                  toolCalls={message.tool_calls}
                  messageId={message.id}
                  currentToolCallName={currentToolCallName || undefined}
                  currentMessageId={currentMessageId || undefined}
                />
                
                {/* Generated images for assistant messages */}
                {finalImageData && (
                  <View style={styles.messageImageAttachments}>
                    <ImagePreview 
                      imageData={finalImageData} 
                      onImageClick={handleImageClick}
                    />
                  </View>
                )}
              </View>

              {/* Action buttons for assistant messages */}
              <ActionButtons
                isUser={false}
                hasToolCalls={hasToolCalls}
                hasCompletedToolCalls={hasToolCalls && !isStreaming}
                effectiveIsStreaming={isStreaming}
                showButtons={showButtons}
                displayContent={message.content}
                message={message}
                content={message.content}
                handleModelSwitchAndRerun={async () => await handleModelRerun(message.id, message.content)}
                handleShareClick={() => handleShareMessage(message)}
                firecrawlSearchData={firecrawlSearchData}
                onSourcesClick={handleSourcesClick}
                hasFileAttachments={hasFileAttachments}
                dalleImageData={finalImageData}
                onImageClick={handleImageClick}
                canvasData={canvasData}
                onCanvasClick={handleCanvasClick}
                previousMessageHasDeepResearch={false}
                previousMessageFirecrawlData={previousMessageHasToolCalls ? firecrawlSearchData : undefined}
                previousMessageImageData={previousMessageHasToolCalls ? finalImageData : undefined}
                previousMessageCanvasData={previousMessageHasToolCalls ? canvasData : undefined}
              />
            </View>
          </View>
        )}

        {/* User message container - bubble style */}
        {isUser && (
          <View style={styles.userMessageLayout}>
            {/* File attachments for user messages - positioned ABOVE content like web app */}
            {hasFileAttachments && (
              <View style={[styles.messageFileAttachments, styles.userFileAttachments]}>
                <FileAttachments files={message.files} messageId={message.id} />
              </View>
            )}

            <View style={styles.userMessageBubble}>
              <Text style={styles.userMessageText}>
                {message.content}
              </Text>
            </View>

            {/* Action buttons for user messages */}
            {!isStreaming && (
              <ActionButtons
                isUser={true}
                hasToolCalls={false}
                hasCompletedToolCalls={false}
                effectiveIsStreaming={false}
                showButtons={showButtons}
                displayContent={message.content}
                handleStartEditing={() => handleEditMessage(message.id)}
                message={message}
                content={message.content}
                handleModelSwitchAndRerun={async () => await handleModelRerun(message.id, message.content)}
                handleShareClick={() => handleShareMessage(message)}
                hasFileAttachments={hasFileAttachments}
                previousMessageHasDeepResearch={false}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  const renderSuggestionCard = (suggestion: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.suggestionCard}
      onPress={() => handleSuggestionPress(suggestion)}
      activeOpacity={0.7}
    >
      <Text style={styles.suggestionText}>{suggestion}</Text>
    </TouchableOpacity>
  );



  const renderModelSelector = () => (
    <Modal
      visible={showModelSelector}
      transparent
      animationType="fade"
      onRequestClose={() => setShowModelSelector(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowModelSelector(false)}
      >
        <View style={styles.modelSelectorContainer}>
          <Text style={styles.modelSelectorTitle}>Choose Model</Text>
          <ScrollView 
            style={styles.modelOptionsScroll}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.modelOptionsContent}
          >
            {modelOptions.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelOption,
                  selectedModel.id === model.id && styles.selectedModelOption
                ]}
                onPress={() => handleModelSelect(model)}
              >
                <View style={styles.modelIcon}>
                  {getProviderIcon(model.provider, 20)}
                </View>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelProvider}>{model.provider}</Text>
                </View>
                {selectedModel.id === model.id && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderAssistantSelector = () => (
    <Modal
      visible={showAssistantSelector}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAssistantSelector(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAssistantSelector(false)}
      >
        <View style={styles.assistantSelectorContainer}>
          <Text style={styles.assistantSelectorTitle}>Choose Assistant</Text>
          <ScrollView 
            style={styles.assistantOptionsScroll}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.assistantOptionsContent}
          >
            {assistants?.map((assistant) => (
              <TouchableOpacity
                key={assistant.id}
                style={[
                  styles.assistantOption,
                  currentAssistant?.id === assistant.id && styles.selectedAssistantOption
                ]}
                onPress={() => handleAssistantSelect(assistant)}
              >
                <View style={styles.assistantAvatarContainer}>
                  <AssistantAvatar assistant={assistant} size={32} />
                </View>
                <View style={styles.assistantInfo}>
                  <Text style={styles.assistantName}>{assistant.name}</Text>
                  <Text style={styles.assistantModel}>{assistant.model}</Text>
                </View>
                {currentAssistant?.id === assistant.id && (
                  <View style={styles.assistantSelectedIndicator}>
                    <Check size={16} color="#10b981" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderNetworkStatus = () => {
    if (isConnected) return null;

    return (
      <View style={styles.networkStatusBar}>
        <WifiOff size={16} color="#ef4444" />
        <Text style={styles.networkStatusText}>No internet connection</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Network Status */}
      {renderNetworkStatus()}

      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Menu size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modelSelector}
            onPress={() => setShowModelSelector(true)}
          >
            <View style={styles.modelSelectorContent}>
              <View style={styles.providerIconContainer}>
                {getProviderIcon(selectedModel.provider, 16)}
              </View>
              <Text style={styles.modelSelectorText}>
                {selectedModel.name}
              </Text>
            </View>
            <ChevronDown size={16} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowAssistantSelector(true)}
          >
            <AssistantAvatar assistant={currentAssistant} size={28} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && showSuggestions ? (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsGrid}>
                {suggestionCards.map(renderSuggestionCard)}
              </View>
            </View>
          ) : (
                            messages.map((message, index) => renderMessage(message, index))
          )}
        </ScrollView>

        {/* Input Area */}
        {showInput && (
          <ChatInput
            onSendMessage={handleSendMessage}
            placeholder="Ask anything..."
            disabled={false}
            isLoading={isLoading}
            isConnected={isConnected}
            threadId={threadId}
            workspaceId={workspaceId}
            streamingMessageId={streamingMessageId}
            onStopGeneration={stopGeneration}
            showAdvancedFeatures={true}
            maxLength={4000}
          />
        )}
      </KeyboardAvoidingView>

      {/* Model Selector Modal */}
      {renderModelSelector()}
      {renderAssistantSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161618',
  },
  networkStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7f1d1d',
    paddingVertical: 8,
    gap: 8,
  },
  networkStatusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  menuButton: {
    padding: 8,
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  modelSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#525252',
  },
  modelSelectorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    flexGrow: 1,
    width: '100%',
    maxWidth: 1024, // Max width matching web app
    alignSelf: 'center',
  },
  messageContainer: {
    width: '100%',
    marginVertical: 4,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    position: 'relative',
  },
  userMessage: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
    marginLeft: '15%',
  },
  aiMessage: {
    backgroundColor: '#1f2937',
    alignSelf: 'flex-start',
    marginRight: '15%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#ffffff',
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  streamingText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontStyle: 'italic',
  },
  copyButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  suggestionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  suggestionsGrid: {
    width: '100%',
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  suggestionText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelSelectorContainer: {
    backgroundColor: '#353535',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    minWidth: 280,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#525252',
  },
  modelOptionsScroll: {
    maxHeight: 400,
  },
  modelOptionsContent: {
    paddingBottom: 8,
  },
  modelSelectorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
    gap: 12,
  },
  selectedModelOption: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  modelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#525252',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modelProvider: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  messageFileAttachments: {
    marginTop: 8,
  },
  userFileAttachments: {
    marginBottom: 12, // Add more spacing between file attachments and user message
  },
  // New message styles matching web app
  userMessageContainer: {
    marginVertical: 8,
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    marginVertical: 8,
    justifyContent: 'flex-start',
    width: '100%',
  },
  assistantMessageWithSpacing: {
    marginBottom: 16,
  },
  assistantMessageLayout: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 8,
  },
  providerIconWrapper: {
    marginRight: 12,
    marginTop: 16, // Push avatar down to align with first line of text
  },
  assistantMessageContent: {
    flex: 1,
    width: '100%',
  },
  assistantMessageText: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 0,
    width: '100%',
  },
  userMessageLayout: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 16,
  },
  userMessageBubble: {
    backgroundColor: '#2A2A2D',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    alignSelf: 'flex-end',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#525252', // Default background for fallback
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  avatarInitial: {
    color: '#ffffff',
  },
  assistantSelectorContainer: {
    backgroundColor: '#353535',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    minWidth: 280,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#525252',
  },
  assistantSelectorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  assistantOptionsScroll: {
    maxHeight: 400,
  },
  assistantOptionsContent: {
    paddingBottom: 8,
  },
  assistantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
    gap: 12,
  },
  selectedAssistantOption: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  assistantAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  assistantInfo: {
    flex: 1,
  },
  assistantName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  assistantModel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '400',
  },
  assistantSelectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageImageAttachments: {
    marginTop: 8,
  },
}); 