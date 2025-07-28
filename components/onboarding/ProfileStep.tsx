import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, User } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface FormData {
  display_name: string;
  bio: string;
  avatar_url: string;
  personalization: {
    role: string;
    traits: string[];
    interests: string[];
    profile_context: string;
  };
}

interface ProfileStepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  avatarFile: any;
  setAvatarFile: (file: any) => void;
}



export default function ProfileStep({
  formData,
  updateFormData,
  avatarFile,
  setAvatarFile,
}: ProfileStepProps) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleAvatarPress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to upload an avatar');
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
        setIsUploadingAvatar(true);
        const asset = result.assets[0];
        
        // Create a temporary URL for preview
        updateFormData({ avatar_url: asset.uri });
        setAvatarFile(asset);
        
        setIsUploadingAvatar(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      setIsUploadingAvatar(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'display_name' || field === 'bio' || field === 'avatar_url') {
      updateFormData({ [field]: value });
    } else {
      updateFormData({
        personalization: {
          ...formData.personalization,
          [field]: value,
        },
      });
    }
  };



  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Avatar Section */}
      <View style={styles.section}>
        
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleAvatarPress}
          disabled={isUploadingAvatar}
        >
          {isUploadingAvatar ? (
            <View style={styles.avatarPlaceholder}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : formData.avatar_url ? (
            <Image source={{ uri: formData.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              {formData.display_name ? (
                <Text style={styles.avatarInitials}>
                  {getInitials(formData.display_name)}
                </Text>
              ) : (
                <User size={32} color={Colors.textSecondary} />
              )}
            </View>
          )}
          
          <View style={styles.cameraOverlay}>
            <Camera size={16} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Basic Info Section */}
      <View style={styles.section}>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Display Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textInput,
              focusedField === 'display_name' && styles.textInputFocused,
            ]}
            placeholder="How you'll appear to others"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={formData.display_name}
            onChangeText={(value) => handleInputChange('display_name', value)}
            onFocus={() => setFocusedField('display_name')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="words"
            maxLength={50}
          />
        </View>


      </View>

      {/* Custom Instructions Section */}
      <View style={styles.section}>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>How should AI respond to you?</Text>
          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
              focusedField === 'profile_context' && styles.textInputFocused,
            ]}
            placeholder="Tell the AI how you'd like it to respond to you..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={formData.personalization.profile_context}
            onChangeText={(value) => handleInputChange('profile_context', value)}
            onFocus={() => setFocusedField('profile_context')}
            onBlur={() => setFocusedField(null)}
            multiline
            numberOfLines={8}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {formData.personalization.profile_context.length}/500
          </Text>
        </View>
      </View>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },

  avatarContainer: {
    alignSelf: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5D5D5D',
    borderStyle: 'dashed',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
  },
  required: {
    color: '#ff8888',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#5D5D5D',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    marginTop: 4,
  },

}); 