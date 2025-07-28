// cors-config.js - CORS configuration for React Native app support

/**
 * CORS configuration for Artifact API
 * Supports React Native mobile apps, web apps, and development environments
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins for different environments
const allowedOrigins = [
  // Production domains
  'https://artifact.chat',
  'https://www.artifact.chat',
  'https://assistantservicesapi.onrender.com',
  
  // Development environments
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:8080',
  'http://localhost:8081', // Expo dev server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  
  // Expo development
  'exp://localhost:8081',
  'exp://127.0.0.1:8081',
  'exp://192.168.1.1:8081', // Add your local IP here during development
  
  // React Native Metro bundler
  'http://localhost:19000',
  'http://localhost:19001',
  'http://localhost:19002',
  
  // Ngrok tunnels (for testing)
  /^https:\/\/.*\.ngrok\.io$/,
  /^https:\/\/.*\.ngrok-free\.app$/,
];

// Custom origin checking function
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      console.log('🌐 [CORS] Request with no origin (mobile app or tool) - ALLOWED');
      return callback(null, true);
    }

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      // Handle regex patterns
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      console.log(`🌐 [CORS] Origin ${origin} - ALLOWED`);
      callback(null, true);
    } else if (isDevelopment) {
      // In development, be more permissive for localhost variants
      const isLocalhost = origin.includes('localhost') || 
                         origin.includes('127.0.0.1') || 
                         origin.includes('192.168.') ||
                         origin.includes('10.0.') ||
                         origin.includes('172.16.');
      
      if (isLocalhost) {
        console.log(`🌐 [CORS] Development localhost ${origin} - ALLOWED`);
        callback(null, true);
      } else {
        console.log(`🌐 [CORS] Origin ${origin} - REJECTED`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      console.log(`🌐 [CORS] Origin ${origin} - REJECTED`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allow credentials for authenticated requests
  credentials: true,
  
  // Allow common HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allow common headers used by React Native and web apps
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-HTTP-Method-Override',
    'Set-Cookie',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'stripe-signature', // For Stripe webhooks
  ],
  
  // Expose headers that the client can access
  exposedHeaders: [
    'Set-Cookie',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
  ],
  
  // Preflight cache duration
  maxAge: 86400, // 24 hours
  
  // Handle preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

// Specific CORS options for Stripe webhooks (no CORS needed)
const stripeWebhookCorsOptions = {
  origin: false, // Disable CORS for webhooks since they come from Stripe servers
  credentials: false,
};

// Export configurations
module.exports = {
  corsOptions,
  stripeWebhookCorsOptions,
  allowedOrigins,
  
  // Helper function to add dynamic origins (useful for development)
  addDynamicOrigin: (origin) => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
      console.log(`🌐 [CORS] Added dynamic origin: ${origin}`);
    }
  },
  
  // Helper to check if origin is allowed
  isOriginAllowed: (origin) => {
    if (!origin) return true; // No origin (mobile apps)
    
    return allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
  }
}; 