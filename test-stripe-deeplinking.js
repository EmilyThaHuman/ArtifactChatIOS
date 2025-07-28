#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:3002';
const APP_SCHEME = 'artifactapp';

console.log('\n🧪 Stripe Deep Linking Test Suite');
console.log('==================================\n');

// Test data
const testCheckoutData = {
  planId: 'pro',
  billingInterval: 'month',
  successUrl: `${APP_SCHEME}://auth/onboarding?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${APP_SCHEME}://auth/onboarding?checkout_canceled=true`,
  customerEmail: 'test@stripe-deeplinking.com',
  metadata: {
    test_mode: 'true',
    source: 'mobile_app_test'
  }
};

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testDeepLinkConfiguration() {
  console.log('📱 Testing Deep Link Configuration');
  console.log('=================================\n');
  
  console.log(`✅ App Scheme: ${APP_SCHEME}`);
  console.log(`✅ Success URL: ${testCheckoutData.successUrl}`);
  console.log(`✅ Cancel URL: ${testCheckoutData.cancelUrl}\n`);
  
  // Validate URL format
  try {
    const successUrl = testCheckoutData.successUrl.replace('{CHECKOUT_SESSION_ID}', 'test_session_123');
    new URL(successUrl);
    console.log('✅ Success URL format is valid');
  } catch (error) {
    console.log('❌ Success URL format is invalid:', error.message);
  }
  
  try {
    new URL(testCheckoutData.cancelUrl);
    console.log('✅ Cancel URL format is valid\n');
  } catch (error) {
    console.log('❌ Cancel URL format is invalid:', error.message);
  }
}

async function testStripeCheckoutCreation() {
  console.log('🛒 Testing Stripe Checkout Creation');
  console.log('==================================\n');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/stripe/create-subscription-1month-free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8081',
      },
      body: JSON.stringify(testCheckoutData)
    });
    
    console.log(`📊 Status Code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log('✅ Checkout session created successfully');
      console.log(`🔗 Checkout URL: ${data.url}`);
      console.log(`🆔 Session ID: ${data.sessionId}`);
      
      // Test the redirect URL structure
      const actualSuccessUrl = testCheckoutData.successUrl.replace('{CHECKOUT_SESSION_ID}', data.sessionId);
      console.log(`🔄 Actual Success URL: ${actualSuccessUrl}`);
      
      return { success: true, data };
    } else {
      console.log('❌ Failed to create checkout session');
      console.log(`📄 Response: ${response.data}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log('❌ Error creating checkout session:', error.message);
    return { success: false, error: error.message };
  }
}

async function testCorsConfiguration() {
  console.log('🌐 Testing CORS Configuration');
  console.log('=============================\n');
  
  const corsTests = [
    {
      name: 'Preflight Request',
      method: 'OPTIONS',
      path: '/api/stripe/create-subscription-1month-free',
      headers: {
        'Origin': 'http://localhost:8081',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    },
    {
      name: 'Mobile App Origin',
      method: 'POST',
      path: '/api/stripe/plans',
      headers: {
        'Origin': 'http://localhost:8081',
        'Content-Type': 'application/json',
      }
    }
  ];
  
  for (const test of corsTests) {
    try {
      const response = await makeRequest(`${API_BASE_URL}${test.path}`, {
        method: test.method,
        headers: test.headers,
        body: test.method === 'POST' ? '{}' : undefined
      });
      
      console.log(`📋 ${test.name}:`);
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   CORS Headers:`, {
        'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      });
      
      if (response.statusCode === 200 || response.statusCode === 204) {
        console.log(`   ✅ ${test.name} passed\n`);
      } else {
        console.log(`   ❌ ${test.name} failed\n`);
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} error:`, error.message, '\n');
    }
  }
}

async function testUrlSchemeHandling() {
  console.log('🔗 Testing URL Scheme Handling');
  console.log('==============================\n');
  
  const testUrls = [
    `${APP_SCHEME}://auth/onboarding?checkout_success=true&session_id=cs_test_123abc`,
    `${APP_SCHEME}://auth/onboarding?checkout_canceled=true`,
    `${APP_SCHEME}://auth/callback?code=12345`,
  ];
  
  for (const url of testUrls) {
    console.log(`🔍 Testing URL: ${url}`);
    
    try {
      const parsed = new URL(url);
      console.log(`   ✅ URL is valid`);
      console.log(`   📍 Protocol: ${parsed.protocol}`);
      console.log(`   📍 Host: ${parsed.hostname}`);
      console.log(`   📍 Path: ${parsed.pathname}`);
      console.log(`   📍 Query Params:`, Object.fromEntries(parsed.searchParams));
    } catch (error) {
      console.log(`   ❌ URL is invalid:`, error.message);
    }
    console.log();
  }
}

async function generateTestInstructions() {
  console.log('📖 Testing Instructions');
  console.log('=======================\n');
  
  console.log('To test the complete flow:');
  console.log('1. Start your Expo app: npx expo start');
  console.log('2. Open the app on your device/simulator');
  console.log('3. Navigate to onboarding subscription step');
  console.log('4. Select a plan and proceed to checkout');
  console.log('5. Complete the Stripe checkout process');
  console.log('6. Verify the app opens and handles the redirect properly\n');
  
  console.log('Debug checklist:');
  console.log('✓ Expo app.json has "scheme": "artifactapp"');
  console.log('✓ StripeProvider is configured with urlScheme="artifactapp"');
  console.log('✓ Backend CORS allows mobile app origins');
  console.log('✓ Onboarding page handles checkout_success/checkout_canceled params');
  console.log('✓ LinkingManager can parse Stripe redirect URLs\n');
  
  console.log('Common issues:');
  console.log('❗ URL scheme mismatch between app.json and StripeProvider');
  console.log('❗ CORS not allowing mobile app origins');
  console.log('❗ Missing @stripe/stripe-react-native configuration');
  console.log('❗ iOS/Android not handling custom URL schemes properly');
  console.log('❗ Stripe webhook endpoints require different CORS settings\n');
}

async function main() {
  try {
    await testDeepLinkConfiguration();
    await testCorsConfiguration();
    await testStripeCheckoutCreation();
    await testUrlSchemeHandling();
    await generateTestInstructions();
    
    console.log('🎉 Test suite completed!');
    console.log('Review the results above and follow the testing instructions.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testDeepLinkConfiguration,
  testStripeCheckoutCreation,
  testCorsConfiguration,
  testUrlSchemeHandling
}; 