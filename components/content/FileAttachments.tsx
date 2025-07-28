import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Download } from 'lucide-react-native';
import { VectorStoreFile } from '@/lib/openai';

interface FileAttachmentsProps {
  files: any[];
  messageId?: string;
}

// Get file background color based on extension (matching web app)
const getFileBackgroundColor = (filename: string) => {
  if (!filename) return '#3b82f6'; // blue-500

  const extension = filename.split('.').pop()?.toLowerCase();

  // PDF files - red
  if (extension === 'pdf') return '#ef4444'; // red-500
  
  // Image files - blue
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
    return '#3b82f6'; // blue-500
  }
  
  // Code files - blue
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'php'].includes(extension || '')) {
    return '#3b82f6'; // blue-500
  }
  
  // JSON files - blue
  if (['json'].includes(extension || '')) return '#3b82f6'; // blue-500
  
  // Text/Document files - blue
  if (['txt', 'md', 'doc', 'docx', 'rtf'].includes(extension || '')) {
    return '#3b82f6'; // blue-500
  }
  
  // Spreadsheet files - green
  if (['csv', 'xls', 'xlsx'].includes(extension || '')) return '#22c55e'; // green-500
  
  // Archive files - purple
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return '#a855f7'; // purple-500
  
  // Audio files - amber
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma', 'amr'].includes(extension || '')) {
    return '#f59e0b'; // amber-500
  }
  
  // Video files - purple
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) return '#a855f7'; // purple-500
  
  // Default - blue
  return '#3b82f6'; // blue-500
};

const getFileIcon = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Return appropriate icon character for each file type
  if (extension === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) return '🖼️';
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension || '')) return '⚛️';
  if (['html', 'css'].includes(extension || '')) return '🌐';
  if (['py'].includes(extension || '')) return '🐍';
  if (['java'].includes(extension || '')) return '☕';
  if (['json'].includes(extension || '')) return '📋';
  if (['txt', 'md'].includes(extension || '')) return '📝';
  if (['csv', 'xls', 'xlsx'].includes(extension || '')) return '📊';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return '🗜️';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension || '')) return '🎵';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) return '🎬';
  
  return '📄'; // Default file icon
};

// Get friendly file type name
const getFriendlyFileType = (type: string, filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') return 'PDF';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) return 'Image';
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension || '')) return 'JavaScript';
  if (['html'].includes(extension || '')) return 'HTML';
  if (['css'].includes(extension || '')) return 'CSS';
  if (['py'].includes(extension || '')) return 'Python';
  if (['java'].includes(extension || '')) return 'Java';
  if (['json'].includes(extension || '')) return 'JSON';
  if (['txt'].includes(extension || '')) return 'Text';
  if (['md'].includes(extension || '')) return 'Markdown';
  if (['csv'].includes(extension || '')) return 'CSV';
  if (['xls', 'xlsx'].includes(extension || '')) return 'Excel';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return 'Archive';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension || '')) return 'Audio';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) return 'Video';
  
  return 'File';
};

// Check if file is an image
const isImageFile = (file: any) => {
  if (!file) return false;

  const isImageByType = file.type?.startsWith('image/');
  const isImageByExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(
    file.name || file.path || '',
  );
  const isImageByFlag = file.isImage === true;

  return isImageByType || isImageByExtension || isImageByFlag;
};

// Individual file attachment component
const FileAttachment = memo(function FileAttachment({ 
  file, 
  isImage = false 
}: { 
  file: any; 
  isImage?: boolean; 
}) {
  const fileName = file.name || file.path || 'Unknown';
  const friendlyType = getFriendlyFileType(file.type || '', fileName);

  const handleDownload = () => {
    // Handle file download - implement based on your file storage
    Alert.alert('Download', `Downloading ${fileName}`);
  };

  if (isImage) {
    const imageUrl = file.publicUrl || file.url || file.localUrl;
    
    return (
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imageLoadingContainer}>
            <Text style={styles.imageLoadingText}>Loading...</Text>
          </View>
        )}

        {/* Download button for images */}
        <TouchableOpacity
          style={styles.imageDownloadButton}
          onPress={handleDownload}
        >
          <Download size={12} color="#ffffff" />
        </TouchableOpacity>

        {/* File info overlay */}
        <View style={styles.imageInfoOverlay}>
          <Text style={styles.imageFileName} numberOfLines={1}>{fileName}</Text>
          {friendlyType && (
            <Text style={styles.imageFriendlyType}>{friendlyType}</Text>
          )}
        </View>
      </View>
    );
  }

  // Regular file display - matching web app style
  const fileBackgroundColor = getFileBackgroundColor(fileName);
  const fileIcon = getFileIcon(fileName);
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');
  const fileTypeLabel = isPdf ? 'PDF' : friendlyType || 'File';

  return (
    <View style={styles.documentContainer}>
      {/* File icon with colored background */}
      <View style={[styles.documentIconContainer, { backgroundColor: fileBackgroundColor }]}>
        <Text style={styles.documentIconText}>{fileIcon}</Text>
      </View>

      {/* File info */}
      <View style={styles.documentInfoContainer}>
        <Text style={styles.documentFileName} numberOfLines={1}>{fileName}</Text>
        <Text style={styles.documentFileType}>{fileTypeLabel}</Text>
      </View>

      {/* Download button */}
      <TouchableOpacity
        style={styles.documentDownloadButton}
        onPress={handleDownload}
      >
        <Download size={16} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
});

// Main FileAttachments component
export const FileAttachments = memo(function FileAttachments({
  files = [],
  messageId,
}: FileAttachmentsProps) {
  // Process files and separate into images and regular files
  const { imageFiles, regularFiles } = useMemo(() => {
    const processedFiles = files.filter(Boolean);

    const imageFiles = processedFiles.filter(isImageFile);
    const regularFiles = processedFiles.filter((file) => !isImageFile(file));

    return { imageFiles, regularFiles };
  }, [files]);

  // Don't render if no files
  if (imageFiles.length === 0 && regularFiles.length === 0) {
    return null;
  }

  const getImageGridStyle = () => {
    const count = imageFiles.length;
    if (count === 1) return styles.imageGrid1;
    if (count === 2) return styles.imageGrid2;
    if (count === 3) return styles.imageGrid3;
    return styles.imageGridDefault;
  };

  return (
    <View style={styles.container}>
      {/* Images displayed in a grid */}
      {imageFiles.length > 0 && (
        <View style={[styles.imageGridContainer, getImageGridStyle()]}>
          {imageFiles.map((file, index) => (
            <FileAttachment
              key={`${messageId}-image-${index}-${file.name || file.path}`}
              file={file}
              isImage={true}
            />
          ))}
        </View>
      )}

      {/* Regular files listed vertically */}
      {regularFiles.length > 0 && (
        <View style={styles.regularFilesContainer}>
          {regularFiles.map((file, index) => (
            <FileAttachment
              key={`${messageId}-file-${index}-${file.name || file.path}`}
              file={file}
              isImage={false}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  
  // Image grid styles
  imageGridContainer: {
    gap: 12,
    width: '100%',
  },
  imageGrid1: {
    flexDirection: 'column',
  },
  imageGrid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageGridDefault: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // Image attachment styles - 128px (w-32 h-32 equivalent)
  imageContainer: {
    position: 'relative',
    width: 128,
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(156, 163, 175, 0.2)', // gray-400/20
  },
  messageImage: {
    width: 128,
    height: 128,
    borderRadius: 16,
  },
  imageLoadingContainer: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLoadingText: {
    color: '#6b7280', // gray-500
    fontSize: 12,
  },
  imageDownloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  imageInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  imageFileName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  imageFriendlyType: {
    color: '#d1d5db', // gray-300
    fontSize: 10,
  },
  
  // Regular files container
  regularFilesContainer: {
    gap: 4,
    width: '100%',
  },
  
  // Document attachment styles - matching web app design
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6', // zinc-100
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(209, 213, 219, 0.5)', // zinc-200/50
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 240,
    gap: 8,
  },
  documentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentIconText: {
    fontSize: 16,
    color: '#ffffff',
  },
  documentInfoContainer: {
    flex: 1,
    minWidth: 0,
  },
  documentFileName: {
    color: '#111827', // zinc-900
    fontSize: 14,
    fontWeight: '500',
  },
  documentFileType: {
    color: '#6b7280', // zinc-500
    fontSize: 12,
  },
  documentDownloadButton: {
    padding: 4,
    borderRadius: 6,
  },
});

export default FileAttachments; 