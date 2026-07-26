const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSN9Rooekd1lKmgx8A7xTzFFeeXzZAsTy3fvs7uU2vxvQSWZB3yodqaTmhHKEPfx5sNh94oAjj58l5bVDPtOMkVlkZAdGfXKkGczFpdFXM6011NK7OFrfZBlAzp5AlhUnwWwc4wQcWRapawp4pXnnFTvYLZBa3hE7UKe99VmaNGGDPtD8LudZCA6sfZAStJ2bqZBe6EIXx05WfwRarZCxkKC6jWSkKZB6JsYKhPbG2lAB5OxgcdyOiqu8HYcFKdyk5ffUXg8y9wZACf8';

const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';

let cachedToken = null;
let lastTokenFetch = 0;

async function getMetaAccessToken() {
  const now = Date.now();
  if (cachedToken && (now - lastTokenFetch < 5 * 60 * 1000)) {
    return cachedToken;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.meta_access_token`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0] && data[0].value && data[0].value.length > 20) {
      cachedToken = data[0].value.trim();
      lastTokenFetch = now;
      return cachedToken;
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
    const url = `${SUPABASE_URL}/rest/v1/products?select=*`;
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
    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
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

  // 1. PHONE NUMBERS QUERY
  if (['numero', 'nomer', 'num', 'nomro', 'nomiro', 'هاتف', 'رقم', 'ارقام', 'نميرو', 'نومرو', 'tel', 'phone'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `أرقام التواصل والواتساب الرسمية للمتجر:\n${formattedPhonesBullets}\n\nنحن في خدمتك دائماً.`;
  }

  // 2. LOCATION QUERY
  if (['win jayiin', 'win jayin', 'مقر', 'عنوان', 'موقع', 'بلاصة', 'لوكيشن', 'اللوكيشن', 'chlef', 'الشلف'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `المقر والعنوان: ${address}.\nرابط خرائط جوجل (Google Maps):\n${mapsUrl}\n\nالتوصيل متوفر لجميع 58 ولاية حتى باب المنزل. كيف يمكننا مساعدتك اليوم؟`;
  }

  // 3. REAL-TIME PRODUCT ITEM / COLOR / STOCK CHECKER
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

  // 4. PRICES / CATALOG
  if (['prix', 'سعر', 'اسعار', 'سومة', 'شحال', 'بكم', 'منتجات', 'موديلات', 'بيجامة', 'بيجامات', 'سلعة'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `تفضل بتصفح كافة الصور، المقاسات، الألوان والأسعار المتوفرة حالياً عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app\n\nأسعارنا مناسبة جداً والتوصيل متوفر لجميع الولايات.`;
  }

  // 5. DELIVERY
  if (['livraison', 'توصيل', 'شحن', 'نوصلو', 'ولاية', 'ديكسبريس', 'يالادين'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `التوصيل متوفر لجميع 58 ولاية حتى باب المنزل أو المكتب.\nالدفع يكون عند الاستلام بعد معاينة طلبك.`;
  }

  // 6. WHOLESALE
  if (['gros', 'جملة', 'بالجملة', 'سيري', 'تجارة'].some(k => norm.includes(k) || pLower.includes(k))) {
    return `البيع بالجملة متوفر بالسيريات والكميات لصحاب المحلات والتجارة.\nيمكنك تصفح الموقع أو التواصل معنا عبر الهاتف للمزيد من التفاصيل: https://pyjama-dz.vercel.app`;
  }

  return `أهلاً وسهلاً بك. تفضل بالاستفسار عن أي موديل أو مقاس أو سعر، نحن في خدمتك.\nرابط الموقع الرسمي: https://pyjama-dz.vercel.app`;
}

async function generateGeminiAI(prompt, systemInstruction = "", storeSettings = {}, userMessage = "", products = []) {
  const modelEndpoints = ['gemini-flash-latest', 'gemini-2.0-flash'];
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
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
          })
        });

        if (res.status === 200) {
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          const textParts = parts.filter(p => p.text && !p.thought).map(p => p.text).filter(Boolean);
          const text = textParts.join('');
          if (text) return removeEmojis(text.trim());
        } else {
          console.error(`Gemini AI status for ${model}: ${res.status}`);
        }
      } catch (err) {
        console.error('Gemini error:', err);
      }
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

    const uploadRes = await fetch(`https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/media`, {
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
  const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
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
      const waitlistRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?status=in.(pending,en_attente,out_of_stock)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      waitlistEntries = await waitlistRes.json();
      if (!Array.isArray(waitlistEntries)) waitlistEntries = [];
    } catch (e) {
      waitlistEntries = [];
    }

    const notifiedPhones = new Set();

    const isProdMatch = (targetId, targetTitle, orderId, orderText) => {
      if (targetId && orderId && String(targetId) === String(orderId)) return true;
      const nTarget = normalizeText(targetTitle);
      const nOrder = normalizeText(orderText);
      if (nTarget && nOrder) {
        if (nOrder.includes(nTarget) || nTarget.includes(nOrder)) return true;
        const tw = nTarget.split(/\s+/).filter(w => w.length >= 3);
        const ow = nOrder.split(/\s+/).filter(w => w.length >= 3);
        if (tw.some(w => ow.includes(w))) return true;
      }
      if (!targetId && !targetTitle) return true;
      if (!orderId && !orderText) return true;
      return false;
    };

    const isSzMatch = (targetSz, orderSz, orderText) => {
      if (!targetSz) return true;
      const nTarget = String(targetSz).trim().toUpperCase();
      const nOrder = String(orderSz || '').trim().toUpperCase();
      if (!nOrder) {
        if (!orderText) return true;
        const nOt = String(orderText).toUpperCase();
        return nOt.includes(nTarget) || nOt.includes('ALL') || nOt.includes('STANDARD');
      }
      return nOrder === nTarget || nOrder === 'STANDARD' || nTarget === 'STANDARD';
    };

    for (const order of orders) {
      if (availableQty <= 0) break;
      const items = Array.isArray(order.items) ? order.items : [];
      const item = items[0] || {};
      const orderSize = (item.size || order.size || '');
      const orderProdId = item.productId || item.product_id || order.productId || order.product_id;
      const orderProdText = item.product || item.title || order.product || '';

      const sizeMatches = isSzMatch(targetSize, orderSize, orderProdText);
      const prodMatches = isProdMatch(productId, productTitle, orderProdId, orderProdText);

      if (sizeMatches && prodMatches && order.phone) {
        await updateOrderStatusAndArchive(order.id, 'confirmee');
        
        const orderNumStr = await getSequentialOrderNum(order);
        const clientNameStr = (order.clientName && order.clientName !== 'زبون الواتساب' && order.clientName !== 'زبون المحادثة')
          ? order.clientName : '';
        const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
        const prodDesc = productTitle ? ` في موديل ${productTitle}` : '';

        const restockMsg = `أهلاً بك${nameGreeting}.\nبشرى سارة، توفر مقاسك (${targetSize}) مجدداً${prodDesc}.\nتم تأكيد طلبيتك رقم #${orderNumStr} بنجاح وجاري تجهيزها للشحن. شكراً لانتظارك.`;
        
        const cleanPhone = order.phone.replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('213') ? cleanPhone : cleanPhone.replace(/^0/, '213');
        await sendWhatsAppMessage(waPhone, restockMsg);
        notifiedPhones.add(waPhone);

        availableQty = Math.max(0, availableQty - 1);

        if (productId && colorIdx >= 0) {
          const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          const prods = await prodRes.json();
          const product = Array.isArray(prods) ? prods[0] : null;
          if (product && Array.isArray(product.colorVariants) && product.colorVariants[colorIdx]) {
            const updatedVariants = [...product.colorVariants];
            updatedVariants[colorIdx] = {
              ...updatedVariants[colorIdx],
              stock: { ...(updatedVariants[colorIdx].stock || {}), [size]: availableQty }
            };
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
          }
        }
      }
    }

    if (availableQty > 0) {
      for (const entry of waitlistEntries) {
        if (availableQty <= 0) break;
        const entryPhone = entry.whatsapp_number || entry.phone;
        const cleanPhone = entryPhone ? entryPhone.replace(/\D/g, '') : '';
        const waPhone = cleanPhone.startsWith('213') ? cleanPhone : cleanPhone.replace(/^0/, '213');
        if (!waPhone || notifiedPhones.has(waPhone)) continue;

        const entrySize = entry.size || '';
        const entryProdId = entry.product_id || entry.productId;
        const entryProdText = entry.product_title || entry.product || '';

        const sizeMatches = isSzMatch(targetSize, entrySize, entryProdText);
        const prodMatches = isProdMatch(productId, productTitle, entryProdId, entryProdText);

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

      await createChatOrderInSupabase({
        clientName: 'زبون الواتساب',
        phone: cleanPhone,
        wilaya: 'الشلف',
        commune: 'المركز',
        product: `${prodTitle}${matchedColor ? ' - ' + matchedColor : ''}${sizeStr ? ' (' + sizeStr + ')' : ''}`,
        color: matchedColor,
        size: sizeStr,
        productId: matchedProduct?.id,
        items: [{
          productId: matchedProduct?.id,
          product: prodTitle,
          color: matchedColor,
          size: sizeStr,
          qty: 1,
          price: Number(matchedProduct?.price || 0)
        }],
        price: Number(matchedProduct?.price || 0),
        deliveryCompany: 'Livraison Domicile',
        status: 'en_attente_stock'
      });
      console.log(`Auto-recorded out of stock inquiry: Phone=${cleanPhone}, Size=${sizeStr}, Product=${prodTitle}`);
    }
  } catch (err) {
    console.error('Error recording out of stock inquiry:', err);
  }
}

async function processDirectOrderFromMessage(fromPhone, messageText, products) {
  try {
    const normText = normalizeText(messageText);
    const pLower = (messageText || '').toLowerCase();

    // Inquiry / Question check: If message asks a question or includes inquiry keywords, it is NOT an order placement
    const isQuestion = messageText.includes('?') || messageText.includes('؟') ||
      ['وينتا', 'وقتاش', 'متى', 'كيفاه', 'كيفاش', 'شحال', 'qualité', 'كاليتي', 'نوعية', 'وصلت', 'تصلني', 'وين راهي', 'مكان', 'وصلتني'].some(k => normText.includes(k) || pLower.includes(k));

    if (isQuestion) return false;

    const phoneMatch = messageText.match(/(0[567]\d{8})/);
    const wilayas = ["ادرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "بليدة", "بويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "مدية", "مستغانم", "مسيلة", "معسكر", "ورقلة", "وهران", "بيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "نعامة", "عين تموشنت", "غرداية", "غليزان", "المغير", "المنيعة", "أولاد جلال", "برج باجي مختار", "بني عباس", "تيميمون", "تقرت", "جانت", "إن صالح", "إن قزام", "alger", "oran", "blida", "chlef", "setif", "constantine"];
    const wilayaMatch = wilayas.find(w => normText.includes(w.toLowerCase()) || pLower.includes(w.toLowerCase()));

    // Explicit order intent keywords (MUST express intention to place/register an order)
    const explicitOrderKeywords = [
      'حاب ندير كوموند', 'حاب نطلب', 'سجللي كوموند', 'سجل طلبية', 'ندير كوموند', 'نطلب بيجامة',
      'ارسللي', 'ابعثلي كوموند', 'passer commande', 'commander', 'نطلبها'
    ];

    const hasExplicitOrderIntent = explicitOrderKeywords.some(k => normText.includes(k) || pLower.includes(k));
    const sizeMatchForCheck = messageText.match(/(?:pointure|مقاس|حجم|قياس|taille|size)\s*[:=]?\s*(\d{2}|S|M|L|XL|2XL|3XL|4XL)/i) || messageText.match(/\b(3[5-9]|4[0-8]|S|M|L|XL|2XL|3XL|4XL)\b/i);
    const hasFullDetails = phoneMatch && wilayaMatch && sizeMatchForCheck;

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
  const norm = normalizeText(messageText);
  const pLower = (messageText || '').toLowerCase();
  const photoKeywords = [
    'صورة', 'صور', 'تصويرة', 'تصاوير', 'photo', 'photos', 'image', 'images', 'شوف', 'نشوف', 'وريني', 'بعثلي', 'ابعثلي',
    'tsswiira', 'tswira', 'taswira', 'tsoira', 'tsawir', 'tasawir', 'pic', 'pics', 'picture', 'pictures', 'tbeathli', 'tb3athlii', 'beathli', 'tbeath'
  ];
  
  if (!photoKeywords.some(k => norm.includes(k) || pLower.includes(k))) return false;

  // 1. Filter products if user asked for a specific product title
  let targetProducts = products || [];
  if (Array.isArray(products) && products.length > 0) {
    const specificMatches = products.filter(p => {
      const titleNorm = normalizeText(p.title || '').toLowerCase();
      const titleRaw = (p.title || '').toLowerCase();
      return pLower.includes(titleRaw) || norm.includes(titleNorm);
    });

    if (specificMatches.length > 0) {
      targetProducts = specificMatches;
    }
  }

  // 2. Collect unique images per target product (1 photo per requested product)
  const matchedImages = [];
  const seenImageKeys = new Set();

  targetProducts.forEach(p => {
    let productImgsCount = 0;
    const rawImgs = p.images || p.image;

    const addImg = (img, caption) => {
      if (img && typeof img === 'string' && productImgsCount < 1) {
        const fullUrl = (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:image')) 
          ? img 
          : `https://pyjama-dz.vercel.app${img.startsWith('/') ? '' : '/'}${img}`;
        
        const dedupeKey = fullUrl.slice(0, 100);
        if (!seenImageKeys.has(dedupeKey)) {
          seenImageKeys.add(dedupeKey);
          matchedImages.push({ url: fullUrl, caption });
          productImgsCount++;
        }
      }
    };

    if (Array.isArray(rawImgs)) {
      rawImgs.forEach(img => addImg(img, `${p.title} - السعر: ${p.price} دج`));
    } else if (typeof rawImgs === 'string' && rawImgs.trim()) {
      addImg(rawImgs, `${p.title} - السعر: ${p.price} دج`);
    }

    const variants = p.colorVariants || p.colorvariants;
    if (Array.isArray(variants) && productImgsCount === 0) {
      variants.forEach(cv => {
        const cvImg = cv.image || cv.imageUrl || cv.img;
        if (cvImg) {
          addImg(cvImg, `${p.title} (${cv.name || cv.color || ''}) - السعر: ${p.price} دج`);
        }
      });
    }
  });

  if (matchedImages.length === 0 && Array.isArray(products) && products.length > 0) {
    const p = products[0];
    matchedImages.push({
      url: "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=800&q=80",
      caption: `${p.title || 'بيجامات فاخرة'} - السعر: ${p.price || 3200} دج`
    });
  }

  if (matchedImages.length > 0) {
    let sentCount = 0;
    for (const item of matchedImages.slice(0, 3)) {
      console.log('Sending product image to WhatsApp:', item.url.slice(0, 50));
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
  
  const boutiquePhone = storeSettings.whatsappBoutiqueManager || "0554128933";
  const livraisonPhone = storeSettings.whatsappLivraisonManager || storeSettings.whatsapp || "0554128933";

  for (let cIdx = 0; cIdx < product.colorVariants.length; cIdx++) {
    const variant = product.colorVariants[cIdx];
    if (!variant || !variant.stock) continue;

    for (const [size, qty] of Object.entries(variant.stock)) {
      const numQty = parseInt(qty);
      if (!isNaN(numQty) && numQty <= 5 && numQty >= 0) {
        // Destination manager: if variant is marked as boutique vs delivery
        const isBoutiqueStock = String(variant.name || '').toLowerCase().includes('حانيت') || String(variant.name || '').toLowerCase().includes('boutique');
        const targetPhone = isBoutiqueStock ? boutiquePhone : livraisonPhone;

        const alertMsg = `*تنبيه مخزون منخفض (سطوك 5 حبات أو أقل)*\n\n• المنتج: ${product.title}\n• اللون: ${variant.name || 'الافتراضي'}\n• المقاس: ${size}\n• الكمية المتبقية: ${numQty} قطع فقط.\n\nللإضافة في المخزون، قم بالرد على هذه الرسالة برقم الكمية المضافة فقط (مثال: 15).\n[REF:${product.id}:${cIdx}:${size}]`;
        
        const alertRes = await sendWhatsAppMessage(targetPhone, alertMsg);
        if (alertRes && Array.isArray(alertRes.messages) && alertRes.messages[0]) {
          await saveStockAlertRecord(alertRes.messages[0].id, targetPhone, product.id, cIdx, size);
        }
      }
    }
  }
}

async function processRestockConfirmationIntent(fromPhone, messageText, products) {
  try {
    const normText = normalizeText(messageText).toLowerCase().trim();
    const pLower = (messageText || '').toLowerCase().trim();

    const isConfirmIntent = [
      'نعم', 'نعك', 'إيه', 'ايه', 'تأكيد', 'أكد', 'تاكيد', 'حاب نشري', 'نعم حاب',
      'ديها', 'بعثهالي', 'ابعثهالي', 'yes', 'ok', 'oui', 'مشري', 'حاب نديها', 'نديها',
      'aked', 'akedli', 'akedha', 'akedhali', 'akidli', 'akid', 'akedna', 'confirmi',
      'confirm', 'confirmer', 'akedlih', 'اكدلي', 'أكدلي', 'اكدها', 'أكدها', 'ثبتها',
      'ثبتلي', 'ملا', 'مالا', 'صح', 'اوكي', 'ماذا بيك', 'ابعث'
    ].some(k => normText === k || pLower === k || normText.includes(k) || pLower.includes(k));

    if (!isConfirmIntent) return false;

    const localPhone = fromPhone.replace(/^\+?213/, '0');
    const fullPhone = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;

    // 1. Check waitlist table FIRST for waiting customer
    let waitlistEntry = null;
    try {
      const wRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?whatsapp_number=in.(${localPhone},${fromPhone},${fullPhone})&status=in.(notified,pending,en_attente,out_of_stock)&order=created_at.desc&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const waitlistEntries = await wRes.json();
      if (Array.isArray(waitlistEntries) && waitlistEntries.length > 0) {
        waitlistEntry = waitlistEntries[0];
      }
    } catch (e) {}

    let order = null;

    if (waitlistEntry) {
      // Find matching product in catalog for price & details
      const entryTitle = waitlistEntry.product_title || waitlistEntry.product || '';
      const matchedProd = (products || []).find(p => {
        const titleNorm = normalizeText(p.title || '').toLowerCase();
        return titleNorm && normalizeText(entryTitle).toLowerCase().includes(titleNorm);
      }) || products?.[0];

      const itemPrice = matchedProd?.price ? Number(matchedProd.price) : 3500;
      const prodNameStr = `${entryTitle || matchedProd?.title || 'بيجامات فاخرة'} (${waitlistEntry.color ? waitlistEntry.color + ' - ' : ''}${waitlistEntry.size || 'M'})`;

      // Create ONE REAL CONFIRMED ORDER in orders table!
      const createRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          clientName: waitlistEntry.client_name || 'زبون الواتساب',
          phone: localPhone,
          wilaya: waitlistEntry.wilaya || 'الشلف',
          commune: waitlistEntry.commune || '',
          deliveryMode: 'home',
          deliveryCompany: 'Livraison Domicile',
          product: prodNameStr,
          price: itemPrice,
          quantity: 1,
          status: 'confirmee',
          archived: true,
          created_at: new Date().toISOString(),
          items: [{
            productId: matchedProd?.id,
            product: entryTitle || matchedProd?.title,
            color: waitlistEntry.color,
            size: waitlistEntry.size,
            price: itemPrice,
            qty: 1
          }]
        })
      });

      const newOrderData = await createRes.json();
      if (Array.isArray(newOrderData) && newOrderData[0]) {
        order = newOrderData[0];
      }

      // Mark waitlist entry as confirmed
      await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${waitlistEntry.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'confirmed' })
      });
    }

    if (!order) {
      // Fallback: Check pending orders
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone})&status=in.(nouvelle,nouvel,new,pending,en_attente_confirmation,attente_confirmation,attente_confirmation_restock,en_attente_stock,pending_stock)&order=created_at.desc&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const pendingOrders = await res.json();
      if (Array.isArray(pendingOrders) && pendingOrders[0]) {
        order = pendingOrders[0];
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'confirmee', archived: true })
        });
      }
    }

    if (!order) return false;

    // Deduct stock in Supabase for matched product
    if (Array.isArray(products) && products.length > 0) {
      const items = Array.isArray(order.items) ? order.items : [];
      const item = items[0] || {};
      const orderProdText = item.product || order.product || '';
      const orderSize = item.size || order.size || '';
      const orderColor = item.color || order.color || '';

      const matchedProducts = products.filter(p => {
        const titleNorm = normalizeText(p.title || '').toLowerCase();
        return titleNorm && normalizeText(orderProdText).toLowerCase().includes(titleNorm);
      });

      for (const matchedProd of matchedProducts) {
        if (matchedProd && Array.isArray(matchedProd.colorVariants)) {
          const updatedVariants = [...matchedProd.colorVariants];
          const vIdx = updatedVariants.findIndex(v => {
            const vColor = normalizeText(v.color || v.name || '').toLowerCase();
            return !orderColor || vColor.includes(normalizeText(orderColor).toLowerCase());
          });

          const targetIdx = vIdx >= 0 ? vIdx : 0;
          const targetVariant = updatedVariants[targetIdx];
          if (targetVariant && targetVariant.stock) {
            const stockKeys = Object.keys(targetVariant.stock);
            const targetKey = stockKeys.find(k => k.trim().toLowerCase() === String(orderSize).trim().toLowerCase()) || stockKeys[0];
            if (targetKey && targetVariant.stock[targetKey] !== undefined) {
              const currentQty = Number(targetVariant.stock[targetKey] || 1);
              const newQty = Math.max(0, currentQty - 1);
              updatedVariants[targetIdx] = {
                ...targetVariant,
                stock: { ...targetVariant.stock, [targetKey]: newQty }
              };

              await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${matchedProd.id}`, {
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
        }
      }
    }

    const orderNumStr = await getSequentialOrderNum(order);
    const clientNameStr = (order.clientName && order.clientName !== 'زبون الواتساب') ? order.clientName : '';
    const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';

    const confirmMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nتم تأكيد طلبيتك رقم #${orderNumStr} بنجاح! 📦\n\n- المنتج: ${order.product || 'بيجامات فاخرة'}\n- المبلغ: ${order.price || 3500} د.ج\n- المكان: ${order.wilaya || 'الجزائر'}\n- التوصيل: ${order.deliveryCompany || 'Livraison Domicile'}\n\nجاري تجهيز طلبك وشحنه في أقرب وقت. شكراً لثقتك بنا!`;

    await sendWhatsAppMessage(fromPhone, confirmMsg);
    return true;
  } catch (err) {
    console.error('Error processing restock confirmation intent:', err);
  }
  return false;
}

async function processOrderConfirmationIntent(fromPhone, messageText) {
  try {
    if (!messageText) return false;
    const rawLower = String(messageText).toLowerCase().trim();
    const normText = normalizeText(messageText);

    const confirmKeywords = [
      'أكد', 'أكدلي', 'تأكيد', 'نؤكد', 'أكدها', 'نعم أكد', 'نعم أكدلي', 'مالا أكدلي', 'ملا أكدلي',
      'أكد الطلبية', 'تأكيد الطلبية', 'تأكيد الطلب', 'أكدلي الطلبية', 'أكدلي طلبية', 'أكدلي الطلب',
      'أكدلي خويا', 'أكد خويا', 'نعم أكدها', 'ملا أكدها', 'مالا أكدها', 'أكدها خويا', 'أكد هاد الطلبية',
      'aked', 'akedli', 'akedlii', 'akedha', 'confirme', 'confirmer', 'confirmation',
      'oui confirme', 'oui akedli', 'oui aked', 'daccord confirme'
    ];

    const isConfirmIntent = confirmKeywords.some(kw => normText.includes(kw) || rawLower.includes(kw));
    if (!isConfirmIntent) return false;

    const rawDigits = fromPhone.replace(/\D/g, '');
    const localPhone = rawDigits.startsWith('213') ? '0' + rawDigits.slice(3) : rawDigits;
    const fullPhone = fromPhone.startsWith('+') ? fromPhone : `+${fromPhone}`;

    const orderCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone})&status=in.(nouvelle,nouvel,new,pending,en_attente_confirmation,attente_confirmation,attente_confirmation_restock,en_attente_stock,pending_stock)&order=created_at.desc&limit=1`, {
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

    const confirmMsg = `*متجر Pyjama DZ*\n\nأهلاً وسهلاً بك${clientNameStr}! 🌸\nتم تأكيد طلبيتك رقم #${orderNumStr} بنجاح. 📦✨\nطلبيتك الآن مؤكدة وجاري تجهيزها للشحن والتوصيل. شكراً لثقتك بمتجرنا! ❤️`;

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

              // A. WORKER STOCK RESTOCK via REPLY
              let refMatch = messageText.match(/\[REF:([^:]+):([^:]+):([^:]+)\]/);
              
              if (!refMatch && message.context?.id) {
                const contextAlert = await getStockAlertByMsgId(message.context.id);
                if (contextAlert) {
                  refMatch = [null, contextAlert.productId, String(contextAlert.colorIdx), contextAlert.size];
                }
              }

              if (!refMatch) {
                const senderLast9 = fromPhone.replace(/\D/g, '').slice(-9);
                const managerPhones = [
                  storeSettings.whatsappBoutiqueManager,
                  storeSettings.whatsappLivraisonManager,
                  storeSettings.whatsapp,
                  storeSettings.phoneOrders,
                  storeSettings.phones,
                  "0554128933",
                  "0771335039"
                ].filter(Boolean).map(p => String(p).replace(/\D/g, '').slice(-9));

                const isManager = managerPhones.length === 0 || managerPhones.some(mp => mp && senderLast9.endsWith(mp));
                const pureNumMatch = messageText.match(/(?:^|\+|\s|^)(\d{1,4})(?:\s|$|حبة|حبات|piece|pcs)?/i);

                if (isManager && pureNumMatch) {
                  const lastAlert = await getLatestStockAlertForPhone(fromPhone);
                  if (lastAlert) {
                    refMatch = [null, lastAlert.productId, String(lastAlert.colorIdx), lastAlert.size];
                  }
                }
              }

              if (refMatch) {
                const productId = refMatch[1];
                const colorIdx = parseInt(refMatch[2]);
                const size = refMatch[3];
                
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
                    
                    await sendWhatsAppMessage(fromPhone, `*متجر Pyjama DZ*\n\nتم تحديث المخزون بنجاح.\n• المنتج: ${product.title}\n• اللون/المقاس: ${updatedVariants[colorIdx].name || ''} (${size})\n• الكمية المضافة: +${addedQty}\n• المخزون الحالي: ${newQty} حبة.`);

                    // Notify waiting customers about restock
                    await notifyWaitingCustomers(productId, colorIdx, size, newQty);
                    continue;
                  }
                }
              }

              const normText = normalizeText(messageText);

              // RECLAMATION & FEEDBACK HANDLER (Praise vs Complaint)
              const rawLowerText = String(messageText).toLowerCase();
              const praiseKeywords = [
                'شكرا', 'شكرااا', 'شكرا لكم', 'مشكور', 'بارك الله', 'يعطيكم الصحة', 'يعطيك الصحة',
                'ماشاء الله', 'مشاء الله', 'روعة', 'ما شاء الله', 'شكر', 'تسلم', 'تسلموا', 'ربي يحفظكم', 'ربي يوفقكم',
                'عجبني', 'عجبوني', 'عجبتني', 'شباب بزاف', 'ما شاء الله عليكم', 'يعطيك الصحه', 'الله يحفظك',
                'خدمة روعة', 'سلعة روعة', 'وصلتني روعة', 'بيجامة روعة', 'يعطيكم الصحه', 'هايل', 'هايلة', 'ممتاز', 'ممتازة',
                'machallah', 'machaallah', 'machalah', 'macha allah', 'macheallah',
                '3jbetni', '3jbetnii', '3jbatni', 'ajbatni', 'ejbetni', 'ejbetnii',
                'rbii yahfedkom', 'rbi yahfedkom', 'rbi yahfdkom', 'rbi yahfadkom', 'god bless',
                'nchaallah', 'nchallah', 'inshallah', 'inchallah',
                'qualite', 'qualité', 'bzeef', 'bzeeef', 'bzaf', 'bzaaf',
                'top', 'merci', 'bravo', 'bien', 'tres bien', 'très bien', 'magnifique',
                'sublime', 'super', 'parfait', 'fort', 'foor', 'tahya', 'chbab', 'chbaba',
                'hayla', 'hayel', 'zinek', 'ya3tikom', 'ya3tik'
              ];
              const complaintKeywords = [
                'مشكل', 'مشكلة', 'شكوى', 'عتاب', 'ناقص', 'مكسور', 'ماشي شباب', 'عيب', 'غلطة', 'رادي',
                'ما وصلنيش', 'خاسر', 'تأخرت', 'تأخير', 'مغشوش', 'صغيرة بزاف', 'كبيرة بزاف', 'مقطوع',
                'فسد', 'ما عجبنيش', 'ما عجبنيش الحجم', 'تأخر', 'وصلت ناقصة', 'وصلت خاسرة', 'سلعة خاسرة',
                'خدمة سيئة', 'توصيل بطيء', 'reclamation', 'réclamation', 'سوء', 'مغشوشة', 'زبل',
                'problem', 'probleme', 'problème', 'pas bien', 'mauvais', 'cassé', 'casse',
                'retard', 'retarde', 'degueulasse', 'nul', 'nulle', 'zbel', 'khaser', 'khasra',
                'mouskile', 'mouchkel', 'mouchkil'
              ];

              const hasPraise = praiseKeywords.some(k => normText.includes(k) || rawLowerText.includes(k));
              const hasComplaint = complaintKeywords.some(k => normText.includes(k) || rawLowerText.includes(k));

              const isPraise = hasPraise && !hasComplaint;
              const isComplaint = hasComplaint;

              const rawContactName = order?.clientName || value?.contacts?.[0]?.profile?.name || '';
              const greetingName = (rawContactName && rawContactName.trim() !== '' && rawContactName !== 'زبون المحادثة' && rawContactName !== 'زبون الواتساب')
                ? ` ${rawContactName.trim()}`
                : '';

              if (isPraise || isComplaint) {
                const unifiedMsg = `*متجر Pyjama DZ*\n\nأهلاً وسهلاً بك${greetingName}! 🌸\nنشكرك جزيلاً على تواصلك معنا وعلى مشاركتنا ملاحظاتك وتقييمك القيّم. 🙏\nتأكد أن رأيك ورضاك هما أولويتنا دائماً، وسنعمل باستمرار على تقديم الأفضل والأحسن لخدمتك على أكمل وجه بإذن الله. ✨❤️`;
                await sendWhatsAppMessage(fromPhone, unifiedMsg);

                // Save ALL reclamations and feedback to Supabase settings table (reclamations array) with status 'nouvelle' for human review
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
                    const stockSum = typeof cv.stock === 'object' ? Object.values(cv.stock).reduce((a, b) => a + Number(b), 0) : Number(cv.stock || 0);
                    return `${cv.name} (المخزون المتوفر: ${stockSum} حبة)`;
                  }).join(', ');
                }
                return `- ${p.title}: السعر ${p.price} دج | الألوان والسطوك: ${colorsStr}`;
              }).join('\n');
              const settingsSummary = Object.entries(storeSettings).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');

              const systemInstruction = `أنت بائع ومساعد مبيعات ذكي ومحترف لمتجر (${storeName}).
تتحدث بالدارجة الجزائرية الفصيحة والمحترمة وتدردش مع الزبون بذكاء ولباقة كأنك بائع إنسان حقيقي يشتغل في المحل.
قوانين صارمة وحتمية:
1. ممنوع منعاً باتاً طباعة الترويسة "*متجر Pyjama DZ*" أو أي ترويسة مكررة. ابدأ مباشرة بالرد المباشر بأسلوب بشري طبيعي ولبق.
2. ممنوع منعاً باتاً استخدام الإيموجي أو الرموز التعبيرية (Emoji) كلياً.
3. افهم سؤال الزبون ودردش معه بأسلوب بشري طبيعي ولبق، دون نصوص جامدة أو مكررة.
4. إذا طلب الزبون رابط الموقع (link, موقع, سيت)، أعطه الرابط مباشرة: https://pyjama-dz.vercel.app
5. إذا سأل عن المقر أو المكان (وين جايين)، أعطه العنوان ورابط خرائط جوجل من الإعدادات مباشرة وهو: ${storeMapsUrl || 'https://pyjama-dz.vercel.app'}
6. إذا سأل عن أرقام الهاتف، أعطه الأرقام الرسمية التالية فقط: ${formattedPhonesBullets}
7. عندما يسأل الزبون إن كان هناك منتج أو لون أو مقاس معين متوفر (مثلاً: كاين فـ الأبيض / blanc / noir / ensemble / مقاس M):
   - افحص قائمة المنتجات والألوان والمخزون في بيانات النظام أعلاه:
   - إذا كان المنتج أو اللون موجوداً ومتوفراً في المخزون (المخزون > 0): أجب صراحة بـ "إيه كاين متوفر في السطوك"، ثم أعطه رابط الموقع الرسمي: https://pyjama-dz.vercel.app
   - إذا كان المنتج أو اللون غير موجود كلياً في السيستم أو نافداً من المخزون (مثل اسم وهمي أو لون غير موجود): أجب صراحة بـ "ماكاش متوفر حالياً هاد الموديل أو اللون"، ثم قل له تفضل شوف الموديلات والألوان المتوفرة حالياً في الموقع وأعطه رابط الموقع الرسمي: https://pyjama-dz.vercel.app
8. إذا سأل الزبون عن الصور (صور, تصاوير, photo): إذا لم تكن الصور مبعوثة فـ المحادثة، قل له تفضل بتصفح كافة صور الموديلات والألوان عبر رابط موقعنا الرسمي: https://pyjama-dz.vercel.app
9. للزبائن الذين لا يعرفون طريقة الطلب من الموقع ويريدون تسجيل طلبيتهم مباشرة عبر المحادثة (الواتساب / الماسنجر / إنستغرام):
   - ترحب بهم وتطلب منهم تزويدك بالبيانات التالية بالترتيب: الاسم واللقب، رقم الهاتف، الولاية والبلدية، اسم الموديل واللون والمقاس، وطريقة/شركة التوصيل.
   - حذار صارم: لا تقم إطلاقاً بااختراع أو كتابة أي رقم طلبية (مثل #80) من عندك! تأكيد الطلبيات وأرقام الطلبيات يتم توليدها حصراً وأوتوماتيكياً بواسطة السيستم.
10. قانون حتمي وخاص بالجملة (Gros): عندما يسأل أو يذكر الزبون البيع بالجملة (Gros / جملة / بالجملة / سيريات / كابة / تجارة): يجب حتماً وفوراً توجيهه وإعطاؤه رابط صفحة الجملة المخصص للشراء بالجملة مباشرة وهو: https://pyjama-dz.vercel.app/gros وتوضيح أنه إذا أراد الشراء بالجملة يرجى الدخول والطلب مباشرة عبر موقع الجملة الرسمي.

بيانات المتجر من الإعدادات:
- العنوان والمقر: ${storeAddressDisplay}
- رابط خرائط جوجل الرسمي (Google Maps): ${storeMapsUrl}
- رابط الموقع الرسمي: https://pyjama-dz.vercel.app
- رابط صفحة الجملة الرسمية (Gros): https://pyjama-dz.vercel.app/gros
${settingsSummary}

قائمة المنتجات والأسعار والسطوك الحالية من الداتابيز:
${catalogSummary}
${salesModeRules}`;

              // Send photos if requested
              const sentPhotos = await checkAndSendProductPhotos(fromPhone, messageText, products);
              if (sentPhotos) {
                await sendWhatsAppMessage(fromPhone, "تفضل خويا، تم إرسال صور الموديلات المتوفرة أعلاه في المحادثة. يمكنك تصفح باقي المنتجات والألوان عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app");
                continue;
              }

              // Check for order confirmation reply from customer ("أكدلي", "akedli", etc.)
              const handledOrderConfirm = await processOrderConfirmationIntent(fromPhone, messageText);
              if (handledOrderConfirm) continue;

              // Check for restock confirmation reply from customer
              const handledRestockConfirm = await processRestockConfirmationIntent(fromPhone, messageText, products);
              if (handledRestockConfirm) continue;

              // Process direct order intent and delivery stock check
              const handledOrder = await processDirectOrderFromMessage(fromPhone, messageText, products);
              if (handledOrder) continue;

              // Auto-record inquiry if item/size requested is out of stock
              await recordOutOfStockInquiry(fromPhone, messageText, products);

              const aiReply = await generateGeminiAI(prompt, systemInstruction, storeSettings, messageText, products);
              if (aiReply) {
                await sendWhatsAppMessage(fromPhone, aiReply);
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
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    if (body) {
      await processIncomingPayload(body);
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}

export { processIncomingPayload };
