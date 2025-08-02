import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { ChevronDown, Sparkles, Palette } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ImageStyle {
  name: string;
  value: string;
  imageUrl: any; // Can be require() or URI string
  prompt: string;
  category?: 'artistic' | 'photography' | 'illustration' | 'vintage';
}

// Enhanced image style options using kitty images
export const IMAGE_STYLES: ImageStyle[] = [
  // Artistic styles
  {
    name: "Cyberpunk",
    value: "cyberpunk",
    imageUrl: require("@/assets/images/kitties/cyberpunk.webp"),
    prompt: "Create an image in a cyberpunk aesthetic: vivid neon accents, futuristic textures, glowing details, and high-contrast lighting.",
    category: "artistic",
  },
  {
    name: "Anime",
    value: "anime",
    imageUrl: require("@/assets/images/kitties/anime.webp"),
    prompt: "Create an image in a detailed anime aesthetic: expressive eyes, smooth cel-shaded coloring, and clean linework. Emphasize emotion and character presence, with a sense of motion or atmosphere typical of anime scenes.",
    category: "illustration",
  },
  {
    name: "Art Nouveau",
    value: "art-nouveau",
    imageUrl: require("@/assets/images/kitties/art-nouveu.webp"),
    prompt: "Create an image in an Art Nouveau style: flowing lines, organic shapes, floral motifs, and soft, decorative elegance.",
    category: "artistic",
  },
  {
    name: "Synthwave",
    value: "synthwave",
    imageUrl: require("@/assets/images/kitties/synthwave.webp"),
    prompt: "Create an image in a synthwave aesthetic: retro-futuristic 1980s vibe with neon grids, glowing sunset, vibrant magenta-and-cyan gradients, chrome highlights, and a nostalgic outrun atmosphere.",
    category: "artistic",
  },
  
  // Photography styles
  {
    name: "Dramatic Headshot",
    value: "headshot",
    imageUrl: require("@/assets/images/kitties/headshot.webp"),
    prompt: "Create an ultra-realistic high-contrast black-and-white headshot, close up, black shadow background, 35mm lens, 4K quality, aspect ratio 4:3.",
    category: "photography",
  },
  {
    name: "Photo Shoot",
    value: "photoshoot",
    imageUrl: require("@/assets/images/kitties/photoshoot.webp"),
    prompt: "Create an ultra-realistic professional photo shoot with soft lighting.",
    category: "photography",
  },
  
  // Illustration styles
  {
    name: "Coloring Book",
    value: "coloring-book",
    imageUrl: require("@/assets/images/kitties/coloring-book.webp"),
    prompt: "Create an image in a children's coloring book style: bold, even black outlines on white, no shading or tone. Simplify textures into playful, easily recognizable shapes.",
    category: "illustration",
  },
  
  // Vintage styles
  {
    name: "Retro Cartoon",
    value: "retro",
    imageUrl: require("@/assets/images/kitties/retro.webp"),
    prompt: "Create a retro 1950s cartoon style image, minimal vector art, Art Deco inspired, clean flat colors, geometric shapes, mid-century modern design, elegant silhouettes, UPA style animation, smooth lines, limited color palette (black, red, beige, brown, white), grainy paper texture background, vintage jazz club atmosphere, subtle lighting, slightly exaggerated character proportions, classy and stylish mood.",
    category: "vintage",
  },
  {
    name: "80s Glam",
    value: "80s",
    imageUrl: require("@/assets/images/kitties/80s.webp"),
    prompt: "Create a selfie styled like a cheesy 1980s mall glamour shot, foggy soft lighting, teal and magenta lasers in the background, feathered hair, shoulder pads, portrait studio vibes, ironic 'glam 4 life' caption.",
    category: "vintage",
  },
];

interface ImageStyleSelectorProps {
  selectedStyle: ImageStyle | null;
  onStyleSelect: (style: ImageStyle | null) => void;
  disabled?: boolean;
}

const ImageStyleSelector: React.FC<ImageStyleSelectorProps> = ({
  selectedStyle,
  onStyleSelect,
  disabled = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'artistic', 'photography', 'illustration', 'vintage'];

  const filteredStyles = selectedCategory === 'all' 
    ? IMAGE_STYLES 
    : IMAGE_STYLES.filter(style => style.category === selectedCategory);

  const handleStyleSelect = (style: ImageStyle) => {
    onStyleSelect(style);
    setShowModal(false);
  };

  const handleClearStyle = () => {
    onStyleSelect(null);
    setShowModal(false);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'artistic': return 'Artistic';
      case 'photography': return 'Photography';
      case 'illustration': return 'Illustration';
      case 'vintage': return 'Vintage';
      default: return 'All Styles';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'artistic': return '#FF6B6B';
      case 'photography': return '#4ECDC4';
      case 'illustration': return '#45B7D1';
      case 'vintage': return '#FFA726';
      default: return Colors.purple500;
    }
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollView}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryFilterButton,
              selectedCategory === category && styles.selectedCategoryFilter
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryFilterText,
              selectedCategory === category && styles.selectedCategoryFilterText
            ]}>
              {getCategoryLabel(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStyleItem = (style: ImageStyle) => {
    const isSelected = selectedStyle?.value === style.value;
    const itemWidth = (SCREEN_WIDTH - 60) / 2; // 2 items per row with margins

    return (
      <TouchableOpacity
        key={style.value}
        style={[
          styles.styleItem,
          { width: itemWidth },
          isSelected && styles.selectedStyleItem
        ]}
        onPress={() => handleStyleSelect(style)}
        activeOpacity={0.7}
      >
        <View style={styles.styleImageContainer}>
          <Image 
            source={style.imageUrl} 
            style={styles.styleImage}
            resizeMode="cover"
          />
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <Sparkles size={24} color="#ffffff" />
            </View>
          )}
          {style.category && (
            <View style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(style.category) }
            ]}>
              <Text style={styles.categoryBadgeText}>
                {getCategoryLabel(style.category)}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.styleName}>{style.name}</Text>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Sparkles size={12} color={Colors.purple500} />
            <Text style={styles.selectedText}>Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          disabled && styles.disabledButton,
          selectedStyle && styles.activeSelector
        ]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <Palette size={20} color={selectedStyle ? Colors.purple500 : "#666666"} />
          <View style={styles.selectorTextContainer}>
            <Text style={styles.selectorTitle}>Style</Text>
            <Text style={styles.selectorStyle}>
              {selectedStyle ? selectedStyle.name : 'Default'}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color="#666666" />
      </TouchableOpacity>

      {/* Style Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Image Style</Text>
            <View style={styles.headerButtons}>
              {selectedStyle && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearStyle}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter */}
          {renderCategoryFilter()}

          {/* Styles Grid */}
          <ScrollView 
            style={styles.stylesList}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stylesGrid}>
              {filteredStyles.map(renderStyleItem)}
            </View>
            
            {/* Bottom padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#333333',
  },
  activeSelector: {
    borderColor: Colors.purple500,
    backgroundColor: '#1f1a2e',
  },
  disabledButton: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  selectorTitle: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  selectorStyle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#333333',
    borderRadius: 8,
    marginRight: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.purple500,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Category filter
  categoryFilterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  categoryScrollView: {
    paddingHorizontal: 20,
  },
  categoryFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444444',
  },
  selectedCategoryFilter: {
    backgroundColor: Colors.purple500,
    borderColor: Colors.purple600,
  },
  categoryFilterText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCategoryFilterText: {
    color: '#ffffff',
  },
  
  // Styles grid
  stylesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  styleItem: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStyleItem: {
    borderColor: Colors.purple500,
  },
  styleImageContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  styleImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  styleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 8,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  selectedText: {
    fontSize: 10,
    color: Colors.purple500,
    fontWeight: '600',
    marginLeft: 4,
  },
  bottomPadding: {
    height: 40,
  },
});

export default ImageStyleSelector;