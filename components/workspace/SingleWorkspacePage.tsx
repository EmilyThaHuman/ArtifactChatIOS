import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { 
  Files, 
  Users, 
  Plus,
  ArrowLeft,
  Menu,
  ChevronDown,
  MoreHorizontal,
  Folder,
  FileText,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  FileImage,
  FileSpreadsheet,
} from 'lucide-react-native';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthHandler';
import { Workspace } from '@/lib/workspace';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceChats from './WorkspaceChats';
import WorkspaceFiles from './WorkspaceFiles';
import WorkspaceCreateDialog from './WorkspaceCreateDialog';
import AssistantManagementDialog from './dialogs/AssistantManagementDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Sidebar from '@/components/ui/Sidebar';
import { ThreadManager } from '@/lib/threads';
import WorkspaceInput from '@/components/ui/WorkspaceInput';

// File type icons component to match web app
const FileTypeIcons = ({ files = [] }: { files: any[] }) => {
  if (files.length === 0) return null;

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') return FileText;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java'].includes(extension || '')) return FileCode;
    if (['zip', 'rar', 'tar', 'gz'].includes(extension || '')) return FileArchive;
    if (['mp3', 'wav', 'm4a', 'aac'].includes(extension || '')) return FileAudio;
    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension || '')) return FileVideo;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return FileImage;
    if (['csv', 'xlsx', 'xls'].includes(extension || '')) return FileSpreadsheet;
    
    return FileText;
  };

  const getFileBackgroundColor = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') return '#ef4444';
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java'].includes(extension || '')) return '#3b82f6';
    if (['zip', 'rar', 'tar', 'gz'].includes(extension || '')) return '#8b5cf6';
    if (['mp3', 'wav', 'm4a', 'aac'].includes(extension || '')) return '#f59e0b';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension || '')) return '#8b5cf6';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return '#10b981';
    if (['csv', 'xlsx', 'xls'].includes(extension || '')) return '#10b981';
    
    return '#3b82f6';
  };

  const fileTypes = new Map();
  files.forEach((file) => {
    const fileName = file.file_name || file.name || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
    fileTypes.set(extension, (fileTypes.get(extension) || 0) + 1);
  });

  const topTypes = Array.from(fileTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  return (
    <View style={styles.fileTypeIcons}>
      {topTypes.map((type, index) => {
        const Icon = getFileIcon(`file.${type}`);
        const bgColor = getFileBackgroundColor(`file.${type}`);
        return (
          <View
            key={type}
            style={[
              styles.fileTypeIcon,
              { backgroundColor: bgColor },
              index > 0 && { marginLeft: -8 }
            ]}
          >
            <Icon size={12} color="white" />
          </View>
        );
      })}
    </View>
  );
};

// Assistant circles component to match web app
const AssistantCircles = ({ assistants = [] }: { assistants: any[] }) => {
  if (assistants.length === 0) return null;

  return (
    <View style={styles.assistantCircles}>
      {assistants.slice(0, 3).map((assistant, index) => (
        <View
          key={assistant.id}
          style={[
            styles.assistantCircle,
            { backgroundColor: Colors.purple500 },
            index > 0 && { marginLeft: -8 }
          ]}
        >
          <Users size={12} color="white" />
        </View>
      ))}
    </View>
  );
};

interface SingleWorkspacePageProps {
  workspaceId: string;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  is_team?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  workspace_files?: string[];
  workspace_threads?: string[];
  workspace_assistants?: string[];
  vector_store_id?: string;
  metadata?: any;
  color?: string;
  logo_url?: string;
}

interface ThreadDetails {
  [key: string]: {
    id: string;
    title: string;
    lastMessageAt: string;
    metadata?: any;
    assistant?: string;
  };
}

export default function SingleWorkspacePage({ workspaceId }: SingleWorkspacePageProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threadDetails, setThreadDetails] = useState<ThreadDetails>({});
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [workspaceAssistants, setWorkspaceAssistants] = useState<any[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [vectorStoreId, setVectorStoreId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssistantDialogOpen, setIsAssistantDialogOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const router = useRouter();
  const { user, profile } = useAuth();

  // Load workspace data
  useEffect(() => {
    if (workspaceId && user) {
      loadWorkspaceData();
    }
  }, [workspaceId, user]);

  const loadWorkspaceData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load workspace basic data
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;
      
      if (!workspaceData) {
        throw new Error('Workspace not found');
      }

      setWorkspace(workspaceData);
      setVectorStoreId(workspaceData.vector_store_id);

      // Load assistants if any
      if (workspaceData.workspace_assistants?.length > 0) {
        setAssistantsLoading(true);
        try {
          const { data: fetchedAssistants, error } = await supabase
            .from('assistants')
            .select('*')
            .in('id', workspaceData.workspace_assistants);

          if (!error && fetchedAssistants?.length > 0) {
            setWorkspaceAssistants(fetchedAssistants);
          }
        } catch (err) {
          console.error('Error loading assistants:', err);
        } finally {
          setAssistantsLoading(false);
        }
      }

      // Load files if any
      if (workspaceData.workspace_files?.length > 0) {
        try {
          const { data: fileData, error } = await supabase
            .from('workspace_files')
            .select('*')
            .in('id', workspaceData.workspace_files)
            .order('created_at', { ascending: false });

          if (!error) {
            setFiles(fileData || []);
          }
        } catch (err) {
          console.error('Error loading files:', err);
        }
      }

      // Load thread details if any
      if (workspaceData.workspace_threads?.length > 0) {
        await fetchThreadDetails(workspaceData.workspace_threads);
      }

    } catch (err) {
      console.error('Error loading workspace:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThreadDetails = async (threadIds: string[]) => {
    setLoadingThreads(true);
    try {
      const threadDetailsMap: ThreadDetails = {};

      await Promise.all(
        threadIds.map(async (threadId) => {
          try {
            const { data, error } = await supabase
              .from('threads')
              .select('title, last_message_at, updated_at, id, assistant_id')
              .eq('id', threadId)
              .maybeSingle();

            if (!error && data) {
              // Filter out threads with default titles
              const isDefaultTitle = !data.title || 
                data.title === 'New Chat' || 
                data.title === 'Untitled Chat' ||
                (data.title.startsWith('Chat ') && data.title.match(/^Chat [a-f0-9]{6}\.\.\.$/i));

              if (!isDefaultTitle) {
                threadDetailsMap[threadId] = {
                  id: threadId,
                  title: data.title,
                  lastMessageAt: data.last_message_at || data.updated_at,
                  assistant: data.assistant_id,
                };
              }
            }
          } catch (err) {
            console.error(`Error processing thread ${threadId}:`, err);
          }
        })
      );

      setThreadDetails(threadDetailsMap);
    } catch (err) {
      console.error('Error fetching thread details:', err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const handleCreateChat = async () => {
    if (!workspace || !user) return;
    
    try {
      setCreatingChat(true);
      
      // For now, navigate to main chat with workspace context
      // In a full implementation, you'd create a new thread here
      router.push('/(tabs)');
      
    } catch (err) {
      console.error('Error creating chat:', err);
      Alert.alert('Error', 'Failed to create chat');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleWorkspaceChat = async (messageData: any) => {
    if (!workspace || !user) return;
    
    console.log('🚀 Workspace: Starting chat with message data:', messageData);
    
    try {
      setCreatingChat(true);
      
      // Create new thread in this workspace
      console.log('🚀 Workspace: Creating thread for workspace:', workspace.id);
      const newThread = await ThreadManager.createNewThread({
        title: messageData.message ? messageData.message.slice(0, 50) + '...' : 'New Chat',
        workspaceId: workspace.id,
        metadata: {
          source: 'workspace',
          workspace_name: workspace.name
        }
      });

      if (!newThread) throw new Error('Failed to create thread');

      console.log('🧵 Workspace: Created thread successfully:', {
        threadId: newThread.id,
        title: newThread.title,
        workspaceId: newThread.workspace_id
      });
      
      console.log('🧵 Workspace: Navigating to chat with params:', {
        threadId: newThread.id,
        message: messageData.message
      });
      
      // Navigate to main chat with the new thread and send the message
      router.push({
        pathname: '/(tabs)',
        params: { 
          threadId: newThread.id,
          message: messageData.message 
        }
      });
      
    } catch (err) {
      console.error('🚨 Workspace: Error starting workspace chat:', err);
      Alert.alert('Error', 'Failed to start chat');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleSidebarToggle = () => {
    setShowSidebar(!showSidebar);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
  };

  const handleNewChat = async () => {
    try {
      setShowSidebar(false);
      // Navigate to main chat and create new thread
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleNavigateToLibrary = () => {
    setShowSidebar(false);
    router.push('/(tabs)/library');
  };

  const handleNavigateToCanvases = () => {
    setShowSidebar(false);
    router.push('/(tabs)/canvases');
  };

  const handleLogout = async () => {
    try {
      setShowSidebar(false);
      // Add logout logic here if needed
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleFilesChange = (updatedFiles: any[]) => {
    setFiles(updatedFiles);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={32} />
        <Text style={styles.loadingText}>Loading workspace...</Text>
      </View>
    );
  }

  if (error || !workspace) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || 'Workspace not found'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.topBarContent}>
          {/* Sidebar Menu Button */}
          <TouchableOpacity 
            style={styles.sidebarButton} 
            onPress={handleSidebarToggle}
            activeOpacity={0.7}
          >
            <Menu size={24} color={Colors.textLight} />
          </TouchableOpacity>
          
          {/* Model Selector */}
          <TouchableOpacity style={styles.modelSelector} activeOpacity={0.7}>
            <Text style={styles.modelText}>ChatGPT 4o</Text>
            <ChevronDown size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          {/* Options Button */}
          <TouchableOpacity style={styles.optionsButton} activeOpacity={0.7}>
            <MoreHorizontal size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Large Folder Icon */}
        <View style={styles.iconSection}>
          <View style={styles.folderIconContainer}>
            <Folder size={48} color={Colors.textSecondary} />
          </View>
        </View>

        {/* Workspace Title */}
        <View style={styles.titleSection}>
          <Text style={styles.workspaceTitle}>{workspace.name}</Text>
        </View>

        {/* Two-Column Feature Section */}
        <View style={styles.featuresSection}>
          {/* Connected buttons - no outer container */}
          <View style={styles.buttonGrid}>
            {/* Project Files */}
            <TouchableOpacity
              style={[styles.connectedButton, styles.leftButton]}
              onPress={() => setIsFilesDialogOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>Add files</Text>
                  <Text style={styles.buttonSubtitle}>{files.length} files</Text>
                </View>
                <View style={styles.buttonIcons}>
                  <FileTypeIcons files={files} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Assistants */}
            <TouchableOpacity
              style={[styles.connectedButton, styles.rightButton]}
              onPress={() => setIsAssistantDialogOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>Assistants</Text>
                  <Text style={styles.buttonSubtitle}>
                    {workspaceAssistants.length} assistant{workspaceAssistants.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.buttonIcons}>
                  <AssistantCircles assistants={workspaceAssistants} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chats in this project */}
        <View style={styles.chatsSection}>
          <Text style={styles.chatsTitle}>Chats in this project</Text>
          <WorkspaceChats
            workspace={workspace}
            threadDetails={threadDetails}
            loadingThreads={loadingThreads}
            onCreateChat={handleCreateChat}
            creatingChat={creatingChat}
            onRefreshThreads={loadWorkspaceData}
          />
        </View>
      </ScrollView>

      {/* Dialogs */}
      <WorkspaceFiles
        workspaceId={workspaceId}
        vectorStoreId={vectorStoreId}
        open={isFilesDialogOpen}
        onOpenChange={setIsFilesDialogOpen}
        files={files}
        onFilesChange={handleFilesChange}
      />

      <AssistantManagementDialog
        open={isAssistantDialogOpen}
        onOpenChange={setIsAssistantDialogOpen}
        workspaceId={workspaceId}
        onAssistantAction={async (assistantId, action) => {
          // Handle assistant attachment/detachment
          console.log(`${action} assistant ${assistantId} to workspace ${workspaceId}`);
        }}
      />

      {workspace?.is_team && (
        <WorkspaceCreateDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onWorkspaceCreated={(newWorkspace) => {
            console.log('New workspace created:', newWorkspace);
            setIsCreateDialogOpen(false);
          }}
        />
      )}

      {/* Bottom Chat Input - Fixed at bottom */}
      <View style={styles.chatInputSection}>
        <WorkspaceInput
          onSendMessage={handleWorkspaceChat}
          placeholder={`Message ${workspace.name}...`}
          disabled={creatingChat}
          workspaceId={workspaceId}
        />
      </View>

      {/* Sidebar */}
      <Sidebar
        isVisible={showSidebar}
        onClose={handleCloseSidebar}
        onNewChat={handleNewChat}
        onNavigateToLibrary={handleNavigateToLibrary}
        onNavigateToCanvases={handleNavigateToCanvases}
        user={user}
        profile={profile}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    gap: 16,
  },
  loadingText: {
    color: Colors.textLight,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 32,
  },
  errorText: {
    color: Colors.textLight,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: Colors.purple500,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  backButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingBottom: 100, // Add padding to prevent overlap with chat input
  },
  chatInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  featureButtonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  featureButtons: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureButton: {
    flex: 1,
    padding: 16,
    minHeight: 72,
  },
  featureButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureButtonRight: {
    // No additional styles needed
  },
  featureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureButtonText: {
    flex: 1,
  },
  featureButtonTitle: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureButtonSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  fileIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  assistantIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  chatsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  topBar: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  sidebarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modelText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  optionsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  folderIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  workspaceTitle: {
    color: Colors.textLight,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  featuresSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chatsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chatsTitle: {
    color: Colors.textLight,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  chatInputSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // Extra padding for safe area
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  fileTypeIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  assistantCircles: {
    flexDirection: 'row',
    alignItems: 'center',
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
  buttonGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  connectedButton: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
    minHeight: 68,
    justifyContent: 'center',
  },
  leftButton: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  rightButton: {
    // No additional styles needed
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  buttonIcons: {
    marginLeft: 10,
  },
}); 