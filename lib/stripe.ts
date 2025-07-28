import { Alert } from 'react-native';
import { ApiClient, ApiError } from './apiClient';

interface CreateCheckoutSessionParams {
  planId: string;
  billingInterval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
}

interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

interface SubscriptionProcessingStatus {
  success: boolean;
  subscriptionData?: {
    subscription_id: string;
    stripe_customer_id: string;
    status: string;
    start_date: string;
    current_period_end: string;
    plan_id: string;
    billing_interval: string;
  };
  error?: string;
}

export class StripeManager {
  /**
   * Create a checkout session for subscription with 1 month free promotion
   */
  static async createSubscriptionCheckoutWith1MonthFree(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResponse> {
    try {
      console.log('🔄 Creating checkout session with 1 month free:', params);
      
      const data = await ApiClient.post('/api/stripe/create-subscription-1month-free', {
        planId: params.planId,
        billingInterval: params.billingInterval,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        customerEmail: params.customerEmail,
        metadata: {
          ...params.metadata,
          new_user_signup: 'true',
          onboarding_flow: 'true',
        },
      });

      console.log('✅ Checkout session created successfully');
      
      return {
        url: data.url,
        sessionId: data.sessionId,
      };
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw new Error(error instanceof ApiError ? error.message : 'Failed to create checkout session');
    }
  }

  /**
   * Create a regular checkout session for subscription
   */
  static async createSubscriptionCheckout(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResponse> {
    try {
      console.log('🔄 Creating regular checkout session:', params);
      
      const data = await ApiClient.post('/api/stripe/create-subscription', params);

      console.log('✅ Regular checkout session created successfully');
      
      return {
        url: data.url,
        sessionId: data.sessionId,
      };
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw new Error(error instanceof ApiError ? error.message : 'Failed to create checkout session');
    }
  }

  /**
   * Get available subscription plans
   * Using hardcoded pro plan for testing
   */
  static async getSubscriptionPlans(): Promise<{ plans: Record<string, SubscriptionPlan> }> {
    console.log('📋 Using hardcoded pro plan information');
    
    // Return only pro plan without API call
    return {
      plans: {
        PRO: {
          id: 'pro',
          name: 'Pro',
          price: 1999, // $19.99 in cents
          interval: 'month',
          description: 'For Artifact power users',
          features: [
            'Access to premium models',
            'Access to beta tool library', 
            'Unlimited agent creation',
            'Unlimited access to projects',
            '150 deep researches per month',
          ],
        },
      },
    };
  }

  /**
   * Check subscription processing status after checkout
   */
  static async checkSubscriptionProcessingStatus(
    sessionId: string
  ): Promise<SubscriptionProcessingStatus> {
    try {
      console.log('🔄 Checking subscription processing status:', sessionId);
      
      const data = await ApiClient.get(`/api/stripe/subscription-processing-status?session_id=${sessionId}`);
      console.log('✅ Subscription processing status checked successfully');
      
      return {
        success: data.success,
        subscriptionData: data.subscriptionData,
        error: data.error,
      };
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return {
        success: false,
        error: error instanceof ApiError ? error.message : 'Failed to check subscription status',
      };
    }
  }

  /**
   * Get session status from Stripe
   */
  static async getSessionStatus(sessionId: string): Promise<any> {
    try {
      console.log('🔄 Getting Stripe session status:', sessionId);
      
      const data = await ApiClient.get(`/api/stripe/session/${sessionId}`);
      console.log('✅ Session status retrieved successfully');
      
      return data;
    } catch (error) {
      console.error('❌ Error getting session status:', error);
      throw new Error(error instanceof ApiError ? error.message : 'Failed to get session status');
    }
  }

  /**
   * Save subscription data to user profile
   * Note: This is handled automatically by the webhook, but we simulate success for the UI
   */
  static async saveSubscriptionToProfile(
    userId: string,
    subscriptionData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Subscription saving handled by webhook for user:', userId);
      console.log('📊 Subscription data processed:', subscriptionData);
      
      // The actual saving is handled by the Stripe webhook automatically
      // Just return success since the webhook will handle the database updates
      return { success: true };
    } catch (error) {
      console.error('❌ Error in subscription processing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process subscription',
      };
    }
  }

  /**
   * Helper method to format prices for display
   */
  static formatPrice(priceInCents: number, interval: string): string {
    const price = priceInCents / 100;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    
    return `${formatter.format(price)}/${interval}`;
  }

  /**
   * Helper method to calculate yearly savings
   */
  static calculateYearlySavings(monthlyPrice: number): number {
    const yearlyPrice = monthlyPrice * 12 * 0.9; // 10% discount
    const monthlySavings = (monthlyPrice * 12) - yearlyPrice;
    return Math.round(monthlySavings);
  }
}

/**
 * Hook for using Stripe functionality in React Native components
 */
export const useStripe = () => {
  return {
    createSubscriptionCheckout: StripeManager.createSubscriptionCheckout,
    createSubscriptionCheckoutWith1MonthFree: StripeManager.createSubscriptionCheckoutWith1MonthFree,
    getSubscriptionPlans: StripeManager.getSubscriptionPlans,
    checkSubscriptionProcessingStatus: StripeManager.checkSubscriptionProcessingStatus,
    getSessionStatus: StripeManager.getSessionStatus,
    saveSubscriptionToProfile: StripeManager.saveSubscriptionToProfile,
    formatPrice: StripeManager.formatPrice,
    calculateYearlySavings: StripeManager.calculateYearlySavings,
  };
}; 