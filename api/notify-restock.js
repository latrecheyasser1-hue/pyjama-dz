const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const DEFAULT_TOKEN = 'EAAguaWHGlf8BSDZCjgyc359EMoz33CR4lxKknCXVwLcgKNfZCw2yJiP1ZBYxcY5LsbdBhneqsy1GzLABiwLQHjPvfZCSkcsoXCBw16TufkqA3xbonglKFafxusFR26wUeAprzqkdXK8sbqXDv2OjZCPoMBUNeZALMLiHUpQUSiAnpEPXG6ZBOaz6oLmX65UbgFtUK7vwgCEMPUWciZBrvq3hoVzCzfDbiwjmHBFjNR9DumykgtPcJ8iLkTILWpo9nACoDicpZAhKOM7nWzNYPh1vR';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
  }
  return process.env.WHATSAPP_TOKEN || DEFAULT_TOKEN;
}

async function sendWhatsAppMessage(toPhone, text) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone || !text) return null;
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
        to: toPhone,
        type: 'text',
        text: { body: text }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Send WhatsApp error:', err);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || req.query || {});
    const { productId, size, newQty } = body;
    if (!size || Number(newQty) <= 0) {
      return res.status(200).json({ success: true, message: 'No size or qty <= 0' });
    }

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?status=eq.en_attente_stock`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const orders = await orderRes.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(200).json({ success: true, message: 'No waiting orders' });
    }

    let notifiedCount = 0;
    let availableQty = Number(newQty);

    for (const order of orders) {
      const item = Array.isArray(order.items) && order.items[0] ? order.items[0] : {};
      const orderSize = (item.size || order.size || '').toUpperCase();
      const targetSize = String(size).toUpperCase();
      const prodText = (order.product || '').toUpperCase();

      if ((orderSize === targetSize || !orderSize || prodText.includes(targetSize)) && order.phone) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'confirmee' })
        });

        const orderNumStr = order.id ? String(order.id).substring(0, 5).toUpperCase() : '1001';
        const restockMsg = `أهلاً بك ${order.clientName || ''}.\nبشرى سارة، توفر مقاسك (${size}) مجدداً!\nتم تأكيد طلبيتك رقم #${orderNumStr} بنجاح وجاري تجهيزها للشحن. شكراً لانتظارك.`;
        
        const cleanPhone = order.phone.replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('213') ? cleanPhone : cleanPhone.replace(/^0/, '213');
        await sendWhatsAppMessage(waPhone, restockMsg);

        notifiedCount++;
        availableQty = Math.max(0, availableQty - 1);
        if (availableQty <= 0) break;
      }
    }

    return res.status(200).json({ success: true, notifiedCount });
  } catch (err) {
    console.error('Notify restock error:', err);
    return res.status(500).json({ error: err.message });
  }
}
