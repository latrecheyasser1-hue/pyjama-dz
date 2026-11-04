const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const ADMIN_PARCEL_SECRET = process.env.ADMIN_PARCEL_SECRET || 'pyjama_dz_sec_99a8b7c6d5e4f3';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

function isAuthorized(req) {
  const tokenHeader = req.headers['x-admin-token'] || req.headers['x-internal-secret'] || '';
  const authHeader = req.headers['authorization'] || '';

  if (tokenHeader && tokenHeader === ADMIN_PARCEL_SECRET) {
    return true;
  }
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (bearer === ADMIN_PARCEL_SECRET) {
      return true;
    }
  }
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://pyjama-dz.net',
    'https://www.pyjama-dz.net',
    'https://admin.pyjama-dz.net',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.pyjama-dz.net');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle Server-Side PIN Verification (NEW-01)
  const body = req.body || {};
  if (body.action === 'verify_pin') {
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (!global._pinAttemptsMap) global._pinAttemptsMap = new Map();
    const now = Date.now();
    const attempt = global._pinAttemptsMap.get(clientIp) || { count: 0, lockedUntil: 0 };
    if (attempt.lockedUntil && attempt.lockedUntil > now) {
      const remainingSec = Math.ceil((attempt.lockedUntil - now) / 1000);
      return res.status(429).json({ error: `محاولات خاطئة متعددة. يرجى الانتظار ${remainingSec} ثانية.`, locked: true, remainingSec });
    }

    const enteredPin = String(body.pin || '').trim();
    const validPin = process.env.ADMIN_PIN || '765483';

    if (enteredPin === validPin) {
      global._pinAttemptsMap.delete(clientIp);
      return res.status(200).json({ success: true, role: 'admin', token: ADMIN_PARCEL_SECRET });
    } else {
      attempt.count += 1;
      if (attempt.count >= 5) {
        attempt.lockedUntil = now + 15 * 60 * 1000;
        attempt.count = 0;
      }
      global._pinAttemptsMap.set(clientIp, attempt);
      return res.status(401).json({ success: false, error: 'رمز الدخول غير صحيح (Code PIN incorrect)!' });
    }
  }

  // Security Shield: Admin authorization token check
  if (!isAuthorized(req)) {
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    console.warn(`[approve-exchange] Blocked unauthorized attempt from IP ${clientIp}`);
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required to approve or reject exchanges.' });
  }

  try {
    const { orderId, action, reason } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    // 1. Fetch order details from Supabase
    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const orderRows = await orderRes.json();
    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];

    const isReturn = Boolean(
      order.isRetour === true || 
      order.orderType === 'retour' || 
      order.orderType === 'return' ||
      String(order.clientName || '').includes('استرجاع') || 
      String(order.product || '').includes('استرجاع') || 
      order.status === 'retour'
    );

    // ==========================================
    // ACTION: APPROVE & CREATE PARCEL
    // ==========================================
    if (action === 'approve') {
      if (order.exchangeStatus === 'approved' && order.trackingNumber) {
        return res.status(200).json({
          success: true,
          alreadyApproved: true,
          action: 'approved',
          trackingNumber: order.trackingNumber,
          deliveryCompany: order.deliveryCompany || 'zrexpress'
        });
      }
      let trackingNumber = order.trackingNumber || null;
      let shippingLabelUrl = order.shippingLabelUrl || null;
      let deliveryCompany = order.deliveryCompany || 'zrexpress';

      // Call create-parcel handler if exchange and no tracking yet (Returns are sent by customer to warehouse)
      if (!isReturn && !trackingNumber) {
        try {
          const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.pyjama-dz.net';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const createParcelUrl = `${protocol}://${host}/api/create-parcel`;

          const parcelRes = await fetch(createParcelUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_PARCEL_SECRET },
            body: JSON.stringify({ order, company: deliveryCompany })
          });
          const parcelData = await parcelRes.json();
          if (parcelData && parcelData.trackingNumber) {
            trackingNumber = parcelData.trackingNumber;
            shippingLabelUrl = parcelData.shippingLabelUrl || null;
            deliveryCompany = parcelData.deliveryCompany || deliveryCompany;
          } else {
            console.warn('[approve-exchange] Parcel creation response:', parcelData);
          }
        } catch (pe) {
          console.error('Error calling create-parcel for exchange:', pe);
          try {
            const fallbackRes = await fetch('https://www.pyjama-dz.net/api/create-parcel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_PARCEL_SECRET },
              body: JSON.stringify({ order, company: deliveryCompany })
            });
            const fallbackData = await fallbackRes.json();
            if (fallbackData && fallbackData.trackingNumber) {
              trackingNumber = fallbackData.trackingNumber;
              shippingLabelUrl = fallbackData.shippingLabelUrl || null;
              deliveryCompany = fallbackData.deliveryCompany || deliveryCompany;
            }
          } catch (e2) {
            console.error('Fallback create-parcel error:', e2);
          }
        }
      }

      // Update Supabase order
      const updatePayload = {
        status: 'confirmee',
        exchangeStatus: 'approved',
        trackingNumber: trackingNumber,
        shippingLabelUrl: shippingLabelUrl,
        deliveryCompany: deliveryCompany,
        exchange_approved_at: new Date().toISOString()
      };

      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updatePayload)
      });

      // Collect replacement items barcode text for WhatsApp
      let barcodesList = [];
      let itemsList = order.items;
      if (typeof itemsList === 'string') {
        try { itemsList = JSON.parse(itemsList); } catch(e) { itemsList = []; }
      }
      if (Array.isArray(itemsList)) {
        itemsList.forEach(it => {
          if (!it.isExchangeMeta && it.title) {
            const code = it.barcode ? ` - الكود بار: *${it.barcode}*` : '';
            barcodesList.push(`• ${it.title} (${it.color || ''} - ${it.size || ''})${code}`);
          }
        });
      }

      let refundDue = order.refundDue || 0;
      let baridiMobRip = order.baridiMobRip || '';
      if (!refundDue || !baridiMobRip) {
        let parsedItems = order.items;
        if (typeof parsedItems === 'string') {
          try { parsedItems = JSON.parse(parsedItems); } catch(e) {}
        }
        if (Array.isArray(parsedItems)) {
          const meta = parsedItems.find(it => it.isReturnMeta || it.isExchangeMeta || it.baridiMobRip);
          if (meta) {
            refundDue = refundDue || meta.refundDue || meta.oldProductPrice || 0;
            baridiMobRip = baridiMobRip || meta.baridiMobRip || '';
          }
        }
      }

      // Send WhatsApp approval notification
      try {
        await fetch('https://www.pyjama-dz.net/api/send-order-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_PARCEL_SECRET },
          body: JSON.stringify({
            phone: order.phone,
            clientName: String(order.clientName || '').replace(/\[.*?\]/g, '').trim(),
            id: order.id,
            action: isReturn ? 'return_approved' : 'exchange_approved',
            product: String(order.product || (isReturn ? 'بيجامة مسترجعة' : 'بيجامة بديلة')).replace(/🔄 استبدال:\s*/, '').replace(/↩️ استرجاع:\s*/, ''),
            trackingNumber: trackingNumber,
            deliveryCompany: deliveryCompany === 'yalidine' ? 'Yalidine Express 🚚' : 'ZR Express 🚚',
            barcodesText: barcodesList.join('\n'),
            refundDue: refundDue,
            baridiMobRip: baridiMobRip
          })
        });
      } catch (we) {
        console.warn('Error sending exchange/return WhatsApp approval:', we);
      }

      return res.status(200).json({
        success: true,
        action: 'approved',
        trackingNumber,
        deliveryCompany
      });
    }

    // ==========================================
    // ACTION: REJECT
    // ==========================================
    if (action === 'reject') {
      if (order.exchangeStatus === 'rejected') {
        return res.status(200).json({
          success: true,
          alreadyRejected: true,
          action: 'rejected',
          reason: order.exchange_rejection_reason || reason || 'Already rejected'
        });
      }
      const rejectionReason = reason || (isReturn ? 'تعذر استرجاع هذا المنتج وفق سياسة المتجر' : 'تعذر استبدال هذا المنتج وفق سياسة المتجر');

      const updatePayload = {
        status: 'annulee',
        exchangeStatus: 'rejected',
        exchange_rejection_reason: rejectionReason,
        exchange_rejected_at: new Date().toISOString()
      };

      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updatePayload)
      });

      // Send WhatsApp rejection notification
      try {
        await fetch('https://www.pyjama-dz.net/api/send-order-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_PARCEL_SECRET },
          body: JSON.stringify({
            phone: order.phone,
            clientName: String(order.clientName || '').replace(/\[.*?\]/g, '').trim(),
            id: order.id,
            action: isReturn ? 'return_rejected' : 'exchange_rejected',
            reason: rejectionReason
          })
        });
      } catch (we) {
        console.warn('Error sending exchange/return WhatsApp rejection:', we);
      }

      return res.status(200).json({
        success: true,
        action: 'rejected',
        reason: rejectionReason
      });
    }

    return res.status(400).json({ error: 'Invalid action, expected approve or reject' });
  } catch (err) {
    console.error('Error in approve-exchange handler:', err);
    return res.status(500).json({ error: err.message });
  }
}
