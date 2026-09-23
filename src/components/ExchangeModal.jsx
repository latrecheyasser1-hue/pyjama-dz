import React, { useState, useMemo, useRef } from 'react';
import { 
  X, RefreshCw, RotateCcw, Camera, Upload, Check, AlertCircle, ShoppingBag, 
  ChevronRight, ArrowRight, Trash2, ShieldCheck, CheckCircle2, Layers,
  Lock, User, UserCheck, Copy, Truck, Phone
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { INITIAL_PRODUCTS } from '../data/mockData';

export default function ExchangeModal({ 
  isOpen, 
  onClose, 
  products = [], 
  categories = [], 
  currentCustomer = null,
  onOpenAuth,
  onPlaceOrder, 
  showToast,
  initialMode = 'exchange',
  settings = {}
}) {
  if (!isOpen) return null;

  // Account Gatekeeper Check: Only customers with an account can request an exchange / return
  const hasAccount = Boolean(
    currentCustomer && (
      currentCustomer.id || 
      currentCustomer.phone || 
      currentCustomer.email || 
      currentCustomer.full_name
    )
  );

  // Mode: 'exchange' or 'retour'
  const [activeMode, setActiveMode] = useState(initialMode);
  const isRetourMode = activeMode === 'retour';

  // Agreement to return terms checkbox
  const [hasAgreedToReturnTerms, setHasAgreedToReturnTerms] = useState(false);

  // Sync mode when modal opens or initialMode changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode || 'exchange');
      setHasAgreedToReturnTerms(false);
    }
  }, [isOpen, initialMode]);

  // Form States - Prefilled from customer account if logged in
  const [clientName, setClientName] = useState(() => {
    return currentCustomer?.full_name || currentCustomer?.name || (function() {
      try { return localStorage.getItem('customer_name') || ''; } catch(e) { return ''; }
    })();
  });
  const [phone, setPhone] = useState(() => {
    return currentCustomer?.phone || (function() {
      try { return localStorage.getItem('customer_phone') || ''; } catch(e) { return ''; }
    })();
  });

  // Keep synced if customer logs in or profile changes
  React.useEffect(() => {
    if (currentCustomer) {
      if (currentCustomer.full_name && !clientName) {
        setClientName(currentCustomer.full_name);
      }
      if (currentCustomer.phone && !phone) {
        setPhone(currentCustomer.phone);
      }
    }
  }, [currentCustomer]);

  const [trackingCode, setTrackingCode] = useState('');
  const [oldProductBarcode, setOldProductBarcode] = useState('');
  const [oldProductTitle, setOldProductTitle] = useState('');
  const [oldProductPrice, setOldProductPrice] = useState(0);
  const [reason, setReason] = useState('مقاس غير مناسب (طلع صغير)');
  const [customReason, setCustomReason] = useState('');
  
  // Strict Verification State (Gatekeeper)
  const [isOrderVerified, setIsOrderVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  // Mandatory Photo Upload State
  const [productPhoto, setProductPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Exchange Cart & Selection Modal
  const [exchangeCart, setExchangeCart] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState(null);
  const [pickerProduct, setPickerProduct] = useState(null);
  const [pickerColorIdx, setPickerColorIdx] = useState(0);
  const [pickerSize, setPickerSize] = useState('');

  // BaridiMob RIP State
  const [baridiMobRip, setBaridiMobRip] = useState('');

  // Submission & Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [originalOrderFound, setOriginalOrderFound] = useState(null);

  // Available categories for picker
  const availableCategories = useMemo(() => {
    return categories.filter(c => c && !c.id.includes('__') && c.id !== 'solde');
  }, [categories]);

  // Stock Manager Phone Number from Settings
  const stockManagerPhone = useMemo(() => {
    return (
      settings?.whatsappLivraisonManager || 
      settings?.whatsappBoutiqueManager || 
      settings?.whatsapp || 
      (Array.isArray(settings?.phoneOrders) ? settings.phoneOrders[0] : (typeof settings?.phoneOrders === 'string' ? settings.phoneOrders.split(/[-,\/]/)[0]?.trim() : '')) || 
      '0555123456'
    );
  }, [settings]);

  // Courier Company detected from original order
  const detectedCourierName = useMemo(() => {
    const c = String(originalOrderFound?.deliveryCompany || '').toLowerCase();
    if (c.includes('yali')) return 'ياليدين إكسبريس (Yalidine Express)';
    if (c.includes('zr')) return 'زد آر إكسبريس (ZR Express)';
    return originalOrderFound?.deliveryCompany || 'شركة التوصيل الأصلية (Yalidine أو ZR Express)';
  }, [originalOrderFound]);

  // Quick Copy Helper
  const copyToClipboard = (text, label) => {
    try {
      navigator.clipboard.writeText(text);
      if (showToast) showToast(`✅ تم نسخ ${label} بنجاح!`, 'success');
      else alert(`تم نسخ ${label}: ${text}`);
    } catch (e) {
      alert(`الرقم: ${text}`);
    }
  };

  // Handle Photo Upload with Compression
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        setPhotoPreview(compressedBase64);
        setProductPhoto(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Reset verification whenever key order identifiers change
  const handleTrackingChange = (val) => {
    setTrackingCode(val);
    if (isOrderVerified) {
      setIsOrderVerified(false);
      setVerificationError('');
      setOldProductTitle('');
      setOldProductPrice(0);
      setOriginalOrderFound(null);
    }
  };

  const handlePhoneChange = (val) => {
    setPhone(val);
    if (isOrderVerified) {
      setIsOrderVerified(false);
      setVerificationError('');
      setOldProductTitle('');
      setOldProductPrice(0);
      setOriginalOrderFound(null);
    }
  };

  const handleBarcodeChange = (val) => {
    setOldProductBarcode(val);
    if (isOrderVerified) {
      setIsOrderVerified(false);
      setVerificationError('');
      setOldProductTitle('');
      setOldProductPrice(0);
      setOriginalOrderFound(null);
    }
  };

  // Strict Gatekeeper Order Verification Function
  const handleVerifyOrder = async () => {
    setVerificationError('');
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanTracking = (trackingCode || '').trim();
    const cleanBarcode = (oldProductBarcode || '').trim();

    if (!cleanPhone || cleanPhone.length < 9) {
      setVerificationError('يرجى إدخال رقم هاتف صحيح (10 أرقام) للتحقق من طلبيتك.');
      return;
    }
    if (!cleanTracking) {
      setVerificationError('يرجى إدخال كود التتبع (Tracking Code) من رسالة الواتساب أو ملصق الطرد.');
      return;
    }
    if (!cleanBarcode || cleanBarcode.length < 6) {
      setVerificationError('يرجى إدخال كود الباركود للسلعة (12 رقماً من رسالة الواتساب أو الملصق).');
      return;
    }

    setIsVerifying(true);
    try {
      // 1. Query Supabase orders table by trackingNumber, tracking_number, or id
      let query = supabase.from('orders').select('*');
      query = query.or(`trackingNumber.ilike.%${cleanTracking}%,tracking_number.ilike.%${cleanTracking}%,id.eq.${cleanTracking}`);
      
      const { data, error } = await query.order('created_at', { ascending: false }).limit(5);
      
      let foundOrder = data && data.length > 0 ? data[0] : null;

      if (!foundOrder) {
        setVerificationError(`❌ لم يتم العثور على أي طلبية بكود التتبع "${cleanTracking}". يرجى التأكد من كود التتبع المكتوب في رسالة الواتساب أو وصل التوصيل.`);
        setIsOrderVerified(false);
        return;
      }

      // 2. Verify Phone Match (compare last 9 digits)
      const orderPhoneClean = String(foundOrder.phone || '').replace(/\D/g, '');
      const inputPhoneSuffix = cleanPhone.slice(-9);
      const orderPhoneSuffix = orderPhoneClean.slice(-9);

      if (!orderPhoneClean || inputPhoneSuffix !== orderPhoneSuffix) {
        setVerificationError(`❌ رقم الهاتف المدخل (${phone}) لا يتطابق مع رقم هاتف الطلبية المسجلة! يرجى إدخال نفس رقم الهاتف الذي طلبت به.`);
        setIsOrderVerified(false);
        return;
      }

      // Extra security check: Order phone must match the logged-in customer's registered account phone
      const customerPhoneClean = String(currentCustomer?.phone || '').replace(/\D/g, '');
      if (customerPhoneClean && customerPhoneClean.length >= 9) {
        const custPhoneSuffix = customerPhoneClean.slice(-9);
        if (orderPhoneSuffix !== custPhoneSuffix) {
          setVerificationError(`❌ هذه الطلبية مسجلة برقم هاتف مختلف (${foundOrder.phone}) عن رقم حسابك المفعل (${currentCustomer.phone}). الخدمة متاحة حصرياً للطلبيات التابعة لحسابك الشخصي.`);
          setIsOrderVerified(false);
          return;
        }
      }

      // 3. Verify Order Status (must be received / delivered)
      const st = (foundOrder.status || '').toLowerCase();
      if (st === 'nouvelle') {
        setVerificationError('⚠️ هذه الطلبية ما زالت جديدة قيد المعالجة (Nouvelle) ولم يتم شحنها وتوصيلها للزبون بعد! الخدمة متاحة فقط للطلبيات المستلمة.');
        setIsOrderVerified(false);
        return;
      }
      if (st === 'annulee') {
        setVerificationError('❌ هذه الطلبية تم إلغاؤها مسبقاً (Annulée) ولا يمكن تقديم طلب لها.');
        setIsOrderVerified(false);
        return;
      }
      if (st === 'retour') {
        setVerificationError('❌ هذه الطلبية مسجلة كمرتجع مسبقاً (Retour).');
        setIsOrderVerified(false);
        return;
      }

      // 4. Verify Barcode & Extract Product Name and Net Price (بدون مصاريف التوصيل)
      let matchedItem = null;
      let itemsList = foundOrder.items;
      if (typeof itemsList === 'string') {
        try { itemsList = JSON.parse(itemsList); } catch(e) { itemsList = []; }
      }

      if (Array.isArray(itemsList) && itemsList.length > 0) {
        matchedItem = itemsList.find(it => it.barcode && String(it.barcode).trim() === cleanBarcode);
        if (!matchedItem && itemsList.length === 1) {
          const catProd = products.find(p => p.barcode && String(p.barcode).trim() === cleanBarcode);
          if (catProd) matchedItem = { ...itemsList[0], title: catProd.title, price: catProd.price };
        }
      }

      const matchedCatalogProduct = products.find(p => p.barcode && String(p.barcode).trim() === cleanBarcode) ||
        INITIAL_PRODUCTS.find(p => p.barcode && String(p.barcode).trim() === cleanBarcode);

      if (!matchedItem && !matchedCatalogProduct) {
        setVerificationError(`❌ كود الباركود (${cleanBarcode}) غير مطابق لأي سلعة مسجلة في هذا الطلب أو المتجر. يرجى التأكد من كود الباركود (12 رقماً) الموجود على ملصق السلعة أو في رسالة الواتساب.`);
        setIsOrderVerified(false);
        return;
      }

      // Extract title
      const extractedTitle = matchedItem?.title || matchedItem?.product || matchedCatalogProduct?.title || foundOrder.product || 'منتج غير محدد';

      // Extract net price alone (بدون مصاريف التوصيل)
      let netPrice = 0;
      if (matchedItem && matchedItem.price) {
        netPrice = Number(matchedItem.price);
      } else if (matchedCatalogProduct && matchedCatalogProduct.price) {
        netPrice = Number(matchedCatalogProduct.price);
      } else {
        const orderTotal = Number(foundOrder.price) || 0;
        const deliveryCost = Number(foundOrder.deliveryFee) || 0;
        netPrice = Math.max(0, orderTotal - deliveryCost);
      }

      setOldProductTitle(extractedTitle.replace(/\(x\d+\)/g, '').trim());
      setOldProductPrice(netPrice);
      setOriginalOrderFound(foundOrder);
      if (foundOrder.clientName && !clientName) {
        setClientName(foundOrder.clientName.replace(/\[.*\]/g, '').trim());
      }
      setIsOrderVerified(true);
      setVerificationError('');
      if (showToast) showToast('✅ تم فحص وتأكيد بيانات الطلبية والسلعة بنجاح!', 'success');
    } catch (err) {
      console.error('Order verification error:', err);
      setVerificationError('حدث خطأ أثناء الاتصال بقاعدة البيانات للتحقق من الطلب. يرجى المحاولة ثانية.');
      setIsOrderVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  // Format RIP Input (0079 9999 0012 3456 7890)
  const handleRipChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 20);
    setBaridiMobRip(digits);
  };

  const formattedRipDisplay = useMemo(() => {
    return baridiMobRip.replace(/(\d{4})(?=\d)/g, '$1 ');
  }, [baridiMobRip]);

  // Calculations
  const parsedOldPrice = Number(oldProductPrice) || 0;
  const newProductsSubtotal = useMemo(() => {
    return exchangeCart.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0);
  }, [exchangeCart]);

  // Delivery fee from original order wilaya (default to 500 DA if unknown)
  const deliveryFee = useMemo(() => {
    if (originalOrderFound && originalOrderFound.deliveryFee !== undefined) {
      return Number(originalOrderFound.deliveryFee) || 500;
    }
    return 500;
  }, [originalOrderFound]);

  // Price Difference for Exchange
  const priceDifference = newProductsSubtotal > 0 ? (newProductsSubtotal - parsedOldPrice) : 0;
  const isRefundDue = exchangeCart.length > 0 && parsedOldPrice > 0 && priceDifference < 0;
  const refundAmount = isRefundDue ? Math.abs(priceDifference) : 0;
  const totalCodToPay = Math.max(0, priceDifference + deliveryFee);

  // Check Current Stock of Item in Picker
  const pickerCurrentStock = useMemo(() => {
    if (!pickerProduct) return 0;
    const variant = pickerProduct.colorVariants?.[pickerColorIdx] || pickerProduct.colorVariants?.[0];
    if (variant && variant.stock && pickerSize) {
      return Number(variant.stock[pickerSize]) || 0;
    }
    if (pickerProduct.stock !== undefined) {
      return Number(pickerProduct.stock) || 0;
    }
    return 5; // Fallback stock if unmanaged
  }, [pickerProduct, pickerColorIdx, pickerSize]);

  // Add Item to Exchange Cart
  const handleAddToExchangeCart = () => {
    if (!pickerProduct) return;
    if (pickerCurrentStock <= 0) {
      if (showToast) showToast('⚠️ هذا المقاس أو الموديل غير متوفر في المخزن حالياً!', 'warning');
      return;
    }

    const variant = pickerProduct.colorVariants?.[pickerColorIdx] || pickerProduct.colorVariants?.[0];
    const colorName = variant?.color || 'اللون الافتراضي';
    const colorHex = variant?.colorHex || '#CBD5E1';
    const image = variant?.image || pickerProduct.images?.[0] || pickerProduct.image || '';

    const cartItem = {
      id: `${pickerProduct.id}-${colorName}-${pickerSize}`,
      productId: pickerProduct.id,
      title: pickerProduct.title,
      price: Number(pickerProduct.price) || 0,
      barcode: pickerProduct.barcode || '',
      color: colorName,
      colorHex,
      size: pickerSize || 'Standard',
      qty: 1,
      image
    };

    setExchangeCart(prev => {
      const idx = prev.findIndex(it => it.id === cartItem.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].qty += 1;
        return updated;
      }
      return [...prev, cartItem];
    });

    setIsPickerOpen(false);
    setPickerProduct(null);
    if (showToast) showToast(`✅ تم إضافة "${pickerProduct.title}" إلى سلة الاستبدال`, 'success');
  };

  // Submit Request (Handles both Exchange and Return)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOrderVerified) {
      alert('⚠️ يرجى أولاً فحص وتأكيد بيانات الطلبية بالضغط على زر "فحص والتحقق من الطلبية 🔍".');
      return;
    }

    if (!clientName.trim()) {
      alert('يرجى إدخال اسمك الكامل.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 10) {
      alert('يرجى إدخال رقم هاتف صحيح (10 أرقام).');
      return;
    }
    if (!productPhoto) {
      alert(isRetourMode 
        ? '⚠️ إرفاق صورة للمنتج إجباري لمعاينة حالته وقبول طلب الاسترجاع.' 
        : '⚠️ إرفاق صورة للمنتج إجباري لمعاينة حالته وقبول طلب الاستبدال.');
      return;
    }

    // Specific mode validations
    if (isRetourMode) {
      if (baridiMobRip.length !== 20) {
        alert('⚠️ يرجى إدخال رقم حساب بريدي موب (RIP) كاملاً (20 رقماً) لنتمكن من تحويل المبلغ المسترد لحسابكم.');
        return;
      }
      if (!hasAgreedToReturnTerms) {
        alert('⚠️ يرجى قراءة تنبيه وتعليمات إرسال الطرد والتأكيد عليها بالموافقة قبل تأكيد الطلب.');
        return;
      }
    } else {
      if (exchangeCart.length === 0) {
        alert('⚠️ يرجى اختيار منتج واحد على الأقل ترغب في الاستبدال به.');
        return;
      }
      if (isRefundDue && baridiMobRip.length !== 20) {
        alert('⚠️ يرجى إدخال رقم حساب بريدي موب (RIP) كاملاً (20 رقماً) لنتمكن من تحويل فارق السعر لحسابكم.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const effectiveCompany = originalOrderFound?.deliveryCompany || 'zrexpress';
      const effectiveWilaya = originalOrderFound?.wilaya || '02 - Chlef';
      const effectiveCommune = originalOrderFound?.commune || 'Chlef';
      const effectiveDeliveryMode = originalOrderFound?.deliveryMode || 'Livraison Bureau';

      if (isRetourMode) {
        // RETOUR PAYLOAD
        const returnOrderCode = `RET-${Math.floor(10000 + Math.random() * 90000)}`;

        const returnDetailsData = {
          type: 'retour',
          isRetour: true,
          originalOrderCode: trackingCode || originalOrderFound?.id || '',
          originalTracking: originalOrderFound?.trackingNumber || trackingCode || '',
          oldProductTitle: oldProductTitle || '',
          oldProductBarcode: oldProductBarcode || '',
          oldProductPrice: parsedOldPrice,
          refundDue: parsedOldPrice,
          baridiMobRip: baridiMobRip,
          reason: reason === 'أخرى (اكتب السبب أدناه)' ? customReason : reason,
          productPhoto: productPhoto,
          deliveryCompany: effectiveCompany,
          agreedToReturnTerms: true,
          stockManagerPhone: stockManagerPhone
        };

        const returnItemsWithMeta = [
          {
            productId: originalOrderFound?.id || 'old_item',
            product: oldProductTitle,
            title: oldProductTitle,
            barcode: oldProductBarcode,
            price: parsedOldPrice,
            qty: 1,
            isRetour: true,
            isReturnItem: true
          },
          {
            isReturnMeta: true,
            isExchangeMeta: true,
            ...returnDetailsData
          }
        ];

        const returnPayload = {
          id: returnOrderCode,
          clientName: `${clientName.trim()} [طلب استرجاع واسترداد ↩️]`,
          phone: cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone,
          wilaya: effectiveWilaya,
          commune: effectiveCommune,
          deliveryMode: effectiveDeliveryMode,
          deliveryCompany: effectiveCompany,
          product: `↩️ استرجاع: ${oldProductTitle} (المبلغ المسترد: ${parsedOldPrice} دج)`,
          items: returnItemsWithMeta,
          price: 0,
          deliveryFee: 0,
          totalPrice: 0,
          quantity: 1,
          status: 'nouvelle',
          isRetour: true,
          isExchange: false,
          exchangeStatus: 'pending',
          refundDue: parsedOldPrice,
          baridiMobRip: baridiMobRip,
          archived: false,
          exchangeDetails: returnDetailsData,
          date: new Date().toISOString().split('T')[0]
        };

        if (onPlaceOrder) {
          await onPlaceOrder(returnPayload);
        } else {
          await supabase.from('orders').insert([returnPayload]);
        }

        // WhatsApp notify
        fetch('/api/send-order-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            clientName: clientName.trim(),
            id: returnOrderCode,
            wilaya: effectiveWilaya,
            product: `↩️ طلب استرجاع واسترداد: ${oldProductTitle} (المبلغ المسترد عبر بريدي موب: ${parsedOldPrice} دج)`
          })
        }).catch(e => console.warn('Return WhatsApp notify error:', e));

      } else {
        // EXCHANGE PAYLOAD
        const exchangeOrderCode = `ECH-${Math.floor(10000 + Math.random() * 90000)}`;
        const replacementTitles = exchangeCart.map(it => `${it.title} (${it.color} - ${it.size}) x${it.qty}`).join(' + ');

        const exchangeDetailsData = {
          type: 'exchange',
          originalOrderCode: trackingCode || originalOrderFound?.id || '',
          originalTracking: originalOrderFound?.trackingNumber || trackingCode || '',
          oldProductTitle: oldProductTitle || '',
          oldProductBarcode: oldProductBarcode || '',
          oldProductPrice: parsedOldPrice,
          newProductsPrice: newProductsSubtotal,
          priceDifference: priceDifference,
          refundDue: isRefundDue ? refundAmount : 0,
          baridiMobRip: isRefundDue ? baridiMobRip : null,
          reason: reason === 'أخرى (اكتب السبب أدناه)' ? customReason : reason,
          productPhoto: productPhoto
        };

        const exchangeItemsWithMeta = [
          ...exchangeCart.map(it => ({
            productId: it.productId,
            product: it.title,
            title: it.title,
            color: it.color,
            size: it.size,
            price: it.price,
            qty: it.qty,
            image: it.image,
            isExchangeItem: true
          })),
          {
            isExchangeMeta: true,
            ...exchangeDetailsData
          }
        ];

        const exchangePayload = {
          id: exchangeOrderCode,
          clientName: `${clientName.trim()} [طلب استبدال 🔄]`,
          phone: cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone,
          wilaya: effectiveWilaya,
          commune: effectiveCommune,
          deliveryMode: effectiveDeliveryMode,
          deliveryCompany: effectiveCompany,
          product: `🔄 استبدال: ${replacementTitles}`,
          items: exchangeItemsWithMeta,
          price: totalCodToPay,
          deliveryFee: deliveryFee,
          totalPrice: totalCodToPay,
          quantity: exchangeCart.reduce((sum, it) => sum + (it.qty || 1), 0),
          status: 'nouvelle',
          isExchange: true,
          isRetour: false,
          exchangeStatus: 'pending',
          refundDue: isRefundDue ? refundAmount : 0,
          baridiMobRip: isRefundDue ? baridiMobRip : null,
          archived: false,
          exchangeDetails: exchangeDetailsData,
          date: new Date().toISOString().split('T')[0]
        };

        if (onPlaceOrder) {
          await onPlaceOrder(exchangePayload);
        } else {
          await supabase.from('orders').insert([exchangePayload]);
        }

        // WhatsApp notify
        fetch('/api/send-order-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            clientName: clientName.trim(),
            id: exchangeOrderCode,
            wilaya: effectiveWilaya,
            product: `🔄 طلب استبدال: ${replacementTitles} (المبلغ للدفع عند الاستلام: ${totalCodToPay} دج)`
          })
        }).catch(e => console.warn('Exchange WhatsApp notify error:', e));
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting exchange/return order:', err);
      alert('حدث خطأ أثناء تسجيل الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 10010,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        direction: 'rtl'
      }}
      onClick={onClose}
    >
      <div 
        className="animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px 24px',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          boxSizing: 'border-box'
        }}
      >
        {/* Close Button */}
        <button 
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B'
          }}
        >
          <X size={20} />
        </button>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 8px' }}>
              {isRetourMode ? 'تم تسجيل طلب الاسترجاع بنجاح! ↩️✨' : 'تم تسجيل طلب الاستبدال بنجاح! 🔄✨'}
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
              {isRetourMode ? (
                <>
                  تلقينا طلبك بنجاح. يرجى الآن تجهيز الطرد وتسليمه لمكتب شركة التوصيل <strong>({detectedCourierName})</strong> وإرساله إلى رقم مسؤول المخزون: <strong>{stockManagerPhone}</strong> مع تحديد مبلغ التحصيل <strong>0 دج</strong>.
                </>
              ) : (
                <>
                  تلقينا طلبك بنجاح. سنرسل لك رسالة تأكيد عبر الواتساب، وسيقوم الموزع بإيصال القطع الجديدة واستلام القطعة القديمة منك في نفس الوقت.
                </>
              )}
            </p>
            {isRetourMode ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', color: '#15803D', fontWeight: 800, marginBottom: '20px' }}>
                💳 سيتم تحويل المبلغ المسترد ({parsedOldPrice} دج) إلى حساب بريدي موب: {formattedRipDisplay} فور استلام السلعة وفحصها في مخزننا.
              </div>
            ) : (
              isRefundDue && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', color: '#15803D', fontWeight: 800, marginBottom: '20px' }}>
                  💳 سيتم تحويل فارق السعر ({refundAmount} دج) إلى حساب بريدي موب: {formattedRipDisplay} فور استلام السلعة القديمة.
                </div>
              )
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--burgundy)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 28px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              حسناً، شكراً لك ❤️
            </button>
          </div>
        ) : (
          <>
            {/* Mode Switcher Tabs */}
            <div style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: '16px',
              padding: '4px',
              gap: '6px',
              marginBottom: '16px',
              marginTop: '4px'
            }}>
              <button
                type="button"
                onClick={() => setActiveMode('exchange')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: !isRetourMode ? '#FFFFFF' : 'transparent',
                  color: !isRetourMode ? 'var(--burgundy-dark)' : '#64748B',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: !isRetourMode ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={16} />
                <span>طلب استبدال (Échange)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('retour')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isRetourMode ? '#FFFFFF' : 'transparent',
                  color: isRetourMode ? '#B91C1C' : '#64748B',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: isRetourMode ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <RotateCcw size={16} />
                <span>طلب استرجاع (Retour)</span>
              </button>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '16px', 
                background: isRetourMode ? '#FEF2F2' : '#FFF1F2', 
                color: isRetourMode ? '#DC2626' : 'var(--burgundy)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {isRetourMode ? <RotateCcw size={26} /> : <RefreshCw size={26} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  {isRetourMode ? 'طلب استرجاع واسترداد المبلغ (Retour) ↩️' : 'طلب استبدال منتج (Échange) 🔄'}
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                  {isRetourMode 
                    ? 'استرجعي قيمة مشترياتك مباشرة إلى حسابك بريدي موب بكل سهولة وأمان' 
                    : 'بدّل مقاسك أو اختر موديلاً آخر بكل سهولة وأمان'}
                </span>
              </div>
            </div>

            {/* Verified Customer Account Badge */}
            {hasAccount && (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#16A34A" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#166534' }}>
                    حساب الزبون المفعل: {currentCustomer?.full_name || 'زبون مسجل'}
                  </span>
                </div>
                {currentCustomer?.phone && (
                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#15803D', direction: 'ltr' }}>
                    {currentCustomer.phone}
                  </span>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Order / Client Info & Verification Gatekeeper */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>1. معلومات الطلبية القديمة والتحقق 🔍</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>الاسم واللقب *</label>
                    <input 
                      type="text"
                      required
                      placeholder="اسمك الكامل"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>رقم الهاتف *</label>
                    <input 
                      type="tel"
                      required
                      placeholder="05 / 06 / 07..."
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', direction: 'ltr', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Tracking Code Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    كود التتبع (Tracking Code من رسالة الواتساب أو ملصق الطرد) *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: JESEFUBXW9-ZR-02 أو YAL-915370"
                    value={trackingCode}
                    onChange={(e) => handleTrackingChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', direction: 'ltr', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Barcode Input (12 digits) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    كود السلعة (الباركود 12 رقماً من رسالة الواتساب أو ملصق السلعة) *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: 897139447004 أو 100858539887"
                    value={oldProductBarcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', direction: 'ltr', boxSizing: 'border-box' }}
                  />
                </div>

                {/* GATING: Verification Button vs Verified Card + Reason & Photo */}
                {!isOrderVerified ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={handleVerifyOrder}
                      disabled={isVerifying}
                      style={{
                        width: '100%',
                        background: isRetourMode ? '#B91C1C' : 'var(--burgundy)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '14px 20px',
                        fontSize: '0.95rem',
                        fontWeight: 900,
                        cursor: isVerifying ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: isRetourMode ? '0 4px 14px rgba(185, 28, 28, 0.25)' : '0 4px 14px rgba(136, 19, 55, 0.25)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={18} className="spin" />
                          <span>جاري فحص وتأكيد بيانات الطلبية...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          <span>فحص والتحقق من الطلبية 🔍</span>
                        </>
                      )}
                    </button>

                    {verificationError && (
                      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 14px', borderRadius: '12px', fontSize: '0.84rem', lineHeight: 1.5, fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>{verificationError}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {/* Confirmed Order Badge & Retrieved Product Details */}
                    <div style={{ background: '#ECFDF5', border: '1.5px solid #10B981', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 900, fontSize: '0.92rem' }}>
                          <CheckCircle2 size={20} color="#10B981" />
                          <span>تم فحص وتأكيد الطلبية بنجاح ✅</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOrderVerified(false);
                            setOriginalOrderFound(null);
                            setOldProductTitle('');
                            setOldProductPrice(0);
                          }}
                          style={{ background: '#DCFCE7', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, color: '#047857', cursor: 'pointer' }}
                        >
                          إعادة الفحص 🔄
                        </button>
                      </div>
                      
                      <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 12px', border: '1px solid #A7F3D0', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.84rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>
                            {isRetourMode ? 'السلعة المراد استرجاعها:' : 'السلعة المراد استبدالها:'}
                          </span>
                          <strong style={{ color: '#0F172A' }}>{oldProductTitle}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>الباركود (12 رقماً):</span>
                          <strong style={{ color: '#0F172A', direction: 'ltr' }}>{oldProductBarcode}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>سعر السلعة الصافي المدفوع:</span>
                          <strong style={{ color: isRetourMode ? '#B91C1C' : 'var(--burgundy)', fontWeight: 900, fontSize: '0.92rem' }}>
                            {oldProductPrice} دج (سعر المنتج فقط بدون توصيل)
                          </strong>
                        </div>
                        {originalOrderFound && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #E2E8F0', paddingTop: '4px', marginTop: '2px', fontSize: '0.78rem' }}>
                            <span style={{ color: '#64748B' }}>شركة وولاية التوصيل الأصلية:</span>
                            <strong style={{ color: '#047857' }}>
                              {originalOrderFound.wilaya} ({detectedCourierName})
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reason Selection */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        {isRetourMode ? 'سبب طلب الاسترجاع *' : 'سبب طلب الاستبدال *'}
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFFFFF', boxSizing: 'border-box' }}
                      >
                        <option value="مقاس غير مناسب (طلع صغير)">مقاس غير مناسب (طلع صغير)</option>
                        <option value="مقاس غير مناسب (طلع كبير)">مقاس غير مناسب (طلع كبير)</option>
                        {isRetourMode && <option value="لم يعجبني الموديل أو اللون على الواقع">لم يعجبني الموديل أو اللون على الواقع</option>}
                        <option value="عيب تصنيعي أو تمزق في القماش">عيب تصنيعي أو تمزق في القماش</option>
                        <option value="الموديل أو اللون مختلف عن الصورة">الموديل أو اللون مختلف عن الصورة</option>
                        <option value="وصلني منتج بالخطأ">وصلني منتج بالخطأ</option>
                        <option value="أخرى (اكتب السبب أدناه)">أخرى (اكتب السبب بالتفصيل)...</option>
                      </select>
                      {reason === 'أخرى (اكتب السبب أدناه)' && (
                        <textarea 
                          required
                          placeholder={isRetourMode ? "يرجى كتابة سبب الاسترجاع هنا بالتفصيل..." : "يرجى كتابة سبب الاستبدال هنا بالتفصيل..."}
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', marginTop: '8px', minHeight: '60px', boxSizing: 'border-box' }}
                        />
                      )}
                    </div>

                    {/* Mandatory Photo Upload */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                        {isRetourMode ? '📸 صورة المنتج المراد استرجاعه (إجباري) *' : '📸 صورة المنتج المراد استبداله (إجباري) *'}
                      </label>
                      <input 
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        style={{ display: 'none' }}
                      />
                      {photoPreview ? (
                        <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '14px', overflow: 'hidden', border: `2px solid ${isRetourMode ? '#B91C1C' : 'var(--burgundy)'}` }}>
                          <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => { setPhotoPreview(null); setProductPhoto(null); }}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            width: '100%',
                            padding: '16px',
                            border: '2px dashed #94A3B8',
                            borderRadius: '12px',
                            background: '#FFFFFF',
                            color: '#475569',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 700
                          }}
                        >
                          <Camera size={26} color={isRetourMode ? '#B91C1C' : 'var(--burgundy)'} />
                          <span>انقر لالتقاط صورة أو رفعها من هاتفك</span>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>ضرورية لمعاينة حالة المنتج قبل قبول الطلب</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* UNLOCKED ONLY AFTER SUCCESSFUL VERIFICATION */}
              {isOrderVerified && (
                <>
                  {isRetourMode ? (
                    /* ========================================================================= */
                    /* RETOUR MODE: NO REPLACEMENT PICKER, DIRECT RIP + RULES + NOTICE + SUBMIT */
                    /* ========================================================================= */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Step 2: Financial Refund Breakdown & BaridiMob RIP Input */}
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck size={18} color="#059669" />
                          <span>2. تفاصيل الحساب المالي واسترداد المبلغ</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem', color: '#475569', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>سعر السلعة الصافي المسترجع:</span>
                            <strong style={{ color: '#0F172A', fontSize: '0.92rem' }}>{parsedOldPrice} دج</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>مصاريف شحن الإرجاع:</span>
                            <strong style={{ color: '#D97706' }}>يدفعها الزبون مباشرة لشركة التوصيل عند إرسال الطرد</strong>
                          </div>
                          <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', fontWeight: 900, color: '#047857' }}>
                            <span>المبلغ الصافي المسترد لحسابكم (بريدي موب):</span>
                            <span>{parsedOldPrice} دج</span>
                          </div>
                        </div>

                        {/* BaridiMob RIP Input (Mandatory) */}
                        <div style={{ background: '#ECFDF5', border: '1.5px solid #10B981', padding: '14px', borderRadius: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: '#065F46', marginBottom: '6px' }}>
                            <span>رقم حساب بريدي موب (RIP BaridiMob - 20 رقماً) *</span>
                            <span style={{ direction: 'ltr', color: baridiMobRip.length === 20 ? '#059669' : '#DC2626' }}>
                              {baridiMobRip.length} / 20 رقماً
                            </span>
                          </div>
                          <input 
                            type="text"
                            required
                            placeholder="0079 9999 00XX XXXX XXXX"
                            value={formattedRipDisplay}
                            onChange={(e) => handleRipChange(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '10px',
                              border: `2px solid ${baridiMobRip.length === 20 ? '#10B981' : '#F87171'}`,
                              fontSize: '1rem',
                              fontWeight: 800,
                              letterSpacing: '1px',
                              direction: 'ltr',
                              textAlign: 'center',
                              background: '#FFFFFF',
                              boxSizing: 'border-box'
                            }}
                          />
                          <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: '#047857', lineHeight: 1.4 }}>
                            💡 سيتم تحويل هذا المبلغ ({parsedOldPrice} دج) إلى حساب بريدي موب الخاص بكم فور وصول الطرد وفحصه في مخزننا.
                          </p>
                        </div>
                      </div>

                      {/* Step 3: MANDATORY RETURN NOTICE & SHIPPING INSTRUCTIONS */}
                      <div style={{
                        background: '#FFFBEB',
                        border: '2px solid #F59E0B',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: 900, fontSize: '0.95rem' }}>
                          <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
                          <span>⚠️ تنبيه هام جداً: تعليمات إرسال طرد الإرجاع</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem', color: '#78350F', lineHeight: 1.6 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontWeight: 900, color: '#B45309' }}>1.</span>
                            <div>
                              <strong>شركة التوصيل المعتمدة:</strong> يجب إرسال طرد الإرجاع حصرياً عبر نفس شركة التوصيل التي استلمت منها طلبيتك الأصلية وهي: <span style={{ background: '#FEF3C7', padding: '2px 8px', borderRadius: '6px', fontWeight: 900, color: '#92400E' }}>{detectedCourierName}</span>.
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontWeight: 900, color: '#B45309' }}>2.</span>
                            <div>
                              <strong>مصاريف الشحن:</strong> تكلفة شحن الإرجاع تقع على عاتق الزبون، وتُدفع مباشرة لمكتب شركة التوصيل عند تسليم الطرد.
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontWeight: 900, color: '#B45309' }}>3.</span>
                            <div>
                              <strong>مبلغ التحصيل (0 دينار جزائري):</strong> عند تسجيل الطرد لدى شركة التوصيل، <strong>يجب تحديد مبلغ التحصيل (Contre Remboursement / Montant à encaisser) بـ 0 دج (صفر دينار)</strong>. لا تضع أي مبلغ على الطرد لأن مستحقاتك ستصلك كاملة عبر بريدي موب.
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontWeight: 900, color: '#B45309' }}>4.</span>
                            <div style={{ flex: 1 }}>
                              <div><strong>رقم هاتف المستلم (المسؤول عن المخزون):</strong> يجب كتابة رقم هاتف مسؤول المخزون كجهة اتصال للمستلم على ملصق الطرد لكي تتصل به شركة التوصيل فور وصوله:</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                <div style={{ background: '#FFFFFF', border: '1.5px solid #FCD34D', borderRadius: '8px', padding: '6px 12px', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', color: '#92400E', direction: 'ltr' }}>
                                  {stockManagerPhone}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(stockManagerPhone, 'رقم هاتف مسؤول المخزون')}
                                  style={{
                                    background: '#D97706',
                                    color: '#FFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Copy size={13} />
                                  <span>نسخ الرقم</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mandatory Confirmation Checkbox */}
                        <div style={{
                          marginTop: '6px',
                          background: '#FFFFFF',
                          border: `2px solid ${hasAgreedToReturnTerms ? '#16A34A' : '#F59E0B'}`,
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setHasAgreedToReturnTerms(!hasAgreedToReturnTerms)}
                        >
                          <input
                            type="checkbox"
                            id="agree-return-terms"
                            checked={hasAgreedToReturnTerms}
                            onChange={(e) => setHasAgreedToReturnTerms(e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '20px',
                              height: '20px',
                              accentColor: '#16A34A',
                              marginTop: '2px',
                              cursor: 'pointer'
                            }}
                          />
                          <label 
                            htmlFor="agree-return-terms"
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              color: hasAgreedToReturnTerms ? '#166534' : '#92400E',
                              cursor: 'pointer',
                              lineHeight: 1.5
                            }}
                          >
                            أقر وأؤكد بأنني قرأت وفهمت كافة التعليمات والشروط أعلاه، وألتزم بإرسال الطرد مع شركة ({detectedCourierName}) بمبلغ تحصيل (0 دج) وعلى نفقتي الخاصة.
                          </label>
                        </div>
                      </div>

                      {/* Submit Button for Retour */}
                      <button
                        type="submit"
                        disabled={isSubmitting || !hasAgreedToReturnTerms || baridiMobRip.length !== 20}
                        style={{
                          background: (!hasAgreedToReturnTerms || baridiMobRip.length !== 20) ? '#CBD5E1' : '#B91C1C',
                          color: 'white',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '16px',
                          fontSize: '1rem',
                          fontWeight: 900,
                          cursor: (!hasAgreedToReturnTerms || baridiMobRip.length !== 20) ? 'not-allowed' : (isSubmitting ? 'wait' : 'pointer'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: (!hasAgreedToReturnTerms || baridiMobRip.length !== 20) ? 'none' : '0 10px 20px -5px rgba(185, 28, 28, 0.4)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSubmitting ? 'جاري تسجيل الطلب...' : 'تأكيد طلب الاسترجاع واسترداد المبلغ ↩️'}
                      </button>

                      {(!hasAgreedToReturnTerms || baridiMobRip.length !== 20) && (
                        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, marginTop: '-6px' }}>
                          ⚠️ يجب التأشير على مربع قراءة التعليمات وإدخال رقم بريدي موب كاملاً (20 رقماً) لتأكيد الطلب.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ========================================================================= */
                    /* EXCHANGE MODE: REPLACEMENT PICKER + DIFFERENCE CALCULATION + SUBMIT      */
                    /* ========================================================================= */
                    <>
                      {/* Step 2: Selection of Replacement Items */}
                      <div style={{ background: '#FFF1F2', padding: '16px', borderRadius: '16px', border: '1px solid #FECDD3' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--burgundy-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShoppingBag size={18} />
                            <span>2. السلع البديلة الجديدة المختارة</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPickerOpen(true)}
                            style={{
                              background: 'var(--burgundy)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '8px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>+ اختيار منتجات</span>
                          </button>
                        </div>

                        {exchangeCart.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '18px 10px', color: '#881337', fontSize: '0.85rem' }}>
                            لم تختر أي سلعة بديلة بعد. اضغط على <strong>+ اختيار منتجات</strong> لتصفح المتجر واختيار القطع التي تناسبك!
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {exchangeCart.map((item, idx) => (
                              <div key={item.id || idx} style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '12px', border: '1px solid #FFE4E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {item.image && (
                                    <img src={item.image} alt={item.title} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                  )}
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>اللون: {item.color} | المقاس: {item.size}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--burgundy)' }}>{item.price} دج</span>
                                  <button
                                    type="button"
                                    onClick={() => setExchangeCart(prev => prev.filter(it => it.id !== item.id))}
                                    style={{ background: '#FEE2E2', border: 'none', borderRadius: '8px', padding: '6px', color: '#DC2626', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Step 3: Calculation & Conditional RIP */}
                      {exchangeCart.length > 0 && parsedOldPrice > 0 && (
                        <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '10px' }}>
                            3. تفاصيل الحساب المالي
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: '#475569' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>سعر السلعة القديمة:</span>
                              <strong>{parsedOldPrice} دج</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>مجموع السلع الجديدة:</span>
                              <strong>{newProductsSubtotal} دج</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>فارق السعر:</span>
                              <strong style={{ color: priceDifference >= 0 ? '#059669' : '#DC2626' }}>
                                {priceDifference > 0 ? `+${priceDifference}` : priceDifference} دج
                              </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>مصاريف التوصيل (على الزبون):</span>
                              <strong>+{deliveryFee} دج</strong>
                            </div>
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 900, color: 'var(--burgundy-dark)' }}>
                              <span>المبلغ للدفع للموزع عند الاستلام:</span>
                              <span>{totalCodToPay} دج</span>
                            </div>
                          </div>

                          {/* If store owes money to client (Refund Due) */}
                          {isRefundDue && (
                            <div style={{ marginTop: '14px', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '14px', borderRadius: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065F46', fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px' }}>
                                <ShieldCheck size={18} />
                                <span>لديك مبلغ مسترد في ذمتنا قدره: {refundAmount} دج</span>
                              </div>
                              <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#047857', lineHeight: 1.4 }}>
                                المنتج الجديد أرخص من القديم! يرجى إدخال رقم حساب بريدي موب (RIP) ليتم تحويل هذا المبلغ لحسابكم فور استلام القطعة القديمة.
                              </p>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, color: '#065F46', marginBottom: '4px' }}>
                                  <span>رقم حساب بريدي موب (RIP BaridiMob) *</span>
                                  <span style={{ direction: 'ltr', color: baridiMobRip.length === 20 ? '#059669' : '#DC2626' }}>
                                    {baridiMobRip.length} / 20 رقماً
                                  </span>
                                </div>
                                <input 
                                  type="text"
                                  required
                                  placeholder="0079 9999 00XX XXXX XXXX"
                                  value={formattedRipDisplay}
                                  onChange={(e) => handleRipChange(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: `2px solid ${baridiMobRip.length === 20 ? '#10B981' : '#F87171'}`,
                                    fontSize: '1rem',
                                    fontWeight: 800,
                                    letterSpacing: '1px',
                                    direction: 'ltr',
                                    textAlign: 'center',
                                    background: '#FFFFFF',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Submit Button for Exchange */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                          background: 'var(--burgundy)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '16px',
                          fontSize: '1rem',
                          fontWeight: 900,
                          cursor: isSubmitting ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 10px 20px -5px rgba(136, 19, 55, 0.4)',
                          transition: 'opacity 0.2s'
                        }}
                      >
                        {isSubmitting ? 'جاري تسجيل الطلب...' : 'تأكيد طلب الاستبدال 🔄'}
                      </button>
                    </>
                  )}
                </>
              )}
            </form>
          </>
        )}
      </div>

      {/* NESTED MODAL: Category & Product Selection ("CARTE FI WASTT CHACHA") */}
      {isPickerOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10020,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            direction: 'rtl'
          }}
          onClick={() => { setIsPickerOpen(false); setPickerProduct(null); }}
        >
          <div 
            className="animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '22px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px 20px',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              boxSizing: 'border-box'
            }}
          >
            <button 
              type="button"
              onClick={() => { setIsPickerOpen(false); setPickerProduct(null); }}
              style={{ position: 'absolute', top: '16px', left: '16px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={18} />
            </button>

            {!pickerProduct ? (
              <>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 14px' }}>
                  اختاري السلعة البديلة 🛍️
                </h4>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setPickerCategory(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      background: pickerCategory === null ? 'var(--burgundy)' : '#F1F5F9',
                      color: pickerCategory === null ? 'white' : '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    الكل
                  </button>
                  {availableCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPickerCategory(cat.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        background: pickerCategory === cat.id ? 'var(--burgundy)' : '#F1F5F9',
                        color: pickerCategory === cat.id ? 'white' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                  {products
                    .filter(p => p && !p.category?.includes('__') && (!pickerCategory || p.category === pickerCategory))
                    .map(p => {
                      const img = p.images?.[0] || p.image || '';
                      return (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setPickerProduct(p);
                            setPickerColorIdx(0);
                            const firstVariant = p.colorVariants?.[0];
                            const availableSizes = firstVariant?.stock ? Object.keys(firstVariant.stock) : (p.sizes || []);
                            setPickerSize(availableSizes[0] || 'Standard');
                          }}
                          style={{
                            background: '#F8FAFC',
                            borderRadius: '14px',
                            border: '1px solid #E2E8F0',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'transform 0.15s, border-color 0.15s',
                            textAlign: 'center'
                          }}
                        >
                          <img src={img} alt={p.title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                          <div style={{ padding: '8px 6px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--burgundy)', marginTop: '2px' }}>
                              {p.price} دج
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              /* Product Detail & Variant Selection inside Picker */
              <div>
                <button
                  type="button"
                  onClick={() => setPickerProduct(null)}
                  style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--burgundy)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', marginBottom: '12px' }}
                >
                  <ArrowRight size={16} /> العودة لقائمة المنتجات
                </button>

                <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                  <img 
                    src={pickerProduct.colorVariants?.[pickerColorIdx]?.image || pickerProduct.images?.[0] || pickerProduct.image || ''} 
                    alt={pickerProduct.title} 
                    style={{ width: '80px', height: '100px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #CBD5E1' }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900, color: '#1E293B' }}>{pickerProduct.title}</h4>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--burgundy)' }}>{pickerProduct.price} دج</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>كود: {pickerProduct.barcode || 'N/A'}</div>
                  </div>
                </div>

                {/* Color Variants */}
                {pickerProduct.colorVariants && pickerProduct.colorVariants.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>اختاري اللون:</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {pickerProduct.colorVariants.map((v, vIdx) => (
                        <button
                          key={vIdx}
                          type="button"
                          onClick={() => {
                            setPickerColorIdx(vIdx);
                            const availableSizes = v.stock ? Object.keys(v.stock) : (pickerProduct.sizes || []);
                            if (!availableSizes.includes(pickerSize)) {
                              setPickerSize(availableSizes[0] || 'Standard');
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: pickerColorIdx === vIdx ? '2px solid var(--burgundy)' : '1px solid #CBD5E1',
                            background: pickerColorIdx === vIdx ? '#FFF1F2' : '#FFFFFF',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.colorHex || '#CBD5E1', border: '1px solid #94A3B8' }} />
                          <span>{v.color || `لون ${vIdx + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {(() => {
                  const currentVariant = pickerProduct.colorVariants?.[pickerColorIdx] || pickerProduct.colorVariants?.[0];
                  const sizesList = currentVariant?.stock ? Object.keys(currentVariant.stock) : (pickerProduct.sizes || ['Standard']);
                  return (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>اختاري المقاس:</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {sizesList.map(sz => {
                          const stockCount = currentVariant?.stock ? (Number(currentVariant.stock[sz]) || 0) : 5;
                          const isOutOfStock = stockCount <= 0;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setPickerSize(sz)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                border: pickerSize === sz ? '2px solid var(--burgundy)' : '1px solid #CBD5E1',
                                background: isOutOfStock ? '#F1F5F9' : (pickerSize === sz ? '#FFF1F2' : '#FFFFFF'),
                                color: isOutOfStock ? '#94A3B8' : (pickerSize === sz ? 'var(--burgundy)' : '#1E293B'),
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                position: 'relative'
                              }}
                            >
                              <span>{sz}</span>
                              {isOutOfStock && (
                                <span style={{ display: 'block', fontSize: '0.65rem', color: '#EF4444' }}>نافذ</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* STRICT STOCK CHECK MESSAGE & ACTION */}
                {pickerCurrentStock <= 0 ? (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 800, marginBottom: '14px' }}>
                    ⚠️ عذراً، هذا المقاس أو الموديل غير متوفر في المخزن حالياً. يرجى اختيار مقاس أو لون آخر.
                  </div>
                ) : (
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '14px' }}>
                    ✓ متوفر في المخزن ({pickerCurrentStock} قطعة جاهزة للشحن)
                  </div>
                )}

                <button
                  type="button"
                  disabled={pickerCurrentStock <= 0}
                  onClick={handleAddToExchangeCart}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: pickerCurrentStock <= 0 ? '#CBD5E1' : 'var(--burgundy)',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 900,
                    cursor: pickerCurrentStock <= 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {pickerCurrentStock <= 0 ? 'غير متوفر للاستبدال' : 'إضافة إلى سلة الاستبدال 🛍️'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
