import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  settings: any;
  user_workspaces: string[] | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsUpdate {
  personalization?: {
    role?: string;
    interests?: string[];
    traits?: string[];
    ai_experience?: string;
    enable_profile_memory?: boolean;
    enable_profile_context?: boolean;
    enable_memories?: boolean;
    include_reasoning_in_response?: boolean;
    tasks?: boolean;
    profile_context?: string;
  };
  profile?: {
    display_name?: string;
    profile_context?: string;
  };
  system?: {
    textSize?: string;
    autoSuggest?: boolean;
  };
  subscription?: any;
  preferences?: any;
}

export class SettingsManager {
  /**
   * Update user profile settings in Supabase
   */
  static async updateSettings(userId: string, settingsUpdate: SettingsUpdate): Promise<UserProfile> {
    try {
      console.log('🔄 Updating user settings for:', userId);
      console.log('Settings update:', settingsUpdate);

      // First, get the current profile to merge settings
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching current profile:', fetchError);
        throw fetchError;
      }

      // Merge the settings with existing ones
      const currentSettings = currentProfile?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        ...settingsUpdate,
        // Deep merge for nested objects
        personalization: {
          ...currentSettings.personalization,
          ...settingsUpdate.personalization,
        },
        profile: {
          ...currentSettings.profile,
          ...settingsUpdate.profile,
        },
        system: {
          ...currentSettings.system,
          ...settingsUpdate.system,
        },
      };

      // Update the profile with new settings
      const { data, error } = await supabase
        .from('profiles')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        throw error;
      }

      console.log('✅ Settings updated successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('🚨 Settings update failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile information (non-settings fields)
   */
  static async updateProfile(userId: string, profileUpdate: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
  }): Promise<UserProfile> {
    try {
      console.log('🔄 Updating user profile for:', userId);
      console.log('Profile update:', profileUpdate);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      // Also update auth user metadata if needed
      if (profileUpdate.full_name || profileUpdate.avatar_url) {
        const authUpdateData: any = {};
        if (profileUpdate.full_name) authUpdateData.full_name = profileUpdate.full_name;
        if (profileUpdate.avatar_url) authUpdateData.avatar_url = profileUpdate.avatar_url;

        const { error: authError } = await supabase.auth.updateUser({
          data: authUpdateData
        });

        if (authError) {
          console.warn('Failed to update auth metadata:', authError);
        }
      }

      console.log('✅ Profile updated successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('🚨 Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('🚨 Profile fetch failed:', error);
      return null;
    }
  }

  /**
   * Update avatar URL after file upload
   */
  static async updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile> {
    return this.updateProfile(userId, { avatar_url: avatarUrl });
  }

  /**
   * Get a specific setting value
   */
  static getSetting(profile: UserProfile | null, path: string, defaultValue: any = null): any {
    if (!profile?.settings) return defaultValue;

    const keys = path.split('.');
    let current = profile.settings;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current !== undefined ? current : defaultValue;
  }

  /**
   * Set a specific setting value (returns the new settings object, doesn't persist)
   */
  static setSetting(currentSettings: any, path: string, value: any): any {
    const keys = path.split('.');
    const newSettings = JSON.parse(JSON.stringify(currentSettings || {}));
    
    let current = newSettings;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return newSettings;
  }
}