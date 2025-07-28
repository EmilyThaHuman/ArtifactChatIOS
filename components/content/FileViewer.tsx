import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
} from 'react-native';
import { X, Download } from 'lucide-react-native';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: any;
}

export function FileViewer({ isOpen, onClose, file }: FileViewerProps) {
  if (!file) return null;

  const handleDownload = () => {
    // Implement download functionality based on your file storage
    Alert.alert('Download', `Downloading ${file.name}`);
  };

  return (
    <Modal
      visible={isOpen}
      presentationStyle="fullScreen"
      animationType="slide"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownload}
          >
            <Download size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* File Content */}
        <View style={styles.content}>
          <View style={styles.fileInfo}>
            <Text style={styles.fileInfoText}>
              File: {file.name}
            </Text>
            <Text style={styles.fileInfoText}>
              Type: {file.type || 'Unknown'}
            </Text>
            {file.size && (
              <Text style={styles.fileInfoText}>
                Size: {(file.size / 1024).toFixed(1)} KB
              </Text>
            )}
          </View>
          
          <Text style={styles.previewText}>
            File preview is not supported in this version. Use the download button to save the file.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    gap: 16,
  },
  closeButton: {
    padding: 8,
  },
  fileName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  downloadButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    minWidth: '100%',
  },
  fileInfoText: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 8,
  },
  previewText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FileViewer; 