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
    const cleanPhone = rawDigits.length >= 9 ? rawDigits.slice(-9) : rawDigits;
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

    if (cleanPhone) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key: `last_alert_${cleanPhone}`, value: dataVal })
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
    const cleanPhone = rawDigits.length >= 9 ? rawDigits.slice(-9) : rawDigits;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.last_alert_${cleanPhone}`, {
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
    .replace(/[أإآاًٌٍَُِّْ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
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
  if (!prod) return "بيجامات فاخرة";
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
                  text: promptText || "استمع لهذا التسجيل الصوتي للزبون، وافهم طلبه بدقة دون كتابة إيموجي."
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
  const address = storeSettings.address || "الشلف (Chlef)";

  const phoneSources = storeSettings.phoneOrders 
    ? [storeSettings.phoneOrders, storeSettings.whatsapp]
    : [storeSettings.phones, storeSettings.whatsapp];
  const phonesArr = extractCleanPhonesList(...phoneSources);
  const formattedPhonesBullets = phonesArr.length > 0 ? phonesArr.map(p => `- ${p}`).join('\n') : '- 0554128933';

  // 1. QUALITY & FABRIC INQUIRY
  if (['qualite', 'qualité', 'chaba', 'chab', 'chbab', 'جودة', 'نوعية', 'قماش', 'مليحة', 'شبابة', 'شباب', 'مليح'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `جودة السلعة والقماش ممتازة جداً ورفيعة ومريحة في اللبس 100%.\nيمكنك تصفح جميع الموديلات والتفاصيل عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app`;
  }

  // 2. DELIVERY TIMING / SPEED INQUIRY
  if (['winta', 'twsslni', 'twsslnii', 'وقتاش', 'شحال تقعد', 'شحال ياخد', 'شحال تاخد', 'متى', 'تتوصل', 'توصلني'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `التوصيل عادة يأخذ بين 24 حتى 48 ساعة بالنسبة لولاية الشلف، ومن يومين إلى 4 أيام لباقي الولايات.\nفور ما تخرج الطلبية مع الموزع، راح يتصل بيك في الهاتف باش يوصلهالك.`;
  }

  // 3. PHONE NUMBERS QUERY
  if (['numero', 'nomer', 'num', 'nomro', 'nomiro', 'هاتف', 'رقم', 'ارقام', 'نميرو', 'نومرو', 'tel', 'phone'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `أرقام التواصل والواتساب الرسمية للمتجر:\n${formattedPhonesBullets}\n\nنحن في خدمتك دائماً.`;
  }

  // 4. LOCATION QUERY
  if (['win jayiin', 'win jayin', 'مقر', 'عنوان', 'موقع', 'بلاصة', 'لوكيشن', 'اللوكيشن', 'chlef', 'الشلف'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `المقر والعنوان: ${address}.\nرابط خرائط جوجل (Google Maps):\n${mapsUrl}\n\nالتوصيل متوفر لجميع 58 ولاية حتى باب المنزل. كيف يمكننا مساعدتك اليوم؟`;
  }

  // 5. REAL-TIME PRODUCT ITEM / COLOR / STOCK CHECKER
  if (['ensemble', 'noir', 'rouge', 'rose', 'blanc', 'bleu', 'بيجامة', 'انسامبل', 'انصامبل', 'سطوك', 'كاين', 'kaayn', 'kayn', 'dispo', 'disponibilite', 'couleur', 'taille', 'مقاس', 'لون'].some(k => norm.includes(k) || pLower.includes(k))) {
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
      return `إيه كاين متوفر في السطوك. تفضل بتصفح الصور والمقاسات وتأكيد طلبك عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app`;
    } else {
      return `ماكاش متوفر حالياً هاد الموديل أو اللون. تفضل بتصفح جميع الموديلات والألوان المتوفرة حالياً عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app`;
    }
  }

  // 6. PRICES / CATALOG
  if (['prix', 'سعر', 'اسعار', 'سومة', 'شحال', 'بكم', 'منتجات', 'موديلات', 'بيجامة', 'بيجامات', 'سلعة'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `تفضل بتصفح كافة الصور، المقاسات، الألوان والأسعار المتوفرة حالياً عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app\n\nأسعارنا مناسبة جداً والتوصيل متوفر لجميع الولايات.`;
  }

  // 7. DELIVERY GENERAL
  if (['livraison', 'توصيل', 'شحن', 'نوصلو', 'ولاية', 'ديكسبريس', 'يالادين'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `التوصيل متوفر لجميع 58 ولاية حتى باب المنزل أو المكتب.\nالدفع يكون عند الاستلام بعد معاينة طلبك.`;
  }

  // 8. WHOLESALE
  if (['gros', 'جملة', 'بالجملة', 'سيري', 'تجارة'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `البيع بالجملة متوفر بالسيريات والكميات لصحاب المحلات والتجارة.\nيمكنك تصفح الموقع أو التواصل معنا عبر الهاتف للمزيد من التفاصيل: https://pyjama-dz.vercel.app`;
  }

  return `أهلاً وسهلاً بك. تفضل بالاستفسار عن أي موديل أو مقاس أو سعر، نحن في خدمتك.\nرابط الموقع الرسمي: https://pyjama-dz.vercel.app`;
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
      product: orderData.product || 'بيجامات فاخرة',
      color: orderData.color || '',
      size: orderData.size || '',
      qty: Number(orderData.quantity || 1),
      price: Number(orderData.price || orderData.totalPrice || 0)
    };

    const payload = {
      clientName: orderData.clientName || 'زبون المحادثة',
      phone: orderData.phone,
      wilaya: orderData.wilaya || 'الشلف',
      commune: orderData.commune || 'المركز',
      product: orderData.product || 'بيجامات فاخرة',
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
  try {
    if (!size || newQty <= 0) return;

    let availableQty = Number(newQty);
    const targetSize = String(size).trim().toUpperCase();

    let productTitle = '';
    if (productId) {
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

    let orders = [];
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?status=in.(en_attente_stock,pending_stock,rupture_stock,attente_stock,out_of_stock)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      orders = await res.json();
      if (!Array.isArray(orders)) orders = [];
    } catch (e) {
      orders = [];
    }

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

    // Load persistent notified waitlist IDs and notified phones to ensure NO duplicate notifications
    const notifiedWaitlistIds = new Set();
    const notifiedPhonesSet = new Set();
    try {
      const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=in.(notified_waitlist_ids,notified_phones_list)&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await setRes.json();
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (r.key === 'notified_waitlist_ids' && r.value) {
            const arr = JSON.parse(r.value);
            if (Array.isArray(arr)) arr.forEach(id => notifiedWaitlistIds.add(id));
          } else if (r.key === 'notified_phones_list' && r.value) {
            const arr = JSON.parse(r.value);
            if (Array.isArray(arr)) arr.forEach(p => notifiedPhonesSet.add(p));
          }
        });
      }
    } catch (e) {}

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

    const isProdMatch = (targetId, targetTitle, orderId, orderText) => {
      if (targetId && orderId && String(targetId).trim() === String(orderId).trim()) return true;
      const nTarget = normalizeText(targetTitle);
      const nOrder = normalizeText(orderText);
      if (nTarget && nOrder) {
        if (nOrder.includes(nTarget) || nTarget.includes(nOrder)) return true;
        const tw = nTarget.split(/\s+/).filter(w => w.length >= 3);
        const ow = nOrder.split(/\s+/).filter(w => w.length >= 3);
        if (tw.some(w => ow.includes(w))) return true;
      }
      return false;
    };

    const isSzMatch = (targetSz, orderSz) => {
      if (!targetSz || !orderSz) return false;
      const nTarget = String(targetSz).trim().toUpperCase();
      const nOrder = String(orderSz).trim().toUpperCase();
      return nOrder === nTarget || nOrder === 'STANDARD' || nTarget === 'STANDARD' || nOrder === 'ALL';
    };

    // Fetch store settings to identify and exclude manager phone numbers
    const managerPhones = new Set(['0771335039', '213771335039', '0554128933', '213554128933']);
    try {
      const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const settingsRows = await setRes.json();
      if (Array.isArray(settingsRows)) {
        settingsRows.forEach(r => {
          if (r.value && (r.key === 'whatsappLivraisonManager' || r.key === 'whatsappBoutiqueManager' || r.key === 'whatsappAdmin' || r.key === 'whatsapp')) {
            const rawDigits = String(r.value).replace(/\D/g, '');
            if (rawDigits) {
              managerPhones.add(rawDigits);
              managerPhones.add(rawDigits.replace(/^0/, '213'));
              managerPhones.add('0' + rawDigits.slice(-9));
            }
          }
        });
      }
    } catch (e) {}

    const isManagerPhone = (phoneStr) => {
      if (!phoneStr) return false;
      const clean = String(phoneStr).replace(/\D/g, '');
      if (!clean) return false;
      const last8 = clean.slice(-8);
      for (const mPhone of managerPhones) {
        if (mPhone.endsWith(last8)) return true;
      }
      return false;
    };

    // Only process waitlist entries (customers who explicitly asked to be notified on restock)
    if (availableQty > 0) {
      for (const entry of waitlistEntries) {
        if (availableQty <= 0) break;
        if (entry.id && notifiedWaitlistIds.has(entry.id)) continue;

        const entryPhone = entry.whatsapp_number || entry.phone;
        const cleanPhone = entryPhone ? entryPhone.replace(/\D/g, '') : '';
        const waPhone = cleanPhone.startsWith('213') ? cleanPhone : cleanPhone.replace(/^0/, '213');
        const last8 = cleanPhone.slice(-8);

        // Check if phone already notified in current run
        if (!waPhone || notifiedPhones.has(waPhone)) {
          continue;
        }

        const entrySize = entry.size || '';
        const entryProdId = entry.product_id || entry.productId;
        const entryProdText = entry.product_title || entry.product || '';

        const sizeMatches = isSzMatch(targetSize, entrySize);
        const prodMatches = isProdMatch(productId, productTitle, entryProdId, entryProdText);

        if (sizeMatches && prodMatches) {
          // Mark waitlist entry status as notified in Supabase table
          await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${entry.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'notified' })
          });

          // Also mark ALL matching pending entries for this phone as notified
          if (cleanPhone) {
            const p1 = '0' + cleanPhone.slice(-9);
            const p2 = '213' + cleanPhone.slice(-9);
            const p3 = cleanPhone;
            await fetch(`${SUPABASE_URL}/rest/v1/waitlist?whatsapp_number=in.(${p1},${p2},${p3})`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: 'notified' })
            });
            await saveNotifiedPhone(cleanPhone);
          }

          if (entry.id) {
            notifiedWaitlistIds.add(entry.id);
            try {
              await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({ key: 'notified_waitlist_ids', value: JSON.stringify(Array.from(notifiedWaitlistIds)) })
              });
            } catch (e) {}
          }

          const clientNameStr = (entry.client_name && entry.client_name !== 'زبون الواتساب') ? entry.client_name : '';
          const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
          const prodDesc = productTitle || entryProdText ? ` في موديل ${productTitle || entryProdText}` : '';

          const restockMsg = `أهلاً بك${nameGreeting}.\nبشرى سارة، توفر مقاسك (${targetSize}) مجدداً${prodDesc}.\nيمكنك الآن إتمام طلبك عبر موقعنا الرسمي: https://pyjama-dz.vercel.app أو بالرد على هذه الرسالة. شكراً لانتظارك.`;

          await sendWhatsAppMessage(waPhone, restockMsg);
          notifiedPhones.add(waPhone);

          availableQty = Math.max(0, availableQty - 1);
        }
      }
    }
  } catch (err) {
    console.error('Error notifying waiting customers:', err);
  }
}

async function recordOutOfStockInquiry(fromPhone, messageText, products) {
  try {
    const sizeMatch = messageText.match(/(?:pointure|مقاس|حجم|قياس|taille|size)\s*[:=]?\s*(\d{2}|S|M|L|XL|2XL|3XL|4XL|5XL)/i) 
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
      const prodTitle = matchedProduct?.title || 'بيجامات فاخرة';

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
            client_name: 'زبون الواتساب',
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
    const isQuestion = messageText.includes('?') || messageText.includes('؟') ||
      ['وينتا', 'وقتاش', 'متى', 'كيفاه', 'كيفاش', 'شحال', 'qualité', 'كاليتي', 'نوعية', 'وصلت', 'تصلني', 'وين راهي', 'مكان', 'وصلتني'].some(k => normText.includes(k) || pLower.includes(k));

    if (isQuestion) return false;

    const phoneMatch = messageText.match(/(0\d{8,11}|\+?213\d{8,11})/);
    if (phoneMatch) {
      const extractedPhone = phoneMatch[1];
      if (!isValidAlgerianPhone(extractedPhone)) {
        const invalidMsg = `⚠️ *رقم الهاتف غير صحيح*\nيرجى كتابة رقم هاتف جزائري يتكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07 (مثال: 0771335039) لتتمكن من التسجيل وتأكيد طلبك.`;
        await sendWhatsAppMessage(fromPhone, invalidMsg);
        return true;
      }
    }

    const wilayas = ["ادرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "بليدة", "بويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "مدية", "مستغانم", "مسيلة", "معسكر", "ورقلة", "وهران", "بيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "نعامة", "عين تموشنت", "غرداية", "غليزان", "المغير", "المنيعة", "أولاد جلال", "برج باجي مختار", "بني عباس", "تيميمون", "تقرت", "جانت", "إن صالح", "إن قزام", "alger", "oran", "blida", "chlef", "setif", "constantine"];
    const wilayaMatch = wilayas.find(w => normText.includes(w.toLowerCase()) || pLower.includes(w.toLowerCase()));

    // Explicit order intent keywords (MUST express intention to place/register an order)
    const explicitOrderKeywords = [
      'سجللي كوموند', 'سجل طلبية', 'ندير كوموند', 'نطلب بيجامة',
      'ارسللي', 'ابعثلي كوموند', 'passer commande', 'commander', 'نطلبها'
    ];

    const hasExplicitOrderIntent = explicitOrderKeywords.some(k => normText.includes(k) || pLower.includes(k));
    const sizeMatchForCheck = messageText.match(/(?:pointure|مقاس|حجم|قياس|taille|size)\s*[:=]?\s*(\d{2}|S|M|L|XL|2XL|3XL|4XL)/i) || messageText.match(/\b(3[5-9]|4[0-8]|S|M|L|XL|2XL|3XL|4XL)\b/i);
    
    // Strict Full Details Requirement: Phone + Wilaya + Size MUST all be present to create an order
    const hasValidPhone = phoneMatch && isValidAlgerianPhone(phoneMatch[1]);
    const hasFullDetails = hasValidPhone && wilayaMatch && sizeMatchForCheck;

    if (!hasExplicitOrderIntent && !hasFullDetails) return false;

    // Extract lines and name
    const lines = messageText.split('\n').map(l => l.trim()).filter(Boolean);
    let clientName = 'الزبون الكريم';
    const nameRegex = /(?:اسمي|اسم|الاسم|nom|client)\s*[:=]?\s*([أ-يa-zA-Z\s]{3,25})/i;
    const matchN = messageText.match(nameRegex);
    if (matchN) {
      clientName = matchN[1].trim();
    } else if (lines.length > 0 && lines[0].length >= 3 && !lines[0].match(/\d/) && !wilayas.some(w => lines[0].toLowerCase().includes(w))) {
      clientName = lines[0];
    }

    const orderPhone = phoneMatch ? phoneMatch[1] : fromPhone.replace(/^\+?213/, '0');
    const wilaya = wilayaMatch ? wilayaMatch : 'الشلف';

    let deliveryCompany = 'Livraison Domicile';
    if (pLower.includes('yalidine') || normText.includes('يالادين')) {
      deliveryCompany = 'Yalidine Express';
    } else if (pLower.includes('zrexpress') || pLower.includes('zr') || normText.includes('زد ار') || normText.includes('زد آر')) {
      deliveryCompany = 'ZR Express';
    } else if (pLower.includes('bureau') || pLower.includes('stop desk') || normText.includes('مكتب') || normText.includes('دستك')) {
      deliveryCompany = 'Livraison Bureau';
    } else if (pLower.includes('domicile') || normText.includes('منزل') || normText.includes('دار')) {
      deliveryCompany = 'Livraison Domicile';
    }

    // Size / Pointure extraction
    const sizeMatch = messageText.match(/(?:pointure|مقاس|حجم|قياس|taille|size)\s*[:=]?\s*(\d{2}|S|M|L|XL|2XL|3XL|4XL)/i) || messageText.match(/\b(3[5-9]|4[0-8]|S|M|L|XL|2XL|3XL|4XL)\b/i);
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

    // ❌ OUT OF STOCK CASE (Stock is 0) -> Save to Waitlist ONLY (Do NOT insert into orders table)
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
          product_title: matchedProduct?.title || 'بيجامات فاخرة',
          color: colorLabel,
          size: requestedSize,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      });

      const outMsg = `أهلاً بك ${clientName}.\nعذراً، المقاس (${requestedSize}) غير متوفر حالياً في موديل ${matchedProduct?.title || ''} (${colorLabel}).\nتم حفظ طلبك وسنخبرك عبر الواتساب فور توفره مجدداً إن شاء الله. شكراً لك.`;
      await sendWhatsAppMessage(fromPhone, outMsg);
      return true;
    }

    // ✅ AVAILABLE IN STOCK (> 0) -> Save Order & Deduct Stock Immediately
    const newOrder = await createChatOrderInSupabase({
      clientName,
      phone: orderPhone,
      wilaya,
      commune: 'المركز',
      product: `${matchedProduct?.title || 'بيجامات فاخرة'} (${colorLabel}${colorLabel ? ' - ' : ''}${requestedSize || ''})`.trim(),
      price: Number(matchedProduct?.price || 0),
      quantity: 1,
      deliveryCompany,
      status: 'confirmee',
      items: [{
        productId: matchedProduct?.id || null,
        product: matchedProduct?.title || 'بيجامات فاخرة',
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
      const confirmMsg = `*متجر Pyjama DZ*\n\nأهلاً بك ${clientName}.\nتم تسجيل وتأكيد طلبيتك رقم #${orderNumStr} بنجاح! 📦\n\n- المنتج: ${matchedProduct?.title || 'بيجامات فاخرة'} (${colorLabel}${colorLabel ? ' - ' : ''}${requestedSize || ''})\n- الولاية: ${wilaya}\n- التوصيل: ${deliveryCompany}\n- السعر: ${matchedProduct?.price || ''} دج\n\nجاري تجهيز طلبك وشحنه في أقرب وقت. شكراً لثقتك بنا!`;
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
    /صورة|صور|تصويرة|تصويره|تصاوير|تصاور|تصويرات|تصويرتها|صوره/i,
    /photo|photos|image|images|pic|pics|picture|pictures/i,
    /شوف|نشوف|وريني|وريلي|بعثلي|ابعثلي|ابعث|بعث|تأبعثلي|تبعتلي|تبيعتلي|tbeat|tbeath|tb3ath|beath|versili|varsili|vrsi/i,
    /t+s+a*w+i*r*a*/i, // Matches tswira, tsswira, tsswwiira, taswira, tasawir, tsawir, etc.
    /صورة ال|تصاوير ال|تصويرة ال/i
  ].some(rgx => rgx.test(rawText) || rgx.test(norm));

  if (!isPhotoIntent) return false;

  // Detect specific product category/title requested (e.g. sbat / sabot / سباط / صلاط / pyjama / بيجامة)
  const isShoesRequested = /sbat|sabot|سباط|صلاط|حذاء|نعالة|pantoufle/i.test(rawText) || /sbat|sabot|سباط|صلاط|حذاء|نعالة|pantoufle/i.test(norm);
  const isPyjamaRequested = /pyjama|بيجامة|بيجامات|بيجامة/i.test(rawText) || /pyjama|بيجامة|بيجامات|بيجامة/i.test(norm);

  let targetProducts = products;
  
  if (isShoesRequested) {
    const shoesMatches = products.filter(p => {
      const t = `${p.title || ''} ${p.category || ''} ${p.badge || ''} ${p.description || ''}`.toLowerCase();
      return /sbat|sabot|سباط|صلاط|حذاء|نعالة|pantoufle/i.test(t);
    });
    if (shoesMatches.length > 0) targetProducts = shoesMatches;
  } else if (isPyjamaRequested) {
    const pyjMatches = products.filter(p => {
      const t = `${p.title || ''} ${p.category || ''} ${p.badge || ''} ${p.description || ''}`.toLowerCase();
      return /pyjama|بيجامة|بيجامات|بيجامة/i.test(t);
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
      p.images.forEach(img => addImageObj(img, `${p.title || 'منتج'} - السعر: ${p.price || 3200} دج`));
    } else if (p.image) {
      addImageObj(p.image, `${p.title || 'منتج'} - السعر: ${p.price || 3200} دج`);
    }

    // 2. Color variants images
    const variants = p.colorVariants || p.colorvariants;
    if (Array.isArray(variants)) {
      variants.forEach(cv => {
        const cvImg = cv.image || cv.imageUrl || cv.img;
        if (cvImg) {
          addImageObj(cvImg, `${p.title || 'منتج'} (${cv.name || cv.color || 'اللون'}) - السعر: ${p.price || 3200} دج`);
        }
      });
    }
  });

  // Fallback if no images found in target products
  if (matchedImages.length === 0 && products.length > 0) {
    const p = products[0];
    matchedImages.push({
      url: "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=800&q=80",
      caption: `${p.title || 'بيجامات فاخرة'} - السعر: ${p.price || 3200} دج`
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
  
  const livraisonManagerPhone = (storeSettings.whatsappLivraisonManager && !storeSettings.whatsappLivraisonManager.includes('123456')) ? storeSettings.whatsappLivraisonManager : (storeSettings.whatsapp || '0771335039');
  const boutiqueManagerPhone = (storeSettings.whatsappBoutiqueManager && !storeSettings.whatsappBoutiqueManager.includes('123456')) ? storeSettings.whatsappBoutiqueManager : null;

  const isBoutiqueProduct = (product.category && String(product.category).startsWith('boutique__')) ||
                            (product.badge && String(product.badge).includes('Boutique'));

  for (let cIdx = 0; cIdx < product.colorVariants.length; cIdx++) {
    const variant = product.colorVariants[cIdx];
    if (!variant || !variant.stock) continue;

    const isBoutiqueVariant = isBoutiqueProduct ||
                              String(variant.name || variant.color || '').toLowerCase().includes('حانيت') || 
                              String(variant.name || variant.color || '').toLowerCase().includes('boutique') ||
                              String(variant.name || variant.color || '').toLowerCase().includes('محل');
    
    // Website orders strictly target whatsappLivraisonManager (0771335039)
    const targetPhone = (isBoutiqueVariant && boutiqueManagerPhone) ? boutiqueManagerPhone : livraisonManagerPhone;
    const locationLabel = (isBoutiqueVariant && boutiqueManagerPhone) ? "سطوك المحل (Boutique)" : "سطوك التوصيل (Livraison)";

    // Skip if no manager phone is registered for this specific stock type
    if (!targetPhone) continue;

    for (const [size, qty] of Object.entries(variant.stock)) {
      const numQty = parseInt(qty);
      if (!isNaN(numQty) && numQty <= 5 && numQty >= 0) {
        const alertKey = `${product.id}_${cIdx}_${size}`;
        const now = Date.now();

        // 1. Fetch last alert state
        let lastAlertState = null;
        try {
          const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}&select=value`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          const rows = await stateRes.json();
          if (Array.isArray(rows) && rows[0]?.value) {
            lastAlertState = JSON.parse(rows[0].value);
          }
        } catch (e) {}

        const isQtyChanged = !lastAlertState || lastAlertState.qty !== numQty;
        const is30MinElapsed = lastAlertState && (now - (lastAlertState.timestamp || 0) >= 30 * 60 * 1000);

        // Send alert if quantity changed (e.g. dropped to <= 5 or 0) OR 30 minutes elapsed
        if (isQtyChanged || is30MinElapsed) {
          const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const alertMsg = numQty === 0 
            ? `🛑 *تنبيه نفاد المخزون بالكامل (${locationLabel})* 🛑\n\n• المنتج: ${product.title}\n• اللون: ${variant.name || variant.color || 'الافتراضي'}\n• المقاس: ${size}\n• حالة الستوك: نافذ تماماً (0 حبة متبقية).\n\n🕒 التوقيت: ${timeStr}`
            : `⚠️ *تنبيه مخزون منخفض (${locationLabel})* ⚠️\n\n• المنتج: ${product.title}\n• اللون: ${variant.name || variant.color || 'الافتراضي'}\n• المقاس: ${size}\n• الكمية المتبقية: ${numQty} حبات فقط.\n\n🕒 التوقيت: ${timeStr}`;
          
          const alertRes = await sendWhatsAppMessage(targetPhone, alertMsg);
          if (alertRes && Array.isArray(alertRes.messages) && alertRes.messages[0]) {
            await saveStockAlertRecord(alertRes.messages[0].id, targetPhone, product.id, cIdx, size);

            // Upsert new alert state in Supabase settings
            const alertStateVal = JSON.stringify({ qty: numQty, timestamp: now, isResolved: false });
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

    if (['yalidine', 'مكتب', 'maktab', 'stop desk', 'stopdesk', 'agence'].some(k => lLower.includes(k) || lNorm.includes(k))) {
      deliveryCompany = 'Yalidine Stop Desk';
      deliveryMode = 'desk';
    } else if (['domicile', 'منزل', 'دار', 'دارنا', 'home'].some(k => lLower.includes(k) || lNorm.includes(k))) {
      deliveryCompany = 'Livraison Domicile';
      deliveryMode = 'home';
    }

    if (['chlef', 'الشلف', 'alger', 'الجزائر', 'oran', 'وهران', 'blida', 'البليدة', 'setif', 'سطيف', 'annaba', 'عنابة', 'constantine', 'قسنطينة', 'tlemcen', 'تلمسان', 'batna', 'باتنة', 'bjaya', 'bejaia', 'بجاية', 'biskra', 'بسكرة', 'tizi', 'تيزي', 'mostaganem', 'مستغانم', 'tiaret', 'تيارت', 'djelfa', 'الجلفة', 'skikda', 'سكيكدة', 'medea', 'المدية', 'mascara', 'معسكر', 'ouargla', 'ورقلة', 'bba', 'برج', 'boumerdes', 'بومرداس', 'el oued', 'الوادي', 'khenchela', 'خنشلة', 'souk ahras', 'سوق اهراس', 'tipaza', 'تيبازة', 'milla', 'ميلة', 'ain temouchent', 'عين تموشنت', 'ghardaia', 'غرداية', 'relizane', 'غليزان'].some(k => lLower.includes(k) || lNorm.includes(k))) {
      const parts = line.split(/[-,\/\s]+/);
      wilaya = parts[0] ? parts[0].trim() : 'الشلف';
      commune = parts[1] ? parts[1].trim() : (parts[0] || 'المركز');
    }

    if (!name && /[a-zA-Zأ-ي]/.test(line) && !line.match(/0[567]\d{8}/) && !['yalidine', 'livraison', 'مكتب', 'منزل', 'stop desk', 'llmaktab'].some(k => lLower.includes(k))) {
      if (!['chlef', 'alger', 'oran', 'blida', 'setif', 'الشلف', 'الجزائر'].some(k => lLower.includes(k))) {
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
      'tsswiira', 'tsswira', 'tssawir', 'tsawir', 'photo', 'photos', 'صور', 'تصاوير', 'صورة', 'وريلنا', 'وريني',
      'شحال', 'بكم', 'prix', 'وقتاش', 'وين', 'عندكم', 'كاين', 'كاينين', 'استفسار', 'سؤال', 'سعر', 'سومة', 'قماش',
      'نوعية', 'جودة', 'مكان', 'مقر', 'عنوان', 'كيفاش',
      'win', 'wayn', 'fayen', 'fayn', 'plassa', 'blassa', 'plasa', 'blasa', 'adresse', 'lieu', 'local', 'boutique', 'magasin',
      'اين', 'أين', 'فين', 'بلاصة', 'محل', 'عنوانكم', 'مقركم', 'مكانكم'
    ].some(k => normText.includes(k) || pLower.includes(k));

    if (isPhotoOrQuestion) {
      return false;
    }

    const localPhone = fromPhone.replace(/^\+?213/, '0');
    const fullPhone = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;

    // Word boundary check for short words like 'wi' to avoid matching 'win'!
    const isConfirmIntent = [
      'نعم', 'نعك', 'إيه', 'ايه', 'تأكيد', 'أكد', 'تاكيد', 'حاب نشري', 'نعم حاب', 'حاب ندير كوماند', 'حاب نطلب',
      'ديها', 'بعثهالي', 'ابعثهالي', 'yes', 'ok', 'oui', 'مشري', 'حاب نديها', 'نديها', 'daccord', 'd\'accord', 'ouais',
      'aked', 'akedli', 'akedha', 'akedhali', 'akidli', 'akid', 'akedna', 'confirmi', 'waye', 'wayh',
      'confirm', 'confirmer', 'akedlih', 'اكدلي', 'أكدلي', 'اكدها', 'أكدها', 'ثبتها',
      'ثبتلي', 'ملا', 'مالا', 'صح', 'اوكي', 'ماذا بيك'
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
      const entryTitle = waitlistEntry.product_title || waitlistEntry.product || 'الموديل المطلوب';
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

      const redirectWebsiteMsg = `أهلاً وasync function processOrderCancellationIntent(fromPhone, messageText) {
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
        'تأكيد الإلغاء', 'تأكيد الغاء', 'تاكيد الغاء', 'تاكيد', 'تأكيد', 'نعم', '1', 'إلغاء الطلب', 'الغيها',
        'انوليها', 'انولي', 'ألغيها', 'الغها', 'annuler', 'anuler', 'yes', 'oui', 'ih', 'إيه', 'ايه'
      ].some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

      const isDeclineNo = [
        'لا', '2', 'تراجع', 'لا تلغي', 'لا تلغيها', 'تراجع عن الإلغاء', 'تراجع عن الغاء', 'تراجع عن الالغاء',
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
          await updateOrderStatusAndArchive(targetOrder.id, 'annulee');
          const products = await getAllProducts();
          await restoreStockForOrder(targetOrder, products);

          const orderNumStr = await getSequentialOrderNum(targetOrder);
          const rawName = targetOrder.clientName || '';
          const cleanName = (rawName && !rawName.includes('زبون الواتساب') && !rawName.includes('زبون المحادثة'))
            ? rawName.replace(/\(واتساب:[^\)]+\)/g, '').trim()
            : '';
          const clientNameStr = cleanName ? ` ${cleanName}` : '';

          // Delete session state
          await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          }).catch(() => {});

          const confirmMsg = `أهلاً وسهلاً بك${clientNameStr}.\n\n✅ *تم إلغاء طلبك رقم #${orderNumStr} بنجاح وإرجاع المنتجات إلى المخزن.*\nنتمنى أن نخدمك مجدداً في المرات القادمة إن شاء الله! 🌸`;
          await sendWhatsAppMessage(fromPhone, confirmMsg);
          return true;
        }
      } else if (isDeclineNo) {
        // Delete session state and cancel cancellation action
        await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        }).catch(() => {});

        await sendWhatsAppMessage(fromPhone, `*متجر Pyjama DZ*\n\nتم التراجع عن الإلغاء وتبقى طلبيتك مؤكدة وسارية. شكراً لتواصلك معنا! 🌸`);
        return true;
      }
    }

    // Check if customer initiates a NEW cancellation request
    const isCancelRequest = [
      'إلغاء', 'الغاء', 'ألغي', 'الغي', 'إلغي', 'انولي', 'أنولي', 'حبيت نلغي', 'حاب نلغي', 'حابة نلغي',
      'انولي الطلب', 'إلغاء الطلب', 'الغاء الطلب', 'ألغي الطلب', 'الغي الطلب',
      'annuler', 'anuler', 'annule', 'anule', 'canceller', 'cancel', 'annulez', 'annulation', 'annuler commande'
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
    const cleanName = (rawName && !rawName.includes('زبون الواتساب') && !rawName.includes('زبون المحادثة'))
      ? rawName.replace(/\(واتساب:[^\)]+\)/g, '').trim()
      : '';
    const clientNameStr = cleanName ? ` ${cleanName}` : '';
    const cleanProd = (latestOrder.product || '').replace(/\(واتساب:[^\)]+\)/g, '').trim();

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

    const promptMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${clientNameStr}.\nتلقينا طلبك لإلغاء الطلبية:\n\n• أحدث طلبية مسجلة باسمك هي رقم: #${orderNumStr}\n• المنتجات: ${cleanProd}\n• الولاية: ${latestOrder.wilaya || ''}\n\nهل أنت متأكد أنك تريد إلغاء هذه الطلبية؟\n\n👉 رد بـ *تأكيد الإلغاء* (أو *نعم*) لإلغاء هذه الطلبية.`;

    await sendWhatsAppMessage(fromPhone, promptMsg);
    return true;
  } catch (err) {
    console.error('Error processing order cancellation intent:', err);
  }
  return false;
}=merge-duplicates'
            },
            body: JSON.stringify({
              key: `cancel_state_${cleanPhoneKey}`,
              value: JSON.stringify({ orderId: nextOrder.id, orderIndex: nextIdx, timestamp: Date.now() })
            })
          });

          const promptMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${clientNameStr}.\n• الطلبية سابقة رقم (${nextIdx + 1}) المسجلة باسمك هي رقم: #${nextOrderNumStr}\n• المنتجات: ${cleanProd}\n• الولاية: ${nextOrder.wilaya || ''}\n\nهل هذه هي الطلبية التي تريد إلغاءها؟\n\n👉 رد بـ *تأكيد الإلغاء* (أو *نعم*) لإلغاء هذه الطلبية.\n👉 رد بـ *ليست هذه* (أو *لا*) للبحث في طلبيتك السابقة.`;
          await sendWhatsAppMessage(fromPhone, promptMsg);
          return true;
        } else {
          // No more active orders
          await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          }).catch(() => {});

          await sendWhatsAppMessage(fromPhone, `*متجر Pyjama DZ*\n\nلا توجد طلبيات أخرى سابقة مسجلة باسمك حالياً. شكراً لتواصلك معنا! 🌸`);
          return true;
        }
      }
    }

    // Check if customer initiates a NEW cancellation request
    const isCancelRequest = [
      'إلغاء', 'الغاء', 'ألغي', 'الغي', 'إلغي', 'انولي', 'أنولي', 'حبيت نلغي', 'حاب نلغي', 'حابة نلغي',
      'انولي الطلب', 'إلغاء الطلب', 'الغاء الطلب', 'ألغي الطلب', 'الغي الطلب',
      'annuler', 'anuler', 'annule', 'anule', 'canceller', 'cancel', 'annulez', 'annulation', 'annuler commande'
    ].some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

    if (!isCancelRequest) return false;

    // Fetch latest active order
    const orderCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone},${cleanPhoneNo0},213${cleanPhoneNo0})&status=in.(nouvelle,confirmee,pending,attente,attente_confirmation,nouveau)&order=created_at.desc&limit=5`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    const activeOrders = await orderCheckRes.json();
    if (!Array.isArray(activeOrders) || activeOrders.length === 0) {
      return false;
    }

    const latestOrder = activeOrders[0];
    const orderNumStr = await getSequentialOrderNum(latestOrder);
    const rawName = latestOrder.clientName || '';
    const cleanName = (rawName && !rawName.includes('زبون الواتساب') && !rawName.includes('زبون المحادثة'))
      ? rawName.replace(/\(واتساب:[^\)]+\)/g, '').trim()
      : '';
    const clientNameStr = cleanName ? ` ${cleanName}` : '';
    const cleanProd = (latestOrder.product || '').replace(/\(واتساب:[^\)]+\)/g, '').trim();

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

    const promptMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${clientNameStr}.\nتلقينا طلبك لإلغاء الطلبية:\n\n• أحدث طلبية مسجلة باسمك هي رقم: #${orderNumStr}\n• المنتجات: ${cleanProd}\n• الولاية: ${latestOrder.wilaya || ''}\n\nهل أنت متأكد أنك تريد إلغاء هذه الطلبية بالتحديد؟\n\n👉 رد بـ *تأكيد الإلغاء* (أو *نعم*) لإلغاء هذه الطلبية.\n👉 رد بـ *ليست هذه* (أو *لا*) للبحث في طلبيتك السابقة.`;

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
    if (['anuler', 'annuler', 'anule', 'annule', 'الغي', 'ألغي', 'إلغاء', 'الغاء', 'lala', 'لا اريد', 'لاريد'].some(k => rawLower.includes(k) || normText.includes(k))) {
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

    const pendingOrders = await orderCheckRes.json();
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

              const storeAddressDisplay = storeSettings.address || "ولاية الشلف (Chlef)";
              const storeMapsUrl = storeSettings.googleMapsUrl || storeSettings.googleMaps || "https://maps.app.goo.gl/algeria-pyjama-dz";
              const storeInstaUrl = storeSettings.instagramUrl || storeSettings.instagram || "https://www.instagram.com/pyjama_dz";
              const storeName = storeSettings.storeName || "Pyjama DZ";

              // 🎙️ VOICE NOTE / AUDIO HANDLER
              if (messageType === 'audio' || messageType === 'voice') {
                const audioId = message.audio?.id || message.voice?.id;
                console.log(`Received Audio Note / Vocal (${audioId}) from ${fromPhone}`);
                
                if (audioId) {
                  const media = await downloadMetaMedia(audioId);
                  if (media && media.base64) {
                    let audioPrompt = `أنت أداة تفريغ صوتي. فرغ الكلمات المسموعة بالدارجة الجزائرية بدون اختراع وبدون إيموجي.`;
                    const systemInstruction = "أنت أداة تفريغ صوتي بالدارجة الجزائرية. أخرج النص المسموع فقط وبدون إيموجي كلياً.";
                    
                    let transcript = await generateGeminiAudio(media.base64, media.mimeType, audioPrompt, systemInstruction);
                    if (transcript) {
                      console.log(`Vocal Transcription for ${fromPhone}: ${transcript}`);
                      if (!transcript.includes("غير_مفهوم") && !transcript.includes("غير مفهوم")) {
                        messageText = transcript;
                      }
                    }
                  }
                }

                if (!messageText) {
                  messageText = "مرحباً، أرسلت رسالة صوتية واستفساراً عن المنتجات والطلبيات والأسعار.";
                }
              }

              if (!messageText) continue;
              console.log(`Received message from ${fromPhone}: ${messageText}`);

              // A. WORKER STOCK RESTOCK via DIRECT REPLY ONLY
              let refMatch = messageText.match(/\[REF:([^:]+):([^:]+):([^:]+)\]/);
              
              if (!refMatch && message.context?.id) {
                const contextAlert = await getStockAlertByMsgId(message.context.id);
                if (contextAlert) {
                  refMatch = [null, contextAlert.productId, String(contextAlert.colorIdx), contextAlert.size];
                } else {
                  const latestAlert = await getLatestStockAlertForPhone(fromPhone);
                  if (latestAlert) {
                    refMatch = [null, latestAlert.productId, String(latestAlert.colorIdx), latestAlert.size];
                  }
                }
              }

              if (refMatch) {
                const productId = refMatch[1];
                const colorIdx = parseInt(refMatch[2]);
                const size = refMatch[3];
                const alertKey = `${productId}_${colorIdx}_${size}`;

                // Check if THIS SPECIFIC WHATSAPP ALERT MESSAGE was ALREADY resolved to prevent duplicate restocking
                let isAlreadyResolved = false;
                if (message.context?.id) {
                  try {
                    const msgRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_resolved_${message.context.id}&select=value`, {
                      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                    });
                    const msgRows = await msgRes.json();
                    if (Array.isArray(msgRows) && msgRows[0]?.value) {
                      isAlreadyResolved = true;
                    }
                  } catch (e) {}
                }

                if (isAlreadyResolved) {
                  await sendWhatsAppMessage(fromPhone, `*متجر Pyjama DZ*\n\n⚠️ *تنبيه: تم تحديث هذا المخزون سابقاً!*\nلم يتم تكرار الإضافة لتفادي الخطأ.`);
                  continue;
                }

                let addedQty = 0;
                const textWithoutTag = messageText.replace(/\[REF:[^\]]+\]/gi, '');
                const qtyMatch = textWithoutTag.match(/(\d{1,4})/);
                if (qtyMatch) {
                  addedQty = parseInt(qtyMatch[1]);
                }

                if (!isNaN(addedQty) && addedQty > 0) {
                  const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                  });
                  const prods = await prodRes.json();
                  const product = Array.isArray(prods) ? prods[0] : null;

                  if (product && Array.isArray(product.colorVariants) && product.colorVariants[colorIdx]) {
                    const updatedVariants = [...product.colorVariants];
                    const currentQty = updatedVariants[colorIdx].stock?.[size] || 0;
                    const newQty = currentQty + addedQty;

                    updatedVariants[colorIdx] = {
                      ...updatedVariants[colorIdx],
                      stock: { ...(updatedVariants[colorIdx].stock || {}), [size]: newQty }
                    };

                    // Mark THIS SPECIFIC WHATSAPP ALERT MESSAGE as RESOLVED so replying to it again is blocked
                    if (message.context?.id) {
                      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                        method: 'POST',
                        headers: {
                          'apikey': SUPABASE_KEY,
                          'Authorization': `Bearer ${SUPABASE_KEY}`,
                          'Content-Type': 'application/json',
                          'Prefer': 'resolution=merge-duplicates'
                        },
                        body: JSON.stringify({
                          key: `alert_resolved_${message.context.id}`,
                          value: JSON.stringify({ resolvedAt: Date.now(), addedQty, newQty })
                        })
                      });
                    }

                    await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                      method: 'POST',
                      headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                      },
                      body: JSON.stringify({
                        key: `alert_state_${alertKey}`,
                        value: JSON.stringify({ qty: newQty, timestamp: Date.now(), isResolved: false })
                      })
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

                    // Notify waiting customers about restock
                    await notifyWaitingCustomers(productId, colorIdx, size, newQty);
                    continue;
                  }
                }
              }

              const normText = normalizeText(messageText);
              const rawLowerText = String(messageText).toLowerCase();

              // RECLAMATION HANDLER (Only for explicit complaints/reclamations)
              const complaintKeywords = [
                'شكوى', 'عتاب', 'ناقص', 'مكسور', 'رادي', 'ما وصلنيش', 'خاسر', 'تأخرت', 'مغشوش',
                'مقطوع', 'فسد', 'وصلت ناقصة', 'وصلت خاسرة', 'سلعة خاسرة', 'خدمة سيئة',
                'reclamation', 'réclamation', 'مغشوشة', 'زبل', 'probleme', 'problème', 'cassé', 'casse',
                'retard', 'retarde', 'degueulasse', 'nul', 'nulle', 'zbel', 'khaser', 'khasra'
              ];

              const isComplaint = complaintKeywords.some(k => normText.includes(k) || rawLowerText.includes(k));

              if (isComplaint) {
                const rawContactName = order?.clientName || value?.contacts?.[0]?.profile?.name || '';
                const greetingName = (rawContactName && rawContactName.trim() !== '' && rawContactName !== 'زبون المحادثة' && rawContactName !== 'زبون الواتساب')
                  ? ` ${rawContactName.trim()}`
                  : '';

                const complaintMsg = `أهلاً وسهلاً بك${greetingName}.\nتم تسجيل شكواك وملاحظتك بنجاح لدى فريق خدمة العملاء وسيتم التواصل معك ومتابعة الأمر فوراً. شكراً لصبرك معنا. 🌸`;
                await sendWhatsAppMessage(fromPhone, complaintMsg);

                // Save reclamation to Supabase settings table
                try {
                  const existingRecl = Array.isArray(storeSettings.reclamations) ? storeSettings.reclamations : [];
                  const newRecl = {
                    id: 'REC-WA-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    clientName: rawContactName || 'زبون الواتساب',
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
              const isWholesale = ["gros", "جملة", "بالجملة", "كابة", "تجارة", "سيري", "serie", "سيريات", "كمية", "كميات", "grosiste", "grossiste", "بيع بالجملة", "شراء بالجملة"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              let salesModeRules = isWholesale
                ? "تنبيه حتمي: الزبون يسأل عن البيع بالجملة (Gros). يجب حتماً إعطاؤه وتوجيهه لرابط صفحة الجملة المخصص للشراء بالجملة مباشرة وهو: https://pyjama-dz.vercel.app/gros وإخباره بأنه إذا أراد الشراء بالجملة يجب أن يدخل ويطلب مباشرة من هذا الموقع المخصص للجملة."
                : "الزبون زبون عادي بالقطعة. أجب عن سؤاله من بيانات النظام فقط.";

              let prompt = `رسالة الزبون: "${messageText}"`;
              if (isWholesale) {
                prompt += `\n(تذكير صارم: الزبون يسأل عن الجملة Gros، أعطه رابط صفحة الجملة المخصص مباشرة: https://pyjama-dz.vercel.app/gros ووجهه للطلب منها).`;
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
                  prompt += `\n\nمعلومات طلب الزبون الحالي من الداتابيز:\n- الاسم: ${exOrder.clientName || ''}\n- رقم الطلب: #${exOrderNum}\n- المنتج: ${exOrder.product}\n- الولاية: ${exOrder.wilaya}\n- الحالة الحالية: ${exOrder.status}\nإذا طلب الزبون تأكيد هاد الطلبية أو قال (أكدلي/akedli/مالا/ملا)، أجب بأن الطلبية رقم #${exOrderNum} مسجلة ومؤكدة وجاري شحنها، ولا تطلب منه البيانات من جديد إطلاقاً.`;
                }
              } catch (e) {
                console.error("Error fetching order context for AI:", e);
              }

              const catalogSummary = products.map(p => {
                let colorsStr = "متوفر";
                if (Array.isArray(p.colorVariants) && p.colorVariants.length > 0) {
                  colorsStr = p.colorVariants.map(cv => {
                    const colorName = cv.name || cv.color || 'rouge (أحمر)';
                    if (typeof cv.stock === 'object' && cv.stock !== null) {
                      const sizesStr = Object.entries(cv.stock).map(([sz, qty]) => {
                        const numQ = Number(qty || 0);
                        return `${sz}: ${numQ > 0 ? numQ + ' حبة (متوفر)' : '0 حبة (غير متوفر/نافذ)'}`;
                      }).join(', ');
                      return `اللون (${colorName}): [${sizesStr}]`;
                    } else {
                      const numQ = Number(cv.stock || 0);
                      return `اللون (${colorName}): ${numQ > 0 ? numQ + ' حبة (متوفر)' : '0 حبة (غير متوفر/نافذ)'}`;
                    }
                  }).join(' | ');
                }
                return `- ${p.title}: السعر ${p.price} دج | السطوك الحقيقي حسب المقاسات والألوان: ${colorsStr}`;
              }).join('\n');
              const settingsSummary = Object.entries(storeSettings).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');

function checkStockInquiry(messageText, products) {
  if (!messageText || !Array.isArray(products) || products.length === 0) return null;
  const norm = normalizeText(messageText);
  const rawLower = String(messageText).toLowerCase();

  const sizeMatch = rawLower.match(/(?:taille|مقاس|تراي|تياي|مكاس|تراس)?\s*\b(3xl|xxxl|2xl|xxl|xl|l|m|s)\b/i);
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
              return `للأسف المقاس (${reqSize}) في اللون (${cv.name || cv.color}) غير متوفر حالياً في السطوك.\nلقد قمنا بتسجيل طلبك وسنحيطك علماً فوراً عبر الواتساب بمجرد توفره مجدداً. شكراً لانتظارك 🌸`;
            }
          }
        }
      }
    }
  }
  return null;
}

const systemInstruction = `أنت مساعد ومسؤول خدمة العملاء المحترف لمتجر (${storeName}).
تتحدث بالدارجة الجزائرية الفصيحة والمحترمة وتدردش مع الزبون بذكاء ولباقة كأنك إنسان حقيقي يشتغل في المتجر.
افهم كل أسئلة الزبون بذكاء ومرونة وبأسلوب بشري طبيعي ولبق (سواء كتب بالدارجة، الفرنسية، الفرانكو "Franco-Arabic"، أو العربية).

قواعد الاستجابة وتوجيه الزبون:
1. قانون صارم وحتمي: الطلبيات تتم حصرياً ومباشرة عبر موقعنا الرسمي (https://pyjama-dz.vercel.app). يمنع منعاً باتاً إنشاء أو تسجيل أي طلبية جديدة داخل الشات. إذا أراد الزبون الشراء أو الطلب (مثل: نطلب، ندير كوماند، حاب نشري، commande، oui، نعم): وجهه مباشرة لرابط الموقع الرسمي للشراء واختيار المقاس واللون منه مباشرة: https://pyjama-dz.vercel.app
2. إذا كان للزبون طلبية سابقة مسجلة في الداتابيز من الموقع ويريد تأكيدها (مثل: أكدلي، aked, confirme): أخرج الكود: [ACTION:CONFIRM_ORDER] ثم اكتب رد التأكيد بالدارجة.
3. إذا أراد الزبون إلغاء طلبيته المسجلة من الموقع (مثل: الغي، anuler, annuler): أخرج الكود: [ACTION:CANCEL_ORDER] ثم اكتب رد الإلغاء بالدارجة.
4. إذا طلب الزبون صور المنتجات (صور، تصاوير، photo، tsswira): أخرج الكود: [ACTION:SEND_PHOTOS] ووجهه للموقع لرؤية كافة الصور والموديلات المتوفرة.
5. استفسارات المكان والمقر والعنوان: أعطه العنوان ورابط خرائط جوجل من بيانات النظام.
6. استفسارات أرقام الهاتف: أعطه أرقام الهاتف الرسمية المكتوبة في بيانات النظام.
7. استفسارات الأسعار والمقاسات والألوان والجودة: أجب بأسلوب لطيف بالدارجة الجزائرية ووجهه للموقع الرسمي لتصفح كافة الصور والأسعار والطلب مباشرة: https://pyjama-dz.vercel.app

بيانات المتجر:
- العنوان والمقر: ${storeAddressDisplay}
- رابط خرائط جوجل: ${storeMapsUrl}
- رابط الموقع الرسمي: https://pyjama-dz.vercel.app
- رابط صفحة الجملة (Gros): https://pyjama-dz.vercel.app/gros
${settingsSummary}

قائمة المنتجات والأسعار والسطوك الحالية من الداتابيز:
${catalogSummary}
${salesModeRules}`;

              // 0. Check for 0-stock size query first
              const outOfStockReply = checkStockInquiry(messageText, products);
              if (outOfStockReply) {
                await sendWhatsAppMessage(fromPhone, outOfStockReply);
                await recordOutOfStockInquiry(fromPhone, messageText, products);
                continue;
              }

              // 1. Check for web order confirmation or cancellation reply from customer FIRST
              const handledOrderConfirm = await processOrderConfirmationIntent(fromPhone, messageText);
              if (handledOrderConfirm) continue;

              const handledOrderCancel = await processOrderCancellationIntent(fromPhone, messageText);
              if (handledOrderCancel) continue;

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
                await sendWhatsAppMessage(fromPhone, "تفضل خويا، تم إرسال صور الموديلات المتوفرة أعلاه في المحادثة. يمكنك تصفح باقي المنتجات والألوان عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app");
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

              // Check if any product is low on stock and alert managers
              if (products.length > 0) {
                for (const p of products.slice(0, 3)) {
                  await checkAndAlertLowStock(p, storeSettings);
                }
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
