import { Platform } from 'react-native';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3002';

// Default headers for React Native requests
const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': `ArtifactApp/${Platform.OS}`,
  'X-Requested-With': 'XMLHttpRequest',
});

// API Client class
export class ApiClient {
  private static baseURL = API_BASE_URL;

  /**
   * Make a GET request
   */
  static async get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * Make a POST request
   */
  static async post(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a PUT request
   */
  static async put(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a DELETE request
   */
  static async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  /**
   * Core request method with error handling and retry logic
   */
  private static async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...options.headers,
      },
    };

    console.log(`🌐 [API] ${config.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, config);
      
      // Log response details
      console.log(`📊 [API] Response: ${response.status} ${response.statusText}`);
      
      // Handle different response types
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const error = new ApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
        console.error(`❌ [API] Error:`, error);
        throw error;
      }

      // Parse successful response
      const data = await this.parseSuccessResponse(response);
      console.log(`✅ [API] Success:`, data);
      return data;
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(`🚫 [API] Network Error: Cannot reach ${url}`);
        throw new ApiError('Network connection failed. Please check your internet connection.', 0);
      }
      
      console.error(`💥 [API] Unexpected Error:`, error);
      throw new ApiError('An unexpected error occurred', 0, { originalError: error });
    }
  }

  /**
   * Parse error response
   */
  private static async parseErrorResponse(response: Response) {
    try {
      const text = await response.text();
      if (!text) return { error: 'Unknown error' };
      
      try {
        return JSON.parse(text);
      } catch {
        return { error: text };
      }
    } catch {
      return { error: 'Failed to parse error response' };
    }
  }

  /**
   * Parse success response
   */
  private static async parseSuccessResponse(response: Response) {
    const text = await response.text();
    if (!text) return {};
    
    try {
      return JSON.parse(text);
    } catch {
      return { data: text };
    }
  }

  /**
   * Test API connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 [API] Testing connection...');
      await this.get('/api/stripe/plans');
      console.log('✅ [API] Connection test successful');
      return { success: true };
    } catch (error) {
      console.error('❌ [API] Connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof ApiError ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Get API health status
   */
  static async getHealthStatus() {
    try {
      const response = await this.get('/');
      return { healthy: true, ...response };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof ApiError ? error.message : 'Health check failed' 
      };
    }
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number = 0, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }
}

// Export the base URL for use in other files
export { API_BASE_URL };

// Export a default instance
export default ApiClient; 