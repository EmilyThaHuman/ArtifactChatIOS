import { supabase } from './supabase';
import { AuthManager } from './auth';
import { ChatCompletionService } from './services/chatCompletionService';
import { OpenAIService } from './openai';

export interface Thread {
  id: string;
  title: string;
  workspace_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count?: number;
  status?: string;
  summary?: string;
  metadata?: any;
}

export interface CreateThreadOptions {
  title?: string;
  workspaceId?: string;
  metadata?: any;
}

export class ThreadManager {
  /**
   * Create a new thread in the user's personal workspace
   */
  static async createNewThread(options: CreateThreadOptions = {}): Promise<Thread | null> {
    try {
      console.log('🧵 ThreadManager: Creating new thread...');
      
      // Get current user
      const { user } = await AuthManager.getCurrentUser();
      if (!user) {
        console.error('🧵 ThreadManager: No authenticated user found');
        return null;
      }

      // Get workspace ID - use provided or find personal workspace
      let workspaceId = options.workspaceId;
      
      if (!workspaceId) {
        console.log('🧵 ThreadManager: No workspace provided, finding personal workspace...');
        const { data: workspaces, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id, name, is_personal')
          .eq('user_id', user.id)
          .eq('is_personal', true)
          .limit(1);

        if (workspaceError) {
          console.error('🧵 ThreadManager: Error fetching personal workspace:', workspaceError);
          return null;
        }

        if (!workspaces || workspaces.length === 0) {
          console.log('🧵 ThreadManager: No personal workspace found, creating one...');
          
          // Create a personal workspace
          const { data: newWorkspace, error: createError } = await supabase
            .from('workspaces')
            .insert({
              user_id: user.id,
              owner_id: user.id,
              name: 'Personal Workspace',
              description: 'Your personal AI workspace',
              is_personal: true,
              is_home: true,
              workspace_members: [user.id],
              workspace_files: [],
              settings: {
                private: true,
                notifications: false,
                allowMemberInvites: false
              },
              metadata: {
                tags: [],
                stats: {
                  chat_count: 0,
                  file_count: 0,
                  member_count: 1
                },
                starred: false,
                version: '1.0.0',
                archived: false,
                created_by: user.id,
                updated_by: user.id
              },
              allow_invites: false
            })
            .select('id, name, is_personal')
            .single();

          if (createError) {
            console.error('🧵 ThreadManager: Error creating personal workspace:', createError);
            return null;
          }

          workspaceId = newWorkspace.id;
          console.log('✅ ThreadManager: Created personal workspace:', newWorkspace.name);
        } else {
          workspaceId = workspaces[0].id;
          console.log('🧵 ThreadManager: Using existing personal workspace:', workspaces[0].name);
        }
      }

      // Generate thread title
      const title = options.title || `New Chat ${new Date().toLocaleDateString()}`;

      // Create the thread
      const { data: threadData, error: threadError } = await supabase
        .from('threads')
        .insert({
          title,
          workspace_id: workspaceId,
          user_id: user.id,
          status: 'active',
          message_count: 0,
          metadata: options.metadata || {},
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (threadError) {
        console.error('🧵 ThreadManager: Error creating thread:', threadError);
        return null;
      }

      console.log('🧵 ThreadManager: Thread created successfully:', {
        id: threadData.id,
        title: threadData.title,
        workspace_id: threadData.workspace_id
      });

      // Create vector store for the thread
      try {
        console.log('🗄️ [THREAD CREATION] Creating vector store for thread:', {
          threadId: threadData.id,
          workspaceId: threadData.workspace_id,
          context: 'THREAD_VECTOR_STORE_CREATE'
        });
        
        const chatService = new ChatCompletionService();
        const vectorStoreId = await chatService.createVectorStore(`Thread-${threadData.id}`);
        
        if (vectorStoreId) {
          console.log('✅ [THREAD CREATION] Vector store created successfully:', {
            threadId: threadData.id,
            vectorStoreId,
            context: 'THREAD_VECTOR_STORE_CREATED'
          });
          
          // Update thread with vector store ID
          const { error: updateError } = await supabase
            .from('threads')
            .update({ vector_store_id: vectorStoreId })
            .eq('id', threadData.id);

          if (updateError) {
            console.error('🧵 ThreadManager: Error updating thread with vector store ID:', updateError);
          } else {
            console.log('✅ [THREAD CREATION] Vector store attached to thread in database:', {
              threadId: threadData.id,
              vectorStoreId,
              context: 'THREAD_VECTOR_STORE_DB_UPDATE'
            });
            // Add vector store ID to the returned thread data
            (threadData as any).vector_store_id = vectorStoreId;
          }
        } else {
          console.warn('⚠️ ThreadManager: Failed to create vector store for thread');
        }
      } catch (vectorError) {
        console.error('❌ ThreadManager: Error creating vector store:', vectorError);
        // Continue without vector store - thread is still usable
      }

      return threadData as Thread;

    } catch (error) {
      console.error('🧵 ThreadManager: Unexpected error creating thread:', error);
      return null;
    }
  }

  /**
   * Get user's recent threads
   */
  static async getRecentThreads(limit: number = 10): Promise<Thread[]> {
    try {
      const { user } = await AuthManager.getCurrentUser();
      if (!user) return [];

      const { data: threads, error } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('🧵 ThreadManager: Error fetching recent threads:', error);
        return [];
      }

      return threads || [];
    } catch (error) {
      console.error('🧵 ThreadManager: Unexpected error fetching threads:', error);
      return [];
    }
  }

  /**
   * Get threads that should appear in navigation history
   * Implements filtering logic similar to the web app
   */
  static async getHistoryThreads(limit: number = 50): Promise<Thread[]> {
    try {
      const { user } = await AuthManager.getCurrentUser();
      if (!user) return [];

      console.log('🧵 ThreadManager: Fetching history threads for user:', user.id);

      const { data: threads, error } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('🧵 ThreadManager: Error fetching history threads:', error);
        return [];
      }

      if (!threads) return [];

      // Apply the same filtering logic as the web app
      const filteredThreads = threads.filter(thread => {
        // Filter out "New Chat" titles
        if (thread?.title === 'New Chat') return false;
        
        // Filter out threads with specific metadata flags
        if (thread.metadata?.excludeFromNavHistory || thread.metadata?.isScheduledTask) return false;
        
        // For team threads, only show if they have been moved to history
        const isTeamThread = thread.is_team === true;
        if (isTeamThread) {
          const hasBeenMovedToHistory = thread.metadata?.moved_to_history_at;
          return hasBeenMovedToHistory;
        }
        
        // For non-team threads, show them
        // Note: workspace filtering not implemented in mobile app yet
        return true;
      });

      console.log(`🧵 ThreadManager: Filtered ${filteredThreads.length} history threads from ${threads.length} total threads`);
      return filteredThreads;
    } catch (error) {
      console.error('🧵 ThreadManager: Unexpected error fetching history threads:', error);
      return [];
    }
  }

  /**
   * Update thread metadata
   */
  static async updateThread(threadId: string, updates: Partial<Thread>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('threads')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', threadId);

      if (error) {
        console.error('🧵 ThreadManager: Error updating thread:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🧵 ThreadManager: Unexpected error updating thread:', error);
      return false;
    }
  }

  /**
   * Generate AI-powered thread title based on user message
   */
  static async generateThreadTitle(userMessage: string): Promise<string> {
    try {
      console.log('🧵 ThreadManager: Generating AI title for message...');
      
      // Validate OpenAI API key
      if (!OpenAIService.validateApiKey()) {
        console.warn('🧵 ThreadManager: No OpenAI API key, using fallback title');
        return userMessage.length > 50 
          ? userMessage.substring(0, 50).trim() + '...'
          : userMessage.trim();
      }

      const titlePrompt = `Generate a concise, descriptive title (max 50 characters) for a conversation that starts with this message. The title should capture the main topic or intent. Return only the title, no quotes or extra text.

Message: "${userMessage}"

Title:`;

      const generatedTitle = await OpenAIService.createChatCompletion(
        'gpt-3.5-turbo', // Use faster, cheaper model for title generation
        [
          {
            role: 'user',
            content: titlePrompt
          }
        ],
        {
          maxTokens: 20,
          temperature: 0.3, // Lower temperature for more consistent titles
        }
      );
      
      if (generatedTitle && generatedTitle.length > 0) {
        console.log('🧵 ThreadManager: Generated AI title:', generatedTitle);
        return generatedTitle.length > 50 
          ? generatedTitle.substring(0, 47) + '...'
          : generatedTitle;
      } else {
        throw new Error('Empty response from AI');
      }

    } catch (error) {
      console.error('🧵 ThreadManager: Error generating AI title:', error);
      // Fallback to simple truncation
      return userMessage.length > 50 
        ? userMessage.substring(0, 50).trim() + '...'
        : userMessage.trim();
    }
  }

  /**
   * Update thread title based on first user message using AI
   */
  static async updateThreadTitle(threadId: string, userMessage: string): Promise<boolean> {
    try {
      console.log('🧵 ThreadManager: Updating thread title with AI...');
      
      // Generate AI-powered title
      const title = await this.generateThreadTitle(userMessage);

      const success = await this.updateThread(threadId, { 
        title,
        last_message_at: new Date().toISOString()
      });

      if (success) {
        console.log('🧵 ThreadManager: Thread title updated:', title);
      }

      return success;
    } catch (error) {
      console.error('🧵 ThreadManager: Error updating thread title:', error);
      return false;
    }
  }

  /**
   * Delete a thread
   */
  static async deleteThread(threadId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId);

      if (error) {
        console.error('🧵 ThreadManager: Error deleting thread:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🧵 ThreadManager: Unexpected error deleting thread:', error);
      return false;
    }
  }

  /**
   * Get thread by ID
   */
  static async getThread(threadId: string): Promise<Thread | null> {
    try {
      const { data: thread, error } = await supabase
        .from('threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (error) {
        console.error('🧵 ThreadManager: Error fetching thread:', error);
        return null;
      }

      return thread as Thread;
    } catch (error) {
      console.error('🧵 ThreadManager: Unexpected error fetching thread:', error);
      return null;
    }
  }

  /**
   * Get messages for a specific thread
   */
  static async getThreadMessages(threadId: string): Promise<any[]> {
    try {
      console.log('🧵 ThreadManager: Fetching messages for thread:', threadId);
      
      const { data: messages, error } = await supabase
        .from('thread_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('🧵 ThreadManager: Error fetching thread messages:', error);
        return [];
      }

      console.log(`🧵 ThreadManager: Fetched ${messages?.length || 0} messages for thread ${threadId}`);
      return messages || [];
    } catch (error) {
      console.error('🧵 ThreadManager: Unexpected error fetching thread messages:', error);
      return [];
    }
  }
} 