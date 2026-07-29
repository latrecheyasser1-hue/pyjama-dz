const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSKaHVaNhbDcXWvirUZCAtEQwuHus3c6VCPYV6BzJhJMGZBv0y7LPe2UTWP1KOFKngJCRqiumnd6R27VNOZABQlmGzzbl87arKbPuvgZBag148noX6nLxjkKMO7Ue0hiLUDRS4spYopCGpuwHTZCnPW4Deyzivxg3xlphgLBdUZAWWRD5Y0HwZDZD';

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

async function sendWhatsAppMessage(toPhone, textBody, imageUrl = null) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone) return;
  const cleanDigits = String(toPhone).replace(/\D/g, '');
  if (cleanDigits.length < 8) return;
  const waPhone = cleanDigits.startsWith('213') ? cleanDigits : (cleanDigits.startsWith('0') ? '213' + cleanDigits.substring(1) : '213' + cleanDigits);

  const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
  
  const payload = (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) ? {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: waPhone,
    type: 'image',
    image: { link: imageUrl, caption: textBody }
  } : {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: waPhone,
    type: 'text',
    text: { preview_url: false, body: textBody }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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

    // 🚀 ULTRA-FAST PARALLEL FETCHING (100ms single roundtrip)
    const [prodRes, waitlistRes, settingsRes] = await Promise.all([
      productId
        ? fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          }).then(r => r.json()).catch(() => [])
        : Promise.resolve([]),
      fetch(`${SUPABASE_URL}/rest/v1/waitlist?status=in.(pending,en_attente)&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      }).then(r => r.json()).catch(() => []),
      fetch(`${SUPABASE_URL}/rest/v1/settings?key=like.notified_waitlist_%`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      }).then(r => r.json()).catch(() => [])
    ]);

    const productTitle = (Array.isArray(prodRes) && prodRes[0]?.title) ? prodRes[0].title : '';
    const waitlistEntries = Array.isArray(waitlistRes) ? waitlistRes : [];

    const notifiedLocks = new Set();
    if (Array.isArray(settingsRes)) {
      settingsRes.forEach(r => {
        if (r.key) notifiedLocks.add(r.key.replace('notified_waitlist_', ''));
      });
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

    const dispatchPromises = [];

    // Process waitlist entries (customers who explicitly asked to be notified on restock)
    for (const entry of waitlistEntries) {
      if (entry.status !== 'pending' && entry.status !== 'en_attente') continue;
      if (entry.id && notifiedLocks.has(String(entry.id))) continue; // Instant 0ms memory check!

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
        notifiedPhones.add(waPhone);

        // Async non-blocking dispatch
        dispatchPromises.push((async () => {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({ key: `notified_waitlist_${entry.id}`, value: 'true' })
            });
          } catch (e) {}

          const clientNameStr = (entry.client_name && entry.client_name !== 'زبون الواتساب' && entry.client_name !== 'زبون المحادثة')
            ? entry.client_name : '';
          const nameGreeting = clientNameStr ? ` ${clientNameStr}` : '';
          const prodDesc = productTitle || entryProdText ? ` في موديل ${productTitle || entryProdText}` : '';

          const restockMsg = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\n🎉 بشرى سارة! توفر مقاسك (${targetSize}) مجدداً${prodDesc}!\nيمكنك الآن إتمام طلبك مباشرة وحصرياً عبر موقعنا الرسمي قبل نفاد الكمية:\nhttps://pyjama-dz.vercel.app\n\nشكراً لانتظارك معنا! 🌸`;

          await sendWhatsAppMessage(waPhone, restockMsg);
        })());
      }
    }

    if (dispatchPromises.length > 0) {
      await Promise.all(dispatchPromises);
    }
  } catch (err) {
    console.error('Error notifying waiting customers:', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let bodyData = req.body;
    if (typeof bodyData === 'string') {
      try { bodyData = JSON.parse(bodyData); } catch(e) {}
    }
    const productId = req.query?.productId || bodyData?.productId;

    // 1. Parallel fetch for store settings & products for sub-100ms ultra-fast execution
    const settingsPromise = fetch(`${SUPABASE_URL}/rest/v1/settings?select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json()).catch(() => []);

    let productsPromise;
    if (bodyData && bodyData.product) {
      productsPromise = Promise.resolve([bodyData.product]);
    } else {
      let url = `${SUPABASE_URL}/rest/v1/products?select=*`;
      if (productId) {
        url += `&id=eq.${productId}`;
      }
      productsPromise = fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      }).then(r => r.json()).catch(() => []);
    }

    const [settingsRows, fetchedProducts] = await Promise.all([settingsPromise, productsPromise]);

    const storeSettings = {};
    const alertStatesMap = new Map();
    if (Array.isArray(settingsRows)) {
      settingsRows.forEach(row => {
        storeSettings[row.key] = row.value;
        if (row.key && row.key.startsWith('alert_state_') && row.value) {
          try {
            const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            alertStatesMap.set(row.key.replace('alert_state_', ''), val);
          } catch (e) {}
        }
      });
    }

    const boutiqueManagerPhone = (storeSettings.whatsappBoutiqueManager && !storeSettings.whatsappBoutiqueManager.includes('123456')) ? storeSettings.whatsappBoutiqueManager : null;
    const livraisonManagerPhone = (storeSettings.whatsappLivraisonManager && !storeSettings.whatsappLivraisonManager.includes('123456')) ? storeSettings.whatsappLivraisonManager : null;

    const products = Array.isArray(fetchedProducts) ? fetchedProducts : [];
    const isExplicitSaleCheck = Boolean(bodyData && (Array.isArray(bodyData.productIds) || bodyData.productId));

    let targetProductsList = products;
    if (bodyData && Array.isArray(bodyData.productIds) && bodyData.productIds.length > 0) {
      const targetIdSet = new Set(bodyData.productIds.map(id => String(id).trim().toLowerCase()));
      targetProductsList = products.filter(p => p && p.id && targetIdSet.has(String(p.id).trim().toLowerCase()));
    } else if (bodyData && bodyData.productId) {
      const targetId = String(bodyData.productId).trim().toLowerCase();
      targetProductsList = products.filter(p => p && p.id && String(p.id).trim().toLowerCase() === targetId);
    }

    const livraisonLowItems = [];
    const hanoutLowItems = [];

    if (Array.isArray(targetProductsList)) {
      for (const product of targetProductsList) {
        if (!product || !Array.isArray(product.colorVariants)) continue;

        const cat = String(product.category || '').trim();
        // Ignore wholesale products (gros__ / super_gros__) in low stock alert checks
        if (cat.startsWith('gros__') || cat.startsWith('super_gros__')) continue;

        const isBoutiqueProduct = cat.startsWith('boutique__') || cat === '__boutique__' ||
                                  (product.badge && String(product.badge).includes('Boutique'));

        for (let cIdx = 0; cIdx < product.colorVariants.length; cIdx++) {
          const variant = product.colorVariants[cIdx];
          if (!variant || !variant.stock) continue;

          for (const [size, qty] of Object.entries(variant.stock)) {
            const numQty = parseInt(qty);
            
            const isBoutiqueVariant = isBoutiqueProduct ||
                                      String(variant.name || variant.color || '').toLowerCase().includes('حانيت') || 
                                      String(variant.name || variant.color || '').toLowerCase().includes('boutique') ||
                                      String(variant.name || variant.color || '').toLowerCase().includes('محل');

            if (!isNaN(numQty)) {
              const alertKey = `${product.id}_${cIdx}_${size}`;
              const lastAlertState = alertStatesMap.get(alertKey);

              if (numQty > 5) {
                // If stock is replenished above 5, clear old alert state so fresh alert fires next time stock drops <= 5
                if (lastAlertState && !lastAlertState.isResolved) {
                  try {
                    fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}`, {
                      method: 'DELETE',
                      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                    }).catch(() => {});
                  } catch (e) {}
                }
                continue;
              }

              let shouldSendAlert = false;
              if (numQty === 0) {
                if (!lastAlertState || lastAlertState.alertType !== 'zero' || (lastAlertState.qty !== undefined && lastAlertState.qty > 0)) {
                  shouldSendAlert = true;
                }
              } else { // 1 <= numQty <= 5
                if (!lastAlertState || lastAlertState.alertType !== 'low' || (lastAlertState.qty !== undefined && numQty < lastAlertState.qty)) {
                  shouldSendAlert = true;
                }
              }

              if (!shouldSendAlert) continue; // 🛑 ALREADY SENT ALERT FOR THIS STOCK LEVEL!

              const prodImgs = product.images || [];
              const rawImg = Array.isArray(prodImgs) && prodImgs[0] ? prodImgs[0] : (typeof prodImgs === 'string' ? prodImgs : null);
              
              const imageUrl = (rawImg && typeof rawImg === 'string' && rawImg.startsWith('http'))
                ? rawImg
                : `https://pyjama-dz.vercel.app/api/product-image?id=${product.id}.jpg`;

              const itemInfo = {
                productId: product.id,
                colorIdx: cIdx,
                title: product.title || 'بيجامة',
                color: variant.name || variant.color || 'الافتراضي',
                size: size,
                qty: numQty,
                imageUrl: imageUrl,
                alertKey: alertKey
              };

              if (isBoutiqueVariant) {
                hanoutLowItems.push(itemInfo);
              } else {
                livraisonLowItems.push(itemInfo);
              }
            }
          }
        }
      }
    }
    let alertsSent = 0;
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const livraisonPhone = (storeSettings.whatsappLivraisonManager && String(storeSettings.whatsappLivraisonManager).trim() && !storeSettings.whatsappLivraisonManager.includes('123456'))
      ? String(storeSettings.whatsappLivraisonManager).trim()
      : null;

    const boutiquePhone = (storeSettings.whatsappBoutiqueManager && String(storeSettings.whatsappBoutiqueManager).trim() && !storeSettings.whatsappBoutiqueManager.includes('123456'))
      ? String(storeSettings.whatsappBoutiqueManager).trim()
      : null;

    // Helper to send individual alerts sequentially for a given list of items to a target phone
    global._activeSendingLocks = global._activeSendingLocks || new Set();

    async function sendIndividualAlerts(itemsList, targetPhone, stockTypeTitle) {
      if (!targetPhone || !Array.isArray(itemsList) || itemsList.length === 0) return 0;

      let count = 0;
      for (const item of itemsList) {
        if (global._activeSendingLocks.has(item.alertKey)) continue;
        global._activeSendingLocks.add(item.alertKey);

        const alertStateVal = JSON.stringify({ 
          qty: item.qty, 
          timestamp: Date.now(), 
          alertType: item.qty === 0 ? 'zero' : 'low',
          isResolved: false 
        });

        try {
          await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({ key: `alert_state_${item.alertKey}`, value: alertStateVal })
          });
        } catch (e) {}

        const alertMsg = item.qty === 0
          ? `🛑 *تنبيه نفاد المخزون بالكامل (${stockTypeTitle})* 🛑\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• حالة الستوك: نافذ تماماً (0 حبة متبقية).\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`
          : `⚠️ *تنبيه مخزون منخفض (${stockTypeTitle})* ⚠️\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• الكمية المتبقية: ${item.qty} حبات فقط.\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`;

        const resVal = await sendWhatsAppMessage(targetPhone, alertMsg, item.imageUrl);

        if (resVal && Array.isArray(resVal.messages) && resVal.messages[0]) {
          count++;
          const newMsgId = resVal.messages[0].id;
          saveStockAlertRecord(newMsgId, targetPhone, item.productId, item.colorIdx, item.size).catch(() => {});
        }

        // 600ms delay between sending individual messages to prevent WhatsApp API rate-limit drops
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      return count;
    }

    // A. Send ONLY Stock Livraison items to Livraison Worker (if phone is set)
    if (livraisonPhone && livraisonLowItems.length > 0) {
      alertsSent += await sendIndividualAlerts(livraisonLowItems.slice(0, 15), livraisonPhone, 'سطوك التوصيل');
    }

    // B. Send ONLY Stock Hanout (Boutique) items to Boutique Worker (if phone is set)
    if (boutiquePhone && hanoutLowItems.length > 0) {
      alertsSent += await sendIndividualAlerts(hanoutLowItems.slice(0, 15), boutiquePhone, 'سطوك المحل');
    }

    return res.status(200).json({ success: true, alertsSent, totalLivraisonLow: livraisonLowItems.length, totalHanoutLow: hanoutLowItems.length });
  } catch (err) {
    console.error('Error checking low stock:', err);
    return res.status(500).json({ error: err.message });
  }
}
