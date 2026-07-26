const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lcszntaxwndxskhplgii.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjc3pudGF4d25keHNraHBsZ2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyOTQyNjMsImV4cCI6MjA2NDg3MDI2M30.7M9H--x6iW1mIn6aV4N4e-Z4T13Q5Z36Y--Z4T13Q5Z';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1013778531818296';

async function getMetaAccessToken() {
  return process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || null;
}

async function sendWhatsAppMessage(toPhone, text) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone || !text) return null;
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
        text: { body: text }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Send WhatsApp error:', err);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { productId, size, newQty } = req.body || req.query || {};
    if (!size || Number(newQty) <= 0) {
      return res.status(200).json({ success: true, message: 'No size or qty <= 0' });
    }

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?status=eq.en_attente_stock`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const orders = await orderRes.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(200).json({ success: true, message: 'No waiting orders' });
    }

    let notifiedCount = 0;
    let availableQty = Number(newQty);

    for (const order of orders) {
      const orderSize = (order.size || '').toUpperCase();
      const targetSize = String(size).toUpperCase();

      if (orderSize === targetSize && order.phone) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'confirmee' })
        });

        const orderNumStr = order.id ? String(order.id).substring(0, 5).toUpperCase() : '1001';
        const restockMsg = `أهلاً بك ${order.clientName || ''}.\nبشرى سارة، توفر مقاسك (${size}) مجدداً!\nتم تأكيد طلبيتك رقم #${orderNumStr} بنجاح وجاري تجهيزها للشحن. شكراً لانتظارك.`;
        
        const cleanPhone = order.phone.replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('213') ? cleanPhone : cleanPhone.replace(/^0/, '213');
        await sendWhatsAppMessage(waPhone, restockMsg);

        notifiedCount++;
        availableQty = Math.max(0, availableQty - 1);
        if (availableQty <= 0) break;
      }
    }

    return res.status(200).json({ success: true, notifiedCount });
  } catch (err) {
    console.error('Notify restock error:', err);
    return res.status(500).json({ error: err.message });
  }
}
