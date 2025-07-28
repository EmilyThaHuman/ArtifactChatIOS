import { supabase } from '@/lib/supabase';

// Rate limiting implementation
interface RateLimitState {
  requests: number[];
  maxRequests: number;
  windowMs: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

const checkRateLimit = async (key: string, maxRequests = 50, windowMs = 60000) => {
  const now = Date.now();
  const state = rateLimitStates.get(key) || { requests: [], maxRequests, windowMs };
  
  // Remove old requests outside the window
  state.requests = state.requests.filter(time => now - time < state.windowMs);
  
  if (state.requests.length >= state.maxRequests) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  state.requests.push(now);
  rateLimitStates.set(key, state);
};

export interface WebSearchParams {
  query: string;
  limit?: number;
  searchContextSize?: 'low' | 'medium' | 'high';
  userLocation?: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
}

export interface WebSearchSource {
  url: string;
  title: string;
  description: string;
  text: string;
  published?: string;
  image?: string;
  metadata?: any;
}

export interface WebSearchResult {
  content: string;
  markdown: string;
  sources: WebSearchSource[];
  metadata: {
    query: string;
    timestamp: string;
    provider: string;
    requestId?: string;
    autopromptString?: string;
    resolvedSearchType?: string;
    searchTime?: number;
    totalSources: number;
    usage?: any;
    costDollars?: any;
  };
  data: WebSearchSource[];
  totalResults: number;
  summary: {
    query: string;
    resultsFound: number;
    searchType?: string;
    searchTime?: number;
  };
  success: boolean;
  isError: boolean;
}

export interface WebSearchError {
  error: true;
  message: string;
  details?: string;
  timestamp: string;
  query?: string;
  isError: true;
}

export class WebSearchService {
  private static instance: WebSearchService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3002';
  }

  static getInstance(): WebSearchService {
    if (!WebSearchService.instance) {
      WebSearchService.instance = new WebSearchService();
    }
    return WebSearchService.instance;
  }

  async search(params: WebSearchParams): Promise<WebSearchResult | WebSearchError> {
    const {
      query,
      limit = 10,
      searchContextSize = 'medium',
      userLocation,
    } = params;

    try {
      // Apply rate limiting
      await checkRateLimit('web_search', 50, 60000);

      // Validate inputs
      if (!query?.trim()) {
        return {
          error: true,
          message: 'No search query provided',
          timestamp: new Date().toISOString(),
          isError: true,
        };
      }

      // Get user info for tracking
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log(`🔍 [WebSearchService] Executing search: "${query}"`);

      // Call the web search API endpoint
      const response = await fetch(`${this.baseUrl}/api/tools/web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit,
          searchContextSize,
          userLocation,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const apiResult = await response.json();

      if (!apiResult?.result?.data) {
        throw new Error('Invalid response format from web search API');
      }

      // Extract the data object from the response format
      const searchData = apiResult.result.data;
      const searchResults = searchData.results || [];

      console.log(`🔍 [WebSearchService] Found ${searchResults.length} results`);

      // Extract cost information if available
      const costInfo = searchData.costDollars || {};
      const actualUsage = {
        total_cost: costInfo.total || 0,
        search_cost: costInfo.search?.neural || 0,
        content_cost:
          (costInfo.contents?.text || 0) + (costInfo.contents?.highlights || 0),
        search_time: searchData.searchTime || 0,
      };

      // Create a summary from search results
      let mainContent = '';
      if (searchResults.length > 0) {
        mainContent = `Found ${searchResults.length} relevant results for: "${query}". `;

        // Add a brief summary from the first few results
        const topResults = searchResults.slice(0, 3);
        const summaryItems = topResults.map(
          (result: any) =>
            `${result.title}: ${result.description?.substring(0, 100)}...`,
        );
        mainContent += summaryItems.join(' | ');
      } else {
        mainContent = `Search completed for: "${query}" but no results were found.`;
      }

      // Format response to match expected tool format
      const formattedResult: WebSearchResult = {
        // Main content summary
        content: mainContent,
        markdown: mainContent,

        // Sources/citations from search results
        sources: searchResults.map((result: any) => ({
          url: result.url,
          title: result.title,
          description: result.description,
          text: result.text,
          published: result.publishedDate,
          image: result.image,
          metadata: {
            id: result.id,
            ...result.metadata,
          },
        })),

        // Metadata with search information
        metadata: {
          query,
          timestamp: new Date().toISOString(),
          provider: 'langgraph_web_search',
          requestId: searchData.requestId,
          autopromptString: searchData.autopromptString,
          resolvedSearchType: searchData.resolvedSearchType,
          searchTime: searchData.searchTime,
          totalSources: searchResults.length,
          usage: actualUsage,
          costDollars: costInfo,
        },

        // Additional properties for compatibility
        data: searchResults,
        totalResults: searchResults.length,
        summary: {
          query: searchData.autopromptString || query,
          resultsFound: searchResults.length,
          searchType: searchData.resolvedSearchType,
          searchTime: searchData.searchTime,
        },

        // Success indicator
        success: true,
        isError: false,
      };

      return formattedResult;
    } catch (error: any) {
      console.error(`🔍 [WebSearchService] Search failed:`, error);

      return {
        error: true,
        message: error.message || 'Failed to execute web search',
        details: error.stack,
        timestamp: new Date().toISOString(),
        query,
        isError: true,
      };
    }
  }

  // Helper method to extract domain from URL
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  // Helper method to get favicon URL
  static getFaviconUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
    } catch {
      return '';
    }
  }

  // Helper method to format search results for display
  static formatResultsForDisplay(results: WebSearchResult): {
    summary: string;
    sources: Array<{
      title: string;
      url: string;
      domain: string;
      description: string;
      favicon: string;
    }>;
  } {
    return {
      summary: results.content,
      sources: results.sources.slice(0, 5).map(source => ({
        title: source.title,
        url: source.url,
        domain: this.extractDomain(source.url),
        description: source.description,
        favicon: this.getFaviconUrl(source.url),
      })),
    };
  }
}

// Export singleton instance
export const webSearchService = WebSearchService.getInstance();

export default webSearchService; 