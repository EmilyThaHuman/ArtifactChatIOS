# Required Supabase SQL Functions

The Library and Canvases pages in the iOS app depend on two SQL functions in the Supabase database. These functions must be created in your Supabase project for the pages to work properly.

## get_user_images_by_threads

This function retrieves all generated images from thread messages for given thread IDs.

**Parameters:**
- `thread_ids`: Array of thread UUIDs

**Returns:**
- `message_id`: UUID of the message
- `tool_call_id`: ID of the tool call
- `image_url`: URL of the generated image
- `image_prompt`: Prompt used to generate the image
- `created_at`: Timestamp when the image was created
- `thread_id`: UUID of the thread
- `image_name`: Name of the image (if available)
- `image_size`: Size of the image (if available)
- `image_model`: Model used to generate the image (if available)
- `image_provider`: Provider used to generate the image (if available)
- `is_direct_url`: Boolean indicating if it's a direct URL
- `storage_path`: Storage path (if applicable)
- `storage_bucket`: Storage bucket (if applicable)
- `tool_call_data`: Full tool call data

## get_user_canvases_by_threads

This function retrieves all canvases from thread messages for given thread IDs.

**Parameters:**
- `thread_ids`: Array of thread UUIDs

**Returns:**
- `message_id`: UUID of the message
- `tool_call_id`: ID of the tool call
- `canvas_content`: Content of the canvas
- `canvas_name`: Name of the canvas
- `canvas_type`: Type of the canvas (code, text, etc.)
- `canvas_language`: Programming language (if applicable)
- `canvas_version`: Version number of the canvas
- `created_at`: Timestamp when the canvas was created
- `thread_id`: UUID of the thread
- `tool_call_data`: Full tool call data

## Notes

These functions are designed to efficiently retrieve image and canvas data from the `thread_messages` table by parsing the `tool_calls` JSONB column. They filter for specific tool call types:

- **Images**: Tool calls with names containing "image_gen"
- **Canvases**: Tool calls with names containing "canvas_create", "canvas_edit", or "canvas_stream"

The functions should be created with the same user permissions as the thread_messages table to ensure proper access control. 