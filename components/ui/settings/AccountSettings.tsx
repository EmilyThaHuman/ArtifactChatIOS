import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  CreditCard,
  Star,
  RotateCcw,
  Check,
  Users,
  Shield,
  Trash2,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface AccountSettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function AccountSettings({ user, onClose }: AccountSettingsProps) {
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    plan: 'Free',
    status: 'active',
    renewalDate: null,
    features: [],
  });

  useEffect(() => {
    loadSubscriptionInfo();
  }, [user]);

  const loadSubscriptionInfo = async () => {
    if (!user?.id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      if (profile?.settings?.subscription) {
        setSubscriptionInfo(prev => ({
          ...prev,
          ...profile.settings.subscription,
        }));
      }
    } catch (error) {
      console.error('Error loading subscription info:', error);
    }
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Pro',
      'This feature will redirect to the pricing page in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleRestorePurchases = () => {
    Alert.alert(
      'Restore Purchases',
      'Checking for previous purchases...',
      [{ text: 'OK' }]
    );
  };

  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'This will open your subscription management page.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Account Deletion',
              'Account deletion will be implemented in a future update.',
              [{ text: 'OK' }]
            );
          }
        },
      ]
    );
  };

  const isPro = subscriptionInfo.plan === 'Pro';
  const isTeam = subscriptionInfo.plan === 'Team';

  const getFreeFeatures = () => [
    'Diverse and advanced artifact outputs',
    'Access to basic tool library',
    'Limited access to fast free models',
    'Basic feature access',
    '3 deep research searches',
    'Multiple provider models including mistral small, gpt-4o-mini, deepseek-chat and more',
  ];

  const getProFeatures = () => [
    'Everything in Free, plus:',
    'Professional assistants with specialized capabilities',
    'Access to Personal Project pages',
    'Advanced feature access',
    'Saving and referencing previous chats',
    'Specialized tool access',
    '5 deep research searches per day',
    'Access to complex reasoning models',
  ];

  const getTeamFeatures = () => [
    'Everything in Pro, plus:',
    'Extended access to deep research',
    'Unlimited access to all advanced reasoning models',
    'Unlimited user collaboration in professional workspaces',
    'Automated assistant tasks enabled in professional workflows',
    'Dedicated account management',
  ];

  const getCurrentFeatures = () => {
    if (isTeam) return getTeamFeatures();
    if (isPro) return getProFeatures();
    return getFreeFeatures();
  };

  const getPlanIcon = () => {
    if (isTeam) return <Users size={20} color="#3b82f6" />;
    if (isPro) return <Shield size={20} color="#3b82f6" />;
    return null;
  };

  const formatRenewalDate = () => {
    if (!subscriptionInfo.renewalDate) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return new Date(subscriptionInfo.renewalDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Subscription Section */}
      <View style={styles.section}>
        <View style={styles.planHeader}>
          <View style={styles.planInfo}>
            <View style={styles.planTitleRow}>
              {getPlanIcon()}
              <Text style={styles.planTitle}>
                Artifact {subscriptionInfo.plan}
              </Text>
            </View>
            <Text style={styles.planDescription}>
              Your plan auto-renews on {formatRenewalDate()}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={isPro || isTeam ? handleManageSubscription : handleUpgrade}
          >
            <Text style={styles.manageButtonText}>
              {isPro || isTeam ? 'Manage' : 'Upgrade'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      {!isPro && !isTeam && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUpgrade}>
            <Star size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Upgrade to Artifact Pro</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRestorePurchases}>
          <RotateCcw size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {subscriptionInfo.plan} Plan Features
        </Text>
        <Text style={styles.sectionDescription}>
          {isTeam ? 'For fast-growing teams' : 
           isPro ? 'For Artifact power users' : 
           'What\'s included in your current plan'}
        </Text>
        
        <View style={styles.featuresList}>
          {getCurrentFeatures().map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Check size={16} color="#3b82f6" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Account Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Security</Text>
        <Text style={styles.sectionDescription}>
          Manage your account security and authentication settings
        </Text>
        
        <View style={styles.securityInfo}>
          <Shield size={24} color="#3b82f6" />
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Account Protected</Text>
            <Text style={styles.securityDescription}>
              Your account is secured with industry-standard encryption and security measures.
            </Text>
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDescription}>
          These actions are irreversible. Please proceed with caution.
        </Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
          <Trash2 size={20} color="#ef4444" />
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planInfo: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  planDescription: {
    fontSize: 13,
    color: '#9ca3af',
  },
  manageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    flex: 1,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: 12,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  dangerSection: {
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#fca5a5',
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 12,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
});