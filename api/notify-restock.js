const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSKaHVaNhbDcXWvirUZCAtEQwuHus3c6VCPYV6BzJhJMGZBv0y7LPe2UTWP1KOFKngJCRqiumnd6R27VNOZABQlmGzzbl87arKbPuvgZBag148noX6nLxjkKMO7Ue0hiLUDRS4spYopCGpuwHTZCnPW4Deyzivxg3xlphgLBdUZAWWRD5Y0HwZDZD';

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
  const cleanTarget = cleanTitle(targetProductTitle);
  const cleanOrder = cleanTitle(orderProdText);

  if (cleanTarget && cleanOrder) {
    if (cleanTarget === cleanOrder || cleanTarget.includes(cleanOrder) || cleanOrder.includes(cleanTarget)) {
      return true;
    }
    const targetWords = cleanTarget.split(/\s+/).filter(w => w.length >= 2);
    const orderWords = cleanOrder.split(/\s+/).filter(w => w.length >= 2);
    const sharedWords = targetWords.filter(w => orderWords.includes(w));
    if (sharedWords.length >= 1) return true;
  }

  if (targetProductId && orderProdId && String(targetProductId) === String(orderProdId)) {
    return true;
  }

  if (!cleanTarget || !cleanOrder) return true;

  return false;
}

function isColorMatch(targetColor, orderColor) {
  if (!targetColor || !orderColor) return true;
  const normTarget = normalizeText(targetColor);
  const normOrder = normalizeText(orderColor);
  if (!normTarget || !normOrder) return true;
  return normTarget === normOrder || normTarget.includes(normOrder) || normOrder.includes(normTarget);
}

function isSizeMatch(targetSize, orderSize) {
  if (!targetSize || !orderSize) return true;
  const normTargetSize = String(targetSize).trim().toUpperCase();
  const normOrderSize = String(orderSize).trim().toUpperCase();
  return normOrderSize === normTargetSize || normOrderSize === 'STANDARD' || normTargetSize === 'STANDARD';
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

    // 2. Fetch persistent notified locks and waitlist request timestamps from settings table
    let notifiedLocksMap = new Map();
    let waitlistReqsMap = new Map();
    try {
      const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,created_at,value`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await setRes.json();
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (!r.key) return;
          const createdTime = r.created_at ? new Date(r.created_at).getTime() : 0;
          const valTime = Number(r.value) || 0;
          const lockTime = Math.max(createdTime, valTime);

          if (r.key.startsWith('notified_waitlist_')) {
            const kVal = r.key.replace('notified_waitlist_', '');
            notifiedLocksMap.set(kVal, Math.max(notifiedLocksMap.get(kVal) || 0, lockTime));
          } else if (r.key.startsWith('waitlist_req_')) {
            const kVal = r.key.replace('waitlist_req_', '');
            waitlistReqsMap.set(kVal, Math.max(waitlistReqsMap.get(kVal) || 0, lockTime));
          }
        });
      }
    } catch (e) {}

    // Query Waitlist entries waiting for stock (LATEST FIRST so we use the most recent name)
    let waitlistEntries = [];
    try {
      const waitlistRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?status=in.(pending,en_attente)&order=created_at.desc`, {
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

    // Fetch store settings to identify notified waitlist entries
    const notifiedEntryIds = new Set();
    try {
      const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=like.notified_waitlist_*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const settingsRows = await setRes.json();
      if (Array.isArray(settingsRows)) {
        settingsRows.forEach(r => {
          if (r.key && r.key.startsWith('notified_waitlist_')) {
            const entryIdOrKey = r.key.replace('notified_waitlist_', '');
            notifiedEntryIds.add(entryIdOrKey);
          }
        });
      }
    } catch (e) {}

    // Process Waitlist Entries (only process customers who explicitly signed up for waitlist)
    for (const entry of waitlistEntries) {
      if (entry.status === 'notified' || (entry.id && notifiedEntryIds.has(entry.id))) {
        continue;
      }

      const entryPhone = entry.whatsapp_number || entry.phone;
      const cleanPhone = entryPhone ? entryPhone.replace(/\D/g, '') : '';
      const waPhone = formatWhatsAppPhone(entryPhone);
      const last8 = cleanPhone.slice(-8);

      const entrySize = entry.size || '';
      const entryProdId = entry.product_id || entry.productId;
      const entryProdText = entry.product_title || entry.product || '';

      const sizeMatches = isSizeMatch(targetSize, entrySize, entryProdText);
      const prodMatches = isProductMatch(productId, productTitle, entryProdId, entryProdText);
      const colorMatches = isColorMatch(targetColor, entry.color);

      if (!sizeMatches || !prodMatches || !colorMatches) {
        continue;
      }

      // Specific lock key for this client + product + size to prevent concurrent dup messages
      const variantLockKey = `${last8 || waPhone}_${entryProdId || cleanTitle(entryProdText)}_${entrySize}`;
      if (notifiedPhones.has(variantLockKey) || (entry.id && notifiedPhones.has(entry.id))) {
        continue;
      }

      const lastSentTime = global._recentRestockMap.get(variantLockKey) || (entry.id ? global._recentRestockMap.get(entry.id) : 0) || 0;
      if (lastSentTime > 0 && (now - lastSentTime < 15000)) {
        continue; // 🛑 PREVENT CONCURRENT DUP MESSAGES ACROSS PARALLEL REQUESTS!
      }

      notifiedPhones.add(variantLockKey);
      if (entry.id) notifiedPhones.add(entry.id);
      global._recentRestockMap.set(variantLockKey, now);
      if (entry.id) global._recentRestockMap.set(entry.id, now);

      // Patch THIS specific waitlist entry to notified
      try {
        if (entry.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${entry.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'notified' })
          });

          // Record persistent notified status in settings table (works reliably under anon key)
          fetch(`${SUPABASE_URL}/rest/v1/settings`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ key: `notified_waitlist_${entry.id}`, value: String(Date.now()) })
          }).catch(() => {});
        }
      } catch (e) {}

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

    return res.status(200).json({ success: true, notifiedCount });
  } catch (err) {
    console.error('Notify restock error:', err);
    return res.status(500).json({ error: err.message });
  }
}

