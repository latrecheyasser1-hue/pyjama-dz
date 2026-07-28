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

    // Fetch store settings to identify and exclude manager phone numbers
    const managerPhones = new Set(['0771335039', '213771335039', '0554128933', '213554128933']);
    try {
      const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const settingsRows = await setRes.json();
      if (Array.isArray(settingsRows)) {
        settingsRows.forEach(r => {
          if (r.value && (r.key === 'whatsappLivraisonManager' || r.key === 'whatsappBoutiqueManager' || r.key === 'whatsappAdmin' || r.key === 'whatsapp')) {
            const rawDigits = String(r.value).replace(/\D/g, '');
            if (rawDigits) {
              managerPhones.add(rawDigits);
              managerPhones.add(rawDigits.replace(/^0/, '213'));
              managerPhones.add('0' + rawDigits.slice(-9));
            }
          }
        });
      }
    } catch (e) {}

    const isManagerPhone = (phoneStr) => {
      if (!phoneStr) return false;
      const clean = String(phoneStr).replace(/\D/g, '');
      if (!clean) return false;
      const last8 = clean.slice(-8);
      for (const mPhone of managerPhones) {
        if (mPhone.endsWith(last8)) return true;
      }
      return false;
    };

    // Only process waitlist entries (customers who explicitly asked to be notified on restock)
    for (const entry of waitlistEntries) {
      if (entry.status !== 'pending' && entry.status !== 'en_attente') continue;

      const entryPhone = entry.whatsapp_number || entry.phone;
      if (isManagerPhone(entryPhone)) continue;

      // Check settings table to ensure exact single alert per waitlist entry ID
      try {
        const sRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.notified_waitlist_${entry.id}&select=value`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const sRows = await sRes.json();
        if (Array.isArray(sRows) && sRows.length > 0) continue;
      } catch (e) {}

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
        
        // Save persistent notified key in settings table for this waitlist entry
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let bodyData = req.body;
    if (typeof bodyData === 'string') {
      try { bodyData = JSON.parse(bodyData); } catch(e) {}
    }
    const productId = req.query?.productId || bodyData?.productId;

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
    if (bodyData && bodyData.product) {
      products = [bodyData.product];
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

    const livraisonLowItems = [];
    const hanoutLowItems = [];

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

            if (!isNaN(numQty) && numQty <= 5 && numQty >= 0) {
              const itemInfo = {
                productId: product.id,
                colorIdx: cIdx,
                title: product.title || 'بيجامة',
                color: variant.name || variant.color || 'الافتراضي',
                size: size,
                qty: numQty
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

    const livraisonPhone = (storeSettings.whatsappLivraisonManager && !storeSettings.whatsappLivraisonManager.includes('123456')) ? storeSettings.whatsappLivraisonManager : (storeSettings.whatsapp || '0771335039');
    const boutiquePhone = (storeSettings.whatsappBoutiqueManager && !storeSettings.whatsappBoutiqueManager.includes('123456')) ? storeSettings.whatsappBoutiqueManager : (storeSettings.whatsapp || '0771335039');

    // A. Send individual messages for Stock Livraison items
    if (livraisonPhone && livraisonLowItems.length > 0) {
      const itemsToAlert = livraisonLowItems.slice(0, 15);
      const tasks = itemsToAlert.map(async (item) => {
        const alertMsg = item.qty === 0
          ? `🛑 *تنبيه نفاد المخزون بالكامل (سطوك التوصيل)* 🛑\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• حالة الستوك: نافذ تماماً (0 حبة متبقية).\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`
          : `⚠️ *تنبيه مخزون منخفض (سطوك التوصيل)* ⚠️\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• الكمية المتبقية: ${item.qty} حبات فقط.\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`;
        
        const resVal = await sendWhatsAppMessage(livraisonPhone, alertMsg);
        if (resVal && Array.isArray(resVal.messages) && resVal.messages[0]) {
          const newMsgId = resVal.messages[0].id;
          await saveStockAlertRecord(newMsgId, livraisonPhone, item.productId, item.colorIdx, item.size);
          return true;
        }
        return false;
      });
      const results = await Promise.allSettled(tasks);
      alertsSent += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    }

    // B. Send individual messages for Stock Hanout (Boutique) items
    if (boutiquePhone && hanoutLowItems.length > 0 && boutiquePhone !== livraisonPhone) {
      const itemsToAlert = hanoutLowItems.slice(0, 15);
      const tasks = itemsToAlert.map(async (item) => {
        const alertMsg = item.qty === 0
          ? `🛑 *تنبيه نفاد المخزون بالكامل (سطوك المحل)* 🛑\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• حالة الستوك: نافذ تماماً (0 حبة متبقية).\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`
          : `⚠️ *تنبيه مخزون منخفض (سطوك المحل)* ⚠️\n\n• المنتج: ${item.title}\n• اللون: ${item.color}\n• المقاس: ${item.size}\n• الكمية المتبقية: ${item.qty} حبات فقط.\n\n🕒 التوقيت: ${timeStr}\n👉 يمكنك الرد على هذه الرسالة مباشرة عند تزويد المخزون.`;
        
        const resVal = await sendWhatsAppMessage(boutiquePhone, alertMsg);
        if (resVal && Array.isArray(resVal.messages) && resVal.messages[0]) {
          const newMsgId = resVal.messages[0].id;
          await saveStockAlertRecord(newMsgId, boutiquePhone, item.productId, item.colorIdx, item.size);
          return true;
        }
        return false;
      });
      const results = await Promise.allSettled(tasks);
      alertsSent += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    }

    return res.status(200).json({ success: true, alertsSent, totalLivraisonLow: livraisonLowItems.length, totalHanoutLow: hanoutLowItems.length });
  } catch (err) {
    console.error('Error checking low stock:', err);
    return res.status(500).json({ error: err.message });
  }
}
