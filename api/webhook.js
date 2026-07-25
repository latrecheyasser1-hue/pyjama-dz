const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSAq6OP91XUr0bEjQLpOfofPNHOHNUSh7lJX2GVyEUqZBNIHSYqwuA4ATMdm4NQ8nYEvEui3dTYkJo8ewlhmWv4kcfCBdKM2CBEU1bnXYYWoTADXFMQafLaVE98qURkH6hZCjTFUyp0PVP8aXm2VA5LDW3KQg0eRnlO2fKPvmKGzyhnnC042wT2f1KjJHeTWhnWu8UZAEPKlyOdZAte2mXGdWa8WKTIJDcxzZAs9mFi3MLuhq31i6NZAw4mayBxBoOZA3rZB6b58Iuo8ZD';

const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
  }
  return DEFAULT_TOKEN;
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
  if (!targetOrder) return "58";
  try {
    const createdAt = typeof targetOrder === 'object' ? targetOrder.created_at : null;
    if (createdAt) {
      const url = `${SUPABASE_URL}/rest/v1/orders?select=id&created_at=lte.${encodeURIComponent(createdAt)}`;
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
    }
  } catch (err) {
    console.error('Error computing order number:', err);
  }
  return "58";
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
    return Array.isArray(data) ? data : [];
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
          const textObj = [...parts].reverse().find(p => p.text && !p.thought);
          const text = textObj ? textObj.text : (parts[0]?.text || null);
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
        to: toPhone,
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

async function sendWhatsAppImage(toPhone, imageUrl, caption = "") {
  const token = await getMetaAccessToken();
  if (!token || !toPhone || !imageUrl) return;
  const cleanCaption = removeEmojis(caption);
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
        type: 'image',
        image: {
          link: imageUrl,
          caption: cleanCaption
        }
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
  }
}

async function createChatOrderInSupabase(orderData) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders`;
    const payload = {
      clientName: orderData.clientName || 'زبون المحادثة',
      nom: orderData.clientName || 'زبون المحادثة',
      phone: orderData.phone,
      wilaya: orderData.wilaya || 'الشلف',
      commune: orderData.commune || 'المركز',
      address: `${orderData.wilaya || ''} ${orderData.commune || ''}`.trim(),
      product: orderData.product || 'بيجامات فاخرة',
      color: orderData.color || '',
      size: orderData.size || '',
      quantity: Number(orderData.quantity || 1),
      totalPrice: Number(orderData.totalPrice || 0),
      deliveryCompany: orderData.deliveryCompany || 'Livraison Domicile',
      status: 'confirmee',
      created_at: new Date().toISOString()
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

async function checkAndSendProductPhotos(toPhone, messageText, products) {
  const norm = normalizeText(messageText);
  const pLower = (messageText || '').toLowerCase();
  const photoKeywords = [
    'صورة', 'صور', 'تصويرة', 'تصاوير', 'photo', 'photos', 'image', 'images', 'شوف', 'نشوف', 'وريني', 'بعثلي', 'ابعثلي',
    'tsswiira', 'tswira', 'taswira', 'tsoira', 'tsawir', 'tasawir', 'pic', 'pics', 'picture', 'pictures', 'tbeathli', 'tb3athlii', 'beathli', 'tbeath'
  ];
  
  if (!photoKeywords.some(k => norm.includes(k) || pLower.includes(k))) return false;

  const matchedImages = [];
  (products || []).forEach(p => {
    const rawImgs = p.images || p.image;
    if (Array.isArray(rawImgs)) {
      rawImgs.forEach(img => {
        if (img && typeof img === 'string') {
          const fullUrl = img.startsWith('http') ? img : `https://pyjama-dz.vercel.app${img.startsWith('/') ? '' : '/'}${img}`;
          matchedImages.push({ url: fullUrl, caption: `${p.title} - السعر: ${p.price} دج` });
        }
      });
    } else if (typeof rawImgs === 'string' && rawImgs.trim()) {
      const fullUrl = rawImgs.startsWith('http') ? rawImgs : `https://pyjama-dz.vercel.app${rawImgs.startsWith('/') ? '' : '/'}${rawImgs}`;
      matchedImages.push({ url: fullUrl, caption: `${p.title} - السعر: ${p.price} دج` });
    }

    const variants = p.colorvariants || p.colorVariants;
    if (Array.isArray(variants)) {
      variants.forEach(cv => {
        const cvImg = cv.image || cv.imageUrl || cv.img;
        if (cvImg && typeof cvImg === 'string') {
          const fullUrl = cvImg.startsWith('http') ? cvImg : `https://pyjama-dz.vercel.app${cvImg.startsWith('/') ? '' : '/'}${cvImg}`;
          matchedImages.push({ url: fullUrl, caption: `${p.title} (${cv.name || ''}) - السعر: ${p.price} دج` });
        }
      });
    }
  });

  if (matchedImages.length > 0) {
    let sentCount = 0;
    for (const item of matchedImages.slice(0, 3)) {
      console.log('Sending product image to WhatsApp:', item.url);
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
        
        await sendWhatsAppMessage(targetPhone, alertMsg);
      }
    }
  }
}

async function notifyWaitingCustomers(productId, colorIdx, size, newQty) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=50`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const orders = await res.json();
    if (!Array.isArray(orders)) return;

    // Find customers who had an order or request for this product
    const notifiedPhones = new Set();
    for (const o of orders) {
      if (o.phone && !notifiedPhones.has(o.phone)) {
        notifiedPhones.add(o.phone);
        const clientName = o.clientName || o.nom || 'الزبون الكريم';
        const msg = `*متجر Pyjama DZ*\n\nمرحباً بك سيد ${clientName}.\nنعلمك أن المنتج الذي أردت طلبه قد توفر مجدداً في السطوك بكميات جديدة.\nيمكنك الطلب الآن مباشرة عبر موقعنا الرسمي: https://pyjama-dz.vercel.app`;
        await sendWhatsAppMessage(o.phone, msg);
        break; // Notify first relevant waiting customer
      }
    }
  } catch (err) {
    console.error('Error notifying waiting customers:', err);
  }
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
              const refMatch = messageText.match(/\[REF:([^:]+):([^:]+):([^:]+)\]/);
              if (refMatch) {
                const productId = refMatch[1];
                const colorIdx = parseInt(refMatch[2]);
                const size = refMatch[3];
                const addedQty = parseInt(messageText.replace(/\D/g, ''));

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
                    
                    await sendWhatsAppMessage(fromPhone, `*متجر Pyjama DZ*\n\nتم تحديث المخزون بنجاح.\n• المنتج: ${product.title}\n• اللون/المقاس: ${updatedVariants[colorIdx].name} (${size})\n• الكمية المضافة: +${addedQty}\n• المخزون الحالي: ${newQty} حبة.`);

                    // Notify waiting customers about restock
                    await notifyWaitingCustomers(productId, colorIdx, size, newQty);
                    continue;
                  }
                }
              }

              const normText = normalizeText(messageText);

              // RECLAMATION & FEEDBACK HANDLER (Praise vs Complaint)
              const isPraise = ['شكرا', 'مرسي', 'شكراً', 'يعطيك الصحة', 'ما شاء الله', 'روعة', 'عجبني', 'هايل', 'شباب بزاف', 'merci', 'top', 'الله يحفظك'].some(k => normText.includes(k));
              const isComplaint = ['مشكل', 'ناقص', 'مكسور', 'ماشي شباب', 'زبل', 'عيب', 'غلطة', 'رادي', 'ما وصلنيش', 'خاسر', 'تأخرت'].some(k => normText.includes(k));

              if (isPraise && !order) {
                const clientName = order?.clientName || 'الزبون الكريم';
                await sendWhatsAppMessage(fromPhone, `أهلاً وسهلاً بك سيد ${clientName}.\nشكراً جزيلاً لك على كلامك الطيب وثقتك بمتجرنا. نسعد دائماً بخدمتك ولن نتردد في تقديم الأفضل دائماً.`);
                continue;
              } else if (isComplaint) {
                const clientName = order?.clientName || 'الزبون الكريم';
                await sendWhatsAppMessage(fromPhone, `أهلاً بك سيد ${clientName}.\nنعتذر منك شديد الاعتذار عن هذا المشكل. يرجى تزويدنا بكافة التفاصيل وسيتم التواصل معك ومعالجة الأمر في أقرب وقت ممكن.`);
                continue;
              }

              // CONFIRMATION & CANCELLATION KEYWORDS
              const confirmKeywords = [
                'takid', 'taekid', 'taked', 'ta3kid', 'taakid', 'confirm', 'confirmi', 'confirmer',
                'aked', 'akedha', 'akedli', 'akedhali', 'akedii', 'akidli', 'akedna',
                'ok', 'oui', 'daccord', 'daweq', 'sah', 'yep', 'yeah',
                'تاكيد', 'تأكيد', 'نعم', 'اوكي', 'اكدي', 'اكيد', 'موافق', 'ابعث', 'شحن', 'ارسل', 'ابعثها', 'جدية',
                'اكذها', 'أكدها', 'أكدلي', 'ثبتها', 'ثبتلي'
              ];

              const cancelKeywords = [
                'annul', 'cancel', 'non', 'حبس', 'بطلت', 'ما تبعث', 'لا', 'الغاء', 'إلغاء', 'نحي', 'انولي'
              ];

              const wordCount = messageText.trim().split(/\s+/).length;
              const isConfirmation = order && wordCount <= 5 && confirmKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              const isCancellation = order && wordCount <= 5 && cancelKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));

              if (isConfirmation) {
                await updateOrderStatusAndArchive(order.id, 'confirmee');
                const orderNumStr = await getSequentialOrderNum(order);
                const confirmMsg = `تم تأكيد الطلبية رقم #${orderNumStr} بنجاح في السيستم سيد ${order.clientName || 'الزبون'} وجاري تجهيزها للشحن. شكراً لك.`;
                await sendWhatsAppMessage(fromPhone, confirmMsg);
                continue;
              } else if (isCancellation) {
                await updateOrderStatusAndArchive(order.id, 'annulee');
                const orderNumStr = await getSequentialOrderNum(order);
                const cancelMsg = `تم إلغاء الطلبية رقم #${orderNumStr} بنجاح في السيستم بناءً على رغبتك سيد ${order.clientName || 'الزبون'}. نأمل خدمتك في المناسبات القادمة.`;
                await sendWhatsAppMessage(fromPhone, cancelMsg);
                continue;
              }

              // STRICT AI SALES INSTRUCTIONS (ZERO EMOJIS)
              const isWholesale = ["gros", "جملة", "بالجملة", "كابة", "تجارة", "سيري", "serie", "سيريات", "كمية", "كميات"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              let salesModeRules = isWholesale ? "الزبون يسأل عن بالجملة (Gros). أجب عن أسعار وشروط الجملة والسيريات من النظام فقط." : "الزبون زبون عادي بالقطعة. أجب عن سؤاله من بيانات النظام فقط.";

              let prompt = `رسالة الزبون: "${messageText}"`;
              if (order) {
                const orderNumStr = await getSequentialOrderNum(order);
                prompt += `\nمعلومات طلب الزبون الحالي من الداتابيز:\n- الاسم: ${order.clientName || order.nom}\n- رقم الطلب: #${orderNumStr}\n- المنتج: ${cleanProductText(order.product)}\n- الولاية: ${order.wilaya}\n- الحالة الحالية: ${order.status}`;
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
   - ترحب بهم وتطلب منهم تزويدك بالبيانات التالية بالترتيب:
     أ) الاسم واللقب الكامل
     ب) رقم الهاتف
     ج) الولاية والبلدية
     د) اسم الموديل واللون والمقاس المطلوب
     هـ) تحديد شركة أو طريقة التوصيل المطلوبة (إجباري وحتمي! اطلب منه تحديد الشركة صراحة: مثل يالادين Yalidine Express / زد آر ZR Express / توصيل للمنزل Domicile / توصيل للمكتب Bureau).
   - إذا لم يحدد الزبون شركة أو طريقة التوصيل، اسأله صراحة: "وشمن شركة أو طريقة توصيل حاب نوصلولك بيها؟ (توصيل للمنزل / استلام من المكتب / يالادين / زد آر)" ولا تؤكد الطلبية حتى يختار طريقة/شركة التوصيل صراحة!
   - بمجرد تقديمهم لجميع هذه البيانات كاملة بما فيها شركة التوصيل المحددة، يُسجل الطلب فوراً وتُحفظ البيانات في السيستم بحالة مؤكدة (confirmee)، وتخبرهم أنه تم تسجيل وتأكيد الطلبية بنجاح مع رقم الطلب وتأكيد اسم شركة التوصيل المحددة.

بيانات المتجر من الإعدادات:
- العنوان والمقر: ${storeAddressDisplay}
- رابط خرائط جوجل الرسمي (Google Maps): ${storeMapsUrl}
- رابط الموقع الرسمي: https://pyjama-dz.vercel.app
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

              // Check if customer provided direct order details in chat
              const isDirectOrderIntent = ["طلب", "كوموند", "commande", "نطلب", "ودي ندي", "ندير طلب", "سجللي طلب"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              if (isDirectOrderIntent) {
                const nameMatch = messageText.match(/(?:اسمي|اسم|الاسم|nom|client)\s*[:=]?\s*([أ-يa-zA-Z\s]{3,25})/i);
                const wilayas = ["ادرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "بليدة", "بويرة", "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "مدية", "مستغانم", "مسيلة", "معسكر", "ورقلة", "وهران", "بيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "نعامة", "عين تموشنت", "غرداية", "غليزان", "المغير", "المنيعة", "أولاد جلال", "برج باجي مختار", "بني عباس", "تيميمون", "تقرت", "جانت", "إن صالح", "إن قزام", "alger", "oran", "blida", "chlef", "setif", "constantine"];
                const wilayaMatch = wilayas.find(w => normText.includes(w.toLowerCase()));

                if (nameMatch && wilayaMatch) {
                  const clientName = nameMatch[1].trim();
                  const wilaya = wilayaMatch;
                  const phoneMatch = messageText.match(/(0[567]\d{8})/);
                  const orderPhone = phoneMatch ? phoneMatch[1] : fromPhone;

                  const pLower = messageText.toLowerCase();
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

                  const newOrder = await createChatOrderInSupabase({
                    clientName,
                    phone: orderPhone,
                    wilaya,
                    commune: 'المركز',
                    product: cleanProductText(messageText),
                    deliveryCompany
                  });

                  if (newOrder) {
                    const orderNumStr = await getSequentialOrderNum(newOrder);
                    const createdConfirmMsg = `تم تسجيل وتأكيد طلبيتك رقم #${orderNumStr} بنجاح في السيستم!\n- الاسم: ${clientName}\n- الهاتف: ${orderPhone}\n- الولاية: ${wilaya}\n- المنتج: ${cleanProductText(newOrder.product)}\n- شركة التوصيل: ${deliveryCompany}\n\nجاري تجهيز الطلبية وشحنها إليك في أقرب وقت. شكراً لثقتك بنا.`;
                    await sendWhatsAppMessage(fromPhone, createdConfirmMsg);
                    continue;
                  }
                }
              }

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
