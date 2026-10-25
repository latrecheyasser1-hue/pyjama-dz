import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://odpyxvnsufkxsnboevjr.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcHl4dm5zdWZreHNuYm9ldmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NjM1NzIsImV4cCI6MjEwODUzOTU3Mn0.s-spK0zUox_KCpK7WFD8ajax5P0AILuFL9nacpjbrHg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  // Edge Cache: Cache publicly on Vercel CDN for 10 minutes, serve stale up to 24h
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
