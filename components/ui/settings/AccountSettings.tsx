import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Shield,
  Users,
  Check,
  CreditCard,
  AlertTriangle,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

interface AccountSettingsProps {
  user?: any;
  onClose?: () => void;
}

export default function AccountSettings({ user, onClose }: AccountSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Mock premium status - replace with actual logic
  const isPro = false; // TODO: Replace with actual premium check
  const isTeam = false; // TODO: Replace with actual team check
  
  // Calculate renewal date (next month)
  const renewalDate = new Date();
  renewalDate.setMonth(renewalDate.getMonth() + 1);
  const formattedRenewalDate = renewalDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getPlanTitle = () => {
    if (isTeam) return 'Artifact Team';
    if (isPro) return 'Artifact Pro';
    return 'Artifact Free';
  };

  const getPlanIcon = () => {
    if (isTeam) return <Users size={16} color={Colors.blue400} />;
    if (isPro) return <Shield size={16} color={Colors.blue400} />;
    return null;
  };

  const handleUpgrade = useCallback(() => {
    Alert.alert(
      'Upgrade Plan',
      'Upgrade functionality is not yet implemented in mobile.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleManagePayment = useCallback(() => {
    Alert.alert(
      'Manage Payment',
      'Payment management is not yet implemented in mobile.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleCancelSubscription = useCallback(() => {
    Alert.alert(
      'Cancel Subscription',
      'This will cancel your subscription and permanently delete your account. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            // TODO: Implement account deletion
            setTimeout(() => {
              setIsDeleting(false);
              Alert.alert('Notice', 'Account deletion is not yet implemented in mobile.');
            }, 2000);
          },
        },
      ]
    );
  }, []);

  const renderFeatureItem = useCallback((text: string) => (
    <View key={text} style={styles.featureItem}>
      <Check size={12} color={Colors.textLight} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  ), []);

  const renderFreeFeatures = () => [
    'Diverse and advanced artifact outputs',
    'Access to basic tool library',
    'Limited access to fast free models',
    'Basic feature access',
    '3 deep research searches',
    'Multiple provider models including mistral small, gpt-4o-mini, deepseek-chat and more',
  ];

  const renderProFeatures = () => [
    'Everything in Free, plus:',
    'Professional assistants with specialized capabilities',
    'Access to Personal Project pages',
    'Advanced feature access',
    'Saving and referencing previous chats',
    'Specialized tool access',
    '5 deep research searches per day',
    'Access to complex reasoning models',
  ];

  const renderTeamFeatures = () => [
    'Everything in Pro, plus:',
    'Extended access to deep research',
    'Unlimited access to all advanced reasoning models',
    'Unlimited user collaboration in professional workspaces',
    'Automated assistant tasks enabled in professional workflows',
    'Dedicated account management',
  ];

  return (
    <View style={styles.container}>
      {/* Subscription Section */}
      <View style={styles.section}>
        <View style={styles.planHeader}>
          <View style={styles.planInfo}>
            <View style={styles.planTitleContainer}>
              {getPlanIcon()}
              <Text style={styles.planTitle}>{getPlanTitle()}</Text>
            </View>
            <Text style={styles.planDescription}>
              {isPro || isTeam
                ? `Your plan auto-renews on ${formattedRenewalDate}`
                : `Upgrade to unlock premium features`}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.manageButton}
            onPress={isPro || isTeam ? handleManagePayment : handleUpgrade}
            disabled={isLoading || isDeleting}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.textLight} />
            ) : (
              <>
                <CreditCard size={16} color={Colors.textLight} />
                <Text style={styles.manageButtonText}>
                  {isPro || isTeam ? 'Manage' : 'Upgrade'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isPro ? 'Pro Plan Features' : isTeam ? 'Team Plan Features' : 'Free Plan Features'}
        </Text>
        <Text style={styles.sectionDescription}>
          {isPro
            ? 'For Artifact power users'
            : isTeam
            ? 'For fast-growing teams'
            : "What's included in your current plan"}
        </Text>
        
        <View style={styles.featuresContainer}>
          {(isPro ? renderProFeatures() : isTeam ? renderTeamFeatures() : renderFreeFeatures())
            .map(renderFeatureItem)}
        </View>
      </View>

      {/* Account Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Security</Text>
        <Text style={styles.sectionDescription}>
          Manage your account security and authentication settings
        </Text>
        
        <TouchableOpacity
          style={[styles.securityButton, styles.disabledButton]}
          disabled={true}
        >
          <Shield size={16} color={Colors.gray400} />
          <Text style={styles.disabledButtonText}>Manage security settings</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      {(isPro || isTeam) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <Text style={styles.sectionDescription}>
            Permanently delete your account and cancel your subscription
          </Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleCancelSubscription}
            disabled={isDeleting || isLoading}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.dangerButtonText}>Deleting...</Text>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color={Colors.white} />
                <Text style={styles.dangerButtonText}>Cancel subscription & delete account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray400,
    marginBottom: 16,
    lineHeight: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planInfo: {
    flex: 1,
    marginRight: 16,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  planDescription: {
    fontSize: 14,
    color: Colors.gray400,
    lineHeight: 18,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.purple500,
    borderRadius: 8,
    gap: 6,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    flex: 1,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    fontSize: 14,
    color: Colors.gray400,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.red500,
    borderRadius: 8,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
});