import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  Camera,
  User,
  Edit3,
  Check,
  X,
  Save,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useSimpleProfileForm } from '@/hooks/forms';

interface ProfileSettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function ProfileSettings({ user, onClose }: ProfileSettingsProps) {
  const {
    formData,
    isDirty,
    isSaving,
    profile,
    handleInputChange,
    handleGenerate,
    handleSave,
    handleAvatarUpdate,
    loadProfile,
  } = useSimpleProfileForm(user);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);

  const validateDisplayName = (value: string) => {
    if (!value || value.trim().length === 0) {
      return 'Display name is required';
    }
    if (value.trim().length < 2) {
      return 'Display name must be at least 2 characters';
    }
    if (value.trim().length > 50) {
      return 'Display name must be less than 50 characters';
    }
    return null;
  };

  const handleSaveDisplayName = useCallback(async () => {
    const error = validateDisplayName(formData.displayName);
    if (error) {
      Alert.alert('Invalid Name', error);
      return;
    }

    try {
      await handleSave();
      setIsEditingName(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  }, [formData.displayName, handleSave]);

  const handleAvatarPress = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to upload your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      await handleAvatarUpload(result.assets[0]);
    }
  }, []);

  const handleAvatarUpload = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user?.id) return;

    setIsUploadingAvatar(true);
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: `avatar-${user.id}-${Date.now()}.jpg`,
      } as any);

      // Upload to Supabase storage
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update avatar using the hook
      await handleAvatarUpdate(publicUrl);
      
      Alert.alert('Success', 'Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [user?.id, handleAvatarUpdate]);

  const handleGenerateProfileContext = useCallback(async () => {
    setIsGeneratingContext(true);
    try {
      // This would integrate with your AI service to generate profile context
      // For now, we'll just show a placeholder
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert('Profile Context', 'Profile context generation is not yet implemented in mobile.');
      handleGenerate();
    } catch (error) {
      console.error('Error generating profile context:', error);
      Alert.alert('Error', 'Failed to generate profile context');
    } finally {
      setIsGeneratingContext(false);
    }
  }, [handleGenerate]);

  const renderAvatar = useCallback(() => {
    if (formData.avatar_url) {
      return (
        <Image
          source={{ uri: formData.avatar_url }}
          style={styles.avatar}
          onError={() => console.log('Avatar failed to load')}
        />
      );
    }

    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {formData.displayName.charAt(0).toUpperCase() || 'U'}
        </Text>
      </View>
    );
  }, [formData.avatar_url, formData.displayName]);

  const handleProfileContextSave = useCallback(async () => {
    if (!isDirty) return;
    
    try {
      await handleSave();
      Alert.alert('Success', 'Profile context updated successfully');
    } catch (error) {
      console.error('Error saving profile context:', error);
      Alert.alert('Error', 'Failed to update profile context');
    }
  }, [isDirty, handleSave]);

  return (
    <View style={styles.container}>
      {/* Avatar Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avatar</Text>
        <Text style={styles.sectionDescription}>
          This is your avatar. Click on the avatar to upload a custom one from your files.
        </Text>
        
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar || isSaving}
            activeOpacity={0.7}
          >
            {renderAvatar()}
            <View style={styles.avatarOverlay}>
              <Camera size={16} color={Colors.white} />
            </View>
            {isUploadingAvatar && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionFooter}>
          An avatar is optional but strongly recommended.
        </Text>
      </View>

      {/* Display Name Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display Name</Text>
        <Text style={styles.sectionDescription}>
          This is your display name. It can be your real name or a pseudonym.
        </Text>
        
        <View style={styles.inputContainer}>
          {isEditingName ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.displayName}
                onChangeText={(value) => handleInputChange('displayName', value)}
                placeholder="Enter display name"
                placeholderTextColor={Colors.gray400}
                autoFocus
                maxLength={50}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditingName(false);
                    loadProfile(); // Reset to original values
                  }}
                  disabled={isSaving}
                >
                  <X size={16} color={Colors.gray400} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveDisplayName}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Check size={16} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.displayContainer}>
              <Text style={styles.displayName}>{formData.displayName || 'No name set'}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditingName(true)}
              >
                <Edit3 size={16} color={Colors.gray400} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <Text style={styles.sectionFooter}>
          This is how your name will be displayed to other users.
        </Text>
      </View>

      {/* Email Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        <Text style={styles.sectionDescription}>
          This is your email address. Contact support to change it.
        </Text>
        
        <View style={styles.emailContainer}>
          <Text style={styles.emailText}>{formData.email}</Text>
        </View>
      </View>

      {/* Profile Context Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Context</Text>
        <Text style={styles.sectionDescription}>
          Add custom instructions to personalize your AI assistant's responses.
        </Text>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Use Profile Context</Text>
          <Switch
            value={formData.useProfileContext}
            onValueChange={(value) => handleInputChange('useProfileContext', value)}
            trackColor={{ false: Colors.gray400, true: Colors.purple500 }}
            thumbColor={formData.useProfileContext ? Colors.white : Colors.gray300}
          />
        </View>

        <TextInput
          style={[styles.textArea, !formData.useProfileContext && styles.disabledTextArea]}
          value={formData.customInstructions}
          onChangeText={(value) => handleInputChange('customInstructions', value)}
          placeholder="Enter custom instructions for your AI assistant..."
          placeholderTextColor={Colors.gray400}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={formData.useProfileContext}
        />

        <View style={styles.profileContextActions}>
          <TouchableOpacity
            style={[styles.generateButton, !formData.useProfileContext && styles.disabledButton]}
            onPress={handleGenerateProfileContext}
            disabled={isGeneratingContext || !formData.useProfileContext}
            activeOpacity={0.7}
          >
            {isGeneratingContext ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.generateButtonText}>Generating...</Text>
              </>
            ) : (
              <>
                <User size={16} color={Colors.white} />
                <Text style={styles.generateButtonText}>Generate Profile Context</Text>
              </>
            )}
          </TouchableOpacity>

          {isDirty && (
            <TouchableOpacity
              style={styles.saveContextButton}
              onPress={handleProfileContextSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Save size={16} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
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
  sectionFooter: {
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 8,
    lineHeight: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.purple500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.white,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.purple600,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundDark,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 8,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: Colors.textLight,
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: Colors.purple500,
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  displayName: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  editButton: {
    padding: 4,
  },
  emailContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emailText: {
    fontSize: 14,
    color: Colors.gray400,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  textArea: {
    height: 120,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: Colors.textLight,
    fontSize: 14,
    marginBottom: 16,
  },
  disabledTextArea: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileContextActions: {
    gap: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.purple500,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: Colors.gray600,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
  saveContextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.green100,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
});