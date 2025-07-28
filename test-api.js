#!/usr/bin/env node

// Simple API test script for React Native/Expo app
const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:3002';

// Test configuration
const tests = [
  {
    name: 'API Health Check',
    path: '/',
    method: 'GET',
    expectedStatus: 200,
  },
  {
    name: 'CORS Preflight Test',
    path: '/api/stripe/create-subscription-1month-free',
    method: 'OPTIONS',
    expectedStatus: 204,
    headers: {
      'Origin': 'http://localhost:8081',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  },
];

// Helper function to make HTTP requests
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test runner
async function runTests() {
  console.log('🧪 Starting API tests...\n');
  console.log(`🎯 Testing API: ${API_BASE_URL}\n`);
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    console.log(`🔍 Running: ${test.name}`);
    
    try {
      const url = `${API_BASE_URL}${test.path}`;
      const options = {
        method: test.method,
        headers: {
          'User-Agent': 'ArtifactApp-Test/1.0',
          'Content-Type': 'application/json',
          ...test.headers,
        },
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      console.log(`   📡 ${test.method} ${url}`);
      
      const response = await makeRequest(url, options);
      
      console.log(`   📊 Status: ${response.statusCode}`);
      
      // Check status code
      if (response.statusCode === test.expectedStatus) {
        console.log(`   ✅ Status check passed`);
        passedTests++;
      } else {
        console.log(`   ❌ Status check failed (expected ${test.expectedStatus}, got ${response.statusCode})`);
      }
      
      // Check CORS headers for CORS test
      if (test.name.includes('CORS')) {
        const corsHeaders = {
          'access-control-allow-origin': response.headers['access-control-allow-origin'],
          'access-control-allow-methods': response.headers['access-control-allow-methods'],
          'access-control-allow-headers': response.headers['access-control-allow-headers'],
          'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
        };
        
        console.log(`   🌐 CORS Headers:`, corsHeaders);
        
        if (corsHeaders['access-control-allow-origin']) {
          console.log(`   ✅ CORS Origin header present`);
        } else {
          console.log(`   ⚠️ CORS Origin header missing`);
        }
      }
      
             // Try to parse JSON response for data endpoints
       if (test.path.includes('/api/') && response.data && test.method !== 'OPTIONS') {
         try {
           const jsonData = JSON.parse(response.data);
           console.log(`   📦 Response preview:`, Object.keys(jsonData).slice(0, 3));
         } catch (e) {
           console.log(`   📄 Response type: text/html (likely status page)`);
         }
       }
      
    } catch (error) {
      console.log(`   ❌ Request failed:`, error.message);
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`   ❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! API is ready for React Native app.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the CORS configuration and API endpoints.');
  }
  
  // Additional recommendations
  console.log('\n📝 Next Steps:');
  console.log('1. Copy the cors-config.js file to your backend project');
  console.log('2. Follow the BACKEND_CORS_SETUP.md instructions');
  console.log('3. Restart your backend server with the new CORS configuration');
  console.log('4. Test the React Native app with the onboarding flow');
}

// Test specific endpoint
async function testStripeCheckout() {
  console.log('\n🧪 Testing Stripe Checkout Creation...\n');
  
  try {
    const url = `${API_BASE_URL}/api/stripe/create-subscription-1month-free`;
    const testData = {
      planId: 'pro',
      billingInterval: 'month',
      successUrl: 'artifactapp://auth/onboarding?checkout_success=true&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'artifactapp://auth/onboarding?checkout_canceled=true',
      customerEmail: 'test@example.com',
      metadata: {
        test: 'true',
        source: 'api_test',
      },
    };
    
    console.log(`📡 POST ${url}`);
    console.log(`📦 Request data:`, testData);
    
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8081',
        'User-Agent': 'ArtifactApp-Test/1.0',
      },
      body: JSON.stringify(testData),
    });
    
    console.log(`📊 Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      try {
        const result = JSON.parse(response.data);
        console.log(`✅ Checkout session created successfully`);
        console.log(`🔗 Session ID: ${result.sessionId || 'N/A'}`);
        console.log(`🌐 Has URL: ${!!result.url}`);
      } catch (e) {
        console.log(`❌ Invalid JSON response:`, response.data.substring(0, 200));
      }
    } else {
      console.log(`❌ Checkout creation failed`);
      console.log(`📄 Response:`, response.data.substring(0, 500));
    }
    
  } catch (error) {
    console.log(`❌ Checkout test failed:`, error.message);
  }
}

// Run the tests
async function main() {
  await runTests();
  await testStripeCheckout();
}

main().catch(console.error); 