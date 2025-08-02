import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  Camera,
  Save,
  Loader2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

interface ProfileSettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function ProfileSettings({ user, onClose }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    displayName: user?.user_metadata?.full_name || user?.full_name || '',
    email: user?.email || '',
    avatar_url: user?.user_metadata?.avatar_url || user?.avatar_url || '',
    customInstructions: '',
    useProfileContext: false,
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  const handleAvatarUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingAvatar(true);
        const imageUri = result.assets[0].uri;
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `avatar_${user?.id}.jpg`,
        } as any);

        // Upload to Supabase storage
        const fileName = `${user?.id}/avatar_${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, formData);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        if (urlData) {
          handleInputChange('avatar_url', urlData.publicUrl);
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty || !user?.id) return;

    setIsSaving(true);
    try {
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.displayName,
          avatar_url: formData.avatar_url,
        }
      });

      if (error) throw error;

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.displayName,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setIsDirty(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderAvatar = () => {
    if (formData.avatar_url) {
      return (
        <Image
          source={{ uri: formData.avatar_url }}
          style={styles.avatar}
        />
      );
    }

    return (
      <View style={styles.avatarPlaceholder}>
        <User size={24} color="#9ca3af" />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Avatar Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avatar</Text>
        <Text style={styles.sectionDescription}>
          This is your avatar. Click on the avatar to upload a custom one from your files.
        </Text>
        
        <View style={styles.avatarContainer}>
          <TouchableOpacity 
            style={styles.avatarButton}
            onPress={handleAvatarUpload}
            disabled={isUploadingAvatar}
          >
            {renderAvatar()}
            {isUploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Camera size={16} color="#ffffff" />
            </View>
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
        
        <TextInput
          style={styles.textInput}
          value={formData.displayName}
          onChangeText={(value) => handleInputChange('displayName', value)}
          placeholder="Enter your display name"
          placeholderTextColor="#6b7280"
        />
        
        <Text style={styles.sectionFooter}>
          This is the name that will be displayed on your profile and your posts.
        </Text>
      </View>

      {/* Email Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        <Text style={styles.sectionDescription}>
          This is your email address.
        </Text>
        
        <TextInput
          style={[styles.textInput, styles.disabledInput]}
          value={formData.email}
          editable={false}
          placeholderTextColor="#6b7280"
        />
        
        <Text style={styles.sectionFooter}>
          Your email address cannot be changed.
        </Text>
      </View>

      {/* Custom Instructions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Instructions</Text>
        <Text style={styles.sectionDescription}>
          Tell the AI about yourself to get better responses.
        </Text>
        
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.customInstructions}
          onChangeText={(value) => handleInputChange('customInstructions', value)}
          placeholder="Tell the AI about yourself, your preferences, and how you'd like it to respond..."
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.sectionFooter}>
          These instructions will be used to personalize AI responses.
        </Text>
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
  sectionFooter: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#252628',
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
  disabledInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: '#6b7280',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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