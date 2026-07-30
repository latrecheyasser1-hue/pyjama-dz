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
    const last8 = rawDigits.slice(-8);
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

    if (last8) {
      await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ key: `last_alert_${last8}`, value: dataVal })
      });
    }
  } catch (err) {
    console.error('Error saving stock alert record:', err);
  }
}

async function notifyWaitingCustomers(productId, colorIdx, size, newQty, variantColor) {
  // Restock notifications are handled exclusively by api/notify-restock.js
  return;
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
    const soldItemsList = (bodyData && Array.isArray(bodyData.soldItems)) ? bodyData.soldItems : null;
    const soldKeySet = new Set();
    if (soldItemsList) {
      soldItemsList.forEach(i => {
        if (i.productId && i.size && typeof i.colorIdx === 'number') {
          // Exact key: productId_colorIdx_size — perfect 1:1 match with alertKey
          soldKeySet.add(`${String(i.productId).trim().toLowerCase()}_${i.colorIdx}_${String(i.size).trim().toLowerCase()}`);
        } else if (i.productId && i.size) {
          soldKeySet.add(`${String(i.productId).trim().toLowerCase()}_${String(i.size).trim().toLowerCase()}`);
        } else if (i.size) {
          soldKeySet.add(`size_${String(i.size).trim().toLowerCase()}`);
        }
      });
    }

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

            // If explicit soldItems were provided, ONLY evaluate sizes that were actually sold in this order
            if (soldKeySet.size > 0) {
              // Use alertKey format: productId_cIdx_size — perfect 1:1 match
              const exactKey = `${String(product.id).trim().toLowerCase()}_${cIdx}_${String(size).trim().toLowerCase()}`;
              const fallbackKey = `${String(product.id).trim().toLowerCase()}_${String(size).trim().toLowerCase()}`;
              const sizeOnlyKey = `size_${String(size).trim().toLowerCase()}`;
              if (!soldKeySet.has(exactKey) && !soldKeySet.has(fallbackKey) && !soldKeySet.has(sizeOnlyKey)) {
                continue; // Skip — this exact color variant + size was NOT sold!
              }
            }
            
            const isBoutiqueVariant = isBoutiqueProduct ||
                                      String(variant.name || variant.color || '').toLowerCase().includes('حانيت') || 
                                      String(variant.name || variant.color || '').toLowerCase().includes('boutique') ||
                                      String(variant.name || variant.color || '').toLowerCase().includes('محل');

            if (!isNaN(numQty)) {
              const alertKey = `${product.id}_${cIdx}_${size}`;
              const lastAlertState = alertStatesMap.get(alertKey);

              if (numQty > 5) {
                // If stock is replenished above 5, ALWAYS overwrite old alert state so fresh alert fires next time stock drops <= 5
                try {
                  fetch(`${SUPABASE_URL}/rest/v1/settings`, {
                    method: 'POST',
                    headers: {
                      'apikey': SUPABASE_KEY,
                      'Authorization': `Bearer ${SUPABASE_KEY}`,
                      'Content-Type': 'application/json',
                      'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                      key: `alert_state_${alertKey}`,
                      value: JSON.stringify({ qty: numQty, timestamp: 0, alertType: 'cleared', isResolved: true })
                    })
                  }).catch(() => {});
                } catch (e) {}
                continue;
              }

              let isExplicitSoldItem = false;
              if (soldKeySet.size > 0) {
                // Use alertKey format: productId_cIdx_size — perfect 1:1 match
                const exactKey = `${String(product.id).trim().toLowerCase()}_${cIdx}_${String(size).trim().toLowerCase()}`;
                const fallbackKey = `${String(product.id).trim().toLowerCase()}_${String(size).trim().toLowerCase()}`;
                const sizeOnlyKey = `size_${String(size).trim().toLowerCase()}`;
                if (soldKeySet.has(exactKey) || soldKeySet.has(fallbackKey) || soldKeySet.has(sizeOnlyKey)) {
                  isExplicitSoldItem = true;
                }
              }

              let shouldSendAlert = false;
              if (isExplicitSoldItem) {
                // Item was explicitly sold in this checkout → ALWAYS send alert, no exceptions
                shouldSendAlert = true;
                // Clear any old alert state so it never blocks this sold item
                try {
                  fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.alert_state_${alertKey}`, {
                    method: 'DELETE',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                  }).catch(() => {});
                } catch (e) {}
              } else if (numQty === 0) {
                // If stock reached 0, send zero stock alert unless a 0-alert was ALREADY sent in the last 2 minutes
                const lastAlertTime = lastAlertState?.timestamp || 0;
                const isRecentZeroAlert = lastAlertState?.alertType === 'zero' && (Date.now() - lastAlertTime < 120000);
                if (!isRecentZeroAlert) {
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
    const isPosSaleCheck = Boolean(bodyData && (bodyData.isPos || (Array.isArray(bodyData.soldItems) && bodyData.soldItems.some(i => i.isPos))));

    const mainStorePhone = (storeSettings.whatsapp && String(storeSettings.whatsapp).trim() && !storeSettings.whatsapp.includes('123456'))
      ? String(storeSettings.whatsapp).trim()
      : null;

    const rawLivraisonPhone = (storeSettings.whatsappLivraisonManager && String(storeSettings.whatsappLivraisonManager).trim() && !storeSettings.whatsappLivraisonManager.includes('123456'))
      ? String(storeSettings.whatsappLivraisonManager).trim()
      : null;

    const rawBoutiquePhone = (storeSettings.whatsappBoutiqueManager && String(storeSettings.whatsappBoutiqueManager).trim() && !storeSettings.whatsappBoutiqueManager.includes('123456'))
      ? String(storeSettings.whatsappBoutiqueManager).trim()
      : null;

    let boutiquePhone = rawBoutiquePhone || mainStorePhone;
    let livraisonPhone = rawLivraisonPhone || mainStorePhone;

    // Helper to send individual alerts with 150ms stagger to finish under Vercel 10s timeout
    global._activeSendingLocks = global._activeSendingLocks || new Set();

    async function sendIndividualAlerts(itemsList, targetPhone, stockTypeTitle) {
      if (!targetPhone || !Array.isArray(itemsList) || itemsList.length === 0) return 0;

      const validItems = itemsList.filter(item => {
        if (global._activeSendingLocks.has(item.alertKey)) return false;
        global._activeSendingLocks.add(item.alertKey);
        return true;
      });

      if (validItems.length === 0) return 0;

      const sendPromises = validItems.map(async (item, idx) => {
        // Stagger requests by 100ms so 30 messages finish in ~3s, well under Vercel 10s timeout
        await new Promise(resolve => setTimeout(resolve, idx * 100));

        const alertStateVal = JSON.stringify({ 
          qty: item.qty, 
          timestamp: Date.now(), 
          alertType: item.qty === 0 ? 'zero' : 'low',
          isResolved: false 
        });

        try {
          fetch(`${SUPABASE_URL}/rest/v1/settings`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({ key: `alert_state_${item.alertKey}`, value: alertStateVal })
          }).catch(() => {});
        } catch (e) {}

        const alertMsg = item.qty === 0
          ? `🛑 *تنبيه نفاد المخزون بالكامل (${stockTypeTitle})* 🛑\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• حالة الستوك: نافذ تماماً (0 حبة متبقية).\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`
          : `⚠️ *تنبيه مخزون منخفض (${stockTypeTitle})* ⚠️\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• الكمية المتبقية: ${item.qty} حبات فقط.\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`;

        const resVal = await sendWhatsAppMessage(targetPhone, alertMsg, item.imageUrl);

        if (resVal && Array.isArray(resVal.messages) && resVal.messages[0]) {
          const newMsgId = resVal.messages[0].id;
          await saveStockAlertRecord(newMsgId, targetPhone, item.productId, item.colorIdx, item.size);
          return 1;
        }
        return 0;
      });

      const results = await Promise.all(sendPromises);
      return results.reduce((acc, curr) => acc + curr, 0);
    }

    // If check was triggered by a POS Cashier sale, send ALL sold low-stock items to boutiquePhone if set
    if (isPosSaleCheck && boutiquePhone) {
      const allPosLowItems = [...hanoutLowItems, ...livraisonLowItems];
      if (allPosLowItems.length > 0) {
        alertsSent += await sendIndividualAlerts(allPosLowItems, boutiquePhone, 'سطوك المحل');
      }
    } else {
      // A. Send ONLY Stock Livraison items to Livraison Worker (if phone is set)
      if (livraisonPhone && livraisonLowItems.length > 0) {
        alertsSent += await sendIndividualAlerts(livraisonLowItems, livraisonPhone, 'سطوك التوصيل');
      }

      // B. Send ONLY Stock Hanout (Boutique) items to Boutique Worker (if phone is set)
      if (boutiquePhone && hanoutLowItems.length > 0) {
        alertsSent += await sendIndividualAlerts(hanoutLowItems, boutiquePhone, 'سطوك المحل');
      }
    }

    return res.status(200).json({ success: true, alertsSent, totalLivraisonLow: livraisonLowItems.length, totalHanoutLow: hanoutLowItems.length });
  } catch (err) {
    console.error('Error checking low stock:', err);
    return res.status(500).json({ error: err.message });
  }
}
