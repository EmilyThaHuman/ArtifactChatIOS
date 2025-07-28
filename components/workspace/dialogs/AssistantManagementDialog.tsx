import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Users, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthHandler';

interface AssistantManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onAssistantAction?: (assistantId: string, action: 'attach' | 'detach') => void;
}

interface Assistant {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  metadata?: any;
}

export default function AssistantManagementDialog({
  open,
  onOpenChange,
  workspaceId,
  onAssistantAction,
}: AssistantManagementDialogProps) {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [workspaceAssistants, setWorkspaceAssistants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      loadAssistants();
    }
  }, [open, workspaceId]);

  const loadAssistants = async () => {
    try {
      setIsLoading(true);

      // Load user's assistants
      const { data: userAssistants, error: assistantsError } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', user?.id);

      if (assistantsError) throw assistantsError;

      // Load workspace assistant IDs
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('workspace_assistants')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;

      setAssistants(userAssistants || []);
      setWorkspaceAssistants(workspace?.workspace_assistants || []);
    } catch (error) {
      console.error('Error loading assistants:', error);
      Alert.alert('Error', 'Failed to load assistants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssistantAction = async (assistantId: string, action: 'attach' | 'detach') => {
    try {
      setIsProcessing(assistantId);

      if (onAssistantAction) {
        await onAssistantAction(assistantId, action);
      }

      // Update local state
      if (action === 'attach') {
        setWorkspaceAssistants(prev => [...prev, assistantId]);
      } else {
        setWorkspaceAssistants(prev => prev.filter(id => id !== assistantId));
      }
    } catch (error) {
      console.error(`Error ${action}ing assistant:`, error);
      Alert.alert('Error', `Failed to ${action} assistant`);
    } finally {
      setIsProcessing(null);
    }
  };

  const renderAssistant = (assistant: Assistant) => {
    const isAttached = workspaceAssistants.includes(assistant.id);
    const isCurrentlyProcessing = isProcessing === assistant.id;

    return (
      <View key={assistant.id} style={styles.assistantCard}>
        <View style={styles.assistantInfo}>
          <View style={styles.assistantAvatar}>
            <Users size={20} color={Colors.textLight} />
          </View>
          <View style={styles.assistantDetails}>
            <Text style={styles.assistantName}>{assistant.name}</Text>
            {assistant.description && (
              <Text style={styles.assistantDescription} numberOfLines={2}>
                {assistant.description}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.actionButton,
            isAttached ? styles.attachedButton : styles.detachedButton
          ]}
          onPress={() => handleAssistantAction(assistant.id, isAttached ? 'detach' : 'attach')}
          disabled={isCurrentlyProcessing}
          activeOpacity={0.7}
        >
          {isCurrentlyProcessing ? (
            <ActivityIndicator size="small" color={Colors.textLight} />
          ) : (
            <Text style={[
              styles.actionButtonText,
              isAttached ? styles.attachedButtonText : styles.detachedButtonText
            ]}>
              {isAttached ? 'Remove' : 'Add'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onOpenChange(false)}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Assistants</Text>
          <TouchableOpacity
            onPress={() => onOpenChange(false)}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <X size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.purple500} />
              <Text style={styles.loadingText}>Loading assistants...</Text>
            </View>
          ) : assistants.length > 0 ? (
            <View style={styles.assistantsList}>
              {assistants.map(renderAssistant)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Users size={48} color={Colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No assistants found</Text>
              <Text style={styles.emptyDescription}>
                Create assistants in the main app to add them to this project
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: Colors.textLight,
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  assistantsList: {
    paddingVertical: 16,
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  assistantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.purple500,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assistantDetails: {
    flex: 1,
  },
  assistantName: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  assistantDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  attachedButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  detachedButton: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  attachedButtonText: {
    color: '#ef4444',
  },
  detachedButtonText: {
    color: Colors.purple500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: Colors.textLight,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 