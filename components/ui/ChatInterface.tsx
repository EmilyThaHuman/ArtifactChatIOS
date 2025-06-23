import React, { useState, useRef, useEffect } from 'react';
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
  Zap,
  Brain,
  Sparkles,
  WifiOff,
  Copy,
} from 'lucide-react-native';
import { Colors, Gradients } from '@/constants/Colors';
import { useChat } from '@/hooks/useChat';
import { OpenAIService } from '@/lib/openai';

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
  icon: React.ComponentType<any>;
  color: string;
  model: string;
}

const modelOptions: ModelOption[] = OpenAIService.getAvailableModels().map(model => ({
  id: model.id,
  name: model.name,
  version: model.version,
  icon: model.id === 'gpt-4o' ? Brain : model.id === 'gpt-4-turbo' ? Sparkles : Zap,
  color: model.id === 'gpt-4o' ? '#10b981' : model.id === 'gpt-4-turbo' ? '#8b5cf6' : '#3b82f6',
  model: model.model,
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

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const messageContent = inputText.trim();
    setInputText('');
    await sendMessage(messageContent);
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
      textDecorationLine: 'underline',
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

  const renderMessage = (message: any) => (
    <View key={message.id} style={styles.messageContainer}>
      <View style={[
        styles.messageBubble,
        message.role === 'user' ? styles.userMessage : styles.aiMessage
      ]}>
        {message.role === 'assistant' ? (
          <View>
            <Markdown style={markdownStyles}>
              {message.content}
            </Markdown>
            {message.isStreaming && (
              <View style={styles.streamingIndicator}>
                <ActivityIndicator size="small" color="#8b5cf6" />
                <Text style={styles.streamingText}>Generating...</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[
            styles.messageText,
            message.role === 'user' ? styles.userMessageText : styles.aiMessageText
          ]}>
            {message.content}
          </Text>
        )}
        
        {!message.isStreaming && message.role === 'assistant' && (
          <TouchableOpacity 
            style={styles.copyButton}
            onPress={() => handleCopyMessage(message.content)}
          >
            <Copy size={14} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
          {modelOptions.map((model) => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelOption,
                selectedModel.id === model.id && styles.selectedModelOption
              ]}
              onPress={() => handleModelSelect(model)}
            >
              <View style={[styles.modelIcon, { backgroundColor: model.color }]}>
                <model.icon size={20} color="#ffffff" />
              </View>
              <View style={styles.modelInfo}>
                <Text style={styles.modelName}>{model.name}</Text>
                <Text style={styles.modelVersion}>{model.version}</Text>
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
            messages.map(renderMessage)
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
                  <TouchableOpacity style={styles.iconButton}>
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
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#374151',
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
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
}); 