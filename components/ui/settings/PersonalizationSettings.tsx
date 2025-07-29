import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import {
  Palette,
  Save,
  Plus,
  X,
  User,
  Brain,
  Settings,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { usePersonalizationForm } from '@/hooks/forms';

interface PersonalizationSettingsProps {
  user?: any;
  onClose?: () => void;
}

const AI_EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const TEXT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

export default function PersonalizationSettings({ user, onClose }: PersonalizationSettingsProps) {
  const {
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
  } = usePersonalizationForm(user);

  const [newInterest, setNewInterest] = useState('');
  const [newTrait, setNewTrait] = useState('');
  const [showInterestInput, setShowInterestInput] = useState(false);
  const [showTraitInput, setShowTraitInput] = useState(false);

  const handleSavePersonalization = useCallback(async () => {
    if (!isDirty) return;

    try {
      await handleSave();
      Alert.alert('Success', 'Personalization settings updated successfully');
    } catch (error) {
      console.error('Error saving personalization:', error);
      Alert.alert('Error', 'Failed to update personalization settings');
    }
  }, [isDirty, handleSave]);

  const handleAddInterest = useCallback(() => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      addToArray('interests', newInterest.trim());
      setNewInterest('');
      setShowInterestInput(false);
    }
  }, [newInterest, formData.interests, addToArray]);

  const handleAddTrait = useCallback(() => {
    if (newTrait.trim() && !formData.traits.includes(newTrait.trim())) {
      addToArray('traits', newTrait.trim());
      setNewTrait('');
      setShowTraitInput(false);
    }
  }, [newTrait, formData.traits, addToArray]);

  const renderSelector = useCallback((
    title: string,
    options: { value: string; label: string }[],
    currentValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              currentValue === option.value && styles.selectedOption,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                currentValue === option.value && styles.selectedOptionText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), []);

  const renderArrayInput = useCallback((
    title: string,
    items: string[],
    onRemove: (index: number) => void,
    newValue: string,
    setNewValue: (value: string) => void,
    showInput: boolean,
    setShowInput: (show: boolean) => void,
    onAdd: () => void,
    placeholder: string
  ) => (
    <View style={styles.arrayInputContainer}>
      <Text style={styles.arrayTitle}>{title}</Text>
      
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemChip}>
            <Text style={styles.itemText}>{item}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(index)}
            >
              <X size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ))}
        
        {showInput ? (
          <View style={styles.addInputContainer}>
            <TextInput
              style={styles.addInput}
              value={newValue}
              onChangeText={setNewValue}
              placeholder={placeholder}
              placeholderTextColor={Colors.gray400}
              autoFocus
              onSubmitEditing={onAdd}
            />
            <TouchableOpacity style={styles.addButton} onPress={onAdd}>
              <Plus size={16} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowInput(false);
                setNewValue('');
              }}
            >
              <X size={16} color={Colors.gray400} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={() => setShowInput(true)}
          >
            <Plus size={16} color={Colors.purple500} />
            <Text style={styles.addNewText}>Add {title.slice(0, -1)}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), []);

  const renderToggle = useCallback((
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void
  ) => (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.gray400, true: Colors.purple500 }}
        thumbColor={value ? Colors.white : Colors.gray300}
      />
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Role Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Role</Text>
          <Text style={styles.sectionDescription}>
            Tell us about your professional background to get more relevant responses
          </Text>
          
          <TextInput
            style={styles.textInput}
            value={formData.role}
            onChangeText={(value) => handleInputChange('role', value)}
            placeholder="e.g., Software Engineer, Designer, Student..."
            placeholderTextColor={Colors.gray400}
          />
        </View>

        {/* AI Experience Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Experience Level</Text>
          <Text style={styles.sectionDescription}>
            How familiar are you with AI tools and concepts?
          </Text>
          
          {renderSelector(
            '',
            AI_EXPERIENCE_OPTIONS,
            formData.ai_experience,
            (value) => handleSelectChange('ai_experience', value)
          )}
        </View>

        {/* Interests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <Text style={styles.sectionDescription}>
            Add your interests to help personalize responses
          </Text>
          
          {renderArrayInput(
            'Interests',
            formData.interests,
            (index) => removeFromArray('interests', index),
            newInterest,
            setNewInterest,
            showInterestInput,
            setShowInterestInput,
            handleAddInterest,
            'Enter an interest'
          )}
        </View>

        {/* Traits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Traits</Text>
          <Text style={styles.sectionDescription}>
            Describe your working style and personality traits
          </Text>
          
          {renderArrayInput(
            'Traits',
            formData.traits,
            (index) => removeFromArray('traits', index),
            newTrait,
            setNewTrait,
            showTraitInput,
            setShowTraitInput,
            handleAddTrait,
            'Enter a trait'
          )}
        </View>

        {/* Memory Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Memory & Context</Text>
          <Text style={styles.sectionDescription}>
            Configure how the AI remembers and uses your information
          </Text>
          
          {renderToggle(
            'Enable Memories',
            'Allow the AI to remember information across conversations',
            formData.enable_memories,
            (value) => handleInputChange('enable_memories', value)
          )}
          
          {renderToggle(
            'Enable Profile Context',
            'Use your profile information to personalize responses',
            formData.enable_profile_context,
            (value) => handleInputChange('enable_profile_context', value)
          )}
          
          {renderToggle(
            'Enable Profile Memory',
            'Store profile-based memories for better personalization',
            formData.enable_profile_memory,
            (value) => handleInputChange('enable_profile_memory', value)
          )}
        </View>

        {/* Response Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Response Preferences</Text>
          <Text style={styles.sectionDescription}>
            Customize how the AI responds to your messages
          </Text>
          
          {renderToggle(
            'Include Reasoning',
            'Show the AI\'s reasoning process in responses',
            formData.include_reasoning_in_response,
            (value) => handleInputChange('include_reasoning_in_response', value)
          )}
          
          {renderToggle(
            'Enable Tasks',
            'Allow the AI to help with task management',
            formData.tasks,
            (value) => handleInputChange('tasks', value)
          )}
        </View>

        {/* Display Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Preferences</Text>
          <Text style={styles.sectionDescription}>
            Customize the app interface to your preferences
          </Text>
          
          {renderSelector(
            'Text Size',
            TEXT_SIZE_OPTIONS,
            formData.textSize,
            (value) => handleSelectChange('textSize', value)
          )}
          
          {renderToggle(
            'Auto Suggest',
            'Show automatic suggestions while typing',
            formData.autoSuggest,
            (value) => handleInputChange('autoSuggest', value)
          )}
        </View>

        {/* Save Button */}
        {isDirty && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSavePersonalization}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Save size={16} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray400,
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: Colors.textLight,
    fontSize: 14,
  },
  selectorContainer: {
    marginBottom: 8,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedOption: {
    backgroundColor: Colors.purple500,
    borderColor: Colors.purple600,
  },
  optionText: {
    fontSize: 14,
    color: Colors.gray400,
  },
  selectedOptionText: {
    color: Colors.white,
    fontWeight: '500',
  },
  arrayInputContainer: {
    marginBottom: 8,
  },
  arrayTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 12,
  },
  itemsContainer: {
    gap: 8,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purple500,
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  itemText: {
    color: Colors.white,
    fontSize: 14,
    marginRight: 8,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: Colors.textLight,
    fontSize: 14,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.purple500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  addNewText: {
    color: Colors.purple500,
    fontSize: 14,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 12,
  },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: Colors.gray400,
    lineHeight: 16,
  },
  saveContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: Colors.purple500,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});