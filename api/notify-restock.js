const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSBWALwYHiUUx1tti0lpAfYqZBZBzHIZB8oZA0ZAIYYtK0aw0d6ez6RIkjZAmKWL0hN4QctCZCBkVAu0ZCPcgMNF6vPNZC1RID8rFufM8vz0lWevN5WxIgqqrGf1cBLELSUIWjabxZCYwoiStLiBzQnf02dQ9ZAHMpyGNkG0K8XHdFqKXZCS2jUaYzzY6c62esNKw6JK2AsQBmH5c4OSSn5e56vArja6hURwsRbJpQZAoCOGtMMZAbwslwa51EGnATq14vifc3bnV9Awwdr';

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

// Helper to format phone numbers to Meta WhatsApp international format (213XXXXXXXXX)
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

function cleanTitle(t) {
  if (!t) return "";
  return normalizeText(t)
    .replace(/\(.*\)/g, '')
    .replace(/boutique/gi, '')
    .replace(/livraison/gi, '')
    .replace(/gros/gi, '')
    .replace(/بيجامات فاخرة/gi, 'بيجامة')
    .trim();
}

function isProductMatch(targetProductId, targetProductTitle, orderProdId, orderProdText) {
  if (targetProductId && orderProdId && String(targetProductId) === String(orderProdId)) {
    return true;
  }
  const cleanTarget = cleanTitle(targetProductTitle);
  const cleanOrder = cleanTitle(orderProdText);

  if (!cleanTarget || !cleanOrder) return true;
  if (cleanTarget.includes(cleanOrder) || cleanOrder.includes(cleanTarget)) return true;

  const targetWords = cleanTarget.split(/\s+/).filter(w => w.length >= 2);
  const orderWords = cleanOrder.split(/\s+/).filter(w => w.length >= 2);
  const sharedWords = targetWords.filter(w => orderWords.includes(w));
  if (sharedWords.length >= 1) return true;

  return false;
}

function isColorMatch(targetColor, orderColor) {
  if (!targetColor || !orderColor) return true;
  const normTarget = normalizeText(targetColor);
  const normOrder = normalizeText(orderColor);
  if (!normTarget || !normOrder) return true;
  return normTarget === normOrder || normTarget.includes(normOrder) || normOrder.includes(normTarget);
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

  const sizeMap = { 'S': ['36'], 'M': ['37', '38'], 'L': ['39', '40'], 'XL': ['41', '42'], '2XL': ['43', '44'] };
  if (sizeMap[normOrderSize] && sizeMap[normOrderSize].includes(normTargetSize)) return true;
  if (sizeMap[normTargetSize] && sizeMap[normTargetSize].includes(normOrderSize)) return true;

  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || req.query || {});
    const { productId, productTitle: bodyProductTitle, size, color, colorName, newQty } = body;
    if (!size || Number(newQty) <= 0) {
      return res.status(200).json({ success: true, message: 'No size or qty <= 0' });
    }

    let notifiedCount = 0;
    let availableQty = Number(newQty);
    const targetSize = String(size).trim().toUpperCase();
    const targetColor = String(color || colorName || '').trim();

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

    // 2. Fetch persistent notified waitlist IDs and notified phones from settings table
    let notifiedWaitlistIds = new Set();
    let notifiedPhonesSet = new Set();
    let settingsRow = null;
    try {
      const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=in.(notified_waitlist_ids,notified_phones_list)&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await setRes.json();
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (r.key === 'notified_waitlist_ids' && r.value) {
            if (r.key === 'notified_waitlist_ids') settingsRow = r;
            const parsed = JSON.parse(r.value || '[]');
            if (Array.isArray(parsed)) parsed.forEach(id => notifiedWaitlistIds.add(id));
          } else if (r.key === 'notified_phones_list' && r.value) {
            const parsed = JSON.parse(r.value || '[]');
            if (Array.isArray(parsed)) parsed.forEach(p => notifiedPhonesSet.add(p));
          }
        });
      }
    } catch (e) {}

    const saveNotifiedWaitlistId = async (id) => {
      if (!id) return;
      notifiedWaitlistIds.add(id);
      const arr = Array.from(notifiedWaitlistIds);
      try {
        if (settingsRow) {
          await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.notified_waitlist_ids`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: JSON.stringify(arr) })
          });
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: 'notified_waitlist_ids', value: JSON.stringify(arr) })
          });
          settingsRow = { key: 'notified_waitlist_ids' };
        }
      } catch (e) {}
    };

    const saveNotifiedPhone = async (phoneStr) => {
      if (!phoneStr) return;
      notifiedPhonesSet.add(phoneStr);
      const last8 = phoneStr.slice(-8);
      if (last8) notifiedPhonesSet.add(last8);
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ key: 'notified_phones_list', value: JSON.stringify(Array.from(notifiedPhonesSet)) })
        });
      } catch (e) {}
    };

    // Query Waitlist entries waiting for stock
    let waitlistEntries = [];
    try {
      const waitlistRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?status=in.(pending,en_attente)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      waitlistEntries = await waitlistRes.json();
      if (!Array.isArray(waitlistEntries)) waitlistEntries = [];
    } catch (e) {
      waitlistEntries = [];
    }

    const notifiedPhones = new Set();
    const now = Date.now();
    if (!global._recentRestockMap) global._recentRestockMap = new Map();

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
        if (!waPhone || notifiedPhones.has(waPhone)) continue;

        const lastSent = global._recentRestockMap.get(waPhone);
        if (lastSent && (now - lastSent < 60000)) continue;

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

        const restockMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nبشرى سارة، توفر مقاسك (${targetSize}) مجدداً${prodDesc}!\nيمكنك الآن إتمام طلبك مباشرة وحصرياً عبر موقعنا الرسمي قبل نفاد الكمية:\nhttps://pyjama-dz.vercel.app\n\nشكراً لانتظارك معنا! 🌸`;

        await sendWhatsAppMessage(waPhone, restockMsg);
        notifiedPhones.add(waPhone);
        global._recentRestockMap.set(waPhone, now);
        await saveNotifiedPhone(order.phone.replace(/\D/g, ''));

        notifiedCount++;
        availableQty = Math.max(0, availableQty - 1);
      }
    }

    // Process Waitlist Entries (always process waiting customers)
    for (const entry of waitlistEntries) {
      if (entry.id && notifiedWaitlistIds.has(entry.id)) {
        continue; // 🛑 ALREADY NOTIFIED IN THE PAST - SKIP FOREVER!
      }

      const entryPhone = entry.whatsapp_number || entry.phone;
      const cleanPhone = entryPhone ? entryPhone.replace(/\D/g, '') : '';
      const waPhone = formatWhatsAppPhone(entryPhone);
      const last8 = cleanPhone.slice(-8);

      // 🛑 STRICT DUPLICATE PREVENTION: Skip if phone already received notification!
      if (!waPhone || notifiedPhones.has(waPhone) || (cleanPhone && notifiedPhonesSet.has(cleanPhone)) || (last8 && notifiedPhonesSet.has(last8))) {
        continue;
      }

      const lastSent = global._recentRestockMap.get(waPhone);
      if (lastSent && (now - lastSent < 60000)) continue;

      const entrySize = entry.size || '';
      const entryProdId = entry.product_id || entry.productId;
      const entryProdText = entry.product_title || entry.product || '';

      const sizeMatches = isSizeMatch(targetSize, entrySize, entryProdText);
      const prodMatches = isProductMatch(productId, productTitle, entryProdId, entryProdText);
      const colorMatches = isColorMatch(targetColor, entry.color);

      if (sizeMatches && prodMatches && colorMatches) {
        notifiedPhones.add(waPhone);
        global._recentRestockMap.set(waPhone, now);

        const cleanNum = (entry.whatsapp_number || entry.phone || '').replace(/\D/g, '');
        if (cleanNum && cleanNum.length >= 8) {
          const last8 = cleanNum.slice(-8);
          try {
            // Fetch all waitlist IDs for this phone and add to persistent set
            const findRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?whatsapp_number=ilike.%${last8}%&select=id`, {
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            const allRows = await findRes.json();
            if (Array.isArray(allRows)) {
              for (const r of allRows) {
                if (r.id) await saveNotifiedWaitlistId(r.id);
              }
            }
            // Patch status of ALL waitlist entries for this phone to notified
            await fetch(`${SUPABASE_URL}/rest/v1/waitlist?whatsapp_number=ilike.%${last8}%`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: 'notified' })
            });
          } catch (e) {}
        }

        const clientNameStr = (entry.client_name && entry.client_name !== 'زبون الواتساب' && entry.client_name !== 'زبون المحادثة')
          ? entry.client_name : '';
        const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
        const prodDesc = productTitle ? ` في موديل ${productTitle}` : '';
        const sizeDesc = targetSize ? ` (${targetSize})` : '';

        const restockMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nبشرى سارة، توفر مقاسك${sizeDesc} مجدداً${prodDesc}!\nيمكنك الآن إتمام طلبك مباشرة وحصرياً عبر موقعنا الرسمي قبل نفاد الكمية:\nhttps://pyjama-dz.vercel.app\n\nشكراً لانتظارك معنا! 🌸`;

        await sendWhatsAppMessage(waPhone, restockMsg);
        notifiedCount++;
        availableQty = Math.max(0, availableQty - 1);
      }
    }

    return res.status(200).json({ success: true, notifiedCount });
  } catch (err) {
    console.error('Notify restock error:', err);
    return res.status(500).json({ error: err.message });
  }
}

