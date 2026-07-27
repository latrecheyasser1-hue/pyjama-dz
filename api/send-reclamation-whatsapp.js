const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSBWALwYHiUUx1tti0lpAfYqZBZBzHIZB8oZA0ZAIYYtK0aw0d6ez6RIkjZAmKWL0hN4QctCZCBkVAu0ZCPcgMNF6vPNZC1RID8rFufM8vz0lWevN5WxIgqqrGf1cBLELSUIWjabxZCYwoiStLiBzQnf02dQ9ZAHMpyGNkG0K8XHdFqKXZCS2jUaYzzY6c62esNKw6JK2AsQBmH5c4OSSn5e56vArja6hURwsRbJpQZAoCOGtMMZAbwslwa51EGnATq14vifc3bnV9Awwdr';

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
  const rawLower = String(text).toLowerCase();
  const norm = normalizeText(text);

  const praiseKeywords = [
    'شكرا', 'شكرااا', 'شكرا لكم', 'مشكور', 'بارك الله', 'يعطيكم الصحة', 'يعطيك الصحة',
    'ماشاء الله', 'مشاء الله', 'روعة', 'ما شاء الله', 'شكر', 'تسلم', 'تسلموا', 'ربي يحفظكم', 'ربي يوفقكم',
    'عجبني', 'عجبوني', 'عجبتني', 'شباب بزاف', 'ما شاء الله عليكم', 'يعطيك الصحه', 'الله يحفظك',
    'خدمة روعة', 'سلعة روعة', 'وصلتني روعة', 'بيجامة روعة', 'يعطيكم الصحه', 'هايل', 'هايلة', 'ممتاز', 'ممتازة',
    'machallah', 'machaallah', 'machalah', 'macha allah', 'macheallah',
    '3jbetni', '3jbetnii', '3jbatni', 'ajbatni', 'ejbetni', 'ejbetnii',
    'rbii yahfedkom', 'rbi yahfedkom', 'rbi yahfdkom', 'rbi yahfadkom', 'god bless',
    'nchaallah', 'nchallah', 'inshallah', 'inchallah',
    'qualite', 'qualité', 'bzeef', 'bzeeef', 'bzaf', 'bzaaf',
    'top', 'merci', 'bravo', 'bien', 'tres bien', 'très bien', 'magnifique',
    'sublime', 'super', 'parfait', 'fort', 'foor', 'tahya', 'chbab', 'chbaba',
    'hayla', 'hayel', 'zinek', 'ya3tikom', 'ya3tik'
  ];

  const complaintKeywords = [
    'مشكل', 'مشكلة', 'شكوى', 'عتاب', 'ناقص', 'مكسور', 'ماشي شباب', 'عيب', 'غلطة', 'رادي',
    'ما وصلنيش', 'خاسر', 'تأخرت', 'تأخير', 'مغشوش', 'صغيرة بزاف', 'كبيرة بزاف', 'مقطوع',
    'فسد', 'ما عجبنيش', 'ما عجبنيش الحجم', 'تأخر', 'وصلت ناقصة', 'وصلت خاسرة', 'سلعة خاسرة',
    'خدمة سيئة', 'توصيل بطيء', 'reclamation', 'réclamation', 'سوء', 'مغشوشة', 'زبل',
    'problem', 'probleme', 'problème', 'pas bien', 'mauvais', 'cassé', 'casse',
    'retard', 'retarde', 'degueulasse', 'nul', 'nulle', 'zbel', 'khaser', 'khasra',
    'mouskile', 'mouchkel', 'mouchkil'
  ];

  const hasPraise = praiseKeywords.some(k => norm.includes(k) || rawLower.includes(k));
  const hasComplaint = complaintKeywords.some(k => norm.includes(k) || rawLower.includes(k));

  if (hasPraise && !hasComplaint) return 'praise';
  if (hasComplaint) return 'complaint';
  if (hasPraise) return 'praise';

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

    const replyMsg = `*متجر Pyjama DZ*\n\nأهلاً وسهلاً بك${greetingName}! 🌸\nنشكرك جزيلاً على تواصلك معنا وعلى مشاركتنا ملاحظاتك وتقييمك القيّم. 🙏\nتأكد أن رأيك ورضاك هما أولويتنا دائماً، وسنعمل باستمرار على تقديم الأفضل والأحسن لخدمتك على أكمل وجه بإذن الله. ✨❤️`;

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
    // Save to Supabase settings table (reclamations array) as backend safety backup
    try {
      const curSettingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.reclamations&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await curSettingsRes.json();
      let existingRecl = [];
      if (Array.isArray(rows) && rows[0]?.value) {
        try { existingRecl = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value; } catch(e) {}
      }
      if (!Array.isArray(existingRecl)) existingRecl = [];

      const newReclObj = {
        id: 'REC-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        clientName: clientName || 'زبون الموقع',
        whatsappNumber: whatsappNumber || waPhone,
        message: message ? message.trim() : '',
        status: 'nouvelle',
        createdAt: new Date().toISOString()
      };

      const isDuplicate = existingRecl.some(r => r.message === newReclObj.message && r.whatsappNumber === newReclObj.whatsappNumber && (Date.now() - new Date(r.createdAt).getTime()) < 10000);
      
      if (!isDuplicate) {
        const valStr = JSON.stringify([newReclObj, ...existingRecl]);
        await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.reclamations`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value: valStr })
        });
      }
    } catch (e) {
      console.error('Error saving reclamation in send-reclamation-whatsapp API:', e);
    }

    return res.status(200).json({ success: true, type, metaData });
  } catch (err) {
    console.error('Send reclamation whatsapp error:', err);
    return res.status(500).json({ error: err.message });
  }
}
