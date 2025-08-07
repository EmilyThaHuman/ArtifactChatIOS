import { ApiClient, ApiError } from '../apiClient';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for chat messages
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

// Interface for usage tracking
export interface UsageData {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Interface for assistant generation
export interface AssistantGenerationResult {
  name: string;
  description: string;
  instructions: string;
  tools: string[];
  model: string;
  primary_purpose: string;
  reasoning: string;
  character_inspiration?: string;
  prompt: string;
}

// Interface for image generation
export interface ImageGenerationParams {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  n?: number;
}

// Interface for image generation result
export interface ImageGenerationResult {
  imageData: string;
  prompt: string;
  metadata: {
    model: string;
    size: string;
    quality: string;
    generatedAt: string;
  };
}

// Interface for vector store file
export interface VectorStoreFile {
  fileId: string;
  vectorStoreFileId: string;
}

// Interface for retrieval results
export interface RetrievalResult {
  content: string;
  filename: string;
  fileId: string;
  score?: number;
}

/**
 * Chat Completion Service for iOS
 * Mirrors the web app's chatCompletionService functionality
 */
export class ChatCompletionService {
  // Main settings
  public model: string = 'gpt-4o-mini';
  public systemPrompt: string | null = null;

  // Default settings
  public temperature: number = 0.5;
  public maxTokens: number = 4096;
  public topP: number = 1;
  public frequencyPenalty: number = 0;
  public presencePenalty: number = 0;

  // State for chat completion
  public messages: ChatMessage[] = [];
  public response: any = null;
  public isLoading: boolean = false;
  public error: Error | null = null;

  // Image generation defaults
  public imageDefaults = {
    model: 'gpt-image-1',
    size: '1024x1024',
    quality: 'medium',
    n: 1,
  };

  // State for unique completion results
  public results = {
    title: null as string | null,
    summary: null as string | null,
    conversation: null as any,
    image: null as ImageGenerationResult | null,
  };

  // User and workspace IDs
  private userId: string | null = null;
  private workspaceId: string | null = null;
  private authInitialized: boolean = false;

  constructor() {
    // Initialize auth info from storage
    this.initializeAuthInfo();
  }

  /**
   * Initialize auth info from AsyncStorage or Supabase
   */
  private async initializeAuthInfo(): Promise<void> {
    if (this.authInitialized) return;

    try {
      // Try to get user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        this.userId = user.id;
        
        // Try to get active workspace from storage
        const workspaceId = await AsyncStorage.getItem('@activeWorkspaceId');
        if (workspaceId) {
          this.workspaceId = workspaceId;
        }
      }
      
      this.authInitialized = true;
    } catch (error) {
      console.warn('Could not initialize auth info:', error);
      this.userId = null;
      this.workspaceId = null;
    }
  }

  /**
   * Get user ID
   */
  private async getUserId(): Promise<string | null> {
    await this.initializeAuthInfo();
    return this.userId;
  }

  /**
   * Get workspace ID
   */
  private async getWorkspaceId(): Promise<string | null> {
    await this.initializeAuthInfo();
    return this.workspaceId;
  }

  /**
   * Track token usage (placeholder for future implementation)
   */
  private async trackTokenUsage(
    usageData: UsageData,
    modelId: string,
    featureId: string = 'chat'
  ): Promise<void> {
    const userId = await this.getUserId();
    if (!userId || !usageData) return;

    try {
      // TODO: Implement token usage tracking
      console.log('Token usage:', { userId, usageData, modelId, featureId });
    } catch (error) {
      console.error('Failed to track token usage:', error);
    }
  }

  // Setters
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  setModel(model: string): void {
    this.model = model;
  }

  setTemperature(temperature: number): void {
    this.temperature = temperature;
  }

  setMaxTokens(maxTokens: number): void {
    this.maxTokens = maxTokens;
  }

  setTopP(topP: number): void {
    this.topP = topP;
  }

  setFrequencyPenalty(frequencyPenalty: number): void {
    this.frequencyPenalty = frequencyPenalty;
  }

  setPresencePenalty(presencePenalty: number): void {
    this.presencePenalty = presencePenalty;
  }

  setMessages(messages: ChatMessage[]): void {
    this.messages = messages;
  }

  setResponse(response: any): void {
    this.response = response;
  }

  setIsLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
  }

  setError(error: Error | null): void {
    this.error = error;
  }

  /**
   * Create chat completion using backend API
   */
  async createChatCompletion(
    messages: ChatMessage[] = this.messages,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      response_format?: any;
      featureId?: string;
    } = {}
  ): Promise<any> {
    console.log('Creating chat completion', { messages, options });
    this.isLoading = true;
    this.error = null;

    try {
      // Prepare messages array with system prompt if exists
      const messageArray: ChatMessage[] = [];
      if (this.systemPrompt) {
        messageArray.push({
          role: 'system',
          content: this.systemPrompt,
        });
      }
      messageArray.push(...messages);

      const requestData = {
        provider: 'openai',
        model: options.model || this.model,
        messages: messageArray,
        temperature: options.temperature || this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        top_p: options.topP || this.topP,
        frequency_penalty: this.frequencyPenalty,
        presence_penalty: this.presencePenalty,
        response_format: options.response_format,
      };

      const response = await ApiClient.ai.chatCompletion(requestData);

      // Track token usage if available
      if (response.result?.usage) {
        await this.trackTokenUsage(
          response.result.usage,
          options.model || this.model,
          options.featureId || 'chat_completion'
        );
      }

      this.response = response.result;
      this.isLoading = false;
      return response.result;
    } catch (error: any) {
      this.error = error;
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * Get chat response
   */
  async getChatResponse(
    messages: ChatMessage[] = this.messages,
    options: any = {}
  ): Promise<string> {
    console.log('Getting chat response', { messages, options });
    try {
      const response = await this.createChatCompletion(messages, options);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error getting chat response:', error);
      throw error;
    }
  }

  /**
   * Generate a title using backend API
   */
  async generateTitle(options: any = {}): Promise<string> {
    console.log('Generating title', { options });
    if (!this.messages || this.messages.length < 2) {
      return 'New Chat';
    }

    try {
      const response = await ApiClient.ai.generateTitle({
        messages: this.messages,
      });

      // Track token usage if available
      if (response.usage) {
        await this.trackTokenUsage(
          response.usage,
          'gpt-4o-mini',
          'title_generation'
        );
      }

      const title = response.title;
      this.results.title = title;
      return title;
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Chat';
    }
  }

  /**
   * Generate a summary using backend API
   */
  async generateSummary(options: any = {}): Promise<string> {
    console.log('Generating summary', { options });
    if (!this.messages || this.messages.length < 2) {
      return 'No summary available';
    }

    try {
      const response = await ApiClient.ai.generateSummary({
        messages: this.messages,
      });

      // Track token usage if available
      if (response.usage) {
        await this.trackTokenUsage(
          response.usage,
          'gpt-4o-mini',
          'summary_generation'
        );
      }

      const summary = response.summary;
      this.results.summary = summary;
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Error generating summary';
    }
  }

  /**
   * Determine the provider and endpoint for an image model
   */
  private getImageModelProvider(model: string): {
    provider: string;
    endpoint: string;
    model: string;
  } {
    console.log(`[ChatCompletionService] Routing model: "${model}"`);

    // xAI models (check early to avoid fallthrough issues)
    if (model.includes('grok') || model.includes('aurora') || model.includes('xai')) {
      console.log(`[ChatCompletionService] Routing ${model} to xAI`);
      return {
        provider: 'xai',
        endpoint: `/image/generate/xai/${model}`,
        model: model,
      };
    }

    // OpenAI models
    if (model.includes('gpt-image') || model.includes('dall-e')) {
      console.log(`[ChatCompletionService] Routing ${model} to OpenAI`);
      return {
        provider: 'openai',
        endpoint: `/image/generate/openai/${model}`,
        model: model,
      };
    }

    // FAL AI Flux models
    if (model.includes('flux')) {
      console.log(`[ChatCompletionService] Routing ${model} to FAL`);
      return {
        provider: 'fal',
        endpoint: `/image/generate/flux/${model}`,
        model: model,
      };
    }

    // Google Imagen models (specialized image generation)
    if (model.includes('imagen')) {
      console.log(`[ChatCompletionService] Routing ${model} to Google Imagen`);
      return {
        provider: 'google-imagen',
        endpoint: `/image/generate/imagen/${model}`,
        model: model,
      };
    }

    // Google Gemini models (conversational image generation)
    if (model.includes('gemini') && model.includes('image')) {
      console.log(`[ChatCompletionService] Routing ${model} to Google Gemini`);
      return {
        provider: 'google-gemini',
        endpoint: `/image/generate/gemini/${model}`,
        model: model,
      };
    }

    // Default to OpenAI for unknown models
    console.log(`[ChatCompletionService] Defaulting ${model} to OpenAI (no match found)`);
    return {
      provider: 'openai',
      endpoint: `/image/generate/openai/${model}`,
      model: model,
    };
  }

  /**
   * Generate image using the specified model
   */
  async generateImage(params: ImageGenerationParams): Promise<any> {
    console.log('Generating image', { params });
    try {
      const {
        prompt,
        model = 'gpt-image-1',
        size = '1024x1024',
        quality = 'medium',
        n = 1,
      } = params;

      if (!prompt) {
        throw new Error('Prompt is required for image generation');
      }

      // Get the correct provider endpoint for this model
      const providerInfo = this.getImageModelProvider(model);

      console.log(`[ChatCompletionService] Routing ${model} to ${providerInfo.provider} provider`);

      const response = await ApiClient.post(`/api/ai${providerInfo.endpoint}`, {
        prompt,
        size,
        quality,
        n,
      });

      return response.result;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  /**
   * Create image completion using backend API
   */
  async createImageCompletion(prompt: string, options: any = {}): Promise<ImageGenerationResult> {
    console.log('Creating image completion', { prompt, options });
    this.isLoading = true;
    this.error = null;

    try {
      const imageOptions = {
        ...this.imageDefaults,
        ...options,
        prompt,
      };

      const model = imageOptions.model || this.imageDefaults.model;

      // Get the correct provider endpoint for this model
      const providerInfo = this.getImageModelProvider(model);

      console.log(`[ChatCompletionService] Routing ${model} completion to ${providerInfo.provider} provider`);

      const response = await ApiClient.post(`/api/ai${providerInfo.endpoint}`, {
        prompt: imageOptions.prompt,
        size: imageOptions.size,
        quality: imageOptions.quality,
        n: imageOptions.n,
      });

      this.results.image = {
        imageData: response.result.data[0].b64_json,
        prompt,
        metadata: {
          model: model,
          size: imageOptions.size,
          quality: imageOptions.quality,
          generatedAt: new Date().toISOString(),
        },
      };

      this.isLoading = false;
      return this.results.image;
    } catch (error: any) {
      this.error = error;
      this.isLoading = false;
      throw error;
    }
  }

  // Vector Store Management

  /**
   * Create vector store
   */
  async createVectorStore(name: string): Promise<string> {
    console.log('Creating vector store', { name });
    try {
      if (!name) {
        throw new Error('Vector store name is required');
      }

      const response = await ApiClient.ai.vectorStore.create({ name });
      return response.vectorStore.id;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  /**
   * Upload file and attach to vector store in one operation
   */
  async uploadAndAttachToVectorStore(
    vectorStoreId: string,
    content: string,
    filename: string
  ): Promise<VectorStoreFile> {
    console.log('Uploading and attaching file to vector store', {
      vectorStoreId,
      filename,
      contentLength: content?.length,
    });

    try {
      if (!vectorStoreId || !content || !filename) {
        throw new Error('Vector store ID, content, and filename are required');
      }

      const response = await ApiClient.ai.vectorStore.uploadAndAttach(vectorStoreId, {
        content,
        filename,
      });

      console.log('uploadAndAttachToVectorStore response:', {
        success: response.success,
        fileUploadId: response.fileUpload?.id,
        uploadResponseId: response.uploadResponse?.id,
      });

      return {
        fileId: response.fileUpload.id,
        vectorStoreFileId: response.uploadResponse.id,
      };
    } catch (error) {
      console.error('Error uploading and attaching file to vector store:', error);
      throw error;
    }
  }

  /**
   * Get vector store details
   */
  async getVectorStore(vectorStoreId: string): Promise<any> {
    console.log('Getting vector store', { vectorStoreId });
    try {
      if (!vectorStoreId) {
        throw new Error('Vector store ID is required');
      }

      const response = await ApiClient.ai.vectorStore.get(vectorStoreId);
      return response.vectorStore;
    } catch (error) {
      console.error('Error getting vector store:', error);
      throw error;
    }
  }

  /**
   * Search vector store
   */
  async searchVectorStore(
    vectorStoreId: string,
    query: string,
    maxNumResults: number = 10,
    options: any = {}
  ): Promise<RetrievalResult[]> {
    console.log('Searching vector store', {
      vectorStoreId,
      query,
      maxNumResults,
      options,
    });
    try {
      if (!vectorStoreId) {
        throw new Error('Vector store ID is required');
      }

      if (!query || typeof query !== 'string') {
        throw new Error('Query is required and must be a string');
      }

      // Ensure maxNumResults is within valid range
      const validMaxResults = Math.min(Math.max(maxNumResults, 1), 50);

      const requestBody = {
        query,
        max_num_results: validMaxResults,
        ...options,
      };

      const response = await ApiClient.ai.vectorStore.search(vectorStoreId, requestBody);
      
      // Handle the API response structure correctly
      if (response?.results?.data && Array.isArray(response.results.data)) {
        return response.results.data;
      } else if (response?.results && Array.isArray(response.results)) {
        return response.results;
      } else {
        console.log('No results found in vector store search response');
        return [];
      }
    } catch (error) {
      console.error('Error searching vector store:', error);
      throw error;
    }
  }

  /**
   * Delete file from vector store
   */
  async deleteFileFromVectorStore(vectorStoreId: string, fileId: string): Promise<any> {
    console.log('Deleting file from vector store', { vectorStoreId, fileId });
    try {
      if (!vectorStoreId || !fileId) {
        throw new Error('Vector store ID and file ID are required');
      }

      const response = await ApiClient.ai.vectorStore.deleteFile(vectorStoreId, fileId);
      return response.result;
    } catch (error) {
      console.error('Error deleting file from vector store:', error);
      throw error;
    }
  }

  /**
   * Delete vector store
   */
  async deleteVectorStore(vectorStoreId: string): Promise<any> {
    console.log('Deleting vector store', { vectorStoreId });
    try {
      if (!vectorStoreId) {
        throw new Error('Vector store ID is required');
      }

      const response = await ApiClient.ai.vectorStore.delete(vectorStoreId);
      return response.result;
    } catch (error) {
      console.error('Error deleting vector store:', error);
      throw error;
    }
  }

  // File Operations

  /**
   * Upload file to OpenAI
   */
  async uploadFile(
    file: string | any,
    purpose: string = 'assistants',
    filename?: string
  ): Promise<any> {
    console.log('Uploading file', { file, purpose, filename });
    try {
      if (!file) {
        throw new Error('File is required for upload');
      }

      let fileData: string;
      let actualFilename = filename;

      if (typeof file === 'string') {
        // Assume it's already a data URL or base64
        fileData = file;
        actualFilename = actualFilename || 'uploaded_file';
      } else {
        throw new Error('Invalid file format');
      }

      const response = await ApiClient.ai.uploadFile({
        file: fileData,
        purpose,
        filename: actualFilename,
      });

      return response.file;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Delete file from OpenAI
   */
  async deleteFile(fileId: string): Promise<any> {
    console.log('Deleting file', { fileId });
    try {
      if (!fileId) {
        throw new Error('File ID is required');
      }

      const response = await ApiClient.ai.files.delete(fileId);
      return response.result;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Assistant Operations

  /**
   * Generate assistant using AI with character-based approach
   */
  async generateAssistantFast(
    userQuery: string,
    userProfile: any = {}
  ): Promise<AssistantGenerationResult> {
    try {
      // Create a structured prompt for assistant generation
      const fullPrompt = `Create an AI assistant based on this request: "${userQuery}"

User Profile Context:
- Display Name: ${userProfile.displayName || 'User'}
- Interests: ${userProfile.interests?.join(', ') || 'general productivity'}

Please analyze this request and create a character-based AI assistant using a famous person who is renowned for excellence in the relevant domain. 

Respond with valid JSON matching this schema:
{
  "name": "string (assistant name)",
  "description": "string (brief description)",
  "instructions": "string (detailed instructions)",
  "recommended_tools": ["array of tool names"],
  "recommended_model": "string (AI model)",
  "primary_purpose": "string (general category)",
  "reasoning": "string (why this assistant)",
  "character_inspiration": "string (famous person inspiration)"
}`;

      const response = await this.createChatCompletion(
        [{ role: 'user', content: fullPrompt }],
        {
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          maxTokens: 2000,
          temperature: 0.7,
          featureId: 'character_assistant_generation',
        }
      );

      const generatedAssistant = JSON.parse(response.choices[0].message.content);

      // Validate required fields and provide fallbacks
      return {
        name: generatedAssistant.name || 'General Expert',
        description: generatedAssistant.description || `A helpful assistant for "${userQuery}"`,
        instructions: generatedAssistant.instructions || this.createFallbackInstructions(userQuery),
        tools: generatedAssistant.recommended_tools || ['web_search'],
        model: generatedAssistant.recommended_model || 'gpt-4o-mini',
        primary_purpose: generatedAssistant.primary_purpose || 'general',
        reasoning: generatedAssistant.reasoning || 'AI-generated character-based assistant',
        character_inspiration: generatedAssistant.character_inspiration || 'Selected for domain expertise',
        prompt: userQuery,
      };
    } catch (error) {
      console.error('[ChatCompletionService][generateAssistantFast] --> AI generation failed:', error);
      return this.createFallbackAssistant(userQuery, userProfile);
    }
  }

  /**
   * Create a simple fallback assistant when AI generation fails
   */
  private createFallbackAssistant(userQuery: string, userProfile: any = {}): AssistantGenerationResult {
    return {
      name: 'General Expert',
      description: `A helpful assistant designed to help with "${userQuery}"`,
      instructions: this.createFallbackInstructions(userQuery),
      tools: ['web_search'],
      model: 'gpt-4o-mini',
      primary_purpose: 'general',
      reasoning: 'Fallback assistant created due to generation error',
      character_inspiration: 'Generic expert approach',
      prompt: userQuery,
    };
  }

  /**
   * Create fallback instructions when AI generation fails
   */
  private createFallbackInstructions(userQuery: string): string {
    return `**Role & Goal:**
You are a General Expert with broad knowledge and expertise. Your primary goal is to provide helpful, accurate, and comprehensive assistance with tasks related to: ${userQuery}

You operate within a hierarchical system where your expertise may be applied to general tasks or specialized project work. When project_context tags are present in the system prompt, adapt your expertise to that specific project's requirements, objectives, and constraints while maintaining your core professional capabilities.

# Steps
1. **Context Analysis**: Determine if you're working on a general task or within a specific project context (check for project_context tags)
2. **Information Gathering**: Collect relevant information and understand the specific requirements
3. **Analysis & Planning**: Analyze the request and develop a comprehensive approach
4. **Solution Development**: Create detailed, actionable solutions or responses
5. **Integration & Delivery**: Present results that align with the current context while maintaining professional standards

# Output Format
- Provide clear, well-structured responses with logical organization
- Include relevant examples and practical guidance when helpful
- Use professional, accessible language appropriate to the context
- Offer step-by-step instructions when applicable
- When working within project context: Align deliverables with project objectives and constraints
- Include next steps or follow-up recommendations when relevant

# Quality Standards
- Ensure accuracy and reliability of all information provided
- Maintain a helpful, professional tone throughout interactions
- Provide balanced perspectives and acknowledge limitations when appropriate
- Focus on being genuinely useful and actionable in responses`;
  }

  /**
   * Suggest tools from instructions using backend API
   */
  async suggestToolsFromInstructions(instructions: string): Promise<any> {
    try {
      const response = await ApiClient.ai.assistant.suggestTools({ instructions });

      // Track token usage if available
      if (response.usage) {
        await this.trackTokenUsage(response.usage, 'gpt-4o-mini', 'tool_suggestion');
      }

      return {
        recommended_tools: response.recommendedTools,
        reasoning: response.reasoning,
      };
    } catch (error) {
      console.error('Error suggesting tools:', error);
      throw error;
    }
  }

  /**
   * Generate memory filename using backend API
   */
  async generateMemoryFilename(content: string): Promise<{ filename: string; title: string }> {
    console.log('Generating memory filename', { content });
    try {
      const response = await ApiClient.ai.memory.generateFilename({ content });

      // Track token usage if available
      if (response.usage) {
        await this.trackTokenUsage(response.usage, 'gpt-4o-mini', 'memory_filename_generation');
      }

      return {
        filename: response.filename,
        title: response.title,
      };
    } catch (error) {
      console.error('Error generating memory filename:', error);
      // Fallback to a generic filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      return {
        filename: `memory-${timestamp}.txt`,
        title: 'Saved Memory',
      };
    }
  }

  /**
   * Execute Python code using OpenAI's Code Interpreter
   */
  async executeCodeInterpreter(params: {
    code: string;
    files?: string[];
    containerId?: string;
    containerName?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const { code, files = [], containerId, containerName } = params;

    try {
      console.log('[ChatCompletionService][executeCodeInterpreter] --> Starting code execution request');

      const response = await ApiClient.tools.codeInterpreter({
        code,
        files,
        containerId,
        containerName,
      });

      console.log('[ChatCompletionService][executeCodeInterpreter] --> Code execution completed');

      return {
        success: true,
        data: response.data || response.result?.data || response,
      };
    } catch (error: any) {
      console.error('[ChatCompletionService][executeCodeInterpreter] --> Code execution failed:', error);

      return {
        success: false,
        error: error.message || 'Code execution failed',
      };
    }
  }

  /**
   * Format retrieval results for context
   */
  formatRetrievalResults(results: any[]): string {
    if (results.length === 0) return '';

    console.log('📝 [ChatCompletionService] formatRetrievalResults called with:', {
      resultsCount: results.length,
      sampleResult: results[0]
    });

    let formatted = '<files>\n';
    for (const result of results) {
      // Handle both old and new API response formats
      const fileId = result.fileId || result.file_id || 'undefined';
      const filename = result.filename || result.file_name || 'unknown_file';
      
      // Extract content from the API response format
      let content = '';
      if (typeof result.content === 'string') {
        content = result.content;
      } else if (Array.isArray(result.content)) {
        // Handle new API format: content is array of objects with text
        content = result.content
          .filter((item: any) => item && item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
      } else if (result.content && typeof result.content === 'object') {
        // Handle object content - stringify it
        content = JSON.stringify(result.content);
      }
      
      console.log('📝 [ChatCompletionService] Processing result:', {
        fileId,
        filename,
        contentType: typeof result.content,
        contentLength: content.length
      });

      formatted += `<file_snippet file_id='${fileId}' file_name='${filename}'>`;
      formatted += `<content>${content}</content>`;
      formatted += '</file_snippet>\n';
    }
    formatted += '</files>';

    return formatted;
  }

  /**
   * Process retrieval for a workspace or project
   * This method wraps the vectorStoreUtils functionality for backward compatibility
   */
  async processRetrieval(
    vectorStoreId: string,
    query: string,
    maxResults: number = 10
  ): Promise<{
    results: RetrievalResult[];
    formattedResults: string;
    fileIds: string[];
  }> {
    console.log('🔍 [ChatCompletionService] Processing retrieval', {
      vectorStoreId,
      queryLength: query.length,
      maxResults
    });

    try {
      // Search the vector store
      const results = await this.searchVectorStore(vectorStoreId, query, maxResults);
      
      // Format the results
      const formattedResults = this.formatRetrievalResults(results);
      
      // Extract file IDs
      const fileIds = results.map(r => r.fileId);

      console.log('✅ [ChatCompletionService] Retrieval completed', {
        resultsCount: results.length,
        fileIdsCount: fileIds.length
      });

      return {
        results,
        formattedResults,
        fileIds
      };
    } catch (error) {
      console.error('❌ [ChatCompletionService] Retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Enhance messages with retrieval results
   * Appends retrieval results to the last user message
   */
  enhanceMessagesWithRetrieval(
    messages: ChatMessage[],
    formattedResults: string
  ): ChatMessage[] {
    if (!formattedResults || messages.length === 0) {
      return messages;
    }

    const enhancedMessages = [...messages];
    const lastMessageIndex = messages.length - 1;
    const lastMessage = messages[lastMessageIndex];

    if (lastMessage.role === 'user') {
      const originalContent = typeof lastMessage.content === 'string' 
        ? lastMessage.content 
        : JSON.stringify(lastMessage.content);

      enhancedMessages[lastMessageIndex] = {
        ...lastMessage,
        content: originalContent + '\n\n' + formattedResults
      };

      console.log('📝 [ChatCompletionService] Enhanced last user message with retrieval results', {
        originalLength: originalContent.length,
        enhancedLength: enhancedMessages[lastMessageIndex].content.length
      });
    }

    return enhancedMessages;
  }

  /**
   * Ask AI about images using vision capabilities
   * This mimics the web app's ask endpoint for image processing
   */
  async askAboutImages(
    query: string,
    imageUrls: string[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    content: string;
    usage?: any;
    metadata: any;
  }> {
    console.log('👁️ [ChatCompletionService] Processing vision request', {
      query: query.substring(0, 100),
      imageCount: imageUrls.length,
      model: options.model || 'gpt-4o'
    });

    try {
      const requestData = {
        query,
        image_urls: imageUrls,
        model: options.model || 'gpt-4o',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      };

      const response = await ApiClient.ai.ask(requestData);

      // Track token usage if available
      if (response.usage) {
        await this.trackTokenUsage(
          response.usage,
          options.model || 'gpt-4o',
          'vision_ask'
        );
      }

      console.log('✅ [ChatCompletionService] Vision request completed', {
        contentLength: response.content?.length || 0,
        hasUsage: !!response.usage
      });

      return {
        content: response.content || '',
        usage: response.usage,
        metadata: {
          model: options.model || 'gpt-4o',
          imageCount: imageUrls.length,
          timestamp: new Date().toISOString(),
          isVisionResponse: true
        }
      };

    } catch (error) {
      console.error('❌ [ChatCompletionService] Vision request failed:', error);
      throw error;
    }
  }

  /**
   * Format vision results for inclusion in chat
   * This matches the web app's vision result formatting
   */
  formatVisionResults(
    query: string,
    visionResponse: string,
    imageUrls: string[]
  ): string {
    const imageList = imageUrls.map((url, index) => 
      `[Image ${index + 1}]: ${url}`
    ).join('\n');

    return `\n\n<vision_analysis>
<query>${query}</query>
<images>
${imageList}
</images>
<analysis>
${visionResponse}
</analysis>
</vision_analysis>`;
  }
}

// Factory function to create service instances
export const createChatCompletionService = (): ChatCompletionService => 
  new ChatCompletionService();

// Default instance for immediate use
export const chatCompletionService = new ChatCompletionService();

export default ChatCompletionService; 