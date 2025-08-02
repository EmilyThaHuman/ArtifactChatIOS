import { ImageModelInfo, getImageModelById } from '@/constants/ImageModels';

// Rate limiting implementation
interface RateLimitState {
  requests: number[];
  maxRequests: number;
  windowMs: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

const checkRateLimit = async (key: string, maxRequests = 3, windowMs = 60000) => {
  const now = Date.now();
  const state = rateLimitStates.get(key) || { requests: [], maxRequests, windowMs };
  
  // Remove old requests outside the window
  state.requests = state.requests.filter(time => now - time < state.windowMs);
  
  if (state.requests.length >= state.maxRequests) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  state.requests.push(now);
  rateLimitStates.set(key, state);
};

export interface ImageEditParams {
  prompt: string;
  imageUrls: string[];
  maskUrl?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  n?: number;
  model?: string;
}

export interface ImageEditResult {
  success: true;
  result: {
    data: {
      images: Array<{
        url: string;
        index: number;
        storagePath?: string;
        storageBucket?: string;
        fileName?: string;
      }>;
      prompt: string;
      model: string;
      size: string;
      originalImages: string[];
      maskUsed: boolean;
      count: number;
    };
    metadata: {
      timestamp: string;
      model: string;
      prompt: string;
      format: string;
      storageDetails: {
        bucket?: string;
        isStoredInSupabase: boolean;
        imageCount: number;
      };
    };
  };
}

export interface ImageEditError {
  success: false;
  error: string;
}

// Get API base URL from environment or use default
const getApiBaseUrl = (): string => {
  // In React Native, we need to use the actual backend URL
  // This should match your backend configuration
  return process.env.EXPO_PUBLIC_API_URL || 'https://artifact-ai-backends-production.up.railway.app';
};

/**
 * Edit images using AI image models
 */
export async function editImage(params: ImageEditParams): Promise<ImageEditResult | ImageEditError> {
  try {
    const {
      prompt,
      imageUrls,
      maskUrl,
      size = '1024x1024',
      n = 1,
      model = 'gpt-image-1'
    } = params;

    console.log('🎨 [ImageEditingService] Starting image edit:', {
      prompt: prompt.substring(0, 100) + '...',
      imageCount: imageUrls.length,
      hasMask: !!maskUrl,
      model,
      size
    });

    // Validate parameters
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required for image editing');
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('At least one image URL is required');
    }

    // Validate model supports editing
    const modelInfo = getImageModelById(model);
    if (modelInfo && !modelInfo.supportsEditing) {
      throw new Error(`Model ${model} does not support image editing`);
    }

    // Apply rate limiting
    await checkRateLimit('image_editing', 3, 60000);

    // Prepare API request
    const apiUrl = getApiBaseUrl();
    const endpoint = `${apiUrl}/api/ai/image/edit/openai/${model}`;

    const requestBody = {
      prompt,
      image: imageUrls.length === 1 ? imageUrls[0] : imageUrls,
      mask: maskUrl,
      size,
      n,
      response_format: 'b64_json'
    };

    console.log('🌐 [ImageEditingService] Making API request to:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.result?.data?.[0]) {
      throw new Error('No image data returned from editing service');
    }

    console.log('✅ [ImageEditingService] Image edit completed successfully:', {
      imageCount: data.result.data.length,
      model: model
    });

    return {
      success: true,
      result: {
        data: {
          images: data.result.data.map((item: any, index: number) => ({
            url: item.url,
            index,
            storagePath: item.storagePath,
            storageBucket: item.storageBucket,
            fileName: item.fileName,
          })),
          prompt,
          model,
          size,
          originalImages: imageUrls,
          maskUsed: !!maskUrl,
          count: data.result.data.length,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          model,
          prompt,
          format: 'url',
          storageDetails: {
            bucket: 'chat',
            isStoredInSupabase: true,
            imageCount: data.result.data.length,
          },
        },
      },
    };

  } catch (error) {
    console.error('❌ [ImageEditingService] Image editing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image editing failed',
    };
  }
}

/**
 * Validate if a model supports image editing
 */
export function supportsImageEditing(modelId: string): boolean {
  const modelInfo = getImageModelById(modelId);
  return modelInfo?.supportsEditing || false;
}

/**
 * Get available editing models
 */
export function getEditingModels(): ImageModelInfo[] {
  const { AVAILABLE_IMAGE_MODELS } = require('@/constants/ImageModels');
  return AVAILABLE_IMAGE_MODELS.filter((model: ImageModelInfo) => model.supportsEditing);
}

/**
 * Convert data URL to File object for uploads
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Generate a filename for edited images
 */
export function generateEditedImageName(originalName: string, prompt: string): string {
  const timestamp = Date.now();
  const promptWords = prompt.trim().split(/\s+/).slice(0, 3).join('-');
  const cleanPrompt = promptWords.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  
  if (cleanPrompt) {
    return `edited-${cleanPrompt}-${timestamp}.png`;
  }
  
  return `edited-${originalName}-${timestamp}.png`;
}