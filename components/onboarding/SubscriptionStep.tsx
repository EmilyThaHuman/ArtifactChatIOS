import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Check, CreditCard, Star } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useStripe } from '@/lib/stripe';
import { AuthManager } from '@/lib/auth';

interface FormData {
  subscription: {
    plan: string;
    status: string | null;
    start_date: string | null;
    billing_interval: string;
    subscription_id?: string;
    stripe_customer_id?: string;
  };
}

interface SubscriptionStepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  onSuccess: () => void;
}

interface PricingPlan {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: string[];
  popular?: boolean;
  comingSoon?: boolean;
}

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: {
      monthly: 19.99,
      yearly: 17.99, // ~10% discount
    },
    description: 'For Artifact power users',
    features: [
      'Access to premium models',
      'Access to beta tool library',
      'Unlimited agent creation', 
      'Unlimited access to projects',
      '150 deep researches per month',
    ],
    popular: true,
  },
];

export default function SubscriptionStep({
  formData,
  updateFormData,
  onSuccess,
}: SubscriptionStepProps) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PLANS);
  const [error, setError] = useState<string | null>(null);
  
  const {
    createSubscriptionCheckoutWith1MonthFree,
    getSubscriptionPlans,
    formatPrice,
    calculateYearlySavings,
  } = useStripe();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { plans: apiPlans } = await getSubscriptionPlans();
      
      // Convert API plans to component format, filtering out team plan
      const formattedPlans: PricingPlan[] = Object.values(apiPlans)
        .filter((plan: any) => plan.id !== 'team') // Remove team plan
        .map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          price: {
            monthly: plan.price / 100, // Convert from cents
            yearly: plan.price / 100 * 0.9, // 10% discount for yearly
          },
          description: plan.description,
          features: plan.features,
          popular: plan.id === 'pro',
          comingSoon: false,
        }));
      
      setPlans(formattedPlans);
    } catch (error) {
      console.warn('Failed to fetch plans from API, using defaults');
      // Keep default plans
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (plans.find(p => p.id === planId)?.comingSoon) {
      Alert.alert('Coming Soon', 'This plan will be available soon!');
      return;
    }

    setSelectedPlan(planId);
    setError(null);
    setLoading(true);

    try {
      const { user } = await AuthManager.getCurrentUser();
      if (!user) {
        throw new Error('No user found. Please log in again.');
      }

      // Create checkout session
      const checkoutSession = await createSubscriptionCheckoutWith1MonthFree({
        planId,
        billingInterval: billingInterval === 'yearly' ? 'year' : 'month',
        successUrl: `artifactapp://auth/onboarding?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `artifactapp://auth/onboarding?checkout_canceled=true`,
        customerEmail: user.email,
        metadata: {
          new_user_signup: 'true',
          onboarding_flow: 'true',
          billing_interval: billingInterval,
        },
      });

      // Update form data with selected plan
      updateFormData({
        subscription: {
          ...formData.subscription,
          plan: planId,
          billing_interval: billingInterval === 'yearly' ? 'year' : 'month',
        },
      });

      // Open Stripe checkout in browser
      const supported = await Linking.canOpenURL(checkoutSession.url);
      if (supported) {
        await Linking.openURL(checkoutSession.url);
      } else {
        throw new Error('Unable to open payment page');
      }

    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError(error instanceof Error ? error.message : 'Failed to start checkout process');
      Alert.alert('Error', 'Failed to start checkout process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPlanPrice = (plan: PricingPlan) => {
    const price = billingInterval === 'yearly' ? plan.price.yearly : plan.price.monthly;
    return `$${price.toFixed(2)}`;
  };

  const calculateSavings = (plan: PricingPlan) => {
    if (billingInterval === 'monthly') return null;
    
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyTotal = plan.price.yearly * 12;
    const savings = monthlyTotal - yearlyTotal;
    
    return savings > 0 ? `Save $${savings.toFixed(0)}/year` : null;
  };

  const PricingCard = ({ plan }: { plan: PricingPlan }) => {
    const isSelected = selectedPlan === plan.id;
    const isDisabled = plan.comingSoon || loading;
    const savings = calculateSavings(plan);

    return (
      <TouchableOpacity
        style={[
          styles.pricingCard,
          isSelected && styles.pricingCardSelected,
          plan.popular && styles.pricingCardPopular,
          isDisabled && styles.pricingCardDisabled,
        ]}
        onPress={() => handleSelectPlan(plan.id)}
        disabled={isDisabled}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Star size={12} color="#ffffff" fill="#ffffff" />
            <Text style={styles.popularText}>Most Popular</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          {plan.comingSoon && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          )}
        </View>

        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPlanPrice(plan)}</Text>
          <Text style={styles.priceInterval}>
            /{billingInterval === 'yearly' ? 'month' : 'month'}
          </Text>
        </View>

        {savings && (
          <Text style={styles.savings}>{savings}</Text>
        )}

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={16} color={Colors.primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelected && styles.selectButtonSelected,
            isDisabled && styles.selectButtonDisabled,
          ]}
          onPress={() => handleSelectPlan(plan.id)}
          disabled={isDisabled}
        >
          {loading && selectedPlan === plan.id ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text
              style={[
                styles.selectButtonText,
                isSelected && styles.selectButtonTextSelected,
              ]}
            >
              {plan.comingSoon ? 'Coming Soon' : 'Start Free Trial'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Billing Toggle */}
      <View style={styles.billingToggleContainer}>
        <Text style={styles.billingLabel}>Billing Cycle</Text>
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingInterval === 'monthly' && styles.billingOptionSelected,
            ]}
            onPress={() => setBillingInterval('monthly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingInterval === 'monthly' && styles.billingOptionTextSelected,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingInterval === 'yearly' && styles.billingOptionSelected,
            ]}
            onPress={() => setBillingInterval('yearly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingInterval === 'yearly' && styles.billingOptionTextSelected,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>Save 10%</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pricing Cards */}
      <View style={styles.plansContainer}>
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Free Trial Info */}
      <View style={styles.trialInfo}>
        <CreditCard size={20} color={Colors.textSecondary} />
        <View style={styles.trialInfoText}>
          <Text style={styles.trialTitle}>Start with 1 month free</Text>
          <Text style={styles.trialDescription}>
            No charges for 30 days. Cancel anytime during your trial.
          </Text>
        </View>
      </View>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Prices shown do not include applicable tax. Your currency & price may vary.
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  billingToggleContainer: {
    marginBottom: 24,
  },
  billingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 4,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  billingOptionSelected: {
    backgroundColor: Colors.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  billingOptionTextSelected: {
    color: '#ffffff',
  },
  savingsBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22c55e',
  },
  plansContainer: {
    gap: 16,
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: '#353535',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  pricingCardPopular: {
    borderColor: Colors.primary,
  },
  pricingCardDisabled: {
    opacity: 0.6,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  comingSoonBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  priceInterval: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  savings: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 20,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  selectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectButtonTextSelected: {
    color: '#ffffff',
  },
  errorContainer: {
    backgroundColor: 'rgba(254, 242, 242, 0.9)',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  trialInfoText: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  trialDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 16,
  },
}); 