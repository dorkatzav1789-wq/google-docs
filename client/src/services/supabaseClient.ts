import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://qatbimtrciwwoqoiiejo.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdGJpbXRyY2l3d29xb2lpZWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzODYzODUsImV4cCI6MjA3Njk2MjM4NX0._79TytNLo3sEbLzlyLTsaj67nViI3MT9F18p1tiaEjI';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdGJpbXRyY2l3d29xb2lpZWpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTM4NjM4NSwiZXhwIjoyMDc2OTYyMzg1fQ.C17lSsAeQnwBGcTLthUmTINctolKx4cGx6ukmveAm0g';

// Client for auth operations
console.log('Creating Supabase client with:', {
  url: supabaseUrl,
  anonKey: supabaseAnonKey.slice(0, 20) + '...' // Only log part of the key for security
});
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client with service role for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Dedicated service-role client that never adopts the logged-in user's session.
// Using a separate storageKey + persistSession:false ensures requests are sent
// with the service_role key as Authorization (true service role, bypasses RLS),
// instead of inheriting the current user's JWT from the shared auth storage.
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'sb-service-no-session',
  },
});

// Helper functions to get the clients
export const getSupabaseClient = () => supabase;
export const getSupabaseAdmin = () => supabaseAdmin;
export const getSupabaseService = () => supabaseService;

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
