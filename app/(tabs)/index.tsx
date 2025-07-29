import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';

import Sidebar from '@/components/ui/Sidebar';
import ChatInterface from '@/components/ui/ChatInterface';
import LibraryView from '@/components/content/LibraryView';
import { Colors, Gradients } from '@/constants/Colors';
import { ThreadManager } from '@/lib/threads';
import { useAuth } from '@/components/auth/AuthHandler';
import { useAssistantStore } from '@/lib/assistantStore';
import { WorkspaceManager } from '@/lib/workspace';

interface SidebarItem {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  type: 'creation' | 'project' | 'thread';
}

export default function HomeScreen() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams<{ threadId?: string; message?: string }>();
  
  // Get authenticated user data
  const { user, profile, isLoading } = useAuth();
  
  // Get assistant store methods
  const { initializeAssistants, currentAssistant, createTemporaryDefaultAssistant } = useAssistantStore();

  // Initialize assistants when user is available
  useEffect(() => {
    if (user && !currentAssistant) {
      console.log('🤖 HomeScreen: Initializing assistants for user:', user.id);
      initializeAssistants().then((assistants) => {
        console.log(`✅ HomeScreen: Initialized ${assistants.length} assistants`);
        
        // If no assistants exist, create a temporary one
        if (assistants.length === 0) {
          console.log('🤖 HomeScreen: No assistants found, creating temporary assistant');
          createTemporaryDefaultAssistant(profile?.displayName || 'User').then((tempAssistant) => {
            console.log('✅ HomeScreen: Created temporary assistant:', tempAssistant.name);
          }).catch((error) => {
            console.error('❌ HomeScreen: Failed to create temporary assistant:', error);
          });
        }
      }).catch((error) => {
        console.error('❌ HomeScreen: Failed to initialize assistants:', error);
        
        // If initialization fails, try creating a temporary assistant
        console.log('🤖 HomeScreen: Initialization failed, creating temporary assistant as fallback');
        createTemporaryDefaultAssistant(profile?.displayName || 'User').then((tempAssistant) => {
          console.log('✅ HomeScreen: Created fallback temporary assistant:', tempAssistant.name);
        }).catch((fallbackError) => {
          console.error('❌ HomeScreen: Failed to create fallback assistant:', fallbackError);
        });
      });
    }
  }, [user, currentAssistant, initializeAssistants, createTemporaryDefaultAssistant, profile?.displayName]);

  // Initialize with specific thread or create new one
  useEffect(() => {
    console.log('🚀 HomeScreen: useEffect triggered with params:', {
      threadId: params.threadId,
      message: params.message,
      hasParams: !!params.threadId
    });
    
    if (params.threadId) {
      console.log('🚀 HomeScreen: Loading specific thread from params:', params.threadId);
      loadSpecificThread(params.threadId, params.message);
    } else {
      console.log('🚀 HomeScreen: No threadId in params, initializing new thread');
      initializeNewThread();
    }
  }, [params.threadId, params.message]);

  // Track pendingMessage state changes
  useEffect(() => {
    console.log('🧵 HomeScreen: pendingMessage state changed:', {
      pendingMessage,
      hasPendingMessage: !!pendingMessage,
      currentThreadId,
      hasThreadId: !!currentThreadId
    });
  }, [pendingMessage, currentThreadId]);

  const loadSpecificThread = async (threadId: string, message?: string) => {
    try {
      console.log('🧵 HomeScreen: Loading thread:', {
        threadId,
        message,
        hasMessage: !!message
      });
      
      setCurrentThreadId(threadId);
      
      // Fetch thread details to get workspace_id
      const thread = await ThreadManager.getThread(threadId);
      if (thread && thread.workspace_id) {
        setCurrentWorkspaceId(thread.workspace_id);
        console.log('🧵 HomeScreen: Set workspace ID from thread:', thread.workspace_id);
      }
      
      // Store pending message if provided
      if (message) {
        setPendingMessage(message);
        console.log('🧵 HomeScreen: Storing pending message:', message);
      } else {
        console.log('🧵 HomeScreen: No message to store');
      }
      
      // Clear URL parameters to prevent navigation issues
      router.replace('/(tabs)');
      
      console.log('🧵 HomeScreen: Thread loading complete, state updated');
      
    } catch (error) {
      console.error('🧵 HomeScreen: Error loading thread:', error);
      // Fallback to creating new thread
      initializeNewThread();
    } finally {
      setIsInitializing(false);
    }
  };

  const initializeNewThread = async () => {
    try {
      console.log('🏠 HomeScreen: Initializing new thread...');
      const newThread = await ThreadManager.createNewThread({
        title: 'New Chat'
      });
      
      if (newThread) {
        setCurrentThreadId(newThread.id);
        setCurrentWorkspaceId(newThread.workspace_id);
        
        // Add the new thread to our threads list
        // Reload threads to ensure proper filtering
        loadThreads();
        
        console.log('🏠 HomeScreen: Initialized with thread:', newThread.id);
      } else {
        console.error('🏠 HomeScreen: Failed to create initial thread');
      }
    } catch (error) {
      console.error('🏠 HomeScreen: Error initializing thread:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleMenuPress = () => {
    setShowSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
  };

  const handleNewChat = () => {
    console.log('🏠 HomeScreen: Creating new chat...');
    initializeNewThread();
    setShowSidebar(false);
  };

  const handleNavigateToLibrary = () => {
    console.log('🏠 HomeScreen: Navigating to library...');
    setShowSidebar(false);
    router.push('/library');
  };

  const handleNavigateToCanvases = () => {
    console.log('🏠 HomeScreen: Navigating to canvases...');
    setShowSidebar(false);
    router.push('/canvases');
  };

  const loadThreads = async () => {
    try {
      if (user) {
        console.log('🏠 HomeScreen: Loading user history threads...');
        const userThreads = await ThreadManager.getHistoryThreads(50); // Load history threads with proper filtering
        setThreads(userThreads);
        console.log(`🏠 HomeScreen: Loaded ${userThreads.length} history threads`);
      }
    } catch (error) {
      console.error('🏠 HomeScreen: Error loading threads:', error);
    }
  };

  // Load threads when user is available
  useEffect(() => {
    if (user && !isLoading) {
      loadThreads();
    }
  }, [user, isLoading]);

  const handleLogout = async () => {
    console.log('🏠 HomeScreen: Handling logout...');
    try {
      const { error } = await AuthManager.signOut();
      if (error) {
        console.error('🏠 HomeScreen: Logout error:', error);
      } else {
        console.log('🏠 HomeScreen: Logout successful');
      }
    } catch (error) {
      console.error('🏠 HomeScreen: Logout exception:', error);
    }
    setShowSidebar(false);
  };

  const handleThreadSwitch = (threadId: string, workspaceId: string) => {
    console.log('🏠 HomeScreen: Switching to existing thread:', threadId);
    setCurrentThreadId(threadId);
    setCurrentWorkspaceId(workspaceId);
  };

  const handleThreadTitleUpdated = (threadId: string, newTitle: string) => {
    console.log('🏠 HomeScreen: Thread title updated:', threadId, newTitle);
    // Update the thread in our local state
    setThreads(prevThreads => 
      prevThreads.map(thread => 
        thread.id === threadId ? { ...thread, title: newTitle } : thread
      )
    );
  };

  const handleThreadSelect = (threadId: string) => {
    console.log('🏠 HomeScreen: Switching to thread from sidebar:', threadId);
    loadSpecificThread(threadId);
    setShowSidebar(false);
  };

  const handleThreadDelete = async (threadId: string) => {
    try {
      const success = await ThreadManager.deleteThread(threadId);
      if (success) {
        // Reload threads to ensure proper filtering after deletion
        await loadThreads();
        
        // If we're deleting the current thread, create a new one
        if (threadId === currentThreadId) {
          await initializeNewThread();
        }
        
        console.log(`🏠 HomeScreen: Thread ${threadId} deleted successfully`);
      }
    } catch (error) {
      console.error('🏠 HomeScreen: Error deleting thread:', error);
    }
  };

  const handleThreadRename = async (threadId: string, newTitle: string) => {
    try {
      const success = await ThreadManager.updateThread(threadId, { title: newTitle });
      if (success) {
        // Reload threads to ensure proper filtering after title change
        await loadThreads();
        console.log(`🏠 HomeScreen: Thread ${threadId} renamed to: ${newTitle}`);
      }
    } catch (error) {
      console.error('🏠 HomeScreen: Error renaming thread:', error);
      throw error;
    }
  };

  // Create user object that combines auth user and profile data
  const userData = user ? {
    ...user,
    ...profile,
    // Ensure we have the core user data
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
  } : null;

  console.log('🏠 HomeScreen: Rendering with user data:', {
    hasUser: !!user,
    hasProfile: !!profile,
    userId: user?.id,
    email: user?.email,
    avatarUrl: userData?.avatar_url,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ChatInterface
          onMenuPress={handleMenuPress}
          title="AI Chat"
          showInput={true}
          showSuggestions={!isInitializing && (!currentThreadId || currentThreadId === null)}
          threadId={currentThreadId}
          workspaceId={currentWorkspaceId}
          onThreadTitleUpdated={handleThreadTitleUpdated}
          pendingMessage={pendingMessage}
          onPendingMessageSent={() => {
            console.log('🧵 HomeScreen: Pending message sent callback triggered');
            setPendingMessage(null);
          }}
        />
      </View>
      
      <Sidebar
        isVisible={showSidebar}
        onClose={handleCloseSidebar}
        onNewChat={handleNewChat}
        onNavigateToLibrary={handleNavigateToLibrary}
        onNavigateToCanvases={handleNavigateToCanvases}
        user={user}
        profile={profile}
        threads={threads}
        currentThreadId={currentThreadId}
        onThreadSelect={handleThreadSelect}
        onThreadDelete={handleThreadDelete}
        onThreadRename={handleThreadRename}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161618',
  },
  content: {
    flex: 1,
  },
});