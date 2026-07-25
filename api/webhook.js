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

const GEMINI_KEYS = [
  Buffer.from('QVEuQWI4Uk42THJfRndDWGdzWnpvNUI3X0ZHTXV2OTJ3V2I2MFpOd3hSaUlSallMdmpB', 'base64').toString('utf8'),
  Buffer.from('QVEuQWI4Uk42SWpweDNfcmhWYTBGZDZ4R181aUJ3M3Z4aVZDamR5OURYelBQVDBaZFJn', 'base64').toString('utf8'),
  Buffer.from('QVEuQWI4Uk42SnFZODAtdWVvaTJfVG9RQVAwamNmblZLdnZjZFp2VmR5X24wbU9seTd3', 'base64').toString('utf8'),
  Buffer.from('QVEuQWI4Uk42SnJiWXFJaDJEa3lyRU5MVXJNVkRVZ2xSSjlqZWZ6WXk4aEFyYnNNMGxaZXc=', 'base64').toString('utf8')
];

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
  const modelEndpoints = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
  for (const selectedKey of GEMINI_KEYS) {
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
        }
      } catch (err) {
        console.error('Gemini Audio error:', err);
      }
    }
  }
  return null;
}

async function generateGeminiAI(prompt, systemInstruction = "") {
  const modelEndpoints = ['gemini-3.5-flash-lite', 'gemini-flash-latest'];
  for (const selectedKey of GEMINI_KEYS) {
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
        }
      } catch (err) {
        console.error('Gemini error:', err);
      }
    }
  }

  // Dynamic natural fallbacks
  const pLower = prompt.toLowerCase();
  if (pLower.includes('kayn ghir') || pLower.includes('غير هذا') || pLower.includes('اخرين')) {
    return `🌸 *متجر Pyjama DZ* 🌸\n\n✨ عندنا عدة أرقام وموديلات متنوعة في السيستم!\n🛍️ تفضل بزيارة موقعنا لرؤية كافة الموديلات: https://pyjama-dz.vercel.app ✨`;
  }
  if (pLower.includes('quality') || pLower.includes('جودة') || pLower.includes('نوعية')) {
    return `🌸 *متجر Pyjama DZ* 🌸\n\n✨ الجودة ممتازة 100% وقماش رفيع ومريح جداً كما في الصور بالضبط! ✨`;
  }
  if (pLower.includes('winta') || pLower.includes('وقتاش') || pLower.includes('وقت')) {
    return `🌸 *متجر Pyjama DZ* 🌸\n\n🚚 *مدة التوصيل:* من 24 إلى 48 ساعة فقط لجميع الولايات 58! ✨`;
  }
  if (pLower.includes('slm') || pLower.includes('سلام') || pLower.includes('alo') || pLower.includes('الوو')) {
    return `🌸 *متجر Pyjama DZ* 🌸\n\nوعليكم السلام ورحمة الله! ❤️ أهلاً بك، تفضل كيف يمكننا مساعدتك اليوم؟ ✨`;
  }
  if (pLower.includes('prix') || pLower.includes('سعر') || pLower.includes('سومة')) {
    return `🌸 *متجر Pyjama DZ* 🌸\n\n🛍️ أسعارنا ممتازة ويمكنك الاطلاع على تفاصيل كافة الموديلات عبر موقعنا:\n🌐 https://pyjama-dz.vercel.app ✨`;
  }

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
                    let audioPrompt = "استمع للـ Vocal الجزائري. هل قام بتأكيد الطلبية (أوك، ابعث، نعم)؟ أم قام بإلغائها (بطلت، لا، مازال)؟ أم مجرد سؤال؟";
                    let orderNumStr = "58";
                    if (order) {
                      orderNumStr = await getSequentialOrderNum(order);
                      audioPrompt += `\nبيانات طلب الزبون الحالي:\n- الاسم: ${order.clientName || order.nom}\n- رقم الطلب: #${orderNumStr}\n- الحالة الحالية: ${order.status}`;
                    }

                    const catalogSummary = products.map(p => `- ${p.title}: ${p.price}دج`).join('\n');
                    const systemInstruction = `أنت مساعد مبيعات لمتجر (${storeName}).
قوانين الاستماع والرد الحتمية:
1. استمع للـ Vocal الخاص بالزبون الجزائري بكل دقة لتحديد نيته.
2. هل الزبون يؤكد الطلبية؟ (يقول: ابعث، اوكي، اكد، جيبها، نعم، صح...). 
إذا نعم، يجب أن يبدأ ردك بالضبط بهاتين الكلمتين: [CONFIRM_ORDER] متبوعة بـ 🌸 *متجر Pyjama DZ* 🌸 ثم رسالة قصيرة: "شكراً لك سيد ${order?.clientName || 'الزبون'}! ❤️ تم تأكيد طلبيتك رقم #${orderNumStr} بنجاح في السيستم وجاري تجهيزها للشحن! 🚚✨".
3. هل الزبون يلغي الطلبية؟ (يقول: بطلت، الغي، ما تجيبش، لا، حبس...). 
إذا نعم، يجب أن يبدأ ردك بالضبط بهاتين الكلمتين: [CANCEL_ORDER] متبوعة بـ 🌸 *متجر Pyjama DZ* 🌸 ثم رسالة قصيرة: "تم إلغاء الطلبية رقم #${orderNumStr} بنجاح في السيستم بناءً على رغبتك سيد ${order?.clientName || 'الزبون'}."
4. إذا كان يسأل سؤالاً عادياً وليس تأكيداً أو إلغاء، ابدأ ردك بـ: "🌸 *متجر Pyjama DZ* 🌸" وأجب بأسلوب جزائري مهذب.

بيانات المتجر:
- أرقام الهاتف: ${formattedPhonesBullets.replace(/\n/g, ' ')}
${catalogSummary}`;

                    let audioReply = await generateGeminiAudio(media.base64, media.mimeType, audioPrompt, systemInstruction);
                    if (audioReply) {
                      if (audioReply.includes('[CONFIRM_ORDER]')) {
                        if (order) await updateOrderStatusAndArchive(order.id, 'confirmee');
                        audioReply = audioReply.replace('\\[CONFIRM_ORDER\\]', '').replace('[CONFIRM_ORDER]', '').trim();
                      } else if (audioReply.includes('[CANCEL_ORDER]')) {
                        if (order) await updateOrderStatusAndArchive(order.id, 'annulee');
                        audioReply = audioReply.replace('\\[CANCEL_ORDER\\]', '').replace('[CANCEL_ORDER]', '').trim();
                      }
                      await sendWhatsAppMessage(fromPhone, audioReply);
                      continue;
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

              const isConfirmation = order && confirmKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              const isCancellation = order && cancelKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));

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

              // C. ORDER LOOKUP INTERCEPTOR (Commande / طلبية / طلبيتي / شوف طلبيتي)
              const isOrderQuery = ["commande", "طلب", "طلبية", "طلبيتي", "كوماند"].some(o => normText.includes(o));
              if (isOrderQuery) {
                if (order) {
                  const orderNum = await getSequentialOrderNum(order);
                  const isConf = (order.status === 'confirmee' || order.status === 'Confirmé');
                  const isCanc = (order.status === 'annulee' || order.status === 'Annulé');
                  const statusName = isConf ? 'مؤكدة وفي مرحلة الشحن 🚚' : (isCanc ? 'ملغاة ❌' : 'جديدة قيد التجهيز ⏳');
                  const prodText = cleanProductText(order.product);

                  let orderReply = `🌸 *متجر Pyjama DZ* 🌸\n\nأهلاً بك سيد ${order.clientName || 'الزبون'}! ❤️\n\n📋 *تفاصيل الطلبية:*\n━━━━━━━━━━━━━━━\n📦 *رقم الطلب:* #${orderNum}\n🛍️ *المنتجات:* ${prodText}\n🚚 *الولاية:* ${order.wilaya || ''}\n📌 *الحالة:* ${statusName}\n━━━━━━━━━━━━━━━`;
                  
                  if (!isConf && !isCanc) {
                    orderReply += `\n\n✨ يرجى الرد بـ كلمة (*تأكيد*) أو (*إلغاء*) لتجهيز شحنتك فوراً!`;
                  } else if (isConf) {
                    orderReply += `\n\n✅ طلبك مؤكد 100% وفي مرحلة الشحن والتوصيل! شكراً لثقتك بنا.`;
                  }
                  
                  await sendWhatsAppMessage(fromPhone, orderReply);
                } else {
                  await sendWhatsAppMessage(fromPhone, `🌸 *متجر Pyjama DZ* 🌸\n\nلم نجد طلبية مسجلة برقم هاتفك الحالي. يمكنك الطلب المباشر وسنكون في خدمتك عبر موقعنا:\n🌐 https://pyjama-dz.vercel.app ✨`);
                }
                continue;
              }

              // D. DELIVERY DURATION INTERCEPTOR
              const isTimeQuery = ["winta", "wakt", "وقتاش", "متى", "وقت", "شحال وقت", "شحال وتقاش", "مدة"].some(t => normText.includes(t));
              if (isTimeQuery) {
                await sendWhatsAppMessage(fromPhone, `🌸 *متجر Pyjama DZ* 🌸\n\n⏱️ *مدة التوصيل:*\nمن 24 إلى 48 ساعة فقط لجميع الولايات 58! 🚚✨`);
                continue;
              }

              // E. LOCATION INTERCEPTOR
              const isLocationQuery = ["plassa", "مكان", "مقر", "بلاصة", "اين", "وين جايين", "وين المقر", "موقع"].some(l => normText.includes(l)) || (normText.split(/\s+/).includes("win") || normText.split(/\s+/).includes("وين"));
              if (isLocationQuery) {
                let locMsg = `🌸 *متجر Pyjama DZ* 🌸\n\n📍 *مقرنا الرئيسي:*\n${storeAddressDisplay}\n\n🚚 *التوصيل متوفر لجميع 58 ولاية لغاية باب دارك!* ✨`;
                if (storeMapsUrl) locMsg += `\n📍 *رابط الخريطة:* ${storeMapsUrl}`;
                await sendWhatsAppMessage(fromPhone, locMsg);
                continue;
              }

              let prompt = `رسالة الزبون: "${messageText}"`;
              let orderNumStr = "58";
              if (order) {
                orderNumStr = await getSequentialOrderNum(order);
                prompt += `\nمعلومات طلب الزبون الحالي من الداتابيز:\n- الاسم: ${order.clientName || order.nom}\n- رقم الطلب: #${orderNumStr}\n- المنتج: ${cleanProductText(order.product)}\n- الولاية: ${order.wilaya}\n- الحالة الحالية: ${order.status}`;
              }

              // F. CHECK IF USER ASKS FOR PRODUCT IMAGES
              const wantsImages = ["photo", "chof", "modele", "موديل", "تصاور", "صور", "شوف", "صورة", "موديلات"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              
              if (wantsImages) {
                let sentCount = 0;
                if (products.length > 0) {
                  for (const p of products) {
                    const firstVar = p.colorVariants?.[0];
                    const imgUrl = firstVar?.images?.[0] || p.image;
                    if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                      await sendWhatsAppImage(fromPhone, imgUrl, `✨ ${p.title}\n🎨 الألوان: ${p.colorVariants?.map(v => v.name).join(', ') || 'متعددة'}`);
                      sentCount++;
                      if (sentCount >= 2) break;
                    }
                  }
                }
                await sendWhatsAppMessage(fromPhone, `🌸 *متجر Pyjama DZ* 🌸\n\n✨ تفضل صور أفضل الموديلات والتصاور الحقيقية عبر موقعنا:\n🌐 https://pyjama-dz.vercel.app 🛍️`);
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

              const catalogSummary = products.map(p => `- ${p.title}: ${p.price}دج`).join('\n');
              const settingsSummary = Object.entries(storeSettings).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');

              const systemInstruction = `أنت مساعد مبيعات لمتجر (${storeName}).
قوانين التنسيق والشكل الحتمية:
1. ابدأ دائماً الرد بـ: "🌸 *متجر Pyjama DZ* 🌸".
2. اكتب الرد دائماً بشكل أنيق ومستف ومدرج بنقاط واضحة (bullet points •) ورموز تعبيرية راقية.
3. تجنب الكتل النصية الطويلة، واجعل الرسالة مرتبة ومنسقة 100%. لا تضع نقاط غريبة قبل الإيموجي أو رموز زائفة في آخر الرسالة!
4. أصل الإجابة مباشرة وحصراً من بيانات الـ Settings والـ Database أدناه.

بيانات المتجر من الإعدادات (Settings):
- أرقام الهاتف الرسمية:
${formattedPhonesBullets}
- العنوان / المقر: ${storeAddressDisplay}
- رابط خرائط جوجل: ${storeMapsUrl}
- رابط انستغرام: ${storeInstaUrl}
${settingsSummary}

قائمة المنتجات الحالية من قاعدة البيانات (Products):
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
