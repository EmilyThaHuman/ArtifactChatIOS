// OpenAI Models
export const OPENAI_MODELS = {
  GPT_4O: "gpt-4o",
  GPT_4O_MINI: "gpt-4o-mini",
  O4_MINI: "o4-mini",
  O3: "o3",
  GPT_4_1: "gpt-4.1",
  GPT_4_1_MINI: "gpt-4.1-mini",
  GPT_4_1_NANO: "gpt-4.1-nano",
  GPT_4_5_PREVIEW: "gpt-4.5-preview",
} as const;

// Anthropic Models
export const ANTHROPIC_MODELS = {
  CLAUDE_SONNET_4: "claude-sonnet-4-20250514",
  CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU: "claude-3-5-haiku-20241022",
} as const;

// Google Models
export const GOOGLE_MODELS = {
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_2_0_FLASH: "gemini-2.0-flash",
  GEMINI_1_5_PRO: "gemini-1.5-pro",
} as const;

// Mistral Models
export const MISTRAL_MODELS = {
  MISTRAL_SMALL: "mistral-small-latest",
  OPEN_MISTRAL_NEMO: "open-mistral-nemo",
} as const;

// DeepSeek Models
export const DEEPSEEK_MODELS = {
  DEEPSEEK_CHAT: "deepseek-chat",
  DEEPSEEK_REASONER: "deepseek-reasoner",
} as const;

// Groq Models
export const GROQ_MODELS = {
  LLAMA3_70B: "llama3-70b-8192",
} as const;

// X AI Models
export const XAI_MODELS = {
  GROK_4: "grok-4-0709",
  GROK_3: "grok-3",
  GROK_3_FAST: "grok-3-fast",
  GROK_3_MINI: "grok-3-mini",
  GROK_3_MINI_FAST: "grok-3-mini-fast",
} as const;

// Cohere Models
export const COHERE_MODELS = {
  COMMAND_A: "command-a-03-2025",
  COMMAND_R7B: "command-r7b-12-2024",
  COMMAND_R_PLUS: "command-r-plus",
  COMMAND_R: "command-r",
} as const;

// Perplexity Models
export const PERPLEXITY_MODELS = {
  SONAR: "sonar",
  SONAR_PRO: "sonar-pro",
} as const;

// OpenRouter Models
export const OPENROUTER_MODELS = {
  DOLPHIN_MIXTRAL: "cognitivecomputations/dolphin-mixtral-8x22b",
} as const;

// Model providers
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'cohere' | 'deepseek' | 'groq' | 'mistral' | 'perplexity' | 'xai' | 'openrouter';

// Model display information
export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  model: string;
  description: string;
  provider: ModelProvider;
  category?: 'flagship' | 'reasoning' | 'efficient' | 'legacy';
}

// All available models
export const ALL_MODELS: ModelInfo[] = [
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4O,
    description: 'Most capable model, best for complex tasks',
    provider: 'openai',
    category: 'flagship',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4O_MINI,
    description: 'Fast and efficient, good for most tasks',
    provider: 'openai',
    category: 'efficient',
  },
  {
    id: 'o4-mini',
    name: 'O4 Mini',
    version: 'Latest',
    model: OPENAI_MODELS.O4_MINI,
    description: 'Next-gen reasoning model',
    provider: 'openai',
    category: 'reasoning',
  },
  {
    id: 'o3',
    name: 'O3',
    version: 'Latest',
    model: OPENAI_MODELS.O3,
    description: 'Advanced reasoning model for complex problems',
    provider: 'openai',
    category: 'reasoning',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4_1,
    description: 'Enhanced version of GPT-4',
    provider: 'openai',
    category: 'flagship',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4_1_MINI,
    description: 'Efficient version of GPT-4.1',
    provider: 'openai',
    category: 'efficient',
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4_1_NANO,
    description: 'Ultra-efficient version of GPT-4.1',
    provider: 'openai',
    category: 'efficient',
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5',
    version: 'Preview',
    model: OPENAI_MODELS.GPT_4_5_PREVIEW,
    description: 'Next-generation model with enhanced capabilities',
    provider: 'openai',
    category: 'flagship',
  },

  // Anthropic Models
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    version: 'Latest',
    model: ANTHROPIC_MODELS.CLAUDE_SONNET_4,
    description: 'Most advanced Claude model',
    provider: 'anthropic',
    category: 'flagship',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    version: 'Latest',
    model: ANTHROPIC_MODELS.CLAUDE_3_5_SONNET,
    description: 'Capable Claude model with advanced reasoning',
    provider: 'anthropic',
    category: 'flagship',
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    version: 'Latest',
    model: ANTHROPIC_MODELS.CLAUDE_3_5_HAIKU,
    description: 'Fast and efficient Claude model',
    provider: 'anthropic',
    category: 'efficient',
  },

  // Google Models
  {
    id: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    version: 'Latest',
    model: GOOGLE_MODELS.GEMINI_2_5_PRO,
    description: 'Google\'s most advanced AI model',
    provider: 'google',
    category: 'flagship',
  },
  {
    id: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    version: 'Latest',
    model: GOOGLE_MODELS.GEMINI_2_5_FLASH,
    description: 'Fast and efficient Gemini model',
    provider: 'google',
    category: 'efficient',
  },
  {
    id: 'gemini-2-0-flash',
    name: 'Gemini 2.0 Flash',
    version: 'Latest',
    model: GOOGLE_MODELS.GEMINI_2_0_FLASH,
    description: 'Versatile Gemini model',
    provider: 'google',
    category: 'efficient',
  },
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    version: 'Latest',
    model: GOOGLE_MODELS.GEMINI_1_5_PRO,
    description: 'Previous generation Gemini Pro',
    provider: 'google',
    category: 'flagship',
  },

  // Mistral Models
  {
    id: 'mistral-small',
    name: 'Mistral Small',
    version: 'Latest',
    model: MISTRAL_MODELS.MISTRAL_SMALL,
    description: 'Efficient Mistral model',
    provider: 'mistral',
    category: 'efficient',
  },
  {
    id: 'open-mistral-nemo',
    name: 'Open Mistral Nemo',
    version: 'Latest',
    model: MISTRAL_MODELS.OPEN_MISTRAL_NEMO,
    description: 'Open source Mistral model',
    provider: 'mistral',
    category: 'efficient',
  },

  // DeepSeek Models
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    version: 'Latest',
    model: DEEPSEEK_MODELS.DEEPSEEK_CHAT,
    description: 'Advanced reasoning and chat model',
    provider: 'deepseek',
    category: 'flagship',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    version: 'Latest',
    model: DEEPSEEK_MODELS.DEEPSEEK_REASONER,
    description: 'Specialized reasoning model',
    provider: 'deepseek',
    category: 'reasoning',
  },

  // Groq Models
  {
    id: 'llama3-70b',
    name: 'Llama 3 70B',
    version: 'Latest',
    model: GROQ_MODELS.LLAMA3_70B,
    description: 'Fast inference with Llama 3',
    provider: 'groq',
    category: 'flagship',
  },

  // X AI Models
  {
    id: 'grok-4',
    name: 'Grok 4',
    version: 'Latest',
    model: XAI_MODELS.GROK_4,
    description: 'Most advanced Grok model',
    provider: 'xai',
    category: 'flagship',
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    version: 'Latest',
    model: XAI_MODELS.GROK_3,
    description: 'X.AI\'s powerful conversational model',
    provider: 'xai',
    category: 'flagship',
  },
  {
    id: 'grok-3-fast',
    name: 'Grok 3 Fast',
    version: 'Latest',
    model: XAI_MODELS.GROK_3_FAST,
    description: 'Fast version of Grok 3',
    provider: 'xai',
    category: 'efficient',
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    version: 'Latest',
    model: XAI_MODELS.GROK_3_MINI,
    description: 'Compact Grok model',
    provider: 'xai',
    category: 'efficient',
  },
  {
    id: 'grok-3-mini-fast',
    name: 'Grok 3 Mini Fast',
    version: 'Latest',
    model: XAI_MODELS.GROK_3_MINI_FAST,
    description: 'Fastest Grok variant',
    provider: 'xai',
    category: 'efficient',
  },

  // Cohere Models
  {
    id: 'command-a',
    name: 'Command A',
    version: 'Latest',
    model: COHERE_MODELS.COMMAND_A,
    description: 'Advanced Cohere model',
    provider: 'cohere',
    category: 'flagship',
  },
  {
    id: 'command-r7b',
    name: 'Command R7B',
    version: 'Latest',
    model: COHERE_MODELS.COMMAND_R7B,
    description: 'Efficient 7B parameter model',
    provider: 'cohere',
    category: 'efficient',
  },
  {
    id: 'command-r-plus',
    name: 'Command R+',
    version: 'Latest',
    model: COHERE_MODELS.COMMAND_R_PLUS,
    description: 'Enhanced version of Command R',
    provider: 'cohere',
    category: 'flagship',
  },
  {
    id: 'command-r',
    name: 'Command R',
    version: 'Latest',
    model: COHERE_MODELS.COMMAND_R,
    description: 'Cohere\'s conversational AI model',
    provider: 'cohere',
    category: 'flagship',
  },

  // Perplexity Models
  {
    id: 'sonar',
    name: 'Sonar',
    version: 'Latest',
    model: PERPLEXITY_MODELS.SONAR,
    description: 'Search-enhanced AI model',
    provider: 'perplexity',
    category: 'flagship',
  },
  {
    id: 'sonar-pro',
    name: 'Sonar Pro',
    version: 'Latest',
    model: PERPLEXITY_MODELS.SONAR_PRO,
    description: 'Advanced search-enhanced model',
    provider: 'perplexity',
    category: 'flagship',
  },

  // OpenRouter Models
  {
    id: 'dolphin-mixtral',
    name: 'Dolphin Mixtral 8x22B',
    version: 'Latest',
    model: OPENROUTER_MODELS.DOLPHIN_MIXTRAL,
    description: 'Uncensored mixture of experts model',
    provider: 'openrouter',
    category: 'flagship',
  },
];

// Keep the original export for backward compatibility
export const OPENAI_MODEL_INFO: ModelInfo[] = ALL_MODELS.filter(model => model.provider === 'openai');

// Category colors for UI
export const MODEL_CATEGORY_COLORS = {
  flagship: '#10b981', // emerald-500
  reasoning: '#8b5cf6', // violet-500
  efficient: '#3b82f6', // blue-500
  legacy: '#6b7280', // gray-500
} as const;

export default {
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  GOOGLE_MODELS,
  MISTRAL_MODELS,
  DEEPSEEK_MODELS,
  GROQ_MODELS,
  XAI_MODELS,
  COHERE_MODELS,
  PERPLEXITY_MODELS,
  OPENROUTER_MODELS,
  ALL_MODELS,
  OPENAI_MODEL_INFO,
  MODEL_CATEGORY_COLORS,
}; 