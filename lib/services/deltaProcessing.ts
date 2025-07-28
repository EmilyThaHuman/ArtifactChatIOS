import { ToolCall, accumulateToolCalls } from './streamingUtils';

// Delta processing interfaces
export interface StreamDelta {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
      tool_calls?: ToolCall[];
      metadata?: any;
    };
    finish_reason?: string;
  }>;
  delta?: {
    text?: string;
  };
  content?: string;
  metadata?: any;
}

export interface ReasoningState {
  isReasoningResponse: boolean;
  reasoningContent: string;
  inReasoningBlock: boolean;
  reasoningStartTime?: number;
  reasoningDuration?: number;
}

export interface DeltaProcessingResult {
  deltaContent: string;
  reasoningDeltaContent?: string;
  reasoningMetadata?: any;
  reasoningState: ReasoningState;
  hasDetectedToolCall: boolean;
  bufferingForToolCall: boolean;
  pendingToolCalls: ToolCall[];
  toolCallsFullyAccumulated: boolean;
  streamCompleted: boolean;
  canvasTriggered: boolean;
  hasCodeInterpreterUpdates: boolean;
}

// Track canvas triggers to prevent duplicates
const MAX_CANVAS_TRIGGERS = 50;
let canvasTriggeredForStream = new Map<string, number>();

/**
 * Clean up old canvas triggers to prevent memory leaks
 */
function cleanupCanvasTriggers(): void {
  if (canvasTriggeredForStream.size <= MAX_CANVAS_TRIGGERS) return;

  // Convert to array and sort by timestamp
  const entries = Array.from(canvasTriggeredForStream.entries()).sort(
    (a, b) => a[1] - b[1]
  );

  // Keep only the most recent triggers
  const toKeep = entries.slice(-MAX_CANVAS_TRIGGERS);
  canvasTriggeredForStream.clear();

  toKeep.forEach(([key, timestamp]) => {
    canvasTriggeredForStream.set(key, timestamp);
  });
}

/**
 * Extract content from stream delta based on provider
 */
export function extractDeltaContent(delta: StreamDelta, modelProvider: string): {
  content: string;
  reasoning_content: string;
} {
  let deltaContent = '';
  let reasoningContent = '';

  // Handle backend SSE format (wrapped in chunk)
  if (delta.choices && delta.choices[0] && delta.choices[0].delta) {
    deltaContent = delta.choices[0].delta.content || '';
    reasoningContent = delta.choices[0].delta.reasoning_content || '';
  } else if (delta.delta?.text) {
    // Direct Anthropic format (legacy support)
    deltaContent = delta.delta.text || '';
  } else if (delta.content) {
    // Direct content field
    deltaContent = delta.content || '';
  }

  return {
    content: deltaContent,
    reasoning_content: reasoningContent,
  };
}

/**
 * Extract reasoning metadata from delta
 */
export function extractReasoningMetadata(delta: StreamDelta): any | null {
  // Handle backend format with reasoning completion
  if (delta.choices && delta.choices[0]?.delta?.metadata) {
    const metadata = delta.choices[0].delta.metadata;

    // Check for reasoning completion signal
    if (metadata.reasoning_complete) {
      return {
        reasoning_complete: true,
        reasoning_token_count: metadata.reasoning_token_count,
        reasoning_seconds: metadata.reasoning_seconds,
        reasoning_transition: metadata.reasoning_transition,
      };
    }

    // Handle reasoning transition signal specifically
    if (metadata.reasoning_transition) {
      return {
        reasoning_transition: true,
        reasoning_complete: true,
      };
    }

    // Handle regular reasoning metadata
    if (metadata.reasoning_token_count) {
      return {
        reasoning_token_count: metadata.reasoning_token_count,
        reasoning_seconds: metadata.reasoning_seconds,
      };
    }
  }

  // Handle direct format
  if (delta.metadata?.reasoning_token_count) {
    return {
      reasoning_token_count: delta.metadata.reasoning_token_count,
      reasoning_seconds: delta.metadata.reasoning_seconds,
    };
  }

  return null;
}

/**
 * Process reasoning content for specific providers
 */
export function processReasoningContent(
  deltaContent: string,
  reasoningDeltaContent: string,
  modelProvider: string,
  reasoningState: ReasoningState
): ReasoningState {
  let {
    isReasoningResponse,
    reasoningContent,
    inReasoningBlock,
    reasoningStartTime,
    reasoningDuration,
  } = reasoningState;

  // Handle DeepSeek and Grok reasoning content directly from reasoning_content field
  if (
    (modelProvider === 'deepseek' ||
      modelProvider === 'xai' ||
      modelProvider === 'grok') &&
    reasoningDeltaContent
  ) {
    if (!isReasoningResponse) {
      isReasoningResponse = true;
      inReasoningBlock = true;
      reasoningStartTime = Date.now();
    }
    reasoningContent += reasoningDeltaContent;
  }
  // For DeepSeek and Grok, if we had reasoning content before but now we don't,
  // it means reasoning is complete
  else if (
    (modelProvider === 'deepseek' ||
      modelProvider === 'xai' ||
      modelProvider === 'grok') &&
    !reasoningDeltaContent &&
    isReasoningResponse
  ) {
    if (inReasoningBlock) {
      inReasoningBlock = false;
      if (reasoningStartTime) {
        reasoningDuration = Math.round((Date.now() - reasoningStartTime) / 1000);
      }
    }
  }
  // Handle XML-based reasoning content for other providers
  else if (typeof deltaContent === 'string') {
    // Handle DeepSeek reasoning with <thinking> tags (legacy support only)
    if (modelProvider === 'deepseek') {
      if (!isReasoningResponse) {
        if (deltaContent.includes('<thinking>') && !inReasoningBlock) {
          inReasoningBlock = true;
          isReasoningResponse = true;
          reasoningStartTime = Date.now();
        }

        if (deltaContent.includes('</thinking>') && inReasoningBlock) {
          inReasoningBlock = false;
          if (reasoningStartTime) {
            reasoningDuration = Math.round((Date.now() - reasoningStartTime) / 1000);
          }
        }

        if (inReasoningBlock) {
          reasoningContent += deltaContent;
        }
      }
    }
    // Handle Perplexity reasoning with <think> tags
    else if (modelProvider === 'perplexity') {
      if (deltaContent.includes('<think>') && !inReasoningBlock) {
        inReasoningBlock = true;
        isReasoningResponse = true;
        reasoningStartTime = Date.now();
      }

      if (deltaContent.includes('</think>') && inReasoningBlock) {
        inReasoningBlock = false;
        if (reasoningStartTime) {
          reasoningDuration = Math.round((Date.now() - reasoningStartTime) / 1000);
        }
      }

      if (inReasoningBlock) {
        reasoningContent += deltaContent;
      }
    }
  }

  return {
    isReasoningResponse,
    reasoningContent,
    inReasoningBlock,
    reasoningStartTime,
    reasoningDuration,
  };
}

/**
 * Check if a tool call is a canvas tool
 */
export function isCanvasTool(toolCall: ToolCall): boolean {
  if (!toolCall?.function?.name) return false;

  const toolName = toolCall.function.name;
  return (
    toolName === 'canvas_create' ||
    toolName === 'canvas_edit' ||
    toolName.startsWith('canvas_')
  );
}

/**
 * Trigger canvas opening when canvas tool is detected
 */
export function triggerCanvasIfNeeded(toolCalls: ToolCall[], streamId?: string): boolean {
  const canvasTools = toolCalls.filter(isCanvasTool);

  if (canvasTools.length === 0) {
    return false;
  }

  // Create a unique identifier for this trigger
  const triggerId =
    streamId ||
    `${Date.now()}_${canvasTools.map((t) => t.function?.name || 'unknown').join('_')}`;

  // Check if already triggered
  if (canvasTriggeredForStream.has(triggerId)) {
    return false;
  }

  try {
    // Mark as triggered with timestamp
    const now = Date.now();
    canvasTriggeredForStream.set(triggerId, now);

    // Clean up old triggers periodically
    if (canvasTriggeredForStream.size > MAX_CANVAS_TRIGGERS) {
      cleanupCanvasTriggers();
    }

    // Dispatch event to open canvas sidebar immediately
    const openSidebarEvent = new CustomEvent('open-canvas-sidebar', {
      detail: {
        source: 'canvas-tool-detected-in-stream',
        timestamp: new Date().toISOString(),
        toolNames: canvasTools.map((t) => t.function?.name),
        triggerId,
      },
    });

    // In React Native, we don't have window.dispatchEvent
    // Instead, we'll use a different notification mechanism
    console.log('🎨 [triggerCanvasIfNeeded] Canvas tool detected, would trigger canvas opening:', {
      toolNames: canvasTools.map((t) => t.function?.name),
      triggerId,
    });

    return true;
  } catch (error) {
    console.error('Could not trigger canvas opening:', error);
    // Remove from triggered set if there was an error
    canvasTriggeredForStream.delete(triggerId);
  }

  return false;
}

/**
 * Process tool calls from delta
 */
export function processToolCallsFromDelta(
  delta: StreamDelta,
  pendingToolCalls: ToolCall[],
  modelProvider: string
): {
  hasDetectedToolCall: boolean;
  bufferingForToolCall: boolean;
  pendingToolCalls: ToolCall[];
  canvasTriggered: boolean;
  hasCodeInterpreterUpdates: boolean;
} {
  let hasDetectedToolCall = false;
  let bufferingForToolCall = false;
  let updatedPendingToolCalls = [...pendingToolCalls];
  let canvasTriggered = false;
  let hasCodeInterpreterUpdates = false;

  // Handle backend SSE format
  if (delta.choices && delta.choices[0]?.delta?.tool_calls) {
    bufferingForToolCall = true;
    hasDetectedToolCall = true;

    const incomingToolCalls = delta.choices[0].delta.tool_calls || [];

    // The backend provides properly formatted tool calls for all providers
    const existingIds = new Set(
      updatedPendingToolCalls.map((tc) => tc.id).filter(Boolean)
    );

    for (const toolCall of incomingToolCalls) {
      // Ensure tool call has an ID
      if (!toolCall.id) {
        if (modelProvider === 'mistral') {
          const alphanumeric =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let mistralId = '';
          for (let i = 0; i < 9; i++) {
            mistralId += alphanumeric.charAt(
              Math.floor(Math.random() * alphanumeric.length)
            );
          }
          toolCall.id = mistralId;
        } else {
          toolCall.id = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
      } else if (existingIds.has(toolCall.id)) {
        // Handle duplicate IDs for Mistral
        if (modelProvider === 'mistral') {
          const alphanumeric =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let mistralId = '';
          for (let i = 0; i < 9; i++) {
            mistralId += alphanumeric.charAt(
              Math.floor(Math.random() * alphanumeric.length)
            );
          }
          toolCall.id = mistralId;
        }
      }
    }

    // Use the accumulation function
    updatedPendingToolCalls = accumulateToolCalls(
      updatedPendingToolCalls,
      incomingToolCalls,
      modelProvider
    );

    // Check for canvas tools and trigger canvas opening immediately
    const allToolCalls = [...updatedPendingToolCalls];
    const streamId = allToolCalls
      .map((tc) => `${tc.id || 'unknown'}_${tc.function?.name || 'unknown'}`)
      .join('|');
    canvasTriggered = triggerCanvasIfNeeded(allToolCalls, streamId);

    // Check for code interpreter updates
    hasCodeInterpreterUpdates = updatedPendingToolCalls.some((toolCall) => {
      if (toolCall.function?.name !== 'code_interpreter') return false;

      const args = toolCall.function?.arguments;
      if (!args || args === '' || args === '{}' || args === '{"code":""}') {
        return false;
      }

      try {
        const parsed = JSON.parse(args);
        return parsed.code && parsed.code.trim().length > 0;
      } catch (e) {
        return args.length > 10;
      }
    });
  }

  return {
    hasDetectedToolCall,
    bufferingForToolCall,
    pendingToolCalls: updatedPendingToolCalls,
    canvasTriggered,
    hasCodeInterpreterUpdates,
  };
}

/**
 * Check if tool calls are complete
 */
export function areToolCallsComplete(pendingToolCalls: ToolCall[]): boolean {
  if (pendingToolCalls.length === 0) return false;

  return pendingToolCalls.some((tc) => {
    if (!tc.function?.arguments) return false;
    try {
      JSON.parse(tc.function.arguments);
      return true;
    } catch (e) {
      return false;
    }
  });
}

/**
 * Process stream delta and update state
 */
export function processStreamDelta(params: {
  delta: StreamDelta;
  modelProvider: string;
  modelName: string;
  messageId: string;
  reasoningState: ReasoningState;
  pendingToolCalls: ToolCall[];
  bufferingForToolCall: boolean;
  hasDetectedToolCall: boolean;
  toolCallsFullyAccumulated: boolean;
  toolChoice?: any;
  contextData?: any;
}): DeltaProcessingResult {
  const {
    delta,
    modelProvider,
    modelName,
    messageId,
    reasoningState,
    pendingToolCalls,
    bufferingForToolCall,
    hasDetectedToolCall,
    toolCallsFullyAccumulated,
    toolChoice,
    contextData = {},
  } = params;

  // Extract content and reasoning content
  const { content: deltaContent, reasoning_content: reasoningDeltaContent } =
    extractDeltaContent(delta, modelProvider);

  // Extract reasoning metadata
  const reasoningMetadata = extractReasoningMetadata(delta);

  // Process tool calls first to detect if this delta contains tool calls
  const toolCallResult = processToolCallsFromDelta(
    delta,
    pendingToolCalls,
    modelProvider
  );

  // Process reasoning content
  let updatedReasoningState = processReasoningContent(
    deltaContent,
    reasoningDeltaContent,
    modelProvider,
    reasoningState
  );

  // Handle reasoning completion from backend metadata
  if (
    reasoningMetadata?.reasoning_complete &&
    reasoningMetadata?.reasoning_seconds
  ) {
    updatedReasoningState = {
      ...updatedReasoningState,
      reasoningDuration: reasoningMetadata.reasoning_seconds,
      inReasoningBlock: false,
    };
  }

  // Handle reasoning transition metadata
  if (
    reasoningMetadata?.reasoning_transition ||
    reasoningMetadata?.reasoning_complete
  ) {
    updatedReasoningState = {
      ...updatedReasoningState,
      inReasoningBlock: false,
      reasoningDuration:
        reasoningMetadata.reasoning_seconds ||
        updatedReasoningState.reasoningDuration,
    };
  }

  // Check if stream is completed
  let streamCompleted = false;
  let updatedToolCallsFullyAccumulated = toolCallsFullyAccumulated;

  if (delta.choices && delta.choices[0]?.finish_reason) {
    streamCompleted = true;

    if (delta.choices[0].finish_reason === 'tool_calls') {
      updatedToolCallsFullyAccumulated = true;

      // Ensure we have tool calls in pending array
      if (
        toolCallResult.pendingToolCalls.length === 0 &&
        delta.choices[0].delta?.tool_calls
      ) {
        const toolCallsFromFinish = delta.choices[0].delta.tool_calls.map(
          (tc: any) => ({
            ...tc,
            id:
              tc.id ||
              `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: tc.type || 'function',
            isStreaming: false,
          })
        );
        toolCallResult.pendingToolCalls = [
          ...toolCallResult.pendingToolCalls,
          ...toolCallsFromFinish,
        ];
      }
    }
  }

  return {
    deltaContent,
    reasoningDeltaContent,
    reasoningMetadata,
    reasoningState: updatedReasoningState,
    hasDetectedToolCall:
      toolCallResult.hasDetectedToolCall || hasDetectedToolCall,
    bufferingForToolCall:
      toolCallResult.bufferingForToolCall || bufferingForToolCall,
    pendingToolCalls: toolCallResult.pendingToolCalls,
    toolCallsFullyAccumulated: updatedToolCallsFullyAccumulated,
    streamCompleted,
    canvasTriggered: toolCallResult.canvasTriggered || false,
    hasCodeInterpreterUpdates:
      toolCallResult.hasCodeInterpreterUpdates || false,
  };
}

/**
 * Initialize reasoning state
 */
export function initializeReasoningState(): ReasoningState {
  return {
    isReasoningResponse: false,
    reasoningContent: '',
    inReasoningBlock: false,
    reasoningStartTime: undefined,
    reasoningDuration: undefined,
  };
}

/**
 * Clear canvas trigger for a stream
 */
export function clearCanvasTrigger(streamId: string): void {
  if (canvasTriggeredForStream.has(streamId)) {
    canvasTriggeredForStream.delete(streamId);
  }
}

export default {
  extractDeltaContent,
  extractReasoningMetadata,
  processReasoningContent,
  isCanvasTool,
  triggerCanvasIfNeeded,
  processToolCallsFromDelta,
  areToolCallsComplete,
  processStreamDelta,
  initializeReasoningState,
  clearCanvasTrigger,
}; 