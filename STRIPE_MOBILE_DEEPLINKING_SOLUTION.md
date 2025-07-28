# Stripe Deep Linking Solution for React Native

## 🔍 **Issue Analysis**

Based on the latest Stripe documentation and community issues, your deep linking problem has multiple causes:

1. **URL Scheme Mismatch** ✅ (Fixed: `artifactchat://` → `artifactapp://`)
2. **Incorrect Deep Link Handling** ✅ (Fixed: Added proper `handleURLCallback`)
3. **Missing Development Build** ⚠️ (Main Issue: Expo Go can't handle Stripe native code)

## 🎯 **Root Cause: Expo Go Limitation**

**Stripe React Native requires native code modifications that Expo Go cannot support.** You need a development build to enable proper deep linking.

---

## 🚀 **Solution 1: Development Build (Recommended)**

### Step 1: Create Development Build

```bash
# Clean install and prebuild
npx expo install --fix
npx expo prebuild --clean

# For iOS (requires Mac)
npx expo run:ios

# For Android
npx expo run:android
```

### Step 2: Verify Deep Link Handler

Your app now includes the proper deep link handler:

```typescript
// In app/_layout.tsx - ALREADY ADDED
function DeepLinkHandler() {
  const { handleURLCallback } = useStripe();

  const handleDeepLink = useCallback(
    async (url: string | null) => {
      if (url) {
        console.log('🔗 Deep link received:', url);
        const stripeHandled = await handleURLCallback(url);
        
        if (stripeHandled) {
          console.log('✅ Stripe handled the URL successfully');
        } else {
          console.log('ℹ️ Not a Stripe URL, handling normally');
          await LinkingManager.handleDeepLink(url);
        }
      }
    },
    [handleURLCallback]
  );

  // ... rest of the implementation
}
```

### Step 3: Test the Flow

1. **Build and install** the development build on your device
2. **Navigate to onboarding** → subscription step
3. **Select a plan** and proceed to checkout
4. **Complete payment** in Stripe
5. **Click "Open in Application"** when prompted
6. **Verify** your app opens and handles the success/cancel properly

---

## 🛠 **Solution 2: Intermediate Workaround (If Build Fails)**

If you can't create a development build immediately, use this workaround:

### Option A: Web Redirect Method

1. **Change redirect URLs** to use HTTPS instead of custom scheme:

```typescript
// In SubscriptionStep.tsx
successUrl: `https://yourapp.com/stripe-redirect?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
cancelUrl: `https://yourapp.com/stripe-redirect?checkout_canceled=true`,
```

2. **Create a web page** that automatically redirects to your app:

```html
<!-- On yourapp.com/stripe-redirect -->
<script>
  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get('checkout_success');
  const sessionId = params.get('session_id');
  const isCanceled = params.get('checkout_canceled');
  
  if (isSuccess && sessionId) {
    window.location.href = `artifactapp://auth/onboarding?checkout_success=true&session_id=${sessionId}`;
  } else if (isCanceled) {
    window.location.href = `artifactapp://auth/onboarding?checkout_canceled=true`;
  }
</script>
```

### Option B: Manual Return Button

Add a "Return to App" button on your success page that triggers the deep link.

---

## 📱 **Solution 3: Universal Links (iOS) + App Links (Android)**

For production apps, implement universal links:

### iOS Universal Links

1. **Add to app.json**:

```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["applinks:yourapp.com"]
    }
  }
}
```

2. **Host apple-app-site-association** at `https://yourapp.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.artifact.intelligence",
        "paths": ["/stripe-redirect"]
      }
    ]
  }
}
```

### Android App Links

Add to app.json:

```json
{
  "expo": {
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "yourapp.com",
              "pathPrefix": "/stripe-redirect"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

## 🧪 **Testing Guide**

### Test Cases

1. **Custom Scheme** (Development Build):
   - `artifactapp://auth/onboarding?checkout_success=true&session_id=cs_xxx`

2. **Universal Links** (Production):
   - `https://yourapp.com/stripe-redirect?checkout_success=true&session_id=cs_xxx`

### Debug Commands

```bash
# Test deep link manually
npx uri-scheme open "artifactapp://auth/onboarding?checkout_success=true&session_id=test" --ios

# Check URL scheme registration
npx expo config --type introspect | grep -A 5 -B 5 "scheme"
```

---

## 🔧 **Configuration Summary**

### Current Setup ✅

- **URL Scheme**: `artifactapp://` (Fixed)
- **Stripe Provider**: Properly configured with `urlScheme="artifactapp"`
- **Deep Link Handler**: Added to `app/_layout.tsx`
- **Checkout URLs**: Using correct scheme format

### Next Steps

1. **Immediate**: Create development build with `npx expo run:ios`
2. **Testing**: Test checkout flow on physical device
3. **Production**: Implement universal links for App Store release

---

## 📖 **Key Documentation References**

- [Stripe React Native Deep Linking](https://docs.stripe.com/payments/accept-a-payment?platform=react-native#react-native-set-up-return-url)
- [GitHub Issue #1101 Solution](https://github.com/stripe/stripe-react-native/issues/1101)
- [Expo Development Builds](https://docs.expo.dev/development/create-development-builds/)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)

---

## ⚡ **Quick Test**

After creating the development build, test with:

```bash
# Kill Expo Go processes
pkill -f "expo start"

# Start development build
npx expo run:ios

# Test in onboarding flow
```

**Expected Result**: Stripe checkout should redirect back to your app automatically after payment completion. 