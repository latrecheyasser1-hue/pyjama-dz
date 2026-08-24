import { createClient } from '@supabase/supabase-js';
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env || {});
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://lrepmdrzpgvctssywjsn.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZXBtZHJ6cGd2Y3Rzc3l3anNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTE4OTAsImV4cCI6MjEwMzE2Nzg5MH0.lzHxSmKiVHytt8-Rvr0uKEbtYVb0rylGcnViiXSFQjc';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

