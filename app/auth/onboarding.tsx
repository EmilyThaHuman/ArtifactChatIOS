import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { AuthManager } from '@/lib/auth';
import { Colors, Gradients } from '@/constants/Colors';
import ProfileStep from '@/components/onboarding/ProfileStep';
import SubscriptionStep from '@/components/onboarding/SubscriptionStep';
import SuccessStep from '@/components/onboarding/SuccessStep';

interface FormData {
  display_name: string;
  bio: string;
  avatar_url: string;
  personalization: {
    role: string;
    traits: string[];
    interests: string[];
    profile_context: string;
  };
  subscription: {
    plan: string;
    status: string | null;
    start_date: string | null;
    billing_interval: string;
    subscription_id?: string;
    stripe_customer_id?: string;
  };
}

const INITIAL_FORM_DATA: FormData = {
  display_name: '',
  bio: '',
  avatar_url: '',
  personalization: {
    role: '',
    traits: [],
    interests: [],
    profile_context: '',
  },
  subscription: {
    plan: 'free',
    status: null,
    start_date: null,
    billing_interval: 'month',
  },
};

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const params = useLocalSearchParams();
  const hasProcessedCheckout = useRef(false);

  useEffect(() => {
    initializeOnboarding();
  }, []);

  useEffect(() => {
    // Handle Stripe checkout return
    if (params.checkout_success === 'true' && params.session_id && !hasProcessedCheckout.current) {
      hasProcessedCheckout.current = true;
      handleCheckoutSuccess(params.session_id as string);
    } else if (params.checkout_canceled === 'true' && !hasProcessedCheckout.current) {
      hasProcessedCheckout.current = true;
      Alert.alert(
        'Checkout Canceled',
        'Your subscription setup was canceled. You can try again or continue with the free plan.',
        [
          { text: 'Try Again', onPress: () => setCurrentStep(2) },
          { text: 'Continue Free', onPress: () => setShowSuccess(true) },
        ]
      );
    }
  }, [params]);

  const initializeOnboarding = async () => {
    try {
      const { user } = await AuthManager.getCurrentUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      // Check if user has already completed onboarding
      const { data: profile } = await AuthManager.getUserProfile(user.id);
      if (profile?.onboarding_completed) {
        router.replace('/(tabs)');
        return;
      }

      // Pre-fill form data from user metadata
      const updatedFormData = {
        ...INITIAL_FORM_DATA,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      };

      if (profile) {
        updatedFormData.display_name = profile.full_name || updatedFormData.display_name;
        updatedFormData.bio = profile.bio || '';
        updatedFormData.avatar_url = profile.avatar_url || updatedFormData.avatar_url;
        if (profile.personalization) {
          updatedFormData.personalization = {
            ...updatedFormData.personalization,
            ...profile.personalization,
          };
        }
      }

      setFormData(updatedFormData);
    } catch (error) {
      console.error('Error initializing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutSuccess = async (sessionId: string) => {
    try {
      console.log('🔄 Processing checkout success for session:', sessionId);
      // Set current step to success step with session ID
      setCurrentStep(3);
      setShowSuccess(true);
      // The SuccessStep component will handle the actual subscription processing
    } catch (error) {
      console.error('Error processing checkout:', error);
      Alert.alert('Error', 'Failed to process subscription. Please contact support.');
    }
  };

  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prev => ({
      ...prev,
      ...data,
    }));
  };

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate required fields
      if (!formData.display_name.trim()) {
        Alert.alert('Error', 'Please enter your display name');
        return;
      }
      if (formData.display_name.length < 3) {
        Alert.alert('Error', 'Display name must be at least 3 characters');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const completeOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const { user } = await AuthManager.getCurrentUser();
      if (!user) throw new Error('No user found');

      // Update user profile with onboarding data
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: formData.display_name,
        bio: formData.bio,
        avatar_url: formData.avatar_url,
        onboarding_completed: true,
        settings: {
          profile: {
            display_name: formData.display_name,
            bio: formData.bio,
            avatar_url: formData.avatar_url,
            profile_context: formData.personalization.profile_context,
          },
          personalization: formData.personalization,
          subscription: formData.subscription,
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (error) throw error;

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={Gradients.primary} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Setting up your profile...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (showSuccess) {
    return (
      <SuccessStep
        onSuccess={completeOnboarding}
        sessionId={params.session_id as string}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={Gradients.primary} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {currentStep === 1 ? 'Set up your profile' : 'Choose your plan'}
                </Text>
                <Text style={styles.subtitle}>
                  {currentStep === 1
                    ? 'Tell us about yourself to personalize your AI experience'
                    : 'Select a subscription plan to continue'}
                </Text>
              </View>

              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(currentStep / 2) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>Step {currentStep} of 2</Text>
              </View>

              {/* Content Card */}
              <View style={styles.contentCard}>
                {currentStep === 1 && (
                  <ProfileStep
                    formData={formData}
                    updateFormData={updateFormData}
                    avatarFile={avatarFile}
                    setAvatarFile={setAvatarFile}
                  />
                )}

                {currentStep === 2 && (
                  <SubscriptionStep
                    formData={formData}
                    updateFormData={updateFormData}
                    onSuccess={() => setShowSuccess(true)}
                  />
                )}
              </View>

              {/* Navigation Buttons */}
              <View style={styles.navigationContainer}>
                {currentStep > 1 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={prevStep}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                )}

                {currentStep === 1 && (
                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={nextStep}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.nextButtonText}>Continue</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  progressBar: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  contentCard: {
    backgroundColor: '#353535',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginLeft: 'auto',
  },
  nextButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
}); 