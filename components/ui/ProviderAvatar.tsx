import React, { memo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { OpenAIIcon } from './OpenAIIcon';
import {
  ClaudeIcon,
  CohereIcon,
  DeepSeekIcon,
  GeminiIcon,
  GroqIcon,
  GrokIcon,
  MistralIcon,
  PerplexityIcon,
  OpenRouterIcon,
} from './icons';

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

// Provider icon component matching model selector styles
const getProviderIcon = (provider: string, size: number = 14) => {
  const iconSize = size;
  
  switch (provider) {
    case 'deepseek':
      return <DeepSeekIcon size={iconSize} />; // Use default color
    case 'gemini':
    case 'google':
      return <GeminiIcon size={iconSize} />; // Use default color
    case 'mistral':
      return <MistralIcon size={iconSize} />; // Use default color
    case 'anthropic':
    case 'claude':
      return <ClaudeIcon size={iconSize} />; // Use default color
    case 'groq':
      return <GroqIcon size={iconSize} color="#ffffff" />; // Explicit white
    case 'xai':
    case 'grok':
      return <GrokIcon size={iconSize} color="#ffffff" />; // Explicit white
    case 'cohere':
      return <CohereIcon size={iconSize} />; // Use default color
    case 'perplexity':
      return <PerplexityIcon size={iconSize} />; // Use default color
    case 'openrouter':
      return <OpenRouterIcon size={iconSize} color="#ffffff" />; // Explicit white
    case 'openai':
    default:
      return <OpenAIIcon size={iconSize} color="#ffffff" />; // Explicit white
  }
};

// Pulse loader for loading states
const PulseLoader = ({ size = 20 }: { size?: number }) => {
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
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: (size * 0.6) / 2,
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
  // Determine provider with priority to metadata.provider (from thread_message)
  let provider = message?.metadata?.provider || message?.provider;
  
  // If provider is not available or is generic, determine from model
  if (!provider || provider === 'openai') {
    const model = message?.model || message?.metadata?.model;
    if (model) {
      const modelProvider = determineProviderFromModel(model);
      // Only override if we found a more specific provider
      if (modelProvider !== 'openai' || !provider) {
        provider = modelProvider;
      }
    }
  }

  // Fallback to openai if still no provider
  if (!provider) {
    provider = 'openai';
  }

  // Normalize provider name
  provider = provider.toLowerCase();

  // Calculate container size and icon size
  const containerSize = size;
  const iconSize = Math.round(size * 0.7); // Icon is 70% of container size

  // Show pulse loader if streaming and no content yet
  if (isStreaming && !hasContent) {
    return (
      <View style={[
        styles.providerIconContainer, 
        { 
          width: containerSize, 
          height: containerSize,
          borderRadius: containerSize / 2,
        }
      ]}>
        <PulseLoader size={containerSize} />
      </View>
    );
  }

  // Return icon in styled container matching model selector
  return (
    <View style={[
      styles.providerIconContainer, 
      { 
        width: containerSize, 
        height: containerSize,
        borderRadius: containerSize / 2,
      }
    ]}>
      {getProviderIcon(provider, iconSize)}
    </View>
  );
});

const styles = StyleSheet.create({
  providerIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#525252', // Matching model selector background
  },
  pulseLoader: {
    backgroundColor: '#6b7280',
  },
});

export { ProviderAvatar }; 