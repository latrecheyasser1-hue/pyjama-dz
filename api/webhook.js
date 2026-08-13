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

async function getGroqKeys() {
  const keys = [process.env.GROQ_API_KEY].filter(Boolean);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.groq_api_key`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value) {
      const dbKey = data[0].value.trim();
      if (dbKey && !keys.includes(dbKey)) keys.unshift(dbKey);
    }
  } catch (err) {
    console.error('Error fetching Groq keys from Supabase:', err);
  }

  return keys;
}

function removeEmojis(str) {
  if (!str) return "";
  return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase()
    .replace(/[أإآاأًٌٍَُِّْ]/g, "ا")
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
  if (!targetOrder || !targetOrder.created_at) return "313";
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?created_at=lte.${encodeURIComponent(targetOrder.created_at)}&select=id`;
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
  return "313";
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
  const tokens = [];
  const dynToken = await getMetaAccessToken();
  if (dynToken) tokens.push(dynToken);
  if (DEFAULT_TOKEN && !tokens.includes(DEFAULT_TOKEN)) tokens.push(DEFAULT_TOKEN);

  for (const token of tokens) {
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
          console.log('downloadMetaMedia success, byteLength:', arrayBuf.byteLength, 'mimeType:', mimeType);
          return { base64, mimeType };
        }
      }
    } catch (err) {
      console.error('Error downloading Meta media with token:', err.message);
    }
  }
  return null;
}

async function generateGeminiAudio(base64Audio, mimeType, promptText, systemInstruction = "") {
  const keys = await getGroqKeys();
  if (!keys || keys.length === 0 || !base64Audio) return null;

  const audioBuffer = Buffer.from(base64Audio, 'base64');
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });

  for (const selectedKey of keys) {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.ogg');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('temperature', '0.0');

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${selectedKey}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.text) {
          console.log('🎙️ Groq Whisper Transcribed Voice Note:', data.text);
          return removeEmojis(data.text.trim());
        }
      } else {
        const errText = await res.text();
        console.error('Groq Whisper error response:', errText);
        await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ key: 'last_vocal_debug', value: JSON.stringify({ step: 'whisper_api_error', error: errText, timestamp: Date.now() }) })
        });
      }
    } catch (err) {
      console.error('Groq Whisper Audio error:', err.message);
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ key: 'last_vocal_debug', value: JSON.stringify({ step: 'whisper_exception', error: err.message, timestamp: Date.now() }) })
      });
    }
  }

  return null;
}

function getSmartFallbackResponse(userMessage, storeSettings = {}, products = []) {
  const norm = normalizeText(userMessage);
  const pLower = (userMessage || "").toLowerCase();
  const rawMaps = storeSettings.googleMapsUrl || storeSettings.googleMaps || "";
  const mapsUrl = (rawMaps && !rawMaps.includes('algeria-pyjama-dz')) ? rawMaps.trim() : "";
  const address = storeSettings.address || "الشلف (Chlef)";

  const phoneSources = storeSettings.phoneOrders 
    ? [storeSettings.phoneOrders, storeSettings.whatsapp]
    : [storeSettings.phones, storeSettings.whatsapp];
  const phonesArr = extractCleanPhonesList(...phoneSources);
  const formattedPhonesBullets = phonesArr.length > 0 ? phonesArr.map(p => "- " + p).join("\n") : "- 0554128933";

  // 0. GREETINGS & SALUTATIONS
  if (['slm', 'سلام', 'وعليكم', 'سلام عليكم', 'مرحبا', 'أهلا', 'اهلين', 'bonjour', 'coucou', 'salut', 'kirak', 'kirakom', 'dayriin', 'dayriini', 'labas', 'mlaah', 'cv', 'ca va'].some(k => norm.includes(k) || pLower.includes(k))) {
    return "وعليكم السلام ورحمة الله، رانا غاية الحمد لله ربي يحفظك خويا/أختي لعزيزة! كاش ما عجبك كاش موديل بيجامة أو حاب تستفسر على التوصيل وتأكيد طلبيتك؟ تفضل راني في خدمتك 🌸";
  }

  // 1. QUALITY & FABRIC INQUIRY
  if (['qualite', 'qualité', 'chaba', 'chab', 'chbab', 'جودة', 'نوعية', 'قماش', 'مليحة', 'شبابة', 'شباب', 'مليح'].some(k => norm.includes(k) || pLower.includes(k))) {
    return "جودة السلعة ممتازة جداً قطن وساتان أصلي فاخر ومريح في اللبس، مع ضمان المعاينة والاستبدال عند الاستلام 🌸\nتقدر تشوف كافة التفاصيل والأسعار عبر موقعنا: https://pyjama-dz.vercel.app";
  }

  // 2. DELIVERY TIMING / SPEED INQUIRY
  if (['winta', 'twsslni', 'twsslnii', 'وقتاش', 'شحال تقعد', 'شحال ياخد', 'شحال تاخد', 'متى', 'تتوصل', 'توصلني'].some(k => norm.includes(k) || pLower.includes(k))) {
    return "التوصيل سريع يدوم بين 24 حتى 48 ساعة فقط لجميع الولايات مع الاتصال بك قبل التسليم للمعاينة 🚚✨";
  }

  // 3. PHONE NUMBERS QUERY
  if (['numero', 'nomer', 'num', 'nomro', 'nomiro', 'هاتف', 'رقم', 'ارقام', 'نميرو', 'نومرو', 'tel', 'phone'].some(k => norm.includes(k) || pLower.includes(k))) {
    return "أرقام التواصل والواتساب الرسمية للمتجر:\n" + formattedPhonesBullets + "\n\nرانا في الخدمة دائماً 🌸";
  }

  // 4. LOCATION QUERY
  if (['win jayiin', 'win jayin', 'مقر', 'عنوان', 'موقع', 'بلاصة', 'لوكيشن', 'اللوكيشن', 'chlef', 'الشلف'].some(k => norm.includes(k) || pLower.includes(k))) {
    let mapsMsg = "📍 المقر والعنوان: " + address + ".\n";
    if (mapsUrl && mapsUrl.length > 8) {
      mapsMsg += "رابط خريطة جوجل: " + mapsUrl + "\n";
    }
    mapsMsg += "والتوصيل متوفر لجميع 58 ولاية حتى باب الدار 🌸";
    return mapsMsg;
  }

  // 5. REAL-TIME PRODUCT ITEM / COLOR / STOCK CHECKER
  if (['ensemble', 'noir', 'rouge', 'rose', 'blanc', 'bleu', 'بيجامة', 'انسامبل', 'انصامبل', 'سطوك', 'كاين', 'kaayn', 'kayn', 'dispo', 'disponibilite', 'couleur', 'taille', 'مقاس', 'لون'].some(k => norm.includes(k) || pLower.includes(k))) {
    return "إيه كاين متوفر في السطوك أختي/خويا لعزيز 🌸 تقدر تصفح الألوان والمقاسات عبر موقعنا: https://pyjama-dz.vercel.app";
  }

  // 6. PRICES / CATALOG
  if (['prix', 'سعر', 'اسعار', 'سومة', 'شحال', 'بكم', 'منتجات', 'موديلات', 'بيجامة', 'بيجامات', 'سلعة', 'chhal'].some(k => norm.includes(k) || pLower.includes(k))) {
    return "أسعارنا مناسبة جداً وتبدأ من 2,800 دج للموديلات الفاخرة 🛍️\nتفضل بتصفح كافة الصور والموديلات عبر موقعنا: https://pyjama-dz.vercel.app والتوصيل متوفر لـ 58 ولاية 🌸";
  }

  // 7. DELIVERY GENERAL
  if (['livraison', 'توصيل', 'شحن', 'نوصلو', 'ولاية', 'ديكسبريس', 'يالادين'].some(k => norm.includes(k) || pLower.includes(k))) {
    return "التوصيل متوفر لجميع 58 ولاية حتى باب الدار أو للمكتب (Stop Desk) والدفع عند الاستلام بعد ما تعاين طلبيتك 🚚📦";
  }

  return "أهلاً وسهلاً بك في متجر Pyjama DZ! تفضل خويا/أختي راني في خدمتك لأي استفسار أو تأكيد طلبيتك 🌸";
}

async function generateGeminiAI(prompt, systemInstruction = "", storeSettings = {}, userMessage = "", products = []) {
  const keys = await getGroqKeys();

  const productsSummary = (products || []).slice(0, 8).map(p => `- ${p.title} (${p.price} دج)`).join('\n');

  const defaultSystemPrompt = `أنت بائع ومستشار تجاري جزائري حقيقي (إنسان واقعي وبنادم ماشي روبوت) في متجر بيجامات الجزائر Pyjama DZ.
تتحدث بالدارجة الجزائرية العفوية المحترمة وبحروف عربية دائماً وبشكل بشري طبيعي ودافئ.

قواعدك الصارمة:
1. اكتب دائماً باللغة العربية بحروف عربية (بالدارجة الجزائرية المفهومة والمهذبة)، حتى لو كتب الزبون بالفرانكو (Franco-Arab).
2. إياك والردود الروبوتية الطويلة أو القوالب الجاهزة المكررة! جاوب بدقة على قد السؤال في سطرين أو 3 أسطر فقط كأنك تهدر مع الزبون في المحل.
3. إذا سلم أو سأل عن الحال (slm, cv, rakom mlih, kirakom): رد بالسلام والتحية الجزائرية الطيبة العفوية واسأله كيفاش تقدر تعاونو.
4. تفهم تماماً كل مصطلحات الدارجة والفرانكو (souma, chhal, qualite, dispo, taille, livree, win jayiin, gros).
5. إذا سأل عن الأسعار: أخبره أن الأسعار تبدأ من 2800 دج وموديلات فاخرة قطن وساتان.
6. إذا سأل عن التوصيل: متوفر 58 ولاية حتى لباب الدار والدفع عند الاستلام.
7. إذا طلب الزبون تأكيد الطلبية ضع في ردك [ACTION:CONFIRM_ORDER]، وإذا أصر على الإلغاء ضع [ACTION:CANCEL_ORDER]، وإذا طلب صور الموديلات ضع [ACTION:SEND_PHOTOS].

المنتجات المتوفرة حالياً في المتجر:
${productsSummary || '- بيجامات ساتان وقطن فاخرة صيفية وشتوية (2,800 دج إلى 4,500 دج)'}`;

  for (const selectedKey of keys) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${selectedKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: systemInstruction || defaultSystemPrompt
            },
            {
              role: 'user',
              content: userMessage || prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 250
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return removeEmojis(content.trim());
        }
      }
    } catch (err) {
      console.error('Groq AI fetch notice:', err.message);
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
    const cleanPhoneKey = rawDigits.slice(-8);

    // 1. Check if user has an active pending cancellation question session
    let activeState = null;
    try {
      const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}&select=value`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const stateRows = await stateRes.json();
      if (Array.isArray(stateRows) && stateRows[0]?.value) {
        activeState = typeof stateRows[0].value === 'string' ? JSON.parse(stateRows[0].value) : stateRows[0].value;
      }
    } catch (e) {}

    if (activeState && activeState.orderId) {
      // Affirmative responses to "Are you sure you want to cancel?" mean CONFIRM CANCELLATION!
      const isExplicitCancelConfirm = [
        'نعم', 'نعام', 'إيه', 'ايه', 'إي', 'اي', 'أكيد', 'اكيد', 'صح', 'oui', 'yes', 'ih', '1',
        'تأكيد الإلغاء', 'تأكيد الغاء', 'تاكيد الغاء', 'تاكيد إلغاء', 'نعم الغيها', 'نعم انولي',
        'نعم انوليها', 'نعم إلغاء', 'نعم الغاء', 'الغيتها', 'انوليها', 'الغي الطلب', 'الغاء الطلب',
        'annuler la commande', 'oui annuler', 'oui anuler', 'إلغاء', 'الغاء', 'الغي', 'ألغي'
      ].some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

      // Negative responses mean KEEP ORDER ACTIVE & DO NOT CANCEL!
      const isDeclineNo = !isExplicitCancelConfirm && [
        'لا', '2', 'تراجع', 'لا تلغي', 'لا تلغيها', 'تراجع عن الإلغاء', 'تراجع عن الغاء', 'تراجع عن الالغاء',
        'lala', 'no', 'non', 'pas'
      ].some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

      if (isExplicitCancelConfirm) {
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
          const cleanName = (rawName && !rawName.includes('زبون الواتساب') && !rawName.includes('زبون المحادثة'))
            ? rawName.replace(/\(واتساب:[^\)]+\)/g, '').trim()
            : '';
          const clientNameStr = cleanName ? ` ${cleanName}` : '';

          // Delete session state
          await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          }).catch(() => {});

          const confirmMsg = `أهلاً وسهلاً بك${clientNameStr}! 🌸\n\n✅ *تم إلغاء طلبك رقم #${orderNumStr} بنجاح بناءً على رغبتك.*\nنتمنى أن نخدمك مجدداً في المرات القادمة إن شاء الله! ✨`;
          await sendWhatsAppMessage(fromPhone, confirmMsg);

          // Notify Packaging Manager (Emballage Alert Manager) if registered in settings
          try {
            const storeSettings = await getStoreSettings();
            const emballagePhone = (storeSettings.whatsappEmballageManager && !storeSettings.whatsappEmballageManager.includes('123456') && storeSettings.whatsappEmballageManager.trim() !== '')
              ? storeSettings.whatsappEmballageManager.trim()
              : null;

            if (emballagePhone) {
              const cleanProd = (targetOrder.product || '').replace(/\(واتساب:[^\)]+\)/g, '').trim();
              const managerAlertMsg = `⚠️ *تنبيه إلغاء طلبية (Emballage Alert)*\n\nقام الزبون${clientNameStr} بإلغاء الطلبية رقم #${orderNumStr} (المنتج: ${cleanProd}).\n🚨 *يرجى عدم تغليفها أو تجهيز شحنتها.*`;
              await sendWhatsAppMessage(emballagePhone, managerAlertMsg);
            }
          } catch (e) {
            console.error('Error sending packaging manager alert for cancelled order:', e);
          }

          return true;
        }
      } else if (isDeclineNo) {
        // Delete session state and confirm order delivery
        await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        }).catch(() => {});

        const orderCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone},${cleanPhoneNo0},213${cleanPhoneNo0})&status=in.(nouvelle,pending,attente,attente_confirmation,nouveau)&order=created_at.desc&limit=1`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const activeOrders = await orderCheckRes.json();
        if (Array.isArray(activeOrders) && activeOrders[0]) {
          const targetOrder = activeOrders[0];
          await updateOrderStatusAndArchive(targetOrder.id, 'confirmee');
          const orderNumStr = await getSequentialOrderNum(targetOrder);
          const rawName = targetOrder.clientName || '';
          const cleanName = (rawName && !rawName.includes('زبون الواتساب') && !rawName.includes('زبون المحادثة'))
            ? rawName.replace(/\(واتساب:[^\)]+\)/g, '').trim()
            : '';
          const clientNameStr = cleanName ? ` ${cleanName}` : '';
          const confirmMsg = `أهلاً وسهلاً بك${clientNameStr}! 🌸\n\n✅ *تم تأكيد طلبك رقم #${orderNumStr} بنجاح.*\nطلبك قائم ومؤكد وسنقوم بتجهيزه وشحنه لك في أقرب وقت إن شاء الله! ✨`;
          await sendWhatsAppMessage(fromPhone, confirmMsg);
        } else {
          await sendWhatsAppMessage(fromPhone, `أهلاً بك! 🌸\nتم إغلاق طلب الإلغاء وتبقى طلبيتك قائمة ومؤكدة بنجاح.`);
        }
        return true;
      }
    }

    // 2. Check if customer initiates a NEW cancellation request
    const cancelKeywords = [
      'إلغاء', 'الغاء', 'ألغي', 'الغي', 'إلغي', 'انولي', 'أنولي', 'نلغي', 'حبيت نلغي', 'حاب نلغي', 'حابة نلغي', 'حاب انولي',
      'انولي الطلب', 'إلغاء الطلب', 'الغاء الطلب', 'ألغي الطلب', 'الغي الطلب', 'نلغي الطلب', 'انولي لاكومند', 'انولي لا كومند',
      'nanuli', 'anuli', 'nanulii', 'anulii', 'nanoli', 'anoli', 'nanolii', 'anoli', 'noli', 'nanuli la commande', 'anuli la commande',
      'annuler', 'anuler', 'annule', 'anule', 'annulé', 'anulé', 'annulee', 'anulee', 'canceller', 'cancel', 'annulez', 'annulation',
      'annuler commande', 'anuler commande', 'nanuli la commande taa3i', 'anuler la commande', 'slm anuler la commande', 'slm ni haab nanuli',
      'sha ni hab annule', 'ni hab annule', 'hab annule', 'ni hab annuler', 'sha ni hab annuler'
    ];

    const isCancelRequest = cancelKeywords.some(kw => normText === kw || rawLower === kw || normText.includes(kw) || rawLower.includes(kw));

    if (!isCancelRequest) return false;

    // Fetch STRICTLY the LATEST active order ONLY for THIS CUSTOMER'S PHONE
    const orderCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?phone=in.(${localPhone},${fromPhone},${fullPhone},${cleanPhoneNo0},213${cleanPhoneNo0})&status=in.(nouvelle,confirmee,pending,attente,attente_confirmation,nouveau)&order=created_at.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    const activeOrders = await orderCheckRes.json();
    if (!Array.isArray(activeOrders) || activeOrders.length === 0) {
      await sendWhatsAppMessage(fromPhone, `أهلاً بك! 🌸\nلم نجد أي طلبية قائمة أو معلقة مسجلة برقم هاتفك هذا حالياً للإلغاء.`);
      return true;
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

    const promptMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${clientNameStr}. 🌸\nتلقينا طلبك لإلغاء الطلبية:\n\n• أحدث طلبية مسجلة باسمك هي رقم: #${orderNumStr}\n• المنتج: ${cleanProd}\n• الولاية: ${latestOrder.wilaya || ''}\n\nهل أنت متأكد أنك تريد إلغاء هذه الطلبية؟\n\n👉 رد بـ *نعم* لتأكيد الإلغاء، أو *لا* لإبقاء الطلبية قائمة.`;

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
    // Skip confirmation logic if customer is in active cancellation question session
    let hasCancelSession = false;
    try {
      const rawDigits = fromPhone.replace(/\D/g, '');
      const cleanPhoneKey = rawDigits.slice(-8);
      const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.cancel_state_${cleanPhoneKey}&select=value`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const stateRows = await stateRes.json();
      if (Array.isArray(stateRows) && stateRows[0]?.value) {
        hasCancelSession = true;
      }
    } catch (e) {}

    if (hasCancelSession) return false;

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
      // If customer strictly typed explicit order confirm phrase like 'أكدلي الطلبية' or 'confirme la commande'
      const explicitOrderConfirm = ['أكد الطلبية', 'تأكيد الطلبية', 'تأكيد الطلب', 'أكدلي الطلبية', 'أكدلي طلبية', 'أكدلي الطلب', 'confirme la commande', 'akedli la commande'].some(kw => normText.includes(kw) || rawLower.includes(kw));
      if (explicitOrderConfirm) {
        await sendWhatsAppMessage(fromPhone, `أهلاً بك! 🌸\nلم نجد أي طلبية معلقة مسجلة برقم هاتفك هذا حالياً لتأكيدها.`);
        return true;
      }
      // General affirmative words (oui, ok, صح, نعم) continue to Gemini AI for natural conversation
      return false;
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
                    let audioPrompt = "تفريغ صوتي بالدارجة الجزائرية.";
                    const systemInstruction = "أنت أداة تفريغ صوتي بالدارجة الجزائرية. أخرج النص المسموع فقط.";
                    
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
                  await sendWhatsAppMessage(fromPhone, "خويا لعزيز ماسمعتش الفواكال مليح، عاودلي الله يحفظك ولا اكتبهالي ميساج راني في خدمتك 🌸");
                  continue;
                }
              }

              if (!messageText) continue;
              const normText = normalizeText(messageText);
              const rawLower = String(messageText).toLowerCase().trim();
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
                // SECURITY GUARD: Strictly verify that sender phone is an AUTHORIZED STORE MANAGER in Settings!
                const storeSettings = await getStoreSettings();
                const mgrPhones = extractCleanPhonesList(
                  storeSettings.whatsappBoutiqueManager,
                  storeSettings.whatsappLivraisonManager,
                  storeSettings.whatsapp,
                  storeSettings.phoneOrders
                );

                const fromDigits = fromPhone.replace(/\D/g, '').slice(-8);
                const isManager = mgrPhones.some(p => {
                  const pDigits = p.replace(/\D/g, '').slice(-8);
                  return pDigits === fromDigits;
                });

                // Accept pure numbers like "10" or "+10" or "تزويد 10" when replying to a stock alert message
                const textWithoutTag = messageText.replace(/\[REF:[^\]]+\]/gi, '').trim();
                const isExplicitQty = /^(\+)?\d{1,4}$/.test(textWithoutTag) || /(اضافة|إضافة|تزويد|زِد|زيد|ستوك|restock)\s*(\+)?\s*\d+/i.test(textWithoutTag);

                if (!isExplicitQty) {
                  // Ignore restock attempt if message is not an explicit quantity!
                  console.log(`Blocked non-explicit restock attempt from ${fromPhone}: ${messageText}`);
                } else {
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
            }

              // STRICT AI SALES INSTRUCTIONS
              const isWholesale = ["gros", "جملة", "بالجملة", "كابة", "تجارة", "سيري", "serie", "سيريات", "كمية", "كميات", "grosiste", "grossiste", "بيع بالجملة", "شراء بالجملة"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              let salesModeRules = isWholesale
                ? "تنبيه: الزبون يسأل عن الجملة (Gros). وجهه لصفحة الجملة: https://pyjama-dz.vercel.app/gros"
                : "الزبون زبون عادي بالقطعة. دردش معه بلباقة وعفوية.";

              let prompt = `رسالة الزبون: "${messageText}"`;
              if (isWholesale) {
                prompt += `\n(تذكير: الزبون يسأل عن الجملة Gros، أعطه رابط صفحة الجملة: https://pyjama-dz.vercel.app/gros).`;
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
                  prompt += `\n\nمعلومات طلب الزبون الحالي من النظام:\n- الاسم: ${exOrder.clientName || ''}\n- رقم الطلب: #${exOrderNum}\n- المنتج: ${exOrder.product}\n- الولاية: ${exOrder.wilaya}\n- الحالة: ${exOrder.status}\nإذا طلب الزبون تأكيد الطلبية، أجب بأن الطلبية #${exOrderNum} مسجلة ومؤكدة.`;
                }
              } catch (e) {
                console.error("Error fetching order context for AI:", e);
              }

              const catalogSummary = products.map(p => {
                let colorsStr = "متوفر";
                if (Array.isArray(p.colorVariants) && p.colorVariants.length > 0) {
                  colorsStr = p.colorVariants.map(cv => {
                    const colorName = cv.name || cv.color || 'أحمر';
                    if (typeof cv.stock === 'object' && cv.stock !== null) {
                      const sizesStr = Object.entries(cv.stock).map(([sz, qty]) => {
                        const numQ = Number(qty || 0);
                        return `${sz}: ${numQ > 0 ? numQ + ' حبة' : 'نافذ'}`;
                      }).join(', ');
                      return `اللون (${colorName}): [${sizesStr}]`;
                    } else {
                      const numQ = Number(cv.stock || 0);
                      return `اللون (${colorName}): ${numQ > 0 ? numQ + ' حبة' : 'نافذ'}`;
                    }
                  }).join(' | ');
                }
                return `- ${p.title}: السعر ${p.price} دج | الستوك: ${colorsStr}`;
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
              return `للأسف المقاس (${reqSize}) في اللون (${cv.name || cv.color}) نافذ حالياً في الستوك.\nسجلنا طلبك وسنخبرك فور توفره مجدداً 🌸`;
            }
          }
        }
      }
    }
  }
  return null;
}

const systemInstruction = `أنت ياسين، بائع ومستشار تجاري جزائري حقيقي (ولد البلاد) في متجر بيجامات الجزائر Pyjama DZ.
تهدر بالدارجة الجزائرية العفوية 100% كيما يهدر أي تاجر جزائري في الحانوت، كلامك جزائري صافي، لطيف، عفوي، ومفهوم، بلا فلسفة وبلا عربية فصحى وبلا أخطاء نحوية.

أمثلة حية كيفاش تجاوب الزبون:
- الزبون: "Sha win na9der ndir commande ??" أو "كيفاش نطلب؟" أو "وين نكوموندي؟" أو "kifah ncommander" أو "baghi nchri"
  الرد: "تقدر تطلب مباشرة عبر موقعنا الرسمي: https://pyjama-dz.vercel.app تخير الموديل والمقاس، أو تقدر تمدلي هنا في الواتساب المقاس، اللون، الولاية ورقمك ونسجلهالك أنا فوراً خويا لعزيز 🌸"

- الزبون: "حاب نجي للمحل" أو "وين جاي المحل نتاعكم؟" أو "l'adresse du magasin"
  الرد: "مرحباً بيك في أي وقت تشرفنا في المحل خويا لعزيز! 📍 مقرنا ومحلنا في: ${storeAddressDisplay}، ورابط موقعنا على خريطة جوجل: ${storeMapsUrl || 'https://maps.google.com'}، والتوصيل متوفر أيضاً لجميع 58 ولاية 🚚"

- الزبون: "slm" أو "rakom mlaah cv"
  الرد: "وعليكم السلام ورحمة الله، رانا غاية ولاباس الحمد لله ربي يحفظك خويا لعزيز! كاش ما راك تحوس على موديل معين أو حاب تسقسي على حاجة؟ 🌸"

- الزبون: "حاب نشري بصح راني خايف" أو "Raanii haab nchrii bssh ranii khaayef"
  الرد: "ماتخاف والو خويا لعزيز حقك مضمون 100%! التوصيل يوصلك حتى لباب الدار، وتفتح الكولي وتشوف البيجامة وتلمس القماش وتفيري فيها قدام ليفرو قبل ما تخلص، وإذا ماعجباتكش ترجعها عادي وما تخسر حتى دورو 🌸"

- الزبون: "Sha goli sualty chaba ??" أو "la qualite chaba ??" أو "نوعية مليحة؟"
  الرد: "جودة روعة وساتان وقطن أصلي خياطة نقية ومريحة في اللبس! وعينك هي ميزانك كي يوصلك وتلمس القماش راح يعجبك بالبزاف خويا لعزيز 🌸"

- الزبون: "شحال السومة؟" أو "chhal les prix"
  الرد: "أسعارنا تبدأ من 2800 دج للموديلات الفاخرة! إذا حاب تشوف كامل الموديلات والألوان تفضل لموقعنا: https://pyjama-dz.vercel.app"

- الزبون: "Sha choof golii chhal tc3ood baah twssalnii la commande ??" أو "شحال تقعد باه توصل؟" أو "وقتاش توصلني؟" أو "délai de livraison" أو "wa9tech toussel"
  الرد: "التوصيل سريع خويا لعزيز! يقعد من 24 إلى 48 ساعة فقط وتكون عندك الكولي لباب دارك أو للمكتب، ويعيطلك ليفرو قبل ما يوصل لعندك 🚚📦"

- الزبون: "كاش توصيل لوهران/سطيف/الجزائر؟" أو "livraison dispo ?"
  الرد: "إيه نعم كاين التوصيل متوفر لجميع 58 ولاية حتى لباب دارك والدفع عند الاستلام بعد المعاينة 🚚"

قواعدك الصارمة:
1. اكتب دائماً باللغة العربية بحروف عربية فقط وبشكل بشري طبيعي.
2. جاوب مباشرة على سؤال الزبون بدون إعادة السلام أو التحية إذا كان الحوار جاري.
3. جاوب بدقة على قد السؤال في سطرين أو 3 أسطر فقط.
4. تفهم تماماً كل كلمات الدارجة والفرانكو (commande, commander, souma, chhal, tc3ood, twssal, wa9tech, delai, qualite, sualty, dispo, taille, livree, win jayiin, plassa, haanoot, boutique, gros).
5. إذا طلب تأكيد الطلبية ضع في ردك [ACTION:CONFIRM_ORDER]، وإذا أصر على الإلغاء ضع [ACTION:CANCEL_ORDER]، وإذا طلب صور الموديلات ضع [ACTION:SEND_PHOTOS].

بيانات المتجر:
- العنوان والمقر: ${storeAddressDisplay}
- رابط خرائط جوجل: ${storeMapsUrl}
- رابط الموقع: https://pyjama-dz.vercel.app
- رابط الجملة: https://pyjama-dz.vercel.app/gros

المنتجات والستوك:
${catalogSummary}
${salesModeRules}`;

              // 1. Check for order cancellation or confirmation reply from customer FIRST
              const handledOrderCancel = await processOrderCancellationIntent(fromPhone, messageText);
              if (handledOrderCancel) continue;

              const handledOrderConfirm = await processOrderConfirmationIntent(fromPhone, messageText);
              if (handledOrderConfirm) continue;

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
        await processIncomingPayload(body);
      } catch (err) {
        console.error('Error processing webhook payload:', err);
      }
    }

    if (typeof res.status === 'function') {
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
