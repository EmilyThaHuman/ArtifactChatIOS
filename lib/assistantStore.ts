import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// Helper function to find the earliest created workspace
const findEarliestWorkspace = (workspaces: any[]) => {
  if (!workspaces || workspaces.length === 0) return null;

  // Sort by created_at date (earliest first) and return the first one
  return (
    workspaces
      .filter((w: any) => w && w.created_at) // Filter out any invalid workspaces
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] ||
    workspaces[0]
  );
};

const STORAGE_KEY = "assistant-storage";

interface Assistant {
  id: string;
  name: string;
  description?: string;
  model: string;
  instructions?: string;
  user_id: string;
  workspace_id?: string;
  workspace_ids: string[];
  tools: any[];
  tool_names: string[];
  metadata?: any;
  avatar_url?: string;
  image_url?: string;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

interface AssistantStore {
  // State
  initialized: boolean;
  initializing: boolean;
  error: string | null;
  initializedFromOnboarding: boolean;
  assistants: Assistant[];
  currentAssistant: Assistant | null;
  currentAssistantId: string | null;
  currentAssistantTitle: string | null;
  workspaceAssistants: Map<string, string[]>;
  assistantTools: any[];
  files: Map<string, any>;
  assistantVectorStores: Map<string, any>;
  isLoading: boolean;
  vectorStores: Map<string, any>;
  vectorStoreFiles: Map<string, any>;

  // Actions
  setCurrentAssistant: (assistant: Assistant | null) => void;
  setInitializedFromOnboarding: (value: boolean) => void;
  setCurrentAssistantId: (assistantId: string | null) => void;
  setCurrentAssistantTitle: (title: string | null) => void;
  setAssistants: (assistants: Assistant[]) => void;
  createTemporaryDefaultAssistant: (userDisplayName?: string) => Promise<Assistant>;
  replaceTemporaryAssistant: (realAssistants: Assistant[]) => boolean;
  initializeAssistants: () => Promise<Assistant[]>;
  createAssistantWithConfig: (config: any) => Promise<Assistant>;
  updateAssistantTools: (assistantId: string, toolsOrUpdateData: any) => Promise<Assistant>;
  updateAssistant: (assistantId: string, updatedAssistant: any) => Promise<Assistant | null>;
  updateCurrentAssistantModel: (newModel: string) => Promise<Assistant | null>;
  getCurrentAssistantModelConfig: () => any;
  deleteAssistant: (assistantId: string) => Promise<boolean>;
  getAssistantsByWorkspace: (workspaceId: string) => Assistant[];
  reconstructAssistantTools: (assistant: Assistant) => Assistant;
  resetStore: () => void;
}

const INITIAL_STATE = {
  initialized: false,
  initializing: false,
  error: null,
  initializedFromOnboarding: false,
  assistants: [],
  currentAssistant: null,
  currentAssistantId: null,
  currentAssistantTitle: null,
  workspaceAssistants: new Map(),
  assistantTools: [],
  files: new Map(),
  assistantVectorStores: new Map(),
  isLoading: false,
  vectorStores: new Map(),
  vectorStoreFiles: new Map(),
};

type PersistedAssistantStore = Omit<AssistantStore, 'workspaceAssistants' | 'files' | 'assistantVectorStores' | 'vectorStores' | 'vectorStoreFiles'> & {
  workspaceAssistants: [string, string[]][];
  files: [string, any][];
  assistantVectorStores: [string, any][];
  vectorStores: [string, any][];
  vectorStoreFiles: [string, any][];
};

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setCurrentAssistant: (assistant) => {
        set({
          currentAssistant: assistant,
          currentAssistantId: assistant?.id || null,
          currentAssistantTitle: assistant?.name || null,
        });
      },

      setInitializedFromOnboarding: (value) => {
        set({ initializedFromOnboarding: value });
      },

      setCurrentAssistantId: (assistantId) => {
        set({ currentAssistantId: assistantId });
      },

      setCurrentAssistantTitle: (title) => {
        set({ currentAssistantTitle: title });
      },

      setAssistants: (assistants) => {
        set({ assistants });
      },

      createTemporaryDefaultAssistant: async (userDisplayName = "User") => {
        try {
          // For React Native, we'll create a simple temporary assistant
          // without complex workspace creation logic for now
          const tempAssistant: Assistant = {
            id: `temp_${Date.now()}`,
            name: `${userDisplayName}'s Personal AI`,
            description: "Your personal AI assistant (setting up your experience...)",
            model: "gpt-4o-mini",
            instructions: `You are ${userDisplayName}'s personal AI assistant. You are helpful, friendly, and knowledgeable.`,
            user_id: '',
            workspace_ids: [],
            tools: [
              {
                type: "function",
                function: {
                  name: "web_search",
                  description: "Search the web for real-time information",
                  parameters: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description: "The search query to look up on the web",
                      },
                    },
                    required: ["query"],
                  },
                },
              },
            ],
            tool_names: ["web_search"],
            metadata: {
              created_from: "temporary_onboarding",
              created_at: new Date().toISOString(),
              is_temporary: "true",
              is_default: "true",
            },
            avatar_url: '',
            image_url: '',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set({
            assistants: [tempAssistant],
            currentAssistant: tempAssistant,
            currentAssistantId: tempAssistant.id,
            currentAssistantTitle: tempAssistant.name,
            initialized: true,
            initializing: false,
            error: null,
          });

          return tempAssistant;
        } catch (error) {
          console.error("❌ Error creating temporary assistant:", error);
          throw error;
        }
      },

      replaceTemporaryAssistant: (realAssistants) => {
        const { assistants, currentAssistant } = get();

        const isCurrentTemporary = currentAssistant?.metadata?.is_temporary === "true";
        const temporaryAssistants = assistants.filter(
          (a) => a.metadata?.is_temporary === "true",
        );
        const hasTemporaryAssistants = temporaryAssistants.length > 0;

        if (
          (isCurrentTemporary || hasTemporaryAssistants) &&
          realAssistants &&
          realAssistants.length > 0
        ) {
          const defaultAssistant = realAssistants.find((a) => a.is_default) || realAssistants[0];

          const nonTemporaryAssistants = assistants.filter(
            (a) => a.metadata?.is_temporary !== "true",
          );

          const existingIds = new Set(nonTemporaryAssistants.map((a) => a.id));
          const newRealAssistants = realAssistants.filter(
            (a) => !existingIds.has(a.id),
          );
          const combinedAssistants = [
            ...nonTemporaryAssistants,
            ...newRealAssistants,
          ];

          set({
            assistants: combinedAssistants,
            currentAssistant: defaultAssistant,
            currentAssistantId: defaultAssistant.id,
            currentAssistantTitle: defaultAssistant.name,
          });

          return true;
        }

        return false;
      },

      initializeAssistants: async () => {
        const { initializedFromOnboarding, assistants } = get();

        if (initializedFromOnboarding && assistants && assistants.length > 0) {
          const hasOnlyTemporary =
            assistants.length === 1 &&
            assistants[0]?.metadata?.is_temporary === "true";

          if (!hasOnlyTemporary) {
            const { currentAssistant } = get();
            if (!currentAssistant) {
              const defaultAssistant = assistants.find((a) => a.is_default) || assistants[0];
              if (defaultAssistant) {
                set({
                  currentAssistant: defaultAssistant,
                  currentAssistantId: defaultAssistant.id,
                  currentAssistantTitle: defaultAssistant.name,
                });
              }
            }
            set({ initialized: true, initializing: false });
            return assistants;
          }
        }

        try {
          set({ initializing: true, error: null });

          // Fetch assistants from Supabase
          const { data: assistantsData, error } = await supabase
            .from('assistants')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching assistants:', error);
            set({ 
              assistants: [],
              currentAssistant: null,
              currentAssistantId: null,
              currentAssistantTitle: null,
              initialized: true,
              error: error.message,
              initializing: false,
            });
            return [];
          }

          const assistants = assistantsData || [];

          // If we have real assistants and currently have a temporary one, replace it
          if (assistants && assistants.length > 0) {
            const wasReplaced = get().replaceTemporaryAssistant(assistants);
            if (wasReplaced) {
              set({ initialized: true, error: null, initializing: false });
              return assistants;
            }
          }

          const defaultAssistant = assistants.find((assistant) => assistant.is_default === true);
          const currentAssistant = defaultAssistant || assistants[0] || null;

          set({
            assistants: assistants,
            currentAssistant: currentAssistant,
            currentAssistantId: currentAssistant?.id || null,
            currentAssistantTitle: currentAssistant?.name || null,
            initialized: true,
            error: null,
            initializing: false,
          });

          return assistants;
        } catch (error: any) {
          console.error('Error initializing assistants:', error);
          set({
            assistants: [],
            currentAssistant: null,
            currentAssistantId: null,
            currentAssistantTitle: null,
            initialized: true,
            error: error.message,
            initializing: false,
          });
          return [];
        } finally {
          set({ initializing: false });
        }
      },

      createAssistantWithConfig: async (config) => {
        set({ isLoading: true, error: null });

        try {
          const {
            name,
            description,
            model = "gpt-4o-mini",
            instructions,
            tools = [],
            metadata = {},
          } = config;

          const toolNames = tools
            .map((tool: any) => {
              if (tool.type === "function") {
                return tool.function?.name;
              }
              return tool.type;
            })
            .filter(Boolean);

          const assistantData = {
            name,
            description: description || "",
            model,
            instructions: instructions || "",
            tools: tools,
            tool_names: toolNames,
            metadata: {
              ...metadata,
              created_at: new Date().toISOString(),
            },
            avatar_url: config.avatar_url || config.image_url || "",
            image_url: config.image_url || config.avatar_url || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_default: Boolean(config.is_default),
          };

          const { data: supabaseAssistant, error: insertError } = await supabase
            .from("assistants")
            .insert(assistantData)
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to create assistant: ${insertError.message}`);
          }

          set((state) => ({
            assistants: [supabaseAssistant, ...state.assistants],
            currentAssistant: supabaseAssistant.is_default ? supabaseAssistant : state.currentAssistant,
            currentAssistantId: supabaseAssistant.is_default ? supabaseAssistant.id : state.currentAssistantId,
            currentAssistantTitle: supabaseAssistant.is_default ? supabaseAssistant.name : state.currentAssistantTitle,
          }));

          return supabaseAssistant;
        } catch (error: any) {
          console.error("Error creating assistant:", error);
          set({ error: error.message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateAssistantTools: async (assistantId, toolsOrUpdateData) => {
        try {
          set({ isLoading: true, error: null });

          const targetAssistant = get().assistants.find((a) => a.id === assistantId);
          if (!targetAssistant) {
            throw new Error(`Assistant with ID ${assistantId} not found`);
          }

          let tools;
          let providedToolNames = null;
          let extraUpdateData = {};

          if (Array.isArray(toolsOrUpdateData)) {
            tools = toolsOrUpdateData;
          } else if (typeof toolsOrUpdateData === "object") {
            tools = toolsOrUpdateData.tools || [];
            providedToolNames = toolsOrUpdateData.tool_names;
            const { tools: _, tool_names: __, ...rest } = toolsOrUpdateData;
            extraUpdateData = rest;
          } else {
            throw new Error("Invalid tools format");
          }

          const toolNames = tools
            .map((tool: any) => tool.type === "function" ? tool.function?.name : tool.type)
            .filter(Boolean);

          const finalToolNames = providedToolNames || toolNames;

          const { data: result, error: updateError } = await supabase
            .from("assistants")
            .update({
              updated_at: new Date().toISOString(),
              tools: tools,
              tool_names: finalToolNames,
              ...extraUpdateData,
            })
            .eq("id", assistantId)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          set((state) => ({
            assistants: state.assistants.map((ast) =>
              ast.id === assistantId ? result : ast
            ),
            currentAssistant: state.currentAssistant?.id === assistantId ? result : state.currentAssistant,
          }));

          return result;
        } catch (error: any) {
          console.error("Error updating assistant tools:", error);
          set({ error: error.message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateAssistant: async (assistantId, updatedAssistant) => {
        if (!assistantId || !updatedAssistant) {
          return null;
        }

        try {
          const existingAssistant = get().assistants.find((a) => a.id === assistantId);
          if (!existingAssistant) {
            throw new Error(`Assistant with ID ${assistantId} not found`);
          }

          const { data: result, error } = await supabase
            .from("assistants")
            .update({
              ...updatedAssistant,
              updated_at: new Date().toISOString(),
            })
            .eq("id", assistantId)
            .select()
            .single();

          if (error) {
            throw error;
          }

          set((state) => ({
            assistants: state.assistants.map((ast) =>
              ast.id === assistantId ? result : ast
            ),
            currentAssistant: state.currentAssistant?.id === assistantId ? result : state.currentAssistant,
          }));

          return result;
        } catch (error: any) {
          console.error("Error updating assistant:", error);
          set({ error: error.message });
          throw error;
        }
      },

      updateCurrentAssistantModel: async (newModel: string) => {
        const currentAssistant = get().currentAssistant;
        if (!currentAssistant) {
          console.warn('No current assistant to update model for');
          return null;
        }

        try {
          console.log(`🔄 Updating assistant ${currentAssistant.id} model to ${newModel}`);
          
          // Determine provider based on model
          const getProviderForModel = (modelName: string): string => {
            if (!modelName) return 'openai';
            const lowerModel = modelName.toLowerCase();
            
            if (lowerModel.includes('gpt') || lowerModel.includes('o1') || lowerModel.includes('dall-e')) {
              return 'openai';
            }
            if (lowerModel.includes('claude')) {
              return 'anthropic';
            }
            if (lowerModel.includes('gemini') || lowerModel.includes('palm') || lowerModel.includes('bison')) {
              return 'gemini';
            }
            if (lowerModel.includes('mistral') || lowerModel.includes('mixtral')) {
              return 'mistral';
            }
            if (lowerModel.includes('deepseek')) {
              return 'deepseek';
            }
            if (lowerModel.includes('grok') || lowerModel.includes('xai')) {
              return 'xai';
            }
            if (lowerModel.includes('llama') || lowerModel.includes('mixtral-8x7b')) {
              return 'groq';
            }
            if (lowerModel.includes('command') || lowerModel.includes('cohere')) {
              return 'cohere';
            }
            if (lowerModel.includes('sonar') || lowerModel.includes('perplexity')) {
              return 'perplexity';
            }
            return 'openai';
          };

          const newProvider = getProviderForModel(newModel);
          
          const updatedMetadata = {
            ...currentAssistant.metadata,
            provider: newProvider,
            model_provider: newProvider,
            updated_at: new Date().toISOString(),
          };

          const { data: result, error } = await supabase
            .from("assistants")
            .update({
              model: newModel,
              metadata: updatedMetadata,
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentAssistant.id)
            .select()
            .single();

          if (error) {
            throw error;
          }

          console.log(`✅ Successfully updated assistant model to ${newModel}`);

          set((state) => ({
            assistants: state.assistants.map((ast) =>
              ast.id === currentAssistant.id ? result : ast
            ),
            currentAssistant: result,
          }));

          return result;
        } catch (error: any) {
          console.error("❌ Error updating assistant model:", error);
          set({ error: error.message });
          throw error;
        }
      },

      getCurrentAssistantModelConfig: () => {
        const currentAssistant = get().currentAssistant;
        return currentAssistant?.model || null;
      },

      deleteAssistant: async (assistantId) => {
        try {
          set({ isLoading: true, error: null });

          if (get().assistants.length <= 1) {
            throw new Error("You're required to have at least one assistant");
          }

          const { error } = await supabase
            .from("assistants")
            .delete()
            .eq("id", assistantId);

          if (error) {
            throw error;
          }

          set((state) => ({
            assistants: state.assistants.filter((a) => a.id !== assistantId),
            ...(state.currentAssistant?.id === assistantId
              ? {
                  currentAssistant: null,
                  currentAssistantId: null,
                  currentAssistantTitle: null,
                }
              : {}),
          }));

          return true;
        } catch (error: any) {
          console.error("Error deleting assistant:", error);
          set({ error: error.message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      getAssistantsByWorkspace: (workspaceId) => {
        const { assistants, workspaceAssistants } = get();

        if (workspaceAssistants.has(workspaceId)) {
          const assistantIds = workspaceAssistants.get(workspaceId) || [];
          return assistants.filter((assistant) => assistantIds.includes(assistant.id));
        }

        return assistants.filter(
          (assistant) =>
            assistant &&
            Array.isArray(assistant.workspace_ids) &&
            assistant.workspace_ids.includes(workspaceId),
        );
      },

      reconstructAssistantTools: (assistant) => {
        // Assistants already come with proper tools from the API
        return assistant;
      },

      resetStore: () => {
        set(INITIAL_STATE);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: async (key: string) => {
          try {
            const value = await import('@react-native-async-storage/async-storage').then(module => 
              module.default.getItem(key)
            );
            return value;
          } catch {
            return null;
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            await import('@react-native-async-storage/async-storage').then(module => 
              module.default.setItem(key, value)
            );
          } catch {
            // Silently fail
          }
        },
        removeItem: async (key: string) => {
          try {
            await import('@react-native-async-storage/async-storage').then(module => 
              module.default.removeItem(key)
            );
          } catch {
            // Silently fail
          }
        },
      })),
      partialize: (state): Partial<PersistedAssistantStore> => {
        return {
          ...state,
          vectorStores: state.vectorStores ? Array.from(state.vectorStores.entries()) : [],
          vectorStoreFiles: state.vectorStoreFiles ? Array.from(state.vectorStoreFiles.entries()) : [],
          files: state.files ? Array.from(state.files.entries()) : [],
          assistantVectorStores: state.assistantVectorStores ? Array.from(state.assistantVectorStores.entries()) : [],
          workspaceAssistants: state.workspaceAssistants ? Array.from(state.workspaceAssistants.entries()) : [],
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Maps
          if (Array.isArray(state.workspaceAssistants)) {
            state.workspaceAssistants = new Map(state.workspaceAssistants as [string, string[]][]);
          } else {
            state.workspaceAssistants = new Map();
          }
          
          if (Array.isArray(state.vectorStores)) {
            state.vectorStores = new Map(state.vectorStores as [string, any][]);
          } else {
            state.vectorStores = new Map();
          }
          
          if (Array.isArray(state.vectorStoreFiles)) {
            state.vectorStoreFiles = new Map(state.vectorStoreFiles as [string, any][]);
          } else {
            state.vectorStoreFiles = new Map();
          }
          
          if (Array.isArray(state.files)) {
            state.files = new Map(state.files as [string, any][]);
          } else {
            state.files = new Map();
          }
          
          if (Array.isArray(state.assistantVectorStores)) {
            state.assistantVectorStores = new Map(state.assistantVectorStores as [string, any][]);
          } else {
            state.assistantVectorStores = new Map();
          }
        }
      },
    },
  ),
);

// Default export for compatibility
export default useAssistantStore; 