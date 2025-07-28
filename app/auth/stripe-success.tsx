import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/constants/Colors';

export default function StripeSuccessPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleStripeSuccess = async () => {
      try {
        console.log('🎉 Stripe success callback received:', params);
        
        // Extract session_id from params
        const sessionId = params.session_id as string;
        
        if (sessionId) {
          console.log('✅ Redirecting to onboarding with session ID:', sessionId);
          
          // Redirect to onboarding with success parameters
          router.replace({
            pathname: '/auth/onboarding',
            params: {
              checkout_success: 'true',
              session_id: sessionId,
            },
          });
        } else {
          console.error('❌ No session ID found in Stripe callback');
          router.replace({
            pathname: '/auth/onboarding',
            params: {
              checkout_success: 'false',
              error: 'No session ID provided',
            },
          });
        }
      } catch (error) {
        console.error('❌ Error handling Stripe success:', error);
        router.replace({
          pathname: '/auth/onboarding',
          params: {
            checkout_success: 'false',
            error: 'Failed to process payment callback',
          },
        });
      }
    };

    // Small delay to ensure proper navigation
    const timer = setTimeout(handleStripeSuccess, 100);
    
    return () => clearTimeout(timer);
  }, [params, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={Gradients.primary} style={styles.gradient}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Redirecting you back to the app...
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 