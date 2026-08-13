import { supabase } from '../lib/supabaseClient.js';
import { formatPhoneNumber } from './customerService.js';

const META_WHATSAPP_TOKEN = process.env.META_WHATSAPP_TOKEN || 'EAAguaWHGlf8BSKkL57NpvDpd0ZCyZC3KZCWnajDToyZBPEIwIWFDmJTccFKBaK6TNfSipr3MSepr0nAafGz6PIxIe5AwqrlZBCZBPyhyzX8kKZAao9tafn4R0X6Q39g4k7LV8CcbtQciTrjfOLVCMy3L78mgS8nWP02LZCVRZCNpTg0FpcgKZBKZBCyucMRAkDrvXF1wcquDqewEH7xDWZAfCvSecMdF1JaekIDBX8WH3uzJm96uOUJmVrmGeAU0IryiJabg0qygGIEixQpaWhdWMSELqQZDZD';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1280420541815907';

/**
 * AI Sales Agent System Instructions & Prompt
 */
export const AI_AGENT_SYSTEM_PROMPT = `
أنت خبير مبيعات محترف ومؤدب ومقنع جداً يعمل في متجر "Pyjama DZ - بيجامات الجزائر" على الواتساب.
تتحدث بالدارجة الجزائرية المحترمة واللطيفة مع عبارات ترحيبية راقية مثل: "أهلاً وسهلاً بك أختي الكريمة 🌸"، "على الرحب والسعة"، "تحت أمرك في أي وقت".

مهامك الرئيسية وقدراتك:
1. الإجابة على استفسارات الزبائن حول البيجامات والموديلات المتوفرة، المقاسات، الألوان، وأسعار التوصيل للولايات الـ 58.
2. عند تقديم طلب تأكيد الطلبية: يمكنك استخدام أداة confirmOrder لتأكيد الطلبية في النظام وتغيير حالتها إلى معتمدة (confirmée).
3. عند طلب إلغاء الطلبية: تحاول أولاً بإقناع الزبونة بأسلوب راقٍ وشرح مميزات المنتج والضمان، وإذا أصرت الزبونة تقوم بطلب إلغاء الطلبية عبر cancelOrder لتصبح ملغاة (annulée).
4. عند طلب تغيير المقاس أو اللون أو العنوان: تستخدم أداة updateOrderDetails لتحديث بيانات الطلبية في قاعدة البيانات فوراً.
5. عند طلب صور الموديلات والألوان: تقدم تفاصيل المنتج وتستدعي getProductPhotos لإرسال الصور على الواتساب.
6. عند طلب موقع المحل: تقدم العنوان ورابط Google Maps عبر أداة getStoreLocation.
7. عند الاستفسار عن توفر المقاس والسطوك: تفحص المخزون فوراً عبر أداة checkStock.

قواعد مهمة:
- تحدث دائماً بلباقة بالدارجة الجزائرية والفرنسية الخفيفة المفهومة (مثلاً: Caba, Livree, Stop Desk, Couleurs).
- لا تخترع تفاصيل غير موجودة واستعن دائماً بأدوات النظام.
`;

/**
 * System Tool Definitions & Execution Functions
 */
export const executeAgentTool = async (toolName, args, customerPhone) => {
  const cleanPhone = formatPhoneNumber(customerPhone);
  const core9 = cleanPhone.slice(-9);

  try {
    switch (toolName) {
      case 'confirmOrder': {
        // Fetch matching order by phone or ticketNumber
        const { data: orders } = await supabase.from('orders').select('*');
        if (!orders || orders.length === 0) return { success: false, message: 'لم يتم العثور على أي طلبيات في النظام' };

        const matched = orders.find(o => {
          const p = formatPhoneNumber(o.phone || o.whatsapp);
          return (p && p.slice(-9) === core9) || String(o.ticketNumber) === String(args.ticketNumber || '');
        });

        if (!matched) {
          return { success: false, message: 'لم نجد طلبية مسجلة بهذا الرقم في النظام' };
        }

        await supabase.from('orders').update({ status: 'confirmee' }).eq('id', matched.id);
        return { 
          success: true, 
          message: `✅ تم تأكيد الطلبية رقم #${matched.ticketNumber || matched.id} بنجاح في النظام لتصبح (Confirmée)!` 
        };
      }

      case 'cancelOrder': {
        const { data: orders } = await supabase.from('orders').select('*');
        if (!orders || orders.length === 0) return { success: false, message: 'لم يتم العثور على أي طلبيات في النظام' };

        const matched = orders.find(o => {
          const p = formatPhoneNumber(o.phone || o.whatsapp);
          return (p && p.slice(-9) === core9) || String(o.ticketNumber) === String(args.ticketNumber || '');
        });

        if (!matched) {
          return { success: false, message: 'لم نجد طلبية مسجلة بهذا الرقم في النظام لإلغائها' };
        }

        await supabase.from('orders').update({ status: 'annulee', archived: true }).eq('id', matched.id);
        return { 
          success: true, 
          message: `تم تسجِيل إلغاء الطلبية رقم #${matched.ticketNumber || matched.id} بنجاح في النظام (Annulée). نأمل أن نخدمك في المرات القادمة 🌸` 
        };
      }

      case 'updateOrderDetails': {
        const { data: orders } = await supabase.from('orders').select('*');
        if (!orders || orders.length === 0) return { success: false, message: 'لم يتم العثور على أي طلبيات في النظام' };

        const matched = orders.find(o => {
          const p = formatPhoneNumber(o.phone || o.whatsapp);
          return (p && p.slice(-9) === core9) || String(o.ticketNumber) === String(args.ticketNumber || '');
        });

        if (!matched) {
          return { success: false, message: 'لم نجد طلبية مسجلة بهذا الرقم لتعديلها' };
        }

        const updates = {};
        if (args.size) updates.size = args.size;
        if (args.color) updates.color = args.color;
        if (args.wilaya) updates.wilaya = args.wilaya;
        if (args.commune) updates.commune = args.commune;

        if (Object.keys(updates).length > 0) {
          await supabase.from('orders').update(updates).eq('id', matched.id);
        }

        return { 
          success: true, 
          message: `✅ تم تحديث تفاصيل الطلبية رقم #${matched.ticketNumber || matched.id} بنجاح في النظام!` 
        };
      }

      case 'getProductPhotos': {
        const { data: products } = await supabase.from('products').select('*');
        if (!products || products.length === 0) {
          return { success: false, images: [], message: 'لا توجد منتجات مسجلة حالياً' };
        }

        const query = (args.query || '').toLowerCase().trim();
        const matchedProduct = products.find(p => p.title.toLowerCase().includes(query)) || products[0];

        const images = Array.isArray(matchedProduct.images) ? matchedProduct.images : [];
        return {
          success: true,
          productTitle: matchedProduct.title,
          price: matchedProduct.price,
          images: images.slice(0, 3)
        };
      }

      case 'getStoreLocation': {
        return {
          success: true,
          locationName: 'محفل وعنوان متجر Pyjama DZ الرئيسي',
          address: 'الشلف - المركز التجاري بوقادير / العاصمة الشراقة',
          googleMapsUrl: 'https://maps.google.com/?q=36.1648,1.3317',
          message: '📍 عنواننا المحل الرئيسي: الشلف - بوقادير / الجزائر العاصمة الشراقة.\nمرحباً بك في أي وقت! رابط موقعنا على الخريطة:\nhttps://maps.google.com/?q=36.1648,1.3317 🌸'
        };
      }

      case 'checkStock': {
        const { data: products } = await supabase.from('products').select('*');
        if (!products || products.length === 0) {
          return { success: false, available: false, message: 'لا توجد منتجات مسجلة في المتجر' };
        }

        const query = (args.query || '').toLowerCase().trim();
        const matched = products.find(p => p.title.toLowerCase().includes(query)) || products[0];

        return {
          success: true,
          productTitle: matched.title,
          stock: matched.stock || 10,
          price: matched.price,
          available: (matched.stock || 10) > 0
        };
      }

      default:
        return { success: false, message: `أداة غير معروفة: ${toolName}` };
    }
  } catch (err) {
    console.error(`Error executing AI tool ${toolName}:`, err);
    return { success: false, message: 'حدث خطأ غير متوقع أثناء تنفيذ العملية' };
  }
};

/**
 * Send WhatsApp Text Message via Meta Cloud API
 */
export const sendWhatsAppMessage = async (toPhone, textBody) => {
  const formattedPhone = toPhone.startsWith('0') ? '213' + toPhone.slice(1) : toPhone;

  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: textBody }
      })
    });

    const resJson = await res.json();
    return { ok: res.ok, data: resJson };
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    return { ok: false, error: err.message };
  }
};

/**
 * Send WhatsApp Image Message via Meta Cloud API
 */
export const sendWhatsAppImage = async (toPhone, imageUrl, caption = '') => {
  const formattedPhone = toPhone.startsWith('0') ? '213' + toPhone.slice(1) : toPhone;

  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'image',
        image: { link: imageUrl, caption: caption }
      })
    });

    const resJson = await res.json();
    return { ok: res.ok, data: resJson };
  } catch (err) {
    console.error('Error sending WhatsApp image:', err);
    return { ok: false, error: err.message };
  }
};

/**
 * Process Customer Message with AI Agent
 */
  // 1. Natural Algerian Greetings & Small Talk
  const isGreeting = ['slm', 'salam', 'salut', 'bonjour', 'coucou', 'marhaba', 'ahla', 'ahlan', 'kirak', 'kirakom', 'cv', 'ca va', 'labas', 'mlaah', 'dayriin', 'dayriini', 'سلام', 'مرحبا', 'أهلا', 'صباح', 'مساء', 'كيراك', 'كيراكم', 'لاباس', 'مليح', 'صافا'].some(w => text.includes(w));
  
  if (isGreeting && !text.includes('تأكيد') && !text.includes('إلغاء') && !text.includes('صور') && !text.includes('موقع') && !text.includes('سعر') && !text.includes('شحال')) {
    const greetingReply = `وعليكم السلام ورحمة الله وبركاته! يسلمك ويعيشك خونا/أختنا لعزيزة، رانا غاية ولاباس الحمد لله ربي يحفظك 🌸\n\nنتمنى تكون بألف خير وصحة! كاش ما عجبك كاش موديل بيجامة، مقاس، أو حاب تستفسر على التوصيل وتأكيد طلبيتك؟ راني هنا خبير المبيعات في خدمتك خطوة بخطوة 🛍️✨`;
    await sendWhatsAppMessage(customerPhone, greetingReply);
    return greetingReply;
  }

  // 2. Price Inquiries
  if (text.includes('سعر') || text.includes('سومة') || text.includes('شحال') || text.includes('بشحال') || text.includes('prix') || text.includes('combien') || text.includes('chhal')) {
    const { data: prods } = await supabase.from('products').select('title, price').limit(4);
    let priceList = '';
    if (prods && prods.length > 0) {
      priceList = prods.map(p => `• *${p.title}*: ${p.price} دج`).join('\n');
    }
    const priceReply = `أهلاً بك 🌸 أسعار البيجامات متوفرة بأفضل جودة ووفق طلبك:\n\n${priceList || '• أسعارنا تبدأ من 2,800 دج فقط للمجموعات الفاخرة'}\n\nالتوصيل متوفر لجميع الولايات والدفع عند الاستلام بعد المعاينة 📦✨`;
    await sendWhatsAppMessage(customerPhone, priceReply);
    return priceReply;
  }

  // 3. Delivery Inquiries
  if (text.includes('توصيل') || text.includes('شحن') || text.includes('livraison') || text.includes('yalidine') || text.includes('zrexpress') || text.includes('delai') || text.includes('وقتاش توصل')) {
    const deliveryReply = `أهلاً بك 🌸 التوصيل متوفر لجميع 58 ولاية حتى باب المنزل أو للمكتب (Stop Desk) مع شركتي ياليدين و ZR Express 🚚.\n\n⏱️ مدة التوصيل: من 24 إلى 48 ساعة فقط، والدفع عند الاستلام بعد معاينة السلعة.\nما هي الولاية التي ترغب في التوصيل إليها؟ ✨`;
    await sendWhatsAppMessage(customerPhone, deliveryReply);
    return deliveryReply;
  }

  // 4. Order Confirmation Intent
  if (text.includes('تأكيد') || text.includes('نأكد') || text.includes('confirmer') || text.includes('confirm') || text.includes('oui') || text.includes('نعم')) {
    const res = await executeAgentTool('confirmOrder', {}, customerPhone);
    const reply = `${res.message}\n\nشكراً لثقتك بنا في Pyjama DZ! سنقوم بتجهيز طلبيتك وشحنها في أقرب وقت 🌸🚚`;
    await sendWhatsAppMessage(customerPhone, reply);
    return reply;
  }

  // 5. Order Cancellation Intent
  if (text.includes('إلغاء') || text.includes('نلغي') || text.includes('annuler') || text.includes('cancel')) {
    if (text.includes('نعم') || text.includes('أكيد') || text.includes('إلغاء نهائي') || text.includes('أصر')) {
      const res = await executeAgentTool('cancelOrder', {}, customerPhone);
      await sendWhatsAppMessage(customerPhone, res.message);
      return res.message;
    } else {
      const persuadeReply = `أهلاً بك أختي الكريمة 🌸 نتأسف جداً لرغبتك في الإلغاء! قماش البيجامات من أجود أنواع الساتان والقطن الفاخر مع ضمان الاسترجاع واستبدال المقاس مجاناً عند الوصول 🎁.\n\nهل ترغبين في تعديل المقاس أو اللون بدلاً من الإلغاء؟ نحن تحت أمرك!`;
      await sendWhatsAppMessage(customerPhone, persuadeReply);
      return persuadeReply;
    }
  }

  // 6. Location Intent
  if (text.includes('موقع') || text.includes('محل') || text.includes('عنوان') || text.includes('maps') || text.includes('مكان') || text.includes('win jayiin') || text.includes('adresse')) {
    const res = await executeAgentTool('getStoreLocation', {}, customerPhone);
    await sendWhatsAppMessage(customerPhone, res.message);
    return res.message;
  }

  // 7. Photos Intent
  if (text.includes('صور') || text.includes('صورة') || text.includes('موديل') || text.includes('photo') || text.includes('image') || text.includes('model')) {
    const res = await executeAgentTool('getProductPhotos', { query: text }, customerPhone);
    if (res.images && res.images.length > 0) {
      await sendWhatsAppMessage(customerPhone, `أهلاً بك 🌸 تفضلي صور الموديل المطلوب (${res.productTitle}) بسعر ${res.price} دج:`);
      for (const imgUrl of res.images) {
        if (imgUrl && imgUrl.startsWith('http')) {
          await sendWhatsAppImage(customerPhone, imgUrl, res.productTitle);
        }
      }
      return `Sent images for ${res.productTitle}`;
    }
  }

  // 8. Stock Check Intent
  if (text.includes('متوفر') || text.includes('سطوك') || text.includes('stock') || text.includes('مقاس') || text.includes('dispo') || text.includes('kain') || text.includes('kayn')) {
    const res = await executeAgentTool('checkStock', { query: text }, customerPhone);
    const reply = res.available 
      ? `نعم أختي الكريمة 🌸 المنتج (${res.productTitle}) متوفر حالياً في السطوك بسعر ${res.price} دج! يمكنك الطلب فوراً من المتجر.`
      : `للأسف هذا المقاس أو المنتج غير متوفر حالياً في السطوك، يمكنك تسجيل رقمك في قائمة الانتظار بالموقع وسنخبرك فور توفره 📲`;
    await sendWhatsAppMessage(customerPhone, reply);
    return reply;
  }

  // 9. General Friendly Algerian AI Sales Agent Fallback Response
  const generalReply = `أهلاً وسهلاً بك في متجر Pyjama DZ 🌸\n\nأنا خبير المبيعات ومستعد لخدمتك في أي وقت!\n\nيمكنني مساعدتك في:\n1️⃣ تأكيد طلبيتك المباشرة 🛍️\n2️⃣ تعديل المقاس، اللون أو عنوان التوصيل ✏️\n3️⃣ إرسال صور الموديلات والبيجامات الفاخرة 📸\n4️⃣ إرسال موقع محلاتنا على الخريطة 📍\n\nتفضل بطرح استفسارك أو طلبك وأنا تحت أمرك 🌸`;
  await sendWhatsAppMessage(customerPhone, generalReply);
  return generalReply;
};
