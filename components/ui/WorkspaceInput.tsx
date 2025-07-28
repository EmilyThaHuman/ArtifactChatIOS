import React from 'react';
import ChatInput from '@/components/ui/ChatInput';

interface WorkspaceInputProps {
  onSendMessage: (messageData: { message: string; toolChoice?: { toolId: string; toolName: string } | null }) => void;
  placeholder?: string;
  disabled?: boolean;
  workspaceId?: string;
}

export default function WorkspaceInput({
  onSendMessage,
  placeholder = "Message...",
  disabled = false,
  workspaceId,
}: WorkspaceInputProps) {
  const handleSendMessage = (content: string, files?: any[], toolChoice?: { toolId: string; toolName: string } | null) => {
    const messageData = {
      message: content,
      toolChoice,
    };
    
    onSendMessage(messageData);
  };

  return (
    <ChatInput
      onSendMessage={handleSendMessage}
      placeholder={placeholder}
      disabled={disabled}
      isLoading={false}
      isConnected={true}
      threadId={undefined}
      workspaceId={workspaceId}
      streamingMessageId={null}
      onStopGeneration={undefined}
      showAdvancedFeatures={false} // Workspace input shows simplified version
      maxLength={4000}
    />
  );
} 