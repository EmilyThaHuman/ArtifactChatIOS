import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Users, 
  Settings, 
  Palette,
  Camera,
  Edit3,
  Save,
  X,
} from 'lucide-react-native';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import ArtifactLogo from '@/components/ui/ArtifactLogo';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface WorkspaceHeaderProps {
  workspace: any;
  vectorStoreId?: string | null;
  workspaceAssistants?: any[];
  assistantsLoading?: boolean;
  onOpenAssistantsDialog?: () => void;
  onOpenInviteDialog?: () => void;
  onUpdateWorkspace?: (data: any) => void;
}

export default function WorkspaceHeader({
  workspace,
  vectorStoreId,
  workspaceAssistants = [],
  assistantsLoading = false,
  onOpenAssistantsDialog,
  onOpenInviteDialog,
  onUpdateWorkspace,
}: WorkspaceHeaderProps) {
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [instructions, setInstructions] = useState(workspace?.instructions || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Color options for workspace
  const colorOptions = [
    '#9333ea', // purple
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];

  const getCurrentWorkspaceColor = () => {
    return workspace?.color || workspace?.metadata?.color || Colors.purple500;
  };

  const handleColorSelect = async (color: string) => {
    try {
      const updatedData = {
        color: color,
        metadata: {
          ...workspace.metadata,
          color: color,
        },
      };

      // Update in database
      const { error } = await supabase
        .from('workspaces')
        .update(updatedData)
        .eq('id', workspace.id);

      if (error) throw error;

      // Update local state
      onUpdateWorkspace?.(updatedData);
      setShowColorPicker(false);
    } catch (error) {
      console.error('Error updating workspace color:', error);
      Alert.alert('Error', 'Failed to update workspace color');
    }
  };

  const handleSaveInstructions = async () => {
    try {
      setIsSaving(true);

      const updatedData = {
        instructions: instructions.trim(),
      };

      const { error } = await supabase
        .from('workspaces')
        .update(updatedData)
        .eq('id', workspace.id);

      if (error) throw error;

      onUpdateWorkspace?.(updatedData);
      setIsEditingInstructions(false);
    } catch (error) {
      console.error('Error saving instructions:', error);
      Alert.alert('Error', 'Failed to save instructions');
    } finally {
      setIsSaving(false);
    }
  };

  const renderColorPicker = () => (
    <Modal
      visible={showColorPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowColorPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.colorPickerModal}>
          <View style={styles.colorPickerHeader}>
            <Text style={styles.colorPickerTitle}>Choose Color</Text>
            <TouchableOpacity 
              onPress={() => setShowColorPicker(false)}
              style={styles.closeButton}
            >
              <X size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.colorGrid}>
            {colorOptions.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  getCurrentWorkspaceColor() === color && styles.selectedColor,
                ]}
                onPress={() => handleColorSelect(color)}
                activeOpacity={0.7}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(147, 51, 234, 0.1)', 'rgba(139, 92, 246, 0.05)', 'transparent']}
        style={styles.backgroundGradient}
      />

      <View style={styles.content}>
        {/* Main header row */}
        <View style={styles.headerRow}>
          {/* Workspace icon and title */}
          <View style={styles.workspaceInfo}>
            <View style={[styles.workspaceIcon, { backgroundColor: getCurrentWorkspaceColor() }]}>
              {workspace?.logo_url ? (
                <Image source={{ uri: workspace.logo_url }} style={styles.logoImage} />
              ) : (
                <ArtifactLogo size="small" />
              )}
            </View>
            
            <View style={styles.workspaceTextContainer}>
              <Text style={styles.workspaceName} numberOfLines={1}>
                {workspace?.name || 'Untitled Workspace'}
              </Text>
              <Text style={styles.workspaceType}>
                {workspace?.is_team ? 'Team Workspace' : 'Personal Workspace'}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowColorPicker(true)}
              activeOpacity={0.7}
            >
              <Palette size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            {workspace?.is_team && onOpenInviteDialog && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onOpenInviteDialog}
                activeOpacity={0.7}
              >
                <Users size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {/* Handle settings */}}
              activeOpacity={0.7}
            >
              <Settings size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Instructions section */}
        {(workspace?.instructions || isEditingInstructions) && (
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionsHeader}>
              <Text style={styles.instructionsLabel}>Instructions</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  if (isEditingInstructions) {
                    handleSaveInstructions();
                  } else {
                    setIsEditingInstructions(true);
                  }
                }}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <LoadingSpinner size={16} color={Colors.purple500} />
                ) : isEditingInstructions ? (
                  <Save size={16} color={Colors.purple500} />
                ) : (
                  <Edit3 size={16} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {isEditingInstructions ? (
              <TextInput
                style={styles.instructionsInput}
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Add instructions for this workspace..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.instructionsText}>
                {workspace?.instructions}
              </Text>
            )}
          </View>
        )}

        {/* Assistants preview */}
        {workspaceAssistants.length > 0 && (
          <View style={styles.assistantsPreview}>
            <TouchableOpacity
              style={styles.assistantsButton}
              onPress={onOpenAssistantsDialog}
              activeOpacity={0.7}
            >
              <View style={styles.assistantCircles}>
                {workspaceAssistants.slice(0, 3).map((assistant, index) => (
                  <View
                    key={assistant.id}
                    style={[
                      styles.assistantCircle,
                      { marginLeft: index > 0 ? -8 : 0 },
                      { backgroundColor: Colors.purple500 },
                    ]}
                  >
                    <Text style={styles.assistantInitial}>
                      {assistant.name?.charAt(0) || 'A'}
                    </Text>
                  </View>
                ))}
                {workspaceAssistants.length > 3 && (
                  <View style={[styles.assistantCircle, { marginLeft: -8, backgroundColor: Colors.textSecondary }]}>
                    <Text style={styles.assistantCount}>+{workspaceAssistants.length - 3}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.assistantsText}>
                {workspaceAssistants.length} assistant{workspaceAssistants.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {renderColorPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  content: {
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  workspaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workspaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  workspaceTextContainer: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textLight,
    marginBottom: 2,
  },
  workspaceType: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  editButton: {
    padding: 4,
  },
  instructionsInput: {
    fontSize: 14,
    color: Colors.textLight,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  assistantsPreview: {
    marginTop: 8,
  },
  assistantsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  assistantCircles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  assistantCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  assistantInitial: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  assistantCount: {
    fontSize: 8,
    fontWeight: '600',
    color: 'white',
  },
  assistantsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    margin: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  colorPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  closeButton: {
    padding: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: 'white',
  },
}); 