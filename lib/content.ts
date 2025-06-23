import { supabase, Database } from './supabase';

type Thread = Database['public']['Tables']['threads']['Row'];
type ThreadMessage = Database['public']['Tables']['thread_messages']['Row'];
type WorkspaceFile = Database['public']['Tables']['workspace_files']['Row'];

export interface ContentItem {
  id: string;
  type: 'conversation' | 'image' | 'document' | 'canvas';
  title: string;
  preview?: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export class ContentManager {
  static async fetchConversations(workspaceId: string): Promise<{ data: Thread[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async fetchConversationMessages(threadId: string): Promise<{ data: ThreadMessage[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('thread_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async fetchWorkspaceFiles(workspaceId: string): Promise<{ data: WorkspaceFile[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async searchContent(query: string, workspaceId: string, type?: string): Promise<{ data: any[] | null; error: any }> {
    try {
      let results: any[] = [];
      
      // Search conversations
      if (!type || type === 'conversation') {
        const { data: conversations, error: convError } = await supabase
          .from('threads')
          .select('*')
          .eq('workspace_id', workspaceId)
          .or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
        
        if (conversations && !convError) {
          results.push(...conversations.map(c => ({ ...c, type: 'conversation' })));
        }
      }
      
      // Search files
      if (!type || type === 'document' || type === 'image') {
        const { data: files, error: filesError } = await supabase
          .from('workspace_files')
          .select('*')
          .eq('workspace_id', workspaceId)
          .or(`file_name.ilike.%${query}%,file_content.ilike.%${query}%`);
        
        if (files && !filesError) {
          results.push(...files.map(f => ({ 
            ...f, 
            type: f.file_type.startsWith('image/') ? 'image' : 'document' 
          })));
        }
      }
      
      return { data: results, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}