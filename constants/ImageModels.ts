// Image Generation Models
export const IMAGE_MODELS = {
  // OpenAI Models
  GPT_IMAGE_1: "gpt-image-1",
  DALL_E_3: "dall-e-3",
  
  // FAL AI Flux Models
  FLUX_1_1_PRO: "flux-1.1-pro",
  FLUX_1_1_PRO_ULTRA: "flux-1.1-pro-ultra",
  FLUX_PRO: "flux-pro",
  FLUX_DEV: "flux-dev",
  FLUX_SCHNELL: "flux-schnell",
  
  // Google Models
  IMAGEN_3_FAST: "imagen-3-fast",
  IMAGEN_3: "imagen-3",
  
  // xAI Models
  AURORA: "aurora",
  GROK_AURORA: "grok-aurora",
} as const;

export type ImageModelProvider = 'openai' | 'fal' | 'google' | 'xai';

export interface ImageModelInfo {
  id: string;
  name: string;
  model: string;
  description: string;
  provider: ImageModelProvider;
  category: 'standard' | 'fast' | 'premium' | 'beta';
  supportedSizes: string[];
  maxImages: number;
  supportsEditing?: boolean;
  icon?: string;
}

// Available image generation models
export const AVAILABLE_IMAGE_MODELS: ImageModelInfo[] = [
  // OpenAI Models
  {
    id: 'gpt-image-1',
    name: 'GPT Image',
    model: IMAGE_MODELS.GPT_IMAGE_1,
    description: 'Latest OpenAI image generation model',
    provider: 'openai',
    category: 'standard',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    supportsEditing: true,
    icon: '🤖',
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    model: IMAGE_MODELS.DALL_E_3,
    description: 'High-quality image generation with excellent prompt adherence',
    provider: 'openai',
    category: 'premium',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 1,
    supportsEditing: true,
    icon: '🎨',
  },
  
  // FAL AI Flux Models
  {
    id: 'flux-1.1-pro',
    name: 'Flux 1.1 Pro',
    model: IMAGE_MODELS.FLUX_1_1_PRO,
    description: 'State-of-the-art image generation with excellent quality',
    provider: 'fal',
    category: 'premium',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024', '768x1344', '1344x768'],
    maxImages: 4,
    icon: '⚡',
  },
  {
    id: 'flux-1.1-pro-ultra',
    name: 'Flux 1.1 Pro Ultra',
    model: IMAGE_MODELS.FLUX_1_1_PRO_ULTRA,
    description: 'Ultra high-quality image generation with exceptional detail',
    provider: 'fal',
    category: 'premium',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024', '2048x2048'],
    maxImages: 1,
    icon: '💎',
  },
  {
    id: 'flux-pro',
    name: 'Flux Pro',
    model: IMAGE_MODELS.FLUX_PRO,
    description: 'Professional quality image generation',
    provider: 'fal',
    category: 'standard',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    icon: '🔥',
  },
  {
    id: 'flux-dev',
    name: 'Flux Dev',
    model: IMAGE_MODELS.FLUX_DEV,
    description: 'Development version with experimental features',
    provider: 'fal',
    category: 'beta',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    icon: '🧪',
  },
  {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    model: IMAGE_MODELS.FLUX_SCHNELL,
    description: 'Fast image generation with good quality',
    provider: 'fal',
    category: 'fast',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    icon: '💨',
  },
  
  // Google Models
  {
    id: 'imagen-3-fast',
    name: 'Imagen 3 Fast',
    model: IMAGE_MODELS.IMAGEN_3_FAST,
    description: 'Fast Google Imagen with high quality results',
    provider: 'google',
    category: 'fast',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    icon: '🚀',
  },
  {
    id: 'imagen-3',
    name: 'Imagen 3',
    model: IMAGE_MODELS.IMAGEN_3,
    description: 'Google\'s latest image generation model',
    provider: 'google',
    category: 'premium',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    icon: '🏔️',
  },
  
  // xAI Models
  {
    id: 'aurora',
    name: 'Aurora',
    model: IMAGE_MODELS.AURORA,
    description: 'xAI\'s image generation model',
    provider: 'xai',
    category: 'standard',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    icon: '🌅',
  },
  {
    id: 'grok-aurora',
    name: 'Grok Aurora',
    model: IMAGE_MODELS.GROK_AURORA,
    description: 'Grok-powered image generation',
    provider: 'xai',
    category: 'beta',
    supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
    maxImages: 4,
    icon: '🤖',
  },
];

// Default model
export const DEFAULT_IMAGE_MODEL = AVAILABLE_IMAGE_MODELS[0];

// Helper functions
export const getImageModelByProvider = (provider: ImageModelProvider): ImageModelInfo[] => {
  return AVAILABLE_IMAGE_MODELS.filter(model => model.provider === provider);
};

export const getImageModelById = (id: string): ImageModelInfo | undefined => {
  return AVAILABLE_IMAGE_MODELS.find(model => model.id === id);
};

export const getImageModelByModel = (modelName: string): ImageModelInfo | undefined => {
  return AVAILABLE_IMAGE_MODELS.find(model => model.model === modelName);
};

// Provider display information
export const IMAGE_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    color: '#10A37F',
    description: 'Industry-leading AI image generation',
  },
  fal: {
    name: 'FAL AI',
    color: '#FF6B6B',
    description: 'Flux models with exceptional quality',
  },
  google: {
    name: 'Google',
    color: '#4285F4',
    description: 'Advanced Imagen technology',
  },
  xai: {
    name: 'xAI',
    color: '#000000',
    description: 'Cutting-edge image generation',
  },
} as const;