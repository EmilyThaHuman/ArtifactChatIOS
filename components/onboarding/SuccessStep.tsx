import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CheckCircle, AlertCircle } from 'lucide-react-native';
import { useStripe } from '../../lib/stripe';
import { AuthManager } from '../../lib/auth';
import { Colors } from '../../constants/Colors';
import { GradientButton } from '../ui/GradientButton';

interface SuccessStepProps {
  onSuccess: () => void;
  sessionId?: string;
}

export default function SuccessStep({ onSuccess, sessionId }: SuccessStepProps) {
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(!sessionId); // If no sessionId, assume regular success
  const {
    checkSubscriptionProcessingStatus,
    saveSubscriptionToProfile,
  } = useStripe();

  useEffect(() => {
    if (sessionId) {
      processCheckoutSuccess();
    }
  }, [sessionId]);

  const processCheckoutSuccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { user } = await AuthManager.getCurrentUser();
      if (!user) {
        throw new Error('No user found. Please log in again.');
      }

      // Check subscription processing status
      const result = await checkSubscriptionProcessingStatus(sessionId!);
      
      if (result.success && result.subscriptionData) {
        // Save subscription to user profile
        const saveResult = await saveSubscriptionToProfile(
          user.id,
          result.subscriptionData
        );

        if (saveResult.success) {
          console.log('✅ Subscription setup completed successfully');
          setSuccess(true);
        } else {
          throw new Error(saveResult.error || 'Failed to save subscription');
        }
      } else {
        throw new Error(result.error || 'Failed to process subscription');
      }
    } catch (error) {
      console.error('❌ Error processing checkout success:', error);
      setError(error instanceof Error ? error.message : 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (sessionId) {
      processCheckoutSuccess();
    } else {
      setError(null);
      setSuccess(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Processing your subscription...</Text>
          <Text style={styles.loadingSubtext}>
            Please wait while we set up your account.
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.errorIcon}>
            <AlertCircle size={64} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Setup Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.buttonContainer}>
            <GradientButton
              title="Try Again"
              onPress={handleRetry}
              style={styles.button}
            />
            <GradientButton
              title="Continue Anyway"
              onPress={onSuccess}
              style={[styles.button, styles.secondaryButton]}
              variant="secondary"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <CheckCircle size={64} color="#22c55e" />
        </View>
        <Text style={styles.title}>Welcome to Artifact!</Text>
        <Text style={styles.subtitle}>
          Your account has been set up successfully. You're ready to start creating amazing content with AI.
        </Text>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <CheckCircle size={20} color="#22c55e" />
            <Text style={styles.featureText}>Access to premium AI models</Text>
          </View>
          <View style={styles.feature}>
            <CheckCircle size={20} color="#22c55e" />
            <Text style={styles.featureText}>Unlimited conversations</Text>
          </View>
          <View style={styles.feature}>
            <CheckCircle size={20} color="#22c55e" />
            <Text style={styles.featureText}>Advanced tools and features</Text>
          </View>
        </View>

        <GradientButton
          title="Get Started"
          onPress={onSuccess}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  successIcon: {
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: 32,
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
}); 