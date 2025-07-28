// OpenAI Models (Only supported models)
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

// Model display information
export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  model: string;
  description: string;
  category?: 'flagship' | 'reasoning' | 'efficient' | 'legacy';
}

export const OPENAI_MODEL_INFO: ModelInfo[] = [
  // Flagship Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4O,
    description: 'Most capable model, best for complex tasks',
    category: 'flagship',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4O_MINI,
    description: 'Fast and efficient, good for most tasks',
    category: 'efficient',
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5',
    version: 'Preview',
    model: OPENAI_MODELS.GPT_4_5_PREVIEW,
    description: 'Next-generation model with enhanced capabilities',
    category: 'flagship',
  },
  
  // Reasoning Models
  {
    id: 'o3',
    name: 'O3',
    version: 'Latest',
    model: OPENAI_MODELS.O3,
    description: 'Advanced reasoning model for complex problems',
    category: 'reasoning',
  },
  {
    id: 'o4-mini',
    name: 'O4 Mini',
    version: 'Latest',
    model: OPENAI_MODELS.O4_MINI,
    description: 'Next-gen reasoning model',
    category: 'reasoning',
  },

  // GPT-4.1 Series
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4_1,
    description: 'Enhanced version of GPT-4',
    category: 'flagship',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4_1_MINI,
    description: 'Efficient version of GPT-4.1',
    category: 'efficient',
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    version: 'Latest',
    model: OPENAI_MODELS.GPT_4_1_NANO,
    description: 'Ultra-efficient version of GPT-4.1',
    category: 'efficient',
  },
];

// Category colors for UI
export const MODEL_CATEGORY_COLORS = {
  flagship: '#10b981', // emerald-500
  reasoning: '#8b5cf6', // violet-500
  efficient: '#3b82f6', // blue-500
  legacy: '#6b7280', // gray-500
} as const;

export default {
  OPENAI_MODELS,
  OPENAI_MODEL_INFO,
  MODEL_CATEGORY_COLORS,
}; 