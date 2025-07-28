import { supabase } from '@/lib/supabase';
import { OpenAIService } from '@/lib/openai';

// Rate limiting implementation
interface RateLimitState {
  requests: number[];
  maxRequests: number;
  windowMs: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

const checkRateLimit = async (key: string, maxRequests = 5, windowMs = 60000) => {
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

export interface ImageGenerationParams {
  prompt: string;
  name?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  quality?: 'low' | 'medium' | 'high';
  model?: string;
  style?: {
    value: string;
    stylePrompt: string;
  };
}

export interface ImageGenerationResult {
  success: true;
  result: {
    data: {
      url: string;
      name: string;
      prompt: string;
      model: string;
      size: string;
      quality: string;
      revised_prompt?: string;
      isDirectUrl: boolean;
      provider: string;
      storagePath?: string;
      storageBucket?: string;
      fileName?: string;
    };
    metadata: {
      timestamp: string;
      model: string;
      name: string;
      prompt: string;
      format: string;
      provider: string;
      storageDetails: {
        isStoredInSupabase: boolean;
        isDirectUrl: boolean;
        originalUrl?: string;
        bucket?: string;
        path?: string;
      };
    };
  };
}

export interface ImageGenerationError {
  success: false;
  error: string;
  metadata?: {
    timestamp: string;
    prompt: string;
  };
}

// Upload image to Supabase storage
const uploadImageToStorage = async (base64Data: string, prompt: string): Promise<{
  url: string;
  path: string;
  bucket: string;
  fileName: string;
  folderUuid: string;
  userId: string;
  prompt: string;
}> => {
  try {
    // Get user ID from auth store
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const byteCharacters = atob(base64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
      const slice = byteCharacters.slice(offset, offset + 1024);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: 'image/png' });

    const folderUuid = crypto.randomUUID();
    const fileName = `image-${Date.now()}.png`;
    // Organize by user ID: {userId}/{folderUuid}/{fileName}
    const filePath = `${user.id}/${folderUuid}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: false,
        metadata: {
          user_id: user.id,
          prompt: prompt,
          generated_at: new Date().toISOString(),
          type: 'ai_generated_image',
        },
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
      bucket: 'chat-files',
      fileName: fileName,
      folderUuid: folderUuid,
      userId: user.id,
      prompt: prompt,
    };
  } catch (error) {
    console.error('Error uploading image to Supabase storage:', error);
    throw error;
  }
};

const generateImageName = (prompt: string, providedName?: string): string => {
  if (providedName && providedName.trim()) {
    return providedName.trim();
  }

  // Generate a name from the prompt
  if (prompt && prompt.trim()) {
    // Take first few words and clean them up
    const words = prompt.trim().split(/\s+/).slice(0, 4);
    const name = words
      .join(' ')
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return name || 'Generated Image';
  }

  return 'Generated Image';
};

export class ImageGenerationService {
  private static instance: ImageGenerationService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3002';
  }

  static getInstance(): ImageGenerationService {
    if (!ImageGenerationService.instance) {
      ImageGenerationService.instance = new ImageGenerationService();
    }
    return ImageGenerationService.instance;
  }

  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult | ImageGenerationError> {
    try {
      const {
        prompt,
        name,
        size = '1024x1024',
        quality = 'medium',
        model = 'gpt-image-1',
        style,
      } = params;

      if (!prompt?.trim()) {
        return {
          success: false,
          error: 'Prompt is required for image generation',
          metadata: {
            timestamp: new Date().toISOString(),
            prompt: prompt || '',
          },
        };
      }

      // Apply rate limiting
      await checkRateLimit('image_generation', 5, 60000);

      console.log(`🎨 [ImageGenerationService] Generating image: "${prompt}"`);

      // Enhance prompt with style if provided
      let enhancedPrompt = prompt;
      if (style?.stylePrompt) {
        enhancedPrompt = `${style.stylePrompt} ${prompt}`;
      }

      // Call the backend AI API to generate image
      const response = await fetch(`${this.baseUrl}/api/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generate an image: ${enhancedPrompt}`,
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'image_gen',
                description: 'Generate images using AI',
                parameters: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string' },
                    name: { type: 'string' },
                    size: { type: 'string' },
                    quality: { type: 'string' },
                    model: { type: 'string' },
                  },
                  required: ['prompt', 'name'],
                },
              },
            },
          ],
          tool_choice: {
            type: 'function',
            function: { name: 'image_gen' },
          },
          model: 'gpt-4o',
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract tool call results
      const toolCalls = result.choices?.[0]?.message?.tool_calls;
      if (!toolCalls?.length) {
        throw new Error('No tool calls returned from API');
      }

      // For now, simulate the image generation response
      // In a real implementation, this would parse the actual tool call results
      const imageName = generateImageName(prompt, name);
      
      // Simulate different provider responses
      const mockImageData = {
        url: `https://picsum.photos/1024/1024?random=${Date.now()}`, // Placeholder image
        revised_prompt: enhancedPrompt,
      };

      console.log(`🎨 [ImageGenerationService] Generated image for "${prompt}"`);

      // For direct URL providers (like mock/placeholder)
      return {
        success: true,
        result: {
          data: {
            url: mockImageData.url,
            name: imageName,
            prompt,
            model,
            size,
            quality,
            revised_prompt: mockImageData.revised_prompt || prompt,
            isDirectUrl: true,
            provider: 'placeholder',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            model,
            name: imageName,
            prompt,
            format: 'direct_url',
            provider: 'placeholder',
            storageDetails: {
              isStoredInSupabase: false,
              isDirectUrl: true,
              originalUrl: mockImageData.url,
            },
          },
        },
      };

    } catch (error: any) {
      console.error('🎨 [ImageGenerationService] Generation failed:', error);
      
      return {
        success: false,
        error: error.message || 'Image generation failed',
        metadata: {
          timestamp: new Date().toISOString(),
          prompt: params.prompt,
        },
      };
    }
  }

  // Helper method to format image result for display
  static formatResultForDisplay(result: ImageGenerationResult): {
    url: string;
    name: string;
    prompt: string;
    metadata: any;
  } {
    return {
      url: result.result.data.url,
      name: result.result.data.name,
      prompt: result.result.data.prompt,
      metadata: result.result.metadata,
    };
  }
}

// Export singleton instance
export const imageGenerationService = ImageGenerationService.getInstance();

export default imageGenerationService; 