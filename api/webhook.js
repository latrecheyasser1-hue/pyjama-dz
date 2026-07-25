const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = Buffer.from('RUFBZ3VhV0hHbGY4QlNCcVczRVZ5QkZqOUQ5VlV1cHEzM1BrYjc5SURGSGFnaEI3Yk1PQko2U3lhcWt2RGRUQTVFUk5wSEVFUERCYVpDWkNDQ2Vtc1N1TFRzMFpCNjROdWxja281NnZYdGMwVzFlZG1LbUE4OWs2QWtWemVqMGdSeWRPc3NRS0lNV2RRaWF1WGcyaFhxbXplVUY0cExJVjlTb21nSFV6VVRVdDgxU0FOZGxmaWlHRmxxMjFtWkMxazFMVEZqWkFlbVYzUUsyTnNCN2I5bDhVUHRPU2x0bFgwYXlaQUQ2ZlIxYllzZFVNblpCMmlxUUNmSU83M3RuQVJwRDZSU0NaQVNnUjA3Zmg3SjFvRDgyUlI=', 'base64').toString('utf8');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || DEFAULT_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';
const STORE_PHONE_NUMBER = '0771335039';

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

function formatOrderNum(order) {
  if (!order) return "80";
  if (typeof order === 'object') {
    if (order.ticketNumber) return String(order.ticketNumber);
    if (order.ticket_number) return String(order.ticket_number);
    if (order.id) {
      const idStr = String(order.id);
      if (idStr.length <= 8) return idStr;
      return idStr.substring(0, 8).toUpperCase();
    }
  }
  const str = String(order);
  if (str.length <= 8) return str;
  return str.substring(0, 8).toUpperCase();
}

function cleanProductText(prod) {
  if (!prod) return "بيجامات فاخرة";
  return String(prod).replace(/\(\(/g, '').replace(/\)\)/g, '');
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
            generationConfig: { temperature: 0.2, maxOutputTokens: 50 }
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
  if (pLower.includes('numero') || pLower.includes('num') || pLower.includes('هاتف') || pLower.includes('نميرو')) {
    return `رقم هاتف المحل الرسمي للتواصل والواتساب: ${STORE_PHONE_NUMBER} 📞✨`;
  }
  if (pLower.includes('quality') || pLower.includes('جودة') || pLower.includes('نوعية')) {
    return `الجودة ممتازة 100% وقماش رفيع ومريح جداً كما في الصور بالضبط! ✨`;
  }
  if (pLower.includes('winta') || pLower.includes('وقتاش') || pLower.includes('وقت')) {
    return `التوصيل يستغرق من 24 إلى 48 ساعة فقط لجميع الولايات! 🚚✨`;
  }
  if (pLower.includes('slm') || pLower.includes('سلام')) {
    return `وعليكم السلام ورحمة الله! 🌸 أهلاً بك في متجر Pyjama DZ، تفضل كيف يمكننا مساعدتك؟ ✨`;
  }
  if (pLower.includes('prix') || pLower.includes('سعر') || pLower.includes('سومة')) {
    return `أهلاً بك! يمكنك الاطلاع على أسعار كافة الموديلات بالتفصيل عبر موقعنا: https://pyjama-dz.vercel.app ✨`;
  }

  return `أهلاً وسهلاً بك في متجر Pyjama DZ! 🌸 تفضل كيف يمكننا مساعدتك اليوم؟ ✨`;
}

async function sendWhatsAppMessage(toPhone, textBody) {
  if (!META_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
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
  } catch (err) {
    console.error('Send WhatsApp error:', err);
  }
}

async function sendWhatsAppImage(toPhone, imageUrl, captionText = "") {
  if (!META_ACCESS_TOKEN || !imageUrl || !imageUrl.startsWith('http')) return;
  const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
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
          const fromPhone = message.from;
          const messageText = message.text?.body;

          if (messageText) {
            console.log(`Received message from ${fromPhone}: ${messageText}`);

            // A. WORKER STOCK RESTOCK via REPLY
            const refMatch = messageText.match(/\[REF:([^:]+):([^:]+):([^:]+)\]/);
            if (refMatch) {
              const productId = refMatch[1];
              const colorIdx = parseInt(refMatch[2]);
              const size = refMatch[3];
              const addedQty = parseInt(messageText.replace(/\D/g, ''));

              if (!isNaN(addedQty) && addedQty > 0) {
                const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
                if (product && Array.isArray(product.colorVariants) && product.colorVariants[colorIdx]) {
                  const updatedVariants = [...product.colorVariants];
                  const currentQty = updatedVariants[colorIdx].stock?.[size] || 0;
                  const newQty = currentQty + addedQty;

                  updatedVariants[colorIdx] = {
                    ...updatedVariants[colorIdx],
                    stock: { ...(updatedVariants[colorIdx].stock || {}), [size]: newQty }
                  };

                  await supabase.from('products').update({ colorVariants: updatedVariants }).eq('id', productId);
                  await sendWhatsAppMessage(fromPhone, `✅ تم تحديث السطوك بنجاح! تم إضافة +${addedQty} حبة للمنتج "${product.title}" (${updatedVariants[colorIdx].name} - ${size}). السطوك الحالي الآن: ${newQty} حبة.`);
                  continue;
                }
              }
            }

            const cleanPhone = fromPhone.replace(/^\+?213/, '0');
            const order = await getLatestOrderForPhone(cleanPhone);
            const products = await getAllProducts();

            const normText = normalizeText(messageText);

            // B. PHONE NUMBER INTERCEPTOR (Numero / num / هاتف / نميرو / رقم المحل)
            const isPhoneQuery = ["numero", "nomer", "num", "هاتف", "رقم المحل", "نميرو", "نومرو"].some(p => normText.includes(p) || messageText.toLowerCase().includes(p));
            if (isPhoneQuery) {
              await sendWhatsAppMessage(fromPhone, `رقم هاتف المحل الرسمي للتواصل والواتساب: ${STORE_PHONE_NUMBER} 📞✨`);
              continue;
            }

            // C. ORDER LOOKUP INTERCEPTOR (Commande / طلبية / طلبيتي / شوف طلبيتي)
            const isOrderQuery = ["commande", "طلب", "طلبية", "طلبيتي", "كوماند"].some(o => normText.includes(o));
            if (isOrderQuery) {
              if (order) {
                const orderNum = formatOrderNum(order);
                const statusName = order.status === 'Confirmé' ? 'مؤكدة وفي مرحلة الشحن 🚚' : (order.status === 'Annulé' ? 'ملغاة ❌' : 'جديدة قيد التجهيز ⏳');
                const prodText = cleanProductText(order.product);
                await sendWhatsAppMessage(fromPhone, `أهلاً بك سيد ${order.clientName || 'الزبون'}! ❤️\n\n📦 رقم الطلبية: #${orderNum}\n🛍️ المنتجات: ${prodText}\n🚚 الولاية: ${order.wilaya || ''}\n📌 الحالة: ${statusName}\n\nيرجى الرد بـ كلمة (تأكيد) للتجهيز والشحن فوراً! ✨`);
              } else {
                await sendWhatsAppMessage(fromPhone, `لم نجد طلبية جديدة مسجلة برقم هاتفك الحالي. يمكنك الطلب المباشر وسنكون في خدمتك عبر موقعنا: https://pyjama-dz.vercel.app ✨`);
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
            const isLocationQuery = ["plassa", "مكان", "مقر", "بلاصة", "اين", "وين جايين", "وين المقر"].some(l => normText.includes(l)) || (normText.split(/\s+/).includes("win") || normText.split(/\s+/).includes("وين"));
            if (isLocationQuery) {
              await sendWhatsAppMessage(fromPhone, `مقرنا الرئيسي في ولاية الشلف، والتوصيل متوفر لجميع 58 ولاية لغاية باب دارك! ✨`);
              continue;
            }

            let prompt = `رسالة الزبون: "${messageText}"`;
            if (order) {
              prompt += `\nمعلومات طلب الزبون الحالي:\n- الاسم: ${order.clientName || order.nom}\n- رقم الطلب: #${formatOrderNum(order)}\n- المنتج: ${cleanProductText(order.product)}\n- الولاية: ${order.wilaya}\n- الحالة الحالية: ${order.status}`;
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
              await sendWhatsAppMessage(fromPhone, `شكراً لك سيد ${order.clientName || order.nom}! ❤️\n\n✅ تم تأكيد طلبيتك رقم #${formatOrderNum(order)} بنجاح!\n🚚 جاري التجهيز والشحن المباشر إلى ولاية ${order.wilaya || ''}. ✨`);
              continue;
            } else if (isCancellation) {
              await updateOrderStatus(order.id, 'Annulé', 'canceled');
              await sendWhatsAppMessage(fromPhone, `تم إلغاء الطلبية رقم #${formatOrderNum(order)} بناءً على رغبتك سيد ${order.clientName || order.nom}. نأمل أن نخدمك في المرات القادمة! ✨`);
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

            // G. CONCISE DIRECT AI RESPONSE
            const isWholesale = ["gros", "جملة", "بالجملة", "كابة", "تجارة", "سيري", "serie", "سيريات", "كمية", "كميات"].some(k => normText.includes(k) || messageText.toLowerCase().includes(k));
            
            let salesModeRules = "";
            if (isWholesale) {
              salesModeRules = `الزبون يسأل عن بالجملة (Gros). أجب حصراً عن أسعار وشروط الجملة والسيريات.`;
            } else {
              salesModeRules = `الزبون زبون عادي بالقطعة. أجب عن سؤاله فقط في سطر واحد بدون ذكر أسعار الجملة أو تفاصيل طلبية سابقة إلا إذا سألك عنها!`;
            }

            const catalogSummary = products.map(p => `- ${p.title}: ${p.price}دج`).join('\n');
            const systemInstruction = `أنت بائع ومساعد مبيعات ذكي ومحترف لمتجر بيجامات نسائية فاخرة (Pyjama DZ).
رقم هاتف المحل الرسمي: 0771335039.
المقر: ولاية الشلف.
${salesModeRules}
قوانين حتمية:
1. أجب فقط وحصراً عن السؤال المطروح في رسالة الزبون في سطر واحد قصير جداً ومباشر (أقل من 10 كلمات)!
2. ممنوع نهائياً كتابة نصوص طويلة أو إقحام ملخص الطلبية أو كتابة أرقام وهمية مثل 0550000000 أو خانات فارغة!
3. إذا سألك عن رقم الهاتف أجب: "رقم هاتف المحل الرسمي للتواصل والواتساب: 0771335039 📞✨".
المنتجات: ${catalogSummary}
موقع المتجر: https://pyjama-dz.vercel.app`;

            const aiReply = await generateGeminiAI(prompt, systemInstruction);
            if (aiReply) {
              await sendWhatsAppMessage(fromPhone, aiReply);
            }
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
