import React, { useState, useEffect } from 'react';
import { ALGERIA_WILAYAS } from '../data/mockData';
import { ShoppingBag, Sparkles, ShieldCheck, Truck, PhoneCall, CheckCircle2, ArrowRight, Lock, MapPin, ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';

export default function Storefront({ products, settings, onPlaceOrder }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  
  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Form fields
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState(ALGERIA_WILAYAS[15]); // Default Alger
  const [commune, setCommune] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('Livraison Domicile (توصيل للمنزل)');

  // Prevent body scroll when cart is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  const filteredProducts = products.filter(p => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'promo') return p.oldPrice && p.oldPrice > p.price;
    return p.category === selectedCategory;
  });

  const handleAddToCart = (product) => {
    // Default color & size
    let defaultColor = 'Standard';
    let defaultSize = 'Standard';
    
    if (product.colorVariants && product.colorVariants.length > 0) {
      defaultColor = product.colorVariants[0].color;
      const availableSizes = Object.keys(product.colorVariants[0].stock || {});
      defaultSize = availableSizes[0] || product.sizes?.[0] || 'Standard';
    } else {
      defaultSize = product.sizes?.[0] || 'Standard';
    }

    const newItem = {
      cartItemId: Date.now() + Math.random(),
      productId: product.id,
      product: product.title,
      image: (product.images && product.images.length > 0) ? product.images[0] : product.image,
      price: product.price,
      color: defaultColor,
      size: defaultSize,
      qty: 1,
      _productRef: product // Keep full product to allow variant changes in cart
    };

    setCartItems([...cartItems, newItem]);
    setIsCartOpen(true);
    setCheckoutStep(false);
    setOrderSuccess(false);
  };

  const updateCartItem = (id, field, value) => {
    setCartItems(cartItems.map(item => {
      if (item.cartItemId === id) {
        const updated = { ...item, [field]: value };
        // If color changes, we might need to reset size if it's no longer available
        if (field === 'color' && item._productRef?.colorVariants) {
          const matched = item._productRef.colorVariants.find(c => c.color === value);
          if (matched && matched.stock) {
            const sizes = Object.keys(matched.stock);
            if (sizes.length > 0 && !sizes.includes(item.size)) {
              updated.size = sizes[0];
            }
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const removeCartItem = (id) => {
    const newItems = cartItems.filter(item => item.cartItemId !== id);
    setCartItems(newItems);
    if (newItems.length === 0) {
      setCheckoutStep(false); // reset if empty
    }
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (!clientName || !phone || !commune) {
      alert("Veuillez remplir tous les champs obligatoires (Nom, Téléphone et Commune)");
      return;
    }
    if (cartItems.length === 0) return;

    // Build items for order
    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      product: item.color !== 'Standard' ? `${item.product} (${item.color})` : item.product,
      color: item.color,
      size: item.size,
      qty: item.qty,
      price: item.price
    }));

    const productTitles = orderItems.map(i => `${i.product} (x${i.qty})`).join(' + ');

    const newOrder = {
      id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName,
      phone,
      wilaya,
      commune,
      deliveryMode,
      product: productTitles,
      items: orderItems,
      price: cartTotal,
      status: "nouvelle",
      archived: false
    };

    onPlaceOrder(newOrder);
    setOrderSuccess(true);
    setCartItems([]);
    setClientName('');
    setPhone('');
    setCommune('');
  };

  // Social & contact links
  const formatUrl = (url, defaultUrl) => {
    if (!url) return defaultUrl;
    const trimmed = String(url).trim();
    if (!trimmed) return defaultUrl;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('tel:') || trimmed.startsWith('mailto:')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const instaUrl = formatUrl(settings?.instagramUrl, "https://www.instagram.com/pyjama_dz");
  const mapsUrl = formatUrl(settings?.googleMapsUrl, "https://maps.google.com/?q=" + encodeURIComponent(settings?.address || "Bab Ezzouar & Hydra, Alger"));
  
  const getPhoneList = () => {
    if (Array.isArray(settings?.phoneOrders) && settings.phoneOrders.length > 0) {
      return settings.phoneOrders.map(p => String(p).trim()).filter(Boolean);
    }
    if (typeof settings?.phoneOrders === 'string' && settings.phoneOrders.trim()) {
      return settings.phoneOrders.split('-').map(s => s.trim()).filter(Boolean);
    }
    if (settings?.whatsapp) {
      return [String(settings.whatsapp).trim()];
    }
    return ["0555123456"];
  };
  const phoneList = getPhoneList();
  const rawPhone = phoneList[0] || "0555123456";
  const phoneUrl = `tel:${rawPhone}`;

  const rawWa = (settings?.whatsapp || settings?.phoneOrders || "0771335039").split('-')[0].trim().replace(/\D/g, '');
  let waNumber = rawWa;
  if (waNumber.startsWith('00')) waNumber = waNumber.substring(2);
  else if (waNumber.startsWith('0')) waNumber = '213' + waNumber.substring(1);
  const waUrl = `https://wa.me/${waNumber}`;

  const storeNameDisplay = (settings?.storeName || "Pyjama DZ").replace(/\s*-\s*Luxury\s*Homewear/i, '').trim();

  return (
    <>
      <div className="storefront-wrapper animate-fade-up">
      {/* Top Trust Ticker Banner */}
      <div className="top-ticker">
        <div className="ticker-content">
          <span className="ticker-item"><Truck size={14} /> Livraison Rapide 58 Wilayas à Domicile</span>
          <span className="ticker-item"><Sparkles size={14} /> الأناقة مش غالية… خليكِ مميزة بأقل التكاليف!</span>
          <span className="ticker-item"><ShieldCheck size={14} /> +591,000 Abonnées sur Instagram (@pyjama_dz)</span>
          <span className="ticker-item">💵 Paiement à la Livraison (الدفع عند الاستلام)</span>
          <span className="ticker-item"><Truck size={14} /> Livraison Rapide 58 Wilayas à Domicile</span>
          <span className="ticker-item"><Sparkles size={14} /> الأناقة مش غالية… خليكِ مميزة بأقل التكاليف!</span>
          <span className="ticker-item"><ShieldCheck size={14} /> +591,000 Abonnées sur Instagram (@pyjama_dz)</span>
        </div>
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="logo-container" onClick={() => setSelectedCategory('all')} style={{ cursor: 'pointer' }}>
          <img src="/favicon.svg?v=3" alt="Pyjama DZ Logo" className="logo-img" style={{ width: '48px', height: '48px', borderRadius: '50%', boxShadow: '0 4px 15px rgba(122, 34, 52, 0.25)', border: '2px solid var(--rose-primary)', objectFit: 'cover', background: '#fff' }} />
          <div className="logo-text">
            <h1>{storeNameDisplay}</h1>
          </div>
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 1. Instagram */}
          <a 
            href={instaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            title="إنستغرام (Instagram - @pyjama_dz)"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(220, 39, 67, 0.25)', transition: 'all 0.2s ease', textDecoration: 'none' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
          </a>

          {/* 2. Google Maps */}
          <a 
            href={mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            title="الموقع على خريطة جوجل (Google Maps)"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(66, 133, 244, 0.25)', transition: 'all 0.2s ease', textDecoration: 'none' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <MapPin size={20} strokeWidth={2.2} />
          </a>

          {/* 3. Phone Call */}
          <button 
            type="button"
            onClick={() => {
              if (phoneList.length > 1) setIsPhoneModalOpen(true);
              else window.location.href = `tel:${rawPhone}`;
            }}
            title={`اتصل بنا هاتفياً (${phoneList.join(' - ')})`}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.25)', transition: 'all 0.2s ease', cursor: 'pointer' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <PhoneCall size={20} strokeWidth={2.2} />
          </button>

          {/* 4. WhatsApp */}
          <a 
            href={waUrl}
            target="_blank" 
            rel="noopener noreferrer"
            title="تواصل معنا عبر واتساب (WhatsApp)"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.25)', transition: 'all 0.2s ease', textDecoration: 'none' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.248c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h2 className="hero-title">
          الأناقة مش غالية…<br />خليكِ مميزة بأقل التكاليف!
        </h2>
        <p className="hero-subtitle">
          Découvrez la plus belle sélection de pyjamas en satin de soie, loungewear en coton respirant et coffrets trousseau de mariée en Algérie.
        </p>

        <div className="hero-stats">
          <div className="stat-item">
            <h3>+591K</h3>
            <p>Abonnées fidèles</p>
          </div>
          <div className="stat-item">
            <h3>58</h3>
            <p>Wilayas couvertes</p>
          </div>
          <div className="stat-item">
            <h3>100%</h3>
            <p>Paiement à la livraison</p>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <nav className="categories-bar">
        <button 
          className={`cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          🌟 Tout Découvrir ({products.length})
        </button>
        <button 
          className={`cat-pill ${selectedCategory === 'satin' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('satin')}
        >
          ✨ Pyjamas Satin (ساتان)
        </button>
        <button 
          className={`cat-pill ${selectedCategory === 'coton' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('coton')}
        >
          🧸 Coton & Confort (قطن)
        </button>
        <button 
          className={`cat-pill ${selectedCategory === 'mariee' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('mariee')}
        >
          👰 Trousseau Mariée (جهاز العروس)
        </button>
        <button 
          className={`cat-pill ${selectedCategory === 'promo' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('promo')}
        >
          🔥 Promotions
        </button>
      </nav>

      {/* Product Grid */}
      <main className="products-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image-container" style={{ position: 'relative', overflow: 'hidden' }}>
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="badge-tag badge-promo" style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
                  Promo
                </span>
              )}
              <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', width: '100%', height: '100%', scrollbarWidth: 'none' }}>
                {(product.images && product.images.length > 0 ? product.images : [product.image]).map((img, idx) => (
                  <div key={idx} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', height: '100%', position: 'relative' }}>
                    <img src={img} alt={product.title} className="product-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* Dots indicator */}
                    {(product.images && product.images.length > 1) && (
                      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px', pointerEvents: 'none' }}>
                         {product.images.map((_, dotIdx) => (
                           <div key={dotIdx} style={{ width: 6, height: 6, borderRadius: '50%', background: idx === dotIdx ? 'white' : 'rgba(255,255,255,0.5)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                         ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="product-info">
              <span className="product-cat">
                {product.category === 'satin' ? 'Collection Satin' : product.category === 'coton' ? '100% Coton Doux' : 'Coffret Mariée VIP'}
              </span>
              <h3 className="product-title">{product.title}</h3>
              {/* Urgency Warning */}
              {product.stock > 0 && product.stock <= 5 && (
                <div style={{ fontSize: '0.8rem', color: '#D32F2F', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⏳ Il ne reste que {product.stock} {product.stock > 1 ? 'pièces' : 'pièce'} !
                </div>
              )}

              {/* Display colors if available */}
              {product.colorVariants && product.colorVariants.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {product.colorVariants.map(cv => (
                    <span key={cv.color} style={{ fontSize: '0.7rem', background: '#F5EBE6', color: 'var(--burgundy)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      🎨 {cv.color}
                    </span>
                  ))}
                </div>
              )}

              <div className="sizes-list">
                {product.sizes?.map(size => (
                  <span key={size} className="size-pill">{size}</span>
                ))}
              </div>

              <p style={{ fontSize: '0.85rem', color: '#7D6B70', marginBottom: '16px', flex: 1 }}>
                {product.description}
              </p>

              <div className="price-container">
                <span className="price-current">{product.price.toLocaleString()} DA</span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="price-old">{product.oldPrice.toLocaleString()} DA</span>
                )}
              </div>

              <button 
                onClick={() => handleAddToCart(product)}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                <ShoppingBag size={18} />
                <span>إضافة إلى السلة (Ajouter au Panier)</span>
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Luxury Footer */}
      <footer style={{ background: 'var(--burgundy-dark)', color: 'white', padding: '48px 24px 24px', marginTop: '64px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <img src="/favicon.svg?v=3" alt="Pyjama DZ" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', background: '#fff' }} />
              <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{storeNameDisplay}</span>
            </div>
            <p style={{ color: 'var(--champagne)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              المتجر الأول في الجزائر المتخصص في بيجامات الساتان الفاخرة، القطن الطبيعي وأطقم العرائس. جودة عالية وأسعار في متناول الجميع!
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 16, color: '#FFD700' }}>📞 للطلب والاستفسار (Contacts)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => {
                  if (phoneList.length > 1) setIsPhoneModalOpen(true);
                  else window.location.href = `tel:${rawPhone}`;
                }}
              >
                <PhoneCall size={16} color="var(--rose-primary)" />
                <span>الهاتف : {phoneList.join(' - ')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="var(--rose-primary)" />
                <span>العنوان : {settings?.address || "Bab Ezzouar & Hydra, Alger"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={16} color="var(--rose-primary)" />
                <span>التوصيل : سريع لـ 58 ولاية والدفع عند الاستلام</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
          © 2026 Pyjama DZ. Tous droits réservés. Conçu avec excellence pour l'Algérie 🇩🇿
        </div>
      </footer>
      </div>

      {/* Floating Cart Icon */}
      {!isCartOpen && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999 }}>
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ 
              background: 'var(--burgundy)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '50%', 
              width: '65px', 
              height: '65px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 8px 24px rgba(74, 28, 40, 0.4)', 
              cursor: 'pointer', 
              position: 'relative'
            }}
          >
            <ShoppingCart size={28} />
            {cartItems.length > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '0px', 
                right: '0px', 
                background: 'var(--rose-primary)', 
                color: 'white', 
                borderRadius: '50%', 
                width: '26px', 
                height: '26px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.9rem', 
                fontWeight: 900,
                border: '2px solid white'
              }}>
                {cartItems.reduce((acc, item) => acc + item.qty, 0)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div 
          onClick={() => setIsCartOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(3px)',
            zIndex: 1000, 
            display: 'flex', 
            justifyContent: 'flex-end',
            overflow: 'hidden'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
            width: '100%', 
            maxWidth: '480px', 
            background: '#F9F8F6', 
            height: '100%', 
            maxHeight: '100dvh',
            display: 'flex', 
            flexDirection: 'column', 
            boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
            animation: 'slideLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' 
          }}>
            <style>{`
              @keyframes slideLeft {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            
            {/* Drawer Header */}
            <div style={{ padding: '24px 20px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--burgundy-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShoppingCart size={26} color="var(--rose-primary)" /> 
                {checkoutStep ? 'إتمام الطلب (Checkout)' : 'سلة المشتريات (Panier)'}
              </h2>
              <button onClick={() => setIsCartOpen(false)} style={{ background: '#F5F5F5', border: 'none', color: '#555', cursor: 'pointer', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
              {orderSuccess ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle2 size={80} color="var(--success)" style={{ margin: '0 auto 20px' }} />
                  <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
                    Merci beaucoup ! يعطيك الصحة
                  </h4>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1.05rem', lineHeight: 1.6 }}>
                    Votre commande a été enregistrée avec succès.<br />
                    Notre équipe va vous appeler par téléphone dans quelques minutes pour confirmer l'expédition !
                  </p>
                  <button 
                    onClick={() => setIsCartOpen(false)} 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.1rem' }}
                  >
                    Continuer mon shopping
                  </button>
                </div>
              ) : cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
                  <ShoppingBag size={64} style={{ opacity: 0.3, margin: '0 auto 20px' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#555' }}>Votre panier est vide</h3>
                  <p style={{ marginTop: '10px' }}>Ajoutez des produits pour commencer.</p>
                  <button onClick={() => setIsCartOpen(false)} className="btn btn-secondary" style={{ marginTop: '24px' }}>Parcourir la boutique</button>
                </div>
              ) : checkoutStep ? (
                // Checkout Form
                <form id="checkout-form" onSubmit={handleSubmitOrder} className="animate-fade-up">
                  <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', color: 'var(--burgundy)', borderBottom: '2px solid #F0F0F0', paddingBottom: '10px' }}>
                      Informations de livraison
                    </h3>
                    
                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>الإسم واللقب (Nom et Prénom) *</label>
                      <input 
                        type="text" required placeholder="Ex: Yasmine Benali" 
                        className="form-input" style={{ padding: '12px 16px', fontSize: '1rem' }}
                        value={clientName} onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>رقم الهاتف (Téléphone) *</label>
                      <input 
                        type="tel" required placeholder="Ex: 0554128933" 
                        className="form-input" style={{ padding: '12px 16px', fontSize: '1rem', direction: 'ltr', textAlign: 'left' }}
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>الولاية (Wilaya) *</label>
                      <select 
                        className="form-select" style={{ padding: '12px 16px', fontSize: '1rem' }}
                        value={wilaya} onChange={(e) => setWilaya(e.target.value)}
                      >
                        {ALGERIA_WILAYAS.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>البلدية (Commune) *</label>
                      <input 
                        type="text" required placeholder="Ex: Bab Ezzouar..." 
                        className="form-input" style={{ padding: '12px 16px', fontSize: '1rem' }}
                        value={commune} onChange={(e) => setCommune(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>طريقة التوصيل (Livraison)</label>
                      <select 
                        className="form-select" style={{ padding: '12px 16px', fontSize: '1rem' }}
                        value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)}
                      >
                        <option value="Livraison Domicile (توصيل للمنزل)">🏠 توصيل للمنزل (Livraison Domicile)</option>
                        <option value="Livraison Bureau (توصيل للمكتب)">🏢 توصيل للمكتب (Livraison Bureau)</option>
                      </select>
                    </div>
                  </div>
                </form>
              ) : (
                // Cart Items List
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cartItems.map((item) => {
                    const currentProduct = item._productRef;
                    const availableColors = currentProduct?.colorVariants || [];
                    const currentColorObj = availableColors.find(cv => cv.color === item.color);
                    const availableSizes = currentColorObj?.stock ? Object.keys(currentColorObj.stock) : (currentProduct?.sizes || ["Standard"]);

                    return (
                      <div key={item.cartItemId} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
                        <img src={item.image} alt={item.product} style={{ width: '85px', height: '110px', objectFit: 'cover', borderRadius: '10px' }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px', paddingRight: '24px' }}>{item.product}</h4>
                          <p style={{ color: 'var(--burgundy)', fontWeight: 900, fontSize: '1.05rem', marginBottom: '12px' }}>{item.price.toLocaleString()} DA</p>
                          
                          {/* Options */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Color */}
                            {availableColors.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#777', width: '45px' }}>Couleur:</span>
                                <select 
                                  value={item.color}
                                  onChange={(e) => updateCartItem(item.cartItemId, 'color', e.target.value)}
                                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '0.85rem', flex: 1, outline: 'none' }}
                                >
                                  {availableColors.map(cv => (
                                    <option key={cv.color} value={cv.color}>{cv.color}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            
                            {/* Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#777', width: '45px' }}>Taille:</span>
                              <select 
                                value={item.size}
                                onChange={(e) => updateCartItem(item.cartItemId, 'size', e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '0.85rem', flex: 1, outline: 'none' }}
                              >
                                {availableSizes.map(sz => (
                                  <option key={sz} value={sz}>{sz}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Qty & Remove */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', background: '#F5F5F5', borderRadius: '8px', padding: '4px' }}>
                                <button type="button" onClick={() => updateCartItem(item.cartItemId, 'qty', Math.max(1, item.qty - 1))} style={{ background: 'white', border: '1px solid #DDD', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={14} /></button>
                                <span style={{ width: '36px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>{item.qty}</span>
                                <button type="button" onClick={() => updateCartItem(item.cartItemId, 'qty', item.qty + 1)} style={{ background: 'white', border: '1px solid #DDD', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={14} /></button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Remove absolute */}
                        <button 
                          onClick={() => removeCartItem(item.cartItemId)}
                          style={{ position: 'absolute', top: '12px', right: '12px', background: '#FFF0F0', border: 'none', color: '#D32F2F', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {!orderSuccess && cartItems.length > 0 && (
              <div style={{ background: 'white', padding: '24px', borderTop: '1px solid #E5E5E5', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1.2rem', color: '#555', fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: '1.6rem', color: 'var(--burgundy-dark)', fontWeight: 900 }}>{cartTotal.toLocaleString()} DA</span>
                </div>
                
                {checkoutStep ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      type="button"
                      onClick={() => setCheckoutStep(false)}
                      className="btn btn-secondary"
                      style={{ padding: '16px', flex: '0 0 auto' }}
                    >
                      Retour
                    </button>
                    <button 
                      type="submit" form="checkout-form"
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '16px', fontSize: '1.1rem', justifyContent: 'center' }}
                    >
                      <CheckCircle2 size={20} /> التأكيد (Confirmer)
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setCheckoutStep(true)}
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '16px', fontSize: '1.15rem', justifyContent: 'center' }}
                  >
                    Passer à la caisse (إتمام الطلب) <ArrowRight size={20} />
                  </button>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', color: '#1F8A55', fontSize: '0.85rem', fontWeight: 600 }}>
                  <ShieldCheck size={16} /> Paiement à la livraison 100% sécurisé
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phone Selection Modal */}
      {isPhoneModalOpen && (
        <div 
          onClick={() => setIsPhoneModalOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(4px)',
            zIndex: 10000, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-up"
            style={{ 
              background: 'white', 
              borderRadius: '20px', 
              padding: '28px 24px', 
              width: '100%', 
              maxWidth: '380px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setIsPhoneModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666' }}
            >
              <X size={18} />
            </button>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#E3F2FD', color: '#1E88E5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <PhoneCall size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: '8px' }}>
              اختر رقماً للاتصال بنا 📞
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              لدينا عدة أرقام لخدمتكم، اضغط على الرقم الذي ترغب بالاتصال به مباشرة:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {phoneList.map((num, idx) => (
                <a
                  key={idx}
                  href={`tel:${num}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '14px',
                    color: '#1E293B',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    transition: 'all 0.2s',
                    direction: 'ltr'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#3B82F6';
                    e.currentTarget.style.background = '#EFF6FF';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3B82F6' }}>
                    <PhoneCall size={20} />
                    <span>رقم {idx + 1}</span>
                  </span>
                  <span style={{ fontWeight: 900, color: '#0F172A' }}>{num}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
