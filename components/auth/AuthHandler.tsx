import React, { useEffect, useState, createContext, useContext } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession(); // required for web only

// Always use custom scheme for mobile app - don't rely on makeRedirectUri for development
const redirectTo = 'artifactapp://auth/callback';

console.log('🔗 AuthHandler: Using fixed redirect URI:', redirectTo);

// Create Auth Context
interface AuthContextType {
  user: any;
  isLoading: boolean;
  profile: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  profile: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthHandler');
  }
  return context;
};

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

interface AuthHandlerProps {
  children: React.ReactNode;
}

export default function AuthHandler({ children }: AuthHandlerProps) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

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

  // Fetch user profile when user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          console.log('👤 AuthHandler: Fetching user profile for:', user.id);
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('🚨 AuthHandler: Profile fetch error:', error);
          } else {
            console.log('✅ AuthHandler: Profile fetched successfully');
            setProfile(data);
          }
        } catch (error) {
          console.error('🚨 AuthHandler: Profile fetch exception:', error);
        }
      } else {
        setProfile(null);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Monitor authentication state
  useEffect(() => {
    console.log('🔄 AuthHandler: Setting up auth state listener');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 AuthHandler: Initial session check:', session?.user?.id || 'No session');
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthHandler: Auth state changed:', event, session?.user?.id || 'No user');
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    console.log('🧭 AuthHandler: Navigation check:', {
      user: user?.id || 'No user',
      inAuthGroup,
      segments
    });

    if (!user && !inAuthGroup) {
      // Not authenticated and not in auth group - redirect to auth
      console.log('🧭 AuthHandler: Redirecting to auth - user not authenticated');
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // Authenticated but in auth group - redirect to main app
      console.log('🧭 AuthHandler: Redirecting to main app - user authenticated');
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  // Show loading or children based on state
  if (isLoading) {
    console.log('🔄 AuthHandler: Loading authentication state...');
    return null; // Could show a loading spinner here
  }

  console.log('✅ AuthHandler: Rendering app with user:', user?.id || 'No user');
  
  // Provide auth context to children
  const authContextValue = {
    user,
    isLoading,
    profile,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export { performOAuth, sendMagicLink, redirectTo, createSessionFromUrl }; 