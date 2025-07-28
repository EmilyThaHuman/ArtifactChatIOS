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
      console.log('👤 Creating user profile and workspace for:', user.id);
      
      // First, try to call the handle_new_user function by inserting a dummy auth record
      // This will trigger the PostgreSQL function that creates everything properly
      const { data: functionResult, error: functionError } = await supabase.rpc('handle_new_user_manual', {
        user_id: user.id,
        user_email: user.email,
        user_metadata: user.user_metadata || {}
      });

      if (functionError) {
        console.log('⚠️ Manual function call failed, creating profile manually:', functionError);
        
        // Fallback: Create profile manually with full settings structure
        const avatar_urls = [
          'https://login.artifact.chat/storage/v1/object/public/avatars/default/ChatGPT%20Image%20Jun%2015,%202025,%2006_17_34%20PM.png',
          'https://login.artifact.chat/storage/v1/object/public/avatars/default/ChatGPT%20Image%20Jun%2015,%202025,%2006_17_37%20PM.png',
          'https://login.artifact.chat/storage/v1/object/public/avatars/default/ChatGPT%20Image%20Jun%2015,%202025,%2006_17_40%20PM.png',
          'https://login.artifact.chat/storage/v1/object/public/avatars/default/ChatGPT%20Image%20Jun%2015,%202025,%2006_18_24%20PM.png',
          'https://login.artifact.chat/storage/v1/object/public/avatars/default/ChatGPT%20Image%20Jun%2015,%202025,%2006_18_43%20PM.png'
        ];
        
        const randomAvatarUrl = avatar_urls[Math.floor(Math.random() * avatar_urls.length)];
        const randomWorkspaceAvatarUrl = avatar_urls[Math.floor(Math.random() * avatar_urls.length)];
        
        const profileData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || randomAvatarUrl,
          onboarding_completed: false,
          settings: {
            profile: {
              display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              email: user.email,
              bio: '',
              avatar_url: user.user_metadata?.avatar_url || randomAvatarUrl,
              profile_context: ''
            },
            account: {
              security: {
                twoFactorEnabled: false,
                emailNotifications: false,
                pushNotifications: false
              },
              subscription: {
                plan: 'pro',
                billingCycle: 'monthly',
                paymentMethod: { type: 'card', last4: '' }
              }
            },
            security: {
              multiFactorEnabled: false,
              sessionManagement: { logOutAllDevices: false }
            },
            personalization: {
              name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              role: '',
              traits: [],
              enable_profile_memory: false,
              enable_profile_context: true
            },
            dataControls: {
              dataExport: {
                lastExportDate: null,
                exportFormat: 'json'
              },
              analytics: false,
              usageTracking: false,
              dataCollection: {
                analyticsEnabled: false,
                usageTrackingEnabled: false
              }
            },
            memory: {
              contextualMemory: false,
              longTermMemory: false,
              conversationHistory: { enabled: true, retentionPeriod: 30 }
            },
            beta: {
              advancedAiModels: false,
              voiceChat: false,
              customPlugins: false,
              betaProgramAccess: false,
              apiKeys: {
                anthropic: null,
                openai: null,
                ollama: null,
                groq: null,
                google: null,
                mistral: null,
                xai: null,
                openrouter: null,
                cohere: null,
                fireworks: null,
                fal: null,
                deepseek: null,
                qwen: null,
                perplexity: null,
                github: null,
                pinecone: null,
                togetherai: null
              }
            },
            system: { textSize: 'md', autoSuggest: true },
            models: {
              'gpt-4o': true,
              'gpt-4o-mini': true,
              'o4-mini': false,
              'gpt-4.1': false,
              'gpt-4.5-preview': false,
              'claude-opus-4-20250514': true,
              'claude-sonnet-4-20250514': true,
              'claude-3-7-sonnet-20250219': false,
              'claude-3-5-sonnet-20241022': true,
              'claude-3-5-haiku-20241022': false,
              'claude-3-opus-20240229': true,
              'gemini-2.5-pro-preview-05-06': true,
              'gemini-2.0-flash': true,
              'gemini-1.5-pro': true,
              'mistral-small-latest': false,
              'open-mistral-nemo': false,
              'deepseek-chat': false,
              'deepseek-reasoner': false,
              'llama3-70b-8192': false,
              'grok-3-beta': false,
              'grok-3-fast-beta': false,
              'grok-3-mini-beta': false,
              'grok-3-mini-fast-beta': false,
              'command-a-03-2025': false,
              'command-r7b-12-2024': false,
              'command-r-plus': false,
              'command-r': false,
              'sonar': false,
              'sonar-pro': false,
              'sonar-deep-research': false,
              'cognitivecomputations/dolphin-mixtral-8x22b': false
            }
          },
          user_workspaces: [],
        };

        // Create the profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();
        
        if (profileError) {
          console.error('🚨 Profile creation error:', profileError);
          return { data: null, error: profileError };
        }

        // Create personal workspace
        const workspaceData = {
          user_id: user.id,
          owner_id: user.id,
          name: 'Personal Project',
          description: 'Your personal project',
          is_personal: true,
          is_home: true,
          avatar_url: randomWorkspaceAvatarUrl,
          image_path: randomWorkspaceAvatarUrl,
          workspace_memories: [],
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
          workspace_members: [user.id],
          allow_invites: false
        };

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .insert([workspaceData])
          .select()
          .single();

        if (workspaceError) {
          console.error('🚨 Workspace creation error:', workspaceError);
          // Continue anyway, profile was created
        } else {
          console.log('✅ Workspace created successfully:', workspace.id);
          
          // Create workspace member entry
          const { error: memberError } = await supabase
            .from('workspace_members')
            .insert([{
              user_id: user.id,
              workspace_id: workspace.id,
              role: 'owner',
              permissions: {
                can_edit: true,
                can_delete: true,
                can_invite: true,
                can_manage_members: true,
                can_manage_settings: true
              }
            }]);

          if (memberError) {
            console.error('🚨 Workspace member creation error:', memberError);
          }

          // Update profile with workspace reference
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ user_workspaces: [workspace.id] })
            .eq('id', user.id);

          if (updateError) {
            console.error('🚨 Profile workspace update error:', updateError);
          }
        }

        console.log('✅ Profile created successfully:', {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name
        });
        
        return { data: profile, error: null };
      } else {
        console.log('✅ handle_new_user function executed successfully');
        
        // Fetch the created profile
        const { data: profile, error: fetchError } = await this.fetchUserProfile(user.id);
        return { data: profile, error: fetchError };
      }
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