const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSPIi1CoGaOskH2dRPQhFy5kJjZARf65ZCZB8TEgxfaPmSnZAoNlx7keEt1RrUOsUcqypodjMtW99r4SWw3csZAokqcRo2HksqtyZAd07mgnAFqcpdx5k8aj1IhZAHGyZC4TMI2e6Rc922MEEeb0lAiPZByehte6W1wwXDZC016cuIZBhIw62bkLW01Vix3gSGAVqTnr7YBAxRvEIsk2KSOWxOLLfZB5OcYFjiZBuW0lx6A0KqCZCrqtjQSzKie9FczCeIagZBZAJcSX6N3t5';

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.meta_access_token&select=value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value && data[0].value.length > 20) {
      return data[0].value.trim();
    }
  } catch (e) {}
  return DEFAULT_TOKEN;
}

function formatWhatsAppPhone(phone) {
  if (!phone) return null;
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 8) return null;
  if (cleanPhone.startsWith('213')) return cleanPhone;
  if (cleanPhone.startsWith('0')) return '213' + cleanPhone.substring(1);
  return '213' + cleanPhone;
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

function classifyReclamationText(text) {
  if (!text) return 'complaint';
  const norm = normalizeText(text);

  const praiseKeywords = [
    'شكرا', 'شكرااا', 'شكرا لكم', 'مشكور', 'بارك الله', 'يعطيكم الصحة', 'يعطيك الصحة',
    'ماشاء الله', 'مشاء الله', 'روعة', 'ما شاء الله', 'top', 'merci', 'bravo', 'bien',
    'ممتازة', 'ممتاز', 'هايل', 'هايلة', 'شكر', 'تسلم', 'تسلموا', 'ربي يحفظكم', 'ربي يوفقكم',
    'عجبني', 'عجبوني', 'شباب بزاف', 'ما شاء الله عليكم', 'يعطيك الصحه', 'الله يحفظك',
    'خدمة روعة', 'سلعة روعة', 'وصلتني روعة', 'بيجامة روعة', 'يعطيكم الصحه'
  ];

  for (const kw of praiseKeywords) {
    if (norm.includes(kw)) {
      return 'praise';
    }
  }
  return 'complaint';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || req.query || {});
    const { clientName, whatsappNumber, message } = body;

    const waPhone = formatWhatsAppPhone(whatsappNumber);
    if (!waPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const token = await getMetaAccessToken();
    const type = classifyReclamationText(message);
    const greetingName = (clientName && clientName.trim() !== '' && clientName !== 'زبون المحادثة' && clientName !== 'زبون الواتساب')
      ? ` ${clientName.trim()}`
      : '';

    let replyMsg = '';
    if (type === 'praise') {
      replyMsg = `*متجر Pyjama DZ*\n\nأهلاً وسهلاً بك${greetingName}! 🌸\nنشكرك الجزيل من القلب على كلماتك الطيبة وتقييمك الراقـي. يسعدنا جداً رضائك ونفخر بخدمتك دائماً! ✨❤️`;
    } else {
      replyMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${greetingName}.\nنعتذر منك بصدق عن أي إزعاج أو خلل، ونهتم جداً بملحوظتك! 🙏\nتأكد أننا سنعمل على إصلاح المشكلة ومعالجة شكواك في أقرب وقت ممكن بإذن الله.`;
    }

    const metaRes = await fetch(`https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: waPhone,
        type: 'text',
        text: { body: replyMsg }
      })
    });

    const metaData = await metaRes.json();
    console.log('Reclamation WhatsApp send result:', metaData);

    return res.status(200).json({ success: true, type, metaData });
  } catch (err) {
    console.error('Send reclamation whatsapp error:', err);
    return res.status(500).json({ error: err.message });
  }
}
