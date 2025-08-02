import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import {
  Download,
  Trash2,
  Archive,
  Brain,
  Database,
  Shield,
  Clock,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface DataControlsProps {
  user?: any;
  onClose?: () => void;
}

export default function DataControls({ user, onClose }: DataControlsProps) {
  const [dataSettings, setDataSettings] = useState({
    autoDelete: false,
    autoDeleteDays: 30,
    memoryEnabled: true,
    dataCollection: true,
  });

  const handleToggle = useCallback((setting: string, value: boolean) => {
    setDataSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  }, []);

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This will create a file with all your conversation history and settings. This feature will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleClearChatHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to delete all your chat history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear History', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Chat History',
              'Chat history clearing will be implemented in a future update.',
              [{ text: 'OK' }]
            );
          }
        },
      ]
    );
  };

  const handleClearMemories = () => {
    Alert.alert(
      'Clear AI Memories',
      'Are you sure you want to delete all AI memories about you? This will reset personalization.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Memories', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'AI Memories',
              'Memory clearing will be implemented in a future update.',
              [{ text: 'OK' }]
            );
          }
        },
      ]
    );
  };

  const handleArchiveOldChats = () => {
    Alert.alert(
      'Archive Old Chats',
      'This will archive chats older than 90 days. Archived chats can be restored later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Archive', 
          onPress: () => {
            Alert.alert(
              'Archive Chats',
              'Chat archiving will be implemented in a future update.',
              [{ text: 'OK' }]
            );
          }
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete ALL your data including chats, memories, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everything', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Data Deletion',
              'Complete data deletion will be implemented in a future update.',
              [{ text: 'OK' }]
            );
          }
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Data Export */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Export</Text>
        <Text style={styles.sectionDescription}>
          Download a copy of your data for backup or transfer
        </Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
          <Download size={20} color="#3b82f6" />
          <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>
            Export My Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* Memory Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Memory Management</Text>
        <Text style={styles.sectionDescription}>
          Control how AI remembers information about you
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Enable AI Memory</Text>
            <Text style={styles.settingDescription}>
              Allow AI to remember details from conversations
            </Text>
          </View>
          <Switch
            value={dataSettings.memoryEnabled}
            onValueChange={(value) => handleToggle('memoryEnabled', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleClearMemories}>
          <Brain size={20} color="#f59e0b" />
          <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>
            Clear AI Memories
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chat History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chat History</Text>
        <Text style={styles.sectionDescription}>
          Manage your conversation history and archives
        </Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleArchiveOldChats}>
          <Archive size={20} color="#6b7280" />
          <Text style={styles.actionButtonText}>
            Archive Old Chats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleClearChatHistory}>
          <Clock size={20} color="#f59e0b" />
          <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>
            Clear Chat History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Auto-Delete Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Automatic Data Management</Text>
        <Text style={styles.sectionDescription}>
          Automatically manage your data to save storage
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto-delete Old Chats</Text>
            <Text style={styles.settingDescription}>
              Automatically delete chats older than 30 days
            </Text>
          </View>
          <Switch
            value={dataSettings.autoDelete}
            onValueChange={(value) => handleToggle('autoDelete', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Data Collection</Text>
            <Text style={styles.settingDescription}>
              Allow anonymous usage data to improve the service
            </Text>
          </View>
          <Switch
            value={dataSettings.dataCollection}
            onValueChange={(value) => handleToggle('dataCollection', value)}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Privacy Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Information</Text>
        <Text style={styles.sectionDescription}>
          How we handle and protect your data
        </Text>
        
        <View style={styles.privacyInfo}>
          <Shield size={24} color="#3b82f6" />
          <View style={styles.privacyText}>
            <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
            <Text style={styles.privacyDescription}>
              We use encryption to protect your data and never share your conversations with third parties. You maintain full control over your information.
            </Text>
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDescription}>
          These actions will permanently delete data and cannot be undone.
        </Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearAllData}>
          <Database size={20} color="#ef4444" />
          <Text style={styles.dangerButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  dangerSection: {
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#fca5a5',
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 12,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
});