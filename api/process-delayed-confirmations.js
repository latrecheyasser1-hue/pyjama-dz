const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSKaHVaNhbDcXWvirUZCAtEQwuHus3c6VCPYV6BzJhJMGZBv0y7LPe2UTWP1KOFKngJCRqiumnd6R27VNOZABQlmGzzbl87arKbPuvgZBag148noX6nLxjkKMO7Ue0hiLUDRS4spYopCGpuwHTZCnPW4Deyzivxg3xlphgLBdUZAWWRD5Y0HwZDZD';

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
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
    console.error('Send WhatsApp error:', err);
  }
}

async function getSequentialOrderNum(orderId) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?select=id,created_at&order=created_at.asc`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const orders = await res.json();
    if (Array.isArray(orders)) {
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) return String(idx + 1);
      return String(orders.length);
    }
  } catch (err) {}
  return "58";
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const now = Date.now();
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    let processedOrdersCount = 0;
    let processedReclamationsCount = 0;

    // 1. Fetch persistent sent_order_confirmations list from settings
    const sentOrderIds = new Set();
    try {
      const sRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.sent_order_confirmations&select=value`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const sData = await sRes.json();
      if (Array.isArray(sData) && sData[0]?.value) {
        const arr = typeof sData[0].value === 'string' ? JSON.parse(sData[0].value) : sData[0].value;
        if (Array.isArray(arr)) arr.forEach(id => sentOrderIds.add(id));
      }
    } catch(e) {}

    // 2. Process 10-Minute Delayed Orders
    try {
      const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=200`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const recentOrders = await ordersRes.json();

      if (Array.isArray(recentOrders) && recentOrders.length > 0) {
        let sentIdsUpdated = false;

        for (const order of recentOrders) {
          if (!order.id || !order.phone || sentOrderIds.has(order.id)) continue;

          const createdTimeMs = order.created_at ? new Date(order.created_at).getTime() : 0;
          const ageMs = now - createdTimeMs;

          // STRICT 10-MINUTE DELAY GUARD: Must be at least 10 minutes old AND less than 48 hours old
          if (createdTimeMs > 0 && ageMs >= TEN_MINUTES_MS && ageMs <= (48 * 60 * 60 * 1000)) {
            const orderNumStr = await getSequentialOrderNum(order.id);
            const displayName = order.clientName || '';
            const nameGreeting = displayName && displayName !== 'الزبون' ? ` ${displayName}` : '';
            const cleanProduct = String(order.product || 'بيجامة').replace(/\(\(/g, '').replace(/\)\)/g, '');

            const messageText = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nتلقينا طلبك عبر الموقع بنجاح:\n\n• رقم الطلب: #${orderNumStr}\n• المنتجات: ${cleanProduct}\n• الولاية: ${order.wilaya || ''}\n\n👉 يرجى الرد بـ *تأكيد* (أو *إلغاء*) لتأكيد طلبك وتجهيز شحنتك.`;

            await sendWhatsAppMessage(order.phone, messageText);
            sentOrderIds.add(order.id);
            sentIdsUpdated = true;
            processedOrdersCount++;
            await new Promise(r => setTimeout(r, 200));
          }
        }

        if (sentIdsUpdated) {
          const valStr = JSON.stringify(Array.from(sentOrderIds));
          await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ key: 'sent_order_confirmations', value: valStr })
          });
        }
      }
    } catch (e) {
      console.error('Error processing delayed order confirmations:', e);
    }

    // 3. Process 10-Minute Delayed Reclamations
    try {
      const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.reclamations&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const settingsData = await setRes.json();

      if (Array.isArray(settingsData) && settingsData[0]?.value) {
        let reclamations = typeof settingsData[0].value === 'string' ? JSON.parse(settingsData[0].value) : settingsData[0].value;
        if (Array.isArray(reclamations)) {
          let updated = false;

          for (let i = 0; i < reclamations.length; i++) {
            const rec = reclamations[i];
            if (rec.whatsapp_sent === false) {
              const createdMs = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
              const ageMs = now - createdMs;

              // STRICT 10-MINUTE DELAY GUARD: Must be at least 10 minutes old AND less than 48 hours old
              if (createdMs > 0 && ageMs >= TEN_MINUTES_MS && ageMs <= (48 * 60 * 60 * 1000)) {
                const phone = rec.whatsappNumber || rec.phone;
                if (phone) {
                  const greetingName = (rec.clientName && rec.clientName.trim() !== '' && rec.clientName !== 'زبون المحادثة' && rec.clientName !== 'زبون الواتساب')
                    ? ` ${rec.clientName.trim()}`
                    : '';

                  const replyMsg = `*متجر Pyjama DZ*\n\nأهلاً وسهلاً بك${greetingName}! 🌸\nنشكرك جزيلاً على تواصلك معنا وعلى مشاركتنا ملاحظاتك وتقييمك القيّم. 🙏\nتأكد أن رأيك ورضاك هما أولويتنا دائماً، وسنعمل باستمرار على تقديم الأفضل والأحسن لخدمتك على أكمل وجه بإذن الله. ✨❤️`;

                  await sendWhatsAppMessage(phone, replyMsg);
                  rec.whatsapp_sent = true;
                  updated = true;
                  processedReclamationsCount++;
                  await new Promise(r => setTimeout(r, 200));
                }
              }
            }
          }

          if (updated) {
            await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.reclamations`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ value: JSON.stringify(reclamations) })
            });
          }
        }
      }
    } catch (e) {
      console.error('Error processing delayed reclamation confirmations:', e);
    }

    return res.status(200).json({
      success: true,
      processedOrdersCount,
      processedReclamationsCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Process delayed confirmations handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
