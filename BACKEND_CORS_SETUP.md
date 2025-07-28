# Backend CORS Setup Instructions

## Overview
This guide explains how to integrate the CORS configuration to support your React Native app alongside your existing web application.

## 1. Install Required Dependencies

```bash
npm install cors helmet
```

## 2. Update your server.js file

Add this at the top of your `server.js` file after other imports:

```javascript
const cors = require('cors');
const helmet = require('helmet');
const { corsOptions, stripeWebhookCorsOptions } = require('./cors-config');
```

## 3. Apply CORS Configuration

### For most routes (before your route definitions):

```javascript
// Apply CORS to all routes except webhooks
app.use('/api', (req, res, next) => {
  // Skip CORS for Stripe webhooks as they come from Stripe servers
  if (req.path.startsWith('/stripe/webhook')) {
    return next();
  }
  cors(corsOptions)(req, res, next);
});

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
```

### For Stripe webhooks specifically:

```javascript
// Special handling for Stripe webhooks (before your webhook route)
app.use('/api/stripe/webhook', cors(stripeWebhookCorsOptions));
```

## 4. Add React Native specific middleware

Add this middleware to handle React Native requests:

```javascript
// React Native specific middleware
app.use('/api', (req, res, next) => {
  // Add React Native friendly headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
```

## 5. Environment Variables

Add these to your `.env` file:

```bash
# CORS Configuration
NODE_ENV=development
CORS_ORIGIN=https://artifact.chat,http://localhost:3000,http://localhost:8081

# For development, add your local IP address
LOCAL_IP=192.168.1.100  # Replace with your actual local IP
```

## 6. Complete Server Configuration Example

Here's how your server.js should look with CORS properly configured:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { corsOptions, stripeWebhookCorsOptions } = require('./cors-config');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Raw body parsing for Stripe webhooks (BEFORE json middleware)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Special CORS for Stripe webhooks
app.use('/api/stripe/webhook', cors(stripeWebhookCorsOptions));

// Parse JSON bodies for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply CORS to all other API routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/stripe/webhook')) {
    return next();
  }
  cors(corsOptions)(req, res, next);
});

// React Native specific middleware
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma'
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Your routes
app.use('/api/stripe', require('./routes/stripe'));
// ... other routes

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 CORS configured for React Native app support`);
});
```

## 7. Testing the Configuration

### Test from React Native app:

```javascript
// Test API connection
const testConnection = async () => {
  try {
    const response = await fetch('https://assistantservicesapi.onrender.com/api/stripe/plans');
    const data = await response.json();
    console.log('✅ API Connection successful:', data);
  } catch (error) {
    console.error('❌ API Connection failed:', error);
  }
};
```

### Check CORS in browser console:

```javascript
// In browser dev tools
fetch('https://assistantservicesapi.onrender.com/api/stripe/plans', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(response => response.json())
.then(data => console.log('CORS test successful:', data))
.catch(error => console.error('CORS test failed:', error));
```

## 8. Development vs Production

### Development:
- CORS is more permissive for localhost variants
- Detailed logging of CORS decisions
- Allows various local IPs and ports

### Production:
- Strict origin checking
- Only allowed domains can make requests
- Enhanced security headers

## 9. Troubleshooting

### Common Issues:

1. **"CORS error" in React Native:**
   - Check that your API URL is correct
   - Verify the backend is running and accessible
   - Check network connectivity

2. **"Preflight request failed":**
   - Ensure OPTIONS method is handled
   - Check allowed headers configuration

3. **"Origin not allowed":**
   - Verify origin is in allowedOrigins array
   - Check environment variables
   - For development, ensure localhost variants are included

### Debug CORS:

Add this to your route handlers for debugging:

```javascript
app.use('/api', (req, res, next) => {
  console.log('🔍 CORS Debug:', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent']
  });
  next();
});
```

## 10. React Native Specific Considerations

### Network Security Config (Android)
If testing on Android, you may need to add network security config for HTTP requests in development:

Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.1.100</domain>
    </domain-config>
</network-security-config>
```

### iOS App Transport Security
For iOS development, add to `ios/YourApp/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSExceptionDomains</key>
  <dict>
    <key>localhost</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>
```

⚠️ **Note**: Remove these development-only configurations in production builds! 