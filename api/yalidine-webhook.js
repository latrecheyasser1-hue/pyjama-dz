const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-YALIDINE-SIGNATURE');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Mandatory CRC Challenge Verification for Yalidine (Guepex)
  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const crcToken = req.query?.crc_token || urlObj.searchParams.get('crc_token');
    
    if (crcToken) {
      console.log('✅ Yalidine CRC Token Verified:', crcToken);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(crcToken);
    }
    return res.status(200).send('Yalidine Webhook Ready');
  }

  // 2. Process incoming parcel events
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      console.log('📦 Yalidine Webhook Event received:', JSON.stringify(body, null, 2));

      if (body && Array.isArray(body.events)) {
        for (const ev of body.events) {
          const tracking = ev.data?.tracking;
          const status = ev.data?.status;

          if (tracking && status) {
            console.log(`Updating tracking ${tracking} -> Status: ${status}`);

            // Map Yalidine status to internal status
            let internalStatus = 'en_livraison';
            if (['Livré', 'Livre'].includes(status)) internalStatus = 'livree';
            if (['Retour vers vendeur', 'Retourné au vendeur', 'Echèc livraison', 'Retour groupé'].includes(status)) internalStatus = 'retour';
            if (['Annulé', 'Annule'].includes(status)) internalStatus = 'annulee';

            await fetch(`${SUPABASE_URL}/rest/v1/orders?tracking_number=eq.${tracking}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: internalStatus,
                yalidine_last_status: status,
                delivery_last_update: new Date().toISOString()
              })
            });
          }
        }
      }

      return res.status(200).json({ success: true, message: 'Events processed' });
    } catch (err) {
      console.error('Yalidine webhook processing error:', err);
      return res.status(200).json({ success: false, error: err.message });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
