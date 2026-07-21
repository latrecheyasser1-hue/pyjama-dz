import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Search, Scan, ShoppingCart, Plus, Minus, Trash2, Check, Printer, LogOut, Package, AlertCircle, ArrowLeft, ArrowRight, X, CheckCircle2, Clock } from 'lucide-react';
import { showToast } from '../utils/toast';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function CashierPOS({ products = [], settings = {}, onPlaceOrder, onGoBack, orders = [], onUpdateStatus, onUpdateProduct }) {
  const { isInstallable, promptInstall } = usePWAInstall();
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('pyjama_dz_pos_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [remise, setRemise] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [showReceiptModal, setShowReceiptModal] = useState(null);
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [returnConfirmationId, setReturnConfirmationId] = useState(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);

  const [selectedVariants, setSelectedVariants] = useState({});
  const [activeColors, setActiveColors] = useState([]);

  const getColorHex = (name) => {
    if (!name) return '#ccc';
    let clean = name.toLowerCase().trim();
    if (clean === 'noire') clean = 'noir';
    if (clean === 'blanche') clean = 'blanc';
    if (clean === 'grise') clean = 'gris';
    if (clean === 'bleue') clean = 'bleu';
    if (clean === 'verte') clean = 'vert';
    if (clean === 'jaune') clean = 'jaune';

    const map = {
      'red': '#EF4444', 'rouge': '#EF4444',
      'black': '#000000', 'noir': '#000000',
      'white': '#FFFFFF', 'blanc': '#FFFFFF',
      'blue': '#3B82F6', 'bleu': '#3B82F6',
      'green': '#10B981', 'vert': '#10B981',
      'yellow': '#F59E0B', 'jaune': '#F59E0B',
      'pink': '#EC4899', 'rose': '#EC4899',
      'purple': '#8B5CF6', 'violet': '#8B5CF6',
      'grey': '#808080', 'gray': '#808080', 'gris': '#808080',
      'brown': '#8B4513', 'marron': '#8B4513',
      'orange': '#FFA500',
      'beige': '#F5F5DC',
      'navy': '#000080', 'marine': '#000080',
      'أحمر': '#EF4444', 'احمر': '#EF4444',
      'أسود': '#000000', 'اسود': '#000000',
      'أبيض': '#FFFFFF', 'ابيض': '#FFFFFF',
      'أزرق': '#3B82F6', 'ازرق': '#3B82F6',
      'أخضر': '#10B981', 'اخضر': '#10B981',
      'أصفر': '#F59E0B', 'اصفر': '#F59E0B',
      'وردي': '#EC4899',
      'بنفسجي': '#8B5CF6',
      'رمادي': '#808080',
      'بني': '#8B4513',
      'برتقالي': '#FFA500',
      'بيج': '#F5F5DC',
      'كحلي': '#000080'
    };
    return map[clean] || clean;
  };

  const getProductMeta = (product) => {
    if (!product || !product.description) return {};
    try {
      const parts = product.description.split('|||');
      if (parts[1]) {
        return JSON.parse(parts[1]) || {};
      }
    } catch (e) {
      console.error("Error parsing product metadata", e);
    }
    return {};
  };

  const getDiscountedPrice = (product, basePrice, totalQty) => {
    if (totalQty >= 5) {
      if (product) {
        const meta = getProductMeta(product);
        const bulkPrice5 = Number(meta.bulkPrice5 || 0);
        if (bulkPrice5 > 0) {
          return bulkPrice5;
        }

        // Fallback to gros__ product by matching title
        const grosProd = products.find(p => 
          p.title === product.title && 
          p.category && 
          p.category.startsWith('gros__')
        );
        if (grosProd && Number(grosProd.price) > 0) {
          return Number(grosProd.price);
        }
      }
      return Math.round(basePrice * 0.85); // 15% off fallback
    }
    return basePrice;
  };

  const recalculateCartPrices = (cartList) => {
    const qtyByProduct = {};
    cartList.forEach(item => {
      qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.qty;
    });

    return cartList.map(item => {
      const totalQty = qtyByProduct[item.productId] || 0;
      const productObj = products.find(p => p.id === item.productId);
      const targetPrice = getDiscountedPrice(productObj, item.originalPrice, totalQty);
      return { ...item, price: targetPrice };
    });
  };


  const barcodeInputRef = useRef(null);

  const storeName = (settings?.storeName || 'Pyjama DZ - المحل الرئيسي').replace(/\s*-\s*Luxury\s*Homewear/i, '').trim();

  const handleConfirmRetour = (order) => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const prodToUpdate = products.find(p => p.id === item.productId || p.title === item.product);
        if (prodToUpdate && prodToUpdate.colorVariants) {
          const updatedVariants = prodToUpdate.colorVariants.map(cv => {
            if (cv.color === item.color && cv.stock && cv.stock[item.size] !== undefined) {
              return {
                ...cv,
                stock: {
                  ...cv.stock,
                  [item.size]: cv.stock[item.size] + (Number(item.qty) || 1)
                }
              };
            }
            return cv;
          });
          if (onUpdateProduct) {
            onUpdateProduct({
              ...prodToUpdate,
              colorVariants: updatedVariants
            });
          }
        }
      });
    }

    if (onUpdateStatus) {
      onUpdateStatus(order.id, 'retour', true);
      setReturnConfirmationId(null);
      showToast('تم إرجاع الطلبية بنجاح وإعادة المخزون', 'success');
    }
  };

  const storePhone = Array.isArray(settings?.phoneOrders) && settings.phoneOrders.length > 0 ? settings.phoneOrders[0] : (settings?.phoneOrders || '0555123456');
  const storeAddress = settings?.address || 'الجزائر العاصمة';
  const validPin = settings?.cashierPin || '0000';

  // Global robust barcode scanner listener
  useEffect(() => {
    if (!isAuthenticated || showReceiptModal || showHistoryModal || selectedProductModal) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Ignore if pressing a modifier key alone
      if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return;

      const currentTime = Date.now();
      
      // If time between keystrokes is more than 50ms, assume it's human typing and reset
      // Barcode scanners usually type much faster (often 10-20ms per character)
      if (currentTime - lastKeyTime > 60) {
        buffer = '';
      }
      
      if (e.key === 'Enter' && buffer.length > 0) {
        // Prevent default form submission if focused on an input
        e.preventDefault();
        
        const scannedCode = buffer.trim();
        const foundProduct = products.find(p => 
          p.barcode && 
          String(p.barcode).trim() === scannedCode &&
          p.category && 
          p.category.startsWith('boutique__')
        );
        
        if (foundProduct) {
          openProductCard(foundProduct);
          // Optional: clear standard barcode input if it was active
          setBarcodeInput('');
        } else {
          showToast(`⚠️ لم يتم العثور على منتج بالباركود: ${scannedCode}`, 'warning');
        }
        buffer = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { 
        buffer += e.key;
      }
      
      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, showReceiptModal, showHistoryModal, selectedProductModal, products]);

  // Handle PIN Login
  const handlePinLogin = (e) => {
    if (e) e.preventDefault();
    if (pinInput === validPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('pyjama_dz_pos_auth', 'true');
      setPinError(false);
      setPinInput('');
      showToast('✅ تم الدخول إلى واجهة الكاشير بنجاح!', 'success');
    } else {
      setPinError(true);
      showToast('❌ الرمز السري غير صحيح!', 'error');
    }
  };

  const handleKeypadPress = (num) => {
    if (pinInput.length < 6) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      setPinError(false);
    }
  };

  const handleKeypadDelete = () => {
    setPinInput(pinInput.slice(0, -1));
    setPinError(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pyjama_dz_pos_auth');
    setIsAuthenticated(false);
    setCart([]);
  };

  // Keyboard support for PIN pad
  useEffect(() => {
    if (isAuthenticated) return;

    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadDelete();
      } else if (e.key === 'Enter') {
        handlePinLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, pinInput, validPin]);

  // Filter Boutique/Hanoot products only (categories starting with 'boutique__')
  const availableProducts = products.filter(p => {
    if (!p) return false;
    return p.category && p.category.startsWith('boutique__');
  });

  // Calculate remaining stock for a product
  const getProductStock = (product) => {
    if (!product) return 0;
    if (product.colorVariants && product.colorVariants.length > 0) {
      return product.colorVariants.reduce((total, v) => {
        if (!v.stock) return total;
        return total + Object.values(v.stock).reduce((s, qty) => s + (Number(qty) || 0), 0);
      }, 0);
    }
    return Number(product.stock || 0);
  };

  // Filter products by search and category
  const filteredProducts = availableProducts.filter(p => {
    const matchesSearch = !searchQuery || 
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery);
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Handle barcode scan
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    const scannedCode = barcodeInput.trim();
    const foundProduct = availableProducts.find(p => p.barcode && p.barcode.trim() === scannedCode);
    
    if (foundProduct) {
      openProductCard(foundProduct);
      setBarcodeInput('');
    } else {
      showToast(`⚠️ لم يتم العثور على منتج بالباركود: ${scannedCode}`, 'warning');
      setBarcodeInput('');
    }
  };

  // Open Product Modal
  const openProductCard = (product) => {
    setSelectedProductModal(product);
    setSelectedVariants({});
    setActiveColors([]);
    setSelectedQty(1);
    
    // Default color & size selection
    if (product.colorVariants && product.colorVariants.length > 0) {
      const firstAvailableColor = product.colorVariants.find(v => {
        const total = v.stock ? Object.values(v.stock).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
        return total > 0;
      }) || product.colorVariants[0];
      
      setSelectedColor(firstAvailableColor.color || '');
      if (firstAvailableColor.stock) {
        const availableSizes = Object.entries(firstAvailableColor.stock)
          .filter(([_, qty]) => Number(qty) > 0)
          .map(([size, _]) => size);
        setSelectedSize(availableSizes.length > 0 ? availableSizes[0] : Object.keys(firstAvailableColor.stock)[0] || 'Standard');
      } else {
        setSelectedSize('Standard');
      }
    } else {
      setSelectedColor('Standard');
      setSelectedSize('Standard');
    }
  };

  // Get current selected variant stock
  const getSelectedVariantStock = () => {
    if (!selectedProductModal) return 0;
    if (selectedProductModal.colorVariants && selectedProductModal.colorVariants.length > 0) {
      const variant = selectedProductModal.colorVariants.find(v => v.color?.toLowerCase() === selectedColor?.toLowerCase());
      if (variant && variant.stock && variant.stock[selectedSize] !== undefined) {
        return Number(variant.stock[selectedSize]) || 0;
      }
      return 0;
    }
    return Number(selectedProductModal.stock || 0);
  };

  const handleAddToCart = () => {
    if (!selectedProductModal) return;

    // Check if anything is selected
    const hasSelection = Object.values(selectedVariants).some(sizes => 
      Object.values(sizes).some(qty => qty > 0)
    );

    if (!hasSelection) {
      showToast('⚠️ يرجى اختيار لون ومقاس وتحديد الكمية أولاً!', 'warning');
      return;
    }

    let nextCart = [...cart];

    // Loop over colors
    for (const [color, sizes] of Object.entries(selectedVariants)) {
      for (const [size, qty] of Object.entries(sizes)) {
        if (qty <= 0) continue;

        // Get max stock for this variant
        let maxStock = Number(selectedProductModal.stock || 0);
        if (selectedProductModal.colorVariants && selectedProductModal.colorVariants.length > 0) {
          const variant = selectedProductModal.colorVariants.find(v => v.color?.toLowerCase() === color?.toLowerCase());
          if (variant && variant.stock) {
            maxStock = Number(variant.stock[size]) || 0;
          }
        }

        if (qty > maxStock) {
          showToast(`⚠️ الكمية المحددة للون ${color} مقاس ${size} تتجاوز المخزون (${maxStock})!`, 'warning');
          return;
        }

        const cartItemId = `${selectedProductModal.id}-${color}-${size}`;
        const existingIndex = nextCart.findIndex(item => item.cartItemId === cartItemId);

        if (existingIndex > -1) {
          const newTotalQty = nextCart[existingIndex].qty + qty;
          if (newTotalQty > maxStock) {
            showToast(`⚠️ الكمية المحددة للون ${color} مقاس ${size} تتجاوز المخزون (${maxStock})!`, 'warning');
            return;
          }
          nextCart[existingIndex].qty = newTotalQty;
        } else {
          nextCart.push({
            cartItemId,
            productId: selectedProductModal.id,
            title: selectedProductModal.title,
            originalPrice: Number(selectedProductModal.price || 0),
            price: Number(selectedProductModal.price || 0),
            image: selectedProductModal.image || (selectedProductModal.images && selectedProductModal.images[0]) || '',
            selectedColor: color,
            selectedSize: size,
            qty: qty,
            maxStock: maxStock
          });
        }
      }
    }

    // Recalculate prices and update cart state
    setCart(recalculateCartPrices(nextCart));
    showToast(`🛒 تم إضافة المنتجات المحددة إلى السلة`, 'success');
    setSelectedProductModal(null);
  };

  const updateCartQty = (index, delta) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      newCart.splice(index, 1);
    } else if (newQty > item.maxStock) {
      showToast(`⚠️ الحد الأقصى المتوفر في المخزون هو (${item.maxStock}) قطعة`, 'warning');
      return;
    } else {
      item.qty = newQty;
    }
    setCart(recalculateCartPrices(newCart));
  };

  const removeCartItem = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(recalculateCartPrices(newCart));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);

  // Confirm Sale & Print Ticket
  const handleConfirmSale = async () => {
    if (cart.length === 0) return;

    const discountAmount = Number(remise) || 0;
    const finalTotal = cartTotal - discountAmount;

    // Create items array and embed the discount as a special metadata item so it saves in DB without schema changes
    const orderItems = cart.map(item => ({
      productId: item.productId,
      product: item.title,
      color: item.selectedColor,
      size: item.selectedSize,
      qty: item.qty,
      price: item.price
    }));

    if (discountAmount > 0) {
      orderItems.push({
        isDiscount: true,
        product: 'خصم (Remise)',
        price: -discountAmount,
        qty: 1
      });
    }

    const newOrder = {
      orderType: 'hanoot',
      clientName: 'زبون المحل (بيع حضوري)',
      phone: '-',
      wilaya: 'الجزائر العاصمة',
      commune: 'المتجر الحضوري',
      deliveryMode: 'محل البيع المباشر',
      items: orderItems,
      price: finalTotal,
      status: 'livree', // Completed
      archived: true, // Go straight to history
      created_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      isPos: true
    };

    // Call app handler to record order & deduct stock
    let finalTicketId = 'N/A';
    const nextTicketNumber = orders ? orders.length + 1 : 1;
    const computedTicketId = nextTicketNumber < 10 ? `0${nextTicketNumber}` : `${nextTicketNumber}`;
    
    if (onPlaceOrder) {
      const inserted = await onPlaceOrder(newOrder);
      if (inserted && inserted.id) {
        finalTicketId = computedTicketId;
      } else {
        finalTicketId = Math.random().toString(36).substring(2, 10).toUpperCase();
      }
    }

    // Show Receipt Modal
    setShowReceiptModal({
      ticketId: finalTicketId,
      storeName,
      storePhone,
      storeAddress,
      dateFormatted: new Date().toLocaleString('ar-DZ'),
      items: [...cart],
      discount: discountAmount,
      total: finalTotal
    });

    setCart([]);
    setRemise('');
  };

  // Print Receipt
  const triggerPrint = () => {
    window.print();
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ background: 'white', padding: '40px 32px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: '#E0F2FE', color: '#0284C7', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #BAE6FD' }}>
            <Lock size={32} />
          </div>
          
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>🧑‍💼 تسجيل الدخول للكاشير (POS)</h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '28px' }}>أدخل الرمز السري المخصص للعمال للبدء في البيع المباشر</p>

          <form onSubmit={handlePinLogin} style={{ marginBottom: '24px' }}>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="••••"
              maxLength={6}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '2rem',
                letterSpacing: '12px',
                textAlign: 'center',
                borderRadius: '16px',
                border: pinError ? '2px solid #EF4444' : '2px solid #CBD5E1',
                background: pinError ? '#FEF2F2' : '#F8FAFC',
                fontWeight: 900,
                color: '#0F172A',
                outline: 'none',
                marginBottom: '16px'
              }}
              autoFocus
            />

            {pinError && (
              <div style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> الرمز السري غير صحيح، يرجى المحاولة مرة أخرى!
              </div>
            )}

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num.toString())}
                  style={{
                    padding: '16px',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    color: '#1E293B',
                    cursor: 'pointer',
                    transition: 'all 0.1s'
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setPinError(false);
                }}
                style={{ padding: '16px', fontSize: '1rem', fontWeight: 800, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '14px', color: '#DC2626', cursor: 'pointer' }}
              >
                مسح C
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                style={{ padding: '16px', fontSize: '1.4rem', fontWeight: 800, background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '14px', color: '#1E293B', cursor: 'pointer' }}
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadDelete}
                style={{ padding: '16px', fontSize: '1rem', fontWeight: 800, background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '14px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1.1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              <Unlock size={20} /> دخول للشاشة (Connexion)
            </button>
          </form>

          <button
            type="button"
            onClick={onGoBack}
            style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto' }}
          >
            <ArrowLeft size={16} /> العودة إلى المتجر الرئيسي
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-container" style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>
      {/* POS Header */}
      <header style={{ background: '#0F172A', color: 'white', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '2px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#0284C7', padding: '8px 14px', borderRadius: '12px', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
            🏪 {storeName}
          </div>
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{ background: 'transparent', color: '#CBD5E1', border: '1px solid #334155', padding: '8px 14px', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#1E293B'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CBD5E1'; }}
          >
            <Clock size={16} />
            سجل المحل
          </button>

          {isInstallable && (
            <button 
              onClick={promptInstall}
              style={{ background: '#EF4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}
            >
              تثبيت التطبيق 📱
            </button>
          )}
        </div>
      </header>

      {/* POS Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Products Catalog */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedCategory === 'all' ? '#0F172A' : 'white',
                  color: selectedCategory === 'all' ? 'white' : '#475569',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  whiteSpace: 'nowrap'
                }}
              >
                ✨ كل المنتجات ({availableProducts.length})
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: '20px', border: '1px dashed #CBD5E1', padding: '40px', textAlign: 'center' }}>
              <Package size={48} color="#94A3B8" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>لا توجد منتجات مطابقة</h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>تأكد من كتابة الاسم أو مسح الباركود بشكل صحيح</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {filteredProducts.map(product => {
                const stockCount = getProductStock(product);
                const isOutOfStock = stockCount <= 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && openProductCard(product)}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      border: isOutOfStock ? '2px solid #FEE2E2' : '1px solid #E2E8F0',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: isOutOfStock ? 0.65 : 1,
                      position: 'relative'
                    }}
                  >
                    <div style={{ height: '160px', width: '100%', position: 'relative', background: '#F1F5F9' }}>
                      {product.image || (product.images && product.images[0]) ? (
                        <img src={product.image || product.images[0]} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                          <Package size={36} />
                        </div>
                      )}
                      
                      {/* Stock Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: isOutOfStock ? '#EF4444' : (stockCount <= 3 ? '#F59E0B' : '#10B981'),
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {isOutOfStock ? 'نفد المخزون' : `المخزون: ${stockCount}`}
                      </div>
                    </div>

                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px', lineHeight: '1.4', height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {product.title}
                        </h4>
                        {product.barcode && (
                          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                            🏷️ {product.barcode}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0284C7' }}>
                          {Number(product.price || 0).toLocaleString('fr-DZ')} DA
                        </span>
                        {!isOutOfStock && (
                          <span style={{ background: '#E0F2FE', color: '#0284C7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                            + اختيار
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: POS Shopping Cart */}
        <div style={{ background: 'white', borderLeft: '2px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-4px 0 15px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '20px', borderBottom: '2px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart size={22} color="#0284C7" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>🛒 سلة البيع الحالي</h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Trash2 size={14} /> إفراغ
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>
                <ShoppingCart size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontWeight: 800, fontSize: '1rem', color: '#64748B' }}>السلة فارغة حالياً</p>
                <span style={{ fontSize: '0.85rem' }}>اختر المنتجات من القائمة أو امسح الباركود لإضافتها للبيع</span>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={item.cartItemId} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {item.image && (
                    <img src={item.image} alt={item.title} style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </h5>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>
                      <span style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>المقاس: {item.selectedSize}</span>
                      <span style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>اللون: {item.selectedColor}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0284C7', marginTop: '6px' }}>
                      {(item.price * item.qty).toLocaleString('fr-DZ')} DA
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '4px' }}>
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, -1)}
                      style={{ background: '#F1F5F9', border: 'none', width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1E293B' }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontWeight: 900, minWidth: '22px', textAlign: 'center', fontSize: '0.95rem' }}>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, 1)}
                      style={{ background: '#E0F2FE', border: 'none', width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0284C7' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCartItem(idx)}
                    style={{ background: '#FEE2E2', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer Total & Checkout */}
          <div style={{ padding: '20px', background: '#F1F5F9', borderTop: '2px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#64748B' }}>المجموع:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#475569' }}>{cartTotal.toLocaleString('fr-DZ')} DA</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#64748B' }}>تخفيض (Remise):</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={remise}
                onChange={(e) => setRemise(e.target.value)}
                style={{
                  width: '100px',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  textAlign: 'left',
                  direction: 'ltr',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: '#DC2626',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>المبلغ المستحق:</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284C7' }}>{Math.max(0, cartTotal - (Number(remise) || 0)).toLocaleString('fr-DZ')} DA</span>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleConfirmSale}
              style={{
                width: '100%',
                padding: '16px',
                background: cart.length === 0 ? '#CBD5E1' : 'linear-gradient(135deg, #10B981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: 900,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: cart.length === 0 ? 'none' : '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <CheckCircle2 size={24} /> تأكيد البيع وطباعة التذكرة
            </button>
          </div>
        </div>
      </div>

      {/* Product Selection Modal (Sizes / Colors / Qty) */}
      {selectedProductModal && (() => {
        const totalQtySelected = Object.values(selectedVariants).reduce((total, sizes) => total + Object.values(sizes).reduce((s, q) => s + q, 0), 0);
        const qtyInCart = cart.filter(item => item.productId === selectedProductModal.id).reduce((s, item) => s + item.qty, 0);
        const projectedQty = totalQtySelected + qtyInCart;
        const currentUnitPrice = getDiscountedPrice(selectedProductModal, selectedProductModal.price, projectedQty);
        const totalPriceShow = currentUnitPrice * totalQtySelected;

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>🔍 اختيار المقاس واللون للبيع</h3>
                <button
                  type="button"
                  onClick={() => setSelectedProductModal(null)}
                  style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Product Info Banner */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#F8FAFC', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  {selectedProductModal.image || (selectedProductModal.images && selectedProductModal.images[0]) ? (
                    <img src={selectedProductModal.image || selectedProductModal.images[0]} alt={selectedProductModal.title} style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '70px', height: '70px', borderRadius: '12px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={32} color="#94A3B8" />
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0' }}>{selectedProductModal.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0284C7' }}>
                        {currentUnitPrice.toLocaleString('fr-DZ')} DA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Variants Selection Area */}
                {selectedProductModal.colorVariants && selectedProductModal.colorVariants.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Color Circles Row */}
                    <div>
                      <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '12px' }}>
                        🎨 اختر الألوان المتوفرة:
                      </label>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {selectedProductModal.colorVariants.map(v => {
                          const totalColorStock = v.stock ? Object.values(v.stock).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
                          const isZeroColor = totalColorStock <= 0;
                          if (isZeroColor) return null;

                          const hex = getColorHex(v.color);
                          const isColorActive = activeColors.includes(v.color);

                          return (
                            <button
                              key={v.color}
                              type="button"
                              onClick={() => {
                                if (isColorActive) {
                                  setActiveColors(prev => prev.filter(c => c !== v.color));
                                  setSelectedVariants(prev => {
                                    const next = { ...prev };
                                    delete next[v.color];
                                    return next;
                                  });
                                } else {
                                  setActiveColors(prev => [...prev, v.color]);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                outline: 'none'
                              }}
                            >
                              <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: hex,
                                border: isColorActive ? '4px solid #0284C7' : '2px solid #E2E8F0',
                                boxShadow: isColorActive ? '0 0 0 2px #BAE6FD, 0 4px 8px rgba(2, 132, 199, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                transform: isColorActive ? 'scale(1.05)' : 'scale(1)'
                              }}>
                                {isColorActive && (
                                  <span style={{
                                    color: hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === 'white' ? '#0F172A' : 'white',
                                    fontSize: '1.1rem',
                                    fontWeight: 900
                                  }}>✓</span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isColorActive ? '#0284C7' : '#1E293B' }}>
                                {v.color}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                                ({totalColorStock})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sizes Selection under Selected Colors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedProductModal.colorVariants.map(v => {
                        const isColorActive = activeColors.includes(v.color);
                        if (!isColorActive) return null;

                        const hex = getColorHex(v.color);

                        return (
                          <div key={v.color} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '2px solid #E2E8F0' }}>
                            {/* Color Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: hex,
                                border: '2px solid #CBD5E1'
                              }} />
                              <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>مقاسات اللون {v.color}:</strong>
                            </div>

                            {/* Sizes List */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              {v.stock && Object.entries(v.stock).map(([size, qty]) => {
                                const isZeroSize = Number(qty) <= 0;
                                const isSelected = selectedVariants[v.color]?.[size] !== undefined;

                                return (
                                  <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      disabled={isZeroSize}
                                      onClick={() => {
                                        if (isZeroSize) return;
                                        setSelectedVariants(prev => {
                                          const next = { ...prev };
                                          const colorSizes = next[v.color] ? { ...next[v.color] } : {};
                                          if (colorSizes[size] !== undefined) {
                                            delete colorSizes[size];
                                          } else {
                                            colorSizes[size] = 1;
                                          }
                                          if (Object.keys(colorSizes).length === 0) {
                                            delete next[v.color];
                                          } else {
                                            next[v.color] = colorSizes;
                                          }
                                          return next;
                                        });
                                      }}
                                      style={{
                                        padding: '10px 18px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        fontSize: '0.95rem',
                                        border: isZeroSize ? '1px dashed #E2E8F0' : (isSelected ? '2px solid #0284C7' : '1px solid #CBD5E1'),
                                        background: isZeroSize ? '#F1F5F9' : (isSelected ? '#E0F2FE' : 'white'),
                                        color: isZeroSize ? '#94A3B8' : (isSelected ? '#0284C7' : '#1E293B'),
                                        cursor: isZeroSize ? 'not-allowed' : 'pointer',
                                        opacity: isZeroSize ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      <span>{size}</span>
                                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '6px', background: isZeroSize ? '#E2E8F0' : (isSelected ? '#BAE6FD' : '#E2E8F0'), color: isZeroSize ? '#94A3B8' : (isSelected ? '#0284C7' : '#475569') }}>
                                        ({qty})
                                      </span>
                                    </button>

                                    {/* Quantity Input Square */}
                                    {isSelected && !isZeroSize && (
                                      <input
                                        type="number"
                                        min="1"
                                        max={qty}
                                        value={selectedVariants[v.color][size]}
                                        onChange={(e) => {
                                          const val = Math.max(1, Math.min(qty, parseInt(e.target.value) || 1));
                                          setSelectedVariants(prev => {
                                            const next = { ...prev };
                                            next[v.color] = {
                                              ...next[v.color],
                                              [size]: val
                                            };
                                            return next;
                                          });
                                        }}
                                        style={{
                                          width: '64px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          border: '2px solid #0284C7',
                                          borderRadius: '8px',
                                          fontSize: '0.9rem',
                                          fontWeight: 900,
                                          outline: 'none',
                                          background: 'white',
                                          boxShadow: '0 2px 4px rgba(2, 132, 199, 0.1)'
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Fallback for products with no color variants */
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#CBD5E1',
                        border: '2px solid #94A3B8'
                      }} />
                      <strong style={{ fontSize: '1rem', color: '#1E293B' }}>Standard</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>({selectedProductModal.stock || 0} قطعة متوفرة)</span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {(() => {
                        const qty = Number(selectedProductModal.stock || 0);
                        if (qty <= 0) return <span style={{ color: '#EF4444', fontWeight: 800 }}>نفد المخزون</span>;

                        const isSelected = selectedVariants['Standard']?.['Standard'] !== undefined;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVariants(prev => {
                                  const next = { ...prev };
                                  const standardSizes = next['Standard'] ? { ...next['Standard'] } : {};
                                  if (standardSizes['Standard'] !== undefined) {
                                    delete standardSizes['Standard'];
                                  } else {
                                    standardSizes['Standard'] = 1;
                                  }
                                  if (Object.keys(standardSizes).length === 0) {
                                    delete next['Standard'];
                                  } else {
                                    next['Standard'] = standardSizes;
                                  }
                                  return next;
                                });
                              }}
                              style={{
                                padding: '10px 18px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                border: isSelected ? '2px solid #0284C7' : '1px solid #CBD5E1',
                                background: isSelected ? '#E0F2FE' : 'white',
                                color: isSelected ? '#0284C7' : '#1E293B',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>Standard</span>
                              <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '6px', background: isSelected ? '#BAE6FD' : '#E2E8F0', color: isSelected ? '#0284C7' : '#475569' }}>
                                ({qty})
                              </span>
                            </button>

                            {isSelected && (
                              <input
                                type="number"
                                min="1"
                                max={qty}
                                value={selectedVariants['Standard']['Standard']}
                                onChange={(e) => {
                                  const val = Math.max(1, Math.min(qty, parseInt(e.target.value) || 1));
                                  setSelectedVariants(prev => {
                                    const next = { ...prev };
                                    next['Standard'] = {
                                      ...next['Standard'],
                                      ['Standard']: val
                                    };
                                    return next;
                                  });
                                }}
                                style={{
                                  width: '64px',
                                  textAlign: 'center',
                                  padding: '6px',
                                  border: '2px solid #0284C7',
                                  borderRadius: '8px',
                                  fontSize: '0.9rem',
                                  fontWeight: 900,
                                  outline: 'none',
                                  background: 'white'
                                }}
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '20px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProductModal(null)}
                  style={{ flex: 1, padding: '14px', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={totalQtySelected <= 0}
                  onClick={handleAddToCart}
                  style={{
                    flex: 2,
                    padding: '14px',
                    background: totalQtySelected <= 0 ? '#CBD5E1' : '#0284C7',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: 900,
                    fontSize: '1rem',
                    cursor: totalQtySelected <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: totalQtySelected <= 0 ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  <Plus size={20} /> إضافة للسلة ({totalPriceShow.toLocaleString('fr-DZ')} DA)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Printable Receipt / Ticket Modal */}
      {showReceiptModal && (
        <div className="receipt-modal-overlay receipt-print-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
          <div className="receipt-print-modal-container" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="no-print" style={{ padding: '16px 20px', background: '#1E293B', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 color="#10B981" /> تم تسجيل البيع بنجاح!
              </span>
              <button
                type="button"
                onClick={() => setShowReceiptModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Ticket Area */}
            <div id="print-ticket-area" style={{ padding: '24px', overflowY: 'auto', fontFamily: 'monospace, var(--font-sans)', color: '#0F172A', direction: 'rtl' }}>
              
              {/* Ticket Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #333', paddingBottom: '16px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 6px', color: '#000' }}>
                  Pyjama DZ
                </h2>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#444' }}>
                  متجر بيجامات نسائية وملابس منزلية
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '12px', direction: 'ltr' }}>
                  رقم الوصل: #{showReceiptModal.ticketId}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '6px' }}>
                  التاريخ: {showReceiptModal.dateFormatted}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000', borderTop: '1.5px solid #000' }}>
                      <th style={{ padding: '12px 4px', textAlign: 'right' }}>المنتج</th>
                      <th style={{ padding: '12px 4px' }}>اللون</th>
                      <th style={{ padding: '12px 4px' }}>المقاس</th>
                      <th style={{ padding: '12px 4px', textAlign: 'left' }}>المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showReceiptModal.items.map(item => (
                      <tr key={item.cartItemId} style={{ borderBottom: '1.5px dashed #aaa' }}>
                        <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 700 }}>{item.title}</td>
                        <td style={{ padding: '12px 4px' }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{item.selectedColor || '—'}</span></td>
                        <td style={{ padding: '12px 4px', fontWeight: 800 }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{item.selectedSize} {item.qty > 1 ? `(x${item.qty})` : ''}</span></td>
                        <td style={{ padding: '12px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{(item.price * item.qty).toLocaleString('fr-DZ')} د.ج</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Discount if exists */}
              {showReceiptModal.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#D32F2F', marginBottom: '12px', padding: '4px 0' }}>
                  <span>تخفيض للزبون (Remise):</span>
                  <span style={{ direction: 'ltr' }}>- {showReceiptModal.discount.toLocaleString('fr-DZ')} د.ج</span>
                </div>
              )}

              {/* Total */}
              <table style={{ width: '100%', fontSize: '1.3rem', fontWeight: 900, borderTop: '2px dashed #333', marginTop: '8px', marginBottom: '8px' }}>
                <tbody>
                  <tr>
                    <td style={{ paddingTop: '12px', border: 'none', textAlign: 'right' }}>المجموع الإجمالي:</td>
                    <td style={{ paddingTop: '12px', border: 'none', textAlign: 'left', direction: 'ltr' }}>{showReceiptModal.total.toLocaleString('fr-DZ')} د.ج</td>
                  </tr>
                </tbody>
              </table>

              {/* Notice Box */}
              <div style={{ border: '1.5px dashed #444', borderRadius: '8px', padding: '8px', textAlign: 'center', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '8px', background: '#F9F9F9' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>تنبيه:</strong>
                السلع المباعة تُستبدل ولا تُرد خلال مدة أقصاها 48 ساعة من تاريخ الاستلام، مع إحضار فاتورة الشراء.
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', fontSize: '0.85rem', lineHeight: '2', marginBottom: '24px' }}>
                <div style={{ fontWeight: 800 }}>شكراً لثقتكم بـ Pyjama DZ!</div>
                <div style={{ color: '#555' }}>لأي استفسار يرجى الاتصال بنا على:</div>
                <div style={{ fontWeight: 800, direction: 'ltr', fontSize: '1.1rem', marginTop: '4px' }}>{Array.isArray(settings?.phoneOrders) ? settings.phoneOrders.join(' - ') : (settings?.phoneOrders || settings?.whatsapp || "0555 12 34 56")}</div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>Instagram: {(settings?.instagramUrl || "@pyjama_dz").replace('https://www.instagram.com/', '@').replace('https://instagram.com/', '@').replace(/\/$/, '')}</div>
                <div style={{ color: '#555', marginTop: '10px' }}>مرحبا بكم في أي وقت ❤️</div>
              </div>
            </div>

            <div className="no-print" style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowReceiptModal(null)}
                style={{ flex: 1, padding: '12px', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                إغلاق والتالي
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                style={{ flex: 2, padding: '12px', background: '#0284C7', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Printer size={18} /> طباعة التذكرة الآن (Imprimer)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS specific for Cashier Ticket */}
      {/* Cashier History Modal */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
                <Clock size={20} color="#0284C7" />
                سجل طلبيات المحل
              </h3>
              <button onClick={() => { setShowHistoryModal(false); setSelectedHistoryOrder(null); setReturnConfirmationId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={24} />
              </button>
            </div>
            
            {selectedHistoryOrder ? (
              <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
                <button onClick={() => { setSelectedHistoryOrder(null); setReturnConfirmationId(null); }} style={{ background: 'none', border: 'none', color: '#0284C7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, marginBottom: '20px', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#F0F9FF' }}>
                  <ArrowRight size={18} /> العودة للقائمة
                </button>
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #CBD5E1', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.5rem', fontWeight: 900 }}>طلبية #{selectedHistoryOrder.ticketNumber || selectedHistoryOrder.id.toString().substring(0, 8)}</h2>
                      <div style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '6px', fontWeight: 600 }}>{selectedHistoryOrder.date}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--burgundy)' }}>{(selectedHistoryOrder.price || 0).toLocaleString()} DA</div>
                      <div style={{ marginTop: '8px' }}>
                          {selectedHistoryOrder.status === 'livree' ? (
                            <span style={{ background: '#D1FAE5', color: '#065F46', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 800, border: '1px solid #A7F3D0' }}>🚚 مستلمة</span>
                          ) : selectedHistoryOrder.status === 'retour' ? (
                            <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 800, border: '1px solid #FECACA' }}>↩️ مسترجعة</span>
                          ) : (
                            <span style={{ background: '#F3F4F6', color: '#374151', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 800, border: '1px solid #E5E7EB' }}>{selectedHistoryOrder.status}</span>
                          )}
                      </div>
                    </div>
                  </div>
                  
                  <h3 style={{ fontSize: '1.15rem', color: '#1E293B', marginBottom: '16px', fontWeight: 800 }}>المنتجات:</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {selectedHistoryOrder.items?.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: '#FFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ background: '#F1F5F9', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                            <Package size={24} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.05rem', marginBottom: '4px' }}>{item.product}</div>
                            {item.isDiscount ? null : (
                              <div style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>{item.color} - {item.size}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A' }}>{item.price.toLocaleString()} DA</div>
                          <div style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>الكمية: {item.qty}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #CBD5E1', paddingTop: '20px', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowReceiptModal({ ticketId: selectedHistoryOrder.ticketNumber || selectedHistoryOrder.id.toString().substring(0, 8), dateFormatted: selectedHistoryOrder.date, cart: selectedHistoryOrder.items || [] })} style={{ background: '#FFF', color: '#0F172A', border: '2px solid #E2E8F0', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                      <Printer size={20} /> طباعة التذكرة
                    </button>
                    {selectedHistoryOrder.status === 'livree' && (
                      returnConfirmationId === selectedHistoryOrder.id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { handleConfirmRetour(selectedHistoryOrder); setSelectedHistoryOrder(null); setReturnConfirmationId(null); }} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239,68,68,0.2)' }}>تأكيد الإرجاع</button>
                          <button onClick={() => setReturnConfirmationId(null)} style={{ background: '#F1F5F9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>إلغاء</button>
                        </div>
                      ) : (
                        <button onClick={() => setReturnConfirmationId(selectedHistoryOrder.id)} style={{ background: '#FEF2F2', color: '#DC2626', border: '2px solid #FECACA', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                          <ArrowRight size={20} /> استرجاع الطلبية (Retour)
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="ابحث برقم الطلبية..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.9rem' }}>
                        <th style={{ padding: '12px 8px' }}>رقم الطلبية</th>
                        <th style={{ padding: '12px 8px' }}>التاريخ</th>
                        <th style={{ padding: '12px 8px' }}>المبلغ</th>
                        <th style={{ padding: '12px 8px' }}>الحالة</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .filter(o => o.isPos === true || o.orderType === 'hanoot' || (o.clientName && o.clientName.includes('زبون المحل')))
                        .filter(o => {
                          if (!historySearch) return true;
                          const term = historySearch.toLowerCase().trim();
                          const displayedId = (o.ticketNumber || o.id.toString().substring(0, 8)).toString().toLowerCase();
                          return displayedId.includes(term);
                        })
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(o => (
                          <tr 
                            key={o.id} 
                            style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            onClick={() => setSelectedHistoryOrder(o)}
                          >
                            <td style={{ padding: '12px 8px', fontWeight: 800, textTransform: 'uppercase' }}>#{o.ticketNumber || o.id.toString().substring(0, 8)}</td>
                            <td style={{ padding: '12px 8px', color: '#64748B', fontSize: '0.9rem' }}>{o.date}</td>
                            <td style={{ padding: '12px 8px', fontWeight: 800, color: '#0F172A' }}>{(o.price || 0).toLocaleString()} DA</td>
                            <td style={{ padding: '12px 8px' }}>
                              {o.status === 'livree' ? (
                                <span style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>🚚 مستلمة</span>
                              ) : o.status === 'retour' ? (
                                <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>↩️ مسترجعة</span>
                              ) : (
                                <span style={{ background: '#F3F4F6', color: '#374151', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>{o.status}</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <button style={{ background: '#F8FAFC', color: '#0284C7', border: '1px solid #BAE6FD', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                التفاصيل
                              </button>
                            </td>
                          </tr>
                        ))}
                      {orders.filter(o => o.isPos === true || o.orderType === 'hanoot' || (o.clientName && o.clientName.includes('زبون المحل'))).length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>لا توجد طلبيات مسجلة في المحل</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`
        @media print {
          @page {
            margin: 0 !important;
            padding: 0 !important;
          }
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFF !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          .receipt-print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: auto !important;
            bottom: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            background: #FFF !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 9999999 !important;
            overflow: visible !important;
          }
          .receipt-print-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: auto !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            max-height: none !important;
            overflow: visible !important;
            background: #FFF !important;
            color: #000 !important;
          }
          #print-ticket-area, #print-ticket-area * {
            visibility: visible !important;
          }
          #print-ticket-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8px !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}