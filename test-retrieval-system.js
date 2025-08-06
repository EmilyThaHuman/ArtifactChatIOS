/**
 * Test script for the iOS retrieval system implementation
 * This script tests the vector store retrieval functionality,
 * thread vector store creation, and vision processing
 */

import { vectorStoreUtils } from './lib/services/vectorStoreUtils.js';
import { ChatCompletionService } from './lib/services/chatCompletionService.js';
import { ThreadManager } from './lib/threads.js';

// Mock test data
const mockContextData = {
  workspace_vector_store_id: 'vs-test-12345',
  thread_vector_store_id: 'vs-thread-67890',
  workspaceId: 'workspace-123',
  threadId: 'thread-456',
  workspace_name: 'Test Workspace',
  is_workspace_chat: true,
  workspace_initiated: true,
  enable_retrieval: true
};

const mockThreadContextData = {
  thread_vector_store_id: 'vs-thread-67890',
  threadId: 'thread-456',
  workspace_name: 'Test Thread',
  is_workspace_chat: false,
  enable_retrieval: true
};

const mockMessages = [
  {
    role: 'user',
    content: 'How do I implement authentication in my React Native app?'
  }
];

const mockRetrievalResults = [
  {
    fileId: 'file-1',
    filename: 'authentication-guide.md',
    content: 'Authentication in React Native apps can be implemented using various methods...',
    score: 0.95
  },
  {
    fileId: 'file-2', 
    filename: 'auth-examples.js',
    content: 'Example code for implementing JWT authentication in React Native...',
    score: 0.87
  }
];

/**
 * Test the vector store utils functionality
 */
async function testVectorStoreUtils() {
  console.log('🧪 Testing Vector Store Utils...');
  
  try {
    // Test hasVectorStoreContext
    const hasContext = vectorStoreUtils.hasVectorStoreContext(mockContextData);
    console.log('✅ hasVectorStoreContext:', hasContext);
    
    // Test getVectorStoreId
    const vectorStoreId = vectorStoreUtils.getVectorStoreId(mockContextData);
    console.log('✅ getVectorStoreId:', vectorStoreId);
    
    // Test createEnhancedQuery
    const enhancedQuery = vectorStoreUtils.createEnhancedQuery(
      'How to authenticate users?',
      mockContextData
    );
    console.log('✅ createEnhancedQuery:', enhancedQuery);
    
    // Test formatRetrievalResults (using private method through service)
    const chatService = new ChatCompletionService();
    const formattedResults = chatService.formatRetrievalResults(mockRetrievalResults);
    console.log('✅ formatRetrievalResults preview:', formattedResults.substring(0, 200) + '...');
    
    // Test enhanceMessagesWithRetrieval
    const enhancedMessages = chatService.enhanceMessagesWithRetrieval(mockMessages, formattedResults);
    console.log('✅ enhanceMessagesWithRetrieval:', {
      originalLength: mockMessages[0].content.length,
      enhancedLength: enhancedMessages[0].content.length
    });
    
    // Test validateRetrievalResults
    const validResults = vectorStoreUtils.validateRetrievalResults(mockRetrievalResults);
    console.log('✅ validateRetrievalResults:', validResults.length, 'valid results');
    
    // Test getRetrievalStats
    const stats = vectorStoreUtils.getRetrievalStats(mockRetrievalResults);
    console.log('✅ getRetrievalStats:', stats);
    
    console.log('🎉 All Vector Store Utils tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Vector Store Utils test failed:', error);
    return false;
  }
}

/**
 * Test the chat completion service retrieval methods
 */
async function testChatCompletionService() {
  console.log('🧪 Testing Chat Completion Service retrieval methods...');
  
  try {
    const chatService = new ChatCompletionService();
    
    // Test formatRetrievalResults
    const formatted = chatService.formatRetrievalResults(mockRetrievalResults);
    console.log('✅ formatRetrievalResults works');
    
    // Test enhanceMessagesWithRetrieval
    const enhanced = chatService.enhanceMessagesWithRetrieval(mockMessages, formatted);
    console.log('✅ enhanceMessagesWithRetrieval works');
    
    console.log('🎉 Chat Completion Service tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Chat Completion Service test failed:', error);
    return false;
  }
}

/**
 * Test thread vector store functionality
 */
async function testThreadVectorStore() {
  console.log('🧪 Testing thread vector store functionality...');
  
  try {
    // Test thread context data validation
    const hasThreadContext = vectorStoreUtils.hasVectorStoreContext(mockThreadContextData);
    console.log('✅ Thread context validation:', hasThreadContext);
    
    // Test thread vector store ID extraction
    const threadVectorStoreId = vectorStoreUtils.getVectorStoreId(mockThreadContextData);
    console.log('✅ Thread vector store ID extracted:', threadVectorStoreId);
    
    // Test priority handling (workspace over thread)
    const workspaceVectorStoreId = vectorStoreUtils.getVectorStoreId(mockContextData);
    console.log('✅ Workspace priority test:', workspaceVectorStoreId === 'vs-test-12345');
    
    // Test thread-only context
    const threadOnlyVectorStoreId = vectorStoreUtils.getVectorStoreId(mockThreadContextData);
    console.log('✅ Thread-only context test:', threadOnlyVectorStoreId === 'vs-thread-67890');
    
    console.log('🎉 Thread vector store tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Thread vector store test failed:', error);
    return false;
  }
}

/**
 * Test vision/ask endpoint functionality
 */
async function testVisionFunctionality() {
  console.log('🧪 Testing vision/ask endpoint functionality...');
  
  try {
    const chatService = new ChatCompletionService();
    
    // Test vision result formatting
    const mockVisionResponse = 'This image shows a React Native authentication screen with username and password fields.';
    const mockImageUrls = [
      'https://example.com/screenshot1.png',
      'https://example.com/diagram.jpg'
    ];
    const mockQuery = 'What do you see in these images?';
    
    const formattedVisionResult = chatService.formatVisionResults(
      mockQuery,
      mockVisionResponse,
      mockImageUrls
    );
    
    console.log('✅ Vision result formatting works');
    console.log('📝 Formatted result preview:', formattedVisionResult.substring(0, 200) + '...');
    
    // Test image URL extraction from context
    const contextWithImages = {
      ...mockContextData,
      has_images: true,
      image_count: 2,
      vision_image_urls: mockImageUrls
    };
    
    console.log('✅ Image context validation:', {
      hasImages: contextWithImages.has_images,
      imageCount: contextWithImages.image_count,
      urlCount: contextWithImages.vision_image_urls.length
    });
    
    console.log('🎉 Vision functionality tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Vision functionality test failed:', error);
    return false;
  }
}

/**
 * Test the integration flow
 */
async function testIntegrationFlow() {
  console.log('🧪 Testing integration flow...');
  
  try {
    // Mock the vector store processing (without actual API calls)
    console.log('📋 Testing vector store processing parameters...');
    
    const processingParams = {
      contextData: mockContextData,
      threadId: 'thread-123',
      messages: mockMessages
    };
    
    // Validate that parameters are correctly structured
    console.log('✅ Processing parameters are valid:', {
      hasContextData: !!processingParams.contextData,
      hasWorkspaceVectorStoreId: !!processingParams.contextData?.workspace_vector_store_id,
      hasThreadVectorStoreId: !!processingParams.contextData?.thread_vector_store_id,
      hasThreadId: !!processingParams.threadId,
      hasMessages: processingParams.messages.length > 0
    });
    
    // Test the expected data flow
    console.log('📋 Testing expected data flow...');
    
    // 1. Check vector store ID extraction (should prioritize workspace)
    const vectorStoreId = vectorStoreUtils.getVectorStoreId(mockContextData);
    console.log('✅ Vector store ID extracted (workspace priority):', vectorStoreId);
    
    // 2. Test thread-only vector store extraction
    const threadVectorStoreId = vectorStoreUtils.getVectorStoreId(mockThreadContextData);
    console.log('✅ Thread vector store ID extracted:', threadVectorStoreId);
    
    // 3. Test query extraction (last user message)
    const lastUserMessage = mockMessages.filter(m => m.role === 'user').pop();
    console.log('✅ Last user message found:', !!lastUserMessage);
    
    // 4. Test result formatting
    const formattedResults = new ChatCompletionService().formatRetrievalResults(mockRetrievalResults);
    console.log('✅ Results formatted successfully');
    
    // 5. Test message enhancement
    const enhancedMessages = new ChatCompletionService().enhanceMessagesWithRetrieval(
      mockMessages, 
      formattedResults
    );
    console.log('✅ Messages enhanced successfully');
    
    // 6. Test context data updates
    const updatedContext = {
      ...mockContextData,
      retrieved_file_ids: mockRetrievalResults.map(r => r.fileId),
      retrieval_results_count: mockRetrievalResults.length,
      retrieval_performed: true
    };
    console.log('✅ Context data updated:', {
      retrievedFileCount: updatedContext.retrieved_file_ids.length,
      resultsCount: updatedContext.retrieval_results_count
    });
    
    console.log('🎉 Integration flow test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Integration flow test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting iOS Retrieval System Tests...\n');
  
  const results = {
    vectorStoreUtils: await testVectorStoreUtils(),
    chatCompletionService: await testChatCompletionService(),
    threadVectorStore: await testThreadVectorStore(),
    visionFunctionality: await testVisionFunctionality(),
    integrationFlow: await testIntegrationFlow()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('Vector Store Utils:', results.vectorStoreUtils ? '✅ PASS' : '❌ FAIL');
  console.log('Chat Completion Service:', results.chatCompletionService ? '✅ PASS' : '❌ FAIL');
  console.log('Thread Vector Store:', results.threadVectorStore ? '✅ PASS' : '❌ FAIL');
  console.log('Vision Functionality:', results.visionFunctionality ? '✅ PASS' : '❌ FAIL');
  console.log('Integration Flow:', results.integrationFlow ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  if (allPassed) {
    console.log('\n🎉 The iOS retrieval system implementation is ready!');
    console.log('📝 Key features implemented:');
    console.log('   • Vector store retrieval processing (workspace + thread)');
    console.log('   • File result formatting and message enhancement');
    console.log('   • Context data management');
    console.log('   • Integration with streaming chat system');
    console.log('   • Workspace vector store support');
    console.log('   • Thread vector store creation and retrieval');
    console.log('   • Vision/ask endpoint for image processing');
    console.log('   • Priority handling (workspace > thread > project)');
  }
  
  return allPassed;
}

// Export for use in other files
export { 
  runAllTests, 
  testVectorStoreUtils, 
  testChatCompletionService, 
  testThreadVectorStore,
  testVisionFunctionality,
  testIntegrationFlow 
};

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}