const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

const DEFAULT_TOKEN = 'EAAguaWHGlf8BSN9Rooekd1lKmgx8A7xTzFFeeXzZAsTy3fvs7uU2vxvQSWZB3yodqaTmhHKEPfx5sNh94oAjj58l5bVDPtOMkVlkZAdGfXKkGczFpdFXM6011NK7OFrfZBlAzp5AlhUnwWwc4wQcWRapawp4pXnnFTvYLZBa3hE7UKe99VmaNGGDPtD8LudZCA6sfZAStJ2bqZBe6EIXx05WfwRarZCxkKC6jWSkKZB6JsYKhPbG2lAB5OxgcdyOiqu8HYcFKdyk5ffUXg8y9wZACf8';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { productId } = req.query.productId ? req.query : (req.body || {});

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

        // Check if product belongs to Boutique stock vs Livraison stock
        const isBoutiqueProduct = (product.category && String(product.category).startsWith('boutique__')) ||
                                  (product.badge && String(product.badge).includes('Boutique'));

        for (let cIdx = 0; cIdx < product.colorVariants.length; cIdx++) {
          const variant = product.colorVariants[cIdx];
          if (!variant || !variant.stock) continue;

          const isBoutiqueVariant = isBoutiqueProduct ||
                                    String(variant.name || variant.color || '').toLowerCase().includes('حانيت') || 
                                    String(variant.name || variant.color || '').toLowerCase().includes('boutique') ||
                                    String(variant.name || variant.color || '').toLowerCase().includes('محل');
          
          // Strict Manager Routing:
          // Boutique stock alerts ONLY go to boutiqueManagerPhone.
          // Livraison stock alerts ONLY go to livraisonManagerPhone.
          const targetPhone = isBoutiqueVariant ? boutiqueManagerPhone : livraisonManagerPhone;
          const locationLabel = isBoutiqueVariant ? "سطوك المحل (Boutique)" : "سطوك التوصيل (Livraison)";

          // Skip if no manager phone is registered for this specific stock type
          if (!targetPhone) continue;

          for (const [size, qty] of Object.entries(variant.stock)) {
            const numQty = parseInt(qty);
            if (!isNaN(numQty) && numQty <= 5 && numQty >= 0) {
              const alertMsg = `⚠️ *تنبيه مخزون منخفض (${locationLabel})* ⚠️\n\n• المنتج: ${product.title}\n• اللون: ${variant.name || variant.color || 'الافتراضي'}\n• المقاس: ${size}\n• الكمية المتبقية: ${numQty} حبات فقط.\n\n🔄 للإضافة في المخزون، قم بالرد المباشر (Répondre) على هذه الرسالة برقم الكمية المضافة فقط (مثال: 15).\n[REF:${product.id}:${cIdx}:${size}]`;

              // Send template to open Meta's 24-hour window automatically if needed
              await sendWhatsAppTemplate(targetPhone, 'hello_world', 'en_US');

              const alertRes = await sendWhatsAppMessage(targetPhone, alertMsg);
              if (alertRes && Array.isArray(alertRes.messages) && alertRes.messages[0]) {
                await saveStockAlertRecord(alertRes.messages[0].id, targetPhone, product.id, cIdx, size);
                alertsSent++;
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
