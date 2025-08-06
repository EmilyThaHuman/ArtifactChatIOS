# File Upload Fixes for iOS

This document outlines the fixes implemented to resolve file upload issues in the iOS app.

## Issues Fixed

### 1. iPhone File Access Issue
**Problem**: The "Add Files" button wasn't opening the iPhone file picker properly, only showing iCloud files.

**Solution**: 
- Enhanced the file picker with an action sheet that lets users choose between:
  - **Documents**: Uses `expo-document-picker` for accessing documents and files
  - **Photos**: Uses `expo-image-picker` for accessing photo library
- Added proper permission requests for media library access
- Improved error handling with user-friendly error messages

### 2. Supabase Upload Public URL Issue
**Problem**: File uploads were not returning public URLs from Supabase storage.

**Solution**:
- Replaced backend API upload with direct Supabase storage upload
- Added retry logic to try multiple storage buckets (`files` and `chat`)
- Improved filename sanitization to avoid upload issues
- Enhanced error handling and logging for debugging

## Implementation Details

### Enhanced File Picker (`ChatInput.tsx`)
```typescript
// Action sheet for choosing file type
Alert.alert(
  'Add Files',
  'What would you like to add?',
  [
    {
      text: 'Documents',
      onPress: async () => await pickDocument()
    },
    {
      text: 'Photos', 
      onPress: async () => await pickImage()
    },
    {
      text: 'Cancel',
      style: 'cancel'
    }
  ]
);
```

### Direct Supabase Upload (`content.ts`)
```typescript
async function uploadToSupabaseStorage(file: VectorStoreFile): Promise<string> {
  // Read file as blob
  const response = await fetch(file.uri);
  const blob = await response.blob();
  
  // Try multiple buckets with fallback
  try {
    // Try 'files' bucket first
    const result = await supabase.storage
      .from('files')
      .upload(filePath, blob, { contentType: file.type });
  } catch (error) {
    // Fallback to 'chat' bucket
    const result = await supabase.storage
      .from('chat')
      .upload(filePath, blob, { contentType: file.type });
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
    
  return publicUrl;
}
```

### Improved Image Upload
- Added media library permission requests
- Enhanced error handling for permission denials
- Direct Supabase storage upload for better reliability
- Proper file metadata handling

## Required Permissions

Make sure these permissions are configured in your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "This app needs access to your photo library to upload images.",
        "NSCameraUsageDescription": "This app needs access to your camera to take photos.",
        "NSDocumentDirectoryUsageDescription": "This app needs access to documents for file uploads."
      }
    }
  }
}
```

## Testing

To test the fixes:

1. **Document Upload Test**:
   - Tap "Add Files" → "Documents"
   - Select a PDF or document file
   - Verify the file uploads and shows a public URL

2. **Photo Upload Test**:
   - Tap "Add Files" → "Photos" 
   - Select one or more photos
   - Verify photos upload successfully with public URLs

3. **Permission Test**:
   - Test on a fresh install to verify permission prompts
   - Test when permissions are denied to verify graceful handling

## Error Handling

The implementation now includes comprehensive error handling:

- Permission denied errors with user-friendly messages
- Network/upload errors with retry logic
- Bucket availability fallbacks
- Detailed logging for debugging

## Performance Considerations

- Files are processed individually to avoid memory issues
- Direct Supabase upload reduces server load
- Proper cleanup of temporary file references
- Optimized blob handling for large files

## Additional Fixes - Thread and Workspace Context

### 3. Missing Thread ID and Workspace ID Issue
**Problem**: File uploads failed with "No thread ID or workspace ID provided for file upload".

**Solution**:
- **Enhanced ThreadManager**: Now automatically creates a personal workspace if none exists
- **Improved file upload logic**: Creates thread/workspace context automatically when missing
- **Fallback mechanisms**: Multiple levels of fallback to ensure uploads always have context

### Implementation Details

#### Auto-Workspace Creation (`threads.ts`)
```typescript
if (!workspaces || workspaces.length === 0) {
  console.log('🧵 ThreadManager: No personal workspace found, creating one...');
  
  // Create a personal workspace automatically
  const { data: newWorkspace, error: createError } = await supabase
    .from('workspaces')
    .insert({
      user_id: user.id,
      owner_id: user.id,
      name: 'Personal Workspace',
      description: 'Your personal AI workspace',
      is_personal: true,
      is_home: true,
      // ... other workspace configuration
    })
    .select('id, name, is_personal')
    .single();

  workspaceId = newWorkspace.id;
}
```

#### Smart Context Creation (`content.ts`)
```typescript
if (!effectiveThreadId && !effectiveWorkspaceId) {
  // First try to use any available workspace
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, is_personal')
    .limit(1);

  if (workspaces && workspaces.length > 0) {
    effectiveWorkspaceId = workspaces[0].id;
  } else {
    // Create new thread and workspace
    const newThread = await ThreadManager.createNewThread({
      title: 'File Upload Chat'
    });
    effectiveThreadId = newThread.id;
    effectiveWorkspaceId = newThread.workspace_id;
  }
}
```

## Testing the Complete Fix

1. **Fresh User Test**:
   - Install app on fresh device/simulator
   - Sign up with new account
   - Try uploading files immediately
   - Should automatically create workspace and thread

2. **File Upload Flow Test**:
   - Tap "Add Files" → "Documents" or "Photos"
   - Select files and verify upload succeeds
   - Check that thread and workspace context is properly created

3. **Context Persistence Test**:
   - Upload files in one session
   - Close and reopen app
   - Upload more files to verify context is maintained

## Future Improvements

1. Add support for more file types
2. Implement upload progress indicators  
3. Add file compression options
4. Implement chunked uploads for very large files
5. Add real-time sync when new threads are created during file upload