const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

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
      let trackingNumber = order.trackingNumber || null;
      let shippingLabelUrl = order.shippingLabelUrl || null;
      let deliveryCompany = order.deliveryCompany || 'zrexpress';

      // Call create-parcel handler if exchange and no tracking yet (Returns are sent by customer to warehouse)
      if (!isReturn && !trackingNumber) {
        try {
          const host = req.headers['x-forwarded-host'] || req.headers.host || 'pyjama-dz.vercel.app';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const createParcelUrl = `${protocol}://${host}/api/create-parcel`;

          const parcelRes = await fetch(createParcelUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            const fallbackRes = await fetch('https://pyjama-dz.vercel.app/api/create-parcel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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

      // Send WhatsApp approval notification
      try {
        await fetch('https://pyjama-dz.vercel.app/api/send-order-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: order.phone,
            clientName: String(order.clientName || '').replace(/\[.*?\]/g, '').trim(),
            id: order.id,
            action: isReturn ? 'return_approved' : 'exchange_approved',
            product: String(order.product || (isReturn ? 'بيجامة مسترجعة' : 'بيجامة بديلة')).replace(/🔄 استبدال:\s*/, '').replace(/↩️ استرجاع:\s*/, ''),
            trackingNumber: trackingNumber,
            deliveryCompany: deliveryCompany === 'yalidine' ? 'Yalidine Express 🚚' : 'ZR Express 🚚',
            barcodesText: barcodesList.join('\n')
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
        await fetch('https://pyjama-dz.vercel.app/api/send-order-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
