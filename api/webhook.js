const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = Buffer.from('RUFBZ3VhV0hHbGY4QlNQeGNnZld5SjNIQllUVG1heWRsd2dVT20zaElsV1RPamZEZkEzblRZVGU3cVVlelVYWFZaQjRJaVpBd3ZaQ09Ld0lmOWFLNHlIZHBseDBuY3Zvck9XaXV1eFRVMUs3VXVVMFYxRkRmMWJCeDlmUThqM0hiSVM5ZFNWVmhhQmxvWkFBdXBEVkVmdVVWczFVWkNkR3gySHJtS0J0N1pCbW5PVHhwSVBRaUhhYzI3MWVQdXlQVjVZeWJSa28xWkIxQnBnSE1jeXZTU2R1WkJzTTRla3VrNEc1ZE1aQVd3NVpBYW9pMHp6eDdlejNnR0lMR3poMnFaQ1pCUlhrSFBTRTNJTnNBVzJ6S1pBRENnTTZwVlA=', 'base64').toString('utf8');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || DEFAULT_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';

async function generateGeminiAI(prompt, systemInstruction = "") {
  for (let i = 1; i <= 10; i++) {
    const selectedKey = process.env[`GEMINI_API_KEY_${i}`] || process.env.GEMINI_API_KEY;
    if (!selectedKey) continue;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
        })
      });

      if (res.status === 200) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (err) {
      console.error('Gemini error:', err);
    }
  }

  // Fallback smart response if Gemini quota limit reached
  return `أهلاً وسهلاً بك في متجر Pyjama DZ! 🌸 أسعار البيجامات تبدأ من 2,500 دج، والتوصيل متوفر لجميع الولايات (بما فيها الشلف) حتى باب المنزل. كيف يمكننا خدمتك في طلبيتك اليوم؟ ✨`;
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

async function getLatestOrderForPhone(cleanPhone) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?whatsapp=ilike.*${cleanPhone}*&order=created_at.desc&limit=1`;
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

            let prompt = `رسالة الزبون: "${messageText}"`;
            if (order) {
              prompt += `\nمعلومات طلب الزبون الحالي:\n- الاسم: ${order.nom}\n- رقم الطلب: ${order.id}\n- الولاية: ${order.wilaya}\n- الحالة الحالية: ${order.status}`;
              
              const textLower = messageText.toLowerCase();
              const isConfirmation = ["ok", "oui", "daweq", "sah", "confirm", "نعم", "اوكي", "أكدي", "تأكيد", "موافق"].some(w => textLower.includes(w));
              const isCancellation = ["annuler", "الغاء", "إلغاء", "حبس", "لا أريد", "non", "بطّلت"].some(w => textLower.includes(w));

              if (isConfirmation) {
                await updateOrderStatus(order.id, 'Confirmé', 'confirmed');
                await sendWhatsAppMessage(fromPhone, `شكراً لك سيد ${order.nom}! ❤️ تم تأكيد طلبيتك رقم #${order.id} بنجاح، وسنقوم بتجهيزها وشحنها لك فوراً.`);
                continue;
              } else if (isCancellation) {
                await updateOrderStatus(order.id, 'Annulé', 'canceled');
                await sendWhatsAppMessage(fromPhone, `تم إلغاء الطلبية رقم #${order.id} بناءً على رغبتك سيد ${order.nom}. نأمل أن نخدمك في المرات القادمة! ✨`);
                continue;
              }
            }

            // C. AI SALES & RECLAMATION ASSISTANT (Gemini Powered with Fallback)
            const systemInstruction = `أنت مساعد ذكي ومبيعات لمتجر بيجامات نسائية فاخرة جزائري (Pyjama DZ).
تتحدث بالدارجة الجزائرية المحترمة والودية جداً.
الهدف: مساعدة الزبائن وإقناعهم بلباقة، والرد على استفسارات الأسعار والألوان والشكاوى والمجاملات.`;
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
