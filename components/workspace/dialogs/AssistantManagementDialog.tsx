import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { X, Plus, Settings, Unlink, Save } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useAssistantStore } from '@/lib/assistantStore';
import { supabase } from '@/lib/supabase';
import { ProviderAvatar } from '@/components/ui/ProviderAvatar';

interface AssistantCardProps {
  assistant: any;
  isWorkspaceAssistant: boolean;
  isExpanded: boolean;
  onSettingsClick: (assistant: any) => void;
  onAssistantAction: (assistantId: string, action: 'attach' | 'detach') => void;
  isTransitioning?: boolean;
  transitionType?: string | null;
}

function AssistantCard({
  assistant,
  isWorkspaceAssistant,
  isExpanded,
  onSettingsClick,
  onAssistantAction,
  isTransitioning = false,
  transitionType = null,
}: AssistantCardProps) {
  const getActionButtonContent = () => {
    if (isTransitioning) {
      return <ActivityIndicator size="small" color="#ffffff" />;
    }

    return isWorkspaceAssistant ? (
      <Unlink size={16} color="#dc2626" />
    ) : (
      <Plus size={16} color="#ffffff" />
    );
  };

  return (
    <View
      style={[
        styles.assistantCard,
        isTransitioning && styles.assistantCardTransitioning,
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.assistantInfo}>
          <View style={styles.avatarContainer}>
            {assistant?.avatar_url ? (
              <Image 
                source={{ uri: assistant.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <ProviderAvatar
                message={{ assistant_id: assistant?.id }}
                isStreaming={false}
                hasContent={true}
                size={32}
              />
            )}
          </View>
          
          <View style={styles.assistantDetails}>
            <Text style={styles.assistantName}>
              {assistant?.name || 'Unnamed Assistant'}
            </Text>
            <Text style={styles.assistantModel}>
              {assistant?.model || 'gpt-4o-mini'}
              {isTransitioning && (
                <Text style={styles.transitionText}>
                  {transitionType === 'attach' ? ' • Attaching...' : ' • Detaching...'}
                </Text>
              )}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.settingsButton]}
            onPress={() => onSettingsClick(assistant)}
            disabled={isTransitioning}
          >
            <Settings size={16} color="#60a5fa" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isWorkspaceAssistant ? styles.detachButton : styles.attachButton,
              isTransitioning && styles.actionButtonDisabled,
            ]}
            onPress={() =>
              onAssistantAction(
                assistant.id,
                isWorkspaceAssistant ? 'detach' : 'attach',
              )
            }
            disabled={isTransitioning}
          >
            {getActionButtonContent()}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface AssistantManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onAssistantAction: (assistantId: string, action: 'attach' | 'detach') => void;
  onSettingsClick?: (assistant: any) => void;
}

export default function AssistantManagementDialog({
  open,
  onOpenChange,
  workspaceId,
  onAssistantAction,
  onSettingsClick,
}: AssistantManagementDialogProps) {
  const [expandedAssistantId, setExpandedAssistantId] = useState<string | null>(null);
  const [workspaceAssistants, setWorkspaceAssistants] = useState<any[]>([]);
  const [availableAssistants, setAvailableAssistants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transitioningAssistants, setTransitioningAssistants] = useState<Set<string>>(new Set());
  const [transitionTypes, setTransitionTypes] = useState<Map<string, string>>(new Map());

  const {
    assistants,
    initializeAssistants,
    isLoading: assistantsLoading,
  } = useAssistantStore();

  // Fetch assistants when dialog opens
  useEffect(() => {
    const fetchAssistants = async () => {
      if (!open || !workspaceId) return;

      setIsLoading(true);

      try {
        console.log(
          `[AssistantManagementDialog] Fetching assistants for workspace: ${workspaceId}`,
        );

        // Initialize assistants if not already done
        if (!assistants || assistants.length === 0) {
          await initializeAssistants();
        }

        // Fetch workspace data to get workspace_assistants array
        console.log(`[AssistantManagementDialog] Fetching workspace data...`);
        const { data: workspace, error: workspaceError } = await supabase
          .from("workspaces")
          .select("workspace_assistants")
          .eq("id", workspaceId)
          .single();

        if (workspaceError) {
          console.error("❌ Error fetching workspace:", {
            error: workspaceError,
            workspaceId,
            code: workspaceError.code,
            message: workspaceError.message,
            details: workspaceError.details,
          });

          setWorkspaceAssistants([]);
          setAvailableAssistants([]);
          return;
        }

        console.log(`[AssistantManagementDialog] Workspace data fetched:`, {
          workspaceId,
          assistantCount: workspace?.workspace_assistants?.length || 0,
          assistants: workspace?.workspace_assistants,
        });

        const workspaceAssistantIds = workspace?.workspace_assistants || [];

        // Fetch workspace assistants
        if (workspaceAssistantIds.length > 0) {
          console.log(
            `[AssistantManagementDialog] Fetching ${workspaceAssistantIds.length} workspace assistants...`,
          );
          const { data: fetchedWorkspaceAssistants, error } = await supabase
            .from("assistants")
            .select("*")
            .in("id", workspaceAssistantIds);

          if (error) {
            console.error("❌ Error fetching workspace assistants:", error);
            setWorkspaceAssistants([]);
          } else {
            console.log(
              `[AssistantManagementDialog] Fetched ${fetchedWorkspaceAssistants?.length || 0} workspace assistants`,
            );
            const assistantsWithTools = (fetchedWorkspaceAssistants || []).map(
              (assistant) => assistant,
            );
            setWorkspaceAssistants(assistantsWithTools);
          }
        } else {
          console.log(
            `[AssistantManagementDialog] No workspace assistants found`,
          );
          setWorkspaceAssistants([]);
        }

        // Get available assistants (all assistants minus workspace assistants)
        const currentAssistants = useAssistantStore.getState().assistants;
        const filtered = currentAssistants.filter((assistant) => {
          return !workspaceAssistantIds.includes(assistant.id);
        });

        console.log(
          `[AssistantManagementDialog] Found ${filtered.length} available assistants`,
        );
        setAvailableAssistants(filtered);
      } catch (error) {
        console.error("❌ Unexpected error fetching assistants:", error);
        setWorkspaceAssistants([]);
        setAvailableAssistants([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssistants();
  }, [open, workspaceId, assistants, initializeAssistants]);

  const handleSettingsClick = (assistant: any) => {
    if (expandedAssistantId === assistant.id) {
      setExpandedAssistantId(null);
    } else {
      setExpandedAssistantId(assistant.id);
    }
    onSettingsClick?.(assistant);
  };

  const handleAssistantAction = useCallback(
    async (assistantId: string, action: 'attach' | 'detach') => {
      // Find the assistant in either list
      const assistant = [...workspaceAssistants, ...availableAssistants].find(
        (a) => a.id === assistantId,
      );

      if (!assistant) {
        console.error("❌ Assistant not found in dialog state:", {
          assistantId,
          workspaceCount: workspaceAssistants.length,
          availableCount: availableAssistants.length,
        });
        return;
      }

      // Set transitioning state
      setTransitioningAssistants((prev) => new Set([...prev, assistantId]));
      setTransitionTypes((prev) => new Map([...prev, [assistantId, action]]));

      // Optimistically update the UI
      if (action === 'attach') {
        setAvailableAssistants((prev) =>
          prev.filter((a) => a.id !== assistantId),
        );
        setWorkspaceAssistants((prev) => [...prev, assistant]);
      } else if (action === 'detach') {
        setWorkspaceAssistants((prev) =>
          prev.filter((a) => a.id !== assistantId),
        );
        setAvailableAssistants((prev) => [...prev, assistant]);
      }

      try {
        // Call the actual action
        await onAssistantAction(assistantId, action);

        // Success - remove from transitioning after a short delay
        setTimeout(() => {
          setTransitioningAssistants((prev) => {
            const newSet = new Set(prev);
            newSet.delete(assistantId);
            return newSet;
          });
          setTransitionTypes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(assistantId);
            return newMap;
          });
        }, 500);
      } catch (error) {
        // Revert optimistic update on error
        console.error("Assistant action failed:", error);

        if (action === 'attach') {
          setWorkspaceAssistants((prev) =>
            prev.filter((a) => a.id !== assistantId),
          );
          setAvailableAssistants((prev) => [...prev, assistant]);
        } else if (action === 'detach') {
          setAvailableAssistants((prev) =>
            prev.filter((a) => a.id !== assistantId),
          );
          setWorkspaceAssistants((prev) => [...prev, assistant]);
        }

        // Remove from transitioning
        setTransitioningAssistants((prev) => {
          const newSet = new Set(prev);
          newSet.delete(assistantId);
          return newSet;
        });
        setTransitionTypes((prev) => {
          const newMap = new Map(prev);
          newMap.delete(assistantId);
          return newMap;
        });
      }
    },
    [workspaceAssistants, availableAssistants, onAssistantAction],
  );

  if (isLoading || assistantsLoading) {
    return (
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => onOpenChange(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Manage Project Assistants</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => onOpenChange(false)}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.loadingText}>Loading assistants...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Manage Project Assistants</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => onOpenChange(false)}
            >
              <X size={24} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Attach or detach assistants to this workspace. Click the settings icon to configure each assistant.
            </Text>

            {/* Current Project Assistants Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text style={styles.sectionTitle}>
                  Current Project Assistants
                </Text>
              </View>

              {workspaceAssistants.length > 0 ? (
                <View style={styles.assistantsList}>
                  {workspaceAssistants.map((assistant) => (
                    <AssistantCard
                      key={assistant.id}
                      assistant={assistant}
                      isWorkspaceAssistant={true}
                      isExpanded={expandedAssistantId === assistant.id}
                      onSettingsClick={handleSettingsClick}
                      onAssistantAction={handleAssistantAction}
                      isTransitioning={transitioningAssistants.has(assistant.id)}
                      transitionType={transitionTypes.get(assistant.id)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    No assistants attached to this project
                  </Text>
                </View>
              )}
            </View>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>Available Assistants</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Available Assistants Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIndicator, styles.availableIndicator]} />
                <Text style={styles.sectionTitle}>
                  Available Assistants
                </Text>
              </View>

              {availableAssistants.length > 0 ? (
                <View style={styles.assistantsList}>
                  {availableAssistants.map((assistant) => (
                    <AssistantCard
                      key={assistant.id}
                      assistant={assistant}
                      isWorkspaceAssistant={false}
                      isExpanded={expandedAssistantId === assistant.id}
                      onSettingsClick={handleSettingsClick}
                      onAssistantAction={handleAssistantAction}
                      isTransitioning={transitioningAssistants.has(assistant.id)}
                      transitionType={transitionTypes.get(assistant.id)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    No additional assistants available
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#161618',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 600,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: Colors.textLight,
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    maxHeight: 500,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    margin: 20,
    marginBottom: 24,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
  },
  availableIndicator: {
    backgroundColor: '#06b6d4',
  },
  sectionTitle: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },

  assistantsList: {
    gap: 12,
  },
  assistantCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  assistantCardTransitioning: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  assistantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 2,
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
  assistantModel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  transitionText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  settingsButton: {
    backgroundColor: 'transparent',
    borderColor: '#60a5fa',
  },
  attachButton: {
    backgroundColor: 'transparent',
    borderColor: '#ffffff',
  },
  detachButton: {
    backgroundColor: 'transparent',
    borderColor: '#dc2626',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  separatorText: {
    color: Colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: 16,
    backgroundColor: '#161618',
  },
}); 