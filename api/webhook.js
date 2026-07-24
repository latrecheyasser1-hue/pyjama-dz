const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSPxcgfWyJ3HBY7TmaydlwgUOm3hIlwTOjfDZA3nTYTe7qUezUXXVZB4IiZAwvZCOKwIf9aK4yHdplx0ncvorOWiuuxTU1K7UuU0V1FDf1bBx9fQ8j3HbIS9dSVVhZBloZAAupDVEfuUVs1UZCdGx2HrmKBt7ZBmnOTxpIPQiHac271ePuyPV5YyYbRko1ZB1BpgHMcyvSSduZBsM4ekuk4G5dMZAWw5ZAaoi0zzx7ez3gGILGzh2qZCZBRXkHPSE3INsAW2zKZADCgM6pVP';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || DEFAULT_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pyjama_dz_secret_verify_token';

const GEMINI_KEYS = [
  'AQ.Ab8RN6Lr_FwCXgsZzo5B7_FGMuv92wWb60ZNwxRiIRjLYLvjA',
  'AQ.Ab8RN6Ijpx3_rhVa0Fd6xG_5iBw3vxiVCjdy9DXzPPT0ZdRg',
  'AQ.Ab8RN6JqY80-ueoi2_ToQAP0jcfnVKvcvdZvVdy_n0mOly7w'
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
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              const fromPhone = message.from;
              const messageText = message.text?.body;

              if (messageText) {
                console.log(`Received message from ${fromPhone}: ${messageText}`);

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
