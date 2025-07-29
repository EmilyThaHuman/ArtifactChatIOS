import { useCallback, useEffect, useState } from 'react';
import { SettingsManager, UserProfile } from '@/lib/settings';

export interface SimpleProfileFormData {
  displayName: string;
  email: string;
  avatar_url: string;
  customInstructions: string;
  useProfileContext: boolean;
}

export function useSimpleProfileForm(user?: any) {
  // Initialize form data from profile settings
  const [formData, setFormData] = useState<SimpleProfileFormData>({
    displayName: '',
    email: '',
    avatar_url: '',
    customInstructions: '',
    useProfileContext: false,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Fetch and update form data when user changes
  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const fetchedProfile = await SettingsManager.getProfile(user.id);
      if (fetchedProfile) {
        setProfile(fetchedProfile);
        
        // Prioritize personalization.profile_context over profile.profile_context
        const profileContext = SettingsManager.getSetting(
          fetchedProfile,
          'personalization.profile_context',
          SettingsManager.getSetting(fetchedProfile, 'profile.profile_context', '')
        );

        const newFormData: SimpleProfileFormData = {
          displayName: 
            SettingsManager.getSetting(fetchedProfile, 'profile.display_name') ||
            fetchedProfile.full_name || 
            user.user_metadata?.full_name || 
            '',
          email: fetchedProfile.email || user.email || '',
          avatar_url: fetchedProfile.avatar_url || user.user_metadata?.avatar_url || '',
          customInstructions: profileContext,
          useProfileContext: SettingsManager.getSetting(
            fetchedProfile,
            'personalization.enable_profile_context',
            false
          ),
        };

        setFormData(newFormData);
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [user?.id, user?.user_metadata, user?.email]);

  const handleInputChange = useCallback((field: keyof SimpleProfileFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const handleGenerate = useCallback(() => {
    // Placeholder for profile context generation
    console.log('Profile context generation not yet implemented');
  }, []);

  const handleSave = useCallback(async (): Promise<UserProfile | null> => {
    if (!isDirty || !user?.id) return null;

    setIsSaving(true);
    try {
      // Update profile information (name, avatar)
      if (formData.displayName !== (profile?.full_name || '') || 
          formData.avatar_url !== (profile?.avatar_url || '')) {
        await SettingsManager.updateProfile(user.id, {
          full_name: formData.displayName,
          avatar_url: formData.avatar_url,
        });
      }

      // Update settings
      const settingsUpdate = {
        profile: {
          display_name: formData.displayName,
          profile_context: formData.customInstructions,
        },
        personalization: {
          profile_context: formData.customInstructions,
          enable_profile_context: formData.useProfileContext,
        },
      };

      const updatedProfile = await SettingsManager.updateSettings(user.id, settingsUpdate);
      setProfile(updatedProfile);
      setIsDirty(false);

      return updatedProfile;
    } catch (error) {
      console.error('Error saving profile settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [formData, isDirty, user?.id, profile]);

  const handleAvatarUpdate = useCallback(async (avatarUrl: string) => {
    if (!user?.id) return;

    try {
      setIsSaving(true);
      const updatedProfile = await SettingsManager.updateAvatar(user.id, avatarUrl);
      setProfile(updatedProfile);
      setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  return {
    formData,
    isDirty,
    isSaving,
    profile,
    handleInputChange,
    handleGenerate,
    handleSave,
    handleAvatarUpdate,
    loadProfile,
  };
}