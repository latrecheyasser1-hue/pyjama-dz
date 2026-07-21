import React, { useState, useMemo } from 'react';
import { ALGERIA_WILAYAS } from '../data/mockData';
import { showToast } from '../utils/toast';
import { ShoppingBag, ArrowRight, MapPin, Trash2, Check, Search, Phone, ShoppingCart } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function GrosStorefront({ products, settings, onPlaceOrder, onGoToRetail }) {
  const categoriesList = settings?.categories || [];
  const selectableCategories = categoriesList.filter(c => c.id !== 'all' && c.id !== 'promo');

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutWhatsapp, setCheckoutWhatsapp] = useState('');
  const [checkoutWilaya, setCheckoutWilaya] = useState('');
  const [checkoutCommune, setCheckoutCommune] = useState('');
  const [checkoutDeliveryMode, setCheckoutDeliveryMode] = useState('Livraison Domicile (توصيل للمنزل)');
  const [checkoutDeliveryCompany, setCheckoutDeliveryCompany] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Per-product inputs state: { [productId]: { qty: number, selectedColors: { [color]: boolean } } }
  const [productConfigs, setProductConfigs] = useState({});

  // Filter products to show only Gros products
  const grosProducts = useMemo(() => {
    return (products || []).filter(p => {
      if (!p.category || !p.category.startsWith('gros__')) return false;
      if (!p.price || Number(p.price) <= 0) return false;
      
      const cleanCat = p.category.replace('gros__', '');
      
      // Category filter
      if (selectedCategory !== 'all' && cleanCat !== selectedCategory) return false;

      // Search filter (startsWith title or barcode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = p.title && p.title.toLowerCase().startsWith(q);
        const barcodeMatch = p.barcode && String(p.barcode).startsWith(q);
        return titleMatch || barcodeMatch;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Helper to parse min quantities from description
  const parseMinQty = (descriptionText) => {
    const descParts = (descriptionText || '').split('|||');
    let minQtyGros = 1;
    let minQtySuperGros = 5;
    let serieConfig = null;
    try {
      const meta = descParts[1] ? JSON.parse(descParts[1]) : {};
      if (meta.serieConfig) {
        serieConfig = meta.serieConfig;
        minQtyGros = (meta.minQtyGros === 12 || meta.minQtyGros === undefined) ? 1 : Number(meta.minQtyGros);
        minQtySuperGros = (meta.minQtySuperGros === 60 || meta.minQtySuperGros === undefined) ? 5 : Number(meta.minQtySuperGros);
      } else {
        if (meta.minQtyGros !== undefined) minQtyGros = Number(meta.minQtyGros);
        if (meta.minQtySuperGros !== undefined) minQtySuperGros = Number(meta.minQtySuperGros);
      }
    } catch(e) {}
    return { mainDesc: descParts[0] || '', minQtyGros, minQtySuperGros, serieConfig };
  };

  // Handle configuration changes
  const handleQtyChange = (productId, value, minQtyGros) => {
    const val = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setProductConfigs(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { selectedColors: {} }),
        qty: val
      }
    }));
  };

  const handleToggleColor = (productId, colorName) => {
    setProductConfigs(prev => {
      const current = prev[productId] || { qty: 0, selectedColors: {} };
      const nextColors = { ...current.selectedColors };
      if (nextColors[colorName] !== undefined) {
        delete nextColors[colorName];
      } else {
        nextColors[colorName] = 1;
      }
      return {
        ...prev,
        [productId]: {
          ...current,
          selectedColors: nextColors
        }
      };
    });
  };

  const handleColorQtyChange = (productId, colorName, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    setProductConfigs(prev => {
      const current = prev[productId] || { qty: 0, selectedColors: {} };
      if (current.selectedColors[colorName] === undefined) return prev;
      return {
        ...prev,
        [productId]: {
          ...current,
          selectedColors: { ...current.selectedColors, [colorName]: num }
        }
      };
    });
  };

  const handleAddToCart = (product) => {
    const config = productConfigs[product.id];
    const { minQtyGros, minQtySuperGros, serieConfig } = parseMinQty(product.description);
    
    const qty = config ? parseInt(config.qty) || 0 : 0;
    const selectedColors = config ? Object.keys(config.selectedColors) : [];

    if (qty < minQtyGros) {
      showToast(`⚠️ الحد الأدنى للطلب هو ${minQtyGros} ${serieConfig ? 'سيري (Série)' : 'قطعة'} لهذا المنتج.`, 'warning');
      return;
    }

    if (selectedColors.length === 0) {
      showToast(`🎨 يرجى اختيار لون واحد على الأقل.`, 'warning');
      return;
    }

    // Determine price based on super gros threshold
    const activePrice = qty >= minQtySuperGros ? Number(product.oldPrice || product.price) : Number(product.price);

    let newItems = [];
    if (selectedColors.length === 1) {
      newItems = [{
        id: `CART-${product.id}-${selectedColors[0]}-${Date.now()}-0`,
        productId: product.id,
        product: product.title,
        image: (product.images && product.images[0]) || product.image || '',
        color: selectedColors[0],
        size: 'Série', // standard wholesale sizing
        qty: qty, // takes all
        price: activePrice,
        total: activePrice * qty
      }];
    } else {
      let sumColorQty = 0;
      selectedColors.forEach(c => { sumColorQty += (Number(config.selectedColors[c]) || 0); });
      
      if (sumColorQty > qty) {
        showToast(`⚠️ مجموع الكميات للألوان (${sumColorQty}) يتجاوز الكمية الإجمالية المطلوبة (${qty}).`, 'warning');
        return;
      }
      
      newItems = selectedColors.map((color, idx) => {
        const itemQty = Number(config.selectedColors[color]) || 0;
        if (itemQty === 0) return null;
        return {
          id: `CART-${product.id}-${color}-${Date.now()}-${idx}`,
          productId: product.id,
          product: product.title,
          image: (product.images && product.images[0]) || product.image || '',
          color: color,
          size: 'Série',
          qty: itemQty,
          price: activePrice,
          total: activePrice * itemQty
        };
      }).filter(Boolean);

      if (newItems.length === 0) {
        showToast(`⚠️ يرجى إدخال كمية لـ لون واحد على الأقل.`, 'warning');
        return;
      }
    }

    setCartItems(prev => {
      // Remove any existing items of the same product & color to avoid duplicates, then add new ones
      const filtered = prev.filter(item => !(item.productId === product.id && selectedColors.includes(item.color)));
      return [...filtered, ...newItems];
    });

    // Reset this product config in UI
    setProductConfigs(prev => ({
      ...prev,
      [product.id]: { qty: minQtyGros, selectedColors: {} }
    }));

    showToast(`🛒 تمت إضافة ${qty} ${serieConfig ? 'سيري' : 'قطعة'} إلى سلة الجملة بنجاح!`, 'success');
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(prev => prev.filter(it => it.id !== itemId));
  };

  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + (it.total || 0), 0);
  }, [cartItems]);

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast("⚠️ سلة التسوق فارغة!", 'warning');
      return;
    }
    if (!checkoutName.trim() || !checkoutPhone.trim() || !checkoutWilaya) {
      showToast("⚠️ يرجى ملء الحقول الأساسية: الاسم، الهاتف، والولاية.", 'warning');
      return;
    }
    if (checkoutDeliveryMode.includes('Livraison') && !checkoutDeliveryCompany) {
      showToast("⚠️ الرجاء إختيار شركة التوصيل.", 'warning');
      return;
    }

    const productNames = cartItems.map(it => `${it.product} (جملة - ${it.color} x${it.qty})`).join(' + ');

    const newOrder = {
      clientName: checkoutName.trim() + (checkoutWhatsapp ? ` (واتساب: ${checkoutWhatsapp})` : ''),
      phone: checkoutPhone.trim(),
      wilaya: checkoutWilaya,
      commune: checkoutCommune.trim() || 'غير محددة',
      deliveryMode: checkoutDeliveryMode,
      deliveryCompany: checkoutDeliveryMode.includes('Livraison') ? checkoutDeliveryCompany : '',
      product: productNames,
      items: cartItems.map(it => ({
        qty: it.qty,
        size: it.size,
        color: it.color,
        price: it.price,
        product: it.product,
        productId: it.productId
      })),
      price: cartTotal,
      status: 'nouvelle',
      archived: false
    };

    onPlaceOrder(newOrder);
    setOrderSuccess(true);
    setCartItems([]);
    setCheckoutName('');
    setCheckoutPhone('');
    setCheckoutWhatsapp('');
    setCheckoutCommune('');
    setCheckoutDeliveryCompany('');
  };

  return (
    <div className="gros-storefront" style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <Helmet>
        <title>فضاء تجار الجملة - Pyjama DZ</title>
        <meta name="description" content="منصة الجملة لمتجر Pyjama DZ. أسعار خاصة للتجار، جودة عالية، وتوصيل لجميع الولايات. سجل الآن للوصول إلى أسعار الجملة." />
      </Helmet>

      {/* Vanilla CSS styling */}
      <style>{`
        .gros-storefront * {
          box-sizing: border-box;
        }
        .gros-header {
          background: white;
          padding: 24px;
          border-radius: 20px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .gros-title {
          font-size: 1.6rem;
          font-weight: 900;
          color: #800020; /* Burgundy */
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .btn-switch {
          padding: 10px 18px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          color: #475569;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-switch:hover {
          background: #E2E8F0;
        }
        .gros-search-container {
          position: relative;
          max-width: 500px;
          width: 100%;
          margin: 0 auto 20px auto;
        }
        .gros-search-input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          border: 2px solid #E2E8F0;
          border-radius: 14px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .gros-search-input:focus {
          border-color: #800020;
        }
        .gros-categories {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 24px;
          scrollbar-width: none;
        }
        .gros-cat-btn {
          padding: 10px 20px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 0.88rem;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          background: white;
          color: #64748B;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .gros-cat-btn.active {
          background: #800020;
          color: white;
        }
        .gros-main-layout {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 24px;
        }
        @media (max-width: 968px) {
          .gros-main-layout {
            grid-template-columns: 1fr;
          }
        }
        .gros-product-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          display: flex;
          gap: 20px;
          margin-bottom: 16px;
          border: 1px solid #F1F5F9;
        }
        @media (max-width: 580px) {
          .gros-product-card {
            flex-direction: column;
          }
        }
        .gros-product-img {
          width: 140px;
          height: 170px;
          object-fit: cover;
          border-radius: 14px;
          background: #F8FAFC;
          flex-shrink: 0;
          border: 1px solid #E2E8F0;
        }
        @media (max-width: 580px) {
          .gros-product-img {
            width: 100%;
            height: 220px;
          }
        }
        .gros-product-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }
        .qty-badge {
          background: #FFF7ED;
          color: #C2410C;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .color-dot-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          outline: 1px solid #CBD5E1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          position: relative;
        }
        .color-dot-btn.active {
          outline: 2px solid #800020;
          transform: scale(1.1);
        }
        .cart-sidebar {
          background: white;
          padding: 24px;
          border-radius: 20px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          position: sticky;
          top: 24px;
          height: fit-content;
        }
        .form-input-gros {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          outline: none;
          font-size: 0.9rem;
        }
        .form-input-gros:focus {
          border-color: #800020;
          box-shadow: 0 0 0 3px rgba(128,0,32,0.1);
        }
      `}</style>

      {/* Header */}
      <div className="gros-header">
        <h1 className="gros-title">
          <span>📦</span> طلبات الجملة السريعة (Wholesale Gros Portal)
        </h1>
        <button onClick={onGoToRetail} className="btn-switch">
          <ArrowRight size={18} />
          <span>🛒 العودة لمتجر التجزئة (Détail)</span>
        </button>
      </div>

      {orderSuccess ? (
        <div style={{ maxWidth: '600px', margin: '40px auto', background: 'white', padding: '40px 24px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#DEF7EC', color: '#03543F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <Check size={40} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#03543F', marginBottom: '8px' }}>تم إرسال طلب الجملة بنجاح!</h2>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '24px' }}>
            شكراً لتعاملكم معنا. تم استلاف طلبكم الخاص بالجملة، وسيقوم فريقنا بمراجعة الكميات وتأكيدها معكم عبر الواتساب أو الهاتف في أقرب وقت.
          </p>
          <button onClick={() => setOrderSuccess(false)} className="btn btn-primary" style={{ padding: '12px 30px', borderRadius: '12px', fontSize: '0.95rem' }}>
            طلب منتجات إضافية (Nouveau Achat)
          </button>
        </div>
      ) : (
        <div className="gros-main-layout">
          
          {/* Left Side: Products List */}
          <div>
            {/* Search */}
            <div className="gros-search-container">
              <Search size={18} color="#64748B" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="🔍 ابحث عن موديل أو كودبار للجملة..." 
                className="gros-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="gros-categories">
              <button 
                onClick={() => setSelectedCategory('all')} 
                className={`gros-cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              >
                📦 الكل (Tous)
              </button>
              {selectableCategories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.id)} 
                  className={`gros-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                >
                  {cat.icon || '✨'} {cat.title}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div>
              {grosProducts.length === 0 ? (
                <div style={{ background: 'white', padding: '60px 20px', borderRadius: '20px', textAlign: 'center', color: '#64748B', border: '1px dashed #CBD5E1' }}>
                  لا توجد أي موديلات جملة مطابقة لبحثك حالياً.
                </div>
              ) : (
                grosProducts.map(p => {
                  const { mainDesc, minQtyGros, minQtySuperGros, serieConfig } = parseMinQty(p.description);
                  const config = productConfigs[p.id] || { qty: minQtyGros, selectedColors: {} };
                  const inputQty = config.qty === '' ? '' : Number(config.qty);

                  const activePrice = (inputQty !== '' && inputQty >= minQtySuperGros) ? Number(p.oldPrice || p.price) : Number(p.price);

                  // Wholesale items don't track stock per color since they are manufactured on demand
                  const availableColors = p.colorVariants || [];

                  const selectedColorList = Object.keys(config.selectedColors);
                  const isQtyValid = inputQty !== '' && inputQty >= minQtyGros;

                  return (
                    <div key={p.id} className="gros-product-card">
                      <img src={(p.images && p.images[0]) || p.image || ''} alt={p.title} className="gros-product-img" />
                      
                      <div className="gros-product-details">
                        {/* Title & Limits */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 900, color: '#1E293B' }}>{p.title}</h3>
                            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>📦 الباركود: <strong>{p.barcode}</strong></span>
                          </div>
                          
                          {serieConfig && (
                            <div style={{ background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#334155', marginBottom: '8px' }}>
                              <strong>تفاصيل السيري:</strong> {Object.entries(serieConfig).map(([size, q]) => `${size} (${q})`).join(' - ')}
                              <span style={{ display: 'block', marginTop: '4px', color: '#800020', fontWeight: 700 }}>
                                إجمالي القطع في السيري: {Object.values(serieConfig).reduce((a, b) => a + Number(b), 0)} قطعة
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span className="qty-badge">حد الجملة: {minQtyGros} {serieConfig ? 'سيري' : 'قطعة'}</span>
                            <span className="qty-badge" style={{ background: '#EEF2FF', color: '#4338CA' }}>حد الجملة الكبيرة: {minQtySuperGros} {serieConfig ? 'سيري' : 'قطعة'}</span>
                          </div>
                        </div>

                        {/* Prices Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#F8FAFC', padding: '10px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ textAlign: 'center', opacity: (inputQty === '' || inputQty < minQtySuperGros) ? 1 : 0.4 }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>سعر الجملة (Gros)</span>
                            <strong style={{ fontSize: '0.98rem', color: '#800020' }}>{p.price?.toLocaleString()} DA</strong>
                          </div>
                          <div style={{ textAlign: 'center', opacity: (inputQty !== '' && inputQty >= minQtySuperGros) ? 1 : 0.4 }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>سعر الجملة الكبيرة (Super)</span>
                            <strong style={{ fontSize: '0.98rem', color: '#4F46E5' }}>{(p.oldPrice || p.price)?.toLocaleString()} DA</strong>
                          </div>
                        </div>

                        {/* Order Quantity Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>الكمية المطلوبة ({serieConfig ? 'بعدد السيري' : 'إجمالي القطع'}):</label>
                            <input 
                              type="number" 
                              min={minQtyGros}
                              value={config.qty}
                              onChange={(e) => handleQtyChange(p.id, e.target.value, minQtyGros)}
                              style={{ width: '100px', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 800, textAlign: 'center' }}
                            />
                          </div>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', color: isQtyValid ? '#15803D' : '#C2410C', fontWeight: 700 }}>
                              {isQtyValid ? `✅ سعر ${serieConfig ? 'السيري' : 'القطعة'}: ${activePrice.toLocaleString()} DA` : `⚠️ الحد الأدنى للطلب ${minQtyGros} ${serieConfig ? 'سيري' : 'قطعة'}`}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                              المجموع الفرعي: <strong>{isQtyValid ? `${(activePrice * inputQty).toLocaleString()} DA` : '0 DA'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Colors List (Appears if quantity is set) */}
                        {availableColors.length > 0 && (
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>🎨 اختر الألوان المتوفرة في المخزن:</span>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                              {availableColors.map(cv => {
                                const isActive = config.selectedColors[cv.color] !== undefined;
                                return (
                                  <div key={cv.color} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleColor(p.id, cv.color)}
                                      className={`color-dot-btn ${isActive ? 'active' : ''}`}
                                      style={{ backgroundColor: cv.colorHex || '#CBD5E1' }}
                                      title={cv.color}
                                    >
                                      {isActive && <Check size={14} color={cv.color === 'White' || cv.colorHex === '#FFFFFF' ? '#000' : '#FFF'} />}
                                    </button>
                                    {isActive && selectedColorList.length > 1 && (
                                      <input 
                                        type="number"
                                        min="1"
                                        value={config.selectedColors[cv.color]}
                                        onChange={(e) => handleColorQtyChange(p.id, cv.color, e.target.value)}
                                        style={{ width: '45px', padding: '2px', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add Button */}
                        <button
                          type="button"
                          onClick={() => handleAddToCart(p)}
                          disabled={!isQtyValid || selectedColorList.length === 0}
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '0.88rem',
                            borderRadius: '10px',
                            background: (!isQtyValid || selectedColorList.length === 0) ? '#CBD5E1' : '#800020',
                            border: 'none',
                            fontWeight: 800
                          }}
                        >
                          🛒 إضافة الموديل للسلة (Ajouter au Panier)
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side: Cart Summary & Checkout Form */}
          <div>
            <div className="cart-sidebar">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#800020', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', borderBottom: '2px solid #F1F5F9', paddingBottom: '10px' }}>
                <ShoppingCart size={20} />
                <span>سلة طلبيات الجملة ({cartItems.length})</span>
              </h2>

              {cartItems.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                  السلة فارغة حالياً. قم بإضافة الموديلات والكميات المطلوبة من اليسار.
                </div>
              ) : (
                <>
                  {/* Cart Items list */}
                  <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {cartItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: '10px', background: '#F8FAFC', padding: '8px', borderRadius: '10px', border: '1px solid #E2E8F0', alignItems: 'center' }}>
                        <img src={item.image} alt="" style={{ width: '40px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product}</h4>
                          <span style={{ fontSize: '0.78rem', color: '#475569', display: 'block' }}>
                            اللون: <strong>{item.color}</strong> | الكمية: <strong>{item.qty}</strong>
                          </span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#800020', display: 'block' }}>{item.total.toLocaleString()} DA</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFromCart(item.id)} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#EF4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF7ED', padding: '12px', borderRadius: '12px', border: '1px solid #FED7AA', marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#C2410C' }}>إجمالي مبلغ الجملة:</span>
                    <strong style={{ fontSize: '1.25rem', color: '#800020', fontWeight: 900 }}>{cartTotal.toLocaleString()} DA</strong>
                  </div>

                  {/* Checkout Form */}
                  <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0' }}>📋 معلومات تأكيد الطلب:</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>الاسم واللقب / اسم المحل *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="اسم المحل أو التاجر" 
                        className="form-input-gros"
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>رقم الهاتف للاتصال *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="رقم الهاتف" 
                        className="form-input-gros"
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>رقم الواتساب (WhatsApp) *</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="رقم الواتساب للتواصل وإرسال الفاتورة" 
                        className="form-input-gros"
                        value={checkoutWhatsapp}
                        onChange={(e) => setCheckoutWhatsapp(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>الولاية *</label>
                        <select 
                          required 
                          className="form-input-gros"
                          value={checkoutWilaya}
                          onChange={(e) => setCheckoutWilaya(e.target.value)}
                        >
                          <option value="">اختر الولاية</option>
                          {ALGERIA_WILAYAS.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>البلدية *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="اسم البلدية" 
                          className="form-input-gros"
                          value={checkoutCommune}
                          onChange={(e) => setCheckoutCommune(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>طريقة التوصيل المفضلة</label>
                      <select 
                        className="form-input-gros"
                        value={checkoutDeliveryMode}
                        onChange={(e) => setCheckoutDeliveryMode(e.target.value)}
                      >
                        <option value="Livraison Domicile (توصيل للمنزل)">🏠 توصيل للمنزل (Livraison Domicile)</option>
                        <option value="Livraison Bureau (توصيل للمكتب)">🏢 توصيل للمكتب (Livraison Bureau)</option>
                        <option value="شاحنة نقل بضائع (Transporteur)">🚚 مع معارف التاجر / شاحنة نقل بضائع</option>
                        <option value="استلام من المحل (Boutique)">🏬 استلام شخصي من المحل</option>
                      </select>
                    </div>

                    {checkoutDeliveryMode.includes('Livraison') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>شركة التوصيل (Société de Livraison) *</label>
                        <select 
                          className="form-input-gros"
                          value={checkoutDeliveryCompany}
                          onChange={(e) => setCheckoutDeliveryCompany(e.target.value)}
                          required
                        >
                          <option value="" disabled>-- إختر شركة التوصيل --</option>
                          <option value="yalidine">Yalidine (ياليدين)</option>
                          <option value="zrexpress">ZR Express</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '0.95rem',
                        borderRadius: '12px',
                        background: '#800020',
                        border: 'none',
                        fontWeight: 900,
                        marginTop: '10px',
                        boxShadow: '0 4px 12px rgba(128,0,32,0.2)'
                      }}
                    >
                      🚀 إرسال الطلبية وتأكيد الجملة
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
