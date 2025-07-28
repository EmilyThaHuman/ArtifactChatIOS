import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export class LinkingManager {
  /**
   * Get the current app's deep link URL scheme
   */
  static getAppScheme(): string {
    return 'artifactapp';
  }

  /**
   * Create a deep link URL for the app
   */
  static createURL(path: string = ''): string {
    const scheme = this.getAppScheme();
    return `${scheme}://${path.replace(/^\//, '')}`;
  }

  /**
   * Parse URL parameters from a deep link
   */
  static parseURL(url: string): { [key: string]: string } {
    try {
      const parsed = new URL(url);
      const params: { [key: string]: string } = {};
      
      // Get query parameters
      parsed.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // Get hash parameters (common in OAuth flows)
      if (parsed.hash) {
        const hashParams = new URLSearchParams(parsed.hash.substring(1));
        hashParams.forEach((value, key) => {
          params[key] = value;
        });
      }
      
      return params;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return {};
    }
  }

  /**
   * Handle incoming deep links
   */
  static async handleDeepLink(url: string): Promise<boolean> {
    try {
      const params = this.parseURL(url);
      console.log('Deep link received:', url, params);
      
      // Check if this is an auth callback
      if (url.includes('/auth/callback')) {
        return true; // Let the auth callback route handle it
      }
      
      // Check if this is a Stripe success callback
      if (url.includes('/auth/stripe-success')) {
        console.log('🔄 Stripe success redirect detected:', params);
        return true; // Let the appropriate route handle it
      }
      
      // Check if this is a Stripe cancel callback
      if (url.includes('/auth/stripe-cancel')) {
        console.log('🔄 Stripe cancel redirect detected:', params);
        return true; // Let the appropriate route handle it
      }
      
      // Legacy check for direct onboarding URLs (backward compatibility)
      if (url.includes('/auth/onboarding') && (params.checkout_success || params.checkout_canceled)) {
        console.log('🔄 Legacy Stripe checkout redirect detected:', params);
        return true; // Let the onboarding route handle it
      }
      
      return false;
    } catch (error) {
      console.error('Error handling deep link:', error);
      return false;
    }
  }

  /**
   * Get the redirect URI for OAuth providers
   */
  static getOAuthRedirectURI(): string {
    if (Platform.OS === 'web') {
      return `${window.location.origin}/auth/callback`;
    }
    return 'artifactapp://auth/callback';
  }

  /**
   * Get the redirect URI for magic links
   */
  static getMagicLinkRedirectURI(): string {
    if (Platform.OS === 'web') {
      return `${window.location.origin}/auth/callback`;
    }
    return 'artifactapp://auth/callback';
  }
} 