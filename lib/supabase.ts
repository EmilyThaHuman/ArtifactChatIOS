import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://admxfokkeuwxurwusoyq.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbXhmb2trZXV3eHVyd3Vzb3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzNDU2MzUsImV4cCI6MjA0NzkyMTYzNX0.QLpXHyvURMHyhmee8ilhwlsNsY9DD5WlnXmdgdC56kQ';

// Custom storage implementation for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      // Use localStorage for web when available
      return Promise.resolve(localStorage.getItem(key));
    }
    if (Platform.OS === 'web') {
      // Fallback for web when localStorage is not available (SSR)
      return Promise.resolve(null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      // Use localStorage for web when available
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      // Fallback for web when localStorage is not available (SSR)
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      // Use localStorage for web when available
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      // Fallback for web when localStorage is not available (SSR)
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Updated Database types based on actual schema
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          onboarding_completed: boolean | null;
          settings: any;
          user_workspaces: string[] | null;
          preferences: any | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean | null;
          settings?: any;
          user_workspaces?: string[] | null;
          preferences?: any | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean | null;
          settings?: any;
          user_workspaces?: string[] | null;
          preferences?: any | null;
        };
      };
      workspaces: {
        Row: {
          id: string;
          user_id: string | null;
          owner_id: string | null;
          name: string;
          description: string | null;
          is_personal: boolean | null;
          workspace_members: string[] | null;
          workspace_files: string[] | null;
          created_at: string;
          updated_at: string;
          settings: any | null;
          metadata: any | null;
          is_home: boolean | null;
          include_profile_context: boolean | null;
          include_workspace_instructions: boolean | null;
          instructions: string | null;
          file_data: any | null;
          workspace_assistants: string[] | null;
          workspace_threads: string[] | null;
          vector_store_id: string | null;
          workflows: string[] | null;
          workspace_tasks: string[] | null;
          is_team: boolean;
          team_key: string | null;
          team_name: string | null;
          created_now: boolean | null;
          allow_invites: boolean | null;
          workspace_memories: string[] | null;
          workspace_workflows: string[] | null;
          avatar_url: string | null;
          is_public: boolean | null;
          theme: string | null;
          textsize: string | null;
          codetheme: string | null;
          image_path: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          owner_id?: string | null;
          name: string;
          description?: string | null;
          is_personal?: boolean | null;
          workspace_members?: string[] | null;
          workspace_files?: string[] | null;
          created_at?: string;
          updated_at?: string;
          settings?: any | null;
          metadata?: any | null;
          is_home?: boolean | null;
          include_profile_context?: boolean | null;
          include_workspace_instructions?: boolean | null;
          instructions?: string | null;
          file_data?: any | null;
          workspace_assistants?: string[] | null;
          workspace_threads?: string[] | null;
          vector_store_id?: string | null;
          workflows?: string[] | null;
          workspace_tasks?: string[] | null;
          is_team?: boolean;
          team_key?: string | null;
          team_name?: string | null;
          created_now?: boolean | null;
          allow_invites?: boolean | null;
          workspace_memories?: string[] | null;
          workspace_workflows?: string[] | null;
          avatar_url?: string | null;
          is_public?: boolean | null;
          theme?: string | null;
          textsize?: string | null;
          codetheme?: string | null;
          image_path?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          owner_id?: string | null;
          name?: string;
          description?: string | null;
          is_personal?: boolean | null;
          workspace_members?: string[] | null;
          workspace_files?: string[] | null;
          created_at?: string;
          updated_at?: string;
          settings?: any | null;
          metadata?: any | null;
          is_home?: boolean | null;
          include_profile_context?: boolean | null;
          include_workspace_instructions?: boolean | null;
          instructions?: string | null;
          file_data?: any | null;
          workspace_assistants?: string[] | null;
          workspace_threads?: string[] | null;
          vector_store_id?: string | null;
          workflows?: string[] | null;
          workspace_tasks?: string[] | null;
          is_team?: boolean;
          team_key?: string | null;
          team_name?: string | null;
          created_now?: boolean | null;
          allow_invites?: boolean | null;
          workspace_memories?: string[] | null;
          workspace_workflows?: string[] | null;
          avatar_url?: string | null;
          is_public?: boolean | null;
          theme?: string | null;
          textsize?: string | null;
          codetheme?: string | null;
          image_path?: string | null;
        };
      };
      threads: {
        Row: {
          id: string;
          openai_thread_id: string | null;
          workspace_id: string | null;
          assistant_id: string | null;
          user_id: string | null;
          title: string;
          summary: string | null;
          status: string | null;
          last_message_at: string | null;
          metadata: any | null;
          created_at: string;
          updated_at: string;
          last_activity: string | null;
          message_count: number | null;
          tool_resources: any | null;
          thread_id: string | null;
          openai_assistant_id: string | null;
          message_ids: string[] | null;
          tool_output_ids: string[] | null;
          bookmarked: boolean;
          provider: string | null;
          provider_thread_id: string | null;
          vector_store_id: string | null;
          is_shared: boolean;
          is_team: boolean;
        };
      };
      thread_messages: {
        Row: {
          id: string;
          thread_id: string;
          workspace_id: string;
          user_id: string | null;
          message_id: string;
          role: string;
          content: string;
          file_ids: string[] | null;
          metadata: any | null;
          created_at: string;
          openai_thread_message_id: string | null;
          openai_thread_id: string | null;
          updated_at: string | null;
          attachments: any | null;
          annotations: any | null;
          tools_count: number | null;
          provider: string | null;
          provider_message_id: string | null;
          tool_calls: any | null;
        };
      };
      workspace_files: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          file_name: string;
          file_type: string;
          file_size: number;
          file_path: string;
          storage_path: string;
          public_url: string | null;
          metadata: any | null;
          created_at: string | null;
          updated_at: string | null;
          openai_file_id: string | null;
          vector_store_id: string | null;
          created_by: string;
          file_content: string | null;
        };
      };
      assistants: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          model: string;
          instructions: string | null;
          file_ids: string[] | null;
          avatar_url: string | null;
          metadata: any | null;
          is_active: boolean | null;
          created_at: string;
          updated_at: string;
          assistant_id: string | null;
          user_id: string | null;
          response_format: string | null;
          top_p: number | null;
          temperature: number | null;
          thread_ids: string[] | null;
          usage_count: number | null;
          image_path: string | null;
          sharing: string;
          image_url: string | null;
          workspace_ids: string[] | null;
          tool_names: string[] | null;
          is_default: boolean;
          tools: any | null;
        };
      };
    };
  };
};