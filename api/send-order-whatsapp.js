const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSKaHVaNhbDcXWvirUZCAtEQwuHus3c6VCPYV6BzJhJMGZBv0y7LPe2UTWP1KOFKngJCRqiumnd6R27VNOZABQlmGzzbl87arKbPuvgZBag148noX6nLxjkKMO7Ue0hiLUDRS4spYopCGpuwHTZCnPW4Deyzivxg3xlphgLBdUZAWWRD5Y0HwZDZD';

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.meta_access_token&select=value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value) {
      return data[0].value.trim();
    }
  } catch (err) {
    console.error('Error fetching Meta token from settings:', err);
  }
  return DEFAULT_TOKEN;
}

async function getSequentialOrderNum(orderId) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?select=id,status,product,created_at&order=created_at.asc`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const rawOrders = await res.json();
    if (Array.isArray(rawOrders)) {
      const realOrders = rawOrders.filter(o => o.status !== 'account' && !String(o.product || '').includes('_CUSTOMER_ACCOUNT_'));
      const idx = realOrders.findIndex(o => o.id === orderId);
      if (idx !== -1) return String(idx + 1);
      return String(realOrders.length);
    }
  } catch (err) {
    console.error('Error fetching sequential order number:', err);
  }
  return "346";
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, nom, clientName, id, wilaya, product, isWaitlist } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '213' + formattedPhone.substring(1);
    if (!formattedPhone.startsWith('213')) formattedPhone = '213' + formattedPhone;

    const META_ACCESS_TOKEN = await getMetaAccessToken();
    const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

    const displayName = nom || clientName || '';
    const nameGreeting = displayName && displayName !== 'الزبون' ? ` ${displayName}` : '';
    const cleanProduct = String(product || 'بيجامة').replace(/\(\(/g, '').replace(/\)\)/g, '');

    let messageText = '';
    let orderNum = '';

    let metaData = null;

    if (isWaitlist) {
      // Waitlist notifications are INSTANT (فَمْ فَمْ)
      messageText = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nعذراً، هذا الموديل أو المقاس (${cleanProduct}) غير متوفر حالياً.\nتم حفظ طلبك وسنخبرك عبر الواتساب فور توفره مجدداً إن شاء الله. شكراً لاهتمامك! 🌸`;

      const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
      const messageBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: messageText }
      };

      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      });
      metaData = await apiRes.json();
    } else {
      // Order confirmations are INSTANT (فَمْ فَمْ)
      orderNum = await getSequentialOrderNum(id);
      messageText = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nتلقينا طلبك عبر الموقع بنجاح:\n\n• رقم الطلب: #${orderNum}\n• المنتجات: ${cleanProduct}\n• الولاية: ${wilaya || ''}\n\n👉 يرجى الرد بـ *تأكيد* (أو *إلغاء*) لتأكيد طلبك وتجهيز شحنتك.`;

      const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
      const messageBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: messageText }
      };

      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      });
      metaData = await apiRes.json();
    }

    // Instant server-side low stock check trigger for this specific product (50ms execution speed)
    try {
      fetch('https://pyjama-dz.vercel.app/api/check-low-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: req.body?.productId || req.body?.id })
      }).catch(() => {});
    } catch (e) {}

    // Asynchronous check for delayed confirmations
    try {
      fetch('https://pyjama-dz.vercel.app/api/cron-notifications?action=process_delayed_confirmations').catch(() => {});
    } catch (e) {}

    return res.status(200).json({ success: true, metaResponse: metaData, delayed: !isWaitlist });
  } catch (err) {
    console.error('Error sending order WhatsApp:', err);
    return res.status(500).json({ error: err.message });
  }
}
