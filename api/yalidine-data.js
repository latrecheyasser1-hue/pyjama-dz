const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const YALIDINE_BASE_URL = 'https://api.guepex.app/v1/';

// In-memory cache for fast response times
let cache = {
  fees: {},
  centers: {},
  all_fees: null,
  timestamp: 0
};

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

async function getDeliverySettings() {
  const creds = {
    yalidine_api_id: process.env.YALIDINE_API_ID || '',
    yalidine_api_token: process.env.YALIDINE_API_TOKEN || '',
    store_wilaya: 'Chlef'
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=in.(yalidine_api_id,yalidine_api_token,store_wilaya)&select=key,value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r.key === 'yalidine_api_id' && r.value) creds.yalidine_api_id = r.value.trim();
        if (r.key === 'yalidine_api_token' && r.value) creds.yalidine_api_token = r.value.trim();
        if (r.key === 'store_wilaya' && r.value) creds.store_wilaya = r.value.trim();
      });
    }
  } catch (err) {
    console.error('Error fetching settings for yalidine-data:', err);
  }

  return creds;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type = 'all', wilaya_id, to_wilaya_id } = req.query || {};

  try {
    const creds = await getDeliverySettings();
    const apiId = creds.yalidine_api_id;
    const apiToken = creds.yalidine_api_token;

    if (!apiId || !apiToken) {
      return res.status(200).json({ success: false, error: 'Yalidine credentials not configured' });
    }

    const headers = { 'X-API-ID': apiId, 'X-API-TOKEN': apiToken };

    // 1. Fetch Centers for a Wilaya
    if (type === 'centers' && wilaya_id) {
      const cacheKey = `centers_${wilaya_id}`;
      if (cache.centers[cacheKey] && Date.now() - cache.timestamp < CACHE_TTL_MS) {
        return res.status(200).json({ success: true, data: cache.centers[cacheKey] });
      }

      const response = await fetch(`${YALIDINE_BASE_URL}centers?wilaya_id=${wilaya_id}`, { headers });
      const data = await response.json();
      const centersList = data.data || [];
      cache.centers[cacheKey] = centersList;
      return res.status(200).json({ success: true, data: centersList });
    }

    // 2. Fetch Fees for a destination Wilaya (from Chlef = 2)
    if (type === 'fees' && to_wilaya_id) {
      const fromWilayaId = 2; // Chlef
      const cacheKey = `fees_${fromWilayaId}_${to_wilaya_id}`;

      if (cache.fees[cacheKey] && Date.now() - cache.timestamp < CACHE_TTL_MS) {
        return res.status(200).json({ success: true, data: cache.fees[cacheKey] });
      }

      const response = await fetch(`${YALIDINE_BASE_URL}fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${to_wilaya_id}`, { headers });
      const data = await response.json();

      let deskPrice = 500;
      let homePrice = 650;

      if (data && data.per_commune) {
        const firstCommune = Object.values(data.per_commune)[0];
        if (firstCommune) {
          deskPrice = firstCommune.express_desk || deskPrice;
          homePrice = firstCommune.express_home || homePrice;
        }
      }

      const feeResult = { deskPrice, homePrice, raw: data };
      cache.fees[cacheKey] = feeResult;
      return res.status(200).json({ success: true, data: feeResult });
    }

    // 3. Fetch all fees for 58 wilayas
    if (type === 'all_fees') {
      if (cache.all_fees && Date.now() - cache.timestamp < CACHE_TTL_MS) {
        return res.status(200).json({ success: true, data: cache.all_fees });
      }

      const allFees = {};
      const fromWilayaId = 2; // Chlef
      const wilayaIds = Array.from({ length: 58 }, (_, i) => i + 1);
      
      await Promise.all(wilayaIds.map(async (wId) => {
        try {
          const resp = await fetch(`${YALIDINE_BASE_URL}fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${wId}`, { headers });
          const json = await resp.json();
          if (json && json.per_commune) {
            const first = Object.values(json.per_commune)[0];
            if (first) {
              allFees[wId] = {
                desk: first.express_desk || 500,
                home: first.express_home || 650
              };
            }
          }
        } catch (e) {}
      }));

      cache.all_fees = allFees;
      cache.timestamp = Date.now();
      return res.status(200).json({ success: true, data: allFees });
    }

    return res.status(400).json({ success: false, error: 'Invalid type parameter' });
  } catch (error) {
    console.error('Yalidine Data API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
