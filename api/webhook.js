const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSKaHVaNhbDcXWvirUZCAtEQwuHus3c6VCPYV6BzJhJMGZBv0y7LPe2UTWP1KOFKngJCRqiumnd6R27VNOZABQlmGzzbl87arKbPuvgZBag148noX6nLxjkKMO7Ue0hiLUDRS4spYopCGpuwHTZCnPW4Deyzivxg3xlphgLBdUZAWWRD5Y0HwZDZD';

const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';

let cachedToken = null;
let lastTokenFetch = 0;

async function getMetaAccessToken() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.meta_access_token`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0] && data[0].value && data[0].value.length > 20) {
      return data[0].value.trim();
    }
  } catch (err) {
    console.error('Error fetching token from Supabase:', err);
  }
  return DEFAULT_TOKEN;
}

async function saveStockAlertRecord(msgId, phone, productId, colorIdx, size) {
  try {
    const rawDigits = (phone || '').replace(/\D/g, '');
    const last8 = rawDigits.slice(-8);
    const dataVal = JSON.stringify({ productId, colorIdx, size, timestamp: Date.now() });
    
    if (msgId) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key: `alert_msg_${msgId}`, value: dataVal })
      });
    }

    if (last8) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key: `last_alert_${last8}`, value: dataVal })
      });
    }
  } catch (err) {
    console.error('Error saving stock alert record:', err);
  }
}

async function getStockAlertByMsgId(msgId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_msg_${msgId}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]?.value) {
      return JSON.parse(rows[0].value);
    }
  } catch (e) {}
  return null;
}

async function getLatestStockAlertForPhone(phone) {
  try {
    const rawDigits = (phone || '').replace(/\D/g, '');
    const last8 = rawDigits.slice(-8);
    if (!last8) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.last_alert_${last8}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]?.value) {
      return JSON.parse(rows[0].value);
    }
  } catch (e) {}
  return null;
}

async function getGeminiKeys() {
  const keys = [];

  const addKey = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    raw.split(/[\n,;\s"']+/).forEach(part => {
      const clean = part.trim();
      if (clean && clean.length > 15 && !keys.includes(clean)) {
        keys.push(clean);
      }
    });
  };

  // 1. Sweep all process.env variables containing "GEMINI"
  Object.keys(process.env).forEach(envVar => {
    if (envVar.toUpperCase().includes('GEMINI')) {
      addKey(process.env[envVar]);
    }
  });

  // 2. Query Supabase settings table for any row containing "gemini" or "key"
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.key && (item.key.toLowerCase().includes('gemini') || item.key.toLowerCase().includes('key')) && item.value) {
          if (typeof item.value === 'object') {
            try { addKey(JSON.stringify(item.value)); } catch(e) {}
          } else {
            addKey(String(item.value));
          }
        }
      });
    }
  } catch (err) {
    console.error('Error fetching Gemini keys from Supabase:', err);
  }

  // 3. Built-in hardcoded 10 Gemini API Keys
  const hardcoded = [
    Buffer.from('QVEuQWI4Uk42THJfRndDWGdzWnpvNUI3X0ZHTXV2Yzkyd1diSDYwWk53eFJpSVJqTEx2akE=', 'base64').toString('utf8'), // Key 1
    Buffer.from('QVEuQWI4Uk42SWpweDNfcmhWYTBGZDYzeEdfNWlCdzN2eGlWQ2pkajhZRFh6QlBUMFpkUmc=', 'base64').toString('utf8'), // Key 2
    Buffer.from('QVEuQWI4Uk42SnFZODAtdWVvaUkyX1RvUUFQMGpjZm5WS3Z2Y2RadlZkeV9uMG1Vb2x5N3c=', 'base64').toString('utf8'), // Key 3
    Buffer.from('QVEuQWI4Uk42SnJiWXFJaDJEa3lyRU5MVXJNVkRVZ2xSSjlqZWZ6WXk4aEFyYnNNMGxaZXc=', 'base64').toString('utf8'), // Key 4
    Buffer.from('QVEuQWI4Uk42S2ZpZXB4alF5NlNaWkIzVDRpODBvOGhSckJBSDhzYzBNeHRoRDB4N3hsMVE=', 'base64').toString('utf8'), // Key 5
    Buffer.from('QVEuQWI4Uk42SmZJX0V2MHZfRjJoLTh1R0dFbTd4bnpOeEZxbzNLTmNPd09LeDM0VW5rMGc=', 'base64').toString('utf8'), // Key 6
    Buffer.from('QVEuQWI4Uk42SjJQdE1HZmpuUmVUZ2pyTlJBTzFUUFdlcHQ3SXR5QV9MZEVmaVpER3JlNEE=', 'base64').toString('utf8'), // Key 7
    Buffer.from('QVEuQWI4Uk42SUxYM1h6M2RodVJzNi1LTHVGSFdiZjhOUktDR09IU01OcDV2ekpPQjlSd0E=', 'base64').toString('utf8'), // Key 8
    Buffer.from('QVEuQWI4Uk42TGgxRVpsR2pOUTQxU2RKWDV5NEY3SE5jdFV1MTVWZnl5RnRTaVZCS2FQdGc=', 'base64').toString('utf8'), // Key 9
    Buffer.from('QVEuQWI4Uk42SjBKU2oxTTd6RU4xdDEzZnJoSzNQZ3lGRkxQNlo0bExZaDgtbC1DV0VqOXc=', 'base64').toString('utf8')  // Key 10
  ];
  hardcoded.forEach(k => addKey(k));

  return keys;
}

function removeEmojis(str) {
  if (!str) return "";
  return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase()
    .replace(/[Ø£Ø¥Ø¢Ø§Ù‹ÙŒÙÙŽÙÙÙ‘Ù’]/g, "Ø§")
    .replace(/Ø©/g, "Ù‡")
    .replace(/Ù‰/g, "ÙŠ")
    .replace(/3/g, "e")
    .replace(/7/g, "h")
    .trim();
}

function extractCleanPhonesList(...sources) {
  const rawList = [];
  sources.forEach(src => {
    if (!src) return;
    let str = typeof src === 'object' ? JSON.stringify(src) : String(src);
    str = str.replace(/[\[\]"'\\]/g, ' ');
    const parts = str.split(/[,;\/\n-]/);
    parts.forEach(p => {
      const clean = p.replace(/\D/g, '');
      if (clean.length >= 9) {
        let phone = clean;
        if (phone.startsWith('213')) phone = '0' + phone.substring(3);
        if (phone.length === 9) phone = '0' + phone;
        if (phone.length === 10) {
          rawList.push(phone);
        }
      }
    });
  });

  return [...new Set(rawList)];
}

async function getSequentialOrderNum(targetOrder) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?select=id`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    const contentRange = res.headers.get('content-range');
    if (contentRange && contentRange.includes('/')) {
      const total = contentRange.split('/')[1];
      if (total && total !== '*') return total;
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return String(data.length);
  } catch (err) {
    console.error('Error computing order number:', err);
  }
  return "81";
}

function cleanProductText(prod) {
  if (!prod) return "Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©";
  return String(prod).replace(/\(\(/g, '').replace(/\)\)/g, '');
}

async function getStoreSettings() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/settings?select=*`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      const settingsMap = {};
      data.forEach(item => {
        if (item.key && item.value) {
          settingsMap[item.key] = item.value;
        }
      });
      return settingsMap;
    }
    return {};
  } catch (err) {
    console.error('Error fetching settings from Supabase:', err);
    return {};
  }
}

async function getAllProducts() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      // Filter strictly for retail/delivery products (exclude wholesale gros__ and boutique__ clones)
      return data.filter(p => !p.category?.startsWith('gros__') && !p.category?.startsWith('boutique__'));
    }
    return [];
  } catch (err) {
    console.error('Error fetching products from Supabase:', err);
    return [];
  }
}

async function downloadMetaMedia(mediaId) {
  const token = await getMetaAccessToken();
  if (!token || !mediaId) return null;
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'curl/7.68.0'
      }
    });
    const metaData = await metaRes.json();
    if (metaData && metaData.url) {
      let audioRes = await fetch(metaData.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'curl/7.68.0'
        }
      });
      
      if (!audioRes.ok) {
        audioRes = await fetch(metaData.url, {
          headers: { 'User-Agent': 'curl/7.68.0' }
        });
      }

      if (audioRes.ok) {
        const arrayBuf = await audioRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const mimeType = metaData.mime_type ? metaData.mime_type.split(';')[0].trim() : 'audio/ogg';
        return { base64, mimeType };
      }
    }
  } catch (err) {
    console.error('Error downloading Meta media:', err);
  }
  return null;
}

async function generateGeminiAudio(base64Audio, mimeType, promptText, systemInstruction = "") {
  const modelEndpoints = ['gemini-2.0-flash', 'gemini-flash-latest'];
  const keys = await getGeminiKeys();
  for (const selectedKey of keys) {
    for (const model of modelEndpoints) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': selectedKey
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/ogg',
                    data: base64Audio
                  }
                },
                {
                  text: promptText || "Ø§Ø³ØªÙ…Ø¹ Ù„Ù‡Ø°Ø§ Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØµÙˆØªÙŠ Ù„Ù„Ø²Ø¨ÙˆÙ†ØŒ ÙˆØ§ÙÙ‡Ù… Ø·Ù„Ø¨Ù‡ Ø¨Ø¯Ù‚Ø© Ø¯ÙˆÙ† ÙƒØªØ§Ø¨Ø© Ø¥ÙŠÙ…ÙˆØ¬ÙŠ."
                }
              ]
            }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
          })
        });

        if (res.status === 200) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return removeEmojis(text.trim());
        }
      } catch (err) {
        console.error('Gemini Audio error:', err);
      }
    }
  }
  return null;
}

function getSmartFallbackResponse(userMessage, storeSettings = {}, products = []) {
  const norm = normalizeText(userMessage);
  const pLower = (userMessage || "").toLowerCase();
  const mapsUrl = storeSettings.googleMapsUrl || storeSettings.googleMaps || "https://maps.app.goo.gl/algeria-pyjama-dz";
  const address = storeSettings.address || "Ø§Ù„Ø´Ù„Ù (Chlef)";

  const phoneSources = storeSettings.phoneOrders 
    ? [storeSettings.phoneOrders, storeSettings.whatsapp]
    : [storeSettings.phones, storeSettings.whatsapp];
  const phonesArr = extractCleanPhonesList(...phoneSources);
  const formattedPhonesBullets = phonesArr.length > 0 ? phonesArr.map(p => `- ${p}`).join('\n') : '- 0554128933';

  // 1. QUALITY & FABRIC INQUIRY
  if (['qualite', 'qualitÃ©', 'chaba', 'chab', 'chbab', 'Ø¬ÙˆØ¯Ø©', 'Ù†ÙˆØ¹ÙŠØ©', 'Ù‚Ù…Ø§Ø´', 'Ù…Ù„ÙŠØ­Ø©', 'Ø´Ø¨Ø§Ø¨Ø©', 'Ø´Ø¨Ø§Ø¨', 'Ù…Ù„ÙŠØ­'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `Ø¬ÙˆØ¯Ø© Ø§Ù„Ø³Ù„Ø¹Ø© ÙˆØ§Ù„Ù‚Ù…Ø§Ø´ Ù…Ù…ØªØ§Ø²Ø© Ø¬Ø¯Ø§Ù‹ ÙˆØ±ÙÙŠØ¹Ø© ÙˆÙ…Ø±ÙŠØ­Ø© ÙÙŠ Ø§Ù„Ù„Ø¨Ø³ 100%.\nÙŠÙ…ÙƒÙ†Ùƒ ØªØµÙØ­ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„Ø§Øª ÙˆØ§Ù„ØªÙØ§ØµÙŠÙ„ Ø¹Ø¨Ø± Ù…ÙˆÙ‚Ø¹Ù†Ø§ Ø§Ù„Ø±Ø³Ù…ÙŠ:\nhttps://pyjama-dz.vercel.app`;
  }

  // 2. DELIVERY TIMING / SPEED INQUIRY
  if (['winta', 'twsslni', 'twsslnii', 'ÙˆÙ‚ØªØ§Ø´', 'Ø´Ø­Ø§Ù„ ØªÙ‚Ø¹Ø¯', 'Ø´Ø­Ø§Ù„ ÙŠØ§Ø®Ø¯', 'Ø´Ø­Ø§Ù„ ØªØ§Ø®Ø¯', 'Ù…ØªÙ‰', 'ØªØªÙˆØµÙ„', 'ØªÙˆØµÙ„Ù†ÙŠ'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `Ø§Ù„ØªÙˆØµÙŠÙ„ Ø¹Ø§Ø¯Ø© ÙŠØ£Ø®Ø° Ø¨ÙŠÙ† 24 Ø­ØªÙ‰ 48 Ø³Ø§Ø¹Ø© Ø¨Ø§Ù„Ù†Ø³Ø¨Ø© Ù„ÙˆÙ„Ø§ÙŠØ© Ø§Ù„Ø´Ù„ÙØŒ ÙˆÙ…Ù† ÙŠÙˆÙ…ÙŠÙ† Ø¥Ù„Ù‰ 4 Ø£ÙŠØ§Ù… Ù„Ø¨Ø§Ù‚ÙŠ Ø§Ù„ÙˆÙ„Ø§ÙŠØ§Øª.\nÙÙˆØ± Ù…Ø§ ØªØ®Ø±Ø¬ Ø§Ù„Ø·Ù„Ø¨ÙŠØ© Ù…Ø¹ Ø§Ù„Ù…ÙˆØ²Ø¹ØŒ Ø±Ø§Ø­ ÙŠØªØµÙ„ Ø¨ÙŠÙƒ ÙÙŠ Ø§Ù„Ù‡Ø§ØªÙ Ø¨Ø§Ø´ ÙŠÙˆØµÙ„Ù‡Ø§Ù„Ùƒ.`;
  }

  // 3. PHONE NUMBERS QUERY
  if (['numero', 'nomer', 'num', 'nomro', 'nomiro', 'Ù‡Ø§ØªÙ', 'Ø±Ù‚Ù…', 'Ø§Ø±Ù‚Ø§Ù…', 'Ù†Ù…ÙŠØ±Ùˆ', 'Ù†ÙˆÙ…Ø±Ùˆ', 'tel', 'phone'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `Ø£Ø±Ù‚Ø§Ù… Ø§Ù„ØªÙˆØ§ØµÙ„ ÙˆØ§Ù„ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ù„Ù„Ù…ØªØ¬Ø±:\n${formattedPhonesBullets}\n\nÙ†Ø­Ù† ÙÙŠ Ø®Ø¯Ù…ØªÙƒ Ø¯Ø§Ø¦Ù…Ø§Ù‹.`;
  }

  // 4. LOCATION QUERY
  if (['win jayiin', 'win jayin', 'Ù…Ù‚Ø±', 'Ø¹Ù†ÙˆØ§Ù†', 'Ù…ÙˆÙ‚Ø¹', 'Ø¨Ù„Ø§ØµØ©', 'Ù„ÙˆÙƒÙŠØ´Ù†', 'Ø§Ù„Ù„ÙˆÙƒÙŠØ´Ù†', 'chlef', 'Ø§Ù„Ø´Ù„Ù'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `Ø§Ù„Ù…Ù‚Ø± ÙˆØ§Ù„Ø¹Ù†ÙˆØ§Ù†: ${address}.\nØ±Ø§Ø¨Ø· Ø®Ø±Ø§Ø¦Ø· Ø¬ÙˆØ¬Ù„ (Google Maps):\n${mapsUrl}\n\nØ§Ù„ØªÙˆØµÙŠÙ„ Ù…ØªÙˆÙØ± Ù„Ø¬Ù…ÙŠØ¹ 58 ÙˆÙ„Ø§ÙŠØ© Ø­ØªÙ‰ Ø¨Ø§Ø¨ Ø§Ù„Ù…Ù†Ø²Ù„. ÙƒÙŠÙ ÙŠÙ…ÙƒÙ†Ù†Ø§ Ù…Ø³Ø§Ø¹Ø¯ØªÙƒ Ø§Ù„ÙŠÙˆÙ…ØŸ`;
  }

  // 5. REAL-TIME PRODUCT ITEM / COLOR / STOCK CHECKER
  if (['ensemble', 'noir', 'rouge', 'rose', 'blanc', 'bleu', 'Ø¨ÙŠØ¬Ø§Ù…Ø©', 'Ø§Ù†Ø³Ø§Ù…Ø¨Ù„', 'Ø§Ù†ØµØ§Ù…Ø¨Ù„', 'Ø³Ø·ÙˆÙƒ', 'ÙƒØ§ÙŠÙ†', 'kaayn', 'kayn', 'dispo', 'disponibilite', 'couleur', 'taille', 'Ù…Ù‚Ø§Ø³', 'Ù„ÙˆÙ†'].some(k => norm.includes(k) || pLower.includes(k))) {
    const availableColors = [];
    (products || []).forEach(p => {
      if (Array.isArray(p.colorVariants)) {
        p.colorVariants.forEach(cv => {
          if (cv.name) availableColors.push(normalizeText(cv.name));
        });
      }
    });

    const hasColorMatch = availableColors.some(c => c && c.length > 1 && (norm.includes(c) || pLower.includes(c)));
    const hasTitleMatch = (products || []).some(p => {
      const t = normalizeText(p.title);
      return norm.split(/\s+/).some(w => w.length > 2 && t.includes(w));
    });

    if (hasColorMatch || hasTitleMatch) {
      return `Ø¥ÙŠÙ‡ ÙƒØ§ÙŠÙ† Ù…ØªÙˆÙØ± ÙÙŠ Ø§Ù„Ø³Ø·ÙˆÙƒ. ØªÙØ¶Ù„ Ø¨ØªØµÙØ­ Ø§Ù„ØµÙˆØ± ÙˆØ§Ù„Ù…Ù‚Ø§Ø³Ø§Øª ÙˆØªØ£ÙƒÙŠØ¯ Ø·Ù„Ø¨Ùƒ Ø¹Ø¨Ø± Ù…ÙˆÙ‚Ø¹Ù†Ø§ Ø§Ù„Ø±Ø³Ù…ÙŠ:\nhttps://pyjama-dz.vercel.app`;
    } else {
      return `Ù…Ø§ÙƒØ§Ø´ Ù…ØªÙˆÙØ± Ø­Ø§Ù„ÙŠØ§Ù‹ Ù‡Ø§Ø¯ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø£Ùˆ Ø§Ù„Ù„ÙˆÙ†. ØªÙØ¶Ù„ Ø¨ØªØµÙØ­ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„Ø§Øª ÙˆØ§Ù„Ø£Ù„ÙˆØ§Ù† Ø§Ù„Ù…ØªÙˆÙØ±Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ Ø¹Ø¨Ø± Ù…ÙˆÙ‚Ø¹Ù†Ø§ Ø§Ù„Ø±Ø³Ù…ÙŠ:\nhttps://pyjama-dz.vercel.app`;
    }
  }

  // 6. PRICES / CATALOG
  if (['prix', 'Ø³Ø¹Ø±', 'Ø§Ø³Ø¹Ø§Ø±', 'Ø³ÙˆÙ…Ø©', 'Ø´Ø­Ø§Ù„', 'Ø¨ÙƒÙ…', 'Ù…Ù†ØªØ¬Ø§Øª', 'Ù…ÙˆØ¯ÙŠÙ„Ø§Øª', 'Ø¨ÙŠØ¬Ø§Ù…Ø©', 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª', 'Ø³Ù„Ø¹Ø©'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `ØªÙØ¶Ù„ Ø¨ØªØµÙØ­ ÙƒØ§ÙØ© Ø§Ù„ØµÙˆØ±ØŒ Ø§Ù„Ù…Ù‚Ø§Ø³Ø§ØªØŒ Ø§Ù„Ø£Ù„ÙˆØ§Ù† ÙˆØ§Ù„Ø£Ø³Ø¹Ø§Ø± Ø§Ù„Ù…ØªÙˆÙØ±Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ Ø¹Ø¨Ø± Ù…ÙˆÙ‚Ø¹Ù†Ø§ Ø§Ù„Ø±Ø³Ù…ÙŠ:\nhttps://pyjama-dz.vercel.app\n\nØ£Ø³Ø¹Ø§Ø±Ù†Ø§ Ù…Ù†Ø§Ø³Ø¨Ø© Ø¬Ø¯Ø§Ù‹ ÙˆØ§Ù„ØªÙˆØµÙŠÙ„ Ù…ØªÙˆÙØ± Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„ÙˆÙ„Ø§ÙŠØ§Øª.`;
  }

  // 7. DELIVERY GENERAL
  if (['livraison', 'ØªÙˆØµÙŠÙ„', 'Ø´Ø­Ù†', 'Ù†ÙˆØµÙ„Ùˆ', 'ÙˆÙ„Ø§ÙŠØ©', 'Ø¯ÙŠÙƒØ³Ø¨Ø±ÙŠØ³', 'ÙŠØ§Ù„Ø§Ø¯ÙŠÙ†'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `Ø§Ù„ØªÙˆØµÙŠÙ„ Ù…ØªÙˆÙØ± Ù„Ø¬Ù…ÙŠØ¹ 58 ÙˆÙ„Ø§ÙŠØ© Ø­ØªÙ‰ Ø¨Ø§Ø¨ Ø§Ù„Ù…Ù†Ø²Ù„ Ø£Ùˆ Ø§Ù„Ù…ÙƒØªØ¨.\nØ§Ù„Ø¯ÙØ¹ ÙŠÙƒÙˆÙ† Ø¹Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… Ø¨Ø¹Ø¯ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø·Ù„Ø¨Ùƒ.`;
  }

  // 8. WHOLESALE
  if (['gros', 'Ø¬Ù…Ù„Ø©', 'Ø¨Ø§Ù„Ø¬Ù…Ù„Ø©', 'Ø³ÙŠØ±ÙŠ', 'ØªØ¬Ø§Ø±Ø©'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `Ø§Ù„Ø¨ÙŠØ¹ Ø¨Ø§Ù„Ø¬Ù…Ù„Ø© Ù…ØªÙˆÙØ± Ø¨Ø§Ù„Ø³ÙŠØ±ÙŠØ§Øª ÙˆØ§Ù„ÙƒÙ…ÙŠØ§Øª Ù„ØµØ­Ø§Ø¨ Ø§Ù„Ù…Ø­Ù„Ø§Øª ÙˆØ§Ù„ØªØ¬Ø§Ø±Ø©.\nÙŠÙ…ÙƒÙ†Ùƒ ØªØµÙØ­ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø£Ùˆ Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹Ù†Ø§ Ø¹Ø¨Ø± Ø§Ù„Ù‡Ø§ØªÙ Ù„Ù„Ù…Ø²ÙŠØ¯ Ù…Ù† Ø§Ù„ØªÙØ§ØµÙŠÙ„: https://pyjama-dz.vercel.app`;
  }

  return `Ø£Ù‡Ù„Ø§Ù‹ ÙˆØ³Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ. ØªÙØ¶Ù„ Ø¨Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø± Ø¹Ù† Ø£ÙŠ Ù…ÙˆØ¯ÙŠÙ„ Ø£Ùˆ Ù…Ù‚Ø§Ø³ Ø£Ùˆ Ø³Ø¹Ø±ØŒ Ù†Ø­Ù† ÙÙŠ Ø®Ø¯Ù…ØªÙƒ.\nØ±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø±Ø³Ù…ÙŠ: https://pyjama-dz.vercel.app`;
}

async function generateGeminiAI(prompt, systemInstruction = "", storeSettings = {}, userMessage = "", products = []) {
  const modelEndpoints = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  const keys = await getGeminiKeys();
  for (const selectedKey of keys.slice(0, 3)) {
    for (const model of modelEndpoints) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': selectedKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.status === 200) {
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const textParts = parts.filter(p => p.text && !p.thought).map(p => p.text).filter(Boolean);
          const text = textParts.join('');
          if (text) return removeEmojis(text.trim());
        }
      } catch (err) {}
    }
  }

  return getSmartFallbackResponse(userMessage || prompt, storeSettings, products);
}

async function sendWhatsAppMessage(toPhone, textBody) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone) return;

  const rawDigits = String(toPhone).replace(/\D/g, '');
  if (!rawDigits) return;
  const formattedPhone = rawDigits.startsWith('213') ? rawDigits : rawDigits.replace(/^0/, '213');

  const cleanBody = removeEmojis(textBody);
  const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;
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
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: cleanBody }
      })
    });
    const data = await res.json();
    if (data.error) {
      console.error('WhatsApp API send error:', data.error);
      return null;
    }
    console.log('WhatsApp send result:', data);
    return data;
  } catch (err) {
    console.error('Send WhatsApp error:', err);
  }
}

async function sendMessengerMessage(recipientId, textBody, pageId = null) {
  const token = await getMetaAccessToken();
  if (!token || !recipientId) return;

  const cleanBody = removeEmojis(textBody);
  const pathsToTry = pageId ? [pageId, 'me'] : ['me'];

  for (const p of pathsToTry) {
    const url = `https://graph.facebook.com/v21.0/${p}/messages?access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: { text: cleanBody }
        })
      });
      const data = await res.json();
      console.log(`Messenger/IG send result via /${p}/messages:`, data);
      if (data && (data.message_id || data.recipient_id)) return data;
    } catch (err) {
      console.error(`Send Messenger/IG error via /${p}/messages:`, err);
    }
  }
}

async function uploadMediaToMeta(token, imageUrl) {
  try {
    let blob, mimeType = "image/jpeg";
    if (typeof imageUrl === 'string' && imageUrl.startsWith("data:image")) {
      const parts = imageUrl.split(",");
      mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const base64Data = parts[1];
      const buffer = Buffer.from(base64Data, "base64");
      blob = new Blob([buffer], { type: mimeType });
    } else {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) return null;
      blob = await imgRes.blob();
      mimeType = blob.type || "image/jpeg";
    }

    const formData = new FormData();
    formData.append("file", blob, "product.jpg");
    formData.append("type", mimeType);
    formData.append("messaging_product", "whatsapp");

    const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/media`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    const data = await uploadRes.json();
    return data?.id || null;
  } catch (err) {
    console.error('Error uploading media to Meta:', err);
    return null;
  }
}

async function sendWhatsAppImage(toPhone, imageUrl, caption = "") {
  const token = await getMetaAccessToken();
  if (!token || !toPhone || !imageUrl) return null;
  const cleanCaption = removeEmojis(caption);
  const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;
  try {
    const mediaId = await uploadMediaToMeta(token, imageUrl);
    const imagePayload = mediaId ? { id: mediaId, caption: cleanCaption } : { link: imageUrl, caption: cleanCaption };

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
        type: 'image',
        image: imagePayload
      })
    });
    const data = await res.json();
    if (data.error) {
      console.error('WhatsApp API image error:', data.error);
      return null;
    }
    console.log('WhatsApp send image result:', data);
    return data;
  } catch (err) {
    console.error('Send WhatsApp image error:', err);
    return null;
  }
}

async function createChatOrderInSupabase(orderData) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders`;
    const itemObj = {
      productId: orderData.productId || orderData.items?.[0]?.productId || null,
      product: orderData.product || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©',
      color: orderData.color || '',
      size: orderData.size || '',
      qty: Number(orderData.quantity || 1),
      price: Number(orderData.price || orderData.totalPrice || 0)
    };

    const payload = {
      clientName: orderData.clientName || 'Ø²Ø¨ÙˆÙ† Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©',
      phone: orderData.phone,
      wilaya: orderData.wilaya || 'Ø§Ù„Ø´Ù„Ù',
      commune: orderData.commune || 'Ø§Ù„Ù…Ø±ÙƒØ²',
      product: orderData.product || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©',
      price: Number(orderData.price || orderData.totalPrice || 0),
      quantity: Number(orderData.quantity || 1),
      deliveryCompany: orderData.deliveryCompany || 'Livraison Domicile',
      status: orderData.status || 'en_attente_confirmation',
      archived: orderData.archived !== undefined ? orderData.archived : (orderData.status === 'confirmee' || orderData.status === 'annulee'),
      created_at: new Date().toISOString(),
      items: orderData.items || [itemObj]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Error creating chat order in Supabase:', err);
    return null;
  }
}

async function notifyWaitingCustomers(productId, colorIdx, size, newQty) {
  // Restock notifications are handled exclusively by api/notify-restock.js to prevent duplicate messages
  return;
}


async function recordOutOfStockInquiry(fromPhone, messageText, products) {
  try {
    const sizeMatch = messageText.match(/(?:pointure|Ù…Ù‚Ø§Ø³|Ø­Ø¬Ù…|Ù‚ÙŠØ§Ø³|taille|size)\s*[:=]?\s*(\d{2}|S|M|L|XL|2XL|3XL|4XL|5XL)/i) 
      || messageText.match(/\b(3[5-9]|4[0-8]|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i);
    const requestedSize = sizeMatch ? sizeMatch[1].toUpperCase() : null;
    if (!Array.isArray(products) || products.length === 0) return;

    const pLower = messageText.toLowerCase();
    const normText = normalizeText(messageText);

    let matchedProduct = products.find(p => {
      const titleRaw = (p.title || '').toLowerCase();
      const titleNorm = normalizeText(p.title || '').toLowerCase();
      return pLower.includes(titleRaw) || normText.includes(titleNorm);
    }) || products[0];

    let currentStock = -1;
    let matchedColor = '';

    if (matchedProduct) {
      const variants = matchedProduct.colorVariants || matchedProduct.colorvariants || [];
      for (const v of variants) {
        if (requestedSize && v.stock && v.stock[requestedSize] !== undefined) {
          currentStock = Number(v.stock[requestedSize] || 0);
          matchedColor = v.name || '';
          break;
        }
      }
    }

    if (currentStock === 0 || (requestedSize && currentStock <= 0)) {
      const cleanPhone = fromPhone.replace(/^\+?213/, '0');
      const sizeStr = requestedSize || '';
      const prodTitle = matchedProduct?.title || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©';

      // Insert ONLY into waitlist table with status 'pending' (DO NOT insert into orders table)
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_name: 'Ø²Ø¨ÙˆÙ† Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨',
            whatsapp_number: cleanPhone,
            product_id: matchedProduct?.id,
            product_title: prodTitle,
            color: matchedColor,
            size: sizeStr,
            status: 'pending',
            created_at: new Date().toISOString()
          })
        });
      } catch (e) {}

      console.log(`Auto-recorded waitlist entry: Phone=${cleanPhone}, Size=${sizeStr}, Product=${prodTitle}`);
    }
  } catch (err) {
    console.error('Error recording out of stock inquiry:', err);
  }
}

function isValidAlgerianPhone(phoneStr) {
  if (!phoneStr) return false;
  const digits = String(phoneStr).replace(/\D/g, '');
  if (digits.length === 10 && /^(05|06|07)\d{8}$/.test(digits)) return true;
  if (digits.length === 12 && /^213(5|6|7)\d{8}$/.test(digits)) return true;
  return false;
}

async function processDirectOrderFromMessage(fromPhone, messageText, products) {
  try {
    const normText = normalizeText(messageText);
    const pLower = (messageText || '').toLowerCase();

    // Inquiry / Question check: If message asks a question or includes inquiry keywords, it is NOT an order placement
    const isQuestion = messageText.includes('?') || messageText.includes('ØŸ') ||
      ['ÙˆÙŠÙ†ØªØ§', 'ÙˆÙ‚ØªØ§Ø´', 'Ù…ØªÙ‰', 'ÙƒÙŠÙØ§Ù‡', 'ÙƒÙŠÙØ§Ø´', 'Ø´Ø­Ø§Ù„', 'qualitÃ©', 'ÙƒØ§Ù„ÙŠØªÙŠ', 'Ù†ÙˆØ¹ÙŠØ©', 'ÙˆØµÙ„Øª', 'ØªØµÙ„Ù†ÙŠ', 'ÙˆÙŠÙ† Ø±Ø§Ù‡ÙŠ', 'Ù…ÙƒØ§Ù†', 'ÙˆØµÙ„ØªÙ†ÙŠ'].some(k => normText.includes(k) || pLower.includes(k));

    if (isQuestion) return false;

    const phoneMatch = messageText.match(/(0\d{8,11}|\+?213\d{8,11})/);
    if (phoneMatch) {
      const extractedPhone = phoneMatch[1];
      if (!isValidAlgerianPhone(extractedPhone)) {
        const invalidMsg = `âš ï¸ *Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ ØºÙŠØ± ØµØ­ÙŠØ­*\nÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ø¬Ø²Ø§Ø¦Ø±ÙŠ ÙŠØªÙƒÙˆÙ† Ù…Ù† 10 Ø£Ø±Ù‚Ø§Ù… ÙˆÙŠØ¨Ø¯Ø£ Ø¨Ù€ 05 Ø£Ùˆ 06 Ø£Ùˆ 07 (Ù…Ø«Ø§Ù„: 0771335039) Ù„ØªØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„ØªØ³Ø¬ÙŠÙ„ ÙˆØªØ£ÙƒÙŠØ¯ Ø·Ù„Ø¨Ùƒ.`;
        await sendWhatsAppMessage(fromPhone, invalidMsg);
        return true;
      }
    }

    const wilayas = ["Ø§Ø¯Ø±Ø§Ø±", "Ø§Ù„Ø´Ù„Ù", "Ø§Ù„Ø£ØºÙˆØ§Ø·", "Ø£Ù… Ø§Ù„Ø¨ÙˆØ§Ù‚ÙŠ", "Ø¨Ø§ØªÙ†Ø©", "Ø¨Ø¬Ø§ÙŠØ©", "Ø¨Ø³ÙƒØ±Ø©", "Ø¨Ø´Ø§Ø±", "Ø¨Ù„ÙŠØ¯Ø©", "Ø¨ÙˆÙŠØ±Ø©", "ØªÙ…Ù†Ø±Ø§Ø³Øª", "ØªØ¨Ø³Ø©", "ØªÙ„Ù…Ø³Ø§Ù†", "ØªÙŠØ§Ø±Øª", "ØªÙŠØ²ÙŠ ÙˆØ²Ùˆ", "Ø§Ù„Ø¬Ø²Ø§Ø¦Ø±", "Ø§Ù„Ø¬Ù„ÙØ©", "Ø¬ÙŠØ¬Ù„", "Ø³Ø·ÙŠÙ", "Ø³Ø¹ÙŠØ¯Ø©", "Ø³ÙƒÙŠÙƒØ¯Ø©", "Ø³ÙŠØ¯ÙŠ Ø¨Ù„Ø¹Ø¨Ø§Ø³", "Ø¹Ù†Ø§Ø¨Ø©", "Ù‚Ø§Ù„Ù…Ø©", "Ù‚Ø³Ù†Ø·ÙŠÙ†Ø©", "Ù…Ø¯ÙŠØ©", "Ù…Ø³ØªØºØ§Ù†Ù…", "Ù…Ø³ÙŠÙ„Ø©", "Ù…Ø¹Ø³ÙƒØ±", "ÙˆØ±Ù‚Ù„Ø©", "ÙˆÙ‡Ø±Ø§Ù†", "Ø¨ÙŠØ¶", "Ø¥Ù„ÙŠØ²ÙŠ", "Ø¨Ø±Ø¬ Ø¨ÙˆØ¹Ø±ÙŠØ±ÙŠØ¬", "Ø¨ÙˆÙ…Ø±Ø¯Ø§Ø³", "Ø§Ù„Ø·Ø§Ø±Ù", "ØªÙ†Ø¯ÙˆÙ", "ØªÙŠØ³Ù…Ø³ÙŠÙ„Øª", "Ø§Ù„ÙˆØ§Ø¯ÙŠ", "Ø®Ù†Ø´Ù„Ø©", "Ø³ÙˆÙ‚ Ø£Ù‡Ø±Ø§Ø³", "ØªÙŠØ¨Ø§Ø²Ø©", "Ù…ÙŠÙ„Ø©", "Ø¹ÙŠÙ† Ø§Ù„Ø¯ÙÙ„Ù‰", "Ù†Ø¹Ø§Ù…Ø©", "Ø¹ÙŠÙ† ØªÙ…ÙˆØ´Ù†Øª", "ØºØ±Ø¯Ø§ÙŠØ©", "ØºÙ„ÙŠØ²Ø§Ù†", "Ø§Ù„Ù…ØºÙŠØ±", "Ø§Ù„Ù…Ù†ÙŠØ¹Ø©", "Ø£ÙˆÙ„Ø§Ø¯ Ø¬Ù„Ø§Ù„", "Ø¨Ø±Ø¬ Ø¨Ø§Ø¬ÙŠ Ù…Ø®ØªØ§Ø±", "Ø¨Ù†ÙŠ Ø¹Ø¨Ø§Ø³", "ØªÙŠÙ…ÙŠÙ…ÙˆÙ†", "ØªÙ‚Ø±Øª", "Ø¬Ø§Ù†Øª", "Ø¥Ù† ØµØ§Ù„Ø­", "Ø¥Ù† Ù‚Ø²Ø§Ù…", "alger", "oran", "blida", "chlef", "setif", "constantine"];
    const wilayaMatch = wilayas.find(w => normText.includes(w.toLowerCase()) || pLower.includes(w.toLowerCase()));

    // Explicit order intent keywords (MUST express intention to place/register an order)
    const explicitOrderKeywords = [
      'Ø³Ø¬Ù„Ù„ÙŠ ÙƒÙˆÙ…ÙˆÙ†Ø¯', 'Ø³Ø¬Ù„ Ø·Ù„Ø¨ÙŠØ©', 'Ù†Ø¯ÙŠØ± ÙƒÙˆÙ…ÙˆÙ†Ø¯', 'Ù†Ø·Ù„Ø¨ Ø¨ÙŠØ¬Ø§Ù…Ø©',
      'Ø§Ø±Ø³Ù„Ù„ÙŠ', 'Ø§Ø¨Ø¹Ø«Ù„ÙŠ ÙƒÙˆÙ…ÙˆÙ†Ø¯', 'passer commande', 'commander', 'Ù†Ø·Ù„Ø¨Ù‡Ø§'
    ];

    const hasExplicitOrderIntent = explicitOrderKeywords.some(k => normText.includes(k) || pLower.includes(k));
    const sizeMatchForCheck = messageText.match(/(?:pointure|Ù…Ù‚Ø§Ø³|Ø­Ø¬Ù…|Ù‚ÙŠØ§Ø³|taille|size)\s*[:=]?\s*(\d{2}|S|M|L|XL|2XL|3XL|4XL)/i) || messageText.match(/\b(3[5-9]|4[0-8]|S|M|L|XL|2XL|3XL|4XL)\b/i);
    
    // Strict Full Details Requirement: Phone + Wilaya + Size MUST all be present to create an order
    const hasValidPhone = phoneMatch && isValidAlgerianPhone(phoneMatch[1]);
    const hasFullDetails = hasValidPhone && wilayaMatch && sizeMatchForCheck;

    if (!hasExplicitOrderIntent && !hasFullDetails) return false;

    // Extract lines and name
    const lines = messageText.split('\n').map(l => l.trim()).filter(Boolean);
    let clientName = 'Ø§Ù„Ø²Ø¨ÙˆÙ† Ø§Ù„ÙƒØ±ÙŠÙ…';
    const nameRegex = /(?:Ø§Ø³Ù…ÙŠ|Ø§Ø³Ù…|Ø§Ù„Ø§Ø³Ù…|nom|client)\s*[:=]?\s*([Ø£-ÙŠa-zA-Z\s]{3,25})/i;
    const matchN = messageText.match(nameRegex);
    if (matchN) {
      clientName = matchN[1].trim();
    } else if (lines.length > 0 && lines[0].length >= 3 && !lines[0].match(/\d/) && !wilayas.some(w => lines[0].toLowerCase().includes(w))) {
      clientName = lines[0];
    }

    const orderPhone = phoneMatch ? phoneMatch[1] : fromPhone.replace(/^\+?213/, '0');
    const wilaya = wilayaMatch ? wilayaMatch : 'Ø§Ù„Ø´Ù„Ù';

    let deliveryCompany = 'Livraison Domicile';
    if (pLower.includes('yalidine') || normText.includes('ÙŠØ§Ù„Ø§Ø¯ÙŠÙ†')) {
      deliveryCompany = 'Yalidine Express';
    } else if (pLower.includes('zrexpress') || pLower.includes('zr') || normText.includes('Ø²Ø¯ Ø§Ø±') || normText.includes('Ø²Ø¯ Ø¢Ø±')) {
      deliveryCompany = 'ZR Express';
    } else if (pLower.includes('bureau') || pLower.includes('stop desk') || normText.includes('Ù…ÙƒØªØ¨') || normText.includes('Ø¯Ø³ØªÙƒ')) {
      deliveryCompany = 'Livraison Bureau';
    } else if (pLower.includes('domicile') || normText.includes('Ù…Ù†Ø²Ù„') || normText.includes('Ø¯Ø§Ø±')) {
      deliveryCompany = 'Livraison Domicile';
    }

    // Size / Pointure extraction
    const sizeMatch = messageText.match(/(?:pointure|Ù…Ù‚Ø§Ø³|Ø­Ø¬Ù…|Ù‚ÙŠØ§Ø³|taille|size)\s*[:=]?\s*(\d{2}|S|M|L|XL|2XL|3XL|4XL)/i) || messageText.match(/\b(3[5-9]|4[0-8]|S|M|L|XL|2XL|3XL|4XL)\b/i);
    const requestedSize = sizeMatch ? sizeMatch[1].toUpperCase() : null;

    // Product and Color matching
    let matchedProduct = null;
    let matchedVariant = null;
    let variantIndex = -1;

    if (Array.isArray(products) && products.length > 0) {
      // Prefer standard delivery products over gros__ or boutique__ clones
      const deliveryProducts = products.filter(p => !p.category?.startsWith('gros__') && !p.category?.startsWith('boutique__'));
      const candidateProducts = deliveryProducts.length > 0 ? deliveryProducts : products;

      matchedProduct = candidateProducts.find(p => {
        const titleRaw = (p.title || '').toLowerCase();
        const titleNorm = normalizeText(p.title || '').toLowerCase();
        return pLower.includes(titleRaw) || normText.includes(titleNorm);
      }) || candidateProducts[0];

      if (matchedProduct) {
        const variants = matchedProduct.colorVariants || matchedProduct.colorvariants || [];
        variants.forEach((v, idx) => {
          const vName = (v.name || v.color || '').toLowerCase();
          const vNorm = normalizeText(vName);
          if (pLower.includes(vName) || normText.includes(vNorm) || (vName.startsWith('noir') && pLower.includes('noir'))) {
            matchedVariant = v;
            variantIndex = idx;
          }
        });
        if (!matchedVariant && variants.length > 0) {
          matchedVariant = variants[0];
          variantIndex = 0;
        }
      }
    }

    const colorLabel = matchedVariant ? (matchedVariant.name || matchedVariant.color || '') : '';

    // Stock check for delivery
    let currentStock = -1;
    if (requestedSize) {
      if (matchedVariant && matchedVariant.stock && matchedVariant.stock[requestedSize] !== undefined) {
        currentStock = Number(matchedVariant.stock[requestedSize] ?? 0);
      } else if (matchedProduct && matchedProduct.stock && matchedProduct.stock[requestedSize] !== undefined) {
        currentStock = Number(matchedProduct.stock[requestedSize] ?? 0);
      }
    }

    console.log(`Direct Order Check: Client="${clientName}", Phone="${orderPhone}", Wilaya="${wilaya}", Product="${matchedProduct?.title}", Color="${colorLabel}", Size="${requestedSize}", Stock=${currentStock}`);

    // âŒ OUT OF STOCK CASE (Stock is 0) -> Save to Waitlist ONLY (Do NOT insert into orders table)
    if (requestedSize && currentStock === 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_name: clientName,
          whatsapp_number: orderPhone,
          product_id: matchedProduct?.id || null,
          product_title: matchedProduct?.title || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©',
          color: colorLabel,
          size: requestedSize,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      });

      const outMsg = `Ø£Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ ${clientName}.\nØ¹Ø°Ø±Ø§Ù‹ØŒ Ø§Ù„Ù…Ù‚Ø§Ø³ (${requestedSize}) ØºÙŠØ± Ù…ØªÙˆÙØ± Ø­Ø§Ù„ÙŠØ§Ù‹ ÙÙŠ Ù…ÙˆØ¯ÙŠÙ„ ${matchedProduct?.title || ''} (${colorLabel}).\nØªÙ… Ø­ÙØ¸ Ø·Ù„Ø¨Ùƒ ÙˆØ³Ù†Ø®Ø¨Ø±Ùƒ Ø¹Ø¨Ø± Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ ÙÙˆØ± ØªÙˆÙØ±Ù‡ Ù…Ø¬Ø¯Ø¯Ø§Ù‹ Ø¥Ù† Ø´Ø§Ø¡ Ø§Ù„Ù„Ù‡. Ø´ÙƒØ±Ø§Ù‹ Ù„Ùƒ.`;
      await sendWhatsAppMessage(fromPhone, outMsg);
      return true;
    }

    // âœ… AVAILABLE IN STOCK (> 0) -> Save Order & Deduct Stock Immediately
    const newOrder = await createChatOrderInSupabase({
      clientName,
      phone: orderPhone,
      wilaya,
      commune: 'Ø§Ù„Ù…Ø±ÙƒØ²',
      product: `${matchedProduct?.title || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©'} (${colorLabel}${colorLabel ? ' - ' : ''}${requestedSize || ''})`.trim(),
      price: Number(matchedProduct?.price || 0),
      quantity: 1,
      deliveryCompany,
      status: 'confirmee',
      items: [{
        productId: matchedProduct?.id || null,
        product: matchedProduct?.title || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©',
        color: colorLabel,
        size: requestedSize || '',
        qty: 1,
        price: Number(matchedProduct?.price || 0)
      }]
    });

    if (newOrder) {
      // Deduct stock for all matching product variants in Supabase
      const matchedProducts = (products || []).filter(p => {
        const titleNorm = normalizeText(p.title || '').toLowerCase();
        const orderTitleNorm = normalizeText(matchedProduct?.title || '').toLowerCase();
        return titleNorm && orderTitleNorm && titleNorm === orderTitleNorm;
      });

      const prodsToUpdate = matchedProducts.length > 0 ? matchedProducts : (matchedProduct ? [matchedProduct] : []);

      for (const p of prodsToUpdate) {
        if (p && Array.isArray(p.colorVariants)) {
          const updatedVariants = p.colorVariants.map((v, idx) => {
            if (idx === variantIndex || (!matchedVariant && idx === 0)) {
              const stockObj = { ...(v.stock || {}) };
              const stockKeys = Object.keys(stockObj);
              const targetKey = stockKeys.find(k => k.trim().toLowerCase() === String(requestedSize).trim().toLowerCase()) || stockKeys[0] || requestedSize;
              if (targetKey && stockObj[targetKey] !== undefined) {
                const currentQty = Number(stockObj[targetKey] || 1);
                return {
                  ...v,
                  stock: { ...stockObj, [targetKey]: Math.max(0, currentQty - 1) }
                };
              }
            }
            return v;
          });

          await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${p.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ colorVariants: updatedVariants })
          });
        }
      }

      const orderNumStr = await getSequentialOrderNum(newOrder);
      const confirmMsg = `*Ù…ØªØ¬Ø± Pyjama DZ*\n\nØ£Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ ${clientName}.\nØªÙ… ØªØ³Ø¬ÙŠÙ„ ÙˆØªØ£ÙƒÙŠØ¯ Ø·Ù„Ø¨ÙŠØªÙƒ Ø±Ù‚Ù… #${orderNumStr} Ø¨Ù†Ø¬Ø§Ø­! ðŸ“¦\n\n- Ø§Ù„Ù…Ù†ØªØ¬: ${matchedProduct?.title || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©'} (${colorLabel}${colorLabel ? ' - ' : ''}${requestedSize || ''})\n- Ø§Ù„ÙˆÙ„Ø§ÙŠØ©: ${wilaya}\n- Ø§Ù„ØªÙˆØµÙŠÙ„: ${deliveryCompany}\n- Ø§Ù„Ø³Ø¹Ø±: ${matchedProduct?.price || ''} Ø¯Ø¬\n\nØ¬Ø§Ø±ÙŠ ØªØ¬Ù‡ÙŠØ² Ø·Ù„Ø¨Ùƒ ÙˆØ´Ø­Ù†Ù‡ ÙÙŠ Ø£Ù‚Ø±Ø¨ ÙˆÙ‚Øª. Ø´ÙƒØ±Ø§Ù‹ Ù„Ø«Ù‚ØªÙƒ Ø¨Ù†Ø§!`;
      await sendWhatsAppMessage(fromPhone, confirmMsg);
      return true;
    }
  } catch (err) {
    console.error('Error processing direct order from message:', err);
  }
  return false;
}

async function checkAndSendProductPhotos(toPhone, messageText, products) {
  if (!messageText || !Array.isArray(products) || products.length === 0) return false;

  const rawText = (messageText || '').toLowerCase().trim();
  const norm = normalizeText(messageText);

  // Photo Intent Regex (Matches all Franco, Arabic & Typo variations e.g. tsswwiira, tsswira, sbat, photo, etc.)
  const isPhotoIntent = [
    /ØµÙˆØ±Ø©|ØµÙˆØ±|ØªØµÙˆÙŠØ±Ø©|ØªØµÙˆÙŠØ±Ù‡|ØªØµØ§ÙˆÙŠØ±|ØªØµØ§ÙˆØ±|ØªØµÙˆÙŠØ±Ø§Øª|ØªØµÙˆÙŠØ±ØªÙ‡Ø§|ØµÙˆØ±Ù‡/i,
    /photo|photos|image|images|pic|pics|picture|pictures/i,
    /Ø´ÙˆÙ|Ù†Ø´ÙˆÙ|ÙˆØ±ÙŠÙ†ÙŠ|ÙˆØ±ÙŠÙ„ÙŠ|Ø¨Ø¹Ø«Ù„ÙŠ|Ø§Ø¨Ø¹Ø«Ù„ÙŠ|Ø§Ø¨Ø¹Ø«|Ø¨Ø¹Ø«|ØªØ£Ø¨Ø¹Ø«Ù„ÙŠ|ØªØ¨Ø¹ØªÙ„ÙŠ|ØªØ¨ÙŠØ¹ØªÙ„ÙŠ|tbeat|tbeath|tb3ath|beath|versili|varsili|vrsi/i,
    /t+s+a*w+i*r*a*/i, // Matches tswira, tsswira, tsswwiira, taswira, tasawir, tsawir, etc.
    /ØµÙˆØ±Ø© Ø§Ù„|ØªØµØ§ÙˆÙŠØ± Ø§Ù„|ØªØµÙˆÙŠØ±Ø© Ø§Ù„/i
  ].some(rgx => rgx.test(rawText) || rgx.test(norm));

  if (!isPhotoIntent) return false;

  // Detect specific product category/title requested (e.g. sbat / sabot / Ø³Ø¨Ø§Ø· / ØµÙ„Ø§Ø· / pyjama / Ø¨ÙŠØ¬Ø§Ù…Ø©)
  const isShoesRequested = /sbat|sabot|Ø³Ø¨Ø§Ø·|ØµÙ„Ø§Ø·|Ø­Ø°Ø§Ø¡|Ù†Ø¹Ø§Ù„Ø©|pantoufle/i.test(rawText) || /sbat|sabot|Ø³Ø¨Ø§Ø·|ØµÙ„Ø§Ø·|Ø­Ø°Ø§Ø¡|Ù†Ø¹Ø§Ù„Ø©|pantoufle/i.test(norm);
  const isPyjamaRequested = /pyjama|Ø¨ÙŠØ¬Ø§Ù…Ø©|Ø¨ÙŠØ¬Ø§Ù…Ø§Øª|Ø¨ÙŠØ¬Ø§Ù…Ø©/i.test(rawText) || /pyjama|Ø¨ÙŠØ¬Ø§Ù…Ø©|Ø¨ÙŠØ¬Ø§Ù…Ø§Øª|Ø¨ÙŠØ¬Ø§Ù…Ø©/i.test(norm);

  let targetProducts = products;
  
  if (isShoesRequested) {
    const shoesMatches = products.filter(p => {
      const t = `${p.title || ''} ${p.category || ''} ${p.badge || ''} ${p.description || ''}`.toLowerCase();
      return /sbat|sabot|Ø³Ø¨Ø§Ø·|ØµÙ„Ø§Ø·|Ø­Ø°Ø§Ø¡|Ù†Ø¹Ø§Ù„Ø©|pantoufle/i.test(t);
    });
    if (shoesMatches.length > 0) targetProducts = shoesMatches;
  } else if (isPyjamaRequested) {
    const pyjMatches = products.filter(p => {
      const t = `${p.title || ''} ${p.category || ''} ${p.badge || ''} ${p.description || ''}`.toLowerCase();
      return /pyjama|Ø¨ÙŠØ¬Ø§Ù…Ø©|Ø¨ÙŠØ¬Ø§Ù…Ø§Øª|Ø¨ÙŠØ¬Ø§Ù…Ø©/i.test(t);
    });
    if (pyjMatches.length > 0) targetProducts = pyjMatches;
  } else {
    // Check specific title match
    const titleMatches = products.filter(p => {
      const t = (p.title || '').toLowerCase();
      return t && (rawText.includes(t) || norm.includes(t));
    });
    if (titleMatches.length > 0) targetProducts = titleMatches;
  }

  // Collect images from target products
  const matchedImages = [];
  const seenUrls = new Set();

  targetProducts.forEach(p => {
    let countForProd = 0;
    const addImageObj = (imgUrl, caption) => {
      if (!imgUrl || typeof imgUrl !== 'string' || countForProd >= 2) return;
      let finalUrl = imgUrl.trim();
      if (finalUrl.startsWith('data:image')) {
        finalUrl = `https://pyjama-dz.vercel.app/api/product-image?id=${p.id}&file=product.jpg`;
      } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://pyjama-dz.vercel.app${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
      }

      if (!seenUrls.has(finalUrl)) {
        seenUrls.add(finalUrl);
        matchedImages.push({ url: finalUrl, caption });
        countForProd++;
      }
    };

    // 1. Direct image/images
    if (Array.isArray(p.images)) {
      p.images.forEach(img => addImageObj(img, `${p.title || 'Ù…Ù†ØªØ¬'} - Ø§Ù„Ø³Ø¹Ø±: ${p.price || 3200} Ø¯Ø¬`));
    } else if (p.image) {
      addImageObj(p.image, `${p.title || 'Ù…Ù†ØªØ¬'} - Ø§Ù„Ø³Ø¹Ø±: ${p.price || 3200} Ø¯Ø¬`);
    }

    // 2. Color variants images
    const variants = p.colorVariants || p.colorvariants;
    if (Array.isArray(variants)) {
      variants.forEach(cv => {
        const cvImg = cv.image || cv.imageUrl || cv.img;
        if (cvImg) {
          addImageObj(cvImg, `${p.title || 'Ù…Ù†ØªØ¬'} (${cv.name || cv.color || 'Ø§Ù„Ù„ÙˆÙ†'}) - Ø§Ù„Ø³Ø¹Ø±: ${p.price || 3200} Ø¯Ø¬`);
        }
      });
    }
  });

  // Fallback if no images found in target products
  if (matchedImages.length === 0 && products.length > 0) {
    const p = products[0];
    matchedImages.push({
      url: "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=800&q=80",
      caption: `${p.title || 'Ø¨ÙŠØ¬Ø§Ù…Ø§Øª ÙØ§Ø®Ø±Ø©'} - Ø§Ù„Ø³Ø¹Ø±: ${p.price || 3200} Ø¯Ø¬`
    });
  }

  if (matchedImages.length > 0) {
    let sentCount = 0;
    for (const item of matchedImages.slice(0, 4)) {
      console.log('Sending WhatsApp product image:', item.url.slice(0, 80));
      const res = await sendWhatsAppImage(toPhone, item.url, item.caption);
      if (res) sentCount++;
    }
    return sentCount > 0;
  }
  return false;
}

async function getLatestOrderForPhone(cleanPhone) {
  try {
    const raw9 = cleanPhone.replace(/\D/g, '').slice(-9);
    const url = `${SUPABASE_URL}/rest/v1/orders?phone=ilike.*${raw9}*&order=created_at.desc&limit=1`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Error fetching Supabase order:', err);
    return null;
  }
}

async function updateOrderStatusAndArchive(orderId, newStatus) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: newStatus, archived: true })
    });
    console.log('Updated order status and archived:', orderId, newStatus, res.status);
  } catch (err) {
    console.error('Error updating order status:', err);
  }
}

async function checkAndAlertLowStock(product, storeSettings) {
  if (!product || !Array.isArray(product.colorVariants)) return;
  
  const livraisonManagerPhone = (storeSettings.whatsappLivraisonManager && !storeSettings.whatsappLivraisonManager.includes('123456') && storeSettings.whatsappLivraisonManager.trim() !== '') ? storeSettings.whatsappLivraisonManager.trim() : null;
  const boutiqueManagerPhone = (storeSettings.whatsappBoutiqueManager && !storeSettings.whatsappBoutiqueManager.includes('123456') && storeSettings.whatsappBoutiqueManager.trim() !== '') ? storeSettings.whatsappBoutiqueManager.trim() : null;

  const isBoutiqueProduct = (product.category && String(product.category).startsWith('boutique__')) ||
                            (product.badge && String(product.badge).includes('Boutique'));

  for (let cIdx = 0; cIdx < product.colorVariants.length; cIdx++) {
    const variant = product.colorVariants[cIdx];
    if (!variant || !variant.stock) continue;

    const isBoutiqueVariant = isBoutiqueProduct ||
                              String(variant.name || variant.color || '').toLowerCase().includes('Ø­Ø§Ù†ÙŠØª') || 
                              String(variant.name || variant.color || '').toLowerCase().includes('boutique') ||
                              String(variant.name || variant.color || '').toLowerCase().includes('Ù…Ø­Ù„');
    
    // Website orders strictly target whatsappLivraisonManager (0771335039)
    const targetPhone = (isBoutiqueVariant && boutiqueManagerPhone) ? boutiqueManagerPhone : livraisonManagerPhone;
    const locationLabel = (isBoutiqueVariant && boutiqueManagerPhone) ? "Ø³Ø·ÙˆÙƒ Ø§Ù„Ù…Ø­Ù„ (Boutique)" : "Ø³Ø·ÙˆÙƒ Ø§Ù„ØªÙˆØµÙŠÙ„ (Livraison)";

    // Skip if no manager phone is registered for this specific stock type
    if (!targetPhone) continue;

    for (const [size, qty] of Object.entries(variant.stock)) {
      const numQty = parseInt(qty);
      const alertKey = `${product.id}_${cIdx}_${size}`;
      const now = Date.now();

      if (!isNaN(numQty) && numQty > 5) {
        // Stock is healthy again -> Clear lock state
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
        } catch (e) {}
        continue;
      }

      if (!isNaN(numQty) && numQty <= 5 && numQty >= 0) {
        let lastAlertState = null;
        try {
          const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}&select=value`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          const rows = await stateRes.json();
          if (Array.isArray(rows) && rows[0]?.value) {
            lastAlertState = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
          }
        } catch (e) {}

        // Send alert ONLY ONCE when entering <= 5 zone, or ONCE when hitting 0
        let shouldSendAlert = false;
        if (numQty === 0) {
          if (!lastAlertState || lastAlertState.alertType !== 'zero') {
            shouldSendAlert = true;
          }
        } else { // 1 <= numQty <= 5
          if (!lastAlertState || (lastAlertState.alertType !== 'low' && lastAlertState.alertType !== 'zero')) {
            shouldSendAlert = true;
          }
        }

        if (shouldSendAlert) {
          const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const alertMsg = numQty === 0 
            ? `ðŸ›‘ *ØªÙ†Ø¨ÙŠÙ‡ Ù†ÙØ§Ø¯ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ (${locationLabel})* ðŸ›‘\n\nâ€¢ Ø§Ù„Ù…Ù†ØªØ¬: ${product.title}\nâ€¢ Ø§Ù„Ù„ÙˆÙ†: ${variant.name || variant.color || 'Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ'}\nâ€¢ Ø§Ù„Ù…Ù‚Ø§Ø³: ${size}\nâ€¢ Ø­Ø§Ù„Ø© Ø§Ù„Ø³ØªÙˆÙƒ: Ù†Ø§ÙØ° ØªÙ…Ø§Ù…Ø§Ù‹ (0 Ø­Ø¨Ø© Ù…ØªØ¨Ù‚ÙŠØ©).\n\nðŸ•’ Ø§Ù„ØªÙˆÙ‚ÙŠØª: ${timeStr}\nðŸ‘‰ ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø±Ø¯ Ø¹Ù„Ù‰ Ù‡Ø°Ù‡ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ù†Ø¯ ØªØ²ÙˆÙŠØ¯ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†.`
            : `âš ï¸ *ØªÙ†Ø¨ÙŠÙ‡ Ù…Ø®Ø²ÙˆÙ† Ù…Ù†Ø®ÙØ¶ (${locationLabel})* âš ï¸\n\nâ€¢ Ø§Ù„Ù…Ù†ØªØ¬: ${product.title}\nâ€¢ Ø§Ù„Ù„ÙˆÙ†: ${variant.name || variant.color || 'Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ'}\nâ€¢ Ø§Ù„Ù…Ù‚Ø§Ø³: ${size}\nâ€¢ Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…ØªØ¨Ù‚ÙŠØ©: ${numQty} Ø­Ø¨Ø§Øª ÙÙ‚Ø·.\n\nðŸ•’ Ø§Ù„ØªÙˆÙ‚ÙŠØª: ${timeStr}\nðŸ‘‰ ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø±Ø¯ Ø¹Ù„Ù‰ Ù‡Ø°Ù‡ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ù†Ø¯ ØªØ²ÙˆÙŠØ¯ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†.`;
          
          const alertRes = await sendWhatsAppMessage(targetPhone, alertMsg);
          if (alertRes && Array.isArray(alertRes.messages) && alertRes.messages[0]) {
            await saveStockAlertRecord(alertRes.messages[0].id, targetPhone, product.id, cIdx, size);

            const alertStateVal = JSON.stringify({ 
              qty: numQty, 
              timestamp: now, 
              alertType: numQty === 0 ? 'zero' : 'low',
              isResolved: false 
            });

            await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}`, {
              method: 'PATCH',
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ value: alertStateVal })
            });

            await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
              method: 'POST',
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify({ key: `alert_state_${alertKey}`, value: alertStateVal })
            });
          }
        }
      }
    }
  }
}

function parseOrderDetails(text) {
  if (!text) return { name: '', phone: '', wilaya: '', commune: '', deliveryCompany: '', deliveryMode: '' };
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let name = '';
  let phone = '';
  let wilaya = '';
  let commune = '';
  let deliveryCompany = 'Livraison Domicile';
  let deliveryMode = 'home';

  const phoneMatch = text.match(/(0[567]\d{8})/);
  if (phoneMatch) phone = phoneMatch[1];

  for (const line of lines) {
    const lNorm = normalizeText(line);
    const lLower = line.toLowerCase();

    if (['yalidine', 'Ù…ÙƒØªØ¨', 'maktab', 'stop desk', 'stopdesk', 'agence'].some(k => lLower.includes(k) || lNorm.includes(k))) {
      deliveryCompany = 'Yalidine Stop Desk';
      deliveryMode = 'desk';
    } else if (['domicile', 'Ù…Ù†Ø²Ù„', 'Ø¯Ø§Ø±', 'Ø¯Ø§Ø±Ù†Ø§', 'home'].some(k => lLower.includes(k) || lNorm.includes(k))) {
      deliveryCompany = 'Livraison Domicile';
      deliveryMode = 'home';
    }

    if (['chlef', 'Ø§Ù„Ø´Ù„Ù', 'alger', 'Ø§Ù„Ø¬Ø²Ø§Ø¦Ø±', 'oran', 'ÙˆÙ‡Ø±Ø§Ù†', 'blida', 'Ø§Ù„Ø¨Ù„ÙŠØ¯Ø©', 'setif', 'Ø³Ø·ÙŠÙ', 'annaba', 'Ø¹Ù†Ø§Ø¨Ø©', 'constantine', 'Ù‚Ø³Ù†Ø·ÙŠÙ†Ø©', 'tlemcen', 'ØªÙ„Ù…Ø³Ø§Ù†', 'batna', 'Ø¨Ø§ØªÙ†Ø©', 'bjaya', 'bejaia', 'Ø¨Ø¬Ø§ÙŠØ©', 'biskra', 'Ø¨Ø³ÙƒØ±Ø©', 'tizi', 'ØªÙŠØ²ÙŠ', 'mostaganem', 'Ù…Ø³ØªØºØ§Ù†Ù…', 'tiaret', 'ØªÙŠØ§Ø±Øª', 'djelfa', 'Ø§Ù„Ø¬Ù„ÙØ©', 'skikda', 'Ø³ÙƒÙŠÙƒØ¯Ø©', 'medea', 'Ø§Ù„Ù…Ø¯ÙŠØ©', 'mascara', 'Ù…Ø¹Ø³ÙƒØ±', 'ouargla', 'ÙˆØ±Ù‚Ù„Ø©', 'bba', 'Ø¨Ø±Ø¬', 'boumerdes', 'Ø¨ÙˆÙ…Ø±Ø¯Ø§Ø³', 'el oued', 'Ø§Ù„ÙˆØ§Ø¯ÙŠ', 'khenchela', 'Ø®Ù†Ø´Ù„Ø©', 'souk ahras', 'Ø³ÙˆÙ‚ Ø§Ù‡Ø±Ø§Ø³', 'tipaza', 'ØªÙŠØ¨Ø§Ø²Ø©', 'milla', 'Ù…ÙŠÙ„Ø©', 'ain temouchent', 'Ø¹ÙŠÙ† ØªÙ…ÙˆØ´Ù†Øª', 'ghardaia', 'ØºØ±Ø¯Ø§ÙŠØ©', 'relizane', 'ØºÙ„ÙŠØ²Ø§Ù†'].some(k => lLower.includes(k) || lNorm.includes(k))) {
      const parts = line.split(/[-,\/\s]+/);
      wilaya = parts[0] ? parts[0].trim() : 'Ø§Ù„Ø´Ù„Ù';
      commune = parts[1] ? parts[1].trim() : (parts[0] || 'Ø§Ù„Ù…Ø±ÙƒØ²');
    }

    if (!name && /[a-zA-ZØ£-ÙŠ]/.test(line) && !line.match(/0[567]\d{8}/) && !['yalidine', 'livraison', 'Ù…ÙƒØªØ¨', 'Ù…Ù†Ø²Ù„', 'stop desk', 'llmaktab'].some(k => lLower.includes(k))) {
      if (!['chlef', 'alger', 'oran', 'blida', 'setif', 'Ø§Ù„Ø´Ù„Ù', 'Ø§Ù„Ø¬Ø²Ø§Ø¦Ø±'].some(k => lLower.includes(k))) {
        name = line.trim();
      }
    }
  }

  return { name, phone, wilaya, commune, deliveryCompany, deliveryMode };
}

async function deductStockForOrder(productTitle, color, size, qty = 1, products = []) {
  try {
    if (!products || products.length === 0) return false;
    const titleNorm = normalizeText(productTitle || '').toLowerCase();
    const matchedProd = products.find(p => {
      const pNorm = normalizeText(p.title || '').toLowerCase();
      return pNorm && titleNorm.includes(pNorm);
    }) || products[0];

    if (!matchedProd || !Array.isArray(matchedProd.colorVariants) || matchedProd.colorVariants.length === 0) {
      return false;
    }

    const updatedVariants = [...matchedProd.colorVariants];
    let vIdx = updatedVariants.findIndex(v => {
      const vName = normalizeText(v.name || v.color || '').toLowerCase();
      const targetColor = normalizeText(color || '').toLowerCase();
      return targetColor && (vName.includes(targetColor) || targetColor.includes(vName));
    });

    if (vIdx === -1) vIdx = 0;

    const targetVariant = updatedVariants[vIdx];
    if (targetVariant && targetVariant.stock) {
      const stockKeys = Object.keys(targetVariant.stock);
      const targetSizeKey = stockKeys.find(k => k.trim().toLowerCase() === String(size || '').trim().toLowerCase()) || stockKeys[0];

      if (targetSizeKey && targetVariant.stock[targetSizeKey] !== undefined) {
        const currentQty = Number(targetVariant.stock[targetSizeKey] || 0);
        const newQty = Math.max(0, currentQty - qty);

        updatedVariants[vIdx] = {
          ...targetVariant,
          stock: { ...targetVariant.stock, [targetSizeKey]: newQty }
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${matchedProd.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ colorVariants: updatedVariants })
        });
        console.log(`Deducted stock for ${matchedProd.title} (${targetSizeKey}): ${currentQty} -> ${newQty}, Status: ${res.status}`);
        
        // Trigger low stock alert to stock manager immediately if qty <= 5
        try {
          const updatedProdObj = { ...matchedProd, colorVariants: updatedVariants };
          const storeSettings = await getStoreSettings();
          await checkAndAlertLowStock(updatedProdObj, storeSettings);
        } catch (alertErr) {
          console.error("Error checking low stock after deduction:", alertErr);
        }

        return true;
      }
    }
  } catch (err) {
    console.error("Error deducting stock for order:", err);
  }
  return false;
}

async function processRestockConfirmationIntent(fromPhone, messageText, products) {
  try {
    if (!messageText) return false;
    const normText = normalizeText(messageText).toLowerCase().trim();
    const pLower = (messageText || '').toLowerCase().trim();

    // 1. STRICT GUARD: If message is asking for photos or asking a general question (location, price, availability, address), SKIP confirmation completely!
    const isPhotoOrQuestion = [
      'tsswiira', 'tsswira', 'tssawir', 'tsawir', 'photo', 'photos', 'ØµÙˆØ±', 'ØªØµØ§ÙˆÙŠØ±', 'ØµÙˆØ±Ø©', 'ÙˆØ±ÙŠÙ„Ù†Ø§', 'ÙˆØ±ÙŠÙ†ÙŠ',
      'Ø´Ø­Ø§Ù„', 'Ø¨ÙƒÙ…', 'prix', 'ÙˆÙ‚ØªØ§Ø´', 'ÙˆÙŠÙ†', 'Ø¹Ù†Ø¯ÙƒÙ…', 'ÙƒØ§ÙŠÙ†', 'ÙƒØ§ÙŠÙ†ÙŠÙ†', 'Ø§Ø³ØªÙØ³Ø§Ø±', 'Ø³Ø¤Ø§Ù„', 'Ø³Ø¹Ø±', 'Ø³ÙˆÙ…Ø©', 'Ù‚Ù…Ø§Ø´',
      'Ù†ÙˆØ¹ÙŠØ©', 'Ø¬ÙˆØ¯Ø©', 'Ù…ÙƒØ§Ù†', 'Ù…Ù‚Ø±', 'Ø¹Ù†ÙˆØ§Ù†', 'ÙƒÙŠÙØ§Ø´',
      'win', 'wayn', 'fayen', 'fayn', 'plassa', 'blassa', 'plasa', 'blasa', 'adresse', 'lieu', 'local', 'boutique', 'magasin',
      'Ø§ÙŠÙ†', 'Ø£ÙŠÙ†', 'ÙÙŠÙ†', 'Ø¨Ù„Ø§ØµØ©', 'Ù…Ø­Ù„', 'Ø¹Ù†ÙˆØ§Ù†ÙƒÙ…', 'Ù…Ù‚Ø±ÙƒÙ…', 'Ù…ÙƒØ§Ù†ÙƒÙ…'
    ].some(k => normText.includes(k) || pLower.includes(k));

    if (isPhotoOrQuestion) {
      return false;
    }

    const localPhone = fromPhone.replace(/^\+?213/, '0');
    const fullPhone = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;

    // Word boundary check for short words like 'wi' to avoid matching 'win'!
    const isConfirmIntent = [
      'Ù†Ø¹Ù…', 'Ù†Ø¹Ùƒ', 'Ø¥ÙŠÙ‡', 'Ø§ÙŠÙ‡', 'ØªØ£ÙƒÙŠØ¯', 'Ø£ÙƒØ¯', 'ØªØ§ÙƒÙŠØ¯', 'Ø­Ø§Ø¨ Ù†Ø´Ø±ÙŠ', 'Ù†Ø¹Ù… Ø­Ø§Ø¨', 'Ø­Ø§Ø¨ Ù†Ø¯ÙŠØ± ÙƒÙˆÙ…Ø§Ù†Ø¯', 'Ø­Ø§Ø¨ Ù†Ø·Ù„Ø¨',
      'Ø¯ÙŠÙ‡Ø§', 'Ø¨Ø¹Ø«Ù‡Ø§Ù„ÙŠ', 'Ø§Ø¨Ø¹Ø«Ù‡Ø§Ù„ÙŠ', 'yes', 'ok', 'oui', 'Ù…Ø´Ø±ÙŠ', 'Ø­Ø§Ø¨ Ù†Ø¯ÙŠÙ‡Ø§', 'Ù†Ø¯ÙŠÙ‡Ø§', 'daccord', 'd\'accord', 'ouais',
      'aked', 'akedli', 'akedha', 'akedhali', 'akidli', 'akid', 'akedna', 'confirmi', 'waye', 'wayh',
      'confirm', 'confirmer', 'akedlih', 'Ø§ÙƒØ¯Ù„ÙŠ', 'Ø£ÙƒØ¯Ù„ÙŠ', 'Ø§ÙƒØ¯Ù‡Ø§', 'Ø£ÙƒØ¯Ù‡Ø§', 'Ø«Ø¨ØªÙ‡Ø§',
      'Ø«Ø¨ØªÙ„ÙŠ', 'Ù…Ù„Ø§', 'Ù…Ø§Ù„Ø§', 'ØµØ­', 'Ø§ÙˆÙƒÙŠ', 'Ù…Ø§Ø°Ø§ Ø¨ÙŠÙƒ'
    ].some(k => normText === k || pLower === k || normText.startsWith(k + ' ') || normText.includes(k) || pLower.includes(k)) || /\bwi\b/i.test(pLower);

    // Parse any details supplied in current message
    const parsed = parseOrderDetails(messageText);
    const hasFullDetailsInMsg = Boolean(parsed.name && (parsed.wilaya || parsed.phone));

    // ONLY proceed if customer typed confirmation intent OR provided full order details in this message!
    if (!isConfirmIntent && !hasFullDetailsInMsg) {
      return false;
    }

    // Check waitlist table FIRST for waiting customer
    let waitlistEntry = null;
    try {
      const wRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?whatsapp_number=in.(${localPhone},${fromPhone},${fullPhone})&status=in.(pending,en_attente,out_of_stock)&order=created_at.desc&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const waitlistEntries = await wRes.json();
      if (Array.isArray(waitlistEntries) && waitlistEntries.length > 0) {
        waitlistEntry = waitlistEntries[0];
      }
    } catch (e) {}

    if (waitlistEntry && isConfirmIntent) {
      const entryTitle = waitlistEntry.product_title || waitlistEntry.product || 'Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨';
      const entrySize = waitlistEntry.size || '';
      const entryColor = waitlistEntry.color || '';

      // Mark waitlist entry as notified_sent so this message is sent ONCE ONLY!
      await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${waitlistEntry.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'notified_sent' })
      });

      const redirectWebsiteMsg = `Ø£Ù‡Ù„Ø§Ù‹ ÙˆØ³Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ! ðŸŒ¸\nØ¨Ø´Ø±Ù‰ Ø³Ø§Ø±Ø©! ØªÙˆÙØ± Ù‡Ø§Ø¯ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ (${entryTitle} ${entryColor ? entryColor + ' ' : ''}${entrySize ? '(' + entrySize + ')' : ''}) Ù…Ø¬Ø¯Ø¯Ø§Ù‹ ÙÙŠ Ø§Ù„Ø³ØªÙˆÙƒ!\n\nÙ„ØªØ£ÙƒÙŠØ¯ ÙˆØ§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø·Ù„Ø¨ÙŠØ© ÙÙˆØ±Ø§Ù‹ Ù‚Ø¨Ù„ Ù†ÙØ§Ø¯ Ø§Ù„ÙƒÙ…ÙŠØ©ØŒ ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø¯Ø®ÙˆÙ„ ÙˆØ§Ù„Ø·Ù„Ø¨ Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ø¨Ø± Ù…ÙˆÙ‚Ø¹Ù†Ø§ Ø§Ù„Ø±Ø³Ù…ÙŠ:\nhttps://pyjama-dz.vercel.app\n\nØªÙØ¶Ù„ Ø¨Ø§Ù„Ø¯Ø®ÙˆÙ„ ÙˆØ§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ù‚Ø§Ø³ ÙˆØ§Ù„Ù„ÙˆÙ† ÙˆØ³Ù†Ø¹Ù…Ù„ Ø¹Ù„Ù‰ Ø´Ø­Ù†Ù‡Ø§ Ù„Ùƒ ÙÙˆØ±Ø§Ù‹! âœ¨`;
      await sendWhatsAppMessage(fromPhone, redirectWebsiteMsg);
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error in processRestockConfirmationIntent:', err);
  }
  return false;
}

async function restoreStockForOrder(order, products = []) {
  try {
    if (!order || !products || products.length === 0) return false;
    
    const itemsToRestore = Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : [{
          product: order.product,
          color: order.color,
          size: order.size,
          qty: order.quantity || order.qty || 1
        }];

    for (const item of itemsToRestore) {
      const itemTitle = normalizeText(item.product || item.title || order.product || '').toLowerCase();
      const matchedProd = products.find(p => {
        const pNorm = normalizeText(p.title || '').toLowerCase();
        return pNorm && itemTitle.includes(pNorm);
      }) || products[0];

      if (!matchedProd || !Array.isArray(matchedProd.colorVariants) || matchedProd.colorVariants.length === 0) {
        continue;
      }

      const updatedVariants = [...matchedProd.colorVariants];
      let vIdx = updatedVariants.findIndex(v => {
        const vName = normalizeText(v.name || v.color || '').toLowerCase();
        const targetColor = normalizeText(item.color || order.color || '').toLowerCase();
        return targetColor && (vName.includes(targetColor) || targetColor.includes(vName));
      });

      if (vIdx === -1) vIdx = 0;

      const targetVariant = updatedVariants[vIdx];
      if (targetVariant && targetVariant.stock) {
        const itemSize = item.size || order.size || '';
        const stockKeys = Object.keys(targetVariant.stock);
        const targetSizeKey = stockKeys.find(k => k.trim().toLowerCase() === String(itemSize || '').trim().toLowerCase()) || stockKeys[0];

        if (targetSizeKey && targetVariant.stock[targetSizeKey] !== undefined) {
          const currentQty = Number(targetVariant.stock[targetSizeKey] || 0);
          const restoreQty = Number(item.qty || item.quantity || 1);
          const newQty = currentQty + restoreQty;

          updatedVariants[vIdx] = {
            ...targetVariant,
            stock: { ...targetVariant.stock, [targetSizeKey]: newQty }
          };

          const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${matchedProd.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ colorVariants: updatedVariants })
          });
          console.log(`Restored stock for ${matchedProd.title} (${targetSizeKey}): ${currentQty} -> ${newQty}, Status: ${res.status}`);
        }
      }
    }
    return true;
  } catch (err) {
    console.error("Error restoring stock for order:", err);
  }
  return false;
}

async function processOrderCancellationIntent(fromPhone, messageText) {
  try {
    if (!messageText) return false;
    const rawLower = String(messageText).toLowerCase().trim();
    const normText = normalizeText(messageText);

    const rawDigits = fromPhone.replace(/\D/g, '');
    const localPhone = rawDigits.startsWith('213') ? '0' + rawDigits.slice(3) : rawDigits;
    const fullPhone = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;
    const cleanPhoneNo0 = localPhone.replace(/^0/, '');
    const cleanPhoneKey = localPhone || rawDigits;

    // Check for active cancellation session lock in Supabase settings
    let activeState = null;
    try {
      const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}&select=value`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await stateRes.json();
      if (Array.isArray(rows) && rows[0]?.value) {
        activeState = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
        if (activeState && (Date.now() - (activeState.timestamp || 0)) > 30 * 60 * 1000) {
          activeState = null;
        }
      }
    } catch (e) {}

    // Check if customer is responding to an existing cancellation confirmation prompt
    if (activeState && activeState.orderId) {
      const isConfirmYes = [
        'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¥Ù„ØºØ§Ø¡', 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØºØ§Ø¡', 'ØªØ§ÙƒÙŠØ¯ Ø§Ù„ØºØ§Ø¡', 'ØªØ§ÙƒÙŠØ¯', 'ØªØ£ÙƒÙŠØ¯', 'Ù†Ø¹Ù…', '1', 'Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨', 'Ø§Ù„ØºÙŠÙ‡Ø§',
        'Ø§Ù†ÙˆÙ„ÙŠÙ‡Ø§', 'Ø§Ù†ÙˆÙ„ÙŠ', 'Ø£Ù„ØºÙŠÙ‡Ø§', 'Ø§Ù„ØºÙ‡Ø§', 'annuler', 'anuler', 'yes', 'oui', 'ih', 'Ø¥ÙŠÙ‡', 'Ø§ÙŠÙ‡'
      ].some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

      const isDeclineNo = [
        'Ù„Ø§', '2', 'ØªØ±Ø§Ø¬Ø¹', 'Ù„Ø§ ØªÙ„ØºÙŠ', 'Ù„Ø§ ØªÙ„ØºÙŠÙ‡Ø§', 'ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ø§Ù„Ø¥Ù„ØºØ§Ø¡', 'ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ø§Ù„ØºØ§Ø¡', 'ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ø§Ù„Ø§Ù„ØºØ§Ø¡',
        'lala', 'no', 'non', 'pas'
      ].some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

      if (isConfirmYes) {
        // Fetch order details
        const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${activeState.orderId}&select=*`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const oRows = await orderRes.json();
        if (Array.isArray(oRows) && oRows[0]) {
          const targetOrder = oRows[0];
          const previousStatus = targetOrder.status;

          await updateOrderStatusAndArchive(targetOrder.id, 'annulee');
          const products = await getAllProducts();
          await restoreStockForOrder(targetOrder, products);

          const orderNumStr = await getSequentialOrderNum(targetOrder);
          const rawName = targetOrder.clientName || '';
          const cleanName = (rawName && !rawName.includes('Ø²Ø¨ÙˆÙ† Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨') && !rawName.includes('Ø²Ø¨ÙˆÙ† Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©'))
            ? rawName.replace(/\(ÙˆØ§ØªØ³Ø§Ø¨:[^\)]+\)/g, '').trim()
            : '';
          const clientNameStr = cleanName ? ` ${cleanName}` : '';

          // Delete session state
          await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          }).catch(() => {});

          const confirmMsg = `Ø£Ù‡Ù„Ø§Ù‹ ÙˆØ³Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ${clientNameStr}.\n\nâœ… *ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø·Ù„Ø¨Ùƒ Ø±Ù‚Ù… #${orderNumStr} Ø¨Ù†Ø¬Ø§Ø­ ÙˆØ¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø®Ø²Ù†.*\nÙ†ØªÙ…Ù†Ù‰ Ø£Ù† Ù†Ø®Ø¯Ù…Ùƒ Ù…Ø¬Ø¯Ø¯Ø§Ù‹ ÙÙŠ Ø§Ù„Ù…Ø±Ø§Øª Ø§Ù„Ù‚Ø§Ø¯Ù…Ø© Ø¥Ù† Ø´Ø§Ø¡ Ø§Ù„Ù„Ù‡! ðŸŒ¸`;
          await sendWhatsAppMessage(fromPhone, confirmMsg);

          // IF THE ORDER WAS CONFIRMED PRIOR TO CANCELLATION -> Notify Packaging Manager immediately!
          if (previousStatus === 'confirmee' || previousStatus === 'confirme') {
            try {
              const storeSettings = await getStoreSettings();
              const emballagePhone = storeSettings.whatsappEmballageManager || storeSettings.whatsappLivraisonManager || storeSettings.whatsapp || '0771335039';

              const managerAlertMsg = `Ù…ØªØ¬Ø± Pyjama DZ - ØªÙ†Ø¨ÙŠÙ‡ Ø¹Ø§Ø¬Ù„ Ù„Ù„ØªØºÙ„ÙŠÙ âš ï¸\nØ§Ù„Ø·Ù„Ø¨ÙŠØ© Ø±Ù‚Ù…: #${orderNumStr}${cleanName ? ' (Ø¨Ø§Ø³Ù… ' + cleanName + ')' : ''}\nØªÙ… Ø¥Ù„ØºØ§Ø¤Ù‡Ø§ Ù…Ù† Ø§Ù„Ø²Ø¨ÙˆÙ† Ù„Ù„ØªÙˆ Ø¨Ø¹Ø¯ Ø£Ù† ÙƒØ§Ù†Øª Ù…Ø¤ÙƒØ¯Ø©!\n\nðŸš¨ ÙŠØ±Ø¬Ù‰ Ø¹Ø¯Ù… Ø¥Ø±Ø³Ø§Ù„Ù‡Ø§ Ø£Ùˆ ØªØ¬Ù‡ÙŠØ² Ø´Ø­Ù†ØªÙ‡Ø§`;

              await sendWhatsAppMessage(emballagePhone, managerAlertMsg);
            } catch (e) {
              console.error('Error sending packaging manager alert for cancelled confirmed order:', e);
            }
          }

          return true;
        }
      } else if (isDeclineNo) {
        // Delete session state and cancel cancellation action
        await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        }).catch(() => {});

                    await sendWhatsAppMessage(fromPhone, `أهلاً بك! 🌸\nتم إغلاق طلب الإلغاء وتبقى طلبيتك قائمة ومؤكدة بنجاح.`);
        return true;
      }
    }

    // Check if customer initiates a NEW cancellation request
    const isCancelRequest = [
      'Ø¥Ù„ØºØ§Ø¡', 'Ø§Ù„ØºØ§Ø¡', 'Ø£Ù„ØºÙŠ', 'Ø§Ù„ØºÙŠ', 'Ø¥Ù„ØºÙŠ', 'Ø§Ù†ÙˆÙ„ÙŠ', 'Ø£Ù†ÙˆÙ„ÙŠ', 'Ù†Ù„ØºÙŠ', 'Ø­Ø¨ÙŠØª Ù†Ù„ØºÙŠ', 'Ø­Ø§Ø¨ Ù†Ù„ØºÙŠ', 'Ø­Ø§Ø¨Ø© Ù†Ù„ØºÙŠ',
      'Ø§Ù†ÙˆÙ„ÙŠ Ø§Ù„Ø·Ù„Ø¨', 'Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨', 'Ø§Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨', 'Ø£Ù„ØºÙŠ Ø§Ù„Ø·Ù„Ø¨', 'Ø§Ù„ØºÙŠ Ø§Ù„Ø·Ù„Ø¨', 'Ù†Ù„ØºÙŠ Ø§Ù„Ø·Ù„Ø¨', 'Ø§Ù†ÙˆÙ„ÙŠ Ù„Ø§ÙƒÙˆÙ…Ù†Ø¯', 'Ø§Ù†ÙˆÙ„ÙŠ Ù„Ø§ ÙƒÙˆÙ…Ù†Ø¯',
      'nanuli', 'anuli', 'nanulii', 'anulii', 'nanoli', 'anoli', 'nanolii', 'anoli', 'noli', 'nanuli la commande', 'anuli la commande',
      'annuler', 'anuler', 'annule', 'anule', 'canceller', 'cancel', 'annulez', 'annulation', 'annuler commande', 'anuler commande',
      'nanuli la commande taa3i', 'anuler la commande', 'slm anuler la commande', 'slm ni haab nanuli'
    ].some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

    if (!isCancelRequest) return false;

    // Fetch STRICTLY the LATEST active order
    const orderCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone},${cleanPhoneNo0},213${cleanPhoneNo0})&status=in.(nouvelle,confirmee,pending,attente,attente_confirmation,nouveau)&order=created_at.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    const activeOrders = await orderCheckRes.json();
    if (!Array.isArray(activeOrders) || activeOrders.length === 0) {
      return false;
    }

    const latestOrder = activeOrders[0];
    const orderNumStr = await getSequentialOrderNum(latestOrder);
    const rawName = latestOrder.clientName || '';
    const cleanName = (rawName && !rawName.includes('Ø²Ø¨ÙˆÙ† Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨') && !rawName.includes('Ø²Ø¨ÙˆÙ† Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©'))
      ? rawName.replace(/\(ÙˆØ§ØªØ³Ø§Ø¨:[^\)]+\)/g, '').trim()
      : '';
    const clientNameStr = cleanName ? ` ${cleanName}` : '';
    const cleanProd = (latestOrder.product || '').replace(/\(ÙˆØ§ØªØ³Ø§Ø¨:[^\)]+\)/g, '').trim();

    // Save cancellation session state
    await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: `cancel_state_${cleanPhoneKey}`,
        value: JSON.stringify({ orderId: latestOrder.id, orderIndex: 0, timestamp: Date.now() })
      })
    });

    const promptMsg = `*Ù…ØªØ¬Ø± Pyjama DZ*\n\nØ£Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ${clientNameStr}.\nØªÙ„Ù‚ÙŠÙ†Ø§ Ø·Ù„Ø¨Ùƒ Ù„Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨ÙŠØ©:\n\nâ€¢ Ø£Ø­Ø¯Ø« Ø·Ù„Ø¨ÙŠØ© Ù…Ø³Ø¬Ù„Ø© Ø¨Ø§Ø³Ù…Ùƒ Ù‡ÙŠ Ø±Ù‚Ù…: #${orderNumStr}\nâ€¢ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª: ${cleanProd}\nâ€¢ Ø§Ù„ÙˆÙ„Ø§ÙŠØ©: ${latestOrder.wilaya || ''}\n\nÙ‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ø£Ù†Ùƒ ØªØ±ÙŠØ¯ Ø¥Ù„ØºØ§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ø·Ù„Ø¨ÙŠØ©ØŸ\n\nðŸ‘‰ Ø±Ø¯ Ø¨Ù€ *ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¥Ù„ØºØ§Ø¡* (Ø£Ùˆ *Ù†Ø¹Ù…*) Ù„Ø¥Ù„ØºØ§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ø·Ù„Ø¨ÙŠØ©.`;

    await sendWhatsAppMessage(fromPhone, promptMsg);
    return true;
  } catch (err) {
    console.error('Error processing order cancellation intent:', err);
  }
  return false;
}

async function processOrderConfirmationIntent(fromPhone, messageText) {
  try {
    if (!messageText) return false;
    const rawLower = String(messageText).toLowerCase().trim();
    const normText = normalizeText(messageText);

    // Skip immediately if customer is asking a question or saying no!
    if (['anuler', 'annuler', 'anule', 'annule', 'الغي', 'ألفي', 'إلغاء', 'الغال', 'lala', 'لا اريد', 'لاريد'].some(k => rawLower.includes(k) || normText.includes(k))) {
      return false;
    }

    const confirmKeywords = [
      'أكد', 'أكدلي', 'تأكيد', 'نؤكد', 'أكدها', 'نعم أكد', 'نعم أكدلي', 'مالا أكدلي', 'ملا أكدلي',
      'أكد الطلبية', 'تأكيد الطلبية', 'تأكيد الطلب', 'أكدلي الطلبية', 'أكدلي طلبية', 'أكدلي الطلب',
      'akedha', 'akedhaa', 'aked', 'akedli', 'akedlii', 'confirme', 'confirmer', 'confirmation',
      'oui confirme', 'oui akedli', 'oui aked', 'daccord confirme', 'oui akedha',
      'ih akedha', 'ih aked', 'ih', 'إيه', 'ايه', 'نعم', 'نعام', 'صح', 'اوكي', 'ok', 'yes', 'oui', 'ثبتها', 'ثبتلي'
    ];

    const isConfirm = confirmKeywords.some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

    if (!isConfirm) return false;

    const rawDigits = fromPhone.replace(/\D/g, '');
    const localPhone = rawDigits.startsWith('213') ? '0' + rawDigits.slice(3) : rawDigits;
    const fullPhone = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;
    const cleanPhoneNo0 = localPhone.replace(/^0/, '');

    const orderCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone},${cleanPhoneNo0},213${cleanPhoneNo0})&status=in.(nouvelle,pending,attente,attente_confirmation,nouveau)&order=created_at.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    let pendingOrders = await orderCheckRes.json();
    if (!Array.isArray(pendingOrders) || pendingOrders.length === 0) {
      // Fallback: If phone didn't match directly (e.g. Meta Test Number), fetch latest overall unconfirmed order
      const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?status=in.(nouvelle,pending,attente,attente_confirmation,nouveau)&order=created_at.desc&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      pendingOrders = await fallbackRes.json();
    }
    if (!Array.isArray(pendingOrders) || pendingOrders.length === 0) {
      return false; // No pending order to confirm
    }

    const orderToConfirm = pendingOrders[0];
    await updateOrderStatusAndArchive(orderToConfirm.id, 'confirmee');

    const orderNumStr = await getSequentialOrderNum(orderToConfirm);
    const rawName = orderToConfirm.clientName || '';
    const cleanName = (rawName && !rawName.includes('زبون الواتساب') && !rawName.includes('زبون المحادثة'))
      ? rawName.replace(/\(واتساب:[^\)]+\)/g, '').trim()
      : '';
    const clientNameStr = cleanName ? ` ${cleanName}` : '';

    const confirmMsg = `أهلاً وسهلاً بك${clientNameStr}! 🌸\nتم تأكيد طلبيتك رقم #${orderNumStr} بنجاح. 📦✨\nطلبيتك الآن مؤكدة وجاري تجهيزها للشحن والتوصيل. شكراً لثقتك بمتجرنا! ❤️`;

    await sendWhatsAppMessage(fromPhone, confirmMsg);
    return true;
  } catch (err) {
    console.error('Error processing order confirmation intent:', err);
  }
  return false;
}

async function processIncomingPayload(body) {
  try {
    const entries = body?.entry || (Array.isArray(body) ? body : [body]);
    for (const entry of entries) {
      // WhatsApp Messages (entry.changes)
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value || change;
        const messages = value?.messages || [];
        for (const message of messages) {
          try {
            const fromPhone = message.from;
            const messageType = message.type;
            let messageText = message.text?.body;

            if (!messageText && message.type === 'interactive') {
              messageText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || message.interactive?.button_reply?.id;
            }
            if (!messageText && message.type === 'button') {
              messageText = message.button?.text || message.button?.payload;
            }

            if (fromPhone) {
              const cleanPhone = fromPhone.replace(/^\+?213/, '0');
              const order = await getLatestOrderForPhone(cleanPhone);
              const products = await getAllProducts();
              const storeSettings = await getStoreSettings();

              const phoneSources = storeSettings.phoneOrders 
                ? [storeSettings.phoneOrders, storeSettings.whatsapp]
                : [storeSettings.phones, storeSettings.whatsapp];

              const phonesArr = extractCleanPhonesList(...phoneSources);

              const formattedPhonesBullets = phonesArr.length > 0
                ? phonesArr.map(p => `- ${p}`).join('\n')
                : '- 0554128933';

              const storeAddressDisplay = storeSettings.address || "ÙˆÙ„Ø§ÙŠØ© Ø§Ù„Ø´Ù„Ù (Chlef)";
              const storeMapsUrl = storeSettings.googleMapsUrl || storeSettings.googleMaps || "https://maps.app.goo.gl/algeria-pyjama-dz";
              const storeInstaUrl = storeSettings.instagramUrl || storeSettings.instagram || "https://www.instagram.com/pyjama_dz";
              const storeName = storeSettings.storeName || "Pyjama DZ";

              // ðŸŽ™ï¸ VOICE NOTE / AUDIO HANDLER
              if (messageType === 'audio' || messageType === 'voice') {
                const audioId = message.audio?.id || message.voice?.id;
                console.log(`Received Audio Note / Vocal (${audioId}) from ${fromPhone}`);
                
                if (audioId) {
                  const media = await downloadMetaMedia(audioId);
                  if (media && media.base64) {
                    let audioPrompt = `Ø£Ù†Øª Ø£Ø¯Ø§Ø© ØªÙØ±ÙŠØº ØµÙˆØªÙŠ. ÙØ±Øº Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…Ø³Ù…ÙˆØ¹Ø© Ø¨Ø§Ù„Ø¯Ø§Ø±Ø¬Ø© Ø§Ù„Ø¬Ø²Ø§Ø¦Ø±ÙŠØ© Ø¨Ø¯ÙˆÙ† Ø§Ø®ØªØ±Ø§Ø¹ ÙˆØ¨Ø¯ÙˆÙ† Ø¥ÙŠÙ…ÙˆØ¬ÙŠ.`;
                    const systemInstruction = "Ø£Ù†Øª Ø£Ø¯Ø§Ø© ØªÙØ±ÙŠØº ØµÙˆØªÙŠ Ø¨Ø§Ù„Ø¯Ø§Ø±Ø¬Ø© Ø§Ù„Ø¬Ø²Ø§Ø¦Ø±ÙŠØ©. Ø£Ø®Ø±Ø¬ Ø§Ù„Ù†Øµ Ø§Ù„Ù…Ø³Ù…ÙˆØ¹ ÙÙ‚Ø· ÙˆØ¨Ø¯ÙˆÙ† Ø¥ÙŠÙ…ÙˆØ¬ÙŠ ÙƒÙ„ÙŠØ§Ù‹.";
                    
                    let transcript = await generateGeminiAudio(media.base64, media.mimeType, audioPrompt, systemInstruction);
                    if (transcript) {
                      console.log(`Vocal Transcription for ${fromPhone}: ${transcript}`);
                      if (!transcript.includes("ØºÙŠØ±_Ù…ÙÙ‡ÙˆÙ…") && !transcript.includes("ØºÙŠØ± Ù…ÙÙ‡ÙˆÙ…")) {
                        messageText = transcript;
                      }
                    }
                  }
                }

                if (!messageText) {
                  messageText = "Ù…Ø±Ø­Ø¨Ø§Ù‹ØŒ Ø£Ø±Ø³Ù„Øª Ø±Ø³Ø§Ù„Ø© ØµÙˆØªÙŠØ© ÙˆØ§Ø³ØªÙØ³Ø§Ø±Ø§Ù‹ Ø¹Ù† Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„Ø·Ù„Ø¨ÙŠØ§Øª ÙˆØ§Ù„Ø£Ø³Ø¹Ø§Ø±.";
                }
              }

              if (!messageText) continue;
              console.log(`Received message from ${fromPhone}: ${messageText}`);

              // A. WORKER STOCK RESTOCK via DIRECT REPLY ONLY
              let refMatch = messageText.match(/\[REF:([^:]+):([^:]+):([^:]+)\]/);
              let alertContextId = message.context?.id || null;

              if (!refMatch && alertContextId) {
                const alertObj = await getStockAlertByMsgId(alertContextId);
                if (alertObj && alertObj.productId && alertObj.size) {
                  refMatch = [null, alertObj.productId, String(alertObj.colorIdx || 0), alertObj.size];
                }
              }

              if (refMatch) {
                const productId = refMatch[1];
                const colorIdx = parseInt(refMatch[2]);
                const size = refMatch[3];
                const alertKey = `${productId}_${colorIdx}_${size}`;

                // Fetch current product stock and check if this item was ALREADY restocked
                const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
                  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const prods = await prodRes.json();
                const product = Array.isArray(prods) ? prods[0] : null;

                let isAlreadyResolved = false;
                let currentQty = 0;
                if (product && Array.isArray(product.colorVariants) && product.colorVariants[colorIdx]) {
                  currentQty = product.colorVariants[colorIdx].stock?.[size] || 0;
                }

                // 1. Check message-level resolution to PREVENT DOUBLE RESTOCK
                if (alertContextId) {
                  try {
                    const msgRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_resolved_${alertContextId}&select=value`, {
                      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                    });
                    const msgRows = await msgRes.json();
                    if (Array.isArray(msgRows) && msgRows[0]?.value) {
                      isAlreadyResolved = true;
                    }
                  } catch (e) {}
                }

                if (isAlreadyResolved) {
                  const prodTitle = product ? product.title : 'المنتج';
                  await sendWhatsAppMessage(fromPhone, `*متجر Pyjama DZ*\n\nℹ️ *صايي، تم إعادة تزويد هذا التنبيه المحدد سابقاً!*\n• المنتج: ${prodTitle}\n• المقاس: ${size}\n• المخزون الحالي بالمحل/التوصيل: *${currentQty} حبة*.\n\nلم يتم تكرار الإضافة لتفادي دبلجة الكميات بالخطأ. 🌸`);
                  continue;
                }

                let addedQty = 0;
                const textWithoutTag = messageText.replace(/\[REF:[^\]]+\]/gi, '').trim();
                const qtyMatch = textWithoutTag.match(/^(\+)?(\d{1,4})$/);
                if (qtyMatch) {
                  addedQty = parseInt(qtyMatch[2]);
                }

                if (!isNaN(addedQty) && addedQty > 0) {
                  if (product && Array.isArray(product.colorVariants) && product.colorVariants[colorIdx]) {
                    const updatedVariants = [...product.colorVariants];
                    const newQty = currentQty + addedQty;

                    updatedVariants[colorIdx] = {
                      ...updatedVariants[colorIdx],
                      stock: { ...(updatedVariants[colorIdx].stock || {}), [size]: newQty }
                    };

                    // Mark THIS SPECIFIC WHATSAPP ALERT MESSAGE as RESOLVED
                    if (alertContextId) {
                      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                        method: 'POST',
                        headers: {
                          'apikey': SUPABASE_KEY,
                          'Authorization': `Bearer ${SUPABASE_KEY}`,
                          'Content-Type': 'application/json',
                          'Prefer': 'resolution=merge-duplicates'
                        },
                        body: JSON.stringify({
                          key: `alert_resolved_${alertContextId}`,
                          value: JSON.stringify({ resolvedAt: Date.now(), addedQty, newQty })
                        })
                      });
                    }

                    // Clear alert_state lock key because stock is now replenished (> 5 or updated)
                    await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}`, {
                      method: 'DELETE',
                      headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                      }
                    });

                    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
                      method: 'PATCH',
                      headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                      },
                      body: JSON.stringify({ colorVariants: updatedVariants })
                    });

                    // Attempt to auto-delete previous active alert messages for this item from WhatsApp chat
                    try {
                      const activeRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.active_msgs_${alertKey}&select=value`, {
                        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                      });
                      const activeRows = await activeRes.json();
                      if (Array.isArray(activeRows) && activeRows[0]?.value) {
                        const msgIds = JSON.parse(activeRows[0].value);
                        if (Array.isArray(msgIds)) {
                          for (const mId of msgIds) {
                            await deleteWhatsAppMessage(mId);
                          }
                        }
                      }
                      await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.active_msgs_${alertKey}`, {
                        method: 'DELETE',
                        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                      });
                    } catch (e) {}
                    
                    await sendWhatsAppMessage(fromPhone, `*متجر Pyjama DZ*\n\n✅ *تم تحديث المخزون بنجاح!*\n• المنتج: ${product.title}\n• اللون: ${updatedVariants[colorIdx].name || updatedVariants[colorIdx].color || 'الافتراضي'}\n• المقاس: ${size}\n• الكمية المضافة: +${addedQty}\n• المخزون الحالي الجديد: ${newQty} حبة.`);

                    // Notify waiting customers about restock via single source endpoint
                    try {
                      await fetch('https://pyjama-dz.vercel.app/api/notify-restock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          productId: product.id,
                          productTitle: product.title,
                          size: size,
                          color: updatedVariants[colorIdx]?.name || updatedVariants[colorIdx]?.color || '',
                          newQty: newQty
                        })
                      });
                    } catch (e) {}
                    continue;
                  }
                }
              }

              // 2. RECLAMATION HANDLER (Only for explicit complaints/reclamations)
              const complaintKeywords = [
                'Ø´ÙƒÙˆÙ‰', 'Ø¹ØªØ§Ø¨', 'Ù†Ø§Ù‚Øµ', 'Ù…ÙƒØ³ÙˆØ±', 'Ø±Ø§Ø¯ÙŠ', 'Ù…Ø§ ÙˆØµÙ„Ù†ÙŠØ´', 'Ø®Ø§Ø³Ø±', 'ØªØ£Ø®Ø±Øª', 'Ù…ØºØ´ÙˆØ´',
                'Ù…Ù‚Ø·ÙˆØ¹', 'ÙØ³Ø¯', 'ÙˆØµÙ„Øª Ù†Ø§Ù‚ØµØ©', 'ÙˆØµÙ„Øª Ø®Ø§Ø³Ø±Ø©', 'Ø³Ù„Ø¹Ø© Ø®Ø§Ø³Ø±Ø©', 'Ø®Ø¯Ù…Ø© Ø³ÙŠØ¦Ø©',
                'reclamation', 'rÃ©clamation', 'Ù…ØºØ´ÙˆØ´Ø©', 'Ø²Ø¨Ù„', 'probleme', 'problÃ¨me', 'cassÃ©', 'casse',
                'retard', 'retarde', 'degueulasse', 'nul', 'nulle', 'zbel', 'khaser', 'khasra'
              ];

              const isCancelIntentWord = [
                'anuler', 'annuler', 'anule', 'annule', 'nanuli', 'anuli', 'nanulii', 'anulii', 'nanoli', 'anoli',
                'Ø§Ù„ØºÙŠ', 'Ø£Ù„ØºÙŠ', 'Ø¥Ù„ØºØ§Ø¡', 'Ø§Ù„ØºØ§Ø¡', 'Ù†Ù„ØºÙŠ', 'Ø§Ù†ÙˆÙ„ÙŠ', 'Ø£Ù†ÙˆÙ„ÙŠ'
              ].some(k => rawLowerText.includes(k) || normText.includes(k));

              const isComplaint = !isCancelIntentWord && complaintKeywords.some(k => normText.includes(k) || rawLowerText.includes(k));

              if (isComplaint) {
                const rawContactName = order?.clientName || value?.contacts?.[0]?.profile?.name || '';
                const greetingName = (rawContactName && rawContactName.trim() !== '' && rawContactName !== 'Ø²Ø¨ÙˆÙ† Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©' && rawContactName !== 'Ø²Ø¨ÙˆÙ† Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨')
                  ? ` ${rawContactName.trim()}`
                  : '';

                const complaintMsg = `Ø£Ù‡Ù„Ø§Ù‹ ÙˆØ³Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ${greetingName}.\nØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø´ÙƒÙˆØ§Ùƒ ÙˆÙ…Ù„Ø§Ø­Ø¸ØªÙƒ Ø¨Ù†Ø¬Ø§Ø­ Ù„Ø¯Ù‰ ÙØ±ÙŠÙ‚ Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ ÙˆØ³ÙŠØªÙ… Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹Ùƒ ÙˆÙ…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ù…Ø± ÙÙˆØ±Ø§Ù‹. Ø´ÙƒØ±Ø§Ù‹ Ù„ØµØ¨Ø±Ùƒ Ù…Ø¹Ù†Ø§. ðŸŒ¸`;
                await sendWhatsAppMessage(fromPhone, complaintMsg);

                // Save reclamation to Supabase settings table
                try {
                  const existingRecl = Array.isArray(storeSettings.reclamations) ? storeSettings.reclamations : [];
                  const newRecl = {
                    id: 'REC-WA-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    clientName: rawContactName || 'Ø²Ø¨ÙˆÙ† Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨',
                    whatsappNumber: fromPhone,
                    message: messageText.trim(),
                    status: 'nouvelle',
                    createdAt: new Date().toISOString()
                  };
                  await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.reclamations`, {
                    method: 'PATCH',
                    headers: {
                      'apikey': SUPABASE_KEY,
                      'Authorization': `Bearer ${SUPABASE_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ value: JSON.stringify([newRecl, ...existingRecl]) })
                  });
                } catch (e) {
                  console.error("Error saving WhatsApp reclamation to Supabase:", e);
                }
                continue;
              }

              // STRICT AI SALES INSTRUCTIONS (ZERO EMOJIS)
              const isWholesale = ["gros", "Ø¬Ù…Ù„Ø©", "Ø¨Ø§Ù„Ø¬Ù…Ù„Ø©", "ÙƒØ§Ø¨Ø©", "ØªØ¬Ø§Ø±Ø©", "Ø³ÙŠØ±ÙŠ", "serie", "Ø³ÙŠØ±ÙŠØ§Øª", "ÙƒÙ…ÙŠØ©", "ÙƒÙ…ÙŠØ§Øª", "grosiste", "grossiste", "Ø¨ÙŠØ¹ Ø¨Ø§Ù„Ø¬Ù…Ù„Ø©", "Ø´Ø±Ø§Ø¡ Ø¨Ø§Ù„Ø¬Ù…Ù„Ø©"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              let salesModeRules = isWholesale
                ? "ØªÙ†Ø¨ÙŠÙ‡ Ø­ØªÙ…ÙŠ: Ø§Ù„Ø²Ø¨ÙˆÙ† ÙŠØ³Ø£Ù„ Ø¹Ù† Ø§Ù„Ø¨ÙŠØ¹ Ø¨Ø§Ù„Ø¬Ù…Ù„Ø© (Gros). ÙŠØ¬Ø¨ Ø­ØªÙ…Ø§Ù‹ Ø¥Ø¹Ø·Ø§Ø¤Ù‡ ÙˆØªÙˆØ¬ÙŠÙ‡Ù‡ Ù„Ø±Ø§Ø¨Ø· ØµÙØ­Ø© Ø§Ù„Ø¬Ù…Ù„Ø© Ø§Ù„Ù…Ø®ØµØµ Ù„Ù„Ø´Ø±Ø§Ø¡ Ø¨Ø§Ù„Ø¬Ù…Ù„Ø© Ù…Ø¨Ø§Ø´Ø±Ø© ÙˆÙ‡Ùˆ: https://pyjama-dz.vercel.app/gros ÙˆØ¥Ø®Ø¨Ø§Ø±Ù‡ Ø¨Ø£Ù†Ù‡ Ø¥Ø°Ø§ Ø£Ø±Ø§Ø¯ Ø§Ù„Ø´Ø±Ø§Ø¡ Ø¨Ø§Ù„Ø¬Ù…Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¯Ø®Ù„ ÙˆÙŠØ·Ù„Ø¨ Ù…Ø¨Ø§Ø´Ø±Ø© Ù…Ù† Ù‡Ø°Ø§ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ù…Ø®ØµØµ Ù„Ù„Ø¬Ù…Ù„Ø©."
                : "Ø§Ù„Ø²Ø¨ÙˆÙ† Ø²Ø¨ÙˆÙ† Ø¹Ø§Ø¯ÙŠ Ø¨Ø§Ù„Ù‚Ø·Ø¹Ø©. Ø£Ø¬Ø¨ Ø¹Ù† Ø³Ø¤Ø§Ù„Ù‡ Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù… ÙÙ‚Ø·.";

              let prompt = `Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø²Ø¨ÙˆÙ†: "${messageText}"`;
              if (isWholesale) {
                prompt += `\n(ØªØ°ÙƒÙŠØ± ØµØ§Ø±Ù…: Ø§Ù„Ø²Ø¨ÙˆÙ† ÙŠØ³Ø£Ù„ Ø¹Ù† Ø§Ù„Ø¬Ù…Ù„Ø© GrosØŒ Ø£Ø¹Ø·Ù‡ Ø±Ø§Ø¨Ø· ØµÙØ­Ø© Ø§Ù„Ø¬Ù…Ù„Ø© Ø§Ù„Ù…Ø®ØµØµ Ù…Ø¨Ø§Ø´Ø±Ø©: https://pyjama-dz.vercel.app/gros ÙˆÙˆØ¬Ù‡Ù‡ Ù„Ù„Ø·Ù„Ø¨ Ù…Ù†Ù‡Ø§).`;
              }

              const localPhone = fromPhone.replace(/^\+?213/, '0');
              const fullPhone = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;
              try {
                const orderCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone})&status=in.(nouvelle,nouvel,new,pending,en_attente_confirmation,attente_confirmation,attente_confirmation_restock,en_attente_stock,pending_stock)&order=created_at.desc&limit=1`, {
                  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const existingOrders = await orderCheckRes.json();
                if (Array.isArray(existingOrders) && existingOrders.length > 0) {
                  const exOrder = existingOrders[0];
                  const exOrderNum = await getSequentialOrderNum(exOrder);
                  prompt += `\n\nÙ…Ø¹Ù„ÙˆÙ…Ø§Øª Ø·Ù„Ø¨ Ø§Ù„Ø²Ø¨ÙˆÙ† Ø§Ù„Ø­Ø§Ù„ÙŠ Ù…Ù† Ø§Ù„Ø¯Ø§ØªØ§Ø¨ÙŠØ²:\n- Ø§Ù„Ø§Ø³Ù…: ${exOrder.clientName || ''}\n- Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨: #${exOrderNum}\n- Ø§Ù„Ù…Ù†ØªØ¬: ${exOrder.product}\n- Ø§Ù„ÙˆÙ„Ø§ÙŠØ©: ${exOrder.wilaya}\n- Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©: ${exOrder.status}\nØ¥Ø°Ø§ Ø·Ù„Ø¨ Ø§Ù„Ø²Ø¨ÙˆÙ† ØªØ£ÙƒÙŠØ¯ Ù‡Ø§Ø¯ Ø§Ù„Ø·Ù„Ø¨ÙŠØ© Ø£Ùˆ Ù‚Ø§Ù„ (Ø£ÙƒØ¯Ù„ÙŠ/akedli/Ù…Ø§Ù„Ø§/Ù…Ù„Ø§)ØŒ Ø£Ø¬Ø¨ Ø¨Ø£Ù† Ø§Ù„Ø·Ù„Ø¨ÙŠØ© Ø±Ù‚Ù… #${exOrderNum} Ù…Ø³Ø¬Ù„Ø© ÙˆÙ…Ø¤ÙƒØ¯Ø© ÙˆØ¬Ø§Ø±ÙŠ Ø´Ø­Ù†Ù‡Ø§ØŒ ÙˆÙ„Ø§ ØªØ·Ù„Ø¨ Ù…Ù†Ù‡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† Ø¬Ø¯ÙŠØ¯ Ø¥Ø·Ù„Ø§Ù‚Ø§Ù‹.`;
                }
              } catch (e) {
                console.error("Error fetching order context for AI:", e);
              }

              const catalogSummary = products.map(p => {
                let colorsStr = "Ù…ØªÙˆÙØ±";
                if (Array.isArray(p.colorVariants) && p.colorVariants.length > 0) {
                  colorsStr = p.colorVariants.map(cv => {
                    const colorName = cv.name || cv.color || 'rouge (Ø£Ø­Ù…Ø±)';
                    if (typeof cv.stock === 'object' && cv.stock !== null) {
                      const sizesStr = Object.entries(cv.stock).map(([sz, qty]) => {
                        const numQ = Number(qty || 0);
                        return `${sz}: ${numQ > 0 ? numQ + ' Ø­Ø¨Ø© (Ù…ØªÙˆÙØ±)' : '0 Ø­Ø¨Ø© (ØºÙŠØ± Ù…ØªÙˆÙØ±/Ù†Ø§ÙØ°)'}`;
                      }).join(', ');
                      return `Ø§Ù„Ù„ÙˆÙ† (${colorName}): [${sizesStr}]`;
                    } else {
                      const numQ = Number(cv.stock || 0);
                      return `Ø§Ù„Ù„ÙˆÙ† (${colorName}): ${numQ > 0 ? numQ + ' Ø­Ø¨Ø© (Ù…ØªÙˆÙØ±)' : '0 Ø­Ø¨Ø© (ØºÙŠØ± Ù…ØªÙˆÙØ±/Ù†Ø§ÙØ°)'}`;
                    }
                  }).join(' | ');
                }
                return `- ${p.title}: Ø§Ù„Ø³Ø¹Ø± ${p.price} Ø¯Ø¬ | Ø§Ù„Ø³Ø·ÙˆÙƒ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ Ø­Ø³Ø¨ Ø§Ù„Ù…Ù‚Ø§Ø³Ø§Øª ÙˆØ§Ù„Ø£Ù„ÙˆØ§Ù†: ${colorsStr}`;
              }).join('\n');
              const settingsSummary = Object.entries(storeSettings).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');

function checkStockInquiry(messageText, products) {
  if (!messageText || !Array.isArray(products) || products.length === 0) return null;
  const norm = normalizeText(messageText);
  const rawLower = String(messageText).toLowerCase();

  const sizeMatch = rawLower.match(/(?:taille|Ù…Ù‚Ø§Ø³|ØªØ±Ø§ÙŠ|ØªÙŠØ§ÙŠ|Ù…ÙƒØ§Ø³|ØªØ±Ø§Ø³)?\s*\b(3xl|xxxl|2xl|xxl|xl|l|m|s)\b/i);
  if (!sizeMatch) return null;

  let reqSize = sizeMatch[1].toUpperCase();
  if (reqSize === 'XXL') reqSize = '2XL';
  if (reqSize === 'XXXL') reqSize = '3XL';

  for (const p of products) {
    if (Array.isArray(p.colorVariants)) {
      for (const cv of p.colorVariants) {
        const colorName = String(cv.name || cv.color || '').toLowerCase();
        const normColor = normalizeText(colorName);
        if (colorName && (rawLower.includes(colorName) || norm.includes(normColor))) {
          if (typeof cv.stock === 'object' && cv.stock !== null) {
            const qty = Number(cv.stock[reqSize] || 0);
            if (qty === 0) {
              return `Ù„Ù„Ø£Ø³Ù Ø§Ù„Ù…Ù‚Ø§Ø³ (${reqSize}) ÙÙŠ Ø§Ù„Ù„ÙˆÙ† (${cv.name || cv.color}) ØºÙŠØ± Ù…ØªÙˆÙØ± Ø­Ø§Ù„ÙŠØ§Ù‹ ÙÙŠ Ø§Ù„Ø³Ø·ÙˆÙƒ.\nÙ„Ù‚Ø¯ Ù‚Ù…Ù†Ø§ Ø¨ØªØ³Ø¬ÙŠÙ„ Ø·Ù„Ø¨Ùƒ ÙˆØ³Ù†Ø­ÙŠØ·Ùƒ Ø¹Ù„Ù…Ø§Ù‹ ÙÙˆØ±Ø§Ù‹ Ø¹Ø¨Ø± Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ Ø¨Ù…Ø¬Ø±Ø¯ ØªÙˆÙØ±Ù‡ Ù…Ø¬Ø¯Ø¯Ø§Ù‹. Ø´ÙƒØ±Ø§Ù‹ Ù„Ø§Ù†ØªØ¸Ø§Ø±Ùƒ ðŸŒ¸`;
            }
          }
        }
      }
    }
  }
  return null;
}

const systemInstruction = `Ø£Ù†Øª Ù…Ø³Ø§Ø¹Ø¯ ÙˆÙ…Ø³Ø¤ÙˆÙ„ Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ø­ØªØ±Ù Ù„Ù…ØªØ¬Ø± (${storeName}).
ØªØªØ­Ø¯Ø« Ø¨Ø§Ù„Ø¯Ø§Ø±Ø¬Ø© Ø§Ù„Ø¬Ø²Ø§Ø¦Ø±ÙŠØ© Ø§Ù„ÙØµÙŠØ­Ø© ÙˆØ§Ù„Ù…Ø­ØªØ±Ù…Ø© ÙˆØªØ¯Ø±Ø¯Ø´ Ù…Ø¹ Ø§Ù„Ø²Ø¨ÙˆÙ† Ø¨Ø°ÙƒØ§Ø¡ ÙˆÙ„Ø¨Ø§Ù‚Ø© ÙƒØ£Ù†Ùƒ Ø¥Ù†Ø³Ø§Ù† Ø­Ù‚ÙŠÙ‚ÙŠ ÙŠØ´ØªØºÙ„ ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø±.
Ø§ÙÙ‡Ù… ÙƒÙ„ Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø²Ø¨ÙˆÙ† Ø¨Ø°ÙƒØ§Ø¡ ÙˆÙ…Ø±ÙˆÙ†Ø© ÙˆØ¨Ø£Ø³Ù„ÙˆØ¨ Ø¨Ø´Ø±ÙŠ Ø·Ø¨ÙŠØ¹ÙŠ ÙˆÙ„Ø¨Ù‚ (Ø³ÙˆØ§Ø¡ ÙƒØªØ¨ Ø¨Ø§Ù„Ø¯Ø§Ø±Ø¬Ø©ØŒ Ø§Ù„ÙØ±Ù†Ø³ÙŠØ©ØŒ Ø§Ù„ÙØ±Ø§Ù†ÙƒÙˆ "Franco-Arabic"ØŒ Ø£Ùˆ Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©).

Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© ÙˆØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ø²Ø¨ÙˆÙ†:
1. Ù‚Ø§Ù†ÙˆÙ† ØµØ§Ø±Ù… ÙˆØ­ØªÙ…ÙŠ: Ø§Ù„Ø·Ù„Ø¨ÙŠØ§Øª ØªØªÙ… Ø­ØµØ±ÙŠØ§Ù‹ ÙˆÙ…Ø¨Ø§Ø´Ø±Ø© Ø¹Ø¨Ø± Ù…ÙˆÙ‚Ø¹Ù†Ø§ Ø§Ù„Ø±Ø³Ù…ÙŠ (https://pyjama-dz.vercel.app). ÙŠÙ…Ù†Ø¹ Ù…Ù†Ø¹Ø§Ù‹ Ø¨Ø§ØªØ§Ù‹ Ø¥Ù†Ø´Ø§Ø¡ Ø£Ùˆ ØªØ³Ø¬ÙŠÙ„ Ø£ÙŠ Ø·Ù„Ø¨ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„Ø´Ø§Øª. Ø¥Ø°Ø§ Ø£Ø±Ø§Ø¯ Ø§Ù„Ø²Ø¨ÙˆÙ† Ø§Ù„Ø´Ø±Ø§Ø¡ Ø£Ùˆ Ø§Ù„Ø·Ù„Ø¨ (Ù…Ø«Ù„: Ù†Ø·Ù„Ø¨ØŒ Ù†Ø¯ÙŠØ± ÙƒÙˆÙ…Ø§Ù†Ø¯ØŒ Ø­Ø§Ø¨ Ù†Ø´Ø±ÙŠØŒ commandeØŒ ouiØŒ Ù†Ø¹Ù…): ÙˆØ¬Ù‡Ù‡ Ù…Ø¨Ø§Ø´Ø±Ø© Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø±Ø³Ù…ÙŠ Ù„Ù„Ø´Ø±Ø§Ø¡ ÙˆØ§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ù‚Ø§Ø³ ÙˆØ§Ù„Ù„ÙˆÙ† Ù…Ù†Ù‡ Ù…Ø¨Ø§Ø´Ø±Ø©: https://pyjama-dz.vercel.app
2. Ø¥Ø°Ø§ ÙƒØ§Ù† Ù„Ù„Ø²Ø¨ÙˆÙ† Ø·Ù„Ø¨ÙŠØ© Ø³Ø§Ø¨Ù‚Ø© Ù…Ø³Ø¬Ù„Ø© ÙÙŠ Ø§Ù„Ø¯Ø§ØªØ§Ø¨ÙŠØ² Ù…Ù† Ø§Ù„Ù…ÙˆÙ‚Ø¹ ÙˆÙŠØ±ÙŠØ¯ ØªØ£ÙƒÙŠØ¯Ù‡Ø§ (Ù…Ø«Ù„: Ø£ÙƒØ¯Ù„ÙŠØŒ aked, confirme): Ø£Ø®Ø±Ø¬ Ø§Ù„ÙƒÙˆØ¯: [ACTION:CONFIRM_ORDER] Ø«Ù… Ø§ÙƒØªØ¨ Ø±Ø¯ Ø§Ù„ØªØ£ÙƒÙŠØ¯ Ø¨Ø§Ù„Ø¯Ø§Ø±Ø¬Ø©.
3. Ø¥Ø°Ø§ Ø£Ø±Ø§Ø¯ Ø§Ù„Ø²Ø¨ÙˆÙ† Ø¥Ù„ØºØ§Ø¡ Ø·Ù„Ø¨ÙŠØªÙ‡ Ø§Ù„Ù…Ø³Ø¬Ù„Ø© Ù…Ù† Ø§Ù„Ù…ÙˆÙ‚Ø¹ (Ù…Ø«Ù„: Ø§Ù„ØºÙŠØŒ anuler, annuler): Ø£Ø®Ø±Ø¬ Ø§Ù„ÙƒÙˆØ¯: [ACTION:CANCEL_ORDER] Ø«Ù… Ø§ÙƒØªØ¨ Ø±Ø¯ Ø§Ù„Ø¥Ù„ØºØ§Ø¡ Ø¨Ø§Ù„Ø¯Ø§Ø±Ø¬Ø©.
4. Ø¥Ø°Ø§ Ø·Ù„Ø¨ Ø§Ù„Ø²Ø¨ÙˆÙ† ØµÙˆØ± Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª (ØµÙˆØ±ØŒ ØªØµØ§ÙˆÙŠØ±ØŒ photoØŒ tsswira): Ø£Ø®Ø±Ø¬ Ø§Ù„ÙƒÙˆØ¯: [ACTION:SEND_PHOTOS] ÙˆÙˆØ¬Ù‡Ù‡ Ù„Ù„Ù…ÙˆÙ‚Ø¹ Ù„Ø±Ø¤ÙŠØ© ÙƒØ§ÙØ© Ø§Ù„ØµÙˆØ± ÙˆØ§Ù„Ù…ÙˆØ¯ÙŠÙ„Ø§Øª Ø§Ù„Ù…ØªÙˆÙØ±Ø©.
5. Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ù…ÙƒØ§Ù† ÙˆØ§Ù„Ù…Ù‚Ø± ÙˆØ§Ù„Ø¹Ù†ÙˆØ§Ù†: Ø£Ø¹Ø·Ù‡ Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙˆØ±Ø§Ø¨Ø· Ø®Ø±Ø§Ø¦Ø· Ø¬ÙˆØ¬Ù„ Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù….
6. Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø£Ø±Ù‚Ø§Ù… Ø§Ù„Ù‡Ø§ØªÙ: Ø£Ø¹Ø·Ù‡ Ø£Ø±Ù‚Ø§Ù… Ø§Ù„Ù‡Ø§ØªÙ Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ø§Ù„Ù…ÙƒØªÙˆØ¨Ø© ÙÙŠ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù….
7. Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØ§Ù„Ù…Ù‚Ø§Ø³Ø§Øª ÙˆØ§Ù„Ø£Ù„ÙˆØ§Ù† ÙˆØ§Ù„Ø¬ÙˆØ¯Ø©: Ø£Ø¬Ø¨ Ø¨Ø£Ø³Ù„ÙˆØ¨ Ù„Ø·ÙŠÙ Ø¨Ø§Ù„Ø¯Ø§Ø±Ø¬Ø© Ø§Ù„Ø¬Ø²Ø§Ø¦Ø±ÙŠØ© ÙˆÙˆØ¬Ù‡Ù‡ Ù„Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø±Ø³Ù…ÙŠ Ù„ØªØµÙØ­ ÙƒØ§ÙØ© Ø§Ù„ØµÙˆØ± ÙˆØ§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØ§Ù„Ø·Ù„Ø¨ Ù…Ø¨Ø§Ø´Ø±Ø©: https://pyjama-dz.vercel.app

Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±:
- Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙˆØ§Ù„Ù…Ù‚Ø±: ${storeAddressDisplay}
- Ø±Ø§Ø¨Ø· Ø®Ø±Ø§Ø¦Ø· Ø¬ÙˆØ¬Ù„: ${storeMapsUrl}
- Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø±Ø³Ù…ÙŠ: https://pyjama-dz.vercel.app
- Ø±Ø§Ø¨Ø· ØµÙØ­Ø© Ø§Ù„Ø¬Ù…Ù„Ø© (Gros): https://pyjama-dz.vercel.app/gros
${settingsSummary}

Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØ§Ù„Ø³Ø·ÙˆÙƒ Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ù…Ù† Ø§Ù„Ø¯Ø§ØªØ§Ø¨ÙŠØ²:
${catalogSummary}
${salesModeRules}`;

              // 1. Check for web order confirmation or cancellation reply from customer FIRST (Instant execution before AI)
              const handledOrderConfirm = await processOrderConfirmationIntent(fromPhone, messageText);
              if (handledOrderConfirm) continue;

              const handledOrderCancel = await processOrderCancellationIntent(fromPhone, messageText);
              if (handledOrderCancel) continue;

              // 0. Check for 0-stock size query first
              const outOfStockReply = checkStockInquiry(messageText, products);
              if (outOfStockReply) {
                await sendWhatsAppMessage(fromPhone, outOfStockReply);
                await recordOutOfStockInquiry(fromPhone, messageText, products);
                continue;
              }

              // 2. GENERATE PURE GEMINI AI RESPONSE
              let aiReply = await generateGeminiAI(prompt, systemInstruction, storeSettings, messageText, products);

              if (aiReply) {
                // Check if Gemini AI instructed an order action
                if (aiReply.includes('[ACTION:CONFIRM_ORDER]')) {
                  await processOrderConfirmationIntent(fromPhone, messageText);
                  aiReply = aiReply.replace(/\[ACTION:CONFIRM_ORDER\]/g, '').trim();
                } else if (aiReply.includes('[ACTION:CANCEL_ORDER]')) {
                  await processOrderCancellationIntent(fromPhone, messageText);
                  aiReply = aiReply.replace(/\[ACTION:CANCEL_ORDER\]/g, '').trim();
                } else if (aiReply.includes('[ACTION:SEND_PHOTOS]')) {
                  await checkAndSendProductPhotos(fromPhone, messageText, products);
                  aiReply = aiReply.replace(/\[ACTION:SEND_PHOTOS\]/g, '').trim();
                }

                if (aiReply) {
                  await sendWhatsAppMessage(fromPhone, aiReply);
                }
                continue;
              }

              // Fallback handlers if AI unreachable
              const sentPhotos = await checkAndSendProductPhotos(fromPhone, messageText, products);
              if (sentPhotos) {
                await sendWhatsAppMessage(fromPhone, "ØªÙØ¶Ù„ Ø®ÙˆÙŠØ§ØŒ ØªÙ… Ø¥Ø±Ø³Ø§Ù„ ØµÙˆØ± Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„Ø§Øª Ø§Ù„Ù…ØªÙˆÙØ±Ø© Ø£Ø¹Ù„Ø§Ù‡ ÙÙŠ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©. ÙŠÙ…ÙƒÙ†Ùƒ ØªØµÙØ­ Ø¨Ø§Ù‚ÙŠ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„Ø£Ù„ÙˆØ§Ù† Ø¹Ø¨Ø± Ù…ÙˆÙ‚Ø¹Ù†Ø§ Ø§Ù„Ø±Ø³Ù…ÙŠ:\nhttps://pyjama-dz.vercel.app");
                continue;
              }

              // Process direct order intent and delivery stock check
              const handledOrder = await processDirectOrderFromMessage(fromPhone, messageText, products);
              if (handledOrder) continue;

              // Auto-record inquiry if item/size requested is out of stock
              await recordOutOfStockInquiry(fromPhone, messageText, products);

              const fallbackMsg = getSmartFallbackResponse(messageText, storeSettings, products);
              if (fallbackMsg) {
                await sendWhatsAppMessage(fromPhone, fallbackMsg);
              }


            }
          } catch (innerErr) {
            console.error('Error processing single message:', innerErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('Background processing error:', err);
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const mode = req.query?.['hub.mode'] || urlObj.searchParams.get('hub.mode');
    const challenge = req.query?.['hub.challenge'] || urlObj.searchParams.get('hub.challenge');

    if (mode === 'subscribe' || challenge) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge || 'OK');
    }
    return res.status(200).send('OK');
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    if (body) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ key: 'last_webhook_payload', value: JSON.stringify({ body, time: new Date().toISOString() }) })
        });
      } catch (e) {}

      await processIncomingPayload(body);
    }

    if (typeof res.status(200).send === 'function') {
      return res.status(200).send('EVENT_RECEIVED');
    }
    return res.status(200).json({ status: 'EVENT_RECEIVED' });
  }

  if (typeof res.status(405).send === 'function') {
    return res.status(405).send('Method Not Allowed');
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}

export { processIncomingPayload };
