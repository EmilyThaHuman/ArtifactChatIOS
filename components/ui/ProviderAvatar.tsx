import React, { memo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { OpenAIIcon } from './OpenAIIcon';

interface ProviderAvatarProps {
  message: any;
  isStreaming?: boolean;
  hasContent?: boolean;
  size?: number;
}

// Determine provider from model name (matching web app logic)
const determineProviderFromModel = (model: string | undefined): string => {
  if (!model) return 'openai';

  // Check for OpenRouter models which use a slash format
  if (model.includes('/')) {
    const prefix = model.split('/')[0].toLowerCase();
    if (
      prefix === 'cognitivecomputations' ||
      prefix === 'nousresearch' ||
      prefix === 'teknium' ||
      prefix === 'migtissera'
    ) {
      return 'openrouter';
    }
  }

  // Check if model name includes specific provider names
  if (model.includes('deepseek')) return 'deepseek';
  if (model.includes('gemini')) return 'gemini';
  if (model.includes('claude')) return 'anthropic';
  // Check for specific Groq models first before the general mistral check
  if (model === 'mistral-large-2402') return 'groq';
  if (model.includes('mistral') && !model.includes('mixtral')) return 'mistral';
  if (model.includes('grok')) return 'xai';
  if (model.includes('command')) return 'cohere';
  if (model.includes('sonar') || model.includes('r1-1776')) return 'perplexity';
  if (
    model.includes('gemma') ||
    model.includes('llama') ||
    model.includes('mixtral') ||
    (model.includes('mistral') && model.includes('mixtral'))
  ) {
    return 'groq';
  }

  return 'openai';
};

// Provider icon component (simplified for React Native)
const getProviderIcon = (provider: string, size: number = 12) => {
  // For now, we'll use the OpenAI icon for all providers
  // In a full implementation, you'd want to create SVG components for each provider
  switch (provider) {
    case 'deepseek':
      return <OpenAIIcon size={size} color="#015482" />;
    case 'gemini':
    case 'google':
      return <OpenAIIcon size={size} color="#1967D2" />;
    case 'mistral':
      return <OpenAIIcon size={size} color="#ff7f00" />;
    case 'anthropic':
    case 'claude':
      return <OpenAIIcon size={size} color="#D97757" />;
    case 'groq':
      return <OpenAIIcon size={size} color="#22c55e" />;
    case 'xai':
    case 'grok':
      return <OpenAIIcon size={size} color="#60a5fa" />;
    case 'cohere':
      return <OpenAIIcon size={size} color="#14b8a6" />;
    case 'perplexity':
      return <OpenAIIcon size={size} color="#ef4444" />;
    case 'openrouter':
      return <OpenAIIcon size={size} color="#6366f1" />;
    case 'openai':
    default:
      return <OpenAIIcon size={size} color="#000000" />;
  }
};

// Pulse loader for loading states
const PulseLoader = ({ size = 12 }: { size?: number }) => {
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.pulseLoader,
        {
          width: size,
          height: size,
          opacity: pulseAnim,
        },
      ]}
    />
  );
};

const ProviderAvatar = memo(({
  message,
  isStreaming = false,
  hasContent = true,
  size = 20,
}: ProviderAvatarProps) => {
  // Determine provider from message model
  const model = message?.model || message?.metadata?.model;
  const provider = message?.metadata?.provider || 
                  message?.provider || 
                  determineProviderFromModel(model);

  // Show pulse loader if streaming and no content yet
  if (isStreaming && !hasContent) {
    return (
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        <PulseLoader size={size * 0.6} />
      </View>
    );
  }

  return (
    <View style={[styles.avatarContainer, { width: size, height: size }]}>
      {getProviderIcon(provider, size * 0.6)}
    </View>
  );
});

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  pulseLoader: {
    borderRadius: 50,
    backgroundColor: '#6b7280',
  },
});

export { ProviderAvatar }; 