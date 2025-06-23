import React, { useEffect } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession(); // required for web only

// Always use custom scheme for mobile app - don't rely on makeRedirectUri for development
const redirectTo = 'artifactapp://auth/callback';

console.log('🔗 AuthHandler: Using fixed redirect URI:', redirectTo);

const createSessionFromUrl = async (url: string) => {
  console.log('🔐 AuthHandler: Creating session from URL:', url);
  
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    console.error('🚨 AuthHandler: Error code in URL:', errorCode);
    throw new Error(errorCode);
  }
  
  const { access_token, refresh_token } = params;
  if (!access_token) {
    console.log('ℹ️ AuthHandler: No access token found in URL');
    return;
  }
  
  console.log('✅ AuthHandler: Setting session with tokens from URL');
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  
  if (error) {
    console.error('🚨 AuthHandler: Session creation error:', error);
    throw error;
  }
  
  console.log('✅ AuthHandler: Session created successfully');
  return data.session;
};

const performOAuth = async (provider: 'google' | 'github' | 'linkedin_oidc') => {
  console.log(`🔐 AuthHandler: Starting ${provider} OAuth flow`);
  console.log('🔐 AuthHandler: Redirect URI:', redirectTo);
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true, // Critical for mobile apps
      },
    });
    
    if (error) {
      console.error(`🚨 AuthHandler: ${provider} OAuth error:`, error);
      throw error;
    }
    
    if (!data?.url) {
      console.error(`🚨 AuthHandler: No OAuth URL returned for ${provider}`);
      throw new Error('No OAuth URL returned');
    }
    
    console.log(`🌐 AuthHandler: Opening ${provider} OAuth browser session`);
    console.log('🔗 AuthHandler: OAuth URL:', data.url);
    
    const res = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo
    );
    
    console.log('🔄 AuthHandler: Browser session result:', res);
    
    if (res.type === 'success') {
      console.log('✅ AuthHandler: OAuth success, creating session');
      const { url } = res;
      await createSessionFromUrl(url);
    } else if (res.type === 'cancel') {
      console.log('⚠️ AuthHandler: OAuth cancelled by user');
      throw new Error('OAuth cancelled by user');
    } else {
      console.error('🚨 AuthHandler: OAuth failed:', res);
      throw new Error('OAuth authentication failed');
    }
  } catch (error) {
    console.error(`🚨 AuthHandler: ${provider} OAuth exception:`, error);
    throw error;
  }
};

const sendMagicLink = async (email: string) => {
  console.log('📧 AuthHandler: Sending magic link to:', email);
  console.log('🔗 AuthHandler: Magic link redirect URI:', redirectTo);
  
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    
    if (error) {
      console.error('🚨 AuthHandler: Magic link error:', error);
      throw error;
    }
    
    console.log('✅ AuthHandler: Magic link sent successfully');
  } catch (error) {
    console.error('🚨 AuthHandler: Magic link exception:', error);
    throw error;
  }
};

export default function AuthHandler() {
  // Handle linking into app from email app or OAuth redirect
  const url = Linking.useURL();
  
  useEffect(() => {
    if (url) {
      console.log('🔗 AuthHandler: Received deep link URL:', url);
      createSessionFromUrl(url).catch((error) => {
        console.error('🚨 AuthHandler: Deep link session creation failed:', error);
      });
    }
  }, [url]);

  return null; // This component doesn't render anything
}

export { performOAuth, sendMagicLink, redirectTo, createSessionFromUrl }; 