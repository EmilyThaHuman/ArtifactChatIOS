import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Users, 
  User, 
  Check, 
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthHandler';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ArtifactLogo from '@/components/ui/ArtifactLogo';

interface WorkspaceCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkspaceCreated?: (workspace: any) => void;
}

interface WorkspaceFormData {
  name: string;
  description: string;
  instructions: string;
  is_team: boolean;
  color: string;
}

export default function WorkspaceCreateDialog({
  isOpen,
  onOpenChange,
  onWorkspaceCreated,
}: WorkspaceCreateDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<WorkspaceFormData>({
    name: '',
    description: '',
    instructions: '',
    is_team: false,
    color: '#9333ea', // Default purple
  });

  const { user } = useAuth();

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

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        Alert.alert('Required Field', 'Please enter a workspace name');
        return;
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    try {
      setIsLoading(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Create workspace
      const workspaceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        instructions: formData.instructions.trim() || null,
        is_team: formData.is_team,
        user_id: user.id,
        owner_id: user.id,
        color: formData.color,
        metadata: {
          color: formData.color,
          created_from: 'mobile',
          created_at: new Date().toISOString(),
        },
        workspace_files: [],
        workspace_threads: [],
        workspace_assistants: [],
      };

      const { data: workspace, error } = await supabase
        .from('workspaces')
        .insert(workspaceData)
        .select()
        .single();

      if (error) throw error;

      // If team workspace, add creator as member
      if (formData.is_team) {
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspace.id,
            user_id: user.id,
            role: 'owner',
            invited_by: user.id,
            joined_at: new Date().toISOString(),
            permissions: {
              files: { upload: true, delete: true },
              threads: { create: true, delete: true },
              assistants: { attach: true, detach: true },
              members: { invite: true, remove: true },
              settings: { edit: true },
            },
          });

        if (memberError) {
          console.error('Error adding workspace member:', memberError);
        }
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        instructions: '',
        is_team: false,
        color: '#9333ea',
      });
      setCurrentStep(1);

      // Close dialog
      onOpenChange(false);

      // Notify parent
      onWorkspaceCreated?.(workspace);

      Alert.alert('Success', 'Workspace created successfully!');

    } catch (error) {
      console.error('Error creating workspace:', error);
      Alert.alert('Error', error.message || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    
    // Reset form when closing
    setFormData({
      name: '',
      description: '',
      instructions: '',
      is_team: false,
      color: '#9333ea',
    });
    setCurrentStep(1);
    onOpenChange(false);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            {currentStep > step ? (
              <Check size={12} color="white" />
            ) : (
              <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
                {step}
              </Text>
            )}
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>
        Set up the basic details for your workspace
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Workspace Name *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter workspace name"
          placeholderTextColor={Colors.textSecondary}
          maxLength={50}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Brief description of this workspace..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={200}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.switchContainer}>
          <View style={styles.switchLeft}>
            <Text style={styles.switchLabel}>Team Workspace</Text>
            <Text style={styles.switchDescription}>
              Allow multiple members to collaborate
            </Text>
          </View>
          <Switch
            value={formData.is_team}
            onValueChange={(value) => setFormData({ ...formData, is_team: value })}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.purple500 }}
            thumbColor={formData.is_team ? 'white' : 'rgba(255,255,255,0.5)'}
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Appearance</Text>
      <Text style={styles.stepSubtitle}>
        Choose a color theme for your workspace
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Color Theme</Text>
        <View style={styles.colorGrid}>
          {colorOptions.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData.color === color && styles.selectedColor,
              ]}
              onPress={() => setFormData({ ...formData, color })}
              activeOpacity={0.7}
            />
          ))}
        </View>
      </View>

      <View style={styles.previewContainer}>
        <Text style={styles.inputLabel}>Preview</Text>
        <View style={styles.workspacePreview}>
          <View style={[styles.previewIcon, { backgroundColor: formData.color }]}>
            <ArtifactLogo size="small" />
          </View>
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{formData.name || 'Workspace Name'}</Text>
            <Text style={styles.previewType}>
              {formData.is_team ? 'Team Workspace' : 'Personal Workspace'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Instructions</Text>
      <Text style={styles.stepSubtitle}>
        Add optional instructions to guide AI behavior in this workspace
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>AI Instructions (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea, { minHeight: 120 }]}
          value={formData.instructions}
          onChangeText={(text) => setFormData({ ...formData, instructions: text })}
          placeholder="Enter instructions for AI behavior in this workspace..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.characterCount}>
          {formData.instructions.length}/1000 characters
        </Text>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{formData.name}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Type:</Text>
          <Text style={styles.summaryValue}>
            {formData.is_team ? 'Team Workspace' : 'Personal Workspace'}
          </Text>
        </View>
        {formData.description && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Description:</Text>
            <Text style={styles.summaryValue}>{formData.description}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClose}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <X size={24} color={Colors.textLight} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Create Workspace</Text>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.footerButton, styles.secondaryButton]}
              onPress={handlePrevious}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <ArrowLeft size={16} color={Colors.purple500} />
              <Text style={[styles.footerButtonText, styles.secondaryButtonText]}>
                Previous
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.primaryButton,
              currentStep === 1 && { flex: 1 },
            ]}
            onPress={handleNext}
            disabled={isLoading || (currentStep === 1 && !formData.name.trim())}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <LoadingSpinner size={16} color="white" />
            ) : currentStep === 3 ? (
              <Check size={16} color="white" />
            ) : (
              <ArrowRight size={16} color="white" />
            )}
            <Text style={styles.footerButtonText}>
              {isLoading ? 'Creating...' : currentStep === 3 ? 'Create' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161618',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  headerSpacer: {
    width: 44,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepCircleActive: {
    backgroundColor: Colors.purple500,
    borderColor: Colors.purple500,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.purple500,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: Colors.textLight,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLeft: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  previewContainer: {
    marginTop: 16,
  },
  workspacePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 2,
  },
  previewType: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    width: 80,
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.purple500,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.purple500,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButtonText: {
    color: Colors.purple500,
  },
}); 