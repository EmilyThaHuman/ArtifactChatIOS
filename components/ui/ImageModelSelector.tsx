import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { ChevronDown, Sparkles } from 'lucide-react-native';
import { 
  AVAILABLE_IMAGE_MODELS, 
  DEFAULT_IMAGE_MODEL, 
  IMAGE_PROVIDERS,
  ImageModelInfo, 
  ImageModelProvider 
} from '@/constants/ImageModels';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageModelSelectorProps {
  selectedModel: ImageModelInfo;
  onModelSelect: (model: ImageModelInfo) => void;
  disabled?: boolean;
}

const ImageModelSelector: React.FC<ImageModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  disabled = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ImageModelProvider | 'all'>('all');

  const providers: (ImageModelProvider | 'all')[] = ['all', 'openai', 'fal', 'google', 'xai'];

  const filteredModels = selectedProvider === 'all' 
    ? AVAILABLE_IMAGE_MODELS 
    : AVAILABLE_IMAGE_MODELS.filter(model => model.provider === selectedProvider);

  const handleModelSelect = (model: ImageModelInfo) => {
    onModelSelect(model);
    setShowModal(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'premium': return '#FFD700';
      case 'fast': return '#00FF88';
      case 'beta': return '#FF6B6B';
      default: return '#8B5CF6';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'premium': return 'Premium';
      case 'fast': return 'Fast';
      case 'beta': return 'Beta';
      default: return 'Standard';
    }
  };

  const renderProviderFilter = () => (
    <View style={styles.providerFilterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.providerScrollView}
      >
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider}
            style={[
              styles.providerFilterButton,
              selectedProvider === provider && styles.selectedProviderFilter
            ]}
            onPress={() => setSelectedProvider(provider)}
          >
            <Text style={[
              styles.providerFilterText,
              selectedProvider === provider && styles.selectedProviderFilterText
            ]}>
              {provider === 'all' ? 'All' : IMAGE_PROVIDERS[provider as ImageModelProvider]?.name || provider}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderModelItem = (model: ImageModelInfo) => (
    <TouchableOpacity
      key={model.id}
      style={[
        styles.modelItem,
        selectedModel.id === model.id && styles.selectedModelItem
      ]}
      onPress={() => handleModelSelect(model)}
      activeOpacity={0.7}
    >
      <View style={styles.modelItemHeader}>
        <View style={styles.modelNameContainer}>
          <Text style={styles.modelEmoji}>{model.icon}</Text>
          <View style={styles.modelTextContainer}>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelProvider}>
              {IMAGE_PROVIDERS[model.provider]?.name || model.provider}
            </Text>
          </View>
        </View>
        
        <View style={[
          styles.categoryBadge,
          { backgroundColor: getCategoryColor(model.category) }
        ]}>
          <Text style={styles.categoryText}>{getCategoryLabel(model.category)}</Text>
        </View>
      </View>
      
      <Text style={styles.modelDescription}>{model.description}</Text>
      
      <View style={styles.modelFeatures}>
        <Text style={styles.featureText}>
          {model.maxImages} image{model.maxImages > 1 ? 's' : ''} max
        </Text>
        {model.supportsEditing && (
          <Text style={styles.featureText}>• Editing support</Text>
        )}
      </View>
      
      {selectedModel.id === model.id && (
        <View style={styles.selectedIndicator}>
          <Sparkles size={16} color={Colors.purple500} />
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          disabled && styles.disabledButton
        ]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.selectorEmoji}>{selectedModel.icon}</Text>
          <View style={styles.selectorTextContainer}>
            <Text style={styles.selectorTitle}>Image Model</Text>
            <Text style={styles.selectorModel}>{selectedModel.name}</Text>
          </View>
        </View>
        <ChevronDown size={20} color="#666666" />
      </TouchableOpacity>

      {/* Model Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Image Model</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Provider Filter */}
          {renderProviderFilter()}

          {/* Models List */}
          <ScrollView 
            style={styles.modelsList}
            showsVerticalScrollIndicator={false}
          >
            {filteredModels.map(renderModelItem)}
            
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
  disabledButton: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  selectorModel: {
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
  
  // Provider filter
  providerFilterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  providerScrollView: {
    paddingHorizontal: 20,
  },
  providerFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444444',
  },
  selectedProviderFilter: {
    backgroundColor: Colors.purple500,
    borderColor: Colors.purple600,
  },
  providerFilterText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedProviderFilterText: {
    color: '#ffffff',
  },
  
  // Models list
  modelsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modelItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedModelItem: {
    borderColor: Colors.purple500,
    backgroundColor: '#1f1a2e',
  },
  modelItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modelNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modelEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  modelTextContainer: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  modelProvider: {
    fontSize: 12,
    color: '#999999',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  modelDescription: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 20,
  },
  modelFeatures: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#999999',
    marginRight: 8,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  selectedText: {
    fontSize: 12,
    color: Colors.purple500,
    fontWeight: '600',
    marginLeft: 4,
  },
  bottomPadding: {
    height: 40,
  },
});

export default ImageModelSelector;