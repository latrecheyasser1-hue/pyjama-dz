const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSJvs6o1xs7Mu94zLzMZCnBg1aXXbh4TsBZBTZCBhcIGFJWV567DN27IVw7oSrK9222iirXHCCdOax3qs2xlurC08naVZAlZAbowZARAYZBFcQZBIbjACBfoZAqtwCLZAnsk5p7eJa8ZBmUx3C5LRBW8ZC4WmZBZA3EisJtwea9pDdkSkkLZBIaFNhu4rKZAbhhMdc9ZAoBZBA0SUvaiA3Ol2Ls9ZCUZCC7gkrH2jtKTHUo3qz0A2GCneJsppBnHHnYJqUTjeYCtDuXHyDOv2oVNl';

function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase()
    .replace(/[أإآاًٌٍَُِّْ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/3/g, "e")
    .replace(/7/g, "h")
    .trim();
}

function removeEmojis(str) {
  if (!str) return "";
  return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.meta_access_token&select=value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value && data[0].value.length > 20) {
      return data[0].value.trim();
    }
  } catch (e) {}
  return process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || DEFAULT_TOKEN;
}

function formatWhatsAppPhone(phone) {
  if (!phone) return null;
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 8) return null;
  if (cleanPhone.startsWith('213')) return cleanPhone;
  if (cleanPhone.startsWith('0')) return '213' + cleanPhone.substring(1);
  return '213' + cleanPhone;
}

async function sendWhatsAppMessage(toPhone, text) {
  const token = await getMetaAccessToken();
  const waPhone = formatWhatsAppPhone(toPhone);
  if (!token || !waPhone || !text) return null;
  const cleanText = removeEmojis(text);
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
        text: { body: cleanText }
      })
    });
    const data = await res.json();
    console.log('Restock WhatsApp send result:', data);
    return data;
  } catch (err) {
    console.error('Send WhatsApp restock error:', err);
    return null;
  }
}

function isProductMatch(targetProductId, targetProductTitle, orderProdId, orderProdText) {
  if (targetProductId && orderProdId && String(targetProductId) === String(orderProdId)) {
    return true;
  }
  const normTargetTitle = normalizeText(targetProductTitle);
  const normOrderText = normalizeText(orderProdText);

  if (normTargetTitle && normOrderText) {
    if (normOrderText.includes(normTargetTitle) || normTargetTitle.includes(normOrderText)) {
      return true;
    }
    const targetWords = normTargetTitle.split(/\s+/).filter(w => w.length >= 3);
    const orderWords = normOrderText.split(/\s+/).filter(w => w.length >= 3);
    const sharedWords = targetWords.filter(w => orderWords.includes(w));
    if (sharedWords.length >= 1) return true;
  }

  if (!targetProductId && !targetProductTitle) return true;
  if (!orderProdId && !orderProdText) return true;

  return false;
}

function isSizeMatch(targetSize, orderSize, orderProdText) {
  if (!targetSize) return true;
  const normTargetSize = String(targetSize).trim().toUpperCase();
  const normOrderSize = String(orderSize || '').trim().toUpperCase();

  if (!normOrderSize) {
    if (!orderProdText) return true;
    const normOrderText = String(orderProdText).toUpperCase();
    return normOrderText.includes(normTargetSize) || normOrderText.includes('ALL') || normOrderText.includes('STANDARD');
  }

  if (normOrderSize === normTargetSize) return true;
  if (normOrderSize === 'STANDARD' || normTargetSize === 'STANDARD') return true;

  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || req.query || {});
    const { productId, productTitle: bodyProductTitle, size, newQty } = body;
    if (!size || Number(newQty) <= 0) {
      return res.status(200).json({ success: true, message: 'No size or qty <= 0' });
    }

    let notifiedCount = 0;
    let availableQty = Number(newQty);
    const targetSize = String(size).trim().toUpperCase();

    let productTitle = bodyProductTitle || '';
    if (productId && !productTitle) {
      try {
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const prods = await prodRes.json();
        if (Array.isArray(prods) && prods[0]) {
          productTitle = prods[0].title || '';
        }
      } catch (e) {}
    }

    // 1. Query Orders waiting for stock
    let orders = [];
    try {
      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?status=in.(en_attente_stock,pending_stock,rupture_stock,attente_stock,out_of_stock)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      orders = await orderRes.json();
      if (!Array.isArray(orders)) orders = [];
    } catch (e) {
      orders = [];
    }

    // 2. Query Waitlist entries waiting for stock
    let waitlistEntries = [];
    try {
      const waitlistRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?status=in.(pending,en_attente,out_of_stock)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      waitlistEntries = await waitlistRes.json();
      if (!Array.isArray(waitlistEntries)) waitlistEntries = [];
    } catch (e) {
      waitlistEntries = [];
    }

    const notifiedPhones = new Set();

    // Process Orders
    for (const order of orders) {
      if (availableQty <= 0) break;
      const items = Array.isArray(order.items) ? order.items : [];
      const item = items[0] || {};
      const orderSize = (item.size || order.size || '');
      const orderProdId = item.productId || item.product_id || order.productId || order.product_id;
      const orderProdText = item.product || item.title || order.product || '';

      const sizeMatches = isSizeMatch(targetSize, orderSize, orderProdText);
      const prodMatches = isProductMatch(productId, productTitle, orderProdId, orderProdText);

      if (sizeMatches && prodMatches && order.phone) {
        const waPhone = formatWhatsAppPhone(order.phone);
        if (!waPhone) continue;

        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'attente_confirmation_restock', archived: false })
        });

        const clientNameStr = (order.clientName && order.clientName !== 'زبون الواتساب' && order.clientName !== 'زبون المحادثة')
          ? order.clientName : '';
        const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
        const prodDesc = productTitle ? ` في موديل ${productTitle}` : '';

        const restockMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nبشرى سارة، توفر مقاسك (${targetSize}) مجدداً${prodDesc}! 🔥\nهل ما زلت ترغب في تأكيد وطلب هذه القطعة قبل نفاذ الكمية مجدداً؟\n\n👉 أجب بـ *نعم* أو *إيه* أو *تأكيد* لتأكيد طلبك فوراً.`;

        await sendWhatsAppMessage(waPhone, restockMsg);
        notifiedPhones.add(waPhone);

        notifiedCount++;
        availableQty = Math.max(0, availableQty - 1);
      }
    }

    // Process Waitlist
    if (availableQty > 0) {
      for (const entry of waitlistEntries) {
        if (availableQty <= 0) break;
        const entryPhone = entry.whatsapp_number || entry.phone;
        const waPhone = formatWhatsAppPhone(entryPhone);
        if (!waPhone || notifiedPhones.has(waPhone)) continue;

        const entrySize = entry.size || '';
        const entryProdId = entry.product_id || entry.productId;
        const entryProdText = entry.product_title || entry.product || '';

        const sizeMatches = isSizeMatch(targetSize, entrySize, entryProdText);
        const prodMatches = isProductMatch(productId, productTitle, entryProdId, entryProdText);

        if (sizeMatches && prodMatches) {
          await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${entry.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'notified' })
          });

          const clientNameStr = (entry.client_name && entry.client_name !== 'زبون الواتساب') ? entry.client_name : '';
          const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
          const prodDesc = productTitle || entryProdText ? ` في موديل ${productTitle || entryProdText}` : '';

          const restockMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nبشرى سارة، توفر مقاسك (${targetSize}) مجدداً${prodDesc}!\nيمكنك الآن إتمام طلبك عبر موقعنا الرسمي: https://pyjama-dz.vercel.app أو بالرد على هذه الرسالة. شكراً لانتظارك.`;

          await sendWhatsAppMessage(waPhone, restockMsg);
          notifiedPhones.add(waPhone);

          notifiedCount++;
          availableQty = Math.max(0, availableQty - 1);
        }
      }
    }

    return res.status(200).json({ success: true, notifiedCount });
  } catch (err) {
    console.error('Notify restock error:', err);
    return res.status(500).json({ error: err.message });
  }
}

