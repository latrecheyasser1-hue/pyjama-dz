const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSM37Yt8dJzrCdGGDpEsLIFeRsNVJBTttPpLOcVY7oZA1oSrCJRjt2ucX2SdKFzzxzX79Ta80VnMHGhYIUntskK1PayfM62XCBeZBa1ZB6qAIITdXtZAabRSY4aVllwVZBQvSZA26AjjxwnnRNaZAZARMSSDh2nHkAv4wbpBv01SD6jILRZCCWTN1YZBISZANkmAQo5XaoGI3rEKFySvFazi2kTHHW1ZCORfZA8s0LXDr98jNyHUMNzAs9nMM64ZAIrAaLbrPnbXXDDh4MB';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

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
  } catch (err) {}
  return DEFAULT_TOKEN;
}

async function sendWhatsAppMessage(toPhone, textBody) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone) return;
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
        text: { preview_url: false, body: textBody }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Send WhatsApp error:', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action || 'all';

  try {
    let hotSaleResult = null;
    let followUpResult = null;

    // 1. WEEKLY HOT SALE CAMPAIGN
    if (action === 'weekly_hot_sale' || action === 'all') {
      const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&limit=5`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const products = await prodRes.json();

      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=phone,clientName,nom&order=created_at.desc&limit=100`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const orders = await orderRes.json();

      if (Array.isArray(products) && Array.isArray(orders)) {
        const productListStr = products.map(p => `- ${p.title}: ${p.price} دج`).join('\n');
        const uniqueClients = new Map();
        orders.forEach(o => {
          if (o.phone && !uniqueClients.has(o.phone)) {
            uniqueClients.set(o.phone, o.clientName || o.nom || 'الزبون الكريم');
          }
        });

        let sentCount = 0;
        for (const [phone, name] of uniqueClients.entries()) {
          const msg = `*متجر Pyjama DZ*\n\nمرحباً بك سيد ${name}.\nإليك المنتجات الأكثر مبيعاً وطلباً هذا الأسبوع في المتجر:\n${productListStr}\n\nيمكنك الطلب مباشرة عبر موقعنا الرسمي: https://pyjama-dz.vercel.app`;
          await sendWhatsAppMessage(phone, msg);
          sentCount++;
        }
        hotSaleResult = { status: 'success', sentCount };
      }
    }

    // 2. 14-DAY POST-ORDER FOLLOW-UP
    if (action === 'followup_14_days' || action === 'all') {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?created_at=gte.${fifteenDaysAgo}&created_at=lte.${fourteenDaysAgo}&status=eq.confirmee`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const oldOrders = await orderRes.json();

      let followUpCount = 0;
      if (Array.isArray(oldOrders)) {
        for (const o of oldOrders) {
          if (o.phone) {
            const clientName = o.clientName || o.nom || 'الزبون الكريم';
            const msg = `*متجر Pyjama DZ*\n\nمرحباً بك سيد ${clientName}.\nمر أسبوعان على استلام طلبيتك رقم #${o.id}.\nيهمنا جداً معرفة رأيك وانطباعك عن الجودة والخدمة. نرجو أن تكون قد نالت إعجابك.`;
            await sendWhatsAppMessage(o.phone, msg);
            followUpCount++;
          }
        }
      }
      followUpResult = { status: 'success', followUpCount };
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      hotSaleResult,
      followUpResult
    });
  } catch (err) {
    console.error('Error running cron notifications:', err);
    return res.status(500).json({ error: err.message });
  }
}
