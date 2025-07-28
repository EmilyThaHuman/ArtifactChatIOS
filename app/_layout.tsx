import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { supabase } from '@/lib/supabase';
import { AuthManager } from '@/lib/auth';
import { router } from 'expo-router';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/constants/Colors';
import * as Linking from 'expo-linking';
import { LinkingManager } from '@/lib/linking';
import AuthHandler from '@/components/auth/AuthHandler';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

interface AppData {
  profile: any;
  workspaces: any[];
  threads: { [workspaceId: string]: any[] };
  threadMessages: { [threadId: string]: any[] };
}

// Deep Link Handler Component for Stripe
function DeepLinkHandler() {
  const { handleURLCallback } = useStripe();

  const handleDeepLink = useCallback(
    async (url: string | null) => {
      if (url) {
        console.log('🔗 Deep link received:', url);
        const stripeHandled = await handleURLCallback(url);
        
        if (stripeHandled) {
          console.log('✅ Stripe handled the URL successfully');
          // This was a Stripe URL - Stripe processed it
        } else {
          console.log('ℹ️ Not a Stripe URL, handling normally');
          // This was NOT a Stripe URL – handle as you normally would
          await LinkingManager.handleDeepLink(url);
        }
      }
    },
    [handleURLCallback]
  );

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      console.log('🔗 Initial URL:', initialUrl);
      handleDeepLink(initialUrl);
    };

    getUrlAsync();

    const deepLinkListener = Linking.addEventListener(
      'url',
      (event: { url: string }) => {
        console.log('🔗 Deep link event received:', event.url);
        handleDeepLink(event.url);
      }
    );

    return () => deepLinkListener?.remove();
  }, [handleDeepLink]);

  return null; // This component only handles deep links, no UI
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [appData, setAppData] = useState<AppData>({
    profile: null,
    workspaces: [],
    threads: {},
    threadMessages: {}
  });

  useEffect(() => {
    console.log('🚀 App layout initializing...');
    // Hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log('🔗 Setting up deep link handlers...');
    // Handle incoming deep links
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', url);
      LinkingManager.handleDeepLink(url);
    };

    // Handle deep link when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep link when app is launched from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Initial deep link found:', url);
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    console.log('🔐 Initializing authentication system...');
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        console.log('👤 Getting current user session...');
        const { user: currentUser } = await AuthManager.getCurrentUser();
        
        if (currentUser) {
          console.log('✅ User session found, fetching user data...');
          setUser(currentUser);
          
          // Check if user profile exists, create if not - with retries
          console.log('📋 Checking user profile...');
          let profile = null;
          let profileError = null;
          let retryCount = 0;
          
          while (retryCount < 3) {
            const result = await AuthManager.getUserProfile(currentUser.id);
            profile = result.data;
            profileError = result.error;
            
            if (!profileError && profile) {
              console.log('✅ Profile found:', profile.id);
              break;
            }
            
            // If profile doesn't exist or we get PGRST116 error, create it
            if (profileError?.code === 'PGRST116' || !profile) {
              console.log(`👤 Attempt ${retryCount + 1}: Creating new user profile...`);
              const { data: newProfile, error: createError } = await AuthManager.createUserProfile(currentUser);
              
              if (createError) {
                console.error('🚨 Failed to create profile:', createError);
                retryCount++;
                continue;
              }
              
              console.log('✅ Profile created successfully:', newProfile?.id);
              profile = newProfile;
              profileError = null;
              break;
            }
            
            retryCount++;
          }
          
          // Fetch comprehensive user data
          const userData = await AuthManager.fetchAndStoreUserData(currentUser);
          
          if (userData.error) {
            console.error('🚨 Failed to fetch user data:', userData.error);
          } else {
            console.log('✅ User data loaded successfully');
            setAppData({
              profile: userData.profile,
              workspaces: userData.workspaces || [],
              threads: userData.threads,
              threadMessages: userData.threadMessages
            });
          }
        } else {
          console.log('ℹ️ No current user session found');
        }
        
        // Set up auth state listener
        console.log('👂 Setting up auth state change listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
                    console.log('🔄 Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in successfully');
          setUser(session.user);
          
          // Check if user profile exists, create if not - with retries
          console.log('📋 Checking user profile...');
          let profile = null;
          let profileError = null;
          let retryCount = 0;
          
          while (retryCount < 3) {
            const result = await AuthManager.getUserProfile(session.user.id);
            profile = result.data;
            profileError = result.error;
            
            if (!profileError && profile) {
              console.log('✅ Profile found:', profile.id);
              break;
            }
            
            // If profile doesn't exist or we get PGRST116 error, create it
            if (profileError?.code === 'PGRST116' || !profile) {
              console.log(`👤 Attempt ${retryCount + 1}: Creating new user profile...`);
              const { data: newProfile, error: createError } = await AuthManager.createUserProfile(session.user);
              
              if (createError) {
                console.error('🚨 Failed to create profile:', createError);
                retryCount++;
                continue;
              }
              
              console.log('✅ Profile created successfully:', newProfile?.id);
              profile = newProfile;
              profileError = null;
              break;
            }
            
            retryCount++;
          }
          
          // Fetch comprehensive user data
          console.log('🔄 Fetching comprehensive user data...');
          const userData = await AuthManager.fetchAndStoreUserData(session.user);
          
          if (userData.error) {
            console.error('🚨 Failed to fetch user data:', userData.error);
            // If user data fetch fails, try to create profile again
            if (userData.error.code === 'PGRST116') {
              console.log('🔄 Attempting profile creation again due to PGRST116 error...');
              const { data: retryProfile, error: retryError } = await AuthManager.createUserProfile(session.user);
              if (!retryError && retryProfile) {
                console.log('✅ Profile created successfully on retry:', retryProfile.id);
                // Try fetching user data again
                const retryUserData = await AuthManager.fetchAndStoreUserData(session.user);
                if (!retryUserData.error) {
                  setAppData({
                    profile: retryUserData.profile,
                    workspaces: retryUserData.workspaces || [],
                    threads: retryUserData.threads,
                    threadMessages: retryUserData.threadMessages
                  });
                }
              }
            }
          } else {
            console.log('✅ User data loaded and stored successfully');
            setAppData({
              profile: userData.profile,
              workspaces: userData.workspaces || [],
              threads: userData.threads,
              threadMessages: userData.threadMessages
            });
          }
          
          // Check onboarding status and navigate appropriately
          if (userData.profile && !userData.profile.onboarding_completed) {
            console.log('🧭 User needs onboarding, redirecting...');
            router.replace('/auth/onboarding');
          } else {
            console.log('🧭 Navigating to main app...');
            router.replace('/(tabs)');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out');
          setUser(null);
          setAppData({
            profile: null,
            workspaces: [],
            threads: {},
            threadMessages: {}
          });
          router.replace('/auth');
        }
          }
        );

        setAuthInitialized(true);
        console.log('✅ Auth initialization completed');
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('🚨 Auth initialization error:', error);
        setAuthInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (authInitialized && !isLoading) {
      console.log('🧭 Checking navigation state...', { 
        user: user ? 'Present' : 'None', 
        authInitialized, 
        isLoading 
      });
      
      if (user) {
        // User is authenticated, check onboarding status
        console.log('✅ User authenticated, checking onboarding status');
        if (appData.profile && !appData.profile.onboarding_completed) {
          console.log('🧭 User needs onboarding');
          router.replace('/auth/onboarding');
        } else {
          console.log('🧭 User onboarded, navigating to main app');
          router.replace('/(tabs)');
        }
      } else {
        // User is not authenticated, redirect to auth
        console.log('🔐 No user found, redirecting to auth');
        router.replace('/auth');
      }
    }
  }, [user, authInitialized, isLoading, appData.profile]);

  if (isLoading || !authInitialized) {
    console.log('⏳ App loading...', { isLoading, authInitialized });
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={Gradients.primary}
          style={styles.loadingGradient}
        >
          <LoadingSpinner size={48} />
        </LinearGradient>
      </View>
    );
  }

  console.log('🎨 Rendering main app layout');
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_STRIPE_PUBLISHABLE_KEY || ''}
      urlScheme="artifactapp" // For deep linking redirects
      merchantIdentifier="merchant.com.artifact.intelligence" // For Apple Pay
    >
      <ErrorBoundary>
        <AuthHandler />
        <DeepLinkHandler />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen 
              name="auth" 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }} 
            />
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }} 
            />
            <Stack.Screen 
              name="conversation/[id]" 
              options={{ 
                headerShown: false,
                presentation: 'modal',
              }} 
            />
            <Stack.Screen 
              name="file/[id]" 
              options={{ 
                headerShown: false,
                presentation: 'modal',
              }} 
            />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ThemeProvider>
      </ErrorBoundary>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});