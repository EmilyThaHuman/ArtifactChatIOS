import { Message } from '@/hooks/useChat';
import { extractToolData, ToolData, WebSearchToolData, ImageToolData } from './toolDataExtractors';

export interface ProcessedMessage extends Message {
  // Tool data from this message or inherited from previous tool call message
  toolData?: ToolData;
  // Whether this message should be rendered in the UI
  shouldRender: boolean;
  // ID of the tool call message this assistant message is responding to
  toolCallMessageId?: string;
  // Previous message tool data for action buttons
  previousMessageToolData?: {
    webSearchData?: WebSearchToolData;
    imageData?: ImageToolData;
    canvasData?: any;
    hasToolCalls?: boolean;
  };
}

/**
 * Process messages to handle tool call data propagation and filtering
 * @param messages Raw messages from the chat
 * @returns Processed messages with tool data and rendering flags
 */
export function processMessages(messages: Message[]): ProcessedMessage[] {
  if (!messages || messages.length === 0) return [];

  const processedMessages: ProcessedMessage[] = [];
  
  // Track tool call messages and their data
  const toolCallMessages = new Map<string, ToolData>();
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const isUser = message.role === 'user';
    
    // Extract tool data from current message
    const toolData = extractToolData(message, isUser);
    
    // Check if this is a tool call message (assistant message with tool calls)
    const isToolCallMessage = 
      message.role === 'assistant' && 
      toolData.hasToolData && 
      toolData.toolCalls && 
      toolData.toolCalls.length > 0 &&
      (!message.content || message.content.trim() === '' || message.content.trim() === ' ');
    
    // Store tool call message data
    if (isToolCallMessage) {
      toolCallMessages.set(message.id, toolData);
    }
    
    // Check if this is a follow-up assistant message after a tool call
    const isFollowUpMessage = 
      message.role === 'assistant' && 
      message.metadata?.isFollowUpContent === true &&
      message.metadata?.toolCallMessageId;
    
    // Get tool data from previous tool call message if this is a follow-up
    let inheritedToolData: ToolData | undefined;
    if (isFollowUpMessage && message.metadata?.toolCallMessageId) {
      inheritedToolData = toolCallMessages.get(message.metadata.toolCallMessageId);
    }
    
    // Get previous message tool data for action buttons
    let previousMessageToolData: ProcessedMessage['previousMessageToolData'] | undefined;
    if (i > 0 && !isUser) {
      const prevMessage = messages[i - 1];
      const prevToolData = extractToolData(prevMessage, prevMessage.role === 'user');
      
      if (prevToolData.hasToolData) {
        previousMessageToolData = {
          webSearchData: prevToolData.webSearchData,
          imageData: prevToolData.imageData,
          canvasData: undefined, // Canvas not implemented in iOS yet
          hasToolCalls: prevToolData.toolCalls && prevToolData.toolCalls.length > 0,
        };
      } else if (prevMessage.metadata?.toolCallMessageId) {
        // Check if previous message references a tool call message
        const toolCallData = toolCallMessages.get(prevMessage.metadata.toolCallMessageId);
        if (toolCallData) {
          previousMessageToolData = {
            webSearchData: toolCallData.webSearchData,
            imageData: toolCallData.imageData,
            canvasData: undefined,
            hasToolCalls: toolCallData.toolCalls && toolCallData.toolCalls.length > 0,
          };
        }
      }
    }
    
    const processedMessage: ProcessedMessage = {
      ...message,
      toolData: inheritedToolData || (toolData.hasToolData ? toolData : undefined),
      shouldRender: !isToolCallMessage, // Don't render tool call messages
      toolCallMessageId: message.metadata?.toolCallMessageId,
      previousMessageToolData,
    };
    
    processedMessages.push(processedMessage);
  }
  
  return processedMessages;
}

/**
 * Get tool data for a specific message, including inherited data
 * @param messages All messages
 * @param messageId The message ID to get tool data for
 * @returns Tool data for the message
 */
export function getMessageToolData(messages: Message[], messageId: string): ToolData | undefined {
  const processedMessages = processMessages(messages);
  const message = processedMessages.find(m => m.id === messageId);
  return message?.toolData;
}

/**
 * Check if a message should be rendered in the UI
 * @param message The message to check
 * @returns Whether the message should be rendered
 */
export function shouldRenderMessage(message: Message): boolean {
  const isUser = message.role === 'user';
  const toolData = extractToolData(message, isUser);
  
  // Tool call messages with no content should not be rendered
  const isToolCallMessage = 
    message.role === 'assistant' && 
    toolData.hasToolData && 
    toolData.toolCalls && 
    toolData.toolCalls.length > 0 &&
    (!message.content || message.content.trim() === '' || message.content.trim() === ' ');
  
  return !isToolCallMessage;
}

/**
 * Get the tool call message ID that an assistant message is responding to
 * @param message The assistant message
 * @returns The tool call message ID or undefined
 */
export function getToolCallMessageId(message: Message): string | undefined {
  if (message.role !== 'assistant') return undefined;
  
  // Check if this message has metadata indicating it's a follow-up
  if (message.metadata?.isFollowUpContent && message.metadata?.toolCallMessageId) {
    return message.metadata.toolCallMessageId;
  }
  
  return undefined;
}

/**
 * Extract tool data from a tool call message for use in subsequent messages
 * @param toolCallMessage The tool call message
 * @returns Extracted tool data
 */
export function extractToolCallMessageData(toolCallMessage: Message): ToolData {
  return extractToolData(toolCallMessage, false);
}