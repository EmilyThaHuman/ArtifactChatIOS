# Deep Linking Setup Guide for Artifact Intelligence iOS App

## Overview

This guide explains how to configure deep linking for Supabase authentication in your React Native/Expo app, following the [official Supabase documentation](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

## Current Configuration

### App Configuration

- **Custom URL Scheme**: `artifactapp`
- **Auth Callback URL**: Generated dynamically using `makeRedirectUri()`
- **Bundle ID (iOS)**: `com.artifact.intelligence`
- **Package Name (Android)**: `com.artifact.intelligence`

## Supabase Dashboard Configuration

### 1. Navigate to Authentication Settings

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**

### 2. Add Redirect URLs

Add the following URLs to your **Additional Redirect URLs** list:

**For Mobile App (Required)**:
```
artifactapp://auth/callback
```

**For Development & Testing (if using Expo Go)**:
```
exp://192.168.1.87:8081/--/auth/callback
exp://localhost:19000/--/auth/callback
```

**For Production Web (if applicable)**:
```
https://artifact.chat/auth/callback
```

### 3. Site URL Configuration
Set your **Site URL** to:
```
artifactapp://auth/callback
```

**Important**: The Site URL should match your primary redirect URL for mobile apps.

## Key Implementation Details

### OAuth Flow for Mobile
According to Supabase documentation, mobile apps must:

1. **Use `skipBrowserRedirect: true`** in OAuth configuration
2. **Use `WebBrowser.openAuthSessionAsync()`** to handle the OAuth flow
3. **Use `makeRedirectUri()`** to generate proper redirect URIs
4. **Handle deep links** with `Linking.useURL()` hook

### Redirect URI Patterns
The app uses wildcard patterns as recommended by Supabase:

- `artifactapp://**` - Matches any path with the custom scheme
- `http://localhost:8081/**` - Matches any localhost development URL
- `https://artifact.chat/**` - Matches any production web URL

### Authentication Flow
1. User initiates OAuth (Google, GitHub, LinkedIn)
2. App calls `supabase.auth.signInWithOAuth()` with `skipBrowserRedirect: true`
3. App opens OAuth URL using `WebBrowser.openAuthSessionAsync()`
4. User completes authentication with provider
5. Provider redirects to `artifactapp://auth/callback` with tokens
6. App processes the deep link and extracts tokens
7. App calls `supabase.auth.setSession()` to establish session
8. User is redirected to main app

## Troubleshooting

### Common Issues

1. **"Could not connect to server"**
   - Ensure development server is running
   - Check that redirect URLs are properly configured in Supabase
   - Verify the custom scheme matches in app.json

2. **Redirecting to website instead of app**
   - Ensure `skipBrowserRedirect: true` is set in OAuth options
   - Verify `WebBrowser.openAuthSessionAsync()` is being used
   - Check that the custom scheme is properly registered

3. **Deep link not opening app**
   - Verify the custom scheme in app.json matches Supabase configuration
   - Check that the app is properly installed and scheme is registered
   - Test with a simple deep link first: `artifactapp://test`

### Testing Deep Links

You can test deep links using the following methods:

**iOS Simulator**:
```bash
xcrun simctl openurl booted "artifactapp://auth/callback?access_token=test"
```

**Android Emulator**:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "artifactapp://auth/callback?access_token=test"
```

## Environment Variables

Ensure these environment variables are properly set:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Universal Links (Optional)

For a better user experience, consider implementing Universal Links:

**iOS**: Add associated domains to app.json and configure your domain
**Android**: Add intent filters for your domain

This allows `https://artifact.chat/auth/callback` to open your app directly.

## Security Considerations

1. **Always use HTTPS** for production redirect URLs
2. **Validate tokens** properly in the app
3. **Use secure storage** for session tokens
4. **Implement proper error handling** for failed authentications

## References

- [Supabase Mobile Deep Linking Guide](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase Redirect URLs Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Expo Linking Documentation](https://docs.expo.dev/versions/latest/sdk/linking/)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)

## Implementation Details

### AuthHandler Component

Following the official Supabase pattern, we've implemented:

```typescript
// Key components from Supabase docs:
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession(); // required for web only

const redirectTo = makeRedirectUri({
  scheme: 'artifactapp',
  path: 'auth/callback',
});
```

### Deep Link Handling

The app uses `Linking.useURL()` hook to handle incoming deep links:

```typescript
export default function AuthHandler() {
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      createSessionFromUrl(url).catch(console.error);
    }
  }, [url]);

  return null;
}
```

## iOS Configuration

### Info.plist (Handled by Expo)

Expo automatically configures the URL scheme based on your `app.json`:

```json
{
  "expo": {
    "scheme": "artifactapp",
    "ios": {
      "associatedDomains": ["applinks:artifact-intelligence.com"]
    }
  }
}
```

### Universal Links Setup

For production, Universal Links are configured:

1. **Associated Domains**: Added to iOS configuration
2. **Apple App Site Association**: Host at `https://artifact-intelligence.com/.well-known/apple-app-site-association`
3. **Domain Verification**: Apple will verify domain ownership

## Android Configuration

### Intent Filters (Handled by Expo)

Expo automatically adds intent filters based on configuration:

```json
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "artifact-intelligence.com",
            "pathPrefix": "/auth"
          }
        ],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

## Testing Deep Links

### Development Testing

1. **Expo Go**: Deep links work automatically
2. **Development Build**: Test with:
   ```bash
   npx uri-scheme open artifactapp://auth/callback --ios
   npx uri-scheme open artifactapp://auth/callback --android
   ```

### Authentication Flow Testing

1. Start the app
2. Navigate to sign in
3. Choose OAuth provider (Google, GitHub, LinkedIn)
4. Complete authentication in browser
5. App should automatically return via deep link

### Debug OAuth Flow

Monitor the console for these logs:

```
🔗 OAuth Redirect URL: [generated URL]
🌐 Generated Auth URL: [Supabase auth URL]
✅ OAuth Success URL: [return URL with tokens]
```

## Universal Links for Production

### Apple App Site Association File

Host this at `https://artifact-intelligence.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.artifact.intelligence",
        "paths": ["/auth/*"]
      }
    ]
  }
}
```

### Android App Links

The `autoVerify` intent filter enables Android App Links verification.

## Troubleshooting

### Common Issues

1. **"Invalid redirect URL" error**

   - Ensure `artifactapp://**` is added to Supabase redirect URLs
   - Check for typos in the configuration

2. **App doesn't open after auth**

   - Verify the custom scheme in app.json
   - Test deep link manually with uri-scheme command
   - Check that AuthHandler is included in your app layout

3. **"Token expired" error**

   - Usually means the auth callback took too long
   - Check network connectivity
   - Verify the session creation logic

4. **Development vs Production differences**
   - Development uses custom scheme only
   - Production should use Universal Links for better security

### Debug Steps

1. Check Supabase Auth logs in dashboard
2. Monitor app console during authentication
3. Verify redirect URL configuration matches exactly
4. Test with different OAuth providers
5. Use `npx uri-scheme` to test deep links manually

## Security Considerations

1. **Custom Scheme Security**: Can be hijacked by malicious apps
2. **Universal Links**: More secure, verified by Apple/Google
3. **Token Validation**: Always validate tokens server-side
4. **HTTPS Only**: Use HTTPS for all web-based redirects

## Production Checklist

- [ ] Custom scheme configured in app.json
- [ ] Wildcard redirect URL `artifactapp://**` added to Supabase
- [ ] Universal Links configured for iOS
- [ ] Android App Links configured
- [ ] Apple App Site Association file hosted
- [ ] OAuth providers tested on physical devices
- [ ] Security review completed

## Next Steps

1. **Add Redirect URL to Supabase**: Use `artifactapp://**` (critical step)
2. **Test Authentication Flow**: Try each OAuth provider
3. **Setup Universal Links**: For production security
4. **Monitor Performance**: Check auth completion rates

## Configuration Files Updated

- `app.json`: Added deep linking and Universal Links configuration
- `components/auth/AuthHandler.tsx`: New component following Supabase patterns
- `lib/auth.ts`: Updated to use new auth handler
- `app/_layout.tsx`: Added AuthHandler component

## Support Resources

- [Supabase Mobile Deep Linking Guide](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [Apple Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
