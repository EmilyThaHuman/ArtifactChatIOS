import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import SingleWorkspacePage from '@/components/workspace/SingleWorkspacePage';
import { Colors } from '@/constants/Colors';

export default function WorkspaceDetailScreen() {
  const { id } = useLocalSearchParams();
  
  console.log('📱 WorkspaceDetailScreen: Received workspace ID:', id);

  return (
    <View style={styles.container}>
      <SingleWorkspacePage workspaceId={id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
}); 