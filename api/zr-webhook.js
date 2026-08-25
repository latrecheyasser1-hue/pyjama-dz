// ZR Express Svix Webhook Handler
// Completely isolated from Yalidine

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';
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
  } catch (err) {}
  return DEFAULT_TOKEN;
}

async function sendWhatsAppMessage(toPhone, textBody) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone) return;
  const cleanDigits = String(toPhone).replace(/\D/g, '');
  if (cleanDigits.length < 8) return;
  const waPhone = cleanDigits.startsWith('213') ? cleanDigits : (cleanDigits.startsWith('0') ? '213' + cleanDigits.substring(1) : '213' + cleanDigits);

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
        to: waPhone,
        type: 'text',
        text: { preview_url: false, body: textBody }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Send WhatsApp error in ZR webhook:', err);
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ZR Express Webhook Active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log('Received ZR Express Webhook Event:', JSON.stringify(payload, null, 2));

    const trackingNumber = payload.trackingNumber || payload.data?.trackingNumber || payload.parcel?.trackingNumber;
    const externalId = payload.externalId || payload.data?.externalId || payload.parcel?.externalId;
    const stateName = (payload.state?.name || payload.data?.state?.name || payload.status || '').toLowerCase();

    if (!trackingNumber && !externalId) {
      return res.status(200).json({ received: true, note: 'No tracking or externalId found' });
    }

    // Map ZR status to store order status
    let mappedStatus = null;
    if (stateName.includes('recouvert') || stateName.includes('livre') || stateName.includes('delivered')) {
      mappedStatus = 'livree';
    } else if (stateName.includes('transit') || stateName.includes('hub') || stateName.includes('expedie') || stateName.includes('vers_')) {
      mappedStatus = 'expediee';
    } else if (stateName.includes('retour') || stateName.includes('annul') || stateName.includes('refus')) {
      mappedStatus = 'annulee';
    }

    // Find order in Supabase
    let queryParam = '';
    if (trackingNumber) {
      queryParam = `trackingNumber=eq.${encodeURIComponent(trackingNumber)}`;
    } else if (externalId) {
      queryParam = `ticketNumber=eq.${encodeURIComponent(externalId)}`;
    }

    const orderFetch = await fetch(`${SUPABASE_URL}/rest/v1/orders?${queryParam}&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const orders = await orderFetch.json();

    if (Array.isArray(orders) && orders.length > 0) {
      const targetOrder = orders[0];
      const updateData = {
        deliveryCompany: 'zrexpress',
        zrStatus: stateName,
        trackingNumber: trackingNumber || targetOrder.trackingNumber,
        updated_at: new Date().toISOString()
      };

      if (mappedStatus) {
        updateData.status = mappedStatus;
      }

      // Instant WhatsApp Notifications for ZR Express Events
      const isBureau = String(targetOrder.deliveryMode || '').toLowerCase().includes('bureau') || 
                       String(targetOrder.deliveryMode || '').includes('مكتب') || 
                       String(targetOrder.commune || '').includes('Hub') || 
                       String(targetOrder.commune || '').includes('[');
      const phone = targetOrder.phone;
      const cleanName = String(targetOrder.clientName || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim().split(' ')[0];
      const greeting = cleanName ? `أهلاً وسهلاً بك ${cleanName}` : `أهلاً وسهلاً بك عزيزي الزبون`;
      const orderNum = targetOrder.ticketNumber || String(targetOrder.id).slice(0, 6);

      let officeName = 'مكتب الاستلام';
      const officeMatch = String(targetOrder.commune || targetOrder.deliveryMode || '').match(/\[([^\]]+)\]/);
      if (officeMatch) officeName = officeMatch[1];

      // A. Out with livreur
      const isOutForDelivery = stateName.includes('vers_client') || stateName.includes('en cours') || stateName.includes('sorti') || stateName.includes('livreur');
      if (!isBureau && isOutForDelivery && !targetOrder.domicile_out_notif_sent) {
        updateData.domicile_out_notif_sent = true;
        if (phone) {
          const msg = `*متجر Pyjama DZ 🚚*\n\n${greeting}! 🌸\nطردك رقم #${orderNum} خرج الآن مع الموزع (Livreur) وراه في الطريق لعنوانك! 📦💨\n\nسيتصل بك الموزع قريباً على هاتفك للاستلام، يرجى إبقاء هاتفك مفتوحاً. شكراً لثقتك بنا! ❤️\nhttps://pyjama-dz.vercel.app`;
          await sendWhatsAppMessage(phone, msg);
        }
      }

      // B. Arrived at Bureau (Hub)
      const isAtBureau = stateName.includes('hub_destination') || stateName.includes('au_bureau') || stateName.includes('disponible') || stateName.includes('centre');
      if (isBureau && isAtBureau && !targetOrder.bureau_arrival_notif_sent) {
        updateData.bureau_arrival_notif_sent = true;
        updateData.bureau_arrived_at = new Date().toISOString();
        if (phone) {
          const msg = `*متجر Pyjama DZ ✨*\n\n${greeting}! 🌸\nنود إعلامك أن طلبيتك رقم #${orderNum} وصلت الآن إلى مكتب التوصيل [${officeName}] وهي جاهزة للاستلام! 🏢📦\n\nيرجى التقرب من المكتب لاستلام طردك في أقرب وقت. شكراً جزيلاً لثقتك بمتجرنا! ❤️\nhttps://pyjama-dz.vercel.app`;
          await sendWhatsAppMessage(phone, msg);
        }
      }

      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${targetOrder.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      console.log(`Updated Order ${targetOrder.id} with ZR status ${stateName}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('ZR Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
