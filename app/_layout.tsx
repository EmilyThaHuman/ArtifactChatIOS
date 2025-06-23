import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

interface AppData {
  profile: any;
  workspaces: any[];
  threads: { [workspaceId: string]: any[] };
  threadMessages: { [threadId: string]: any[] };
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
              
              // Check if user profile exists, create if not
              console.log('📋 Checking user profile...');
              const { data: profile } = await AuthManager.getUserProfile(session.user.id);
              if (!profile) {
                console.log('👤 Creating new user profile...');
                await AuthManager.createUserProfile(session.user);
              }
              
              // Fetch comprehensive user data
              console.log('🔄 Fetching comprehensive user data...');
              const userData = await AuthManager.fetchAndStoreUserData(session.user);
              
              if (userData.error) {
                console.error('🚨 Failed to fetch user data:', userData.error);
              } else {
                console.log('✅ User data loaded and stored successfully');
                setAppData({
                  profile: userData.profile,
                  workspaces: userData.workspaces || [],
                  threads: userData.threads,
                  threadMessages: userData.threadMessages
                });
              }
              
              // Navigate to main app
              console.log('🧭 Navigating to main app...');
              router.replace('/(tabs)');
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
        // User is authenticated, ensure we're on the main app
        console.log('✅ User authenticated, ensuring main app navigation');
        if (router.canGoBack()) {
          router.replace('/(tabs)');
        }
      } else {
        // User is not authenticated, redirect to auth
        console.log('🔐 No user found, redirecting to auth');
        router.replace('/auth');
      }
    }
  }, [user, authInitialized, isLoading]);

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
    <ErrorBoundary>
      <AuthHandler />
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