const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

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
    const { phone, nom, id, wilaya, product } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '213' + formattedPhone.substring(1);
    if (!formattedPhone.startsWith('213')) formattedPhone = '213' + formattedPhone;

    const DEFAULT_TOKEN = 'EAAguaWHGlf8BSBqW3EVyBFj9D9VUupq33Pkb79IDFHaghB7bMOBJ6SyaqkvDdTA5ERNpHEEPDBaZCZCCCemsSuLTs0ZB64Nulcko56vXtc0W1edmKmA89k6AkVzej0gRydOssQKIMWdQiauXg2hXqmzeUF4pLIV9SomgHUzUTUt81SANdlfiiGFlq21mZC1k1LTFjZAemV3QK2NsB7b9l8UPtOSltlX0ayZAD6fR1bYsdUMnZB2iqQCfIO73tnARpD6RSCZASgR07fh7J1oD82RR';
    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || DEFAULT_TOKEN;
    const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

    const orderNum = await getSequentialOrderNum(id);
    const cleanProduct = String(product || 'بيجامة').replace(/\(\(/g, '').replace(/\)\)/g, '');

    const messageText = `أهلاً بك سيد ${nom || 'الزبون'}! ❤️\n\n📦 رقم الطلبية: #${orderNum}\n🛍️ المنتجات: ${cleanProduct}\n🚚 الولاية: ${wilaya || ''}\n📌 الحالة: جديدة (قيد التجهيز للشحن)\n\nيرجى الرد بـ كلمة (تأكيد) أو (إلغاء) لتجهيز شحنتك فوراً! ✨`;

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
