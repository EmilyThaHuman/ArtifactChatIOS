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
} from 'lucide-react-native';
import { Colors, Gradients } from '@/constants/Colors';
import { useChat } from '@/hooks/useChat';
import { OpenAIService } from '@/lib/openai';
import { useFileUpload } from '@/lib/content';
import { FileAttachments } from '@/components/content/FileAttachments';
import { ToolSelector } from '@/components/ui/ToolSelector';
import { OpenAIIcon } from '@/components/ui/OpenAIIcon';
import { ActionButtons } from '@/components/ui/ActionButtons';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';
import { OPENAI_MODEL_INFO, MODEL_CATEGORY_COLORS, ModelInfo } from '@/constants/Models';

interface ChatInterfaceProps {
  onMenuPress: () => void;
  title: string;
  showInput?: boolean;
  showSuggestions?: boolean;
  threadId?: string;
  workspaceId?: string;
  onThreadTitleUpdated?: (threadId: string, newTitle: string) => void;
}

interface ModelOption {
  id: string;
  name: string;
  version: string;
  color: string;
  model: string;
  description: string;
  category?: string;
}

const modelOptions: ModelOption[] = OPENAI_MODEL_INFO.map(model => ({
  id: model.id,
  name: model.name,
  version: model.version,
  color: MODEL_CATEGORY_COLORS[model.category || 'flagship'],
  model: model.model,
  description: model.description,
  category: model.category,
}));

const suggestionCards = [
  "Help me write a professional email",
  "Explain quantum computing in simple terms",
  "Create a workout plan for beginners",
  "Debug this React Native code",
];

export default function ChatInterface({ 
  onMenuPress, 
  title,
  showInput = true,
  showSuggestions = false,
  threadId,
  workspaceId,
  onThreadTitleUpdated
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // File upload hook
  const {
    files,
    isUploading,
    pickDocument,
    pickImage,
    removeFile,
    clearFiles
  } = useFileUpload(threadId, workspaceId);

  // Tool state management
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [selectedImageStyle, setSelectedImageStyle] = useState<any>(null);

  // Tool handlers
  const handleToolChange = useCallback((toolId: string | null) => {
    setActiveToolId(toolId);
    // TODO: Implement tool-specific logic
  }, []);

  const handleStyleSelection = useCallback((toolId: string, style: any) => {
    setSelectedImageStyle(style);
    // TODO: Store style for next image generation
  }, []);

  const handleShowAuthOverlay = useCallback((feature: string) => {
    Alert.alert('Feature Locked', `Please upgrade to access ${feature}.`);
  }, []);

  const {
    messages,
    isLoading,
    isConnected,
    streamingMessageId,
    sendMessage,
    stopGeneration,
  } = useChat({
    threadId,
    workspaceId,
    model: selectedModel.model,
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onThreadTitleUpdated,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const messageContent = inputText.trim();
    const attachedFiles = files.filter(f => f.status === 'completed');
    
    setInputText('');
    clearFiles(); // Clear files after sending
    
    await sendMessage(messageContent, attachedFiles);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const handleModelSelect = (model: ModelOption) => {
    setSelectedModel(model);
    setShowModelSelector(false);
  };

  const handleCopyMessage = (content: string) => {
    // Note: For production, install @react-native-clipboard/clipboard
    console.log('Copy message:', content);
  };

  const markdownStyles = {
    body: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 22,
    },
    code_inline: {
      backgroundColor: '#374151',
      color: '#f3f4f6',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
    },
    code_block: {
      backgroundColor: '#1f2937',
      color: '#f3f4f6',
      padding: 12,
      borderRadius: 8,
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    fence: {
      backgroundColor: '#1f2937',
      color: '#f3f4f6',
      padding: 12,
      borderRadius: 8,
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    blockquote: {
      backgroundColor: '#374151',
      borderLeftWidth: 4,
      borderLeftColor: '#8b5cf6',
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    heading1: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
      marginVertical: 8,
    },
    heading2: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 6,
    },
    heading3: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 4,
    },
    link: {
      color: '#60a5fa',
      textDecorationLine: 'underline' as const,
    },
    list_item: {
      color: '#ffffff',
      marginVertical: 2,
    },
    bullet_list: {
      marginVertical: 4,
    },
    ordered_list: {
      marginVertical: 4,
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

    // State for button visibility (simulating hover)
    const [showButtons, setShowButtons] = useState(false);

    return (
      <View 
        key={message.id} 
        style={[
          styles.messageContainer,
          isUser && styles.userMessageContainer,
          !isUser && styles.assistantMessageContainer,
          !isUser && !isStreaming && styles.assistantMessageWithSpacing,
          (message.webSearchData || message.imageData || message.canvasData) && styles.messageContainerWithToolData
        ]}
        onTouchStart={() => setShowButtons(true)}
        onTouchEnd={() => setTimeout(() => setShowButtons(false), 3000)}
      >
        {/* Assistant message container with avatar */}
        {!isUser && (
          <View style={styles.assistantMessageLayout}>
            {/* Provider Avatar for assistant messages */}
            <View style={styles.providerAvatarContainer}>
              <ProviderAvatar
                message={message}
                isStreaming={isStreaming}
                hasContent={message.content && message.content.trim().length > 0}
                size={20}
              />
            </View>

            {/* Message content wrapper */}
            <View style={styles.assistantMessageContent}>
              <View style={[
                styles.messageBubble,
                styles.assistantMessageBubble,
                hasToolCalls && styles.assistantMessageBubbleWithTools
              ]}>
                <Markdown style={markdownStyles}>
                  {message.content}
                </Markdown>
                
                {isStreaming && (
                  <View style={styles.streamingIndicator}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                    <Text style={styles.streamingText}>Generating...</Text>
                  </View>
                )}
                
                {/* File attachments for assistant messages */}
                {hasFileAttachments && (
                  <View style={styles.messageFileAttachments}>
                    <FileAttachments files={message.files} messageId={message.id} />
                  </View>
                )}
              </View>

                             {/* Action buttons for assistant messages */}
               <ActionButtons
                 isUser={false}
                 hasToolCalls={hasToolCalls}
                 hasCompletedToolCalls={hasToolCalls}
                 effectiveIsStreaming={isStreaming}
                 showButtons={showButtons}
                 displayContent={message.content}
                 message={message}
                 content={message.content}
                 handleModelSwitchAndRerun={async () => await handleModelRerun(message.id, message.content)}
                                   handleShareClick={() => handleShareMessage(message)}
                  firecrawlSearchData={undefined}
                  onSourcesClick={handleSourcesClick}
                  hasFileAttachments={hasFileAttachments}
                  dalleImageData={undefined}
                  onImageClick={handleImageClick}
                  canvasData={undefined}
                  onCanvasClick={handleCanvasClick}
                 previousMessageHasDeepResearch={false}
                 previousMessageFirecrawlData={undefined}
                 previousMessageImageData={undefined}
                 previousMessageCanvasData={undefined}
               />
            </View>
          </View>
        )}

        {/* User message container */}
        {isUser && (
          <View style={styles.userMessageLayout}>
            <View style={[styles.messageBubble, styles.userMessageBubble]}>
              <Text style={styles.userMessageText}>
                {message.content}
              </Text>
              
              {/* File attachments for user messages */}
              {hasFileAttachments && (
                <View style={styles.messageFileAttachments}>
                  <FileAttachments files={message.files} messageId={message.id} />
                </View>
              )}
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

  // Get file background color based on extension (matching web app)
  const getFileBackgroundColor = (filename: string) => {
    if (!filename) return '#3b82f6'; // blue-500

    const extension = filename.split('.').pop()?.toLowerCase();

    // PDF files - red
    if (extension === 'pdf') return '#ef4444'; // red-500
    
    // Image files - blue
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
      return '#3b82f6'; // blue-500
    }
    
    // Code files - blue
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'php'].includes(extension || '')) {
      return '#3b82f6'; // blue-500
    }
    
    // JSON files - blue
    if (['json'].includes(extension || '')) return '#3b82f6'; // blue-500
    
    // Text/Document files - blue
    if (['txt', 'md', 'doc', 'docx', 'rtf'].includes(extension || '')) {
      return '#3b82f6'; // blue-500
    }
    
    // Spreadsheet files - green
    if (['csv', 'xls', 'xlsx'].includes(extension || '')) return '#22c55e'; // green-500
    
    // Archive files - purple
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return '#a855f7'; // purple-500
    
    // Audio files - amber
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma', 'amr'].includes(extension || '')) {
      return '#f59e0b'; // amber-500
    }
    
    // Video files - purple
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) return '#a855f7'; // purple-500
    
    // Default - blue
    return '#3b82f6'; // blue-500
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Return appropriate icon character for each file type
    if (extension === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) return '🖼️';
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension || '')) return '⚛️';
    if (['html', 'css'].includes(extension || '')) return '🌐';
    if (['py'].includes(extension || '')) return '🐍';
    if (['java'].includes(extension || '')) return '☕';
    if (['json'].includes(extension || '')) return '📋';
    if (['txt', 'md'].includes(extension || '')) return '📝';
    if (['csv', 'xls', 'xlsx'].includes(extension || '')) return '📊';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return '🗜️';
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension || '')) return '🎵';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) return '🎬';
    
    return '📄'; // Default file icon
  };

  const renderFilePreview = (file: any, index: number) => {
    const isImage = file.isImage || file.type?.startsWith('image/');
    const fileIsUploading = file.status === 'uploading' || file.status === 'loading' || isUploading;
    
    if (isImage && file.publicUrl) {
      // Image preview - 56px (w-14 h-14 equivalent) with rounded corners
      return (
        <View key={file.id} style={styles.imagePreview}>
                     <Image
             source={{ uri: file.publicUrl }}
             style={[
               styles.imagePreviewImage,
               { opacity: fileIsUploading ? 0.75 : 1 }
             ]}
             resizeMode="cover"
           />
           
           {/* Spinner overlay for uploading images */}
           {fileIsUploading && (
            <View style={styles.imageSpinnerOverlay}>
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          )}
          
          {/* Remove button */}
          <TouchableOpacity
            style={styles.imageRemoveButton}
            onPress={() => removeFile(file.id)}
          >
            <Text style={styles.imageRemoveText}>×</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Document file preview - macOS style
    const fileBackgroundColor = getFileBackgroundColor(file.name);
    const fileIcon = getFileIcon(file.name);
    const isPdf = file.name?.toLowerCase().endsWith('.pdf');
    const fileTypeLabel = isPdf ? 'PDF' : 'File';
    
    return (
      <View key={file.id} style={styles.documentPreview}>
                 {/* File icon with colored background */}
         <View style={[styles.documentIcon, { backgroundColor: fileBackgroundColor }]}>
           {fileIsUploading ? (
             <ActivityIndicator size="small" color="#ffffff" />
           ) : (
             <Text style={styles.documentIconText}>{fileIcon}</Text>
           )}
        </View>
        
        {/* File info */}
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>{file.name}</Text>
          <Text style={styles.documentType}>{fileTypeLabel}</Text>
        </View>
        
        {/* Remove button - top right corner */}
        <TouchableOpacity
          style={styles.documentRemoveButton}
          onPress={() => removeFile(file.id)}
        >
          <Text style={styles.documentRemoveText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
                <OpenAIIcon size={20} color="#ffffff" />
              </View>
                            <View style={styles.modelInfo}>
                <Text style={styles.modelName}>{model.name}</Text>
              </View>
              {selectedModel.id === model.id && (
                <View style={styles.selectedIndicator} />
              )}
            </TouchableOpacity>
          ))}
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
      <View style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <Menu size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.modelSelector}
          onPress={() => setShowModelSelector(true)}
        >
          <Text style={styles.modelSelectorText}>
            {selectedModel.name} <Text style={styles.modelVersion}>{selectedModel.version}</Text>
          </Text>
          <ChevronDown size={16} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerButton}>
          <MoreHorizontal size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

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
          <View style={styles.inputContainer}>
            {streamingMessageId && (
              <TouchableOpacity 
                style={styles.stopButton}
                onPress={stopGeneration}
              >
                <Text style={styles.stopButtonText}>Stop generating</Text>
              </TouchableOpacity>
            )}
            
            {/* File Previews */}
            {files.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filePreviewContainer}
              >
                {files.map(renderFilePreview)}
              </ScrollView>
            )}
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder={isConnected ? "Ask anything..." : "No internet connection"}
                placeholderTextColor="#6b7280"
                value={inputText}
                onChangeText={setInputText}
                multiline={true}
                maxLength={4000}
                editable={!isLoading && isConnected}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
              />
              
              <View style={styles.buttonRow}>
                <View style={styles.leftButtons}>
                  <ToolSelector
                    onToolChange={handleToolChange}
                    onStyleSelection={handleStyleSelection}
                    onShowAuthOverlay={handleShowAuthOverlay}
                    isLimitedMode={false}
                    disableTools={false}
                  />
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => {
                      Alert.alert(
                        'Upload File',
                        'Choose what to upload',
                        [
                          { text: 'Document', onPress: pickDocument },
                          { text: 'Image', onPress: pickImage },
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Plus size={24} color="#ffffff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.iconButton}>
                    <Sliders size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.rightButtons}>
                  <TouchableOpacity style={styles.iconButton}>
                    <Mic size={24} color="#ffffff" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || isLoading || !isConnected) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim() || isLoading || !isConnected}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Send size={20} color="#000000" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Model Selector Modal */}
      {renderModelSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  modelSelectorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modelVersion: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '400',
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
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 8,
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
  inputContainer: {
    paddingHorizontal: 12,
    paddingBottom: 0,
    paddingTop: 16,
    backgroundColor: '#000000',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    backgroundColor: '#2d2d2d',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 80,
  },
  textInput: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '400',
    paddingVertical: 0,
    marginBottom: 16,
    minHeight: 24,
    maxHeight: 120,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.5,
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
    borderWidth: 1,
    borderColor: '#525252',
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
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  filePreviewContainer: {
    maxHeight: 80,
    marginBottom: 8,
  },
  // Image preview styles (matching w-14 h-14 from web app = 56px)
  imagePreview: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#d1d5db', // zinc-300
  },
  imagePreviewImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  imageSpinnerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  // Document preview styles (matching web app design)
  documentPreview: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6', // zinc-100
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(209, 213, 219, 0.5)', // zinc-200/50
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 240,
    marginHorizontal: 4,
  },
  documentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  documentIconText: {
    fontSize: 16,
    color: '#ffffff',
  },
  documentInfo: {
    flex: 1,
    minWidth: 0,
  },
  documentName: {
    color: '#111827', // zinc-900
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 0,
  },
  documentType: {
    color: '#6b7280', // zinc-500
    fontSize: 12,
  },
  documentRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentRemoveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  messageFileAttachments: {
    marginTop: 8,
  },
  // New message styles matching web app
  userMessageContainer: {
    marginVertical: 8,
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    marginVertical: 8,
    justifyContent: 'flex-start',
  },
  assistantMessageWithSpacing: {
    marginBottom: 16,
  },
  messageContainerWithToolData: {
    marginBottom: 24,
  },
  assistantMessageLayout: {
    flexDirection: 'row',
    maxWidth: '85%',
    alignItems: 'flex-start',
  },
  providerAvatarContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  assistantMessageContent: {
    flex: 1,
    position: 'relative',
  },
  assistantMessageBubble: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantMessageBubbleWithTools: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  userMessageLayout: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  userMessageBubble: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '70%',
    marginLeft: '30%',
  },
}); 