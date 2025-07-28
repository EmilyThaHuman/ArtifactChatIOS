import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { Colors, Gradients } from '@/constants/Colors';

export default function StripeCancelPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleStripeCancel = async () => {
      try {
        console.log('❌ Stripe cancel callback received:', params);
        
        // Redirect to onboarding with cancel parameters
        router.replace({
          pathname: '/auth/onboarding',
          params: {
            checkout_canceled: 'true',
          },
        });
      } catch (error) {
        console.error('❌ Error handling Stripe cancel:', error);
        router.replace({
          pathname: '/auth/onboarding',
          params: {
            checkout_canceled: 'true',
            error: 'Failed to process payment cancellation',
          },
        });
      }
    };

    // Small delay to ensure proper navigation
    const timer = setTimeout(handleStripeCancel, 100);
    
    return () => clearTimeout(timer);
  }, [params, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={Gradients.primary} style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <X size={48} color="#ffffff" />
          </View>
          <Text style={styles.title}>Payment Canceled</Text>
          <Text style={styles.subtitle}>
            Redirecting you back to the app...
          </Text>
          <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
}); 