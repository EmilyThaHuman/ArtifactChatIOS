import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheUtils } from './streamingUtils';

// Interfaces for system prompt building
export interface ContextData {
  threadId?: string;
  workspaceId?: string;
  workspace_initiated?: boolean;
  is_workspace_chat?: boolean;
  from_workspace_chat?: boolean;
  [key: string]: any;
}

export interface UserProfile {
  displayName?: string;
  settings?: {
    personalization?: {
      enable_memories?: boolean;
      enable_profile_context?: boolean;
      profile_context?: string;
      traits?: string[];
      interests?: string[];
      include_reasoning_in_response?: boolean;
    };
    profile?: {
      display_name?: string;
      profile_context?: string;
    };
  };
}

export interface Memory {
  id: string;
  content?: string;
  memory?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: {
    importance?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface LocationData {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  localTime?: string;
}

export interface SystemPromptOptions {
  enableExamples?: boolean;
  enableAntiPatterns?: boolean;
  enableQuantifiedGuidelines?: boolean;
  enableMemories?: boolean;
}

/**
 * Get user authentication data
 */
async function getUserAuthData(): Promise<{ userId: string | null; profile: UserProfile | null }> {
  try {
    // Get current user from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { userId: null, profile: null };
    }

    // Try to get profile from cache first
    const cachedProfile = await CacheUtils.getFromStorage(`@userProfile:${user.id}`);
    if (cachedProfile) {
      return { userId: user.id, profile: cachedProfile };
    }

    // Fetch profile from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Cache the profile
    if (profile) {
      await CacheUtils.setToStorage(`@userProfile:${user.id}`, profile);
    }

    return { userId: user.id, profile: profile || null };
  } catch (error) {
    console.error('Error getting user auth data:', error);
    return { userId: null, profile: null };
  }
}

/**
 * Get user memories (placeholder - would integrate with memory system)
 */
async function getUserMemories(userId: string): Promise<Memory[]> {
  try {
    // For now, return empty array
    // In full implementation, this would fetch from memory API or local storage
    console.log('Getting memories for user:', userId);
    return [];
  } catch (error) {
    console.error('Error fetching user memories:', error);
    return [];
  }
}

/**
 * Get user location data (placeholder)
 */
async function getUserLocationData(): Promise<LocationData | null> {
  try {
    // For now, return null
    // In full implementation, this would get location from device or IP
    return null;
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}

/**
 * Build Model Set Context section with user memories
 */
async function buildModelSetContext(): Promise<string | null> {
  try {
    const { userId, profile } = await getUserAuthData();
    
    if (!userId) return null;

    // Check if memories are enabled in user settings
    const memoriesEnabled = profile?.settings?.personalization?.enable_memories !== false;
    if (!memoriesEnabled) return null;

    // Retrieve all memories
    const memories = await getUserMemories(userId);
    if (!memories || memories.length === 0) return null;

    // Format memories in ChatGPT style
    let content = `<model_set_context priority="1.5">
# Model Set Context
`;

    // Sort memories by date (newest first)
    const sortedMemories = memories.sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at || '');
      const dateB = new Date(b.created_at || b.updated_at || '');
      return dateB.getTime() - dateA.getTime();
    });

    // Group memories by category
    const memoriesByCategory = sortedMemories.reduce((acc: { [key: string]: Memory[] }, memory) => {
      const category = memory.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(memory);
      return acc;
    }, {});

    // Define category order and labels
    const categoryOrder = ['profile', 'project', 'assistant', 'chat'];
    const categoryLabels: { [key: string]: string } = {
      profile: 'Profile & Preferences',
      project: 'Project Context', 
      assistant: 'Assistant Behavior',
      chat: 'Conversation History',
    };

    let memoryIndex = 1;

    // Format memories by category
    for (const category of categoryOrder) {
      if (!memoriesByCategory[category] || memoriesByCategory[category].length === 0) {
        continue;
      }

      content += `\n## ${categoryLabels[category]}\n`;

      for (const memory of memoriesByCategory[category]) {
        const date = new Date(memory.created_at || memory.updated_at || '')
          .toISOString()
          .split('T')[0];

        // Check importance from metadata
        const importance = memory.metadata?.importance || 'medium';
        const importanceMarker = importance === 'high' ? ' [!]' : '';

        // Use memory content from either format
        const memoryText = memory.memory || memory.content || '';

        // Add source indicator for profile memories
        const sourceIndicator = memory.metadata?.source === 'profile_settings' ? ' [Profile]' : '';

        content += `${memoryIndex}. [${date}]${importanceMarker}${sourceIndicator} ${memoryText}\n`;
        memoryIndex++;
      }
    }

    // Add memory management note
    content += `
**Note:** These are persistent memories saved across conversations. Profile memories are stored locally, while project/assistant/chat memories use intelligent memory layer. High importance memories are marked with [!]. Incorporate this context naturally when relevant.`;

    content += `
</model_set_context>`;

    return content;
  } catch (error) {
    console.error('Failed to build Model Set Context:', error);
    return null;
  }
}

/**
 * Enhanced profile context that works alongside memories
 */
async function getProfileContext(config: SystemPromptOptions): Promise<string | null> {
  try {
    const { profile } = await getUserAuthData();
    
    if (!profile) return null;

    const profileContextEnabled = profile.settings?.personalization?.enable_profile_context === true;
    if (!profileContextEnabled) return null;

    const customInstructions = 
      profile.settings?.personalization?.profile_context ||
      profile.settings?.profile?.profile_context;
    const traits = profile.settings?.personalization?.traits;
    const interests = profile.settings?.personalization?.interests;
    const preferredName = profile.settings?.profile?.display_name;

    const locationData = await getUserLocationData();

    if (
      !customInstructions?.trim() &&
      (!traits || traits.length === 0) &&
      (!interests || interests.length === 0) &&
      !preferredName &&
      !locationData
    ) {
      return null;
    }

    let content = `<user_profile priority="2">
**USER PROFILE (Priority: 2)**

`;

    // Identity & Location
    if (preferredName || locationData) {
      content += `**Identity:** ${preferredName || 'User'}`;
      if (locationData) {
        const location = [
          locationData.city,
          locationData.region, 
          locationData.country,
        ]
          .filter(Boolean)
          .join(', ');
        content += ` | **Location:** ${location}`;
        if (locationData.timezone) content += ` (${locationData.timezone})`;
        if (locationData.localTime) content += ` | **Local Time:** ${locationData.localTime}`;
      }
      content += `\n`;
    }

    // Personality traits (override capability)
    if (traits && traits.length > 0) {
      content += `**Personality Traits:** ${traits.join(', ')} *(overrides conflicting instructions at lower levels)*\n`;
    }

    // Preferences
    if (customInstructions?.trim()) {
      content += `**Custom Instructions:** ${customInstructions.trim()}\n`;
    }
    if (interests && interests.length > 0) {
      content += `**Interests:** ${interests.join(', ')}\n`;
    }

    content += `**Adaptation:** Naturally incorporate user context and memories. Respect preferences while maintaining core capabilities. Reference memories when relevant to current discussion.
</user_profile>`;

    return content;
  } catch (error) {
    console.error('Profile context error:', error);
    return null;
  }
}

/**
 * Optimized assistant role section
 */
function buildAssistantRole(instructions: string, isWorkspaceChat: boolean): string {
  const contextType = isWorkspaceChat ? 'PROJECT_ASSISTANT' : 'GENERAL_ASSISTANT';

  return `<assistant_role priority="3">
**ASSISTANT ROLE (Priority: 3)**
**Context:** ${contextType}

${instructions}

*Note: Work within framework established by higher-priority levels. User personality traits and persistent memories may modify behavioral aspects.*
</assistant_role>`;
}

/**
 * Optimized workspace context
 */
async function getWorkspaceContext(contextData: ContextData, config: SystemPromptOptions): Promise<string | null> {
  const isWorkspaceChat =
    contextData?.is_workspace_chat ||
    contextData?.from_workspace_chat ||
    contextData?.workspace_initiated;

  if (!isWorkspaceChat || !contextData?.workspaceId) return null;

  try {
    // Get workspace data from cache or database
    const cacheKey = `@workspace:${contextData.workspaceId}`;
    let workspaceData = await CacheUtils.getFromStorage(cacheKey);

    if (!workspaceData) {
      const { data } = await supabase
        .from('workspaces')
        .select('name, description, instructions')
        .eq('id', contextData.workspaceId)
        .single();

      if (data) {
        workspaceData = data;
        await CacheUtils.setToStorage(cacheKey, data);
      }
    }

    if (!workspaceData) return null;

    const { name, description, instructions } = workspaceData;
    if (!name && !description && !instructions) return null;

    let content = `<project_context priority="4">
**PROJECT CONTEXT (Priority: 4)**
`;
    if (name) content += `**Name:** ${name}\n`;
    if (description) content += `**Description:** ${description}\n`;
    if (instructions) content += `**Instructions:** ${instructions}\n`;
    content += `*Project guidelines complement but don't override user preferences, memories, or assistant role.*
</project_context>`;

    return content;
  } catch (error) {
    console.error('Workspace context error:', error);
    return null;
  }
}

/**
 * Enhanced meta instructions with memory awareness
 */
async function buildMetaInstructions(): Promise<string> {
  // Get timezone-aware date
  const userLocationData = await getUserLocationData();
  let currentDate: string;

  if (userLocationData?.timezone) {
    const now = new Date();
    currentDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: userLocationData.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } else {
    currentDate = new Date().toISOString().split('T')[0];
  }

  // Check reasoning setting
  const { profile } = await getUserAuthData();
  const includeReasoning = profile?.settings?.personalization?.include_reasoning_in_response === true;

  let content = `<meta_instructions priority="1">
**SYSTEM CONTEXT (Priority: 1)**
**Date:** ${currentDate}${userLocationData?.timezone ? ` | **Timezone:** ${userLocationData.timezone}` : ''} | **Knowledge Cutoff:** January 2025

**Core Directives:**
- You are a helpful AI assistant for the user described in the profile section
- Adapt responses based on user traits and persistent memories while maintaining core capabilities  
- When memories are present in Model Set Context, reference them naturally when relevant
- When project context is present, you're helping with that specific project
- Balance being helpful with following safety guidelines
- Always provide comprehensive, detailed responses which explain your reasoning and have organized sectioned structure

**Memory Integration:**
- Persistent memories appear in the Model Set Context section organized by category
- Profile memories contain user preferences and personal information (stored locally)
- Project/Assistant/Chat memories contain contextual information (stored via memory API)
- Reference memories naturally when they're relevant to the current discussion
- High importance memories (marked with [!]) should be given special consideration
- Never expose the raw memory format to users
</meta_instructions>`;

  return content;
}

/**
 * Build tool guidelines section
 */
function buildToolGuidelines(): string {
  return `<tool_guidelines priority="0">
**TOOL USAGE (Priority: 0 - Platform Safety)**

**Web Search:**
- **Tool:** web_search
- **Activate when:** Explicit requests (search web, look up online) OR current events/recent data needed
- **Citations:** Always cite sources with [Source Name][1] format and include reference URLs

**Canvas Creation:**
- **Tool:** canvas_create
- **Create:** ONLY when user says "use canvas" or "create a document"
- **Response:** Return summary of what was created

**Image Generation:**
- **Tool:** image_gen
- **Mandatory Response:** "I have generated the image, you can view it below."

**Code Interpreter:**
- **Tool:** code_interpreter
- **Mandatory Response:** "I have executed the code, you can view the results below."

**Bio Memory:**
- **Tool:** bio_memory
- **Use:** When user shares important personal information, preferences, or facts to remember
- **Categories:** profile (local storage), project, assistant, chat (API storage)
- **Importance:** low, medium, high (use high for critical user preferences)
- **Note:** Profile memories are stored locally in user settings, others use memory API

**Search Memory:**
- **Tool:** search_memory
- **Use:** When you need to recall specific information about the user
- **Query:** Use natural language to search through saved memories
</tool_guidelines>`;
}

/**
 * Build an optimized system prompt with memory integration
 */
export async function buildStructuredSystemPrompt(
  instructions: string,
  contextData: ContextData,
  options: SystemPromptOptions = {}
): Promise<string> {
  const config: SystemPromptOptions = {
    enableExamples: true,
    enableAntiPatterns: true,
    enableQuantifiedGuidelines: true,
    enableMemories: true,
    ...options,
  };

  const sections: string[] = [];

  // Hierarchy comment
  sections.push(
    `<!-- HIERARCHY: PLATFORM_SAFETY (0) > META (1) > MEMORIES (1.5) > USER (2) > ASSISTANT (3) > PROJECT (4) -->`
  );

  // System hierarchy declaration
  sections.push(`<system_hierarchy>
    <enforcement_levels>
        <level priority="0" type="IMMUTABLE">PLATFORM_SAFETY</level>
        <level priority="1" type="META">META_INSTRUCTIONS</level>
        <level priority="1.5" type="PERSISTENT">MODEL_SET_CONTEXT</level>
        <level priority="2" type="USER">USER_PROFILE</level>
        <level priority="3" type="ASSISTANT">ASSISTANT_ROLE</level>
        <level priority="4" type="CONTEXTUAL">PROJECT_CONTEXT</level>
    </enforcement_levels>
</system_hierarchy>`);

  // Core system behavior
  sections.push(await buildMetaInstructions());

  // Model Set Context (Memories)
  if (config.enableMemories) {
    const modelSetContext = await buildModelSetContext();
    if (modelSetContext) {
      sections.push(modelSetContext);
    }
  }

  // Tool guidelines
  sections.push(buildToolGuidelines());

  // User profile context
  const profileContext = await getProfileContext(config);
  if (profileContext) {
    sections.push(profileContext);
  }

  // Assistant role
  if (instructions?.trim()) {
    const isWorkspaceChat = Boolean(
      contextData?.is_workspace_chat ||
      contextData?.from_workspace_chat ||
      contextData?.workspace_initiated
    );
    sections.push(buildAssistantRole(instructions, isWorkspaceChat));
  }

  // Project context
  const workspaceContext = await getWorkspaceContext(contextData, config);
  if (workspaceContext) {
    sections.push(workspaceContext);
  }

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Build a simple system prompt without memory integration
 */
export function buildSimpleSystemPrompt(instructions: string): string {
  if (!instructions?.trim()) return '';

  return `**ASSISTANT INSTRUCTIONS:**

${instructions.trim()}

**CORE DIRECTIVES:**
- You are a helpful AI assistant
- Provide comprehensive, detailed responses
- Always maintain a professional and helpful tone
- Follow the specific instructions provided above`;
}

/**
 * Cache keys for system prompt components
 */
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `@userProfile:${userId}`,
  WORKSPACE: (workspaceId: string) => `@workspace:${workspaceId}`,
  LOCATION_DATA: '@locationData',
  MEMORIES: (userId: string) => `@memories:${userId}`,
};

/**
 * Clear cached system prompt data
 */
export async function clearSystemPromptCache(userId?: string): Promise<void> {
  try {
    const keys = [
      CACHE_KEYS.LOCATION_DATA,
    ];

    if (userId) {
      keys.push(
        CACHE_KEYS.USER_PROFILE(userId),
        CACHE_KEYS.MEMORIES(userId)
      );
    }

    await Promise.all(keys.map(key => CacheUtils.removeFromStorage(key)));
    console.log('System prompt cache cleared');
  } catch (error) {
    console.error('Error clearing system prompt cache:', error);
  }
}

export default {
  buildStructuredSystemPrompt,
  buildSimpleSystemPrompt,
  clearSystemPromptCache,
  CACHE_KEYS,
}; 