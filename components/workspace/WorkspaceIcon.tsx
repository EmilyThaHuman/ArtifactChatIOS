import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Camera, Folder, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

interface WorkspaceIconProps {
  workspace: {
    id: string;
    name: string;
    is_team?: boolean;
    metadata?: {
      color?: string;
      avatar_url?: string;
    };
    image_path?: string;
    avatar_url?: string;
  };
  onWorkspaceUpdate?: (updatedData: any) => void;
  size?: number;
}

// Color palette matching the web app - 4x4 grid
const workspaceColors = [
  // Row 1
  { name: "White", value: "#f8f9fa" },
  { name: "Red", value: "#dc4446" },
  { name: "Orange", value: "#fd7e14" },
  { name: "Yellow", value: "#ffc107" },
  // Row 2
  { name: "Amber", value: "#fd7e14" },
  { name: "Light Green", value: "#6f9c3d" },
  { name: "Green", value: "#51a351" },
  { name: "Teal", value: "#17a2b8" },
  // Row 3
  { name: "Light Blue", value: "#5bc0de" },
  { name: "Blue", value: "#007bff" },
  { name: "Primary Blue", value: "#0d6efd" },
  { name: "Dark Blue", value: "#0056b3" },
  // Row 4
  { name: "Purple", value: "#6f42c1" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Pink", value: "#e83e8c" },
  { name: "Rose", value: "#fd7e9b" },
];

export default function WorkspaceIcon({ workspace, onWorkspaceUpdate, size = 80 }: WorkspaceIconProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const previousWorkspaceIdRef = useRef<string | null>(null);

  // Helper function to adjust white color to black in light mode (always dark in mobile)
  const getAdjustedColor = (color: string) => {
    return color;
  };

  // Get current workspace color
  const getCurrentWorkspaceColor = () => {
    const savedColor = workspace?.metadata?.color || "#f8f9fa";
    return getAdjustedColor(savedColor);
  };

  // Handle workspace image loading
  useEffect(() => {
    const currentWorkspaceId = workspace?.id;
    const previousWorkspaceId = previousWorkspaceIdRef.current;

    // Only reset image states if we're switching to a different workspace
    if (currentWorkspaceId !== previousWorkspaceId) {
      setImageLoaded(false);
      setImageError(false);
      setImageUrl(null);
      previousWorkspaceIdRef.current = currentWorkspaceId;
    }

    if (workspace?.is_team && (workspace.avatar_url || workspace.image_path)) {
      try {
        // Use avatar_url if available, otherwise construct from image_path
        const url = workspace.avatar_url || workspace.image_path;
        if (url) {
          setImageUrl(url);
          setImageError(false);
        }
      } catch (error) {
        setImageError(true);
      }
    } else if (currentWorkspaceId !== previousWorkspaceId) {
      // Only reset image states if this is a different workspace
      setImageUrl(null);
      setImageError(true);
    }
  }, [
    workspace?.id,
    workspace?.is_team,
    workspace?.avatar_url,
    workspace?.image_path,
  ]);

  // Handle color selection
  const handleColorSelect = async (color: { name: string; value: string }) => {
    if (!onWorkspaceUpdate) return;

    try {
      const updatedMetadata = {
        ...workspace?.metadata,
        color: color.value,
        colorName: color.name,
      };

      await onWorkspaceUpdate({
        metadata: updatedMetadata,
      });

      setIsColorPickerOpen(false);
    } catch (error) {
      console.error("Error updating workspace color:", error);
      Alert.alert('Error', 'Failed to update workspace color');
    }
  };

  // Handle image upload for team workspaces
  const handleImageUpload = async () => {
    if (!workspace?.is_team || !onWorkspaceUpdate) return;

    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access photos is required to upload an image.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const asset = result.assets[0];

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Get file extension
        const fileExtension = asset.uri.split('.').pop() || 'jpg';
        
        // Create file path
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const fileName = `workspace_${workspace.id}_${Date.now()}.${fileExtension}`;
        const filePath = `${userId}/workspaces/${workspace.id}/${fileName}`;

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), {
            contentType: `image/${fileExtension}`,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update workspace with new image path
        await onWorkspaceUpdate({
          image_path: filePath,
          avatar_url: urlData.publicUrl,
        });

      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle personal workspace icon click
  const handlePersonalWorkspaceClick = () => {
    if (!workspace?.is_team) {
      setIsColorPickerOpen(true);
    }
  };

  // Convert base64 to binary
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const iconSize = size * 0.6; // Icon is 60% of container size

  return (
    <>
      <View style={[styles.container, { width: size, height: size }]}>
        <TouchableOpacity
          style={[styles.touchable, { width: size, height: size }]}
          onPress={workspace?.is_team ? handleImageUpload : handlePersonalWorkspaceClick}
          disabled={isUploadingImage}
          activeOpacity={0.7}
        >
          {imageUrl && !imageError && workspace?.is_team ? (
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.image,
                {
                  width: size,
                  height: size,
                  borderRadius: workspace?.is_team ? size / 2 : 8,
                  opacity: imageLoaded ? 1 : 0,
                }
              ]}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : workspace?.is_team ? (
            <View
              style={[
                styles.teamFallback,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  opacity: isUploadingImage ? 0.5 : 1,
                }
              ]}
            >
              <Users size={iconSize} color="white" />
            </View>
          ) : (
            <View
              style={[
                styles.personalContainer,
                { width: size, height: size }
              ]}
            >
              <Folder
                size={iconSize}
                color={getCurrentWorkspaceColor()}
              />
            </View>
          )}

          {/* Upload overlay for team workspaces */}
          {workspace?.is_team && !isUploadingImage && (
            <View style={[styles.uploadOverlay, { width: size, height: size, borderRadius: size / 2 }]}>
              <Camera size={size * 0.25} color="white" />
            </View>
          )}

          {/* Loading overlay for team workspaces */}
          {workspace?.is_team && isUploadingImage && (
            <View style={[styles.loadingOverlay, { width: size, height: size, borderRadius: size / 2 }]}>
              <ActivityIndicator size="small" color="white" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Color Picker Modal for Personal Workspaces */}
      <Modal
        visible={isColorPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsColorPickerOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsColorPickerOpen(false)}
        >
          <View style={styles.colorPickerContainer}>
            <Text style={styles.colorPickerTitle}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {workspaceColors.map((color) => (
                <TouchableOpacity
                  key={color.name}
                  onPress={() => handleColorSelect(color)}
                  style={[
                    styles.colorOption,
                    { backgroundColor: getAdjustedColor(color.value) }
                  ]}
                  activeOpacity={0.8}
                />
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  touchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    // Dynamic styles applied inline
  },
  teamFallback: {
    backgroundColor: '#6f42c1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    backgroundColor: '#353535',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: '#525252',
  },
  colorPickerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: 240, // 4 colors * 48px + 3 gaps * 12px
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  },
});