const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const YALIDINE_BASE_URL = 'https://api.guepex.app/v1/';

async function getDeliverySettings() {
  const creds = {
    yalidine_api_id: process.env.YALIDINE_API_ID || '',
    yalidine_api_token: process.env.YALIDINE_API_TOKEN || '',
    zr_express_api_key: process.env.ZREXPRESS_API_KEY || '',
    store_wilaya: 'Chlef'
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=in.(yalidine_api_id,yalidine_api_token,zrexpress_api_key,zr_express_api_key,store_wilaya)&select=key,value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r.key === 'yalidine_api_id' && r.value) creds.yalidine_api_id = r.value.trim();
        if (r.key === 'yalidine_api_token' && r.value) creds.yalidine_api_token = r.value.trim();
        if ((r.key === 'zrexpress_api_key' || r.key === 'zr_express_api_key') && r.value) creds.zr_express_api_key = r.value.trim();
        if (r.key === 'store_wilaya' && r.value) creds.store_wilaya = r.value.trim();
      });
    }
  } catch (err) {
    console.error('Error fetching delivery settings:', err);
  }

  return creds;
}

function formatAlgerianPhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('213')) return '0' + digits.substring(3);
  if (digits.length === 9) return '0' + digits;
  return digits;
}

function splitFullName(rawName) {
  const clean = String(rawName || 'زبون')
    .replace(/\(واتساب:[^\)]+\)/g, '')
    .replace(/زبون/g, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: 'Client', familyname: 'PyjamaDZ' };
  if (parts.length === 1) return { firstname: parts[0], familyname: 'Client' };
  return { firstname: parts[0], familyname: parts.slice(1).join(' ') };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { order, company = 'yalidine' } = req.body || {};

    if (!order) {
      return res.status(400).json({ success: false, error: 'Missing order details' });
    }

    const creds = await getDeliverySettings();
    const isStopdesk = Boolean(
      String(order.deliveryMode || '').toLowerCase().includes('bureau') ||
      String(order.deliveryMode || '').toLowerCase().includes('stop') ||
      order.is_stopdesk
    );

    const codProductPrice = Number(order.price || order.totalPrice || 0);
    const { firstname, familyname } = splitFullName(order.clientName);
    const contactPhone = formatAlgerianPhone(order.phone || order.whatsapp);

    // ==========================================
    // 1. YALIDINE / GUEPEX INTEGRATION
    // ==========================================
    if (company.toLowerCase() === 'yalidine' || company.toLowerCase() === 'guepex') {
      const apiId = creds.yalidine_api_id;
      const apiToken = creds.yalidine_api_token;

      if (!apiId || !apiToken) {
        // Fallback simulation when keys not yet configured
        return res.status(200).json({
          success: true,
          isMock: true,
          trackingNumber: `YAL-${Math.floor(100000 + Math.random() * 900000)}`,
          shippingLabelUrl: `https://guepex.app/app/bordereau.php?tracking=yal-mock`,
          deliveryCompany: 'yalidine',
          codPrice: codProductPrice,
          message: 'Yalidine simulation (keys pending in Settings)'
        });
      }

      const orderRef = String(order.ticketNumber || order.id || Date.now());
      const parcelPayload = [{
        order_id: orderRef,
        from_wilaya_name: creds.store_wilaya || 'Chlef',
        firstname: firstname,
        familyname: familyname,
        contact_phone: contactPhone,
        address: order.commune ? `${order.commune}, ${order.wilaya}` : (order.address || order.wilaya),
        to_commune_name: order.commune || order.wilaya,
        to_wilaya_name: order.wilaya,
        product_list: order.product || 'بيجامات وملابس نوم فاخرة',
        price: codProductPrice,
        do_insurance: false,
        declared_value: 0,
        length: 25,
        width: 20,
        height: 5,
        weight: 1,
        freeshipping: false,
        is_stopdesk: isStopdesk,
        has_exchange: false
      }];

      console.log('Sending Yalidine Parcel payload:', JSON.stringify(parcelPayload, null, 2));

      const yResponse = await fetch(`${YALIDINE_BASE_URL}parcels/`, {
        method: 'POST',
        headers: {
          'X-API-ID': apiId,
          'X-API-TOKEN': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parcelPayload)
      });

      const yData = await yResponse.json();
      console.log('Yalidine API Response:', JSON.stringify(yData, null, 2));

      const result = yData[orderRef] || Object.values(yData)[0];

      if (result && result.success) {
        const tracking = result.tracking;
        const labelUrl = result.label || result.labels || '';

        // Save tracking number to order in Supabase
        if (order.id) {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                tracking_number: tracking,
                deliveryCompany: 'yalidine',
                status: 'en_livraison'
              })
            });
          } catch (dbErr) {
            console.error('Error saving tracking number to DB:', dbErr);
          }
        }

        return res.status(200).json({
          success: true,
          trackingNumber: tracking,
          shippingLabelUrl: labelUrl,
          importId: result.import_id,
          deliveryCompany: 'yalidine',
          codPrice: codProductPrice
        });
      } else {
        const errMsg = result?.message || yData.message || 'Yalidine parcel creation failed';
        return res.status(400).json({
          success: false,
          error: errMsg,
          details: yData
        });
      }
    }

    // ==========================================
    // 2. ZR EXPRESS INTEGRATION
    // ==========================================
    if (company.toLowerCase() === 'zrexpress' || company.toLowerCase() === 'zr') {
      const zrKey = creds.zr_express_api_key;
      if (!zrKey) {
        return res.status(200).json({
          success: true,
          isMock: true,
          trackingNumber: `ZR-${Math.floor(100000 + Math.random() * 900000)}`,
          shippingLabelUrl: `https://zrexpress.com/label-mock`,
          deliveryCompany: 'zrexpress',
          codPrice: codProductPrice,
          message: 'ZR Express simulation (keys pending in Settings)'
        });
      }

      // ZR Express direct API
      const zrRes = await fetch('https://proapi.zr-express.com/api/v1/colis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${zrKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_name: order.clientName,
          client_phone: contactPhone,
          wilaya: order.wilaya,
          commune: order.commune,
          type: isStopdesk ? 'stopdesk' : 'domicile',
          price: codProductPrice,
          product_name: order.product || 'بيجامات'
        })
      });

      const zrData = await zrRes.json();
      if (zrRes.ok && zrData.tracking) {
        return res.status(200).json({
          success: true,
          trackingNumber: zrData.tracking,
          shippingLabelUrl: zrData.label_url || '',
          deliveryCompany: 'zrexpress',
          codPrice: codProductPrice
        });
      } else {
        return res.status(400).json({
          success: false,
          error: zrData.message || 'ZR Express parcel creation failed',
          details: zrData
        });
      }
    }

    return res.status(400).json({ success: false, error: 'Unsupported delivery provider' });

  } catch (error) {
    console.error('Create parcel handler error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
