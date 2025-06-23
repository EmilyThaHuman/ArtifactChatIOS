import { supabase } from './supabase';
import { AuthManager } from './auth';
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
          console.error('🧵 ThreadManager: No personal workspace found');
          return null;
        }

        workspaceId = workspaces[0].id;
        console.log('🧵 ThreadManager: Using personal workspace:', workspaces[0].name);
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