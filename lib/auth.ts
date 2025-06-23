import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { performOAuth, sendMagicLink, redirectTo, createSessionFromUrl as handleAuthCallback } from '@/components/auth/AuthHandler';

WebBrowser.maybeCompleteAuthSession();

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  settings: any;
  user_workspaces: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  user_id: string;
  avatar_url: string;
  is_personal: boolean;
  is_home: boolean;
  workspace_threads: string[];
  workspace_files: string[];
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface Thread {
  id: string;
  title: string;
  summary: string;
  workspace_id: string;
  user_id: string;
  status: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

interface ThreadMessage {
  id: string;
  thread_id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  content: string;
  metadata: any;
  created_at: string;
}

export class AuthManager {
  // Get the proper redirect URI for OAuth following Supabase docs
  private static getOAuthRedirectUri(): string {
    return redirectTo;
  }

  static async signInWithMagicLink(email: string): Promise<{ error: any }> {
    try {
      console.log('🔗 Starting magic link authentication for:', email);
      await sendMagicLink(email);
      console.log('✅ Magic link sent successfully');
      return { error: null };
    } catch (error) {
      console.error('🚨 Magic link error:', error);
      return { error };
    }
  }

  static async signInWithGoogle(): Promise<{ error: any }> {
    try {
      console.log('🔗 Starting Google OAuth authentication');
      await performOAuth('google');
      console.log('✅ Google OAuth completed successfully');
      return { error: null };
    } catch (error) {
      console.error('🚨 Google OAuth Error:', error);
      return { error };
    }
  }

  static async signInWithGitHub(): Promise<{ error: any }> {
    try {
      console.log('🔗 Starting GitHub OAuth authentication');
      await performOAuth('github');
      console.log('✅ GitHub OAuth completed successfully');
      return { error: null };
    } catch (error) {
      console.error('🚨 GitHub OAuth Error:', error);
      return { error };
    }
  }

  static async signInWithLinkedIn(): Promise<{ error: any }> {
    try {
      console.log('🔗 Starting LinkedIn OAuth authentication');
      await performOAuth('linkedin_oidc');
      console.log('✅ LinkedIn OAuth completed successfully');
      return { error: null };
    } catch (error) {
      console.error('🚨 LinkedIn OAuth Error:', error);
      return { error };
    }
  }

  static async signOut(): Promise<{ error: any }> {
    try {
      console.log('🚪 Starting sign out process');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🚨 Sign out error:', error);
      } else {
        console.log('✅ Sign out completed successfully');
      }
      return { error };
    } catch (error) {
      console.error('🚨 Sign out exception:', error);
      return { error };
    }
  }

  static async getCurrentUser() {
    try {
      console.log('👤 Getting current user session');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('🚨 Get current user error:', error);
        return { user: null, error };
      }
      
      if (user) {
        console.log('✅ Current user found:', {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        });
      } else {
        console.log('ℹ️ No current user session found');
      }
      
      return { user, error };
    } catch (error) {
      console.error('🚨 Get current user exception:', error);
      return { user: null, error };
    }
  }

  static async fetchUserProfile(userId: string): Promise<{ data: UserProfile | null; error: any }> {
    try {
      console.log('📋 Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('🚨 Profile fetch error:', error);
        return { data: null, error };
      }
      
      if (data) {
        console.log('✅ Profile fetched successfully:', {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          onboarding_completed: data.onboarding_completed,
          workspaces_count: data.user_workspaces?.length || 0
        });
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('🚨 Profile fetch exception:', error);
      return { data: null, error };
    }
  }

  static async fetchUserWorkspaces(userId: string): Promise<{ data: Workspace[] | null; error: any }> {
    try {
      console.log('🏢 Fetching workspaces for user:', userId);
      
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('🚨 Workspaces fetch error:', error);
        return { data: null, error };
      }
      
      console.log(`✅ Fetched ${data?.length || 0} workspaces:`, 
        data?.map(w => ({ id: w.id, name: w.name, is_personal: w.is_personal, is_home: w.is_home }))
      );
      
      return { data, error: null };
    } catch (error) {
      console.error('🚨 Workspaces fetch exception:', error);
      return { data: null, error };
    }
  }

  static async fetchWorkspaceThreads(workspaceId: string): Promise<{ data: Thread[] | null; error: any }> {
    try {
      console.log('💬 Fetching threads for workspace:', workspaceId);
      
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_message_at', { ascending: false })
        .limit(50); // Limit to recent threads
      
      if (error) {
        console.error('🚨 Threads fetch error:', error);
        return { data: null, error };
      }
      
      console.log(`✅ Fetched ${data?.length || 0} threads for workspace ${workspaceId}`);
      
      return { data, error: null };
    } catch (error) {
      console.error('🚨 Threads fetch exception:', error);
      return { data: null, error };
    }
  }

  static async fetchThreadMessages(threadId: string): Promise<{ data: ThreadMessage[] | null; error: any }> {
    try {
      console.log('📝 Fetching messages for thread:', threadId);
      
      const { data, error } = await supabase
        .from('thread_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(100); // Limit to recent messages
      
      if (error) {
        console.error('🚨 Thread messages fetch error:', error);
        return { data: null, error };
      }
      
      console.log(`✅ Fetched ${data?.length || 0} messages for thread ${threadId}`);
      
      return { data, error: null };
    } catch (error) {
      console.error('🚨 Thread messages fetch exception:', error);
      return { data: null, error };
    }
  }

  static async fetchAndStoreUserData(user: any): Promise<{ 
    profile: UserProfile | null; 
    workspaces: Workspace[] | null; 
    threads: { [workspaceId: string]: Thread[] }; 
    threadMessages: { [threadId: string]: ThreadMessage[] };
    error: any 
  }> {
    try {
      console.log('🔄 Starting comprehensive user data fetch for:', user.id);
      
      // Fetch user profile
      const { data: profile, error: profileError } = await this.fetchUserProfile(user.id);
      if (profileError) {
        console.error('🚨 Failed to fetch profile:', profileError);
        return { profile: null, workspaces: null, threads: {}, threadMessages: {}, error: profileError };
      }

      // Fetch user workspaces
      const { data: workspaces, error: workspacesError } = await this.fetchUserWorkspaces(user.id);
      if (workspacesError) {
        console.error('🚨 Failed to fetch workspaces:', workspacesError);
        return { profile, workspaces: null, threads: {}, threadMessages: {}, error: workspacesError };
      }

      // Fetch threads for each workspace
      const threads: { [workspaceId: string]: Thread[] } = {};
      const threadMessages: { [threadId: string]: ThreadMessage[] } = {};

      if (workspaces && workspaces.length > 0) {
        console.log(`🔄 Fetching threads for ${workspaces.length} workspaces`);
        
        for (const workspace of workspaces) {
          const { data: workspaceThreads, error: threadsError } = await this.fetchWorkspaceThreads(workspace.id);
          
          if (threadsError) {
            console.error(`🚨 Failed to fetch threads for workspace ${workspace.id}:`, threadsError);
            continue;
          }

          if (workspaceThreads && workspaceThreads.length > 0) {
            threads[workspace.id] = workspaceThreads;
            
            // Fetch messages for each thread (limit to first 5 threads per workspace for performance)
            const threadsToFetch = workspaceThreads.slice(0, 5);
            console.log(`🔄 Fetching messages for ${threadsToFetch.length} threads in workspace ${workspace.name}`);
            
            for (const thread of threadsToFetch) {
              const { data: messages, error: messagesError } = await this.fetchThreadMessages(thread.id);
              
              if (messagesError) {
                console.error(`🚨 Failed to fetch messages for thread ${thread.id}:`, messagesError);
                continue;
              }

              if (messages) {
                threadMessages[thread.id] = messages;
              }
            }
          }
        }
      }

      console.log('✅ User data fetch completed:', {
        profile: profile ? 'Loaded' : 'None',
        workspaces_count: workspaces?.length || 0,
        threads_count: Object.keys(threads).length,
        thread_messages_count: Object.keys(threadMessages).length
      });

      return { profile, workspaces, threads, threadMessages, error: null };
    } catch (error) {
      console.error('🚨 User data fetch exception:', error);
      return { profile: null, workspaces: null, threads: {}, threadMessages: {}, error };
    }
  }

  static async createUserProfile(user: any): Promise<{ data: UserProfile | null; error: any }> {
    try {
      console.log('👤 Creating user profile for:', user.id);
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        onboarding_completed: false,
        settings: {
          profile: {
            theme: 'system',
            language: 'en',
          },
          system: {
            notifications: true,
            autoSync: true,
          },
          personalization: {
            defaultWorkspace: null,
            contentView: 'grid',
          },
        },
        user_workspaces: [],
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();
      
      if (error) {
        console.error('🚨 Profile creation error:', error);
        return { data: null, error };
      }

      console.log('✅ Profile created successfully:', {
        id: data.id,
        email: data.email,
        full_name: data.full_name
      });
      
      return { data, error: null };
    } catch (error) {
      console.error('🚨 Profile creation exception:', error);
      return { data: null, error };
    }
  }

  static async getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: any }> {
    try {
      console.log('📋 Getting user profile for:', userId);
      return await this.fetchUserProfile(userId);
    } catch (error) {
      console.error('🚨 Get user profile exception:', error);
      return { data: null, error };
    }
  }
}