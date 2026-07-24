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
    const { phone, nom, id, wilaya } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '213' + formattedPhone.substring(1);
    if (!formattedPhone.startsWith('213')) formattedPhone = '213' + formattedPhone;

    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAguaWHGlf8BSPxcgfWyJ3HBY7TmaydlwgUOm3hIlwTOjfDZA3nTYTe7qUezUXXVZB4IiZAwvZCOKwIf9aK4yHdplx0ncvorOWiuuxTU1K7UuU0V1FDf1bBx9fQ8j3HbIS9dSVVhZBloZAAupDVEfuUVs1UZCdGx2HrmKBt7ZBmnOTxpIPQiHac271ePuyPV5YyYbRko1ZB1BpgHMcyvSSduZBsM4ekuk4G5dMZAWw5ZAaoi0zzx7ez3gGILGzh2qZCZBRXkHPSE3INsAW2zKZADCgM6pVP';
    const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

    const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
    const messageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: `مرحباً سيد ${nom || ''}! ❤️ تم تسجيل طلبيتك رقم #${id || ''} بنجاح لدى متجر Pyjama DZ.\n\nيرجى الرد بـ كلمة (تأكيد) أو (إلغاء) لتأكيد وتجهيز شحنتك فوراً إلى ولاية ${wilaya || ''}.`
      }
    };

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageBody)
    });

    const data = await apiRes.json();
    console.log('Server-to-server Meta WhatsApp order result:', data);
    return res.status(200).json({ success: true, metaResponse: data });
  } catch (err) {
    console.error('Error sending order WhatsApp:', err);
    return res.status(500).json({ error: err.message });
  }
}
