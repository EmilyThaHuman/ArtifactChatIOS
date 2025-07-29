import { Message } from '@/hooks/useChat';
import { WebSearchResult, WebSearchSource } from '@/lib/services/webSearchService';
import { ImageGenerationResult } from '@/lib/services/imageGenerationService';

// Interface for tool data
export interface ToolData {
  hasToolData: boolean;
  webSearchData?: WebSearchToolData;
  imageData?: ImageToolData;
  toolCalls?: ToolCall[];
}

export interface WebSearchToolData {
  hasWebSearch: boolean;
  sources: WebSearchSource[];
  summary: string;
  metadata?: any;
}

export interface ImageToolData {
  hasImages: boolean;
  images: GeneratedImage[];
  metadata?: any;
}

export interface GeneratedImage {
  url: string;
  name: string;
  prompt: string;
  metadata?: any;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
  output?: any;
  result?: any; // Tool execution result
}

/**
 * Check if a message has any tool-related data
 */
export function hasToolData(message: Message): boolean {
  if (!message) return false;

  // Check for tool calls in both locations
  if ((message.toolCalls && message.toolCalls.length > 0) ||
      (message.metadata?.tool_calls && message.metadata.tool_calls.length > 0) ||
      (message.metadata?.toolCalls && message.metadata.toolCalls.length > 0)) {
    return true;
  }

  // Check for web search data
  if (message.metadata?.webSearchData || message.metadata?.sources) {
    return true;
  }

  // Check for image generation data
  if (message.metadata?.imageData || message.metadata?.generatedImages) {
    return true;
  }

  // Check for tool outputs in metadata
  if (message.metadata?.toolOutputs) {
    return true;
  }

  return false;
}

/**
 * Extract all tool data from a message
 */
export function extractToolData(message: Message, isUser = false): ToolData {
  if (!message) {
    return { hasToolData: false };
  }

  const toolData: ToolData = {
    hasToolData: false,
  };

  // Extract tool calls data
  const toolCallsData = extractToolCallsData(message);
  if (toolCallsData.length > 0) {
    toolData.toolCalls = toolCallsData;
    toolData.hasToolData = true;
  }

  // Extract web search data
  const webSearchData = extractWebSearchData(message, isUser);
  if (webSearchData.hasWebSearch) {
    toolData.webSearchData = webSearchData;
    toolData.hasToolData = true;
  }

  // Extract image generation data
  const imageData = extractImageData(message, isUser);
  if (imageData.hasImages) {
    toolData.imageData = imageData;
    toolData.hasToolData = true;
  }

  return toolData;
}

/**
 * Extract specific tool data by type
 */
export function extractSpecificToolData(
  message: Message, 
  type: 'webSearch' | 'imageGen' | 'toolCalls', 
  isUser = false
): any {
  switch (type) {
    case 'webSearch':
      return extractWebSearchData(message, isUser);
    case 'imageGen':
      return extractImageData(message, isUser);
    case 'toolCalls':
      return extractToolCallsData(message);
    default:
      return null;
  }
}

/**
 * Extract tool calls data from message
 */
function extractToolCallsData(message: Message): ToolCall[] {
  // Check both locations where tool calls might be stored
  let toolCallsArray = null;
  
  if (message?.toolCalls && Array.isArray(message.toolCalls)) {
    toolCallsArray = message.toolCalls;
  } else if (message?.metadata?.tool_calls && Array.isArray(message.metadata.tool_calls)) {
    toolCallsArray = message.metadata.tool_calls;
  } else if (message?.metadata?.toolCalls && Array.isArray(message.metadata.toolCalls)) {
    toolCallsArray = message.metadata.toolCalls;
  }

  if (!toolCallsArray || toolCallsArray.length === 0) {
    return [];
  }

  try {
    return toolCallsArray.map((call: any) => ({
      id: call.id || crypto.randomUUID(),
      type: call.type || 'function',
      function: {
        name: call.function?.name || '',
        arguments: call.function?.arguments || '{}',
      },
      output: call.output,
      result: call.result, // Tool execution result
    }));
  } catch (error) {
    console.error('Error extracting tool calls data:', error);
    return [];
  }
}

/**
 * Extract web search data from message
 */
function extractWebSearchData(message: Message, isUser: boolean): WebSearchToolData {
  const defaultData: WebSearchToolData = {
    hasWebSearch: false,
    sources: [],
    summary: '',
  };

  if (!message?.metadata) {
    return defaultData;
  }

  try {
    // Check for web search data in metadata
    let webSearchData = null;
    let sources: WebSearchSource[] = [];
    let summary = '';

    // Check different possible locations for web search data
    if (message.metadata.webSearchData) {
      webSearchData = message.metadata.webSearchData;
    } else if (message.metadata.sources) {
      sources = message.metadata.sources;
      summary = message.metadata.summary || message.content;
    } else if (message.metadata.toolOutputs) {
      // Look for web search in tool outputs
      const webSearchOutput = message.metadata.toolOutputs.find(
        (output: any) => output.type === 'web_search' || output.function?.name === 'web_search'
      );
      
      if (webSearchOutput?.output) {
        try {
          const parsedOutput = typeof webSearchOutput.output === 'string' 
            ? JSON.parse(webSearchOutput.output) 
            : webSearchOutput.output;
          
          if (parsedOutput.sources) {
            sources = parsedOutput.sources;
            summary = parsedOutput.content || parsedOutput.summary || '';
          }
        } catch (e) {
          console.warn('Failed to parse web search output:', e);
        }
      }
    }

    // Process the web search data
    if (webSearchData) {
      sources = webSearchData.sources || webSearchData.data || [];
      summary = webSearchData.content || webSearchData.summary || webSearchData.markdown || '';
    }

    if (sources.length > 0 || summary) {
      return {
        hasWebSearch: true,
        sources: sources.map((source: any) => ({
          url: source.url || '',
          title: source.title || '',
          description: source.description || '',
          text: source.text || '',
          published: source.published || source.publishedDate,
          image: source.image,
          metadata: source.metadata,
        })),
        summary,
        metadata: webSearchData,
      };
    }

    return defaultData;
  } catch (error) {
    console.error('Error extracting web search data:', error);
    return defaultData;
  }
}

/**
 * Extract image generation data from message
 */
function extractImageData(message: Message, isUser: boolean): ImageToolData {
  const defaultData: ImageToolData = {
    hasImages: false,
    images: [],
  };

  if (!message?.metadata && !message?.toolCalls) {
    return defaultData;
  }

  try {
    let images: GeneratedImage[] = [];

    // Check for image data in metadata
    if (message.metadata?.imageData) {
      const imageData = message.metadata.imageData;
      if (imageData.url) {
        images.push({
          url: imageData.url,
          name: imageData.name || 'Generated Image',
          prompt: imageData.prompt || '',
          metadata: imageData,
        });
      }
    } else if (message.metadata?.generatedImages) {
      images = message.metadata.generatedImages.map((img: any) => ({
        url: img.url || '',
        name: img.name || 'Generated Image',
        prompt: img.prompt || '',
        metadata: img,
      }));
    }
    
    // Check for image generation in tool calls (both locations)
    const toolCalls = message.toolCalls || message.metadata?.tool_calls || message.metadata?.toolCalls;
    if (toolCalls && Array.isArray(toolCalls)) {
      for (const toolCall of toolCalls) {
        if (toolCall.function?.name === 'image_gen' || 
            toolCall.function?.name === 'dalle3_image_generation' ||
            toolCall.function?.name === 'generate_image') {
          
          if (toolCall.output) {
            try {
              const parsedOutput = typeof toolCall.output === 'string' 
                ? JSON.parse(toolCall.output) 
                : toolCall.output;
              
              // Handle different output formats
              let imageUrl = null;
              let prompt = '';
              let name = 'Generated Image';
              
              if (parsedOutput.result?.data?.url) {
                imageUrl = parsedOutput.result.data.url;
                prompt = parsedOutput.result.data.prompt || '';
                name = parsedOutput.result.data.name || 'Generated Image';
              } else if (parsedOutput.data?.[0]?.url) {
                imageUrl = parsedOutput.data[0].url;
                prompt = parsedOutput.data[0].revised_prompt || parsedOutput.data[0].prompt || '';
                name = parsedOutput.data[0].name || 'Generated Image';
              } else if (parsedOutput.url) {
                imageUrl = parsedOutput.url;
                prompt = parsedOutput.prompt || '';
                name = parsedOutput.name || 'Generated Image';
              }
              
              if (imageUrl) {
                images.push({
                  url: imageUrl,
                  name,
                  prompt,
                  metadata: parsedOutput,
                });
              }
            } catch (e) {
              console.warn('Failed to parse image generation output:', e);
            }
          }
        }
      }
    }
    
    // Also check legacy toolOutputs format
    if (message.metadata?.toolOutputs) {
      const imageOutput = message.metadata.toolOutputs.find(
        (output: any) => output.type === 'image_gen' || output.function?.name === 'image_gen'
      );
      
      if (imageOutput?.output && images.length === 0) {
        try {
          const parsedOutput = typeof imageOutput.output === 'string' 
            ? JSON.parse(imageOutput.output) 
            : imageOutput.output;
          
          if (parsedOutput.result?.data?.url) {
            images.push({
              url: parsedOutput.result.data.url,
              name: parsedOutput.result.data.name || 'Generated Image',
              prompt: parsedOutput.result.data.prompt || '',
              metadata: parsedOutput.result,
            });
          }
        } catch (e) {
          console.warn('Failed to parse image generation output:', e);
        }
      }
    }

    if (images.length > 0) {
      return {
        hasImages: true,
        images,
        metadata: message.metadata?.imageData || message.metadata?.generatedImages,
      };
    }

    return defaultData;
  } catch (error) {
    console.error('Error extracting image data:', error);
    return defaultData;
  }
}

/**
 * Hook to extract tool data from message with memoization
 */
export function useToolData(message: Message, isUser = false): ToolData {
  if (!message) {
    return { hasToolData: false };
  }

  return extractToolData(message, isUser);
}

/**
 * Check if message has tool calls (for loading states)
 */
export function useHasToolCalls(message: Message): boolean {
  return !!(
    (message?.toolCalls && message.toolCalls.length > 0) ||
    (message?.metadata?.tool_calls && message.metadata.tool_calls.length > 0) ||
    (message?.metadata?.toolCalls && message.metadata.toolCalls.length > 0)
  );
}

/**
 * Helper to check if a message is a tool call message
 */
export function isToolCallMessage(message: Message): boolean {
  return message.role === 'assistant' && hasToolData(message);
}

/**
 * Helper to check if a message is currently processing tools
 */
export function isProcessingTools(message: Message): boolean {
  return !!(
    message?.metadata?.isProcessingTools || 
    message?.metadata?.isSearching ||
    message?.metadata?.isGeneratingImage
  );
}

/**
 * Helper to get tool call status
 */
export function getToolCallStatus(message: Message): 'pending' | 'processing' | 'completed' | 'error' {
  if (!hasToolData(message)) {
    return 'completed';
  }

  if (isProcessingTools(message)) {
    return 'processing';
  }

  if (message.metadata?.toolError) {
    return 'error';
  }

  const toolData = extractToolData(message);
  if (toolData.hasToolData) {
    return 'completed';
  }

  return 'pending';
} 