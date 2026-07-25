const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSM37Yt8dJzrCdGGDpEsLIFeRsNVJBTttPpLOcVY7oZA1oSrCJRjt2ucX2SdKFzzxzX79Ta80VnMHGhYIUntskK1PayfM62XCBeZBa1ZB6qAIITdXtZAabRSY4aVllwVZBQvSZA26AjjxwnnRNaZAZARMSSDh2nHkAv4wbpBv01SD6jILRZCCWTN1YZBISZANkmAQo5XaoGI3rEKFySvFazi2kTHHW1ZCORfZA8s0LXDr98jNyHUMNzAs9nMM64ZAIrAaLbrPnbXXDDh4MB';

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

function getGeminiKeys() {
  const keys = [];
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k && k.trim()) keys.push(k.trim());
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    if (!keys.includes(process.env.GEMINI_API_KEY.trim())) {
      keys.push(process.env.GEMINI_API_KEY.trim());
    }
  }
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
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const metaData = await metaRes.json();
    if (metaData && metaData.url) {
      const audioRes = await fetch(metaData.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const arrayBuf = await audioRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      const mimeType = metaData.mime_type ? metaData.mime_type.split(';')[0].trim() : 'audio/ogg';
      return { base64, mimeType };
    }
  } catch (err) {
    console.error('Error downloading Meta media:', err);
  }
  return null;
}

async function generateGeminiAudio(base64Audio, mimeType, promptText, systemInstruction = "") {
  const modelEndpoints = ['gemini-2.0-flash', 'gemini-flash-latest'];
  const keys = getGeminiKeys();
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
                  text: promptText || "استمع لهذا التسجيل الصوتي للزبون الجزائري (Vocal)، وافهم طلبه أو سؤاله بدقة وأجب عليه حسب بيانات المتجر والطلبيات."
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
          if (text) return text.trim();
        } else {
            console.error(`Gemini Audio error for ${model}: ${res.status}`);
        }
      } catch (err) {
        console.error('Gemini Audio error:', err);
      }
    }
  }
  return null;
}

async function generateGeminiAI(prompt, systemInstruction = "") {
  const modelEndpoints = ['gemini-2.0-flash', 'gemini-flash-latest'];
  const keys = getGeminiKeys();
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
            generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
          })
        });

        if (res.status === 200) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else {
            console.error(`Gemini AI error for ${model}: ${res.status}`);
        }
      } catch (err) {
        console.error('Gemini error:', err);
      }
    }
  }

  // No more rigid natural fallbacks. The AI is fully capable of answering everything naturally.

  return `🌸 *متجر Pyjama DZ* 🌸\n\nأهلاً وسهلاً بك! ❤️ تفضل كيف يمكننا مساعدتك في الاختيار اليوم؟ ✨`;
}

async function sendWhatsAppMessage(toPhone, textBody) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone) return;
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
        text: { preview_url: false, body: textBody }
      })
    });
    const data = await res.json();
    console.log('WhatsApp send result:', data);
    return data;
  } catch (err) {
    console.error('Send WhatsApp error:', err);
  }
}

async function sendWhatsAppImage(toPhone, imageUrl, captionText = "") {
  const token = await getMetaAccessToken();
  if (!token || !imageUrl || !imageUrl.startsWith('http')) return;
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
          caption: captionText
        }
      })
    });
    const data = await res.json();
    console.log('WhatsApp send image result:', data);
  } catch (err) {
    console.error('Send WhatsApp Image error:', err);
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

              const phonesArr = extractCleanPhonesList(
                storeSettings.phoneOrders,
                storeSettings.phones,
                storeSettings.whatsapp,
                "0771335039"
              );

              const formattedPhonesBullets = phonesArr.length > 0
                ? phonesArr.map(p => `• ${p}`).join('\n')
                : '• 0771335039';

              const storeAddressDisplay = storeSettings.address || "ولاية الشلف - Chlef";
              const storeMapsUrl = storeSettings.googleMapsUrl || storeSettings.googleMaps || "";
              const storeInstaUrl = storeSettings.instagramUrl || storeSettings.instagram || "";
              const storeName = storeSettings.storeName || "Pyjama DZ";

              // 🎙️ VOICE NOTE / AUDIO HANDLER (Multimodal Audio Understanding)
              if (messageType === 'audio' || messageType === 'voice') {
                const audioId = message.audio?.id || message.voice?.id;
                console.log(`Received Audio Note / Vocal (${audioId}) from ${fromPhone}`);
                
                if (audioId) {
                  const media = await downloadMetaMedia(audioId);
                  if (media && media.base64) {
                    let audioPrompt = `أنت أداة Speech-to-Text. وظيفتك الوحيدة هي تفريغ النص من هذا التسجيل الصوتي للزبون. الزبون يتحدث بالدارجة الجزائرية (العامية).
اكتب الكلمات التي نطقها الزبون حرفياً كما هي بالدارجة.
ممنوع كتابة أي كلمة من عندك. ممنوع التلخيص.
إذا كان الصوت عبارة عن صمت تام أو ضجيج بدون أي كلام بشري، أخرج كلمة واحدة فقط: "غير_مفهوم". لا تطلب من الزبون الكتابة أبداً.`;
                    const systemInstruction = "أنت أداة تفريغ صوتي (Speech-to-Text) جزائرية. أخرج النص المسموع حرفياً بالدارجة الجزائرية. لا تطلب من المستخدم الكتابة أبداً.";
                    
                    let transcript = await generateGeminiAudio(media.base64, media.mimeType, audioPrompt, systemInstruction);
                    if (transcript) {
                      console.log(`Vocal Transcription for ${fromPhone}: ${transcript}`);
                      if (transcript.includes("غير_مفهوم") || transcript.includes("غير مفهوم")) {
                        await sendWhatsAppMessage(fromPhone, `🌸 *متجر Pyjama DZ* 🌸\nأهلاً بك! عذراً، لم أتمكن من سماع الصوت بوضوح 😔.\nكيف يمكنني مساعدتك في الاختيار اليوم؟ ✨`);
                        continue; // Skip further processing
                      }
                      messageText = transcript; // Feed the transcript into the standard text pipeline!
                    }
                  }
                }
              }

              if (!messageText) continue;
              console.log(`Received text message from ${fromPhone}: ${messageText}`);

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
                    await sendWhatsAppMessage(fromPhone, `🌸 *متجر Pyjama DZ* 🌸\n\n✅ *تم تحديث السطوك بنجاح!*\n• المنتج: ${product.title}\n• اللون/المقاس: ${updatedVariants[colorIdx].name} (${size})\n• الكمية المضافة: +${addedQty}\n• السطوك الحالي: ${newQty} حبة ✨`);
                    continue;
                  }
                }
              }

              const normText = normalizeText(messageText);

              // EXPANDED CONFIRMATION & CANCELLATION KEYWORDS
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

              // Only trigger hardcoded confirm/cancel if the message is short (likely a direct command)
              const wordCount = messageText.trim().split(/\s+/).length;
              const isConfirmation = order && wordCount <= 5 && confirmKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              const isCancellation = order && wordCount <= 5 && cancelKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));

              if (isConfirmation) {
                // 1. UPDATE DB ORDER STATUS TO 'confirmee' AND SET archived: true AUTOMATICALLY!
                await updateOrderStatusAndArchive(order.id, 'confirmee');
                const orderNumStr = await getSequentialOrderNum(order);

                // 2. SHORT & DIRECT THANK YOU & DB CONFIRMATION REPLY TO CUSTOMER
                const confirmMsg = `شكراً لك سيد ${order.clientName || 'الزبون'}! ❤️ تم تأكيد طلبيتك رقم #${orderNumStr} بنجاح في السيستم وجاري تجهيزها للشحن! 🚚✨`;
                await sendWhatsAppMessage(fromPhone, confirmMsg);
                continue;
              } else if (isCancellation) {
                // 1. UPDATE DB ORDER STATUS TO 'annulee' AND SET archived: true AUTOMATICALLY!
                await updateOrderStatusAndArchive(order.id, 'annulee');
                const orderNumStr = await getSequentialOrderNum(order);

                // 2. SHORT & DIRECT CANCELLATION CONFIRMATION REPLY TO CUSTOMER
                const cancelMsg = `تم إلغاء الطلبية رقم #${orderNumStr} بنجاح في السيستم بناءً على رغبتك سيد ${order.clientName || 'الزبون'}. نأمل أن نخدمك في المرات القادمة! ✨`;
                await sendWhatsAppMessage(fromPhone, cancelMsg);
                continue;
              }

              // B. PHONE NUMBER INTERCEPTOR (Numero / num / هاتف / نميرو / رقم المحل)
              const isPhoneQuery = ["numero", "nomer", "num", "هاتف", "رقم المحل", "نميرو", "نومرو"].some(p => normText.includes(p) || messageText.toLowerCase().includes(p));
              if (isPhoneQuery) {
                const phoneReply = `🌸 *متجر Pyjama DZ* 🌸\n\n📞 *أرقام التواصل والواتساب الرسمية:*\n━━━━━━━━━━━━━━━\n${formattedPhonesBullets}\n━━━━━━━━━━━━━━━\n✨ نحن في خدمتك دائماً!`;
                await sendWhatsAppMessage(fromPhone, phoneReply);
                continue;
              }

              // G. STRICT SUPABASE SETTINGS & DATABASE STRICTNESS RULE
              const isWholesale = ["gros", "جملة", "بالجملة", "كابة", "تجارة", "سيري", "serie", "سيريات", "كمية", "كميات"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              
              let salesModeRules = "";
              if (isWholesale) {
                salesModeRules = `الزبون يسأل عن بالجملة (Gros). أجب حصراً عن أسعار وشروط الجملة والسيريات من النظام.`;
              } else {
                salesModeRules = `الزبون زبون عادي بالقطعة. أجب عن سؤاله حصراً وحقيقياً من بيانات الـ Settings والـ Database فقط.`;
              }

              let prompt = `رسالة الزبون: "${messageText}"`;
              let orderNumStr = "58";
              if (order) {
                orderNumStr = await getSequentialOrderNum(order);
                prompt += `\nمعلومات طلب الزبون الحالي من الداتابيز:\n- الاسم: ${order.clientName || order.nom}\n- رقم الطلب: #${orderNumStr}\n- المنتج: ${cleanProductText(order.product)}\n- الولاية: ${order.wilaya}\n- الحالة الحالية: ${order.status}`;
              }

              const catalogSummary = products.map(p => `- ${p.title}: ${p.price}دج`).join('\n');
              const settingsSummary = Object.entries(storeSettings).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');

              const systemInstruction = `أنت مساعد مبيعات ذكي لمتجر (${storeName}).
قوانينك الصارمة:
1. ابدأ دائماً بـ: "🌸 *متجر Pyjama DZ* 🌸" في أول سطر.
2. أجب باختصار وبشكل مباشر على سؤال الزبون من بيانات المتجر فقط (الأسعار، الصور، الرابط، العنوان).
3. إذا طلب الزبون رابط الموقع (link, lien, موقع, سيت)، أعطه الرابط مباشرة: https://pyjama-dz.vercel.app ولا تضف كلاماً فارغاً.
4. إذا سأل عن مقر المتجر (وين جايين)، أعطه العنوان ورابط الخرائط مباشرة.
5. لا تكتب ردوداً طويلة جداً أو روبوتية. تصرف كإنسان لبق ومحترف.
6. ممنوع منعاً باتاً أن تطلب من الزبون "كتابة" طلبه أو سؤاله.
7. إذا كانت رسالة الزبون قصيرة أو مجرد تحية (مثل "أوكي"، "سلام"، "شكرا")، رحب به واسأله كيف يمكنك مساعدته اليوم في طلب البيجامات، ولا تكتفِ بطباعة العنوان فقط!

بيانات المتجر من الإعدادات (Settings):
- أرقام الهاتف: ${formattedPhonesBullets}
- العنوان / المقر: ${storeAddressDisplay}
- رابط خرائط جوجل: ${storeMapsUrl}
- رابط انستغرام: ${storeInstaUrl}
${settingsSummary}

قائمة المنتجات (Products):
${catalogSummary}

موقع المتجر الإلكتروني: https://pyjama-dz.vercel.app
${salesModeRules}`;

              const aiReply = await generateGeminiAI(prompt, systemInstruction);
              if (aiReply) {
                await sendWhatsAppMessage(fromPhone, aiReply);
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
  // 1. Webhook Verification (Meta Verification Challenge)
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

  // 2. Incoming Messages
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
