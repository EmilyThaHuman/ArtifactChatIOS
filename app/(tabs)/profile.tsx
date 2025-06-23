import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Calendar, Edit3, LogOut, Settings as SettingsIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Gradients } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { AuthManager } from '@/lib/auth';
import GlassContainer from '@/components/ui/GlassContainer';
import GradientButton from '@/components/ui/GradientButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UserStats {
  totalConversations: number;
  totalFiles: number;
  totalWorkspaces: number;
  joinedDate: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Failed to get user data');
        return;
      }
      
      setUser(user);

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Get user statistics
      const [conversationsResult, filesResult, workspacesResult] = await Promise.all([
        supabase.from('threads').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('workspace_files').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('workspaces').select('id', { count: 'exact' }).eq('user_id', user.id),
      ]);

      setStats({
        totalConversations: conversationsResult.count || 0,
        totalFiles: filesResult.count || 0,
        totalWorkspaces: workspacesResult.count || 0,
        joinedDate: user.created_at,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await AuthManager.signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient colors={Gradients.primary} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={40} color={Colors.textLight} />
            </View>
          </View>
          <Text style={styles.userName}>
            {profile?.full_name || user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderStats = () => {
    if (!stats) return null;

    return (
      <GlassContainer style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalConversations}</Text>
            <Text style={styles.statLabel}>Conversations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalFiles}</Text>
            <Text style={styles.statLabel}>Files</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalWorkspaces}</Text>
            <Text style={styles.statLabel}>Workspaces</Text>
          </View>
        </View>
        <View style={styles.joinedDate}>
          <Calendar size={16} color={Colors.textSecondary} />
          <Text style={styles.joinedDateText}>
            Joined {formatDate(stats.joinedDate)}
          </Text>
        </View>
      </GlassContainer>
    );
  };

  const renderActions = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity style={styles.actionItem}>
        <GlassContainer style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.actionIcon}>
              <Edit3 size={20} color={Colors.primary} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Edit Profile</Text>
              <Text style={styles.actionSubtitle}>Update your name and avatar</Text>
            </View>
          </View>
        </GlassContainer>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.actionItem}
        onPress={() => router.push('/settings')}
      >
        <GlassContainer style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.actionIcon}>
              <SettingsIcon size={20} color={Colors.accent} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Preferences and configuration</Text>
            </View>
          </View>
        </GlassContainer>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem}>
        <GlassContainer style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.actionIcon}>
              <Mail size={20} color={Colors.success} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Support</Text>
              <Text style={styles.actionSubtitle}>Get help and contact us</Text>
            </View>
          </View>
        </GlassContainer>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStats()}
        {renderActions()}
        
        <View style={styles.signOutContainer}>
          <GradientButton
            title="Sign Out"
            onPress={handleSignOut}
            gradient={Gradients.error}
            size="large"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.textLight,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  joinedDate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  joinedDateText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  actionItem: {
    marginBottom: 12,
  },
  actionCard: {
    padding: 16,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signOutContainer: {
    marginBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});