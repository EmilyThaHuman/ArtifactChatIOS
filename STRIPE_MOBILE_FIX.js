// MOBILE DEEP LINKING FIX FOR stripe.js
// Add these functions and modifications to your backend stripe.js file

/**
 * Validate and normalize mobile deep link URLs
 * @param {string} url - URL to validate
 * @returns {string} - Validated URL
 */
const validateMobileUrl = (url) => {
  if (!url) return null;
  
  // Allow mobile app schemes
  const mobileSchemes = ['artifactapp://', 'http://', 'https://'];
  const isValidScheme = mobileSchemes.some(scheme => url.startsWith(scheme));
  
  if (!isValidScheme) {
    throw new Error(`Invalid URL scheme. Allowed schemes: ${mobileSchemes.join(', ')}`);
  }
  
  // Validate mobile deep link format
  if (url.startsWith('artifactapp://')) {
    // Ensure proper mobile deep link format
    const urlObj = new URL(url);
    console.log('📱 [stripe.js] Mobile deep link validated:', {
      protocol: urlObj.protocol,
      host: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search
    });
  }
  
  return url;
};

/**
 * Check if the request is from a mobile app
 * @param {string} successUrl - Success URL to check
 * @param {string} cancelUrl - Cancel URL to check  
 * @returns {boolean} - True if mobile app request
 */
const isMobileAppRequest = (successUrl, cancelUrl) => {
  return (successUrl && successUrl.startsWith('artifactapp://')) || 
         (cancelUrl && cancelUrl.startsWith('artifactapp://'));
};

/**
 * Configure mobile-specific Stripe session settings
 * @param {Object} sessionConfig - Base session configuration
 * @param {boolean} isMobile - Whether this is a mobile request
 * @returns {Object} - Enhanced session configuration
 */
const enhanceSessionForMobile = (sessionConfig, isMobile) => {
  if (isMobile) {
    console.log('📱 [stripe.js] Configuring session for mobile app');
    
    // Mobile apps may need specific configuration
    sessionConfig.metadata = {
      ...sessionConfig.metadata,
      client_type: 'mobile_app',
      platform: 'react_native'
    };
    
    // Ensure proper mobile redirect handling
    sessionConfig.allow_promotion_codes = true;
    
    // Add mobile-specific success actions
    if (sessionConfig.success_url) {
      console.log('📱 [stripe.js] Mobile success URL:', sessionConfig.success_url);
    }
    
    if (sessionConfig.cancel_url) {
      console.log('📱 [stripe.js] Mobile cancel URL:', sessionConfig.cancel_url);
    }
  }
  
  return sessionConfig;
};

// MODIFY THE createSubscriptionWith1MonthFree FUNCTION:
// Replace the existing function with this enhanced version:

export const createSubscriptionWith1MonthFree = async (options = {}) => {
  try {
    const {
      planType,
      billingInterval = "month",
      successUrl,
      cancelUrl,
      customerEmail,
      embedded = false,
      returnUrl,
      customerId,
      enableInvoiceReceipts = true,
      invoiceDescription = null,
      metadata = {},
    } = options;

    // MOBILE VALIDATION - ADD THIS
    console.log('🔍 [stripe.js] Validating URLs for mobile compatibility');
    const validatedSuccessUrl = validateMobileUrl(successUrl);
    const validatedCancelUrl = validateMobileUrl(cancelUrl);
    const isMobile = isMobileAppRequest(validatedSuccessUrl, validatedCancelUrl);
    
    console.log('📱 [stripe.js] Mobile app request detected:', isMobile);
    if (isMobile) {
      console.log('📱 [stripe.js] Success URL:', validatedSuccessUrl);
      console.log('📱 [stripe.js] Cancel URL:', validatedCancelUrl);
    }

    // Determine the price ID based on the plan type and billing interval
    let priceId;
    if (billingInterval === "year") {
      switch (planType.toLowerCase()) {
        case "pro":
          priceId = STRIPE_PRICES.PRO_ANNUAL;
          break;
        case "business":
          priceId = STRIPE_PRICES.BUSINESS_ANNUAL;
          break;
        case "team":
          priceId = STRIPE_PRICES.TEAM_ANNUAL;
          break;
        default:
          priceId = STRIPE_PRICES.PRO_ANNUAL;
      }
    } else {
      switch (planType.toLowerCase()) {
        case "pro":
          priceId = STRIPE_PRICES.PRO;
          break;
        case "business":
          priceId = STRIPE_PRICES.BUSINESS;
          break;
        case "team":
          priceId = STRIPE_PRICES.TEAM;
          break;
        default:
          priceId = STRIPE_PRICES.PRO;
      }
    }

    if (!priceId) {
      throw new Error("No valid price ID found for the plan type");
    }

    logger.info(
      `Creating subscription session with 1 month free promotion for price ID: ${priceId}`
    );

    // Create subscription line items
    const lineItems = [
      {
        price: priceId,
        quantity: 1,
      },
    ];

    let sessionConfig = {
      line_items: lineItems,
      mode: "subscription",
      metadata: {
        plan: planType || "pro",
        billing_interval: billingInterval,
        promotion_applied: "1_month_free",
        new_user_signup: "true",
        ...metadata,
      },
      discounts: [
        {
          coupon: "fyHAX6wK",
        },
      ],
    };

    // MOBILE ENHANCEMENT - ADD THIS
    sessionConfig = enhanceSessionForMobile(sessionConfig, isMobile);

    // Add subscription options with enhanced invoice data
    sessionConfig.subscription_data = {
      metadata: {
        plan: planType || "pro",
        billing_interval: billingInterval,
        promotion_applied: "1_month_free",
        new_user_signup: "true",
        ...(isMobile && { client_type: 'mobile_app' }),
        ...metadata,
      },
      invoice_settings: {
        issuer: {
          type: "self",
        },
      },
    };

    if (enableInvoiceReceipts && invoiceDescription) {
      sessionConfig.subscription_data.description =
        invoiceDescription ||
        `${planType || "Pro"} Plan Subscription (1 Month Free)`;
    }

    // Configure redirect or embedded UI mode
    if (embedded) {
      sessionConfig.ui_mode = "embedded";
      sessionConfig.return_url =
        returnUrl ||
        `${DEFAULT_DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      // USE VALIDATED URLs - MODIFY THIS
      sessionConfig.success_url =
        validatedSuccessUrl ||
        `${DEFAULT_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`;
      sessionConfig.cancel_url = validatedCancelUrl || `${DEFAULT_DOMAIN}/cancel`;
    }

    // Add customer email if provided
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    // Add customer if provided
    if (customerId) {
      sessionConfig.customer = customerId;
    }

    // MOBILE LOGGING - ADD THIS
    if (isMobile) {
      console.log('📱 [stripe.js] Final mobile session config:', {
        mode: sessionConfig.mode,
        success_url: sessionConfig.success_url,
        cancel_url: sessionConfig.cancel_url,
        metadata: sessionConfig.metadata,
        client_type: 'mobile_app'
      });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // MOBILE SUCCESS LOGGING - ADD THIS
    if (isMobile) {
      console.log('✅ [stripe.js] Mobile checkout session created successfully:', {
        sessionId: session.id,
        url: session.url,
        mode: session.mode,
        success_url: session.success_url,
        cancel_url: session.cancel_url
      });
    }

    return embedded
      ? {
          clientSecret: session.client_secret,
          promotionApplied: "1_month_free",
        }
      : {
          sessionId: session.id,
          url: session.url,
          promotionApplied: "1_month_free",
        };
  } catch (error) {
    logger.error("Error creating subscription session with 1 month free:", {
      error: error.message,
      isMobile: isMobileAppRequest(options.successUrl, options.cancelUrl),
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl
    });
    throw error;
  }
};

// ALSO ADD MOBILE CORS HEADERS - Add this middleware
export const addMobileCorsHeaders = (req, res, next) => {
  // Add specific headers for mobile app requests
  if (req.body && (
    (req.body.successUrl && req.body.successUrl.startsWith('artifactapp://')) ||
    (req.body.cancelUrl && req.body.cancelUrl.startsWith('artifactapp://'))
  )) {
    console.log('📱 [stripe.js] Adding mobile CORS headers');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
};

console.log('📱 [stripe.js] Mobile deep linking enhancements loaded'); 