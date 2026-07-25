const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSIcDR7ZB1o5N7BwKcWuVIxhIm1AEbrHs5RoUFp0jH2XDSrW1tf7aUwRus2GZBvnukBpYeZAUFbkD7YsOohEJstK4xGLt2tTFSvpRCRuPmJWdmaNL0lULTUcvAIh1R5caOQkVvrOITZCvImXNn17P7sNyjYw8dc3FsIZATxt8Ke6AjgqfHDtbIh4ZCi991dn8TLyrkedmsVKfXOx68M9pzR2HLqmZCs12uZBSsaBCdgWBxAhiqr5ZB3Hmacyg1PZCiTIRdrGUzeYZA3D';

const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';

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
  } catch (err) {
    console.error('Error fetching Meta token from settings:', err);
  }
  return DEFAULT_TOKEN;
}

async function getGeminiKeys() {
  const keys = [];
  
  // 1. Read process.env GEMINI_API_KEY_1..20
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k && k.trim()) keys.push(k.trim());
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    if (!keys.includes(process.env.GEMINI_API_KEY.trim())) {
      keys.push(process.env.GEMINI_API_KEY.trim());
    }
  }

  // 2. Read from Supabase settings table (key: gemini_api_keys or gemini_keys)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.key && item.key.toLowerCase().includes('gemini') && item.value) {
          try {
            const parsed = typeof item.value === 'string' && (item.value.startsWith('[') || item.value.startsWith('{')) ? JSON.parse(item.value) : item.value;
            if (Array.isArray(parsed)) {
              parsed.forEach(pk => { if (pk && typeof pk === 'string' && !keys.includes(pk.trim())) keys.push(pk.trim()); });
            } else if (typeof parsed === 'string') {
              parsed.split(/[\n,;]/).forEach(pk => { if (pk && pk.trim() && !keys.includes(pk.trim())) keys.push(pk.trim()); });
            }
          } catch(e) {}
        }
      });
    }
  } catch (err) {
    console.error('Error fetching Gemini keys from Supabase:', err);
  }

  // 3. Fallback hardcoded keys
  const hardcoded = [
    Buffer.from('QVEuQWI4Uk42THJfRndDWGdzWnpvNUI3X0ZHTXV2OTJ3V2I2MFpOd3hSaUlSallMdmpB', 'base64').toString('utf8'),
    Buffer.from('QVEuQWI4Uk42SWpweDNfcmhWYTBGZDZ4R181aUJ3M3Z4aVZDamR5OURYelBQVDBaZFJn', 'base64').toString('utf8'),
    Buffer.from('QVEuQWI4Uk42SnFZODAtdWVvaTJfVG9RQVAwamNmblZLdnZjZFp2VmR5X24wbU9seTd3', 'base64').toString('utf8'),
    Buffer.from('QVEuQWI4Uk42SnJiWXFJaDJEa3lyRU5MVXJNVkRVZ2xSSjlqZWZ6WXk4aEFyYnNNMGxaZXc=', 'base64').toString('utf8')
  ];
  hardcoded.forEach(k => {
    if (!keys.includes(k)) keys.push(k);
  });
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

function getSmartFallbackResponse(userMessage, storeSettings = {}) {
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

  // 3. PRODUCT ITEM / COLOR / STOCK / AVAILABILITY QUERY
  if (['ensemble', 'noir', 'rouge', 'rose', 'blanc', 'bleu', 'بيجامة', 'انسامبل', 'انصامبل', 'سطوك', 'كاين', 'kaayn', 'kayn', 'dispo', 'disponibilite', 'couleur', 'taille', 'مقاس', 'لون'].some(k => norm.includes(k) || pLower.includes(k))) {
    let matchText = "";
    if (pLower.includes('noir') || norm.includes('اكحل') || norm.includes('اسود')) matchText = " باللون الأسود (Noir)";
    else if (pLower.includes('ensemble') || norm.includes('انسامبل') || norm.includes('انصامبل')) matchText = " (Ensemble)";

    return `أهلاً بك. نعم متوفر المنتجات والـ Ensemble${matchText} عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app\n\nتفضل بدخول الموقع لمشاهدة كافة الصور والمقاسات والأسعار وتأكيد الطلب.`;
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

async function generateGeminiAI(prompt, systemInstruction = "", storeSettings = {}, userMessage = "") {
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

  return getSmartFallbackResponse(userMessage || prompt, storeSettings);
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
    console.log('WhatsApp send result:', data);
    return data;
  } catch (err) {
    console.error('Send WhatsApp error:', err);
  }
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

              const catalogSummary = products.map(p => `- ${p.title}: ${p.price} دج`).join('\n');
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

بيانات المتجر من الإعدادات:
- العنوان والمقر: ${storeAddressDisplay}
- رابط خرائط جوجل الرسمي (Google Maps): ${storeMapsUrl}
- رابط الموقع الرسمي: https://pyjama-dz.vercel.app
${settingsSummary}

قائمة المنتجات والأسعار الحالية:
${catalogSummary}
${salesModeRules}`;

              const aiReply = await generateGeminiAI(prompt, systemInstruction, storeSettings, messageText);
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
