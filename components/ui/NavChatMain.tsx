import React from 'react';
import { View, StyleSheet } from 'react-native';
import NavChatWorkspaces from './NavChatWorkspaces';

interface NavChatMainProps {
  workspaces?: any[];
  currentWorkspace?: any;
  user?: any;
  threads?: any[];
  onWorkspaceSelect?: (workspaceId: string) => void;
  onThreadSelect?: (threadId: string) => void;
  onCreateChat?: (workspaceId: string) => void;
  isCollapsed?: boolean;
}

export function NavChatMain({
  workspaces = [],
  currentWorkspace,
  user,
  threads = [],
  onWorkspaceSelect,
  onThreadSelect,
  onCreateChat,
  isCollapsed = false,
}: NavChatMainProps) {
  return (
    <View style={styles.container}>
      <NavChatWorkspaces
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        user={user}
        threads={threads}
        onWorkspaceSelect={onWorkspaceSelect}
        onThreadSelect={onThreadSelect}
        onCreateChat={onCreateChat}
        isCollapsed={isCollapsed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default NavChatMain; 