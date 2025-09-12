import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://nxukhhhdkuhdxmwbqmfr.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dWtoaGhka3VoZHhtd2JxbWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTA4MDksImV4cCI6MjA3MTQyNjgwOX0._Iss6f-KEyheF4nAsq7skCiFZtLhfdWWHjtggSe0vZY';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dWtoaGhka3VoZHhtd2JxbWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg1MDgwOSwiZXhwIjoyMDcxNDI2ODA5fQ.yhWr-A0oZ1jmWJ3tWSfhCG8WEwrghNgNZDDZubyNlfI';

// Singleton pattern to prevent multiple instances
let _supabase: any = null;
let _supabaseAdmin: any = null;

export const getSupabaseClient = () => {
  if (!_supabase) {
    console.log('Creating Supabase client with:', {
      url: supabaseUrl,
      anonKey: supabaseAnonKey.slice(0, 20) + '...' // Only log part of the key for security
    });
    
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return _supabase;
};

export const getSupabaseAdmin = () => {
  if (!_supabaseAdmin) {
    console.log('Creating Supabase admin client');
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
};

// Export instances for backward compatibility - but only when needed
export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdmin();

// Auth context types
export type AuthUser = {
  id: string;
  email?: string;
  role?: 'admin' | 'user';
};

export type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser | undefined>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};
