import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = Buffer.from('RUFBZ3VhV0hHbGY4QlNQeGNnZld5SjNIQllUVG1heWRsd2dVT20zaElsV1RPamZEZkEzblRZVGU3cVVlelVYWFZaQjRJaVpBd3ZaQ09Ld0lmOWFLNHlIZHBseDBuY3Zvck9XaXV1eFRVMUs3VXVVMFYxRkRmMWJCeDlmUThqM0hiSVM5ZFNWVmhhQmxvWkFBdXBEVkVmdVVWczFVWkNkR3gySHJtS0J0N1pCbW5PVHhwSVBRaUhhYzI3MWVQdXlQVjVZeWJSa28xWkIxQnBnSE1jeXZTU2R1WkJzTTRla3VrNEc1ZE1aQVd3NVpBYW9pMHp6eDdlejNnR0lMR3poMnFaQ1pCUlhrSFBTRTNJTnNBVzJ6S1pBRENnTTZwVlA=', 'base64').toString('utf8');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || DEFAULT_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GEMINI_KEYS = [
  Buffer.from('QVEuQWI4Uk42THJfRndDWGdzWnpvNUI3X0ZHTXV2OTJ3V2I2MFpOd3hSaUlSallMdmpB', 'base64').toString('utf8'),
  Buffer.from('QVEuQWI4Uk42SWpweDNfcmhWYTBGZDZ4R181aUJ3M3Z4aVZDamR5OURYelBQVDBaZFJn', 'base64').toString('utf8'),
  Buffer.from('QVEuQWI4Uk42SnFZODAtdWVvaTJfVG9RQVAwamNmblZLdnZjZFp2VmR5X24wbU9seTd3', 'base64').toString('utf8')
];

async function generateGeminiAI(prompt, systemInstruction = "") {
  const selectedKey = GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${selectedKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
      })
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('Gemini error:', err);
    return null;
  }
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

async function processIncomingPayload(body) {
  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.value && change.value.messages) {
          for (const message of change.value.messages) {
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

              // B. CUSTOMER ORDER CONFIRMATION / CANCELLATION
              const { data: order } = await supabase
                .from('orders')
                .select('*')
                .ilike('whatsapp', `%${fromPhone.replace(/^\+?213/, '0')}%`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              let prompt = `رسالة الزبون: "${messageText}"`;
              if (order) {
                prompt += `\nمعلومات طلب الزبون الحالي:\n- الاسم: ${order.nom}\n- رقم الطلب: ${order.id}\n- الولاية: ${order.wilaya}\n- الحالة الحالية: ${order.status}`;
                
                const textLower = messageText.toLowerCase();
                const isConfirmation = ["ok", "oui", "daweq", "sah", "confirm", "نعم", "اوكي", "أكدي", "تأكيد", "موافق"].some(w => textLower.includes(w));
                const isCancellation = ["annuler", "الغاء", "إلغاء", "حبس", "لا أريد", "non", "بطّلت"].some(w => textLower.includes(w));

                if (isConfirmation) {
                  await supabase.from('orders').update({ status: 'Confirmé', bot_status: 'confirmed' }).eq('id', order.id);
                  await sendWhatsAppMessage(fromPhone, `شكراً لك سيد ${order.nom}! ❤️ تم تأكيد طلبيتك رقم #${order.id} بنجاح، وسنقوم بتجهيزها وشحنها لك فوراً.`);
                  continue;
                } else if (isCancellation) {
                  await supabase.from('orders').update({ status: 'Annulé', bot_status: 'canceled' }).eq('id', order.id);
                  await sendWhatsAppMessage(fromPhone, `تم إلغاء الطلبية رقم #${order.id} بناءً على رغبتك سيد ${order.nom}. نأمل أن نخدمك في المرات القادمة! ✨`);
                  continue;
                }
              }

              // C. AI SALES & RECLAMATION ASSISTANT (Gemini Powered)
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
