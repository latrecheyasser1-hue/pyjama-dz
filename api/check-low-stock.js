const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSB0ueA7kFuWgnYPnNrz0gUT1xfKY57gFdT2xuupnCLF0F4GLPu57FYVg1U9gjMOqSUtsysGZBoHhP2b4gDYwZC4dZBQgvCxaHOzWTcZBdhdqiRQZAAMR8oUAmsPb4Y7KJBpE8ZBoPeQymPGufupxuRMwWw8eHy1uJBMhpi83dSXnVKMsxtlKP2fS8aLVZBZB2iVv7o8Lz6F0sV73EDwvInBXT32sSZCrSgCvZAFNkCbnv1Tawzv8IjGBbAZAsWjVEz2n8NYr9wtyURt';

async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
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

async function sendWhatsAppTemplate(toPhone, templateName = 'hello_world', languageCode = 'en_US') {
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
        to: waPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode }
        }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Send WhatsApp Template error:', err);
  }
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

async function saveStockAlertRecord(msgId, phone, productId, colorIdx, size) {
  try {
    const rawDigits = (phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.length >= 9 ? rawDigits.slice(-9) : rawDigits;
    const dataVal = JSON.stringify({ productId, colorIdx, size, timestamp: Date.now() });
    
    if (msgId) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key: `alert_msg_${msgId}`, value: dataVal })
      });
    }

    if (cleanPhone) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key: `last_alert_${cleanPhone}`, value: dataVal })
      });
    }
  } catch (err) {
    console.error('Error saving stock alert record:', err);
  }
}

async function notifyWaitingCustomers(productId, colorIdx, size, newQty, variantColor) {
  try {
    if (!size || newQty <= 0) return;
    const targetSize = String(size).trim().toUpperCase();

    let productTitle = '';
    if (productId) {
      try {
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const prods = await prodRes.json();
        if (Array.isArray(prods) && prods[0]) {
          productTitle = prods[0].title || '';
        }
      } catch (e) {}
    }

    let orders = [];
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?status=in.(en_attente_stock,pending_stock,rupture_stock,attente_stock,out_of_stock)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      orders = await res.json();
      if (!Array.isArray(orders)) orders = [];
    } catch (e) {
      orders = [];
    }

    let waitlistEntries = [];
    try {
      const waitlistRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?status=in.(pending,en_attente)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      waitlistEntries = await waitlistRes.json();
      if (!Array.isArray(waitlistEntries)) waitlistEntries = [];
    } catch (e) {
      waitlistEntries = [];
    }

    const notifiedPhones = new Set();

    const isProdMatch = (targetId, targetTitle, orderId, orderText) => {
      if (targetId && orderId && String(targetId).trim() === String(orderId).trim()) return true;
      const nTarget = String(targetTitle || '').toLowerCase().trim();
      const nOrder = String(orderText || '').toLowerCase().trim();
      if (nTarget && nOrder) {
        if (nOrder.includes(nTarget) || nTarget.includes(nOrder)) return true;
        const tw = nTarget.split(/\s+/).filter(w => w.length >= 3);
        const ow = nOrder.split(/\s+/).filter(w => w.length >= 3);
        if (tw.some(w => ow.includes(w))) return true;
      }
      return false;
    };

    const isSzMatch = (targetSz, orderSz) => {
      if (!targetSz || !orderSz) return false;
      const nTarget = String(targetSz).trim().toUpperCase();
      const nOrder = String(orderSz).trim().toUpperCase();
      return nOrder === nTarget || nOrder === 'STANDARD' || nTarget === 'STANDARD' || nOrder === 'ALL';
    };

    const isColorMatch = (targetCol, entryCol) => {
      if (!entryCol || entryCol === 'الافتراضي' || entryCol === 'default') return true;
      if (!targetCol) return true;
      const nTarget = String(targetCol).toLowerCase().trim();
      const nEntry = String(entryCol).toLowerCase().trim();
      return nTarget.includes(nEntry) || nEntry.includes(nTarget);
    };

    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      const item = items[0] || {};
      const orderSize = (item.size || order.size || '');
      const orderColor = (item.color || order.color || '');
      const orderProdId = item.productId || item.product_id || order.productId || order.product_id;
      const orderProdText = item.product || item.title || order.product || '';

      const sizeMatches = isSzMatch(targetSize, orderSize);
      const colorMatches = isColorMatch(variantColor, orderColor);
      const prodMatches = isProdMatch(productId, productTitle, orderProdId, orderProdText);

      if (sizeMatches && colorMatches && prodMatches && order.phone) {
        const cleanPhone = order.phone.replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('213') ? cleanPhone : cleanPhone.replace(/^0/, '213');

        if (notifiedPhones.has(waPhone)) continue;

        const orderNumStr = String(order.id).slice(-4);
        const clientNameStr = (order.clientName && order.clientName !== 'زبون الواتساب' && order.clientName !== 'زبون المحادثة')
          ? order.clientName : '';
        const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
        const prodDesc = productTitle ? ` في موديل ${productTitle}` : '';

        const restockMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\n🎉 بشرى سارة! توفر مقاسك (${targetSize}) مجدداً${prodDesc}!\nيمكنك الآن إتمام طلبك مباشرة وحصرياً عبر موقعنا الرسمي قبل نفاد الكمية:\nhttps://pyjama-dz.vercel.app\n\nشكراً لانتظارك معنا! 🌸`;
        
        await sendWhatsAppMessage(waPhone, restockMsg);
        notifiedPhones.add(waPhone);
      }
    }

    for (const entry of waitlistEntries) {
      if (entry.status !== 'pending' && entry.status !== 'en_attente') continue;

      const entryPhone = entry.whatsapp_number || entry.phone;
      const cleanPhone = entryPhone ? entryPhone.replace(/\D/g, '') : '';
      const waPhone = cleanPhone.startsWith('213') ? cleanPhone : cleanPhone.replace(/^0/, '213');

      if (!waPhone || notifiedPhones.has(waPhone)) continue;

      const entrySize = entry.size || '';
      const entryColor = entry.color || '';
      const entryProdId = entry.product_id || entry.productId;
      const entryProdText = entry.product_title || entry.product || '';

      const sizeMatches = isSzMatch(targetSize, entrySize);
      const colorMatches = isColorMatch(variantColor, entryColor);
      const prodMatches = isProdMatch(productId, productTitle, entryProdId, entryProdText);

      if (sizeMatches && colorMatches && prodMatches) {
        // Mark waitlist entry status as notified in Supabase
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${entry.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'notified' })
          });
        } catch (e) {}

        const clientNameStr = (entry.client_name && entry.client_name !== 'زبون الواتساب' && entry.client_name !== 'زبون المحادثة')
          ? entry.client_name : '';
        const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
        const prodDesc = productTitle || entryProdText ? ` في موديل ${productTitle || entryProdText}` : '';

        const restockMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\n🎉 بشرى سارة! توفر مقاسك (${targetSize}) مجدداً${prodDesc}!\nيمكنك الآن إتمام طلبك مباشرة وحصرياً عبر موقعنا الرسمي قبل نفاد الكمية:\nhttps://pyjama-dz.vercel.app\n\nشكراً لانتظارك معنا! 🌸`;

        await sendWhatsAppMessage(waPhone, restockMsg);
        notifiedPhones.add(waPhone);
      }
    }
  } catch (err) {
    console.error('Error notifying waiting customers:', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const productId = req.query?.productId || req.body?.productId;

    // 1. Fetch store settings
    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const settingsRows = await settingsRes.json();
    const storeSettings = {};
    if (Array.isArray(settingsRows)) {
      settingsRows.forEach(row => {
        storeSettings[row.key] = row.value;
      });
    }

    const boutiqueManagerPhone = (storeSettings.whatsappBoutiqueManager && !storeSettings.whatsappBoutiqueManager.includes('123456')) ? storeSettings.whatsappBoutiqueManager : null;
    const livraisonManagerPhone = (storeSettings.whatsappLivraisonManager && !storeSettings.whatsappLivraisonManager.includes('123456')) ? storeSettings.whatsappLivraisonManager : null;

    // 2. Fetch target product or use product object passed in request body
    let products = [];
    if (req.body && req.body.product) {
      products = [req.body.product];
    } else {
      let url = `${SUPABASE_URL}/rest/v1/products?select=*`;
      if (productId) {
        url += `&id=eq.${productId}`;
      }
      const prodRes = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      products = await prodRes.json();
    }

    let alertsSent = 0;
    if (Array.isArray(products)) {
      for (const product of products) {
        if (!product || !Array.isArray(product.colorVariants)) continue;

        const isBoutiqueProduct = (product.category && String(product.category).startsWith('boutique__')) ||
                                  (product.badge && String(product.badge).includes('Boutique'));

        for (let cIdx = 0; cIdx < product.colorVariants.length; cIdx++) {
          const variant = product.colorVariants[cIdx];
          if (!variant || !variant.stock) continue;

          for (const [size, qty] of Object.entries(variant.stock)) {
            const numQty = parseInt(qty);
            
            // 🚀 AUTOMATIC RESTOCK NOTIFICATIONS TO WAITING CUSTOMERS WHEN QTY > 0
            if (!isNaN(numQty) && numQty > 0) {
              await notifyWaitingCustomers(product.id, cIdx, size, numQty, variant.name || variant.color);
            }

            const isBoutiqueVariant = isBoutiqueProduct ||
                                      String(variant.name || variant.color || '').toLowerCase().includes('حانيت') || 
                                      String(variant.name || variant.color || '').toLowerCase().includes('boutique') ||
                                      String(variant.name || variant.color || '').toLowerCase().includes('محل');
            
            const targetPhone = isBoutiqueVariant ? boutiqueManagerPhone : livraisonManagerPhone;
            const locationLabel = isBoutiqueVariant ? "سطوك المحل (Boutique)" : "سطوك التوصيل (Livraison)";

            if (!targetPhone) continue;

            if (!isNaN(numQty) && numQty <= 5 && numQty >= 0) {
              const alertKey = `${product.id}_${cIdx}_${size}`;

              let lastAlertState = null;
              try {
                const stateRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}&select=value`, {
                  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const rows = await stateRes.json();
                if (Array.isArray(rows) && rows[0]?.value) {
                  lastAlertState = JSON.parse(rows[0].value);
                }
              } catch (e) {}

              const now = Date.now();
              const isQtyChanged = !lastAlertState || lastAlertState.qty !== numQty;
              const is30MinElapsed = lastAlertState && (now - (lastAlertState.timestamp || 0) >= 30 * 60 * 1000);
              const isRecentlySentIn2Min = lastAlertState && (now - (lastAlertState.timestamp || 0) < 2 * 60 * 1000);

              if (isRecentlySentIn2Min) {
                console.log(`Skipping duplicate alert for ${product.title} ${size} - already sent less than 2 mins ago.`);
                continue;
              }

              if (isQtyChanged || is30MinElapsed) {
                const alertMsg = `⚠️ *تنبيه مخزون منخفض (${locationLabel})* ⚠️\n\n• المنتج: ${product.title}\n• اللون: ${variant.name || variant.color || 'الافتراضي'}\n• المقاس: ${size}\n• الكمية المتبقية: ${numQty} حبات فقط.`;

                const alertRes = await sendWhatsAppMessage(targetPhone, alertMsg);
                if (alertRes && Array.isArray(alertRes.messages) && alertRes.messages[0]) {
                  const newMsgId = alertRes.messages[0].id;
                  await saveStockAlertRecord(newMsgId, targetPhone, product.id, cIdx, size);

                  await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                    method: 'POST',
                    headers: {
                      'apikey': SUPABASE_KEY,
                      'Authorization': `Bearer ${SUPABASE_KEY}`,
                      'Content-Type': 'application/json',
                      'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                      key: `alert_state_${alertKey}`,
                      value: JSON.stringify({ qty: numQty, timestamp: now, isResolved: false })
                    })
                  });

                  let activeMsgs = [];
                  try {
                    const activeRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.active_msgs_${alertKey}&select=value`, {
                      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                    });
                    const activeRows = await activeRes.json();
                    if (Array.isArray(activeRows) && activeRows[0]?.value) {
                      activeMsgs = JSON.parse(activeRows[0].value);
                    }
                  } catch (e) {}

                  if (!Array.isArray(activeMsgs)) activeMsgs = [];
                  activeMsgs.push(newMsgId);

                  await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                    method: 'POST',
                    headers: {
                      'apikey': SUPABASE_KEY,
                      'Authorization': `Bearer ${SUPABASE_KEY}`,
                      'Content-Type': 'application/json',
                      'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                      key: `active_msgs_${alertKey}`,
                      value: JSON.stringify(activeMsgs)
                    })
                  });

                  alertsSent++;
                }
              }
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, alertsSent });
  } catch (err) {
    console.error('Error checking low stock:', err);
    return res.status(500).json({ error: err.message });
  }
}
