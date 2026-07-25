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

function extractCleanPhones(...sources) {
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

  const unique = [...new Set(rawList)];
  return unique.length > 0 ? unique.join(' - ') : '0771335039';
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
            generationConfig: { temperature: 0.2, maxOutputTokens: 100 }
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
    return `عندنا عدة أرقام وموديلات متنوعة في السيستم! تفضل بزيارة موقعنا لرؤية كافة الموديلات: https://pyjama-dz.vercel.app ✨`;
  }
  if (pLower.includes('quality') || pLower.includes('جودة') || pLower.includes('نوعية')) {
    return `الجودة ممتازة 100% وقماش رفيع ومريح جداً كما في الصور بالضبط! ✨`;
  }
  if (pLower.includes('winta') || pLower.includes('وقتاش') || pLower.includes('وقت')) {
    return `التوصيل يستغرق من 24 إلى 48 ساعة فقط لجميع الولايات! 🚚✨`;
  }
  if (pLower.includes('slm') || pLower.includes('سلام') || pLower.includes('alo') || pLower.includes('الوو')) {
    return `وعليكم السلام ورحمة الله! 🌸 أهلاً بك في متجر Pyjama DZ، تفضل كيف يمكننا مساعدتك؟ ✨`;
  }
  if (pLower.includes('prix') || pLower.includes('سعر') || pLower.includes('سومة')) {
    return `أهلاً بك! يمكنك الاطلاع على أسعار كافة الموديلات بالتفصيل عبر موقعنا: https://pyjama-dz.vercel.app ✨`;
  }

  return `أهلاً وسهلاً بك في متجر Pyjama DZ! 🌸 تفضل كيف يمكننا مساعدتك اليوم؟ ✨`;
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

async function updateOrderStatus(orderId, newStatus, botStatus) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`;
    await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: newStatus, bot_status: botStatus })
    });
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
            const messageText = message.text?.body;

            if (messageText && fromPhone) {
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
                    await sendWhatsAppMessage(fromPhone, `✅ تم تحديث السطوك بنجاح! تم إضافة +${addedQty} حبة للمنتج "${product.title}" (${updatedVariants[colorIdx].name} - ${size}). السطوك الحالي الآن: ${newQty} حبة.`);
                    continue;
                  }
                }
              }

              const cleanPhone = fromPhone.replace(/^\+?213/, '0');
              const order = await getLatestOrderForPhone(cleanPhone);
              const products = await getAllProducts();
              const storeSettings = await getStoreSettings();

              // Extract SPOTLESS clean phone numbers list from settings
              const storePhonesDisplay = extractCleanPhones(
                storeSettings.phoneOrders,
                storeSettings.phones,
                storeSettings.whatsapp,
                "0771335039"
              );

              const storeAddressDisplay = storeSettings.address || "chlef-chlef";
              const storeMapsUrl = storeSettings.googleMapsUrl || storeSettings.googleMaps || "";
              const storeInstaUrl = storeSettings.instagramUrl || storeSettings.instagram || "";
              const storeName = storeSettings.storeName || "Pyjama DZ";

              const normText = normalizeText(messageText);

              // B. PHONE NUMBER INTERCEPTOR (Numero / num / هاتف / نميرو / رقم المحل)
              const isPhoneQuery = ["numero", "nomer", "num", "هاتف", "رقم المحل", "نميرو", "نومرو"].some(p => normText.includes(p) || messageText.toLowerCase().includes(p));
              if (isPhoneQuery) {
                await sendWhatsAppMessage(fromPhone, `أهلاً بك! أرقام هاتف المحل الرسمية المسجلة في الإعدادات:\n📞 ${storePhonesDisplay} ✨`);
                continue;
              }

              // C. ORDER LOOKUP INTERCEPTOR (Commande / طلبية / طلبيتي / شوف طلبيتي)
              const isOrderQuery = ["commande", "طلب", "طلبية", "طلبيتي", "كوماند"].some(o => normText.includes(o));
              if (isOrderQuery) {
                if (order) {
                  const orderNum = await getSequentialOrderNum(order);
                  const statusName = order.status === 'Confirmé' ? 'مؤكدة وفي مرحلة الشحن 🚚' : (order.status === 'Annulé' ? 'ملغاة ❌' : 'جديدة قيد التجهيز ⏳');
                  const prodText = cleanProductText(order.product);
                  await sendWhatsAppMessage(fromPhone, `أهلاً بك سيد ${order.clientName || 'الزبون'}! ❤️\n\n📦 رقم الطلبية: #${orderNum}\n🛍️ المنتجات: ${prodText}\n🚚 الولاية: ${order.wilaya || ''}\n📌 الحالة: ${statusName}\n\nيرجى الرد بـ كلمة (تأكيد) للتجهيز والشحن فوراً! ✨`);
                } else {
                  await sendWhatsAppMessage(fromPhone, `لم نجد طلبية جديدة مسجلة برقم هاتفك الحالي في الداتابيز. يمكنك الطلب المباشر عبر موقعنا: https://pyjama-dz.vercel.app ✨`);
                }
                continue;
              }

              // D. DELIVERY DURATION INTERCEPTOR
              const isTimeQuery = ["winta", "wakt", "وقتاش", "متى", "وقت", "شحال وقت", "شحال وتقاش", "مدة"].some(t => normText.includes(t));
              if (isTimeQuery) {
                await sendWhatsAppMessage(fromPhone, `التوصيل يستغرق من 24 إلى 48 ساعة فقط لجميع الولايات! 🚚✨`);
                continue;
              }

              // E. LOCATION INTERCEPTOR
              const isLocationQuery = ["plassa", "مكان", "مقر", "بلاصة", "اين", "وين جايين", "وين المقر", "موقع"].some(l => normText.includes(l)) || (normText.split(/\s+/).includes("win") || normText.split(/\s+/).includes("وين"));
              if (isLocationQuery) {
                let locMsg = `مقرنا الرئيسي في ${storeAddressDisplay}، والتوصيل متوفر لجميع 58 ولاية لغاية باب دارك! ✨`;
                if (storeMapsUrl) locMsg += `\n📍 رابط الخريطة: ${storeMapsUrl}`;
                await sendWhatsAppMessage(fromPhone, locMsg);
                continue;
              }

              let prompt = `رسالة الزبون: "${messageText}"`;
              let orderNumStr = "58";
              if (order) {
                orderNumStr = await getSequentialOrderNum(order);
                prompt += `\nمعلومات طلب الزبون الحالي من الداتابيز:\n- الاسم: ${order.clientName || order.nom}\n- رقم الطلب: #${orderNumStr}\n- المنتج: ${cleanProductText(order.product)}\n- الولاية: ${order.wilaya}\n- الحالة الحالية: ${order.status}`;
              }

              const confirmKeywords = [
                'takid', 'taekid', 'taked', 'ta3kid', 'taakid', 'confirm', 'confirmi',
                'ok', 'oui', 'daccord', 'daweq', 'sah', 'yep', 'yeah',
                'تاكيد', 'تأكيد', 'نعم', 'اوكي', 'اكدي', 'اكيد', 'موافق', 'ابعث', 'شحن', 'ارسل', 'ابعثها', 'جدية'
              ];

              const cancelKeywords = [
                'annul', 'cancel', 'non', 'حبس', 'بطلت', 'بطلت', 'ما تبعث', 'لا', 'الغاء', 'إلغاء', 'نحي', 'انولي'
              ];

              const isConfirmation = order && confirmKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
              const isCancellation = order && cancelKeywords.some(k => normText.includes(k) || messageText.toLowerCase().includes(k));

              if (isConfirmation) {
                await updateOrderStatus(order.id, 'Confirmé', 'confirmed');
                await sendWhatsAppMessage(fromPhone, `شكراً لك سيد ${order.clientName || order.nom}! ❤️\n\n✅ تم تأكيد طلبيتك رقم #${orderNumStr} بنجاح!\n🚚 جاري التجهيز والشحن المباشر إلى ولاية ${order.wilaya || ''}. ✨`);
                continue;
              } else if (isCancellation) {
                await updateOrderStatus(order.id, 'Annulé', 'canceled');
                await sendWhatsAppMessage(fromPhone, `تم إلغاء الطلبية رقم #${orderNumStr} بناءً على رغبتك سيد ${order.clientName || order.nom}. نأمل أن نخدمك في المرات القادمة! ✨`);
                continue;
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
                await sendWhatsAppMessage(fromPhone, `تفضل صور أفضل الموديلات والتصاور الحقيقية عبر موقعنا: https://pyjama-dz.vercel.app 🌸✨`);
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
قانون صارم وحتمي لا تصدر عنه مطلقاً:
أنت تجيب الزبون حتماً وفقط بناءً على الرقم التسلسلي للطلبية والمعلومات والبيانات الحقيقية المسجلة في النظام والـ Settings والـ Database أدناه.
ممنوع نهائياً خياطة أو افتراض أي أرقام UUID مثل D6A3D2C6 أو معلومات غير موجودة في البيانات التالية!

بيانات المتجر من الإعدادات (Settings):
- أرقام الهاتف الرسمية: ${storePhonesDisplay}
- العنوان / المقر: ${storeAddressDisplay}
- رابط خرائط جوجل: ${storeMapsUrl}
- رابط انستغرام: ${storeInstaUrl}
${settingsSummary}

قائمة المنتجات الحالية من قاعدة البيانات (Products):
${catalogSummary}

موقع المتجر الإلكتروني: https://pyjama-dz.vercel.app
${salesModeRules}
إذا طلب الزبون أي معلومة (أرقام هاتف، انستغرام، موقع، خرائط، أسعار، رقم طلبية تسلسلي مثل #58، عنوان، توصيل): أصل الإجابة مباشرة وحصراً من بيانات الـ Settings والـ Database أعلاه بدون أي زيادة أو تلفيق وفي سطر واحد فقط!`;

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
