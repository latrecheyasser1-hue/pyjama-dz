const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tdhxdnmjmnfjkictdzpk.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaHhkbm1qbW5mamtpY3RkenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIxMDAsImV4cCI6MjEwMjc5ODEwMH0.K3moWEWjE5cvBmFwaGyPspx_yIixii9tY136DgpCZ3g';
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

async function sendWhatsAppImage(toPhone, imageUrl, captionText) {
  const token = await getMetaAccessToken();
  if (!token || !toPhone || !imageUrl) return;
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
        type: 'image',
        image: {
          link: imageUrl,
          caption: captionText || ''
        }
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Send WhatsApp Image error:', err);
  }
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

function getProductImageUrl(p) {
  if (!p || !p.id) return null;

  let img = null;
  if (p.image && typeof p.image === 'string') img = p.image;
  else if (Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0] === 'string') img = p.images[0];
  else if (p.imageUrl && typeof p.imageUrl === 'string') img = p.imageUrl;
  else if (Array.isArray(p.colorVariants) && p.colorVariants.length > 0) {
    for (const cv of p.colorVariants) {
      if (cv.image && typeof cv.image === 'string') {
        img = cv.image;
        break;
      }
    }
  }

  if (!img) return null;

  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/')) return `https://pyjama-dz.vercel.app${img}`;

  return `https://pyjama-dz.vercel.app/api/product-image?id=${p.id}&file=product.jpg`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action || 'weekly_hot_sale';

  try {
    let hotSaleResult = null;

    if (action === 'weekly_hot_sale' || action === 'all') {
      // 1. Fetch only retail delivery products (exclude Gros/Wholesale and Boutique/POS)
      const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const allProducts = await prodRes.json();
      const productMap = new Map();
      if (Array.isArray(allProducts)) {
        allProducts.forEach(p => {
          if (!p || !p.id) return;
          const cat = String(p.category || '').toLowerCase();
          const chan = String(p.channel || '').toLowerCase();
          if (p.isGrosOnly || p.isGros || cat === 'gros' || cat.startsWith('gros__') || chan === 'gros') return;
          if (p.isPos || p.isBoutique || cat.startsWith('boutique__') || chan === 'boutique') return;
          productMap.set(String(p.id), p);
        });
      }

      // 2. Fetch recent orders from the past 7 days to calculate Top 10 Best Sellers
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const orderCountRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?created_at=gte.${sevenDaysAgo}&status=not.in.(annulee,retour,account)&select=items,productId,product`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const recentOrders = await orderCountRes.json();

      const salesCounter = new Map(); // prodId -> count
      if (Array.isArray(recentOrders)) {
        recentOrders.forEach(o => {
          if (Array.isArray(o.items) && o.items.length > 0) {
            o.items.forEach(it => {
              const pid = it.productId ? String(it.productId) : null;
              if (pid) {
                salesCounter.set(pid, (salesCounter.get(pid) || 0) + Number(it.qty || 1));
              }
            });
          } else if (o.productId) {
            const pid = String(o.productId);
            salesCounter.set(pid, (salesCounter.get(pid) || 0) + 1);
          }
        });
      }

      // 3. Sort products by weekly sales descending
      const sortedProds = Array.from(productMap.values()).sort((a, b) => {
        const salesA = salesCounter.get(String(a.id)) || 0;
        const salesB = salesCounter.get(String(b.id)) || 0;
        if (salesB !== salesA) return salesB - salesA;
        return (b.views || 0) - (a.views || 0);
      });

      // 4. Select top 10 products with valid images
      const top10Products = [];
      const seenImgs = new Set();

      for (const p of sortedProds) {
        if (top10Products.length >= 10) break;
        const imgUrl = getProductImageUrl(p);
        if (imgUrl && !seenImgs.has(imgUrl)) {
          seenImgs.add(imgUrl);
          top10Products.push({
            id: p.id,
            title: p.title || 'بيجامة فاخرة',
            price: p.price || 2800,
            imageUrl: imgUrl
          });
        }
      }

      // 5. Fetch all unique clients who placed orders
      const clientRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=phone,clientName&status=not.in.(account)&order=created_at.desc&limit=1000`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const orders = await clientRes.json();

      const uniqueClients = new Map();
      if (Array.isArray(orders)) {
        orders.forEach(o => {
          if (!o.phone || o.phone === '-' || o.phone.length < 6) return;
          const cleanP = String(o.phone).replace(/\D/g, '');
          if (!cleanP || cleanP.length < 8) return;
          const key = cleanP.startsWith('213') ? cleanP : (cleanP.startsWith('0') ? '213' + cleanP.substring(1) : '213' + cleanP);

          if (!uniqueClients.has(key)) {
            uniqueClients.set(key, o.clientName || '');
          }
        });
      }

      const clientEntries = Array.from(uniqueClients.entries());
      let sentCount = 0;

      // Process in concurrent batches of 3 clients for high speed
      const batchSize = 3;
      for (let i = 0; i < clientEntries.length; i += batchSize) {
        const batch = clientEntries.slice(i, i + batchSize);
        await Promise.all(batch.map(async ([phone, rawName]) => {
          try {
            const firstName = cleanClientName(rawName);
            const greeting = firstName ? `أهلاً وسهلاً بك ${firstName}` : `أهلاً وسهلاً بك عزيزي الزبون`;

            // Send Top 10 Product Images
            for (const item of top10Products) {
              if (item.imageUrl) {
                const caption = `🔥 *${item.title}*\n💰 السعر: ${item.price} دج`;
                await sendWhatsAppImage(phone, item.imageUrl, caption);
                await new Promise(r => setTimeout(r, 60));
              }
            }

            // Final summary message with official website link
            const textMsg = `*متجر Pyjama DZ ✨*\n\n${greeting}! 🌸\nهذو هما أفضل 10 منتجات الأكثر طلباً ومبيعاً هذا الأسبوع في متجرنا! 🔥✨\n\nتفضل بتصفح كافة الصور والموديلات والطلب مباشرة عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app`;

            await sendWhatsAppMessage(phone, textMsg);
            sentCount++;
          } catch(e) {
            console.error('Error sending to client:', phone, e);
          }
        }));
      }

      hotSaleResult = { status: 'success', sentCount, totalClients: uniqueClients.size, mediaCount: top10Products.length };
    }

    let followupResult = null;

    if (action === 'followup_14_days' || action === 'all') {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const sixteenDaysAgo = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString();

      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?created_at=gte.${sixteenDaysAgo}&created_at=lte.${fourteenDaysAgo}&status=in.(confirmee,expediee,livree)&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const oldOrders = await orderRes.json();

      let followUpCount = 0;
      if (Array.isArray(oldOrders)) {
        const uniqueFollowupClients = new Map();

        oldOrders.forEach(o => {
          if (!o.phone || o.phone === '-' || o.phone.length < 6) return;
          const cleanP = String(o.phone).replace(/\D/g, '');
          if (!cleanP || cleanP.length < 8) return;
          const key = cleanP.startsWith('213') ? cleanP : (cleanP.startsWith('0') ? '213' + cleanP.substring(1) : '213' + cleanP);

          if (!uniqueFollowupClients.has(key)) {
            uniqueFollowupClients.set(key, { name: o.clientName || '', orderId: o.id, product: o.product });
          }
        });

        for (const [phone, info] of uniqueFollowupClients.entries()) {
          const firstName = cleanClientName(info.name);
          const greeting = firstName ? `أهلاً وسهلاً بك ${firstName}` : `أهلاً وسهلاً بك عزيزي الزبون`;

          const msg = `*متجر Pyjama DZ*\n\n${greeting}! 🌸\nمرت أسبوعان على طلبيتك من متجرنا. ✨\nيهمنا جداً معرفة رأيك وانطباعك عن جودة السلعة وخدمتنا، ورضاك هما أولويتنا دائماً. 🙏\n\nإذا كان لديك أي ملاحظة أو تقييم، يسعدنا تواصلك معنا دائماً ونتمنى أن تكون السلعة قد نالت إعجابك الكامل! ❤️\nhttps://pyjama-dz.vercel.app`;

          await sendWhatsAppMessage(phone, msg);
          followUpCount++;
          await new Promise(r => setTimeout(r, 200));
        }
      }

      followupResult = { status: 'success', sentCount: followUpCount };
    }

    // 3. 10-MINUTE DELAYED ORDER & RECLAMATION CONFIRMATION CAMPAIGN
    let delayedConfirmationsResult = null;
    if (action === 'process_delayed_confirmations' || action === 'all') {
      const now = Date.now();
      const TEN_MINUTES_MS = 10 * 60 * 1000;

      let processedOrdersCount = 0;
      let processedReclamationsCount = 0;

      const sentOrderIds = new Set();
      try {
        const sRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.sent_order_confirmations&select=value`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const sData = await sRes.json();
        if (Array.isArray(sData) && sData[0]?.value) {
          const arr = typeof sData[0].value === 'string' ? JSON.parse(sData[0].value) : sData[0].value;
          if (Array.isArray(arr)) arr.forEach(id => sentOrderIds.add(id));
        }
      } catch(e) {}

      // Process 10-Minute Delayed Orders (DISABLED - Order confirmations are 100% INSTANT 0ms at checkout time)
      // Delayed loop disabled to prevent sending duplicate or unexpected messages.

      try {
        const setRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.reclamations&select=*`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const settingsData = await setRes.json();

        if (Array.isArray(settingsData) && settingsData[0]?.value) {
          let reclamations = typeof settingsData[0].value === 'string' ? JSON.parse(settingsData[0].value) : settingsData[0].value;
          if (Array.isArray(reclamations)) {
            let updated = false;

            for (let i = 0; i < reclamations.length; i++) {
              const rec = reclamations[i];
              if (rec.whatsapp_sent === false) {
                const createdMs = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
                const ageMs = now - createdMs;

                // STRICT 10-MINUTE DELAY GUARD: Must be at least 10 minutes old AND less than 48 hours old
                if (createdMs > 0 && ageMs >= TEN_MINUTES_MS && ageMs <= (48 * 60 * 60 * 1000)) {
                  const phone = rec.whatsappNumber || rec.phone;
                  if (phone) {
                    const greetingName = (rec.clientName && rec.clientName.trim() !== '' && rec.clientName !== 'زبون المحادثة' && rec.clientName !== 'زبون الواتساب')
                      ? ` ${rec.clientName.trim()}`
                      : '';

                    const replyMsg = `*متجر Pyjama DZ*\n\nأهلاً وسهلاً بك${greetingName}! 🌸\nنشكرك جزيلاً على تواصلك معنا وعلى مشاركتنا ملاحظاتك وتقييمك القيّم. 🙏\nتأكد أن رأيك ورضاك هما أولويتنا دائماً، وسنعمل باستمرار على تقديم الأفضل والأحسن لخدمتك على أكمل وجه بإذن الله. ✨❤️`;

                    await sendWhatsAppMessage(phone, replyMsg);
                    rec.whatsapp_sent = true;
                    updated = true;
                    processedReclamationsCount++;
                    await new Promise(r => setTimeout(r, 200));
                  }
                }
              }
            }

            if (updated) {
              await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.reclamations`, {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value: JSON.stringify(reclamations) })
              });
            }
          }
        }
      } catch (e) {
        console.error('Error processing delayed reclamation confirmations:', e);
      }

      delayedConfirmationsResult = { status: 'success', processedOrdersCount, processedReclamationsCount };
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      hotSaleResult,
      followupResult,
      delayedConfirmationsResult
    });
  } catch (err) {
    console.error('Error running cron notifications:', err);
    return res.status(500).json({ error: err.message });
  }
}
