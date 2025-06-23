import { supabase, Database } from './supabase';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];

export class WorkspaceManager {
  static async fetchUserWorkspaces(userId: string): Promise<{ data: Workspace[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .or(`user_id.eq.${userId},workspace_members.cs.{${userId}}`)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async createPersonalWorkspace(userId: string): Promise<{ data: Workspace | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert([
          {
            user_id: userId,
            owner_id: userId,
            name: 'Personal Workspace',
            description: 'Your personal AI workspace',
            is_personal: true,
            workspace_members: [userId],
            workspace_files: [],
          },
        ])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  static async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<{ data: Workspace | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }
}