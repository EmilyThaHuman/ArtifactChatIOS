import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthManager } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AntDesign, FontAwesome, MaterialIcons } from '@expo/vector-icons';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle error messages from callback redirects
    if (params.error) {
      const errorMessages: { [key: string]: string } = {
        session_error: 'Failed to establish session. Please try again.',
        verification_error: 'Failed to verify authentication. Please try again.',
        invalid_callback: 'Invalid authentication callback. Please try again.',
        callback_error: 'Authentication callback error. Please try again.',
      };
      
      const message = errorMessages[params.error as string] || 'Authentication error occurred. Please try again.';
      Alert.alert('Authentication Error', message);
    }
  }, [params.error]);

  // Listen for auth state changes to reset loading states
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth screen: Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ Auth screen: User signed in, clearing loading states');
        setLoadingProvider(null);
        setLoading(false);
        // Navigation will be handled by the main layout
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 Auth screen: User signed out, clearing loading states');
        setLoadingProvider(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await AuthManager.signInWithMagicLink(email);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to send magic link');
      } else {
        Alert.alert(
          'Check your email',
          'A magic link has been sent to your email address. Click the link to sign in.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github' | 'linkedin') => {
    console.log(`🔗 Auth screen: Starting ${provider} OAuth`);
    setLoadingProvider(provider);
    
    try {
      let result;
      switch (provider) {
        case 'google':
          console.log('🔗 Starting Google OAuth authentication');
          result = await AuthManager.signInWithGoogle();
          break;
        case 'github':
          console.log('🔗 Starting GitHub OAuth authentication');
          result = await AuthManager.signInWithGitHub();
          break;
        case 'linkedin':
          console.log('🔗 Starting LinkedIn OAuth authentication');
          result = await AuthManager.signInWithLinkedIn();
          break;
      }

      if (result?.error) {
        console.error(`🚨 ${provider} OAuth Error:`, result.error);
        Alert.alert('Error', result.error.message || 'Authentication failed');
        setLoadingProvider(null);
      }
      // Note: Don't clear loading state here - let the auth state change handle it
      // Don't navigate here either - let the main layout handle navigation
    } catch (error) {
      console.error(`🚨 ${provider} OAuth Exception:`, error);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoadingProvider(null);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleJoinWaitlist = () => {
    // TODO: Implement waitlist functionality
    Alert.alert('Coming Soon', 'Waitlist functionality will be implemented soon');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with Logo */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/images/adaptive-icon.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.logoText}>Artifact</Text>
              </View>
            </View>

            {/* Welcome Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Welcome to Artifact</Text>
            </View>

            {/* OAuth Buttons */}
            <View style={styles.authContainer}>
              {/* Google OAuth */}
              <TouchableOpacity
                style={[styles.oauthButton, loadingProvider === 'google' && styles.buttonDisabled]}
                onPress={() => handleOAuthSignIn('google')}
                disabled={loading || loadingProvider !== null}
                activeOpacity={0.8}
              >
                {loadingProvider === 'google' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <AntDesign name="google" size={20} color="#4285f4" />
                    </View>
                    <Text style={styles.oauthButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* GitHub OAuth */}
              <TouchableOpacity
                style={[styles.oauthButton, loadingProvider === 'github' && styles.buttonDisabled]}
                onPress={() => handleOAuthSignIn('github')}
                disabled={loading || loadingProvider !== null}
                activeOpacity={0.8}
              >
                {loadingProvider === 'github' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <View style={styles.githubIconContainer}>
                      <AntDesign name="github" size={20} color="#000000" />
                    </View>
                    <Text style={styles.oauthButtonText}>Continue with GitHub</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* LinkedIn OAuth */}
              <TouchableOpacity
                style={[styles.oauthButton, loadingProvider === 'linkedin' && styles.buttonDisabled]}
                onPress={() => handleOAuthSignIn('linkedin')}
                disabled={loading || loadingProvider !== null}
                activeOpacity={0.8}
              >
                {loadingProvider === 'linkedin' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <View style={styles.linkedinIconContainer}>
                      <AntDesign name="linkedin-square" size={20} color="#ffffff" />
                    </View>
                    <Text style={styles.oauthButtonText}>Continue with LinkedIn</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Input */}
            <View style={styles.emailContainer}>
              <TextInput
                style={styles.emailInput}
                placeholder="you@example.com"
                placeholderTextColor="#666666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && loadingProvider === null}
              />
            </View>

            {/* Magic Link Button */}
            <TouchableOpacity
              style={[styles.magicLinkButton, (loading || loadingProvider !== null) && styles.buttonDisabled]}
              onPress={handleMagicLink}
              disabled={loading || loadingProvider !== null}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.magicLinkButtonText}>Send magic link</Text>
              )}
            </TouchableOpacity>

            {/* Join Waitlist */}
            <View style={styles.waitlistContainer}>
              <Text style={styles.waitlistText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={handleJoinWaitlist}
                disabled={loading || loadingProvider !== null}
              >
                <Text style={styles.waitlistLink}>Join Waitlist →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 60,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  authContainer: {
    gap: 16,
    marginBottom: 32,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  githubIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkedinIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#0077b5',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oauthButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  emailContainer: {
    marginBottom: 16,
  },
  emailInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333333',
  },
  magicLinkButton: {
    backgroundColor: '#888888',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  magicLinkButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  waitlistContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  waitlistText: {
    color: '#888888',
    fontSize: 16,
  },
  waitlistLink: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
});