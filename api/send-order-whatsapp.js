const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';


async function getMetaAccessToken() {
  if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN.length > 20) {
    return process.env.META_ACCESS_TOKEN.trim();
  }
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_TOKEN.length > 20) {
    return process.env.WHATSAPP_TOKEN.trim();
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.meta_access_token&select=value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.value) {
      return data[0].value.trim();
    }
  } catch (err) {
    console.error('Error fetching Meta token from settings:', err);
  }
  return null;
}

async function getSequentialOrderNum(orderId) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/orders?select=id,status,product,created_at&order=created_at.asc`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const rawOrders = await res.json();
    if (Array.isArray(rawOrders)) {
      const realOrders = rawOrders.filter(o => o.status !== 'account' && !String(o.product || '').includes('_CUSTOMER_ACCOUNT_'));
      const idx = realOrders.findIndex(o => o.id === orderId);
      if (idx !== -1) return String(idx + 1);
      return String(realOrders.length);
    }
  } catch (err) {
    console.error('Error fetching sequential order number:', err);
  }
  return "346";
}


const ADMIN_SECRET = process.env.ADMIN_PARCEL_SECRET || process.env.VITE_ADMIN_PARCEL_SECRET || 'pyjama_dz_sec_99a8b7c6d5e4f3';

// 1. IP Rate Limiting: Max 5 requests per 5 minutes per IP for public callers
const ipRateLimitMap = new Map();
function isIpRateLimited(ip) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxLimit = 5;

  const item = ipRateLimitMap.get(ip);
  if (!item || now > item.resetTime) {
    ipRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  item.count++;
  return item.count > maxLimit;
}

// 2. Phone Rate Limiting (Anti-WhatsApp Bombing): Max 2 messages per 5 minutes per phone
const phoneRateLimitMap = new Map();
function isPhoneRateLimited(phone) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxLimit = 2;

  const item = phoneRateLimitMap.get(phone);
  if (!item || now > item.resetTime) {
    phoneRateLimitMap.set(phone, { count: 1, resetTime: now + windowMs });
    return false;
  }
  item.count++;
  return item.count > maxLimit;
}

// 3. Order Deduplication (Prevents duplicate messages on double-click)
const recentOrdersMap = new Map();
function isDuplicateOrderMessage(orderId) {
  if (!orderId) return false;
  const now = Date.now();
  const lastTime = recentOrdersMap.get(orderId);
  if (lastTime && (now - lastTime < 60000)) {
    return true;
  }
  recentOrdersMap.set(orderId, now);
  if (recentOrdersMap.size > 500) {
    for (const [k, v] of recentOrdersMap.entries()) {
      if (now - v > 60000) recentOrdersMap.delete(k);
    }
  }
  return false;
}

function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 9 || clean.length > 15) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  return true;
}

export default async function handler(req, res) {
  const headers = req.headers || {};
  const origin = headers.origin || '';
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check Admin bypass
  const tokenHeader = headers['x-admin-token'] || headers['x-internal-secret'] || '';
  const authHeader = headers['authorization'] || '';
  const isAdmin = (tokenHeader && tokenHeader === ADMIN_SECRET) ||
                  (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === ADMIN_SECRET);

  // 1. IP Rate Limiting Guard
  const clientIp = (headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (!isAdmin && isIpRateLimited(clientIp)) {
    console.warn(`[send-order-whatsapp] IP rate limit exceeded: ${clientIp}`);
    return res.status(429).json({ error: 'Too many requests. Please wait a few minutes before submitting another order confirmation.' });
  }

  try {
    const { phone, nom, clientName, id, wilaya, product, isWaitlist } = req.body || {};
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '213' + formattedPhone.substring(1);
    if (!formattedPhone.startsWith('213')) formattedPhone = '213' + formattedPhone;

    // 2. Phone Rate Limiting Guard (Anti-WhatsApp Bombing)
    if (!isAdmin && isPhoneRateLimited(formattedPhone)) {
      console.warn(`[send-order-whatsapp] Phone rate limit exceeded for ${formattedPhone}`);
      return res.status(429).json({ error: 'A WhatsApp confirmation was recently sent to this phone number. Please wait before requesting another.' });
    }

    // 3. Order Deduplication (Prevents duplicate messages on double-click)
    if (id && isDuplicateOrderMessage(id)) {
      console.log(`[send-order-whatsapp] Suppressed duplicate message for order: ${id}`);
      return res.status(200).json({ success: true, message: 'Duplicate message suppressed', orderId: id });
    }

    const META_ACCESS_TOKEN = await getMetaAccessToken();
    if (!META_ACCESS_TOKEN) {
      console.warn('[send-order-whatsapp] META_ACCESS_TOKEN is not configured in env or settings.');
      return res.status(500).json({ error: 'Meta WhatsApp access token is not configured.' });
    }
    const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

    const displayName = nom || clientName || '';
    const nameGreeting = displayName && displayName !== 'الزبون' ? ` ${displayName}` : '';
    const cleanProduct = String(product || 'بيجامة').replace(/\(\(/g, '').replace(/\)\)/g, '');

    let messageText = '';
    let orderNum = '';

    let metaData = null;

    if (isWaitlist) {
      // Waitlist notifications are INSTANT (فَمْ فَمْ)
      messageText = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nعذراً، هذا الموديل أو المقاس (${cleanProduct}) غير متوفر حالياً.\nتم حفظ طلبك وسنخبرك عبر الواتساب فور توفره مجدداً إن شاء الله. شكراً لاهتمامك! 🌸`;

      const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
      const messageBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: messageText }
      };

      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      });
      metaData = await apiRes.json();
    } else {
      orderNum = await getSequentialOrderNum(id);
      const isReturnApproval = Boolean(req.body?.action === 'return_approved' || req.body?.isReturnApproval);
      const isReturnRejection = Boolean(req.body?.action === 'return_rejected' || req.body?.isReturnRejection);
      const isReturnOrder = Boolean(req.body?.isRetour || cleanProduct.includes('استرجاع'));

      const isExchangeApproval = Boolean(req.body?.action === 'exchange_approved' || req.body?.isExchangeApproval);
      const isExchangeRejection = Boolean(req.body?.action === 'exchange_rejected' || req.body?.isExchangeRejection);
      const isExchangeOrder = Boolean(req.body?.isExchange || cleanProduct.includes('استبدال'));

      if (isReturnApproval) {
        const deliveryComp = req.body?.deliveryCompany || 'شركة التوصيل التي استلمت منها (Yalidine أو ZR Express)';
        const refundAmount = req.body?.refundDue ? `\n💰 *المبلغ المستحق للاسترداد:* ${req.body.refundDue} دج` : '';
        const ripText = req.body?.baridiMobRip ? `\n💳 *حساب بريدي موب (RIP):* ${req.body.baridiMobRip}` : '';

        messageText = `*متجر Pyjama DZ - تمت الموافقة على طلب الاسترجاع ✅*\n\n` +
          `أهلاً بك${nameGreeting}! 🌸\n` +
          `يسرنا إعلامك بأنه قد *تمت مراجعة والموافقة على طلب الاسترجاع الخاص بك*.\n\n` +
          `📋 *السلعة المراد إرجاعها:*\n• ${cleanProduct}${refundAmount}${ripText}\n\n` +
          `📦 *تعليمات إرسال الطرد:*\n` +
          `1️⃣ يرجى التوجه إلى أقرب وكالة أو الاتصال بمكتب *${deliveryComp}* (نفس شركة التوصيل التي استلمت منها طلبيتك).\n` +
          `2️⃣ قم بإرسال الطرد المرتجع إلى عنوان متجرنا بقيمة *0 دج (0 DA)* (بدون طلب دفع عند الاستلام COD).\n` +
          `3️⃣ فور وصول الطرد إلى المتجر وفحصه والتأكد من سلامته، سيتم تحويل مستحقاتك المالية فوراً إلى حسابك عبر تطبيق بريدي موب.\n\n` +
          `شكراً لثقتك وتعاملك مع Pyjama DZ! ❤️`;
      } else if (isReturnRejection) {
        const rejectionReason = req.body?.reason ? `\n• ملاحظة: ${req.body.reason}` : '';
        messageText = `*متجر Pyjama DZ - بخصوص طلب الاسترجاع 🌸*\n\nأهلاً بك${nameGreeting}.\nنعتذر منك، بعد مراجعة تفاصيل وصور طلب الاسترجاع، تعذر علينا قبول الطلب حالياً.${rejectionReason}\n\nإذا كان لديك أي استفسار، يمكنك مراسلتنا هنا مباشرة لمساعدتك. شكراً لتفهمك!`;
      } else if (isReturnOrder) {
        messageText = `*متجر Pyjama DZ - طلب استرجاع منتج ↩️*\n\nأهلاً بك${nameGreeting}.\nتلقينا طلبك لاسترجاع المنتج واسترداد المبلغ بنجاح:\n\n• رقم الطلب: #${orderNum}\n• تفاصيل الاسترجاع: ${cleanProduct}\n• الولاية: ${wilaya || ''}\n\n👉 هل أنت متأكد من رغبتك في هذا الاسترجاع؟\nيرجى الرد بـ *تأكيد* لتثبيت طلبك وإحالته لإدارة المتجر للمراجعة والمعالجة.`;
      } else if (isExchangeApproval) {
        const trackingNum = req.body?.trackingNumber || 'قيد التجهيز';
        const barcodesStr = req.body?.barcodesText || '';
        const deliveryCompany = req.body?.deliveryCompany || 'شركة التوصيل';
        
        messageText = `*متجر Pyjama DZ - تمت الموافقة على طلب الاستبدال ✅*\n\nأهلاً بك${nameGreeting}! 🌸\nيسرنا إعلامك بأنه قد *تمت مراجعة والموافقة على طلب الاستبدال الخاص بك*.\n\n📦 *رقم التتبع (Tracking):*\n*${trackingNum}*\n🚚 *شركة الشحن:* ${deliveryCompany}\n\n• السلعة البديلة الجديدة: ${cleanProduct}\n${barcodesStr ? `\n🏷️ *أكواد السلعة البديلة:*\n${barcodesStr}\n` : ''}\n✨ سيصلك موزع التوصيل لتسليمك السلعة الجديدة واستلام السلعة القديمة منك في نفس الوقت.\nشكراً لثقتك بـ Pyjama DZ! ❤️`;
      } else if (isExchangeRejection) {
        const rejectionReason = req.body?.reason ? `\n• ملاحظة: ${req.body.reason}` : '';
        messageText = `*متجر Pyjama DZ - بخصوص طلب الاستبدال 🌸*\n\nأهلاً بك${nameGreeting}.\nنعتذر منك، بعد مراجعة تفاصيل وصور طلب الاستبدال، تعذر علينا قبول الطلب حالياً.${rejectionReason}\n\nإذا كان لديك أي استفسار، يمكنك مراسلتنا هنا مباشرة لمساعدتك. شكراً لتفهمك!`;
      } else if (isExchangeOrder) {
        messageText = `*متجر Pyjama DZ - طلب استبدال منتج 🔄*\n\nأهلاً بك${nameGreeting}.\nتلقينا طلبك لاستبدال المنتج بنجاح:\n\n• رقم الطلب: #${orderNum}\n• تفاصيل الاستبدال: ${cleanProduct}\n• الولاية: ${wilaya || ''}\n\n👉 هل أنت متأكد من رغبتك في هذا الاستبدال؟\nيرجى الرد بـ *تأكيد* لتثبيت طلبك وإحالته لإدارة المتجر للمراجعة والمعالجة.`;
      } else {
        messageText = `*متجر Pyjama DZ*\n\nأهلاً بك${nameGreeting}.\nتلقينا طلبك عبر الموقع بنجاح:\n\n• رقم الطلب: #${orderNum}\n• المنتجات: ${cleanProduct}\n• الولاية: ${wilaya || ''}\n\n👉 يرجى الرد بـ *تأكيد* (أو *إلغاء*) لتأكيد طلبك وتجهيز شحنتك.`;
      }

      const url = `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`;
      const messageBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: messageText }
      };

      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      });
      metaData = await apiRes.json();
    }

    // Instant server-side low stock check trigger for this specific product (50ms execution speed)
    try {
      fetch('https://www.pyjama-dz.net/api/check-low-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': process.env.ADMIN_PARCEL_SECRET || 'pyjama_dz_sec_99a8b7c6d5e4f3' },
        body: JSON.stringify({ productId: req.body?.productId || req.body?.id })
      }).catch(() => {});
    } catch (e) {}

    // Asynchronous check for delayed confirmations
    try {
      fetch('https://www.pyjama-dz.net/api/cron-notifications?action=process_delayed_confirmations', { headers: { 'x-admin-token': process.env.ADMIN_PARCEL_SECRET || 'pyjama_dz_sec_99a8b7c6d5e4f3' } }).catch(() => {});
    } catch (e) {}

    return res.status(200).json({ success: true, metaResponse: metaData, delayed: !isWaitlist });
  } catch (err) {
    console.error('Error sending order WhatsApp:', err);
    return res.status(500).json({ error: err.message });
  }
}
