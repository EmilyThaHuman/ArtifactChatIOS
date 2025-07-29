import { useCallback, useEffect, useState } from 'react';
import { SettingsManager, UserProfile } from '@/lib/settings';

export interface PersonalizationFormData {
  // Personalization preferences
  role: string;
  interests: string[];
  traits: string[];
  ai_experience: string;
  enable_profile_memory: boolean;
  enable_profile_context: boolean;
  enable_memories: boolean;
  include_reasoning_in_response: boolean;
  tasks: boolean;

  // Profile information
  display_name: string;

  // System preferences
  textSize: string;
  autoSuggest: boolean;
}

export function usePersonalizationForm(user?: any) {
  // Initialize form data from profile settings to match PersonalizationSettings structure
  const [formData, setFormData] = useState<PersonalizationFormData>({
    // Personalization preferences
    role: '',
    interests: [],
    traits: [],
    ai_experience: 'intermediate',
    enable_profile_memory: false,
    enable_profile_context: false,
    enable_memories: true, // Default to true for memory integration
    include_reasoning_in_response: false,
    tasks: false,

    // Profile information
    display_name: '',

    // System preferences
    textSize: 'md',
    autoSuggest: true,
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
        
        setFormData({
          // Personalization preferences
          role: SettingsManager.getSetting(fetchedProfile, 'personalization.role', ''),
          interests: SettingsManager.getSetting(fetchedProfile, 'personalization.interests', []),
          traits: SettingsManager.getSetting(fetchedProfile, 'personalization.traits', []),
          ai_experience: SettingsManager.getSetting(fetchedProfile, 'personalization.ai_experience', 'intermediate'),
          enable_profile_memory: SettingsManager.getSetting(fetchedProfile, 'personalization.enable_profile_memory', false),
          enable_profile_context: SettingsManager.getSetting(fetchedProfile, 'personalization.enable_profile_context', false),
          enable_memories: SettingsManager.getSetting(fetchedProfile, 'personalization.enable_memories', true), // Default to true
          include_reasoning_in_response: SettingsManager.getSetting(fetchedProfile, 'personalization.include_reasoning_in_response', false),
          tasks: SettingsManager.getSetting(fetchedProfile, 'personalization.tasks', false),

          // Profile information
          display_name: SettingsManager.getSetting(fetchedProfile, 'profile.display_name', ''),

          // System preferences
          textSize: SettingsManager.getSetting(fetchedProfile, 'system.textSize', 'md'),
          autoSuggest: SettingsManager.getSetting(fetchedProfile, 'system.autoSuggest', true),
        });
        
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [user?.id]);

  const handleInputChange = useCallback((field: keyof PersonalizationFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const handleSelectChange = useCallback((field: keyof PersonalizationFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const handleArrayChange = useCallback((field: 'interests' | 'traits', value: string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const addToArray = useCallback((field: 'interests' | 'traits', item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], item],
    }));
    setIsDirty(true);
  }, []);

  const removeFromArray = useCallback((field: 'interests' | 'traits', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async (): Promise<UserProfile | null> => {
    if (!isDirty || !user?.id) return null;

    setIsSaving(true);
    try {
      // Update settings using the existing pattern - split data into appropriate sections
      const settingsUpdate = {
        personalization: {
          role: formData.role,
          interests: formData.interests,
          traits: formData.traits,
          ai_experience: formData.ai_experience,
          enable_profile_memory: formData.enable_profile_memory,
          enable_profile_context: formData.enable_profile_context,
          enable_memories: formData.enable_memories,
          include_reasoning_in_response: formData.include_reasoning_in_response,
          tasks: formData.tasks,
        },
        profile: {
          display_name: formData.display_name,
        },
        system: {
          textSize: formData.textSize,
          autoSuggest: formData.autoSuggest,
        },
      };

      const updatedProfile = await SettingsManager.updateSettings(user.id, settingsUpdate);
      setProfile(updatedProfile);
      setIsDirty(false);
      
      return updatedProfile;
    } catch (error) {
      console.error('Error saving personalization settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [formData, isDirty, user?.id]);

  return {
    formData,
    isDirty,
    isSaving,
    profile,
    handleInputChange,
    handleSelectChange,
    handleArrayChange,
    addToArray,
    removeFromArray,
    handleSave,
    loadProfile,
  };
}