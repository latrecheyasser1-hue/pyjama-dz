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
      // 1. Fetch Hot Sale product IDs from settings
      const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.hot_sale_products&select=value`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const settingsData = await settingsRes.json();
      let hotSaleIds = [];
      if (Array.isArray(settingsData) && settingsData[0]?.value) {
        try {
          const parsed = typeof settingsData[0].value === 'string' ? JSON.parse(settingsData[0].value) : settingsData[0].value;
          if (Array.isArray(parsed)) hotSaleIds = parsed;
        } catch(e) {}
      }

      // 2. Fetch products and deduplicate
      let products = [];
      if (hotSaleIds.length > 0) {
        const idFilter = hotSaleIds.map(id => `"${id}"`).join(',');
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=in.(${idFilter})&select=*`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        products = await prodRes.json();
      }

      if (!Array.isArray(products) || products.length === 0) {
        const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&limit=2`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        products = await fallbackRes.json();
      }

      // Prepare product images and captions with STRICT DEDUPLICATION
      const productMediaList = [];
      const seenProdIds = new Set();
      const seenImgUrls = new Set();

      if (Array.isArray(products)) {
        products.forEach(p => {
          if (!p || !p.id || seenProdIds.has(p.id)) return;
          const imgUrl = getProductImageUrl(p);
          if (!imgUrl || seenImgUrls.has(imgUrl)) return;

          seenProdIds.add(p.id);
          seenImgUrls.add(imgUrl);

          productMediaList.push({
            id: p.id,
            title: p.title || 'منتج مميز',
            price: p.price || 0,
            imageUrl: imgUrl
          });
        });
      }

      // 3. Fetch all unique clients from orders table
      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=phone,clientName&order=created_at.desc&limit=500`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const orders = await orderRes.json();

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

      let sentCount = 0;
      for (const [phone, rawName] of uniqueClients.entries()) {
        const firstName = cleanClientName(rawName);
        const greeting = firstName ? `أهلاً وسهلاً بك ${firstName}` : `أهلاً وسهلاً بك عزيزي الزبون`;

        // Send individual product photos first
        for (const item of productMediaList) {
          if (item.imageUrl) {
            const caption = `✨ *${item.title}*\nالسعر: ${item.price} دج`;
            await sendWhatsAppImage(phone, item.imageUrl, caption);
            await new Promise(r => setTimeout(r, 150));
          }
        }

        // Send short text message at the end explaining these are the most sold products this week
        const textMsg = `*متجر Pyjama DZ*\n\n${greeting}! 🌸\nهذو هما المنتجات والسلعة الأكثر مبيعاً هاد الأسبوع في متجرنا! 🔥✨\n\nتفضل بتصفح كافة الصور والمنتجات والطلب مباشرة عبر موقعنا الرسمي:\nhttps://pyjama-dz.vercel.app`;

        await sendWhatsAppMessage(phone, textMsg);
        sentCount++;
        await new Promise(r => setTimeout(r, 200));
      }

      hotSaleResult = { status: 'success', sentCount, totalClients: uniqueClients.size, mediaCount: productMediaList.length };
    }

    let followupResult = null;

    // 2. 14-DAY POST-ORDER FOLLOW-UP CAMPAIGN
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

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      hotSaleResult,
      followupResult
    });
  } catch (err) {
    console.error('Error running cron notifications:', err);
    return res.status(500).json({ error: err.message });
  }
}
