import { createClient } from '@supabase/supabase-js';
import config from '../config/env.js';

const supabaseUrl = config.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = config.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);