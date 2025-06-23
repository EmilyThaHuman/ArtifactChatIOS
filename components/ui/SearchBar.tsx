import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import GlassContainer from './GlassContainer';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  autoFocus?: boolean;
}

export default function SearchBar({
  placeholder = 'Search conversations, files, and more...',
  value,
  onChangeText,
  onSubmit,
  autoFocus = false
}: SearchBarProps) {
  const [searchText, setSearchText] = useState(value || '');

  const handleTextChange = (text: string) => {
    setSearchText(text);
    onChangeText?.(text);
  };

  const handleClear = () => {
    setSearchText('');
    onChangeText?.('');
  };

  const handleSubmit = () => {
    onSubmit?.(searchText);
  };

  return (
    <GlassContainer style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          value={searchText}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmit}
          autoFocus={autoFocus}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});