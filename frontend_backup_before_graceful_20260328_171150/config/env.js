// Environment configuration
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  nodeEnv: import.meta.env.MODE || 'development',
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error('Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  }
}

export default config;

