const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSBWALwYHiUUx1tti0lpAfYqZBZBzHIZB8oZA0ZAIYYtK0aw0d6ez6RIkjZAmKWL0hN4QctCZCBkVAu0ZCPcgMNF6vPNZC1RID8rFufM8vz0lWevN5WxIgqqrGf1cBLELSUIWjabxZCYwoiStLiBzQnf02dQ9ZAHMpyGNkG0K8XHdFqKXZCS2jUaYzzY6c62esNKw6JK2AsQBmH5c4OSSn5e56vArja6hURwsRbJpQZAoCOGtMMZAbwslwa51EGnATq14vifc3bnV9Awwdr';

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
    const url = `${SUPABASE_URL}/rest/v1/orders?select=id,created_at&order=created_at.asc`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const orders = await res.json();
    if (Array.isArray(orders)) {
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) return String(idx + 1);
      return String(orders.length);
    }
  } catch (err) {
    console.error('Error fetching sequential order number:', err);
  }
  return "58";
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

    if (isWaitlist) {
      messageText = `أهلاً بك${nameGreeting}.\nعذراً، هذا الموديل أو المقاس (${cleanProduct}) غير متوفر حالياً.\nتم حفظ طلبك وسنخبرك عبر الواتساب فور توفره مجدداً إن شاء الله. شكراً لاهتمامك!`;
    } else {
      orderNum = await getSequentialOrderNum(id);
      messageText = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nتلقينا طلبك عبر الموقع بنجاح:\n\n• رقم الطلب: #${orderNum}\n• المنتجات: ${cleanProduct}\n• الولاية: ${wilaya || ''}\n\n👉 يرجى الرد بـ *تأكيد* (أو *إلغاء*) لتأكيد طلبك وتجهيز شحنتك.`;
    }

    const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
    const messageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText
      }
    };

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageBody)
    });

    const data = await apiRes.json();
    console.log('Server-to-server Meta WhatsApp order result:', data);
    return res.status(200).json({ success: true, metaResponse: data, orderNumber: orderNum });
  } catch (err) {
    console.error('Error sending order WhatsApp:', err);
    return res.status(500).json({ error: err.message });
  }
}
