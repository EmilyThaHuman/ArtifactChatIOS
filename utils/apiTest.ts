import { ApiClient } from '../lib/apiClient';
import { StripeManager } from '../lib/stripe';

/**
 * Test API connection and basic functionality
 */
export const testApiConnection = async () => {
  console.log('🧪 Starting API connection tests...');
  
  const results = {
    apiHealth: false,
    stripePlans: false,
    overall: false,
    errors: [] as string[],
  };

  try {
    // Test 1: Basic API health check
    console.log('🔍 Testing API health...');
    const healthResult = await ApiClient.testConnection();
    results.apiHealth = healthResult.success;
    
    if (!healthResult.success) {
      results.errors.push(`API Health: ${healthResult.error}`);
    } else {
      console.log('✅ API health check passed');
    }

    // Test 2: Stripe plans endpoint
    console.log('🔍 Testing Stripe plans endpoint...');
    try {
      const plans = await StripeManager.getSubscriptionPlans();
      results.stripePlans = !!plans && !!plans.plans;
      
      if (results.stripePlans) {
        console.log('✅ Stripe plans test passed:', Object.keys(plans.plans));
      } else {
        results.errors.push('Stripe Plans: No plans returned');
      }
    } catch (error) {
      results.stripePlans = false;
      results.errors.push(`Stripe Plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Overall result
    results.overall = results.apiHealth && results.stripePlans;

    console.log('🧪 API tests completed:', results);
    return results;

  } catch (error) {
    console.error('❌ API test suite failed:', error);
    results.errors.push(`Test Suite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return results;
  }
};

/**
 * Test Stripe checkout creation (without actually completing)
 */
export const testStripeCheckout = async () => {
  console.log('🧪 Testing Stripe checkout creation...');
  
  try {
    // Test creating a checkout session (this won't actually charge anything)
    const params = {
      planId: 'pro',
      billingInterval: 'month' as const,
      successUrl: 'artifactapp://auth/onboarding?checkout_success=true&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'artifactapp://auth/onboarding?checkout_canceled=true',
      customerEmail: 'test@example.com',
      metadata: {
        test: 'true',
        source: 'api_test',
      },
    };

    const result = await StripeManager.createSubscriptionCheckoutWith1MonthFree(params);
    
    if (result.url && result.sessionId) {
      console.log('✅ Stripe checkout test passed');
      console.log('📊 Session ID:', result.sessionId);
      console.log('🔗 Checkout URL created (test - do not visit)');
      
      return {
        success: true,
        sessionId: result.sessionId,
        hasUrl: !!result.url,
      };
    } else {
      console.error('❌ Stripe checkout test failed: Invalid response');
      return {
        success: false,
        error: 'Invalid checkout response',
      };
    }

  } catch (error) {
    console.error('❌ Stripe checkout test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get system information for debugging
 */
export const getSystemInfo = () => {
  const info = {
    timestamp: new Date().toISOString(),
    userAgent: navigator?.userAgent || 'React Native',
    platform: 'React Native',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3002',
  };
  
  console.log('ℹ️ System info:', info);
  return info;
};

/**
 * Run comprehensive API tests
 */
export const runComprehensiveTests = async () => {
  console.log('🚀 Running comprehensive API tests...');
  
  const systemInfo = getSystemInfo();
  const connectionTests = await testApiConnection();
  const checkoutTest = await testStripeCheckout();
  
  const report = {
    timestamp: systemInfo.timestamp,
    system: systemInfo,
    connection: connectionTests,
    checkout: checkoutTest,
    summary: {
      allPassed: connectionTests.overall && checkoutTest.success,
      criticalIssues: connectionTests.errors.length + (checkoutTest.success ? 0 : 1),
    }
  };
  
  console.log('📊 Comprehensive test report:', report);
  
  if (report.summary.allPassed) {
    console.log('🎉 All tests passed! API is ready for use.');
  } else {
    console.warn('⚠️ Some tests failed. Check the errors above.');
  }
  
  return report;
}; 