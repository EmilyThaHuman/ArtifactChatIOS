import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Download } from 'lucide-react-native';

interface FileAttachmentsProps {
  files: any[];
  messageId?: string;
}

// Process files (matching web app)
const processFiles = (files: any[]): any[] => {
  return files.filter(Boolean).map(file => ({
    ...file,
    name: file.name || file.path || 'Unknown file',
    type: file.type || 'application/octet-stream'
  }));
};

// Extract clean file name (matching web app)
const extractCleanFileName = (filename: string): string => {
  if (!filename) return 'Unknown';
  
  // Remove any path components and hash suffixes
  let cleanName = filename.split('/').pop() || filename;
  cleanName = cleanName.split('?')[0]; // Remove query parameters
  cleanName = cleanName.split('#')[0]; // Remove hash fragments
  
  return cleanName;
};

// Get file background color based on extension (matching web app exactly)
const getFileBackgroundColor = (filename: string): string => {
  if (!filename) return '#3b82f6'; // blue-500

  const extension = filename.split('.').pop()?.toLowerCase();

  // PDF files - red
  if (extension === 'pdf') return '#ef4444'; // red-500
  
  // Image files - blue  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'].includes(extension || '')) {
    return '#3b82f6'; // blue-500
  }
  
  // Code files - blue
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'php', 'rb', 'go', 'rs', 'swift', 'kt'].includes(extension || '')) {
    return '#3b82f6'; // blue-500
  }
  
  // JSON/XML files - blue
  if (['json', 'xml', 'yaml', 'yml'].includes(extension || '')) return '#3b82f6'; // blue-500
  
  // Text/Document files - blue
  if (['txt', 'md', 'doc', 'docx', 'rtf', 'tex'].includes(extension || '')) {
    return '#3b82f6'; // blue-500
  }
  
  // Spreadsheet files - green
  if (['csv', 'xls', 'xlsx', 'ods'].includes(extension || '')) return '#22c55e'; // green-500
  
  // Archive files - purple
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'].includes(extension || '')) return '#a855f7'; // purple-500
  
  // Video files - orange
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'].includes(extension || '')) {
    return '#f97316'; // orange-500
  }
  
  // Audio files - yellow
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus', 'wma'].includes(extension || '')) {
    return '#eab308'; // yellow-500
  }
  
  // Default fallback
  return '#3b82f6'; // blue-500
};

// Get file icon component (simple text icons to match web styling)
const getFileIconComponent = (filename: string, fileType: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Use simple text characters for file type icons (matching web app style)
  if (extension === 'pdf') return 'PDF';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) return 'IMG';
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension || '')) return 'JS';
  if (['html'].includes(extension || '')) return 'HTML';
  if (['css'].includes(extension || '')) return 'CSS';
  if (['py'].includes(extension || '')) return 'PY';
  if (['java'].includes(extension || '')) return 'JAVA';
  if (['json'].includes(extension || '')) return 'JSON';
  if (['txt'].includes(extension || '')) return 'TXT';
  if (['md'].includes(extension || '')) return 'MD';
  if (['csv'].includes(extension || '')) return 'CSV';
  if (['xls', 'xlsx'].includes(extension || '')) return 'XLS';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return 'ZIP';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension || '')) return 'AUDIO';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) return 'VIDEO';
  
  return 'FILE';
};

// Get friendly file type (matching web app)
const getFriendlyFileType = (type: string, filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') return 'PDF';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) return 'Image';
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(extension || '')) return 'Video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension || '')) return 'Audio';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return 'Archive';
  if (['csv', 'xls', 'xlsx'].includes(extension || '')) return 'Spreadsheet';
  if (['doc', 'docx'].includes(extension || '')) return 'Document';
  if (['txt', 'md'].includes(extension || '')) return 'Text';
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java'].includes(extension || '')) return 'Code';
  
  return 'File';
};

// Determine if file is an image (matching web app)
const isImageFile = (file: any): boolean => {
  const fileName = file.name || file.path || '';
  const fileType = file.type || '';
  
  // Check by MIME type
  const isImageByType = fileType.startsWith('image/');
  
  // Check by file extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  const isImageByExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '');
  
  // Check by explicit flag
  const isImageByFlag = file.isImage === true;

  const result = isImageByType || isImageByExtension || isImageByFlag;
  
  console.log('🔍 [isImageFile] Checking file:', {
    fileName,
    fileType,
    extension,
    isImageByType,
    isImageByExtension,
    isImageByFlag,
    result
  });

  return result;
};

// Individual file attachment component (matching web app structure)
const FileAttachment = memo(function FileAttachment({ 
  file, 
  isImage = false 
}: {
  file: any; 
  isImage?: boolean; 
}) {
  const fileName = extractCleanFileName(file.name || file.path || 'Unknown');
  const friendlyType = getFriendlyFileType(file.type || '', fileName);

  const handleDownload = () => {
    // Handle file download
    Alert.alert('Download', `Download ${fileName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Download', onPress: () => {
        // TODO: Implement actual download functionality
        Alert.alert('Download', `Downloading ${fileName}...`);
      }}
    ]);
  };

  if (isImage) {
    const imageUrl = file.publicUrl || file.url || file.uri || file.localUrl;
    
    console.log('🖼️ [FileAttachment] Rendering image file:', {
      fileName,
      isImage,
      hasPublicUrl: !!file.publicUrl,
      hasUrl: !!file.url,
      hasUri: !!file.uri,
      hasLocalUrl: !!file.localUrl,
      imageUrl,
      fileObject: file
    });
    
    return (
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <>
            <Image
              source={{ uri: imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            
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
          </>
        ) : (
          <View style={styles.imageLoadingContainer}>
            <Text style={styles.imageLoadingText}>Loading...</Text>
          </View>
        )}
      </View>
    );
  }

  // Regular file display - matching web app style exactly
  const fileBackgroundColor = getFileBackgroundColor(fileName);
  const FileIconComponent = getFileIconComponent(fileName, file.type || '');
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');
  const fileTypeLabel = isPdf ? 'PDF' : friendlyType || 'File';

  return (
    <View style={styles.documentContainer}>
      {/* File icon with colored background */}
      <View style={[styles.documentIconContainer, { backgroundColor: fileBackgroundColor }]}>
        <Text style={styles.documentIconText}>{FileIconComponent}</Text>
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
        <Download size={16} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
});

// Main FileAttachments component (matching web app structure exactly)
export const FileAttachments = memo(function FileAttachments({
  files = [],
  messageId,
}: FileAttachmentsProps) {
  // Process files and separate into images and regular files (matching web app)
  const { imageFiles, regularFiles } = useMemo(() => {
    const processedFiles = processFiles(files);

    console.log('📁 [FileAttachments] Processing files:', {
      totalFiles: files.length,
      processedFiles: processedFiles.map(f => ({
        name: f.name,
        type: f.type,
        isImage: f.isImage,
        hasPublicUrl: !!f.publicUrl,
        hasUri: !!f.uri
      }))
    });

    const imageFiles = processedFiles.filter(isImageFile);
    const regularFiles = processedFiles.filter((file) => !isImageFile(file));

    console.log('📁 [FileAttachments] File categorization:', {
      imageFiles: imageFiles.length,
      regularFiles: regularFiles.length,
      imageFileNames: imageFiles.map(f => f.name),
      regularFileNames: regularFiles.map(f => f.name)
    });

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
      {/* Images displayed in a grid (matching web app) */}
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

      {/* Regular files listed vertically (matching web app) */}
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

// Dark mode styles matching web app exactly
const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  
  // Image grid styles (matching web app grid system)
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
  
  // Image attachment styles - 128px (w-32 h-32 equivalent, matching web app)
  imageContainer: {
    position: 'relative',
    width: 128,
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(39, 39, 42, 0.3)', // zinc-800/30 for dark mode
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
    backgroundColor: 'rgba(39, 39, 42, 0.3)', // zinc-800/30
  },
  imageLoadingText: {
    color: '#71717a', // zinc-500 for dark mode
    fontSize: 12,
  },
  imageDownloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
  
  // Document attachment styles - dark mode (matching web app dark theme exactly)
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a', // zinc-800 for dark mode 
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(63, 63, 70, 0.5)', // zinc-700/50 for dark mode
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 240,
    gap: 8,
  },
  documentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor set dynamically based on file type
  },
  documentIconText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  documentInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  documentFileName: {
    color: '#ffffff', // white text for dark mode
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  documentFileType: {
    color: '#a1a1aa', // zinc-400 for dark mode
    fontSize: 12,
  },
  documentDownloadButton: {
    padding: 4,
    borderRadius: 4,
  },
});

export default FileAttachments;