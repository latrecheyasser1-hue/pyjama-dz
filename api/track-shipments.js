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
    console.error('Send WhatsApp error:', err);
  }
}

async function getSequentialOrderNum(orderId) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?select=id,status,product,created_at&order=created_at.asc`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rawOrders = await res.json();
    if (Array.isArray(rawOrders)) {
      const realOrders = rawOrders.filter(o => o.status !== 'account' && !String(o.product || '').includes('_CUSTOMER_ACCOUNT_'));
      const idx = realOrders.findIndex(o => o.id === orderId);
      if (idx !== -1) return String(idx + 1);
      return String(realOrders.length);
    }
  } catch (err) {}
  return "346";
}

function cleanClientName(rawName) {
  if (!rawName) return '';
  let clean = String(rawName)
    .replace(/\(واتساب:[^\)]+\)/g, '')
    .replace(/زبون الواتساب/g, '')
    .replace(/زبون المحادثة/g, '')
    .replace(/زبون المحل/g, '')
    .replace(/زبون/g, '')
    .trim();
  if (!clean || clean.length < 2) return '';
  return clean.split(' ')[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Instant 200 response for Yalidine Webhook validation & CRC challenge
  const rawUrl = req.url || '';
  const queryStr = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
  const searchParams = new URLSearchParams(queryStr);
  const crcToken = req.query?.crc_token || searchParams.get('crc_token');

  if (crcToken) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(crcToken);
  }

  // If a simple GET ping from Yalidine validation without 'cron' or 'action=run'
  if (req.method === 'GET' && !req.query?.action && !searchParams.get('action') && !req.query?.cron) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('PYJAMA_DZ_WEBHOOK_OK');
  }

  try {
    // 1. Fetch Shipping API Settings from Supabase
    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=in.(yalidine_api_id,yalidine_api_token,zr_express_api_key,zr_express_token)&select=key,value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const settingsRows = await settingsRes.json();
    const creds = {};
    if (Array.isArray(settingsRows)) {
      settingsRows.forEach(r => { creds[r.key] = r.value; });
    }

    const yalidineId = creds.yalidine_api_id || process.env.YALIDINE_API_ID;
    const yalidineToken = creds.yalidine_api_token || process.env.YALIDINE_API_TOKEN;
    const zrApiKey = creds.zr_express_api_key || creds.zr_express_token || process.env.ZR_EXPRESS_API_KEY;

    // 2. Fetch Active Dispatched Orders
    const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?status=not.in.(livree,annulee,retour,account)&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const activeOrders = await ordersRes.json();

    if (!Array.isArray(activeOrders) || activeOrders.length === 0) {
      return res.status(200).json({ success: true, message: 'No active shipping orders to track', processed: 0 });
    }

    let updatedCount = 0;
    let notifsSent = 0;
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

    for (const order of activeOrders) {
      const tracking = (order.trackingNumber || order.tracking || '').trim();
      const company = String(order.deliveryCompany || '').toLowerCase();
      const isBureau = String(order.deliveryMode || '').toLowerCase().includes('bureau') || String(order.deliveryMode || '').includes('مكتب') || String(order.commune || '').includes('[');
      const phone = order.phone;
      const firstName = cleanClientName(order.clientName);
      const greeting = firstName ? `أهلاً وسهلاً بك ${firstName}` : `أهلاً وسهلاً بك عزيزي الزبون`;
      const orderNum = await getSequentialOrderNum(order.id);

      // Extract office branch name if present
      let officeName = 'مكتب الاستلام';
      const officeMatch = String(order.commune || order.deliveryMode || '').match(/\[([^\]]+)\]/);
      if (officeMatch) {
        officeName = officeMatch[1];
      }

      let currentStatus = null;
      let lastTrackingUpdate = null;

      // 3. Query Yalidine API if order is with Yalidine
      if (company.includes('yalidine') && tracking && yalidineId && yalidineToken) {
        try {
          const yRes = await fetch(`https://api.yalidine.app/v1/parcels?tracking=${tracking}`, {
            headers: {
              'X-API-ID': yalidineId,
              'X-API-TOKEN': yalidineToken
            }
          });
          const yData = await yRes.json();
          if (yData && yData.data && yData.data[tracking]) {
            const pInfo = yData.data[tracking];
            currentStatus = pInfo.last_status || pInfo.status;
            lastTrackingUpdate = pInfo;
          }
        } catch (err) {
          console.error('Yalidine tracking error for:', tracking, err.message);
        }
      }

      // 4. Query ZR Express API if order is with ZR Express
      if (company.includes('zr') && tracking && zrApiKey) {
        try {
          const zrRes = await fetch(`https://api.zrexpress.com/api/v1/parcels/${tracking}`, {
            headers: {
              'Authorization': `Bearer ${zrApiKey}`,
              'token': zrApiKey
            }
          });
          const zrData = await zrRes.json();
          if (zrData && (zrData.status || zrData.parcel_status)) {
            currentStatus = zrData.status || zrData.parcel_status;
            lastTrackingUpdate = zrData;
          }
        } catch (err) {
          console.error('ZR Express tracking error for:', tracking, err.message);
        }
      }

      // If status found, evaluate triggers
      if (currentStatus) {
        const normStatus = String(currentStatus).toLowerCase();
        let shouldUpdateOrder = false;
        const patchData = {};

        // A. DELIVERED (Livré)
        if (normStatus.includes('livré') || normStatus.includes('livre') || normStatus.includes('delivered') || normStatus.includes('distribué')) {
          if (order.status !== 'livree') {
            patchData.status = 'livree';
            patchData.delivered_at = new Date().toISOString();
            shouldUpdateOrder = true;
          }
        }
        // B. RETURN / FAILED (Retour)
        else if (normStatus.includes('retour') || normStatus.includes('refus') || normStatus.includes('echoue') || normStatus.includes('échoué')) {
          if (order.status !== 'retour') {
            patchData.status = 'retour';
            shouldUpdateOrder = true;
          }
        }
        // C. STOP DESK / BUREAU ARRIVAL & MULTI-STAGE REMINDERS
        else if (isBureau) {
          const isAtBureau = normStatus.includes('bureau') || normStatus.includes('centre') || normStatus.includes('disponible') || normStatus.includes('reçu au centre') || normStatus.includes('arrived');

          if (isAtBureau) {
            const arrivedTime = order.bureau_arrived_at ? new Date(order.bureau_arrived_at).getTime() : 0;

            // 1. Stage 1: Just arrived at Bureau -> Send Arrival Notice
            if (!arrivedTime) {
              patchData.bureau_arrived_at = new Date().toISOString();
              patchData.bureau_arrival_notif_sent = true;
              shouldUpdateOrder = true;

              if (phone) {
                const msg = `*متجر Pyjama DZ ✨*\n\n${greeting}! 🌸\nنود إعلامك أن طلبيتك رقم #${orderNum} وصلت الآن إلى مكتب التوصيل [${officeName}] وهي جاهزة للاستلام! 🏢📦\n\nيرجى التقرب من المكتب لاستلام طردك في أقرب وقت. شكراً جزيلاً لثقتك بمتجرنا! ❤️\nhttps://pyjama-dz.vercel.app`;
                await sendWhatsAppMessage(phone, msg);
                notifsSent++;
              }
            }
            // 2. Stage 2: 24 Hours elapsed and still not picked up -> Send 24h Reminder
            else if ((now - arrivedTime) >= TWENTY_FOUR_HOURS_MS && (now - arrivedTime) < FORTY_EIGHT_HOURS_MS && !order.bureau_reminder_sent) {
              patchData.bureau_reminder_sent = true;
              shouldUpdateOrder = true;

              if (phone) {
                const msg = `*متجر Pyjama DZ ✨*\n\nتذكير لطيف ${firstName ? firstName : ''}! 🌸\nنود تذكيرك بأن طلبيتك رقم #${orderNum} مازالت تنتظرك في مكتب التوصيل [${officeName}]. 🏢📦\n\nيرجى التقرب من المكتب لاستلامها في أقرب وقت متاح. نتمنى لك يوماً سعيداً! 🌸\nhttps://pyjama-dz.vercel.app`;
                await sendWhatsAppMessage(phone, msg);
                notifsSent++;
              }
            }
            // 3. Stage 3: 48 Hours elapsed and still not picked up -> Send Urgent Final Warning
            else if ((now - arrivedTime) >= FORTY_EIGHT_HOURS_MS && !order.bureau_warning_sent) {
              patchData.bureau_warning_sent = true;
              shouldUpdateOrder = true;

              if (phone) {
                const msg = `*متجر Pyjama DZ ⚠️*\n\nتنبيه هام وعاجل ${firstName ? firstName : ''}!\nطلبيتك رقم #${orderNum} في مكتب التوصيل [${officeName}] على وشك الإرجاع (Retour) لانتهاء مدة الحفظ المحددة. ⏳📦\n\nيرجى التقرب اليوم من المكتب لاستلام طردك لتفادي إلغائه وإرجاعه. شكراً لتعاونك! 🙏\nhttps://pyjama-dz.vercel.app`;
                await sendWhatsAppMessage(phone, msg);
                notifsSent++;
              }
            }
          }
        }
        // D. DOMICILE (Home Delivery) -> Out for delivery alert
        else if (!isBureau) {
          const isOutForDelivery = normStatus.includes('sorti') || normStatus.includes('en cours de livraison') || normStatus.includes('livreur') || normStatus.includes('en livraison') || normStatus.includes('en route');

          if (isOutForDelivery && !order.domicile_out_notif_sent) {
            patchData.domicile_out_notif_sent = true;
            shouldUpdateOrder = true;

            if (phone) {
              const msg = `*متجر Pyjama DZ 🚚*\n\n${greeting}! 🌸\nطردك رقم #${orderNum} خرج الآن مع الموزع (Livreur) وراه في الطريق لعنوانك! 📦💨\n\nسيتصل بك الموزع قريباً على هاتفك للاستلام، يرجى إبقاء هاتفك مفتوحاً. شكراً لثقتك بنا! ❤️\nhttps://pyjama-dz.vercel.app`;
              await sendWhatsAppMessage(phone, msg);
              notifsSent++;
            }
          }
        }

        // Apply order updates to Supabase
        if (shouldUpdateOrder) {
          await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(patchData)
          });
          updatedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      activeOrdersChecked: activeOrders.length,
      ordersUpdated: updatedCount,
      notificationsSent: notifsSent
    });
  } catch (err) {
    console.error('Error tracking shipments:', err);
    return res.status(500).json({ error: err.message });
  }
}
