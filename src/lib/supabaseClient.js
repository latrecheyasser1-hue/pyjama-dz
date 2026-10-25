import { createClient } from '@supabase/supabase-js';
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env || {});
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://odpyxvnsufkxsnboevjr.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcHl4dm5zdWZreHNuYm9ldmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NjM1NzIsImV4cCI6MjEwODUzOTU3Mn0.s-spK0zUox_KCpK7WFD8ajax5P0AILuFL9nacpjbrHg';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

