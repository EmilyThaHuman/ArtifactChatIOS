import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Settings2, Search, Image as ImageIcon, Palette, X, Check } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface ToolSelectorProps {
  onToolChange?: (toolId: string | null) => void;
  onStyleSelection?: (toolId: string, style: any) => void;
  isLimitedMode?: boolean;
  disableTools?: boolean;
  onShowAuthOverlay?: (feature: string) => void;
}

interface Tool {
  id: string;
  name: string;
  icon: any;
  category: string;
}

interface ImageStyle {
  name: string;
  value: string;
  imageUrl: string;
  prompt: string;
}

// Tool definitions matching web app
const AVAILABLE_TOOLS: Tool[] = [
  {
    id: 'web_search',
    name: 'Web Search',
    icon: Search,
    category: 'web',
  },
  {
    id: 'image_gen',
    name: 'Create Image',
    icon: ImageIcon,
    category: 'creative',
  },
];

// Image styles matching web app (using placeholder images for now)
const IMAGE_STYLES: ImageStyle[] = [
  {
    name: 'Cyberpunk',
    value: 'cyberpunk',
    imageUrl: 'https://via.placeholder.com/64x64/8B5CF6/FFFFFF?text=C',
    prompt: 'Create an image in a cyberpunk aesthetic: vivid neon accents, futuristic textures, glowing details, and high-contrast lighting.',
  },
  {
    name: 'Anime',
    value: 'anime',
    imageUrl: 'https://via.placeholder.com/64x64/3B82F6/FFFFFF?text=A',
    prompt: 'Create an image in a detailed anime aesthetic: expressive eyes, smooth cel-shaded coloring, and clean linework.',
  },
  {
    name: 'Dramatic Headshot',
    value: 'headshot',
    imageUrl: 'https://via.placeholder.com/64x64/EF4444/FFFFFF?text=D',
    prompt: 'Create an ultra-realistic high-contrast black-and-white headshot, close up, black shadow background, 35mm lens, 4K quality.',
  },
  {
    name: 'Coloring Book',
    value: 'coloring-book',
    imageUrl: 'https://via.placeholder.com/64x64/22C55E/FFFFFF?text=CB',
    prompt: 'Create an image in a children\'s coloring book style: bold, even black outlines on white, no shading or tone.',
  },
  {
    name: 'Photo Shoot',
    value: 'photoshoot',
    imageUrl: 'https://via.placeholder.com/64x64/F59E0B/FFFFFF?text=P',
    prompt: 'Create an ultra-realistic professional photo shoot with soft lighting.',
  },
  {
    name: 'Retro Cartoon',
    value: 'retro',
    imageUrl: 'https://via.placeholder.com/64x64/A855F7/FFFFFF?text=R',
    prompt: 'Create a retro 1950s cartoon style image, minimal vector art, Art Deco inspired, clean flat colors.',
  },
];

export function ToolSelector({
  onToolChange,
  onStyleSelection,
  isLimitedMode = false,
  disableTools = false,
  onShowAuthOverlay,
}: ToolSelectorProps) {
  const [isToolsModalVisible, setIsToolsModalVisible] = useState(false);
  const [isStylesModalVisible, setIsStylesModalVisible] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle | null>(null);

  const handleToolToggle = useCallback((toolId: string) => {
    if (isLimitedMode || disableTools) {
      setIsToolsModalVisible(false);
      if (onShowAuthOverlay) {
        onShowAuthOverlay(toolId === 'web_search' ? 'Web Search' : 'Image Generation');
      } else {
        Alert.alert('Feature Locked', 'Please upgrade to access this feature.');
      }
      return;
    }

    const isCurrentlyActive = activeToolId === toolId;
    
    if (isCurrentlyActive) {
      // Toggle off
      setActiveToolId(null);
      onToolChange?.(null);
    } else {
      // Toggle on
      setActiveToolId(toolId);
      onToolChange?.(toolId);
    }
    
    setIsToolsModalVisible(false);
  }, [activeToolId, isLimitedMode, disableTools, onToolChange, onShowAuthOverlay]);

  const handleStyleSelect = useCallback((style: ImageStyle) => {
    setSelectedStyle(style);
    setIsStylesModalVisible(false);
    
    if (onStyleSelection) {
      onStyleSelection('image_gen', {
        style: style.value,
        stylePrompt: style.prompt,
      });
    }
  }, [onStyleSelection]);

  const activeTool = useMemo(() => {
    return AVAILABLE_TOOLS.find(tool => tool.id === activeToolId);
  }, [activeToolId]);

  const renderToolButton = (tool: Tool) => {
    const isActive = activeToolId === tool.id;
    const IconComponent = tool.icon;

    return (
      <TouchableOpacity
        key={tool.id}
        style={[
          styles.toolButton,
          isActive && styles.toolButtonActive,
        ]}
        onPress={() => handleToolToggle(tool.id)}
      >
        <IconComponent 
          size={16} 
          color={isActive ? Colors.purple500 : '#6b7280'} 
        />
        <Text style={[
          styles.toolButtonText,
          isActive && styles.toolButtonTextActive,
        ]}>
          {tool.name}
        </Text>
        
        {isActive && (
          <Check size={12} color={Colors.purple500} />
        )}
      </TouchableOpacity>
    );
  };

  const renderStyleButton = (style: ImageStyle) => (
    <TouchableOpacity
      key={style.value}
      style={styles.styleButton}
      onPress={() => handleStyleSelect(style)}
    >
      <Image
        source={{ uri: style.imageUrl }}
        style={styles.styleImage}
        resizeMode="cover"
      />
      <Text style={styles.styleText} numberOfLines={2}>
        {style.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tools Button */}
      <TouchableOpacity
        style={styles.toolsButton}
        onPress={() => setIsToolsModalVisible(true)}
      >
        <Settings2 size={20} color="#ffffff" />
      </TouchableOpacity>

      {/* Active Tool Badge */}
      {activeTool && (
        <View style={styles.badgeContainer}>
          <View style={styles.toolBadge}>
            <activeTool.icon size={12} color={Colors.purple500} />
            <Text style={styles.badgeText}>
              {activeTool.name === 'Search the web' ? 'Search' : 'Image'}
            </Text>
            <TouchableOpacity
              style={styles.badgeCloseButton}
              onPress={() => {
                setActiveToolId(null);
                onToolChange?.(null);
              }}
            >
              <X size={10} color={Colors.purple500} />
            </TouchableOpacity>
          </View>

          {/* Styles Button for Image Generation */}
          {activeTool.id === 'image_gen' && (
            <TouchableOpacity
              style={styles.stylesBadge}
              onPress={() => setIsStylesModalVisible(true)}
            >
              <Palette size={12} color={Colors.purple500} />
              <Text style={styles.badgeText}>Styles</Text>
              <View style={styles.chevronDown}>
                <Text style={styles.chevronText}>▼</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tools Selection Modal */}
      <Modal
        visible={isToolsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsToolsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsToolsModalVisible(false)}
        >
          <View style={styles.toolsModal}>
            <Text style={styles.modalTitle}>Tools</Text>
            {AVAILABLE_TOOLS.map(renderToolButton)}
            
            {(isLimitedMode || disableTools) && (
              <View style={styles.upgradePrompt}>
                <Text style={styles.upgradeText}>
                  Sign in to access advanced tools
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Styles Selection Modal */}
      <Modal
        visible={isStylesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStylesModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsStylesModalVisible(false)}
        >
          <View style={styles.stylesModal}>
            <Text style={styles.modalTitle}>Image Styles</Text>
            <ScrollView contentContainerStyle={styles.stylesGrid}>
              {IMAGE_STYLES.map(renderStyleButton)}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolsButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
  },
  stylesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.purple500,
  },
  badgeCloseButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronDown: {
    marginLeft: 2,
  },
  chevronText: {
    fontSize: 8,
    color: Colors.purple500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    minWidth: 220,
    maxWidth: 280,
    marginHorizontal: 20,
  },
  stylesModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: 320,
    maxHeight: 400,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 2,
  },
  toolButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  toolButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  toolButtonTextActive: {
    color: Colors.purple500,
  },
  upgradePrompt: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  upgradeText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  styleButton: {
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
  },
  styleImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  styleText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    maxWidth: 64,
  },
});

export default ToolSelector; 