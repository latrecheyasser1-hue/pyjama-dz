import { createClient } from '@supabase/supabase-js';
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env || {});
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://tdhxdnmjmnfjkictdzpk.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaHhkbm1qbW5mamtpY3RkenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIxMDAsImV4cCI6MjEwMjc5ODEwMH0.K3moWEWjE5cvBmFwaGyPspx_yIixii9tY136DgpCZ3g';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

