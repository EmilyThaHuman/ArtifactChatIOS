import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { File, Image as ImageIcon, FileText, Download } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { Colors } from '@/constants/Colors';
import GlassContainer from '../ui/GlassContainer';

interface FileCardProps {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  publicUrl?: string;
  onPress: () => void;
}

export default function FileCard({
  id,
  fileName,
  fileType,
  fileSize,
  createdAt,
  publicUrl,
  onPress
}: FileCardProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon size={20} color={Colors.accent} />;
    } else if (fileType.includes('text') || fileType.includes('document')) {
      return <FileText size={20} color={Colors.success} />;
    }
    return <File size={20} color={Colors.textSecondary} />;
  };

  const getFileTypeColor = () => {
    if (fileType.startsWith('image/')) return Colors.accent;
    if (fileType.includes('text') || fileType.includes('document')) return Colors.success;
    return Colors.textSecondary;
  };

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassContainer style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: getFileTypeColor() + '20' }]}>
            {getFileIcon()}
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={2}>
              {fileName}
            </Text>
            <View style={styles.metadata}>
              <Text style={styles.fileSize}>{formatFileSize(fileSize)}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.downloadButton}>
            <Download size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </GlassContainer>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  separator: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginHorizontal: 6,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  downloadButton: {
    padding: 8,
  },
});