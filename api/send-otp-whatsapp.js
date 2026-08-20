const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tdhxdnmjmnfjkictdzpk.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaHhkbm1qbW5mamtpY3RkenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIxMDAsImV4cCI6MjEwMjc5ODEwMH0.K3moWEWjE5cvBmFwaGyPspx_yIixii9tY136DgpCZ3g';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSKaHVaNhbDcXWvirUZCAtEQwuHus3c6VCPYV6BzJhJMGZBv0y7LPe2UTWP1KOFKngJCRqiumnd6R27VNOZABQlmGzzbl87arKbPuvgZBag148noX6nLxjkKMO7Ue0hiLUDRS4spYopCGpuwHTZCnPW4Deyzivxg3xlphgLBdUZAWWRD5Y0HwZDZD';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone number and OTP code are required' });
    }

    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '213' + formattedPhone.substring(1);
    if (!formattedPhone.startsWith('213')) formattedPhone = '213' + formattedPhone;

    const META_ACCESS_TOKEN = await getMetaAccessToken();
    const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

    const messageText = `رمز تأكيد حسابكِ في متجر Pyjama DZ - بيجامات الجزائر هو: ${code} 🔒\n\n⏱️ الرمز صالـح لمدة دقيقة واحدة (1 MIN) فقط.\nيرجى إدخاله في المتجر لإتمام إنشاء الحساب بنجاح ✨`;

    const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
    const messageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: { preview_url: false, body: messageText }
    };

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageBody)
    });

    const metaData = await apiRes.json();

    if (!apiRes.ok) {
      console.error('Meta WhatsApp API error:', metaData);
      return res.status(500).json({ error: metaData.error?.message || 'Failed to send WhatsApp OTP' });
    }

    return res.status(200).json({ success: true, metaData });
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
