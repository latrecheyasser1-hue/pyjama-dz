import crypto from 'crypto';

// ZR Express Svix Webhook Handler
// Completely isolated from Yalidine

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
  }
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_TOKEN.length > 20) {
    return process.env.WHATSAPP_TOKEN.trim();
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.meta_access_token&select=value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value) {
      return data[0].value.trim();
    }
  } catch (err) {}
  return null;
}

async function sendWhatsAppMessage(toPhone, textBody) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone) return;
  const cleanDigits = String(toPhone).replace(/\D/g, '');
  if (cleanDigits.length < 8) return;
  const waPhone = cleanDigits.startsWith('213') ? cleanDigits : (cleanDigits.startsWith('0') ? '213' + cleanDigits.substring(1) : '213' + cleanDigits);

  const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: waPhone,
        type: 'text',
        text: { preview_url: false, body: textBody }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Send WhatsApp error in ZR webhook:', err);
  }
}

async function saveBureauMeta(identifier, meta) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: `bureau_meta_${identifier}`,
        value: JSON.stringify(meta)
      })
    });
  } catch (err) {
    console.error('Error saving bureau meta in ZR webhook:', err);
  }
}

const ADMIN_PARCEL_SECRET = process.env.ADMIN_PARCEL_SECRET || 'pyjama_dz_sec_99a8b7c6d5e4f3';
const KNOWN_ZR_SECRETS = [
  process.env.ZR_WEBHOOK_SECRET,
  'whsec_aqXZkgxYOEwcoMbZ2ZjlvuUyM7pK6tEu',
  'pyjama_dz_zr_wh_sec_2026'
].filter(Boolean);

function verifyZRWebhook(req) {
  // 1. Check Svix headers if provided by ZR Express
  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  if (svixId && svixTimestamp && svixSignature) {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
      const passedSigs = svixSignature.split(' ');

      for (const secretStr of KNOWN_ZR_SECRETS) {
        try {
          const secret = secretStr.startsWith('whsec_') 
            ? Buffer.from(secretStr.slice(6), 'base64') 
            : Buffer.from(secretStr);
          const expectedSig = 'v1,' + crypto.createHmac('sha256', secret).update(toSign).digest('base64');
          if (passedSigs.includes(expectedSig)) return true;
        } catch (_) {}
      }
    } catch (e) {
      console.error('[ZR Webhook] Svix verification error:', e);
    }
  }

  // 2. Check secret token via query parameter (?secret=... or ?token=...)
  const query = req.query || {};
  const queryToken = query.secret || query.token;
  if (queryToken && (KNOWN_ZR_SECRETS.includes(queryToken) || queryToken === ADMIN_PARCEL_SECRET)) {
    return true;
  }

  // 3. Check secret token via header (x-webhook-secret or x-admin-token or authorization)
  const headerToken = req.headers['x-webhook-secret'] || req.headers['x-admin-token'] || req.headers['x-api-key'] || '';
  if (headerToken && (KNOWN_ZR_SECRETS.includes(headerToken) || headerToken === ADMIN_PARCEL_SECRET)) {
    return true;
  }

  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (KNOWN_ZR_SECRETS.includes(bearer) || bearer === ADMIN_PARCEL_SECRET) {
      return true;
    }
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ZR Express Webhook Active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Security Shield: Verify webhook signature or authorized token
  if (!verifyZRWebhook(req)) {
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    console.warn(`[ZR Webhook] Blocked unauthorized webhook call from IP: ${clientIp}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid ZR webhook signature or secret token' });
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
      mappedStatus = 'retour';
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
      const updateData = {};

      if (mappedStatus && targetOrder.status !== mappedStatus) {
        updateData.status = mappedStatus;
      }
      if (trackingNumber && !targetOrder.trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }
      if (!targetOrder.deliveryCompany) {
        updateData.deliveryCompany = 'zrexpress';
      }

      // Fetch existing bureau meta from settings
      const metaFetch = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.bureau_meta_${targetOrder.id}&select=value`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const metaRows = await metaFetch.json();
      let currentMeta = {};
      if (Array.isArray(metaRows) && metaRows[0]?.value) {
        try { currentMeta = JSON.parse(metaRows[0].value); } catch(e) {}
      }

      if (mappedStatus === 'livree') {
        currentMeta.picked_up = true;
        currentMeta.picked_up_at = new Date().toISOString();
        await saveBureauMeta(targetOrder.id, currentMeta);
      }

      // Instant WhatsApp Notifications for ZR Express Events
      const isBureau = String(targetOrder.deliveryMode || '').toLowerCase().includes('bureau') || 
                       String(targetOrder.deliveryMode || '').includes('مكتب') || 
                       String(targetOrder.commune || '').includes('Hub') || 
                       String(targetOrder.commune || '').includes('[');
      const phone = targetOrder.phone;
      const cleanName = String(targetOrder.clientName || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim().split(' ')[0];
      const greeting = cleanName ? `أهلاً وسهلاً بك ${cleanName}` : `أهلاً وسهلاً بك عزيزي الزبون`;
      const orderNum = targetOrder.ticketNumber || String(targetOrder.id).slice(0, 6);

      let officeName = 'مكتب الاستلام';
      const officeMatch = String(targetOrder.commune || targetOrder.deliveryMode || '').match(/\[([^\]]+)\]/);
      if (officeMatch) officeName = officeMatch[1];

      // A. Out with livreur
      const isOutForDelivery = stateName.includes('vers_client') || stateName.includes('en cours') || stateName.includes('sorti') || stateName.includes('livreur');
      if (!isBureau && isOutForDelivery && !currentMeta.domicile_out_sent) {
        currentMeta.domicile_out_sent = true;
        await saveBureauMeta(targetOrder.id, currentMeta);
        if (phone) {
          const msg = `*متجر Pyjama DZ 🚚*\n\n${greeting}! 🌸\nطردك رقم #${orderNum} خرج الآن مع الموزع (Livreur) وراه في الطريق لعنوانك! 📦💨\n\nسيتصل بك الموزع قريباً على هاتفك للاستلام، يرجى إبقاء هاتفك مفتوحاً. شكراً لثقتك بنا! ❤️\nhttps://www.pyjama-dz.net`;
          await sendWhatsAppMessage(phone, msg);
        }
      }

      // B. Arrived at Bureau (Hub)
      const isAtBureau = stateName.includes('hub_destination') || stateName.includes('au_bureau') || stateName.includes('disponible') || stateName.includes('centre');
      if (isBureau && isAtBureau && !currentMeta.arrival_sent) {
        currentMeta.arrived_at = new Date().toISOString();
        currentMeta.arrival_sent = true;
        await saveBureauMeta(targetOrder.id, currentMeta);
        if (phone) {
          const msg = `*متجر Pyjama DZ ✨*\n\n${greeting}! 🌸\nنود إعلامك أن طلبيتك رقم #${orderNum} وصلت الآن إلى مكتب التوصيل [${officeName}] وهي جاهزة للاستلام! 🏢📦\n\nيرجى التقرب من المكتب لاستلام طردك في أقرب وقت. شكراً جزيلاً لثقتك بمتجرنا! ❤️\nhttps://www.pyjama-dz.net`;
          await sendWhatsAppMessage(phone, msg);
        }
      }

      if (Object.keys(updateData).length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${targetOrder.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        console.log(`Updated Order ${targetOrder.id} with status ${updateData.status}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('ZR Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
