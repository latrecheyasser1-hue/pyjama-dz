const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://odpyxvnsufkxsnboevjr.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcHl4dm5zdWZreHNuYm9ldmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NjM1NzIsImV4cCI6MjEwODUzOTU3Mn0.s-spK0zUox_KCpK7WFD8ajax5P0AILuFL9nacpjbrHg';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Supabase fetch failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
