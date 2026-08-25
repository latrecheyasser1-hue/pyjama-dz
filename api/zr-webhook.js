// ZR Express Svix Webhook Handler
// Completely isolated from Yalidine

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ZR Express Webhook Active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log('Received ZR Express Webhook Event:', JSON.stringify(payload, null, 2));

    const trackingNumber = payload.trackingNumber || payload.data?.trackingNumber || payload.parcel?.trackingNumber;
    const externalId = payload.externalId || payload.data?.externalId || payload.parcel?.externalId;
    const stateName = (payload.state?.name || payload.data?.state?.name || payload.status || '').toLowerCase();

    if (!trackingNumber && !externalId) {
      return res.status(200).json({ received: true, note: 'No tracking or externalId found' });
    }

    // Map ZR status to store order status
    let mappedStatus = null;
    if (stateName.includes('recouvert') || stateName.includes('livre') || stateName.includes('delivered')) {
      mappedStatus = 'livree';
    } else if (stateName.includes('transit') || stateName.includes('hub') || stateName.includes('expedie') || stateName.includes('vers_')) {
      mappedStatus = 'expediee';
    } else if (stateName.includes('retour') || stateName.includes('annul') || stateName.includes('refus')) {
      mappedStatus = 'annulee';
    }

    // Find order in Supabase
    let queryParam = '';
    if (trackingNumber) {
      queryParam = `trackingNumber=eq.${encodeURIComponent(trackingNumber)}`;
    } else if (externalId) {
      queryParam = `ticketNumber=eq.${encodeURIComponent(externalId)}`;
    }

    const orderFetch = await fetch(`${SUPABASE_URL}/rest/v1/orders?${queryParam}&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const orders = await orderFetch.json();

    if (Array.isArray(orders) && orders.length > 0) {
      const targetOrder = orders[0];
      const updateData = {
        deliveryCompany: 'zrexpress',
        zrStatus: stateName,
        trackingNumber: trackingNumber || targetOrder.trackingNumber,
        updated_at: new Date().toISOString()
      };

      if (mappedStatus) {
        updateData.status = mappedStatus;
      }

      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${targetOrder.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      console.log(`Updated Order ${targetOrder.id} with ZR status ${stateName}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('ZR Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
