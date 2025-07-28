# Stripe Deeplink Setup - Universal Links Solution

## Overview

This setup fixes the Stripe deeplink callback issue by implementing **Universal Links** instead of custom URL schemes. Stripe requires HTTPS URLs for callbacks, so we use your `artifact.chat` domain to create a proper web-to-app bridge.

## 🔧 Setup Steps

### 1. Find Your Apple Team ID and Bundle Identifier

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Find your app identifier (should be something like `TEAMID.com.artifact.intelligence`)
3. Note your **Team ID** (e.g., `ABCDE12345`) and **Bundle ID** (e.g., `com.artifact.intelligence`)

### 2. Update Apple App Site Association File

Update the `apple-app-site-association.json` file with your actual Team ID:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["YOUR_TEAM_ID.com.artifact.intelligence"],
        "components": [
          {
            "/": "/app/*",
            "comment": "Matches any URL whose path starts with /app/ and opens the mobile app"
          },
          {
            "/": "/auth/stripe-success*",
            "comment": "Matches Stripe success callback URLs and opens the mobile app"
          },
          {
            "/": "/auth/stripe-cancel*", 
            "comment": "Matches Stripe cancel callback URLs and opens the mobile app"
          }
        ]
      }
    ]
  },
  "activitycontinuation": {
    "apps": ["YOUR_TEAM_ID.com.artifact.intelligence"]
  },
  "webcredentials": {
    "apps": ["YOUR_TEAM_ID.com.artifact.intelligence"]
  }
}
```

**Replace `YOUR_TEAM_ID` with your actual Apple Team ID.**

### 3. Deploy AASA File to Your Web Server

The `apple-app-site-association` file must be served from:
- `https://artifact.chat/.well-known/apple-app-site-association`

**Important Requirements:**
- Must be served over **HTTPS**
- Must return **Content-Type: application/json**
- Must return **HTTP 200** status code
- No redirects allowed

**For your web server (Node.js/Express example):**

```javascript
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).send(fs.readFileSync(__dirname + '/apple-app-site-association.json'));
});
```

### 4. Create Web Redirect Pages

You need to create these pages on your `artifact.chat` website:

**`/auth/stripe-success`** - Handles successful payments:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Successful</title>
    <meta name="apple-itunes-app" content="app-id=YOUR_APP_STORE_ID">
</head>
<body>
    <h1>Payment Successful!</h1>
    <p>Redirecting to the app...</p>
    <script>
        // Auto-redirect to app after 2 seconds
        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');
            window.location.href = `artifactapp://auth/onboarding?checkout_success=true&session_id=${sessionId}`;
        }, 2000);
    </script>
</body>
</html>
```

**`/auth/stripe-cancel`** - Handles canceled payments:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Canceled</title>
    <meta name="apple-itunes-app" content="app-id=YOUR_APP_STORE_ID">
</head>
<body>
    <h1>Payment Canceled</h1>
    <p>Redirecting to the app...</p>
    <script>
        // Auto-redirect to app after 2 seconds
        setTimeout(() => {
            window.location.href = 'artifactapp://auth/onboarding?checkout_canceled=true';
        }, 2000);
    </script>
</body>
</html>
```

### 5. Rebuild Your iOS App

After updating the Apple App Site Association file:

1. Build and deploy your website changes
2. Rebuild your iOS app: `eas build --platform ios`
3. Install the new build on your test device

### 6. Test the Flow

1. Start the subscription process in your app
2. Complete payment in Stripe
3. You should be redirected to `https://artifact.chat/auth/stripe-success`
4. The page should automatically redirect back to your app
5. Universal Links should open the app directly without the browser popup

## 🐛 Troubleshooting

### Validation Tools
- [Branch AASA Validator](https://branch.io/resources/aasa-validator/)
- [Apple Universal Links Tester](https://search.developer.apple.com/appsearch-validation-tool)

### Common Issues

1. **"This page wants to open an app" popup still appears**
   - AASA file is not served correctly
   - Team ID/Bundle ID mismatch
   - App not rebuilt after AASA changes

2. **Universal Links not working**
   - Clear Safari cache and re-install app
   - Verify AASA file accessibility
   - Check Team ID in Apple Developer Portal

3. **App opens but wrong screen**
   - Check router navigation in `stripe-success.tsx`
   - Verify URL parameter parsing

### Debug Commands

Test AASA file availability:
```bash
curl -I https://artifact.chat/.well-known/apple-app-site-association
```

Should return:
```
HTTP/2 200
content-type: application/json
```

## 📱 How It Works

1. **User completes Stripe payment**
2. **Stripe redirects to** `https://artifact.chat/auth/stripe-success?session_id=...`
3. **Web page loads** with success message
4. **Universal Link triggers** app to open automatically
5. **App handles redirect** via the new `stripe-success.tsx` route
6. **Success!** User is back in the app with payment completed

This solution eliminates the browser popup and provides a seamless payment experience!

## 🔗 Additional Resources

- [iOS Universal Links Documentation](https://docs.expo.dev/linking/ios-universal-links/)
- [Apple Universal Links Guide](https://developer.apple.com/ios/universal-links/)
- [Stripe Mobile Integration Best Practices](https://stripe.com/docs/mobile) 