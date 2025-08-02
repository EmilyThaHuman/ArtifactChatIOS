import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import {
  User,
  Save,
  Loader2,
  Plus,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface PersonalizationSettingsProps {
  user?: any;
  onClose?: () => void;
}

interface PersonalizationData {
  role: string;
  interests: string[];
  traits: string[];
  ai_experience: 'beginner' | 'intermediate' | 'advanced';
  enable_profile_memory: boolean;
  enable_profile_context: boolean;
  enable_memories: boolean;
  include_reasoning_in_response: boolean;
  tasks: boolean;
  display_name: string;
  textSize: 'sm' | 'md' | 'lg';
  autoSuggest: boolean;
}

export default function PersonalizationSettings({ user, onClose }: PersonalizationSettingsProps) {
  const [formData, setFormData] = useState<PersonalizationData>({
    role: '',
    interests: [],
    traits: [],
    ai_experience: 'intermediate',
    enable_profile_memory: false,
    enable_profile_context: false,
    enable_memories: true,
    include_reasoning_in_response: false,
    tasks: false,
    display_name: '',
    textSize: 'md',
    autoSuggest: true,
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newTrait, setNewTrait] = useState('');

  useEffect(() => {
    loadPersonalizationData();
  }, [user]);

  const loadPersonalizationData = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      if (profile?.settings) {
        setFormData({
          role: profile.settings.personalization?.role || '',
          interests: profile.settings.personalization?.interests || [],
          traits: profile.settings.personalization?.traits || [],
          ai_experience: profile.settings.personalization?.ai_experience || 'intermediate',
          enable_profile_memory: profile.settings.personalization?.enable_profile_memory || false,
          enable_profile_context: profile.settings.personalization?.enable_profile_context || false,
          enable_memories: profile.settings.personalization?.enable_memories !== false,
          include_reasoning_in_response: profile.settings.personalization?.include_reasoning_in_response || false,
          tasks: profile.settings.personalization?.tasks || false,
          display_name: profile.settings.profile?.display_name || '',
          textSize: profile.settings.system?.textSize || 'md',
          autoSuggest: profile.settings.system?.autoSuggest || true,
        });
      }
    } catch (error) {
      console.error('Error loading personalization data:', error);
    }
  };

  const handleInputChange = useCallback((field: keyof PersonalizationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      handleInputChange('interests', [...formData.interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    handleInputChange('interests', formData.interests.filter(i => i !== interest));
  };

  const addTrait = () => {
    if (newTrait.trim() && !formData.traits.includes(newTrait.trim())) {
      handleInputChange('traits', [...formData.traits, newTrait.trim()]);
      setNewTrait('');
    }
  };

  const removeTrait = (trait: string) => {
    handleInputChange('traits', formData.traits.filter(t => t !== trait));
  };

  const handleSave = async () => {
    if (!isDirty || !user?.id) return;

    setIsSaving(true);
    try {
      // Get current settings
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      const currentSettings = currentProfile?.settings || {};

      // Update settings
      const settingsUpdate = {
        ...currentSettings,
        personalization: {
          ...currentSettings.personalization,
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
          ...currentSettings.profile,
          display_name: formData.display_name,
        },
        system: {
          ...currentSettings.system,
          textSize: formData.textSize,
          autoSuggest: formData.autoSuggest,
        },
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          settings: settingsUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsDirty(false);
      Alert.alert('Success', 'Personalization settings saved successfully');
    } catch (error) {
      console.error('Error saving personalization settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const renderExperienceOption = (experience: string, label: string) => (
    <TouchableOpacity
      key={experience}
      style={[
        styles.optionButton,
        formData.ai_experience === experience && styles.optionButtonSelected
      ]}
      onPress={() => handleInputChange('ai_experience', experience)}
    >
      <Text style={[
        styles.optionText,
        formData.ai_experience === experience && styles.optionTextSelected
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTextSizeOption = (size: string, label: string) => (
    <TouchableOpacity
      key={size}
      style={[
        styles.optionButton,
        formData.textSize === size && styles.optionButtonSelected
      ]}
      onPress={() => handleInputChange('textSize', size)}
    >
      <Text style={[
        styles.optionText,
        formData.textSize === size && styles.optionTextSelected
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTagList = (items: string[], onRemove: (item: string) => void) => (
    <View style={styles.tagContainer}>
      {items.map((item, index) => (
        <View key={index} style={styles.tag}>
          <Text style={styles.tagText}>{item}</Text>
          <TouchableOpacity onPress={() => onRemove(item)}>
            <X size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Role Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role</Text>
        <Text style={styles.sectionDescription}>
          What's your role or profession?
        </Text>
        
        <TextInput
          style={styles.textInput}
          value={formData.role}
          onChangeText={(value) => handleInputChange('role', value)}
          placeholder="e.g., Software Developer, Designer, Student"
          placeholderTextColor="#6b7280"
        />
      </View>

      {/* Interests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <Text style={styles.sectionDescription}>
          What are you interested in?
        </Text>
        
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, styles.flexInput]}
            value={newInterest}
            onChangeText={setNewInterest}
            placeholder="Add an interest"
            placeholderTextColor="#6b7280"
            onSubmitEditing={addInterest}
          />
          <TouchableOpacity style={styles.addButton} onPress={addInterest}>
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        {formData.interests.length > 0 && renderTagList(formData.interests, removeInterest)}
      </View>

      {/* Traits Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personality Traits</Text>
        <Text style={styles.sectionDescription}>
          Describe your personality or communication style
        </Text>
        
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, styles.flexInput]}
            value={newTrait}
            onChangeText={setNewTrait}
            placeholder="Add a trait"
            placeholderTextColor="#6b7280"
            onSubmitEditing={addTrait}
          />
          <TouchableOpacity style={styles.addButton} onPress={addTrait}>
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        {formData.traits.length > 0 && renderTagList(formData.traits, removeTrait)}
      </View>

      {/* AI Experience Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Experience Level</Text>
        <Text style={styles.sectionDescription}>
          How familiar are you with AI tools?
        </Text>
        
        <View style={styles.optionsContainer}>
          {renderExperienceOption('beginner', 'Beginner')}
          {renderExperienceOption('intermediate', 'Intermediate')}
          {renderExperienceOption('advanced', 'Advanced')}
        </View>
      </View>

      {/* Memory Settings */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Enable Profile Memory</Text>
            <Text style={styles.settingDescription}>
              Allow AI to remember details about you
            </Text>
          </View>
          <Switch
            value={formData.enable_profile_memory}
            onValueChange={(value) => handleInputChange('enable_profile_memory', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Enable Profile Context</Text>
            <Text style={styles.settingDescription}>
              Use your profile information in conversations
            </Text>
          </View>
          <Switch
            value={formData.enable_profile_context}
            onValueChange={(value) => handleInputChange('enable_profile_context', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Enable Memories</Text>
            <Text style={styles.settingDescription}>
              Allow AI to remember conversations
            </Text>
          </View>
          <Switch
            value={formData.enable_memories}
            onValueChange={(value) => handleInputChange('enable_memories', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Include Reasoning</Text>
            <Text style={styles.settingDescription}>
              Show AI reasoning in responses
            </Text>
          </View>
          <Switch
            value={formData.include_reasoning_in_response}
            onValueChange={(value) => handleInputChange('include_reasoning_in_response', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Enable Tasks</Text>
            <Text style={styles.settingDescription}>
              Allow AI to suggest and track tasks
            </Text>
          </View>
          <Switch
            value={formData.tasks}
            onValueChange={(value) => handleInputChange('tasks', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* System Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text Size</Text>
        <Text style={styles.sectionDescription}>
          Choose your preferred text size
        </Text>
        
        <View style={styles.optionsContainer}>
          {renderTextSizeOption('sm', 'Small')}
          {renderTextSizeOption('md', 'Medium')}
          {renderTextSizeOption('lg', 'Large')}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto Suggestions</Text>
            <Text style={styles.settingDescription}>
              Show automatic suggestions while typing
            </Text>
          </View>
          <Switch
            value={formData.autoSuggest}
            onValueChange={(value) => handleInputChange('autoSuggest', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Save Button */}
      {isDirty && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 size={18} color="#ffffff" />
            ) : (
              <Save size={18} color="#ffffff" />
            )}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    minHeight: 44,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  flexInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    color: '#ffffff',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  saveContainer: {
    padding: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});