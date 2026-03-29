// Centralized API configuration.
// In production, VITE_API_BASE_URL must point to the deployed backend.
const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  '';

const API_BASE_URL = rawApiBaseUrl.trim().replace(/\/+$/, '');
const IS_PRODUCTION = import.meta.env.MODE === 'production';

if (IS_PRODUCTION && !API_BASE_URL) {
  console.error(
    '[CONFIG] Missing VITE_API_BASE_URL in production. ' +
      'Set it to your deployed backend URL (e.g. https://your-backend.vercel.app).'
  );
}

// Helper to get token from Supabase session
async function getSupabaseToken() {
  try {
    // Try to get from Supabase session
    const { supabase } = await import('../utils/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn('Failed to get Supabase token:', error);
    return null;
  }
}

// Helper to get authId from Supabase session
async function getSupabaseAuthId() {
  try {
    const { supabase } = await import('../utils/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.warn('Failed to get Supabase authId:', error);
    return null;
  }
}

// Create API client with error handling
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    if (IS_PRODUCTION && !this.baseURL && endpoint.startsWith('/api')) {
      throw new Error(
        'Configuration error: VITE_API_BASE_URL is not set for production. ' +
          'The frontend cannot reach backend API routes.'
      );
    }

    // Get token from Supabase session (preferred) or localStorage fallback
    const token = await getSupabaseToken() || localStorage.getItem('token');
    // Get authId from Supabase session (preferred) or localStorage fallback
    const authId = (await getSupabaseAuthId()) || localStorage.getItem('authId') || options.authId;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (authId) {
      headers['x-auth-id'] = authId;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      // Extract body and signal from options
      const { body, signal, ...fetchOptions } = options;
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body,
        signal, // Support abort signals
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type') || '';
      
      // Handle blob responses (for QR code images and PDFs)
      if (contentType.includes('image/') || contentType.includes('application/pdf')) {
        const blob = await response.blob();
        return blob;
      }

      // Check if response is HTML (error page) instead of JSON
      if (contentType.includes('text/html')) {
        const text = await response.text();
        console.error('Received HTML instead of JSON:', text.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. This usually means the API endpoint is incorrect or the server is not running. Status: ${response.status}`);
      }

      if (!response.ok) {
        // Try to parse error as JSON, but handle HTML errors
        let errorData;
        try {
          const text = await response.text();
          // Check if it's HTML
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error(`Server returned HTML error page. Status: ${response.status} ${response.statusText}`);
          }
          errorData = JSON.parse(text);
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse JSON response
      try {
        const text = await response.text();
        // Double-check it's not HTML
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('Received HTML instead of JSON:', text.substring(0, 200));
          throw new Error('Server returned HTML instead of JSON. Check API endpoint configuration.');
        }
        const jsonData = JSON.parse(text);
        return jsonData;
      } catch (parseError) {
        if (parseError.message.includes('HTML')) {
          throw parseError;
        }
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    } catch (error) {
      // Handle abort errors - don't throw if it's a cleanup cancellation
      if (error.name === 'AbortError') {
        // Return a cancelled indicator instead of throwing
        const cancelledError = new Error('Request cancelled');
        cancelledError.name = 'AbortError';
        cancelledError.cancelled = true;
        throw cancelledError;
      }
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
export { API_BASE_URL };

