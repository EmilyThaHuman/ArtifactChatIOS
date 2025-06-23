import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageCircle, Clock, Users } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { Colors } from '@/constants/Colors';
import GlassContainer from '../ui/GlassContainer';

interface ConversationCardProps {
  id: string;
  title: string;
  summary?: string;
  messageCount: number;
  lastMessageAt?: string;
  onPress: () => void;
}

export default function ConversationCard({
  id,
  title,
  summary,
  messageCount,
  lastMessageAt,
  onPress
}: ConversationCardProps) {
  const lastActivity = lastMessageAt 
    ? formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })
    : 'No activity';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassContainer style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MessageCircle size={20} color={Colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.metadata}>
              <View style={styles.metadataItem}>
                <Clock size={12} color={Colors.textSecondary} />
                <Text style={styles.metadataText}>{lastActivity}</Text>
              </View>
              <View style={styles.metadataItem}>
                <Users size={12} color={Colors.textSecondary} />
                <Text style={styles.metadataText}>{messageCount} messages</Text>
              </View>
            </View>
          </View>
        </View>
        
        {summary && (
          <Text style={styles.summary} numberOfLines={3}>
            {summary}
          </Text>
        )}
      </GlassContainer>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});