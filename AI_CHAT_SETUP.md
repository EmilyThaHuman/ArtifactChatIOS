# AI Chat Interface Setup Guide

## Overview

The Artifact Intelligence iOS app now includes a fully functional AI chat interface with the following features:

- **OpenAI Integration**: Streaming chat completions with GPT-4o, GPT-4 Turbo, and GPT-3.5 Turbo
- **Markdown Rendering**: Rich text formatting for AI responses including code blocks, lists, and links
- **Real-time Streaming**: Live response streaming with typing indicators
- **Network Monitoring**: Automatic detection of connectivity issues
- **Message Persistence**: Conversations saved to Supabase database
- **Model Selection**: Switch between different OpenAI models
- **Stop Generation**: Ability to cancel ongoing AI responses

## Required Dependencies

The following dependencies have been installed:

```bash
npm install stream-chat-react-native @react-native-community/netinfo react-native-fs react-native-image-resizer react-native-markdown-display openai
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# OpenAI API Configuration
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key

# Supabase Configuration (already configured)
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Key Components

### 1. ChatInterface Component (`components/ui/ChatInterface.tsx`)

The main chat interface component that includes:
- Message rendering with markdown support
- Input handling with multiline support
- Model selection modal
- Network status monitoring
- Streaming response handling

### 2. useChat Hook (`hooks/useChat.ts`)

A custom React hook that manages:
- Chat state and message history
- OpenAI API interactions
- Message persistence to Supabase
- Network connectivity monitoring
- Error handling and retry logic

### 3. OpenAI Service (`lib/openai.ts`)

A service class that handles:
- OpenAI client initialization
- Streaming chat completions
- Model configuration
- API key validation

## Usage Examples

### Basic Chat Interface

```tsx
import ChatInterface from '@/components/ui/ChatInterface';

function MyScreen() {
  return (
    <ChatInterface
      onMenuPress={() => {/* handle menu */}}
      title="AI Assistant"
      showInput={true}
      showSuggestions={true}
      threadId="thread-123"
      workspaceId="workspace-456"
    />
  );
}
```

### Using the Chat Hook Directly

```tsx
import { useChat } from '@/hooks/useChat';

function CustomChatComponent() {
  const {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
  } = useChat({
    threadId: 'my-thread',
    workspaceId: 'my-workspace',
    model: 'gpt-4o',
  });

  return (
    // Your custom UI
  );
}
```

## Features

### Markdown Support

The chat interface supports rich markdown rendering including:
- **Bold** and *italic* text
- `Inline code` and code blocks
- Lists (ordered and unordered)
- Links and headings
- Blockquotes
- Syntax highlighting for code

### Model Selection

Users can choose from multiple OpenAI models:
- **GPT-4o**: Latest and most capable model
- **GPT-4 Turbo**: High-quality responses
- **GPT-3.5 Turbo**: Fast and efficient

### Network Handling

- Automatic detection of network connectivity
- Graceful handling of offline states
- Retry mechanisms for failed requests
- User feedback for connection issues

### Message Persistence

- All conversations are saved to Supabase
- Thread-based message organization
- Automatic loading of conversation history
- Support for workspace-based organization

## Database Schema

The chat functionality uses these Supabase tables:

### `threads`
- `id`: Thread identifier
- `workspace_id`: Associated workspace
- `title`: Thread title
- `created_at`: Creation timestamp
- Other metadata fields

### `thread_messages`
- `id`: Message identifier
- `thread_id`: Associated thread
- `workspace_id`: Associated workspace
- `role`: Message role (user/assistant/system)
- `content`: Message content
- `created_at`: Creation timestamp
- Other metadata fields

## Error Handling

The implementation includes comprehensive error handling:

1. **Network Errors**: Automatic detection and user notification
2. **API Errors**: Graceful degradation with error messages
3. **Validation Errors**: Input validation and user feedback
4. **Rate Limiting**: Proper handling of OpenAI rate limits
5. **Timeout Handling**: Request timeouts with retry options

## Performance Optimizations

- **Streaming Responses**: Real-time response rendering
- **Message Virtualization**: Efficient handling of long conversations
- **Debounced Input**: Optimized text input handling
- **Memory Management**: Proper cleanup of resources
- **Network Optimization**: Efficient API usage

## Security Considerations

- API keys stored securely in environment variables
- Input sanitization for user messages
- Proper error message handling (no sensitive data exposure)
- Rate limiting and abuse prevention
- Secure token storage using Expo SecureStore

## Testing

To test the chat functionality:

1. Ensure you have a valid OpenAI API key
2. Set up the environment variables
3. Run the app: `npm run dev`
4. Navigate to the chat interface
5. Try sending messages and testing different models

## Troubleshooting

### Common Issues

1. **"API Key Missing" Error**
   - Ensure `EXPO_PUBLIC_OPENAI_API_KEY` is set in your `.env` file
   - Verify the API key starts with `sk-`

2. **Network Connection Issues**
   - Check internet connectivity
   - Verify firewall settings
   - Test with different networks

3. **Messages Not Saving**
   - Check Supabase configuration
   - Verify database permissions
   - Check console for database errors

4. **Streaming Not Working**
   - Ensure you're using a compatible OpenAI model
   - Check for network proxy issues
   - Verify API key permissions

### Debug Mode

Enable debug logging by adding to your environment:

```env
EXPO_PUBLIC_DEBUG_CHAT=true
```

This will provide detailed console output for troubleshooting.

## Future Enhancements

Potential improvements for future versions:

1. **Voice Input**: Speech-to-text integration
2. **File Attachments**: Support for image and document uploads
3. **Custom Models**: Integration with other AI providers
4. **Conversation Export**: Export chat history
5. **Search**: Search within conversation history
6. **Themes**: Customizable chat themes
7. **Plugins**: Extensible plugin system

## Support

For issues or questions:
1. Check the console for error messages
2. Verify environment variable configuration
3. Test with a fresh API key
4. Check network connectivity
5. Review Supabase database logs 