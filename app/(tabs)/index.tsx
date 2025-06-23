import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import Sidebar from '@/components/ui/Sidebar';
import ChatInterface from '@/components/ui/ChatInterface';
import LibraryView from '@/components/content/LibraryView';
import { Colors, Gradients } from '@/constants/Colors';
import { ThreadManager } from '@/lib/threads';

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

  // Initialize with a new thread on app load
  useEffect(() => {
    initializeNewThread();
  }, []);

  const initializeNewThread = async () => {
    try {
      console.log('🏠 HomeScreen: Initializing new thread...');
      const newThread = await ThreadManager.createNewThread({
        title: 'New Chat'
      });
      
      if (newThread) {
        setCurrentThreadId(newThread.id);
        setCurrentWorkspaceId(newThread.workspace_id);
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

  const handleNewChat = (threadId: string, workspaceId: string) => {
    console.log('🏠 HomeScreen: Switching to thread:', threadId);
    setCurrentThreadId(threadId);
    setCurrentWorkspaceId(workspaceId);
  };

  const handleThreadSwitch = (threadId: string, workspaceId: string) => {
    console.log('🏠 HomeScreen: Switching to existing thread:', threadId);
    setCurrentThreadId(threadId);
    setCurrentWorkspaceId(workspaceId);
  };

  const handleThreadTitleUpdated = (threadId: string, newTitle: string) => {
    console.log('🏠 HomeScreen: Thread title updated:', threadId, newTitle);
    // The sidebar will handle its own refresh when needed
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ChatInterface
          key={currentThreadId} // Force remount when thread changes
          onMenuPress={handleMenuPress}
          title="AI Chat"
          showInput={true}
          showSuggestions={!isInitializing && (!currentThreadId || currentThreadId === null)}
          threadId={currentThreadId}
          workspaceId={currentWorkspaceId}
          onThreadTitleUpdated={handleThreadTitleUpdated}
        />
      </View>
      
      <Sidebar
        isOpen={showSidebar}
        onClose={handleCloseSidebar}
        onItemSelect={(item) => console.log('Selected:', item)}
        onNewChat={handleNewChat}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
});