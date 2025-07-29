import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Database, Download, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface DataControlsProps {
  user?: any;
  onClose?: () => void;
}

export default function DataControls({ user, onClose }: DataControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <Text style={styles.sectionDescription}>
          Download a copy of your data including conversations and files
        </Text>
        
        <TouchableOpacity style={styles.button} disabled>
          <Download size={16} color={Colors.gray400} />
          <Text style={styles.disabledText}>Data export coming soon</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Memory Management</Text>
        <Text style={styles.sectionDescription}>
          Manage your AI memory and conversation history
        </Text>
        
        <TouchableOpacity style={styles.button} disabled>
          <Database size={16} color={Colors.gray400} />
          <Text style={styles.disabledText}>Memory management coming soon</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clear Data</Text>
        <Text style={styles.sectionDescription}>
          Permanently delete your conversation history and uploaded files
        </Text>
        
        <TouchableOpacity style={styles.dangerButton} disabled>
          <Trash2 size={16} color={Colors.gray400} />
          <Text style={styles.disabledText}>Data clearing coming soon</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray400,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    gap: 8,
    opacity: 0.5,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    gap: 8,
    opacity: 0.5,
  },
  disabledText: {
    fontSize: 14,
    color: Colors.gray400,
  },
});