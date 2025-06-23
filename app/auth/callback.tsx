import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 Auth callback started with params:', params);
        console.log('🔐 Auth callback: Processing authentication...');
        
        // Get the current URL
        let url = await Linking.getInitialURL();
        
        if (!url) {
          // Fallback: construct URL from params if no initial URL
          const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
            .join('&');
          url = `artifactapp://auth/callback?${queryString}`;
          console.log('🔐 Auth callback: Constructed URL from params:', url);
        } else {
          console.log('🔐 Auth callback: Using initial URL:', url);
        }
        
        console.log('🔐 Auth callback: Processing callback URL...');
        await processAuthCallback(url);
      } catch (error) {
        console.error('🚨 Auth callback error:', error);
        console.log('🔐 Auth callback: Redirecting to auth with error');
        router.replace('/auth?error=callback_error');
      }
    };

    handleAuthCallback();
  }, [params]);

  const processAuthCallback = async (url: string) => {
    try {
      console.log('🔐 Auth callback: Parsing URL for auth tokens...');
      // Parse the URL for auth tokens
      const { params: urlParams, errorCode } = QueryParams.getQueryParams(url);
      
      if (errorCode) {
        console.error('🚨 Auth callback: Error code found:', errorCode);
        router.replace(`/auth?error=${errorCode}`);
        return;
      }

      const { access_token, refresh_token, error: authError } = urlParams;
      
      console.log('🔐 Auth callback: Token check:', {
        access_token: access_token ? 'Present' : 'Missing',
        refresh_token: refresh_token ? 'Present' : 'Missing',
        authError: authError || 'None'
      });
      
      if (authError) {
        console.error('🚨 Auth callback: Auth error:', authError);
        router.replace(`/auth?error=${authError}`);
        return;
      }

      if (access_token && refresh_token) {
        console.log('✅ Auth callback: Tokens found, setting session...');
        
        // Set the session in Supabase
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error('🚨 Auth callback: Session error:', error);
          router.replace('/auth?error=session_error');
          return;
        }

        if (data.session) {
          console.log('✅ Auth callback: Session established successfully');
          console.log('👤 Auth callback: User info:', {
            id: data.session.user.id,
            email: data.session.user.email,
            created_at: data.session.user.created_at
          });
          
          console.log('🧭 Auth callback: Authentication complete, navigating to main app...');
          // The auth state change listener in _layout.tsx will handle navigation
          // But we can also navigate directly as a fallback
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 100);
        } else {
          console.error('🚨 Auth callback: No session returned after setting tokens');
          router.replace('/auth?error=verification_error');
        }
      } else {
        console.error('🚨 Auth callback: Missing tokens:', { 
          access_token: !!access_token, 
          refresh_token: !!refresh_token 
        });
        router.replace('/auth?error=invalid_callback');
      }
    } catch (error) {
      console.error('🚨 Auth callback: Error processing callback:', error);
      router.replace('/auth?error=callback_error');
    }
  };

  console.log('🎨 Auth callback: Rendering loading screen...');
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8b5cf6" />
      <Text style={styles.text}>Completing authentication...</Text>
      <Text style={styles.subText}>Please wait while we securely log you in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 32,
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  subText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
}); 