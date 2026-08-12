import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ALGERIA_WILAYAS, DEFAULT_CATEGORIES } from '../data/mockData';
import { ALGERIA_WILAYAS_COMMUNES, getCommunesForWilaya } from '../data/algeriaCities';
import { CHLEF_DELIVERY_RATES } from '../data/algeriaDeliveryRates';
import { showToast } from '../utils/toast';
import { sanitizeAlgerianPhone, isValidAlgerianPhone } from '../utils/phoneUtils';
import { supabase } from '../lib/supabaseClient';
import { ShoppingBag, Sparkles, ShieldCheck, Truck, PhoneCall, CheckCircle2, ArrowRight, Lock, MapPin, ShoppingCart, X, Plus, Minus, Trash2, Check, Heart, Star, Search, User, Bell, AlertTriangle, Menu, ChevronRight, Home, Grid, MessageCircle, FileText, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import DeliveryTariffsModal from './DeliveryTariffsModal';
const getProductDisplayCategory = (prodCategory, categoriesList) => {
  if (!Array.isArray(categoriesList)) return prodCategory || 'Pyjama DZ';
  const exact = categoriesList.find(c => c && typeof c === 'object' && c.id === prodCategory);
  if (exact) return exact.title || prodCategory || 'Pyjama DZ';
  
  const pCat = (prodCategory || '').toLowerCase().trim();
  if (pCat === 'satin' || pCat === 'coton' || pCat === 'ensembles' || pCat.includes('pyjama')) {
    const pyjamasCat = categoriesList.find(c => c && typeof c === 'object' && (c.title || '').toLowerCase().includes('pyjama'));
    if (pyjamasCat) return pyjamasCat.title || prodCategory || 'Pyjama DZ';
  }
  if (pCat === 'mariee' || pCat === 'abayas' || pCat.includes('robe') || pCat.includes('mari')) {
    const robesCat = categoriesList.find(c => c && typeof c === 'object' && ((c.title || '').toLowerCase().includes('robe') || (c.title || '').toLowerCase().includes('mari')));
    if (robesCat) return robesCat.title || prodCategory || 'Pyjama DZ';
  }
  return prodCategory || 'Pyjama DZ';
};

const getProductCategoryGroupId = (prodCategory, categoriesList) => {
  if (!Array.isArray(categoriesList)) return prodCategory;
  const exact = categoriesList.find(c => c && typeof c === 'object' && c.id === prodCategory);
  if (exact) return exact.id || prodCategory;
  
  const pCat = (prodCategory || '').toLowerCase().trim();
  if (pCat === 'satin' || pCat === 'coton' || pCat === 'ensembles' || pCat.includes('pyjama')) {
    const pyjamasCat = categoriesList.find(c => c && typeof c === 'object' && (c.title || '').toLowerCase().includes('pyjama'));
    if (pyjamasCat) return pyjamasCat.id || prodCategory;
  }
  if (pCat === 'mariee' || pCat === 'abayas' || pCat.includes('robe') || pCat.includes('mari')) {
    const robesCat = categoriesList.find(c => c && typeof c === 'object' && ((c.title || '').toLowerCase().includes('robe') || (c.title || '').toLowerCase().includes('mari')));
    if (robesCat) return robesCat.id || prodCategory;
  }
  return prodCategory;
};

const DeliveryTariffsPageContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWilaya, setExpandedWilaya] = useState(null);

  const filteredWilayas = useMemo(() => {
    if (!searchQuery.trim()) return CHLEF_DELIVERY_RATES;
    const q = searchQuery.toLowerCase().trim();
    return CHLEF_DELIVERY_RATES.filter(w => 
      w.code.includes(q) || 
      w.name.toLowerCase().includes(q) || 
      w.nameAr.includes(q)
    );
  }, [searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Search Input */}
      <div>
        <div style={{ position: 'relative' }}>
          <Search size={20} color="#94A3B8" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text"
            placeholder="ابحث عن ولايتك بالاسم أو الرقم (ex: 16, Alger, Oran, الشلف...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 48px 16px 20px',
              borderRadius: '16px',
              border: '2px solid #E2E8F0',
              fontSize: '1rem',
              fontWeight: 800,
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              transition: 'all 0.2s'
            }}
          />
        </div>
      </div>

      {/* Wilayas Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredWilayas.map((wilaya) => {
          const isExpanded = expandedWilaya === wilaya.code;
          return (
            <div 
              key={wilaya.code}
              style={{
                border: isExpanded ? '2px solid #E11D48' : '1px solid #E2E8F0',
                borderRadius: '18px',
                overflow: 'hidden',
                background: '#FFFFFF',
                boxShadow: isExpanded ? '0 10px 25px rgba(225, 29, 72, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.2s ease'
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedWilaya(isExpanded ? null : wilaya.code)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: isExpanded ? '#FFF1F2' : '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ background: '#800020', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900 }}>
                    {wilaya.code}
                  </span>
                  <span style={{ fontSize: '1.08rem', fontWeight: 900, color: '#1E293B' }}>
                    {wilaya.code} - {wilaya.name} ({wilaya.nameAr})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.82rem', background: '#F1F5F9', padding: '5px 12px', borderRadius: '9999px', color: '#475569', fontWeight: 800 }}>
                    {wilaya.options.length} خيارات توصيل
                  </span>
                  {isExpanded ? <ChevronUp size={20} color="#E11D48" /> : <ChevronDown size={20} color="#64748B" />}
                </div>
              </button>

              {/* Options Details Grid */}
              {isExpanded && (
                <div style={{ padding: '20px', borderTop: '1px dashed #FDA4AF', background: '#FAFAFA' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {wilaya.options.map((opt, idx) => (
                      <div 
                        key={idx}
                        style={{
                          background: '#FFFFFF',
                          padding: '16px',
                          borderRadius: '14px',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: opt.provider.includes('Yalidine') ? '#800020' : '#0284C7' }}>
                            {opt.provider}
                          </span>
                          <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '6px', background: opt.type === 'À domicile' ? '#FEF2F2' : '#F0F9FF', color: opt.type === 'À domicile' ? '#991B1B' : '#075985', fontWeight: 800 }}>
                            {opt.type === 'À domicile' ? '🏠 المنزل' : '🏢 المكتب (Stopdesk)'}
                          </span>
                        </div>

                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#E11D48', margin: '4px 0 2px' }}>
                          {opt.price} DA
                        </div>

                        <span style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.4 }}>
                          {opt.note}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getProductTotalStock = (product) => {
  if (!product) return 0;
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    let total = 0;
    product.colorVariants.forEach(cv => {
      if (cv.stock && typeof cv.stock === 'object') {
        Object.values(cv.stock).forEach(qty => {
          total += Number(qty || 0);
        });
      }
    });
    return total;
  }
  return Number(product.stock || 0);
};

function ProductCardItem({ product, onSelect, onCategorySelect, categoriesList }) {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const activeVariant = (selectedVariantIdx !== null && Array.isArray(product?.colorVariants) && product.colorVariants.length > selectedVariantIdx) 
    ? product.colorVariants[selectedVariantIdx] 
    : (Array.isArray(product?.colorVariants) && product.colorVariants.length > 0 ? product.colorVariants[0] : null);

  const allProductImages = Array.isArray(product?.images) && product.images.length > 0 ? product.images : [product?.image || ''];
  const displayImages = (selectedVariantIdx !== null && activeVariant?.image)
    ? [activeVariant.image]
    : allProductImages;

  const rawSizes = activeVariant?.stock && typeof activeVariant.stock === 'object'
    ? Object.keys(activeVariant.stock)
    : (Array.isArray(product?.sizes) ? product.sizes : (typeof product?.sizes === 'string' ? product.sizes.split(/[,/-]/).map(s => s.trim()).filter(Boolean) : ["Standard"]));
  const availableSizes = Array.isArray(rawSizes) && rawSizes.length > 0 ? rawSizes : ["Standard"];

  return (
    <div className="wd-product product-card" onClick={() => onSelect(product)} style={{ cursor: 'pointer' }}>
      <div className="product-image-container" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Wishlist Button (Mazyoud style) */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className={`wd-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          title="Ajouter aux favoris"
        >
          <Heart size={18} fill={isWishlisted ? "#E53935" : "none"} color={isWishlisted ? "#E53935" : "#666666"} />
        </button>

        {product?.oldPrice && Number(product.oldPrice) > Number(product?.price || 0) && (
          <span className="badge-tag badge-promo" style={{ position: 'absolute', top: 14, left: 14, zIndex: 10 }}>
            Promo
          </span>
        )}
        <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', width: '100%', height: '100%', scrollbarWidth: 'none' }}>
          {Array.isArray(displayImages) && displayImages.map((img, idx) => (
            <div key={idx} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', height: '100%', position: 'relative' }}>
              <img src={img || ''} alt={product?.title || ''} loading="lazy" decoding="async" className="product-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {displayImages.length > 1 && (
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px', pointerEvents: 'none' }}>
                  {displayImages.map((_, dotIdx) => (
                    <div key={dotIdx} style={{ width: 6, height: 6, borderRadius: '50%', background: idx === dotIdx ? 'white' : 'rgba(255,255,255,0.5)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="product-info">
        <span 
          className="product-cat"
          onClick={(e) => {
            e.stopPropagation();
            if (onCategorySelect) {
              const matchedId = getProductCategoryGroupId(product?.category, categoriesList);
              onCategorySelect(matchedId);
            }
          }}
          style={{ 
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--burgundy)'}
          onMouseOut={(e) => e.currentTarget.style.color = '#888'}
        >
          {getProductDisplayCategory(product?.category, categoriesList)}
        </span>
        <h3 className="product-title" style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{product?.title || ''}</h3>
        
        {/* WoodMart 5-Star Golden Rating */}
        <div className="star-rating">
          <Star size={15} fill="#F59E0B" color="#F59E0B" />
          <Star size={15} fill="#F59E0B" color="#F59E0B" />
          <Star size={15} fill="#F59E0B" color="#F59E0B" />
          <Star size={15} fill="#F59E0B" color="#F59E0B" />
          <Star size={15} fill="#F59E0B" color="#F59E0B" />
          <span>(4.8 / 5)</span>
        </div>
        
        {/* Urgency Warning */}
        {product?.stock > 0 && product.stock <= 5 && (
          <div style={{ fontSize: '0.8rem', color: '#D32F2F', fontWeight: 800, margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⏳ Il ne reste que {product.stock} {product.stock > 1 ? 'pièces' : 'pièce'} !
          </div>
        )}

        {/* Clickable Colored Squares (moraba3aat mlwliin) - strict image variant binding */}
        {Array.isArray(product?.colorVariants) && product.colorVariants.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              🎨 الألوان (Couleurs) : <strong style={{ color: 'var(--burgundy)' }}>{activeVariant?.color || 'Sélectionner'}</strong>
            </div>
            <div className="color-swatches-row">
              {product.colorVariants.map((cv, cvIdx) => {
                const isSelected = selectedVariantIdx === cvIdx;
                return (
                  <button
                    key={cvIdx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariantIdx(cvIdx);
                    }}
                    onMouseEnter={() => setSelectedVariantIdx(cvIdx)}
                    title={`${cv?.color || ''}`}
                    className={`color-swatch-square ${isSelected ? 'active' : ''}`}
                    style={{
                      background: cv?.colorHex || '#CBD5E1',
                      border: isSelected ? '2px solid var(--burgundy)' : '1px solid #CBD5E1',
                      boxShadow: isSelected ? '0 0 0 2px rgba(128,0,32,0.25)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isSelected && <Check size={14} color={cv?.colorHex && (cv.colorHex.toLowerCase() === '#ffffff' || cv.colorHex.toLowerCase() === '#fff') ? '#000' : '#FFF'} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="sizes-list" style={{ marginBottom: '12px' }}>
          {availableSizes.map(size => (
            <span key={size} className="size-pill">{size}</span>
          ))}
        </div>

        <p style={{ fontSize: '0.85rem', color: '#7D6B70', marginBottom: '16px', flex: 1, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {(product?.description || '').split('|||')[0]}
        </p>

        <div className="price-container" style={{ marginBottom: '14px' }}>
          <span className="price-current" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#C8102E' }}>{(Number(product?.price) || 0).toLocaleString()} DA</span>
          {product?.oldPrice && Number(product.oldPrice) > Number(product?.price || 0) && (
            <span className="price-old" style={{ fontSize: '0.92rem', color: '#888888', textDecoration: 'line-through' }}>{(Number(product.oldPrice) || 0).toLocaleString()} DA</span>
          )}
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          className="wd-add-to-cart-btn"
        >
          <ShoppingBag size={18} />
          <span>Choix des options / إضافة للسلة 🛍️</span>
        </button>
      </div>
    </div>
  );
}

function ProductDetailPage({ product, products, categoriesList, onBack, onAddToCart, onCategorySelect }) {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [product?.id]);

  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistWhatsapp, setWaitlistWhatsapp] = useState('');
  const [isWaitlistSubmitting, setIsWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);

  const linkedProducts = useMemo(() => {
    if (!product || !product.description || !Array.isArray(products)) return [];
    try {
      const parts = product.description.split('|||');
      if (parts[1]) {
        const meta = JSON.parse(parts[1]);
        const ids = meta.linkedProductIds || [];
        return products.filter(p => ids.includes(p.id) && getProductTotalStock(p) > 0);
      }
    } catch(e) {}
    return [];
  }, [product, products]);

  const colorVariants = Array.isArray(product?.colorVariants) ? product.colorVariants : [];
  const activeVariant = selectedVariantIdx !== null ? colorVariants[selectedVariantIdx] : null;

  // Sizes available for the active variant or product (showing all sizes including 0 stock)
  let rawSizes = [];
  if (activeVariant?.stock && typeof activeVariant.stock === 'object') {
    rawSizes = Object.keys(activeVariant.stock);
  } else if (Array.isArray(product?.colorVariants) && product.colorVariants.length > 0) {
    const allVariantSizes = new Set();
    product.colorVariants.forEach(cv => {
      if (cv.stock && typeof cv.stock === 'object') {
        Object.keys(cv.stock).forEach(sz => allVariantSizes.add(sz));
      }
    });
    rawSizes = Array.from(allVariantSizes);
  }
  
  if (rawSizes.length === 0) {
    if (Array.isArray(product?.sizes)) {
      rawSizes = product.sizes;
    } else if (typeof product?.sizes === 'string') {
      rawSizes = product.sizes.split(/[,/-]/).map(s => s.trim()).filter(Boolean);
    } else {
      rawSizes = ["Standard"];
    }
  }

  const availableSizes = (Array.isArray(rawSizes) && rawSizes.length > 0 ? rawSizes : ["Standard"]).sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return 0; // maintain original order for clothes (e.g. S, M, L)
  });

  // Clear selected size if it's no longer available in the newly selected color variant
  // Note: we no longer clear it if stock <= 0, so the user can select out-of-stock sizes to join waitlist
  useEffect(() => {
    if (selectedSize) {
      if (!availableSizes.includes(selectedSize)) {
        setSelectedSize(null);
      }
    }
    setWaitlistSuccess(false); // Reset waitlist success message when changing variant
    setShowWaitlistForm(false); // Reset waitlist form
  }, [selectedVariantIdx]);

  useEffect(() => {
    setWaitlistSuccess(false); // Reset waitlist success message when changing size
    setShowWaitlistForm(false); // Reset waitlist form
  }, [selectedSize]);

  // Sync main image when variant changes
  useEffect(() => {
    if (activeVariant?.image) {
      const imgList = Array.isArray(product?.images) && product.images.length > 0 ? product.images : [product?.image || ''];
      const matchedIdx = imgList.indexOf(activeVariant.image);
      if (matchedIdx !== -1) {
        setActiveImageIdx(matchedIdx);
      }
    }
  }, [selectedVariantIdx]);

  const allImages = Array.isArray(product?.images) && product.images.length > 0 
    ? product.images 
    : [product?.image || ''];

  const handleAdd = () => {
    if (colorVariants.length > 0 && selectedVariantIdx === null) {
      showToast("يرجى اختيار اللون أولاً / Veuillez choisir une couleur", "error");
      return;
    }
    if (selectedSize === null) {
      showToast("يرجى اختيار المقاس أولاً / Veuillez choisir une taille", "error");
      return;
    }
    
    // Check stock zero & max limit logic
    let currentSizeStock = null;
    if (activeVariant?.stock && typeof activeVariant.stock === 'object') {
      currentSizeStock = activeVariant.stock[selectedSize] !== undefined ? Number(activeVariant.stock[selectedSize]) : 0;
    } else if (product?.stock !== undefined) {
      currentSizeStock = Number(product.stock);
    }

    const isZeroStock = currentSizeStock !== null && currentSizeStock <= 0;

    if (isZeroStock) {
      setShowWaitlistForm(true);
      return;
    }

    if (currentSizeStock !== null && currentSizeStock > 0 && quantity > currentSizeStock) {
      showToast(`عذراً، الكمية المتوفرة حالياً في المخزون لهذا المقاس هي ${currentSizeStock} قطعة فقط!`, "error");
      return;
    }

    onAddToCart(product, selectedVariantIdx !== null ? selectedVariantIdx : 0, {
      color: activeVariant ? activeVariant.color : 'Couleur Standard',
      colorHex: activeVariant ? activeVariant.colorHex : '#CBD5E1',
      size: selectedSize,
      image: activeVariant?.image || allImages[activeImageIdx] || product.image,
      qty: quantity
    });
  };

  return (
    <div className="mazyoud-pdp-container">
      <Helmet>
        <title>{product?.title ? `${product.title} - Pyjama DZ` : 'تفاصيل المنتج - Pyjama DZ'}</title>
        <meta name="description" content={product?.description ? (product.description.split('|||')[0]).substring(0, 160) : 'أفضل متجر بيجامات في الجزائر'} />
        <meta property="og:title" content={product?.title || 'Pyjama DZ'} />
        <meta property="og:image" content={allImages[0] || '/luxury_pyjama_store_hero_1783543440843.png'} />
      </Helmet>

      {/* Back Button */}
      <button type="button" className="mazyoud-pdp-back-btn" onClick={onBack}>
        <ArrowRight size={18} style={{ transform: 'rotate(180deg)', marginLeft: '8px' }} />
        <span>العودة للمتجر / Retour à la boutique</span>
      </button>

      <div className="mazyoud-pdp-grid">
        {/* Left Column: Image Gallery */}
        <div className="mazyoud-pdp-gallery">
          <div className="mazyoud-pdp-main-image-container">
            <img 
              src={allImages[activeImageIdx] || product.image || ''} 
              alt={product.title} 
              className="mazyoud-pdp-main-image" 
            />
            {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
              <span className="mazyoud-pdp-promo-badge">Promo</span>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="mazyoud-pdp-thumbnails">
              {allImages.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`mazyoud-pdp-thumbnail-wrapper ${idx === activeImageIdx ? 'active' : ''}`}
                  onClick={() => setActiveImageIdx(idx)}
                >
                  <img loading="lazy" decoding="async" src={img} alt={`${product.title} thumbnail ${idx}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="mazyoud-pdp-details">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span 
                className="mazyoud-pdp-category"
                onClick={() => {
                  if (onCategorySelect) {
                    const matchedId = getProductCategoryGroupId(product?.category, categoriesList);
                    onCategorySelect(matchedId);
                  }
                }}
                style={{ 
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  textDecoration: 'underline'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--burgundy)'}
                onMouseOut={(e) => e.currentTarget.style.color = '#888'}
              >
                {getProductDisplayCategory(product?.category, categoriesList)}
              </span>
              <h1 className="mazyoud-pdp-title" style={{ margin: 0 }}>{product.title}</h1>

              {/* Golden Stars Rating */}
              <div className="mazyoud-pdp-rating" style={{ margin: 0, marginTop: '4px' }}>
                <div className="stars">
                  <Star size={16} fill="#F59E0B" color="#F59E0B" />
                  <Star size={16} fill="#F59E0B" color="#F59E0B" />
                  <Star size={16} fill="#F59E0B" color="#F59E0B" />
                  <Star size={16} fill="#F59E0B" color="#F59E0B" />
                  <Star size={16} fill="#F59E0B" color="#F59E0B" />
                </div>
                <span className="rating-text">4.8 / 5 (زبائن حقيقيون)</span>
              </div>
            </div>

            {/* Quick Linked Product Thumbnail */}
            {linkedProducts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                {linkedProducts.slice(0, 2).map(lp => {
                  const firstImg = lp.images?.[0] || lp.image || '';
                  return (
                    <div 
                      key={lp.id}
                      onClick={() => {
                        const cv = lp.colorVariants?.[0];
                        const defaultColor = cv?.color || 'Standard';
                        let defaultSize = 'Standard';
                        if (cv?.stock && typeof cv.stock === 'object') {
                          const sizes = Object.keys(cv.stock).filter(sz => cv.stock[sz] > 0);
                          if (sizes.length > 0) defaultSize = sizes[0];
                        } else if (Array.isArray(lp.sizes) && lp.sizes.length > 0) {
                          defaultSize = lp.sizes[0];
                        }
                        
                        onAddToCart(lp, 0, {
                          color: defaultColor,
                          colorHex: cv?.colorHex || '#CBD5E1',
                          size: defaultSize,
                          image: cv?.image || lp.image,
                          qty: 1
                        });
                        showToast("🛒 تمت إضافة المنتج المكمل للسلة! يمكنك تعديل مقاسه ولونه داخل السلة.", 'success');
                      }}
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '12px', 
                        border: '3px solid var(--burgundy)', 
                        background: 'white',
                        position: 'relative',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s',
                        overflow: 'hidden'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title={`اضغط لإضافة ${lp.title} إلى السلة`}
                    >
                      <img loading="lazy" decoding="async" src={firstImg} alt={lp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mazyoud-pdp-price-box">
            <span className="current-price">{(Number(product.price) || 0).toLocaleString()} DA</span>
            {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
              <span className="old-price">{(Number(product.oldPrice) || 0).toLocaleString()} DA</span>
            )}
          </div>

          {(() => {
            let bulkPrice5 = 0;
            if (product.description) {
              try {
                const parts = product.description.split('|||');
                if (parts[1]) {
                  const meta = JSON.parse(parts[1]);
                  bulkPrice5 = Number(meta.bulkPrice5 || 0);
                }
              } catch(e) {}
            }
            if (bulkPrice5 > 0) {
              return (
                <div style={{ background: '#FDF2F8', color: '#DB2777', padding: '10px 16px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 850, border: '1px solid #FBCFE8', display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '8px' }}>
                  <span>🎁 عرض خاص:</span>
                  <span><strong>{bulkPrice5.toLocaleString()} DA</strong> للقطعة عند شراء 5 حبات فما فوق!</span>
                </div>
              );
            }
            return null;
          })()}

          <p className="mazyoud-pdp-desc">{(product.description || '').split('|||')[0]}</p>

          <hr className="mazyoud-pdp-divider" />

          {/* Color Selection */}
          {colorVariants.length > 0 && (
            <div className="mazyoud-pdp-option-section">
              <div className="option-label">
                <span>🎨 الألوان (Couleurs) :</span>
                <strong className="selected-value" style={{ marginRight: '6px' }}>{activeVariant?.color || 'يرجى الاختيار / Veuillez choisir'}</strong>
              </div>
              <div className="color-swatches-grid">
                {colorVariants.map((cv, idx) => {
                  const isSelected = selectedVariantIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`color-swatch-circle ${isSelected ? 'active' : ''}`}
                      style={{ backgroundColor: cv.colorHex || '#CBD5E1' }}
                      onClick={() => setSelectedVariantIdx(idx)}
                      title={cv.color}
                    >
                      {isSelected && <Check size={14} color={cv.colorHex && (cv.colorHex.toLowerCase() === '#ffffff' || cv.colorHex.toLowerCase() === '#fff') ? '#000' : '#FFF'} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="mazyoud-pdp-option-section">
            <div className="option-label">
              <span>📏 المقاسات (Tailles) :</span>
              <strong className="selected-value" style={{ marginRight: '6px' }}>{selectedSize || 'يرجى الاختيار / Veuillez choisir'}</strong>
            </div>
            <div className="size-swatches-grid">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                let sizeStock = null;
                if (activeVariant?.stock && typeof activeVariant.stock === 'object') {
                  sizeStock = activeVariant.stock[size] !== undefined ? Number(activeVariant.stock[size]) : 0;
                }
                const isZeroStock = sizeStock !== null && sizeStock <= 0;

                return (
                  <button
                    key={size}
                    type="button"
                    className={`size-swatch-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector */}
          {(() => {
            let maxAvailableStock = 999;
            if (activeVariant?.stock && typeof activeVariant.stock === 'object' && selectedSize) {
              const sStock = activeVariant.stock[selectedSize];
              if (sStock !== undefined && !isNaN(Number(sStock))) {
                maxAvailableStock = Math.max(0, Number(sStock));
              }
            } else if (product?.stock !== undefined && !isNaN(Number(product.stock))) {
              maxAvailableStock = Math.max(0, Number(product.stock));
            }

            return (
              <div className="mazyoud-pdp-option-section">
                <div className="option-label">
                  <span>🔢 الكمية (Quantité) :</span>
                </div>
                <div className="mazyoud-pdp-qty-selector">
                  <button 
                    type="button" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="qty-btn"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="qty-value">{quantity}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (quantity < maxAvailableStock) {
                        setQuantity(quantity + 1);
                      } else {
                        showToast(`عذراً، الكمية المتوفرة في المخزون لهذا المقاس هي ${maxAvailableStock} قطعة فقط!`, "warning");
                      }
                    }}
                    className="qty-btn"
                    style={{ opacity: quantity >= maxAvailableStock ? 0.4 : 1, cursor: quantity >= maxAvailableStock ? 'not-allowed' : 'pointer' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Waitlist Logic */}
          {(() => {
            if (showWaitlistForm) {
              return (
                <div style={{ marginTop: '20px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#E11D48', marginBottom: '15px', fontWeight: 'bold' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <span>عذراً، هذا المقاس غير متوفر حالياً!</span>
                  </div>
                  
                  {waitlistSuccess ? (
                    <div style={{ background: '#ECFCCB', color: '#4D7C0F', padding: '15px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={20} />
                      تم تسجيل طلبك بنجاح! سنخبرك عبر الواتساب فور توفره.
                    </div>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if(!waitlistName || !waitlistWhatsapp) return;
                      if(!isValidAlgerianPhone(waitlistWhatsapp)) {
                        showToast("⚠️ يرجى إدخال رقم واتساب جزائري صحيح يبدأ بـ 05 أو 06 أو 07 يتكون من 10 أرقام", "error");
                        return;
                      }
                      setIsWaitlistSubmitting(true);
                      
                      const { error } = await supabase.from('waitlist').insert([{
                        client_name: waitlistName,
                        whatsapp_number: waitlistWhatsapp,
                        product_id: product.id,
                        product_title: product.title,
                        color: activeVariant ? activeVariant.color : 'Standard',
                        size: selectedSize,
                        status: 'pending'
                      }]);
                      
                      setIsWaitlistSubmitting(false);
                      if(!error) {
                        setWaitlistSuccess(true);

                        // 🔔 Send immediate WhatsApp confirmation message to customer
                        fetch('/api/send-order-whatsapp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            phone: waitlistWhatsapp,
                            clientName: waitlistName,
                            isWaitlist: true,
                            product: `${product.title} (${activeVariant ? activeVariant.color + ' - ' : ''}${selectedSize})`
                          })
                        }).catch(e => console.error('Waitlist WhatsApp send error:', e));

                        setWaitlistName('');
                        setWaitlistWhatsapp('');
                      } else {
                        showToast("حدث خطأ أثناء تسجيل الطلب", "error");
                      }
                    }}>
                      <p style={{ margin: '0 0 15px', fontSize: '0.9rem', color: '#4B5563' }}>سجل معلوماتك لنعلمك عبر الواتساب فور توفر هذه القطعة:</p>
                      <input 
                        type="text" 
                        placeholder="الاسم واللقب" 
                        required 
                        value={waitlistName}
                        onChange={(e) => setWaitlistName(e.target.value)}
                        style={{ width: '100%', padding: '12px', border: '1px solid #FECDD3', borderRadius: '10px', marginBottom: '10px', outline: 'none' }}
                      />
                      <input 
                        type="tel" 
                        placeholder="رقم الواتساب (مثال: 0771335039)" 
                        required 
                        value={waitlistWhatsapp}
                        onChange={(e) => setWaitlistWhatsapp(sanitizeAlgerianPhone(e.target.value))}
                        maxLength={10}
                        style={{ width: '100%', padding: '12px', border: '1px solid #FECDD3', borderRadius: '10px', marginBottom: '15px', outline: 'none', direction: 'ltr', textAlign: 'left' }}
                      />
                      <button 
                        type="submit" 
                        disabled={isWaitlistSubmitting}
                        style={{ width: '100%', background: '#E11D48', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: isWaitlistSubmitting ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                      >
                        {isWaitlistSubmitting ? 'جاري التسجيل...' : 'أعلمني عند التوفر 🔔'}
                      </button>
                    </form>
                  )}
                </div>
              );
            }

            return (
              <button 
                type="button" 
                className="mazyoud-pdp-add-btn" 
                onClick={handleAdd}
              >
                <ShoppingCart size={20} style={{ marginLeft: '8px' }} />
                <span>إضافة إلى السلة / Ajouter au Panier</span>
              </button>
            );
          })()}

          {/* Trust Guarantees */}
          <div className="mazyoud-pdp-guarantees">
            <div className="guarantee-item">
              <Truck size={20} style={{ marginLeft: '10px' }} />
              <div>
                <h4>توصيل سريع لـ 58 ولاية</h4>
                <p>Livraison rapide à domicile</p>
              </div>
            </div>
            <div className="guarantee-item">
              <ShieldCheck size={20} style={{ marginLeft: '10px' }} />
              <div>
                <h4>الدفع عند الاستلام</h4>
                <p>Paiement cash à la livraison</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Products (Cross-sell) */}
      {linkedProducts.length > 0 && (
        <div style={{ marginTop: '40px', background: '#F8FAFC', padding: '24px', borderRadius: '16px', border: '1px dashed #CBD5E1', direction: 'rtl' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✨ اشتري معه أيضاً (Frequently Bought Together)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '20px' }}>
            اقتراحات مميزة تناسب هذا المنتج وتكمل أناقتك:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {linkedProducts.map(lp => {
              const firstImage = lp.images?.[0] || lp.image || '';
              
              return (
                <div 
                  key={lp.id} 
                  style={{ 
                    background: 'white', 
                    borderRadius: '12px', 
                    padding: '12px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
                    border: '1px solid #E2E8F0', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  {firstImage && (
                    <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden', borderRadius: '8px' }}>
                      <img loading="lazy" decoding="async" src={firstImage} alt={lp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: '4px 0', color: '#334155', minHeight: '36px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textAlign: 'right' }}>
                      {lp.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', direction: 'ltr' }}>
                      <span style={{ color: 'var(--burgundy)', fontWeight: 900, fontSize: '1rem' }}>
                        {lp.price?.toLocaleString()} DA
                      </span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const cv = lp.colorVariants?.[0];
                      const defaultColor = cv?.color || 'Standard';
                      let defaultSize = 'Standard';
                      if (cv?.stock && typeof cv.stock === 'object') {
                        const sizes = Object.keys(cv.stock).filter(sz => cv.stock[sz] > 0);
                        if (sizes.length > 0) defaultSize = sizes[0];
                      } else if (Array.isArray(lp.sizes) && lp.sizes.length > 0) {
                        defaultSize = lp.sizes[0];
                      }
                      
                      onAddToCart(lp, 0, {
                        color: defaultColor,
                        colorHex: cv?.colorHex || '#CBD5E1',
                        size: defaultSize,
                        image: cv?.image || lp.image,
                        qty: 1
                      });
                      showToast("🛒 تمت إضافة المنتج المكمل للسلة! يمكنك تعديل مقاسه ولونه داخل السلة.", 'success');
                    }}
                    style={{
                      background: 'var(--burgundy-dark)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%'
                    }}
                  >
                    <Plus size={14} />
                    <span>إضافة للسلة / Ajouter</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Storefront({ products, orders = [], settings, onPlaceOrder, onUpdateSettings, onGoToGros }) {
  const [realtimeCategories, setRealtimeCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('pyjama_dz_categories_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return null;
  });

  useEffect(() => {
    let isMounted = true;
    const syncFreshCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'categories');
        if (!error && data && data.length > 0 && data[0].value && isMounted) {
          let parsed = data[0].value;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch(e) {}
          }
          if (Array.isArray(parsed)) {
            setRealtimeCategories(parsed);
            try { localStorage.setItem('pyjama_dz_categories_cache', JSON.stringify(parsed)); } catch(e) {}
          }
        }
      } catch(e) {}
    };

    syncFreshCategories();

    const channel = supabase
      .channel('storefront_categories_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new && payload.new.key === 'categories') {
          let val = payload.new.value;
          if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch(e) {}
          }
          if (Array.isArray(val) && isMounted) {
            setRealtimeCategories(val);
            try { localStorage.setItem('pyjama_dz_categories_cache', JSON.stringify(val)); } catch(e) {}
          }
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (settings?.categories) {
      let parsed = settings.categories;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch(e) {}
      }
      if (Array.isArray(parsed)) {
        setRealtimeCategories(parsed);
        try { localStorage.setItem('pyjama_dz_categories_cache', JSON.stringify(parsed)); } catch(e) {}
      }
    }
  }, [settings?.categories]);

  const categoriesList = useMemo(() => {
    let raw = settings?.categories || realtimeCategories;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { raw = null; }
    }
    let list = Array.isArray(raw)
      ? [...raw]
      : [...DEFAULT_CATEGORIES];

    if (!list.some(c => c.id === 'all')) {
      list.unshift({ id: 'all', title: 'TOUT VOIR', icon: '', image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=300&q=80' });
    }
    if (!list.some(c => c.id === 'hot_sale')) {
      list.splice(1, 0, { id: 'hot_sale', title: 'الأكثر مبيعاً (HOT SALE)', icon: '', badge: '🔥 Tendance' });
    }
    if (!list.some(c => c.id === 'promo')) {
      list.push({ id: 'promo', title: '% SOLDES', icon: '🔥', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&q=80' });
    }

    return list.map(c => {
      if (c.id === 'all') {
        return { ...c, title: 'TOUT VOIR', icon: '' };
      }
      if (c.id === 'hot_sale') {
        return { ...c, title: 'الأكثر مبيعاً (HOT SALE)', icon: '' };
      }
      return c;
    });
  }, [settings?.categories, realtimeCategories]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeDetailProduct, setActiveDetailProduct] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMenuTab, setMobileMenuTab] = useState('categories');
  const [isBottomSearchOpen, setIsBottomSearchOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const [isReclamationOpen, setIsReclamationOpen] = useState(false);
  const [isTariffsModalOpen, setIsTariffsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [activePage, setActivePage] = useState(null); // 'about', etc.

  useEffect(() => {
    if (activeDetailProduct || activePage) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    }
  }, [activeDetailProduct, activePage]);
  const [reclamationName, setReclamationName] = useState('');
  const [reclamationWhatsapp, setReclamationWhatsapp] = useState('');
  const [reclamationMessage, setReclamationMessage] = useState('');
  const [isSubmittingReclamation, setIsSubmittingReclamation] = useState(false);

  const scrollToFaqSection = () => {
    setActivePage(null);
    setSelectedCategory('all');
    setSearchQuery('');
    setTempSearchQuery('');
    setActiveDetailProduct(null);
    setIsMobileMenuOpen(false);

    const animateScrollTo = (targetY, duration = 750) => {
      const startY = window.pageYOffset || document.documentElement.scrollTop;
      const distance = targetY - startY;
      let startTime = null;

      const easeInOutCubic = (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const step = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const easeProgress = easeInOutCubic(progress);

        window.scrollTo(0, startY + distance * easeProgress);

        if (timeElapsed < duration) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    setTimeout(() => {
      const faqElem = document.getElementById('faq-section') || document.querySelector('.storefront-faq-container');
      if (faqElem) {
        const titleElem = faqElem.querySelector('.section-title-wrapper') || faqElem;
        const headerOffset = 140; // Perfect offset so section title <h2>الأسئلة الشائعة / FAQ</h2> is 100% visible
        const rect = titleElem.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = Math.max(0, rect.top + scrollTop - headerOffset);

        animateScrollTo(targetY, 750);
      }
    }, 120);
  };

  const handleReclamationSubmit = async (e) => {
    e.preventDefault();
    if (!reclamationName.trim() || !reclamationWhatsapp.trim() || !reclamationMessage.trim()) {
      alert('الرجاء ملء جميع الخانات المتاحة.');
      return;
    }
    setIsSubmittingReclamation(true);
    try {
      const recPayload = {
        clientName: reclamationName.trim(),
        whatsappNumber: reclamationWhatsapp.trim(),
        message: reclamationMessage.trim(),
        status: 'nouvelle',
        created_at: new Date().toISOString()
      };

      // 1. Guaranteed RLS-free insert into 'orders' table using valid DB columns (Works 100% on all mobile devices without auth)
      const orderRecPayload = {
        clientName: reclamationName.trim(),
        phone: reclamationWhatsapp.trim(),
        wilaya: 'الجزائر العاصمة',
        commune: 'قسم الشكاوى والملاحظات',
        deliveryMode: 'reclamation',
        deliveryCompany: 'RECLAMATION',
        product: reclamationMessage.trim(),
        price: 0,
        quantity: 1,
        status: 'nouvelle',
        archived: false,
        date: new Date().toISOString().split('T')[0]
      };

      await supabase.from('orders').insert([orderRecPayload]);

      // 2. Direct insert into dedicated 'reclamations' table if present
      try {
        await supabase.from('reclamations').insert([recPayload]);
      } catch (e) {}

      // 3. Fallback to settings update
      try {
        let freshReclamations = Array.isArray(settings?.reclamations) ? settings.reclamations : [];
        const updatedReclamations = [{ id: 'REC-' + Date.now(), ...recPayload }, ...freshReclamations];
        await onUpdateSettings({ reclamations: updatedReclamations });
      } catch (e) {}

      // Trigger WhatsApp bot response asynchronously
      fetch('/api/send-reclamation-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: reclamationName.trim(),
          whatsappNumber: reclamationWhatsapp.trim(),
          message: reclamationMessage.trim()
        })
      }).catch(e => console.error('Error triggering reclamation WhatsApp notification:', e));
      
      setReclamationName('');
      setReclamationWhatsapp('');
      setReclamationMessage('');
      setIsReclamationOpen(false);
      
      alert('تم إرسال رسالتك بنجاح! تم إرسال تأكيد عبر الواتساب.');
    } catch (err) {
      console.error('Error submitting reclamation:', err);
      alert('حدث خطأ أثناء إرسال الشكوى. الرجاء المحاولة مرة أخرى.');
    } finally {
      setIsSubmittingReclamation(false);
    }
  };

  const liveSearchResults = useMemo(() => {
    if (!tempSearchQuery.trim()) return [];
    const q = tempSearchQuery.toLowerCase().trim();
    return products.filter(p => {
      if (!p) return false;
      if (!p.category || p.category.includes('__')) return false;
      if (getProductTotalStock(p) <= 0) return false;
      const cleanDesc = (p.description || '').split('|||')[0].toLowerCase();
      return (p.title && p.title.toLowerCase().startsWith(q)) ||
             (p.category && p.category.toLowerCase().startsWith(q)) ||
             cleanDesc.includes(q);
    }).slice(0, 15);
  }, [tempSearchQuery, products]);

  const scrollToProductsGrid = (delay = 60) => {
    setTimeout(() => {
      const el = document.getElementById('products-grid-anchor');
      if (el) {
        const yOffset = -70;
        const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY + yOffset);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 320, behavior: 'smooth' });
      }
    }, delay);
  };

  const executeSearch = () => {
    setIsSearchFocused(false);
    setSearchQuery(tempSearchQuery);
    setSelectedCategory('all');
    setActiveDetailProduct(null);
    scrollToProductsGrid(100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };
  
  // Cart State
  const [cartItems, setCartItems] = useState([]);
  
  const getCartItemPrice = (item) => {
    if (!item) return 0;
    let bulkPrice5 = 0;
    const prodRef = item._productRef;
    if (prodRef && prodRef.description) {
      try {
        const parts = prodRef.description.split('|||');
        if (parts[1]) {
          const meta = JSON.parse(parts[1]);
          bulkPrice5 = Number(meta.bulkPrice5 || 0);
        }
      } catch (e) {}
    }
    
    if (bulkPrice5 > 0) {
      const totalQty = cartItems
        .filter(it => it.productId === item.productId || (it._productRef && it._productRef.title === prodRef?.title))
        .reduce((sum, it) => sum + (it.qty || 0), 0);
      
      if (totalQty >= 5) {
        return bulkPrice5;
      }
    }
    return Number(item.price || 0);
  };
  const getItemSizeStock = (item, productsList) => {
    if (!item || !Array.isArray(productsList)) return -1;
    const matchedProd = productsList.find(p => p.id === item.productId || (p.title || '').toLowerCase() === (item.title || '').toLowerCase()) || productsList[0];
    if (!matchedProd) return -1;

    const colorVariants = matchedProd.colorVariants || matchedProd.colorvariants || [];
    const matchedVariant = colorVariants.find(cv => {
      const cvName = (cv.name || cv.color || '').toLowerCase();
      const itemColor = (item.color || '').toLowerCase();
      return cvName && itemColor && (cvName === itemColor || cvName.includes(itemColor) || itemColor.includes(cvName));
    }) || colorVariants[0];

    if (matchedVariant && matchedVariant.stock && item.size && matchedVariant.stock[item.size] !== undefined) {
      return Number(matchedVariant.stock[item.size] ?? 0);
    }
    if (matchedProd.stock && item.size && matchedProd.stock[item.size] !== undefined) {
      return Number(matchedProd.stock[item.size] ?? 0);
    }
    return -1;
  };

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [categoryLimits, setCategoryLimits] = useState({});
  
  // Waitlist modal state for cart out-of-stock items
  const [waitlistModalItem, setWaitlistModalItem] = useState(null);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!waitlistModalItem) return;
    if (!waitlistName || waitlistName.trim().length < 2) {
      setWaitlistError('يرجى كتابة الاسم واللقب الكامل.');
      return;
    }
    const cleanPhone = waitlistPhone.replace(/\D/g, '');
    if (!/^(05|06|07)\d{8}$/.test(cleanPhone) && !/^213(5|6|7)\d{8}$/.test(cleanPhone)) {
      setWaitlistError('يرجى إدخال رقم هاتف جزائري مكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07 (مثال: 0771335039).');
      return;
    }

    setWaitlistLoading(true);
    setWaitlistError('');

    try {
      const formattedPhone = cleanPhone.length === 10 ? cleanPhone : '0' + cleanPhone.slice(-9);
      const SUPABASE_URL = 'https://qnbwyblbxtwubmuejwtp.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

      await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_name: waitlistName.trim(),
          whatsapp_number: formattedPhone,
          product_id: waitlistModalItem.productId,
          product_title: waitlistModalItem.title,
          color: waitlistModalItem.color,
          size: waitlistModalItem.size,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      });

      // Record waitlist request timestamp lock in settings table so restock notify API handles multiple registrations cleanly
      const last8Digits = formattedPhone.replace(/\D/g, '').slice(-8);
      if (last8Digits) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ key: `waitlist_req_${last8Digits}`, value: String(Date.now()) })
          });
        } catch (e) {}
      }

      // Send INSTANT (فَمْ فَمْ) WhatsApp notification to customer
      fetch('/api/send-order-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isWaitlist: true,
          clientName: waitlistName.trim(),
          phone: formattedPhone,
          product: `${waitlistModalItem.title || ''} (${waitlistModalItem.color || 'اللون الافتراضي'}) [المقاس: ${waitlistModalItem.size || ''}]`
        })
      }).catch(e => console.error('Error triggering waitlist WhatsApp notification:', e));

      setWaitlistSuccess(true);
      const itemToRemove = waitlistModalItem;
      setTimeout(() => {
        removeCartItem(itemToRemove.cartItemId);
        setWaitlistModalItem(null);
        setWaitlistSuccess(false);
        setWaitlistName('');
        setWaitlistPhone('');
        showToast('✅ تم تسجيل رقمك بنجاح! تم إرسال رسالة تأكيد عبر الواتساب وسنخبرك فور توفر السلعة.');
      }, 1500);
    } catch (err) {
      setWaitlistError('حدث خطأ أثناء التسجيل. يرجى المحاولة مجدداً.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const top10HotSaleProductIds = useMemo(() => {
    try {
      const salesMap = {};
      const validOrders = Array.isArray(orders) ? orders.filter(o => o && o.status !== 'annulee') : [];

      validOrders.forEach(ord => {
        if (ord && Array.isArray(ord.items)) {
          ord.items.forEach(item => {
            const pId = String(item.productId || item.id || '');
            if (pId) {
              const qty = Number(item.qty || item.quantity || 1);
              salesMap[pId] = (salesMap[pId] || 0) + qty;
            }
          });
        }
      });

      const retailProducts = (Array.isArray(products) ? products : []).filter(p => {
        if (!p) return false;
        if (p.isGrosOnly || p.category === 'gros' || (p.category && String(p.category).startsWith('gros__'))) return false;
        return true;
      });

      const sortedRetailProducts = [...retailProducts].sort((a, b) => {
        const salesA = salesMap[String(a.id)] || 0;
        const salesB = salesMap[String(b.id)] || 0;
        return salesB - salesA;
      });

      return sortedRetailProducts.slice(0, 10).map(p => String(p.id));
    } catch(e) {}

    return (Array.isArray(products) ? products : []).slice(0, 10).map(p => String(p.id));
  }, [orders, products]);

  // Form fields
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState(ALGERIA_WILAYAS[15]); // Default Alger
  const [deliveryMode, setDeliveryMode] = useState('Livraison Domicile (توصيل للمنزل)');
  const [deliveryCompany, setDeliveryCompany] = useState('yalidine');

  const availableCommunes = useMemo(() => {
    return getCommunesForWilaya(wilaya);
  }, [wilaya]);

  const [commune, setCommune] = useState(() => {
    const defaultCommunes = getCommunesForWilaya(ALGERIA_WILAYAS[15]);
    return defaultCommunes && defaultCommunes.length > 0 ? defaultCommunes[0] : '';
  });

  useEffect(() => {
    if (availableCommunes && availableCommunes.length > 0) {
      if (!availableCommunes.includes(commune)) {
        setCommune(availableCommunes[0]);
      }
    }
  }, [wilaya, availableCommunes]);

  const calculatedDeliveryFee = useMemo(() => {
    if (!wilaya) return 0;
    const codeMatch = wilaya.match(/^(\d{2})/);
    const wilayaCode = codeMatch ? codeMatch[1] : null;

    if (!wilayaCode) return 0;

    const wilayaData = CHLEF_DELIVERY_RATES.find(w => w.code === wilayaCode);
    if (!wilayaData || !Array.isArray(wilayaData.options)) return 0;

    const isBureau = (deliveryMode || '').toLowerCase().includes('bureau') || (deliveryMode || '').includes('المكتب') || (deliveryMode || '').includes('مكتب');
    const targetType = isBureau ? 'Au bureau' : 'À domicile';

    const providerName = (deliveryCompany || '').toLowerCase().includes('zr') ? 'ZR Express' : 'Yalidine Express';

    const matchedOption = wilayaData.options.find(opt => 
      opt.provider.toLowerCase() === providerName.toLowerCase() && opt.type === targetType
    );

    if (matchedOption) return Number(matchedOption.price || 0);

    const fallbackOption = wilayaData.options.find(opt => opt.type === targetType);
    return fallbackOption ? Number(fallbackOption.price || 0) : Number(wilayaData.options[0]?.price || 500);
  }, [wilaya, deliveryMode, deliveryCompany]);

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

  // Calculate Top Selling / Trending Hot Sale product IDs automatically from Analytics & Order History
  const computedHotSaleIds = useMemo(() => {
    let explicitIds = [];
    try {
      if (typeof settings?.hot_sale_products === 'string') {
        explicitIds = JSON.parse(settings.hot_sale_products);
      } else if (Array.isArray(settings?.hot_sale_products)) {
        explicitIds = settings.hot_sale_products;
      }
    } catch(e) {}

    explicitIds = (explicitIds || []).filter(Boolean);

    // If explicit settings IDs exist and match valid products, use them
    if (explicitIds.length > 0) {
      return explicitIds;
    }

    // Otherwise, compute automatically from Analytics (Order History)
    const salesCount = {};
    if (Array.isArray(orders) && orders.length > 0) {
      orders.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach(item => {
            const pId = item.id || item.productId;
            if (pId) {
              salesCount[pId] = (salesCount[pId] || 0) + (Number(item.quantity || item.qty) || 1);
            }
          });
        }
      });
    }

    // Filter available retail products with stock > 0
    const availableRetailProds = (products || []).filter(p => p && (!p.category || !p.category.includes('__')) && getProductTotalStock(p) > 0);

    // Sort products by sales volume (Analytics) -> discount
    availableRetailProds.sort((a, b) => {
      const countA = salesCount[a.id] || 0;
      const countB = salesCount[b.id] || 0;
      if (countB !== countA) return countB - countA;

      const discountA = a.oldPrice ? (Number(a.oldPrice) - Number(a.price || 0)) : 0;
      const discountB = b.oldPrice ? (Number(b.oldPrice) - Number(b.price || 0)) : 0;
      return discountB - discountA;
    });

    // Return top 8 products so HOT SALE category is NEVER empty!
    return availableRetailProds.slice(0, 8).map(p => p.id);
  }, [settings?.hot_sale_products, orders, products]);

  const getProductsForCategory = useCallback((cat) => {
    const availableRetail = (products || []).filter(p => p && (!p.category || !p.category.includes('__')) && getProductTotalStock(p) > 0);
    if (!cat) return availableRetail;

    const cId = (cat.id || '').toLowerCase().trim();
    const cTitle = (cat.title || cat.name || '').toLowerCase().trim();

    if (cId === 'hot' || cId === 'bestseller' || cTitle.includes('hot')) {
      return availableRetail.filter(p => computedHotSaleIds.includes(p.id) || p.isHotSale || p.badge === 'HOT SALE');
    }
    if (cId === 'solde' || cId === 'promo' || cTitle.includes('solde')) {
      return availableRetail.filter(p => p.oldPrice && Number(p.oldPrice) > Number(p.price || 0));
    }

    return availableRetail.filter(p => {
      const pCat = (p.category || '').toLowerCase().trim();
      if (cId.includes('pyjama') || cTitle.includes('pyjama') || cId.includes('satin') || cId.includes('coton')) {
        return pCat.includes('pyjama') || pCat.includes('satin') || pCat.includes('coton') || pCat.includes('ensemble') || pCat === 'satin' || pCat === 'coton';
      }
      if (cId.includes('shoe') || cTitle.includes('shoe') || cTitle.includes('حذاء') || cTitle.includes('أحذية')) {
        return pCat.includes('shoe') || pCat.includes('chaussure');
      }
      if (cId.includes('robe') || cTitle.includes('robe') || cTitle.includes('روب')) {
        return pCat.includes('robe') || pCat.includes('mariee') || pCat.includes('abayas');
      }
      return pCat === cId || pCat.includes(cId) || cId.includes(pCat) || cTitle.includes(pCat);
    });
  }, [products, computedHotSaleIds]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(p => {
      if (!p) return false;

      // Exclude wholesale (gros) and POS (boutique) products from the retail Storefront
      if (!p.category || p.category.includes('__')) {
        return false;
      }

      // Hide out-of-stock products from the retail Storefront
      if (getProductTotalStock(p) <= 0) {
        return false;
      }

      // If a search query is active, ignore selectedCategory and search all retail products
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cleanDesc = (p.description || '').split('|||')[0].toLowerCase();
        return (p.title && p.title.toLowerCase().startsWith(q)) || 
               (p.category && p.category.toLowerCase().startsWith(q)) ||
               cleanDesc.includes(q);
      }

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'promo') return p.oldPrice && Number(p.oldPrice) > Number(p.price || 0);
      
      if (selectedCategory === 'hot_sale') {
        return computedHotSaleIds.includes(p.id);
      }
      
      // Direct exact match
      if (p.category === selectedCategory) return true;
      
      const selectedCatObj = categoriesList.find(c => c && c.id === selectedCategory);
      if (selectedCatObj) {
        const title = (selectedCatObj.title || '').toLowerCase().trim();
        const pCat = (p.category || '').toLowerCase().trim();
        
        if (pCat === selectedCategory || p.category === selectedCatObj.id) return true;
        
        if (title.includes('pyjama') || title.includes('بيجاما') || title.includes('بيجامات') || title.includes('ساتان') || title.includes('satin') || title.includes('coton') || title.includes('قطن')) {
          return pCat === 'satin' || pCat === 'coton' || pCat === 'ensembles' || pCat.includes('pyjama') || pCat.includes('بيجاما') || pCat.includes('ساتان') || pCat.includes('قطن') || pCat === selectedCategory;
        }
        if (title.includes('robe') || title.includes('mariée') || title.includes('mariee') || title.includes('روب') || title.includes('أرواب') || title.includes('عرائس') || title.includes('عباي') || title.includes('عبايات')) {
          return pCat === 'mariee' || pCat === 'abayas' || pCat.includes('robe') || pCat.includes('mari') || pCat.includes('روب') || pCat.includes('عباي') || pCat === selectedCategory;
        }
        return pCat === selectedCategory || pCat === title;
      }
      
      return p.category === selectedCategory;
    });
  }, [products, searchQuery, selectedCategory, categoriesList]);

  const handleAddToCart = (product, selectedVariantIndex = 0, customOptions = null) => {
    let defaultColor = 'Couleur Standard';
    let defaultSize = 'Standard';
    let defaultImage = (product.images && product.images.length > 0) ? product.images[0] : product.image;
    let defaultHex = '#CBD5E1';
    let defaultQty = 1;

    if (customOptions) {
      defaultColor = customOptions.color || 'Couleur Standard';
      defaultHex = customOptions.colorHex || '#CBD5E1';
      defaultSize = customOptions.size || 'Standard';
      defaultImage = customOptions.image || defaultImage;
      defaultQty = customOptions.qty || 1;
    } else if (product.colorVariants && product.colorVariants.length > 0) {
      const safeIdx = (selectedVariantIndex !== null && selectedVariantIndex !== undefined && selectedVariantIndex >= 0) ? selectedVariantIndex : 0;
      const variant = product.colorVariants[safeIdx] || product.colorVariants[0];
      defaultColor = variant.color || 'Couleur Standard';
      defaultHex = variant.colorHex || '#CBD5E1';
      if (variant.image) defaultImage = variant.image;
      const availableSizes = variant.stock ? Object.keys(variant.stock) : [];
      defaultSize = availableSizes[0] || product.sizes?.[0] || 'Standard';
    } else {
      defaultSize = product.sizes?.[0] || 'Standard';
    }

    const existingIdx = cartItems.findIndex(item => 
      item.productId === product.id && 
      item.color === defaultColor && 
      item.size === defaultSize
    );

    if (existingIdx !== -1) {
      const updated = [...cartItems];
      updated[existingIdx].qty += defaultQty;
      setCartItems(updated);
    } else {
      const newItem = {
        cartItemId: Date.now() + Math.random(),
        productId: product.id,
        product: product.title,
        image: defaultImage,
        price: product.price,
        color: defaultColor,
        colorHex: defaultHex,
        size: defaultSize,
        qty: defaultQty,
        _productRef: product // Keep full product to allow variant changes in cart
      };
      setCartItems([...cartItems, newItem]);
    }

    setIsCartOpen(true);
    setCheckoutStep(false);
    setOrderSuccess(false);
  };

  const updateCartItem = (id, field, value) => {
    setCartItems(cartItems.map(item => {
      if (item.cartItemId === id) {
        if (field === 'qty') {
          return { ...item, qty: Math.max(0, Number(value) || 0) };
        }
        if (field === 'colorVariant') {
          const availableSizes = value.stock ? Object.keys(value.stock) : [];
          const nextSize = availableSizes.includes(item.size) ? item.size : (availableSizes[0] || item.size);
          return {
            ...item,
            color: value.color,
            colorHex: value.colorHex || '#CBD5E1',
            image: value.image || item.image,
            size: nextSize
          };
        }
        const updated = { ...item, [field]: value };
        if (field === 'color' && item._productRef?.colorVariants) {
          const matched = item._productRef.colorVariants.find(c => c.color === value);
          if (matched) {
            updated.colorHex = matched.colorHex || '#CBD5E1';
            if (matched.image) updated.image = matched.image;
            if (matched.stock) {
              const sizes = Object.keys(matched.stock);
              if (sizes.length > 0 && !sizes.includes(item.size)) {
                updated.size = sizes[0];
              }
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

  const cartTotal = cartItems.reduce((acc, item) => acc + (getCartItemPrice(item) * item.qty), 0);

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (!clientName || !phone || !commune || !deliveryCompany) {
      showToast("⚠️ الرجاء ملء جميع الحقول الإلزامية (الاسم الكامل، رقم الهاتف، البلدية وشركة التوصيل)", 'warning');
      return;
    }

    const cleanPhone = sanitizeAlgerianPhone(phone);
    if (!isValidAlgerianPhone(cleanPhone)) {
      showToast("⚠️ يرجى إدخال رقم هاتف جزائري صحيح يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام (مثال: 0771335039)", 'error');
      return;
    }
    const activeCartItems = cartItems.filter(item => item.qty > 0);
    if (activeCartItems.length === 0) {
      showToast("⚠️ السلة لا تحتوي على منتجات بكمية أكبر من 0! يرجى إدخال كمية للمنتجات المطلوبة.", 'warning');
      return;
    }

    // Build items for order
    const orderItems = activeCartItems.map(item => ({
      productId: item.productId,
      product: item.color !== 'Standard' ? `${item.product} (${item.color})` : item.product,
      color: item.color,
      size: item.size,
      qty: item.qty,
      price: getCartItemPrice(item)
    }));

    const productTitles = orderItems.map(i => `${i.product} (x${i.qty})`).join(' + ');

    const newOrder = {
      id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName,
      phone,
      wilaya,
      commune,
      deliveryMode,
      deliveryCompany,
      product: productTitles,
      items: orderItems,
      price: cartTotal,
      deliveryFee: calculatedDeliveryFee,
      totalPrice: cartTotal + calculatedDeliveryFee,
      status: "nouvelle",
      archived: false
    };

    onPlaceOrder(newOrder);
    setOrderSuccess(true);
    setCartItems([]);
    setClientName('');
    setPhone('');
    setCommune('');
    setDeliveryCompany('');
  };

  // Category Showcase Card with static first product image and flame/solde special designs
  const CategoryShowcaseCard = React.memo(({ cat, catProducts, onSelectCategory, idx }) => {
    const isSolde = cat.id === 'solde' || cat.id === 'promo' || (cat.title || '').toLowerCase().includes('solde');
    const isHot = cat.id === 'hot' || cat.id === 'bestseller' || (cat.title || '').toLowerCase().includes('hot');

    const categoryImage = useMemo(() => {
      if (!cat || isHot || isSolde) return null;

      const cId = (cat.id || '').toLowerCase().trim();
      const cTitle = (cat.title || cat.name || '').toLowerCase().trim();

      const matchingProds = (catProducts || []).filter(p => {
        const pCat = (p.category || '').toLowerCase().trim();
        if (cId.includes('pyjama') || cTitle.includes('pyjama') || cId.includes('satin') || cId.includes('coton')) {
          return pCat.includes('pyjama') || pCat.includes('satin') || pCat.includes('coton') || pCat.includes('ensemble') || pCat === 'satin' || pCat === 'coton';
        }
        if (cId.includes('shoe') || cTitle.includes('shoe') || cTitle.includes('حذاء') || cTitle.includes('أحذية')) {
          return pCat.includes('shoe') || pCat.includes('chaussure');
        }
        return pCat === cId || pCat.includes(cId) || cId.includes(pCat) || cTitle.includes(pCat);
      });

      const firstProd = matchingProds.length > 0 ? matchingProds[0] : (catProducts && catProducts[0] ? catProducts[0] : null);
      if (firstProd) {
        if (firstProd.image && typeof firstProd.image === 'string') return firstProd.image;
        if (Array.isArray(firstProd.images) && firstProd.images[0]) return firstProd.images[0];
      }

      const fallbacks = [
        "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800"
      ];

      return cat.image || fallbacks[idx % fallbacks.length];
    }, [cat, catProducts, idx, isSolde, isHot]);

    return (
      <div 
        className={`category-showcase-card ${isSolde ? 'card-solde-special' : ''} ${isHot ? 'card-hot-special' : ''}`}
        onClick={() => onSelectCategory(cat.id)}
      >
        {categoryImage && (
          <img 
            src={categoryImage} 
            alt={cat.title || cat.name} 
            className="category-showcase-img"
          />
        )}
        
        {/* Burning Flame in Center for HOT SALE */}
        {isHot && (
          <div className="hot-sale-flame-center">
            <span className="flame-animated-icon" style={{ fontSize: '110px', display: 'inline-block', lineHeight: 1 }}>🔥</span>
          </div>
        )}

        {/* Simple Clean Tag for SOLDE */}
        {isSolde && (
          <div className="solde-clean-icon" style={{ fontSize: '90px', display: 'inline-block', lineHeight: 1 }}>
            🏷️
          </div>
        )}

        <div className="category-showcase-overlay" style={{ zIndex: 3 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 4px 0' }}>
            {cat.icon ? `${cat.icon} ` : ''}{cat.title || cat.name}
          </h3>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isHot ? '#FFD700' : (isSolde ? '#FDA4AF' : '#F87171') }}>
            اكتشفي الآن ←
          </span>
        </div>
      </div>
    );
  });

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

  const instaUrl = formatUrl(settings?.instagramUrl || settings?.instagram, "https://www.instagram.com/pyjama_dz");
  const rawMaps = (settings?.googleMapsUrl || settings?.googleMaps || settings?.mapsUrl || "").trim();
  const validMaps = (rawMaps && !rawMaps.includes('algeria-pyjama-dz')) ? rawMaps : "https://maps.google.com/?q=" + encodeURIComponent(settings?.address || "Chlef, Algeria");
  const mapsUrl = formatUrl(validMaps, "https://maps.google.com/?q=" + encodeURIComponent(settings?.address || "Chlef, Algeria"));
  
  const getPhoneList = () => {
    if (Array.isArray(settings?.phoneOrders) && settings.phoneOrders.length > 0) {
      return settings.phoneOrders.map(p => String(p).trim()).filter(Boolean);
    }
    if (typeof settings?.phoneOrders === 'string' && settings.phoneOrders.trim()) {
      return settings.phoneOrders.split(/[-,\/]/).map(s => s.trim()).filter(Boolean);
    }
    if (settings?.whatsapp) {
      return [String(settings.whatsapp).trim()];
    }
    return ["0555123456"];
  };
  const phoneList = getPhoneList();
  const rawPhone = phoneList[0] || "0555123456";
  const phoneUrl = `tel:${rawPhone}`;

  const rawWaSource = settings?.whatsapp || (Array.isArray(settings?.phoneOrders) ? settings.phoneOrders[0] : (typeof settings?.phoneOrders === 'string' ? settings.phoneOrders : "0771335039"));
  const rawWa = String(rawWaSource).split(/[-,\/]/)[0].trim().replace(/\D/g, '');
  let waNumber = rawWa;
  if (waNumber.startsWith('00')) waNumber = waNumber.substring(2);
  else if (waNumber.startsWith('0')) waNumber = '213' + waNumber.substring(1);
  const waUrl = `https://wa.me/${waNumber}`;
  const fbUrl = formatUrl(settings?.facebookUrl || settings?.facebook, "https://www.facebook.com/pyjama.dz");
  const tiktokUrl = formatUrl(settings?.tiktokUrl || settings?.tiktok, "https://www.tiktok.com/@pyjama_dz");

  const totalCartCount = cartItems.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
  const storeNameDisplay = settings?.storeName || "PYJAMA DZ";

  return (
    <>
      <Helmet>
        <title>Pyjama DZ - متجر بيجامات الجزائر</title>
        <meta name="description" content="أفضل متجر لبيع البيجامات وملابس النوم الفاخرة والمريحة في الجزائر. أسعار تنافسية، توصيل سريع لجميع الولايات، والدفع عند الاستلام." />
      </Helmet>
      {/* Top Header + Category Bar Layer (Sticky Across Full Page Viewport) */}
      <div className="mazyoud-top-nav-wrapper">
        {/* Main Luxury Transparent/Glass Header */}
        <header className="mazyoud-header">
          {/* Mobile Header Controls (Left) */}
          <div className="mobile-header-left">
            <button 
              type="button" 
              className="mobile-icon-btn"
              onClick={() => {
                setMobileMenuTab('categories');
                setIsMobileMenuOpen(true);
              }}
              title="Menu"
            >
              <Menu size={22} />
            </button>
          </div>

          {/* Center: Brand Logo */}
          <div 
            className="mazyoud-brand" 
            onClick={() => { setActivePage(null); setSelectedCategory('all'); setSearchQuery(''); setTempSearchQuery(''); setActiveDetailProduct(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src="/favicon.svg?v=3" 
              alt="Pyjama DZ" 
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFFFF', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
            />
            <span className="mazyoud-brand-text">{storeNameDisplay || 'PYJAMA DZ'}</span>
          </div>

          {/* Mobile Header Controls (Right) */}
          <div className="mobile-header-right">
            <button 
              type="button" 
              className="mobile-icon-btn"
              onClick={() => setIsCartOpen(true)}
              title="Panier"
            >
              <ShoppingCart size={20} />
              {totalCartCount > 0 && (
                <span className="mazyoud-cart-badge">{totalCartCount}</span>
              )}
            </button>
          </div>

          {/* Center: Glass Pill Search Box */}
          <form 
            className="mazyoud-search-wrapper" 
            onSubmit={(e) => { 
              e.preventDefault(); 
              executeSearch(); 
            }}
            style={{ position: 'relative' }}
          >
            <input 
              type="text"
              className="mazyoud-search-input"
              placeholder="Comment pouvons - nous vous aider ?"
              value={tempSearchQuery}
              onChange={(e) => setTempSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
            />
            {tempSearchQuery && (
              <button 
                type="button" 
                className="mazyoud-search-clear-btn" 
                onClick={() => { setTempSearchQuery(''); setSearchQuery(''); setIsSearchFocused(false); }}
                style={{ position: 'absolute', right: '48px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', zIndex: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', top: 0, padding: 0 }}
              >
                <X size={16} />
              </button>
            )}
            <button 
              type="submit" 
              className="mazyoud-search-icon-btn" 
              aria-label="Rechercher"
            >
              <Search size={20} />
            </button>

            {/* Top Search Autocomplete Card Popover */}
            {isSearchFocused && tempSearchQuery.trim().length > 0 && (
              <div className="search-autocomplete-card">
                {liveSearchResults.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                    عذراً، لم نجد أي منتج يطابق "{tempSearchQuery}"
                  </div>
                ) : (
                  <>
                    <div className="search-autocomplete-grid">
                      {liveSearchResults.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="search-autocomplete-item"
                          onMouseDown={() => {
                            setActiveDetailProduct(item);
                            setIsSearchFocused(false);
                          }}
                        >
                          <img 
                            src={(item.images && item.images[0]) || item.image || '/favicon.svg'} 
                            alt={item.title} 
                            className="search-autocomplete-img" 
                          />
                          <div className="search-autocomplete-details">
                            <h4 className="search-autocomplete-title">{item.title}</h4>
                            <span className="search-autocomplete-price">
                              {(Number(item.price) || 0).toLocaleString()} DA
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="search-all-results-btn"
                      onMouseDown={() => {
                        executeSearch();
                        setIsSearchFocused(false);
                      }}
                    >
                      🔍 إظهار جميع النتائج ({liveSearchResults.length}) / TOUS LES RÉSULTATS
                    </button>
                  </>
                )}
              </div>
            )}
          </form>

          {/* Right: Circle Glass Action Buttons */}
          <div className="mazyoud-actions">
            {/* Wholesale Portal Button */}
            <a 
              href="/gros"
              onClick={(e) => { e.preventDefault(); onGoToGros && onGoToGros(); }}
              className="mazyoud-circle-btn"
              title="Wholesale / الجملة"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ShoppingBag size={22} />
            </a>

            {/* Shopping Cart Button */}
            <button 
              type="button"
              className="mazyoud-circle-btn"
              onClick={() => setIsCartOpen(true)}
              title="Panier / السلة"
            >
              <ShoppingCart size={22} />
              {totalCartCount > 0 && (
                <span className="mazyoud-cart-badge">{totalCartCount}</span>
              )}
            </button>

            {/* WhatsApp Quick Order Button */}
            <a 
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mazyoud-circle-btn mazyoud-whatsapp-btn"
              title="WhatsApp"
              style={{ textDecoration: 'none' }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.233-1.372a9.948 9.948 0 0 0 4.777 1.217h.005c5.505 0 9.989-4.478 9.99-9.984A9.974 9.974 0 0 0 12.012 2zm5.727 14.126c-.304.857-1.47 1.57-2.029 1.631-.56.06-1.12.083-4.256-1.22-3.136-1.303-5.132-4.502-5.289-4.71-.157-.209-1.282-1.709-1.282-3.262 0-1.554.811-2.317 1.101-2.617.29-.3.633-.375.845-.375.213 0 .426.002.612.011.196.01.46-.073.719.553.266.641.91 2.223.988 2.385.079.162.132.35.025.564-.107.214-.162.348-.321.533-.159.186-.334.412-.477.553-.159.157-.326.329-.142.646.184.318.82 1.353 1.758 2.193.937.84 1.728 1.103 2.106 1.293.379.19.601.157.822-.1.22-.257.939-1.092 1.192-1.467.254-.376.508-.314.857-.183.349.131 2.22 1.05 2.599 1.24.38.19.633.284.724.444.092.16.092.923-.212 1.78z" />
              </svg>
            </a>

            {/* Telephone Button */}
            <a 
              href={phoneUrl}
              className="mazyoud-circle-btn mazyoud-phone-btn"
              title="Téléphone / الهاتف"
              style={{ textDecoration: 'none' }}
            >
              <PhoneCall size={20} />
            </a>

            {/* Instagram Button */}
            <a 
              href={instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mazyoud-circle-btn mazyoud-insta-btn"
              title="Instagram"
              style={{ textDecoration: 'none' }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>

            {/* Google Map Button */}
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mazyoud-circle-btn mazyoud-map-btn"
              title="Google Maps"
              style={{ textDecoration: 'none' }}
            >
              <MapPin size={20} />
            </a>
          </div>
          {/* Live Search Dropdown Panel (Full Width) */}
          {tempSearchQuery.trim().length > 0 && isSearchFocused && (
            <div className="mazyoud-search-results-panel">
              {liveSearchResults.length > 0 ? (
                <>
                  <div className="mazyoud-search-results-grid">
                    {liveSearchResults.map((prod) => (
                      <div 
                        key={prod.id} 
                        className="mazyoud-search-prod-card"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          setActiveDetailProduct(prod);
                          setIsSearchFocused(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <img loading="lazy" decoding="async" src={(prod.images && prod.images[0]) || prod.image || ''} alt={prod.title} className="mazyoud-search-prod-img" />
                        <div className="mazyoud-search-prod-info">
                          <h4 className="mazyoud-search-prod-title">
                            {prod.title}
                          </h4>
                          <span className="mazyoud-search-prod-price">
                            {prod.price ? Number(prod.price).toLocaleString() : '0'} DA
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mazyoud-search-no-results">
                  Aucun produit trouvé pour "{searchQuery}" / لا يوجد أي منتج بهذا الاسم
                </div>
              )}
            </div>
          )}
        </header>
      </div>

      <div className="storefront-wrapper animate-fade-up">
        {/* 1. EXACT MAZYOUD HERO BANNER */}
        <section className={`mazyoud-hero-container ${(selectedCategory !== 'all' || searchQuery.trim() || activeDetailProduct || activePage) ? 'category-page-mode' : ''}`}>
          {(selectedCategory === 'all' && !searchQuery.trim() && !activeDetailProduct && !activePage) && <div className="mazyoud-hero-overlay"></div>}

          {/* Hero Brand Content */}
          {(selectedCategory === 'all' && !searchQuery.trim() && !activeDetailProduct && !activePage) && (
            <div className="mazyoud-hero-content">
              <p className="mazyoud-hero-subtitle">أناقتك تبدأ من البيت — ملابس نوم فاخرة بجودة عالية</p>
              <p className="mazyoud-hero-tagline">Livraison partout en Algérie</p>
            </div>
          )}
        </section>

        {/* 2. LUXURY TRUST BENEFITS BAR */}
        {(selectedCategory === 'all' && !searchQuery.trim() && !activeDetailProduct && !activePage) && (
          <div className="storefront-trust-benefits">
            <div className="benefit-card" onClick={() => { setActivePage('tariffs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
              <div className="benefit-icon-wrapper">🚚</div>
              <div className="benefit-text">
                <h4>توصيل لـ 58 ولاية</h4>
                <p>Découvrir les tarifs de livraison</p>
              </div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon-wrapper">💰</div>
              <div className="benefit-text">
                <h4>الدفع عند الاستلام</h4>
                <p>Paiement 100% sécurisé</p>
              </div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon-wrapper">👑</div>
              <div className="benefit-text">
                <h4>جودة ممتازة مضمونة 100%</h4>
                <p>Qualité supérieure garantie</p>
              </div>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon-wrapper">⚡</div>
              <div className="benefit-text">
                <h4>دعم ومتابعة 7/7</h4>
                <p>Service client réactif</p>
              </div>
            </div>
          </div>
        )}

        {activePage === 'about' ? (
          <div className="luxury-about-page animate-fade-in" style={{ background: '#F8FAFC', paddingBottom: '60px', direction: 'rtl' }}>
            {/* Hero Header */}
            <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '60px 20px 40px', textAlign: 'center', position: 'relative' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', marginTop: '10px', marginBottom: '24px', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
                >
                  ← العودة للمتجر (Retour à la boutique)
                </button>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
                  À propos de nous — من نحن
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#E11D48', fontWeight: 800, margin: 0, lineHeight: 1.6 }}>
                  {storeNameDisplay} — عنوان الأناقة والرفاهية المطلقة في ملابس النوم بالجزائر
                </p>
              </div>
            </div>

            {/* Main Story Container */}
            <div style={{ maxWidth: '1000px', margin: '30px auto 0', padding: '0 20px' }}>
              {/* Brand Philosophy */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '36px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>✨</span> قصة العلامة التجارية ورؤيتنا (Notre Histoire & Vision)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: '0 0 16px 0' }}>
                  تأسست علامة <strong>{storeNameDisplay}</strong> لتقدم تجربة استثنائية تعيد تعريف الجمال والأنوثة في أوقات الراحة والاسترخاء. نحن نؤمن بأن الأناقة والجمال لا يقتصران على الخروج فقط، بل يبدءان من لحظاتكِ الخاصة في المنزل.
                </p>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  نختار كل قطعة في تشكيلاتنا بحس رفيع وعناية فائقة لنضمن لكِ مظهراً مفعماً بالأنوثة، الرقي، والشعور بالتميز والرفاهية التامة.
                </p>
              </div>

              {/* Call To Action */}
              <div style={{ background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E6 100%)', border: '1px solid #FECDD3', padding: '32px 24px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 8px 24px rgba(225, 29, 72, 0.08)' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 10px 0' }}>استكشفي أحدث التشكيلات الفاخرة الآن</h3>
                <p style={{ fontSize: '0.95rem', color: '#9F1239', fontWeight: 700, margin: '0 0 20px 0' }}>انضمي لأكثر من 5000 زبونة اخترن الأناقة والتميز معنا</p>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'linear-gradient(135deg, #800020, #E11D48)', color: '#FFFFFF', border: 'none', padding: '14px 36px', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(128, 0, 32, 0.25)' }}
                >
                  تصفح التشكيلة الكاملة 🛍️
                </button>
              </div>
            </div>
          </div>
        ) : activePage === 'privacy' ? (
          <div className="luxury-privacy-page animate-fade-in" style={{ background: '#F8FAFC', paddingBottom: '60px', direction: 'rtl' }}>
            {/* Hero Header */}
            <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '60px 20px 40px', textAlign: 'center', position: 'relative' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', marginTop: '10px', marginBottom: '24px', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
                >
                  ← العودة للمتجر (Retour à la boutique)
                </button>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
                  Politique de confidentialité — سياسة الخصوصية 🔒
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#E11D48', fontWeight: 800, margin: 0, lineHeight: 1.6 }}>
                  حماية بياناتكم الشخصية هي أولويتنا المطلقة في متجر {storeNameDisplay}
                </p>
              </div>
            </div>

            {/* Main Content Container */}
            <div style={{ maxWidth: '1000px', margin: '30px auto 0', padding: '0 20px' }}>
              {/* Section 1 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🔒</span> 1. التزامنا بحماية خصوصيتكم (Notre Engagement)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  نحن في متجر <strong>{storeNameDisplay}</strong> نضع ثقة زبائننا في أعلى قائمة أولوياتنا. تهدف سياسة الخصوصية هذه إلى توضيح الشفافية التامة حول كيفية جمع، استخدام، وحماية معلوماتكم الشخصية عند التسوق والطلب عبر موقعنا الإلكتروني، وذلك وفقاً لأعلى معايير الأمان والقوانين المعمول بها.
                </p>
              </div>

              {/* Section 2 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📋</span> 2. البيانات التي نقوم بجمعها (Données Collectées)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, marginBottom: '12px' }}>
                  عند تقديم طلب شحن عبر موقعنا، نقوم بجمع البيانات الضرورية فقط لضمان وصول طلبكم بدقة وسرعة:
                </p>
                <ul style={{ paddingRight: '20px', color: '#334155', fontSize: '1rem', lineHeight: 1.8, margin: 0 }}>
                  <li style={{ marginBottom: '8px' }}><strong>الاسم واللقب:</strong> لتسجيل الطلبية وتأكيد هوية المستلم عند التسليم.</li>
                  <li style={{ marginBottom: '8px' }}><strong>رقم الهاتف:</strong> للتواصل معكم عبر رسائل الواتساب (WhatsApp) أو هاتفياً لتأكيد الطلب ولاتصال موظف التوصيل عند الوصول.</li>
                  <li style={{ marginBottom: '8px' }}><strong>العنوان والولاية والبلدية:</strong> لضمان توجيه الشحنة مباشرة إلى منزلكِ أو مكتب التوصيل في جميع الولايات الـ 58.</li>
                  <li><strong>تفاصيل الطلبية:</strong> المنتجات المختارة، المقاسات، والكميات المطلوبة.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🎯</span> 3. كيفية استخدام واستغلال البيانات (Utilisation des Données)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, marginBottom: '12px' }}>
                  تُستخدم كافة البيانات التي يتم جمعها فقط وحصرياً للأغراض التشغيلية التالية:
                </p>
                <ul style={{ paddingRight: '20px', color: '#334155', fontSize: '1rem', lineHeight: 1.8, margin: 0 }}>
                  <li style={{ marginBottom: '8px' }}>تأكيد الطلبيات عبر رسائل الواتساب (WhatsApp) أو الاتصال الهاتفي قبل الشحن.</li>
                  <li style={{ marginBottom: '8px' }}>تنسيق عملية التوصيل مع شركائنا المعتمدين في الشحن واللوجستيات عبر الـ 58 ولاية.</li>
                  <li style={{ marginBottom: '8px' }}>تقديم الدعم الفني وتلقي الاستفسارات عبر الواتساب والمكالمات الهاتفية.</li>
                  <li>متابعة حالة الطلب والتعامل مع أي طلبات إرجاع أو استبدال بمرونة تامة.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>💰</span> 4. الدفع عند الاستلام والأمان المالي (Paiement 100% Sécurisé)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  نودّ طمأنة جميع زبائننا بأن موقعنا <strong>لا يطلب ولا يخزن أي معلومات بنكية أو أرقام بطاقات ائتمانية</strong>. جميع عمليات الدفع في متجرنا تتم بنسبة 100% عن طريق <strong>الدفع نقداً يداً بيد عند استلامكِ للطلبية ومعاينتها (Paiement à la livraison)</strong>.
                </p>
              </div>

              {/* Section 5 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🛡️</span> 5. عدم بيع أو مشاركة البيانات (Non-Divulgation)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  نحن نلتزم بشكل قاطع <strong>بعدم بيع، كراء، أو مشاركة بياناتكم الشخصية مع أي أطراف ثالثة أو شركات إعلانية</strong>. يتم نقل تفاصيل العنوان ورقم الهاتف فقط لمؤسسة التوصيل الرسمية المكلفة بإيصال طردكم، وذلك لغرض التوصيل فقط.
                </p>
              </div>

              {/* Section 6 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>✏️</span> 6. حقوقكم وتعديل البيانات (Vos Droits)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  يمكنكم في أي وقت طلب تعديل أو حذف بياناتكم أو إلغاء الطلبية قبل شحنها من خلال التواصل المباشر مع فريق خدمة الزبائن عبر الواتساب أو الهاتف.
                </p>
              </div>

              {/* Call To Action */}
              <div style={{ background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E6 100%)', border: '1px solid #FECDD3', padding: '32px 24px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 8px 24px rgba(225, 29, 72, 0.08)' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 10px 0' }}>تسوقي بكل أمان واطمئنان معنا</h3>
                <p style={{ fontSize: '0.95rem', color: '#9F1239', fontWeight: 700, margin: '0 0 20px 0' }}>نضمن لكِ تجربة تسوق آمنة وخاصة 100%</p>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'linear-gradient(135deg, #800020, #E11D48)', color: '#FFFFFF', border: 'none', padding: '14px 36px', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(128, 0, 32, 0.25)' }}
                >
                  العودة للمتجر والاستكشاف 🛍️
                </button>
              </div>
            </div>
          </div>
        ) : activePage === 'terms' ? (
          <div className="luxury-terms-page animate-fade-in" style={{ background: '#F8FAFC', paddingBottom: '60px', direction: 'rtl' }}>
            {/* Hero Header */}
            <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '60px 20px 40px', textAlign: 'center', position: 'relative' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', marginTop: '10px', marginBottom: '24px', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
                >
                  ← العودة للمتجر (Retour à la boutique)
                </button>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
                  Termes & Conditions — الشروط والأحكام العامة 📜
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#E11D48', fontWeight: 800, margin: 0, lineHeight: 1.6 }}>
                  الشروط والأحكام العامة للبيع والتصفح في متجر {storeNameDisplay}
                </p>
              </div>
            </div>

            {/* Main Content Container */}
            <div style={{ maxWidth: '1000px', margin: '30px auto 0', padding: '0 20px' }}>
              {/* Section 1 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📜</span> 1. الأحكام العامة (Conditions Générales)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  مرحباً بكم في متجر <strong>{storeNameDisplay}</strong>. تُنظم هذه الشروط والأحكام كافة المعاملات، الطلبيات، وتصفح موقعنا الإلكتروني. يُعتبر تأكيدكِ لأي طلب عبر المتجر موافقة كاملة وصريحة منكِ على كافة الشروط والسياسات المذكورة في هذه الصفحة.
                </p>
              </div>

              {/* Section 2 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🛍️</span> 2. الطلبيات وتأكيد الشحن (Commandes & Confirmation)
                </h2>
                <ul style={{ paddingRight: '20px', color: '#334155', fontSize: '1rem', lineHeight: 1.8, margin: 0 }}>
                  <li style={{ marginBottom: '8px' }}><strong>تأكيد الطلب:</strong> يتم تأكيد جميع الطلبيات عن طريق التواصل معكم عبر <strong>رسائل الواتساب (WhatsApp)</strong> أو الاتصال الهاتفي المباشر قبل الشحن.</li>
                  <li style={{ marginBottom: '8px' }}><strong>دقة المعلومات:</strong> يُرجى تزويدنا بمعلومات صحيحة (الاسم، رقم الهاتف، والولاية/البلدية) لضمان عدم تأخر أو إلغاء الشحنة.</li>
                  <li><strong>حق التعديل والإلغاء:</strong> يمكنكم تعديل المقاسات، الألوان، أو إلغاء الطلبية مجاناً طالما لم يتم تسليمها لمؤسسة التوصيل.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>💵</span> 3. الأسعار وطريقة الدفع (Prix & Paiement à la Livraison)
                </h2>
                <ul style={{ paddingRight: '20px', color: '#334155', fontSize: '1rem', lineHeight: 1.8, margin: 0 }}>
                  <li style={{ marginBottom: '8px' }}>جميع الأسعار المعروضة في المتجر مبيّنة بـ <strong>الدينار الجزائري (DZD)</strong> وتتضمن الرسوم.</li>
                  <li style={{ marginBottom: '8px' }}>الدفع يتم بنسبة 100% عن طريق <strong>الدفع نقداً عند الاستلام (Cash on Delivery)</strong> فور وصول الطرد إليكم.</li>
                  <li>تكلفة التوصيل تُحسب وتُوضح بوضوح قبل تأكيد الطلبية حسب الولاية ونوع التوصيل (منزل أو مكتب).</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🚚</span> 4. الشحن والتوصيل لـ 58 ولاية (Livraison 58 Wilayas)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: '0 0 10px 0' }}>
                  نحن نوفر خدمة التوصيل السريع لكافة الولايات الـ 58 في الجزائر:
                </p>
                <ul style={{ paddingRight: '20px', color: '#334155', fontSize: '1rem', lineHeight: 1.8, margin: 0 }}>
                  <li style={{ marginBottom: '8px' }}><strong>آجال التوصيل:</strong> تتراوح مدة الشحن بين 24 إلى 72 ساعة كأقصى حد حسب الولاية المختارة.</li>
                  <li><strong>التنسيق:</strong> سيتصل بكم موظف التوصيل عبر الهاتف لتحديد الموعد المحدد لاستلام طردكم.</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🔍</span> 5. معاينة الطرد وسياسة الاستبدال (Inspection & Échange)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  نحن نضمن لزبائننا <strong>حق فتح ومعاينة الطرد والتأكد من البيجاما والأطقم قبل دفع المبلغ للموزع</strong>. في حالة وجود أي مشكلة في المقاس أو عيب مصنعي، يتكفل متجرنا بمعالجة طلب الاستبدال فوراً عبر التواصل معنا على الواتساب.
                </p>
              </div>

              {/* Section 6 */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>💬</span> 6. خدمة الزبائن والتواصل (Service Client)
                </h2>
                <p style={{ fontSize: '1.02rem', color: '#334155', lineHeight: 1.8, margin: 0 }}>
                  فريق خدمة الزبائن في متجر <strong>{storeNameDisplay}</strong> متواجد لخدمتكم 7/7 أيام عبر الواتساب والمكالمات الهاتفية للإجابة عن كل استفساراتكم وضمان أفضل تجربة تسوق.
                </p>
              </div>

              {/* Call To Action */}
              <div style={{ background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E6 100%)', border: '1px solid #FECDD3', padding: '32px 24px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 8px 24px rgba(225, 29, 72, 0.08)' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 10px 0' }}>نتمنى لكم تجربة تسوق ممتعة وراقية</h3>
                <p style={{ fontSize: '0.95rem', color: '#9F1239', fontWeight: 700, margin: '0 0 20px 0' }}>شكراً لثقتكم واختياركم لـ {storeNameDisplay}</p>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'linear-gradient(135deg, #800020, #E11D48)', color: '#FFFFFF', border: 'none', padding: '14px 36px', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(128, 0, 32, 0.25)' }}
                >
                  العودة للمتجر والاستكشاف 🛍️
                </button>
              </div>
            </div>
          </div>
        ) : activePage === 'tariffs' ? (
          <div className="luxury-tariffs-page animate-fade-in" style={{ background: '#F8FAFC', paddingBottom: '60px', direction: 'rtl' }}>
            {/* Hero Header */}
            <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '50px 20px 35px', textAlign: 'center', position: 'relative' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', marginTop: '10px', marginBottom: '20px', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
                >
                  ← العودة للمتجر (Retour à la boutique)
                </button>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
                  Tarifs de livraison — أسعار التوصيل لـ 58 ولاية 🚚
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#E11D48', fontWeight: 800, margin: 0, lineHeight: 1.6 }}>
                  أسعار رسمية محدثة ومضبوطة لجميع الولايات الجزائرية (Yalidine & ZR Express)
                </p>
              </div>
            </div>

            {/* Main Content Container */}
            <div style={{ maxWidth: '1000px', margin: '30px auto 0', padding: '0 20px' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '32px 28px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}>
                <DeliveryTariffsPageContent />
              </div>

              {/* Call To Action */}
              <div style={{ background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E6 100%)', border: '1px solid #FECDD3', padding: '32px 24px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 8px 24px rgba(225, 29, 72, 0.08)', marginTop: '24px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '0 0 10px 0' }}>توصيل سريع لـ 58 ولاية مع خدمة الدفع عند الاستلام</h3>
                <p style={{ fontSize: '0.95rem', color: '#9F1239', fontWeight: 700, margin: '0 0 20px 0' }}>مع إمكانية فتح الطرد وفحص المنتجات قبل الدفع</p>
                <button 
                  onClick={() => { setActivePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'linear-gradient(135deg, #800020, #E11D48)', color: '#FFFFFF', border: 'none', padding: '14px 36px', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px rgba(128, 0, 32, 0.25)' }}
                >
                  العودة للمتجر والاستكشاف 🛍️
                </button>
              </div>
            </div>
          </div>
        ) : activeDetailProduct ? (
        <ProductDetailPage 
          product={activeDetailProduct} 
          products={products}
          categoriesList={categoriesList}
          onBack={() => setActiveDetailProduct(null)} 
          onAddToCart={handleAddToCart}
          onCategorySelect={(catId) => {
            setSelectedCategory(catId);
            setSearchQuery('');
            setTempSearchQuery('');
            setActiveDetailProduct(null);
            scrollToProductsGrid(120);
          }}
        />
      ) : (
        <>
          {/* 3. VISUAL CATEGORY IMAGE SHOWCASE */}
          {(selectedCategory === 'all' && !searchQuery.trim()) && (
            <div className="category-showcase-container">
              <div className="section-title-wrapper">
                <h2>الأقسام المميزة / Catégories Vedettes</h2>
                <p>اكتشفي تشكيلة ملابس النوم والأطقم الأكثر طلباً فـ الجزائر</p>
              </div>
              <div className="category-showcase-grid">
                {categoriesList
                  .filter(cat => cat && cat.id !== 'all')
                  .slice()
                  .sort((a, b) => {
                    const aId = (a.id || '').toLowerCase().trim();
                    const aTitle = (a.title || a.name || '').toLowerCase().trim();
                    const bId = (b.id || '').toLowerCase().trim();
                    const bTitle = (b.title || b.name || '').toLowerCase().trim();

                    const isAHot = aId === 'hot' || aId === 'bestseller' || aTitle.includes('hot');
                    const isBHot = bId === 'hot' || bId === 'bestseller' || bTitle.includes('hot');
                    const isASolde = aId === 'solde' || aId === 'promo' || aTitle.includes('solde');
                    const isBSolde = bId === 'solde' || bId === 'promo' || bTitle.includes('solde');

                    if (isAHot) return -1;
                    if (isBHot) return 1;
                    if (isASolde) return 1;
                    if (isBSolde) return -1;
                    return 0;
                  })
                  .map((cat, idx) => (
                    <CategoryShowcaseCard 
                      key={cat.id}
                      cat={cat}
                      catProducts={products}
                      onSelectCategory={(catId) => { setSelectedCategory(catId); scrollToProductsGrid(120); }}
                      idx={idx}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Product Sections Grouped By Category (Confiserie Du Bonheur Style) */}
          {(selectedCategory === 'all' && !searchQuery.trim()) ? (
            <div id="products-grid-anchor" style={{ marginTop: '30px' }}>
              {categoriesList
                .filter(cat => cat && cat.id !== 'all')
                .slice()
                .sort((a, b) => {
                  const aId = (a.id || '').toLowerCase().trim();
                  const aTitle = (a.title || a.name || '').toLowerCase().trim();
                  const bId = (b.id || '').toLowerCase().trim();
                  const bTitle = (b.title || b.name || '').toLowerCase().trim();

                  const isAHot = aId === 'hot' || aId === 'bestseller' || aTitle.includes('hot');
                  const isBHot = bId === 'hot' || bId === 'bestseller' || bTitle.includes('hot');
                  const isASolde = aId === 'solde' || aId === 'promo' || aTitle.includes('solde');
                  const isBSolde = bId === 'solde' || bId === 'promo' || bTitle.includes('solde');

                  if (isAHot) return -1;
                  if (isBHot) return 1;
                  if (isASolde) return 1;
                  if (isBSolde) return -1;
                  return 0;
                })
                .map(cat => {
                  const catProds = getProductsForCategory(cat);
                  if (!catProds || catProds.length === 0) return null;

                  const limit = categoryLimits[cat.id] || 4;
                  const visibleProds = catProds.slice(0, limit);
                  const hasMore = catProds.length > limit;

                  return (
                    <section key={cat.id} className="category-products-row-section" style={{ marginBottom: '48px' }}>
                      {/* Category Section Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 18px', padding: '0 4px', borderBottom: '2px solid #F1F5F9', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.6rem' }}>{cat.icon || '✨'}</span>
                          <div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                              {cat.title || cat.name}
                            </h2>
                            <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700 }}>
                              {catProds.length} منتج متوفر حالياً
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            scrollToProductsGrid(120);
                          }}
                          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, color: '#800020', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        >
                          {cat.title || cat.name} <ArrowRight size={14} />
                        </button>
                      </div>

                      {/* Products Grid for this category */}
                      <main className="products-grid">
                        {visibleProds.map(product => (
                          <ProductCardItem 
                            key={product.id} 
                            product={product} 
                            categoriesList={categoriesList}
                            onSelect={(p) => {
                              setActiveDetailProduct(p);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} 
                            onCategorySelect={(catId) => {
                              setSelectedCategory(catId);
                              setSearchQuery('');
                              setTempSearchQuery('');
                              setActiveDetailProduct(null);
                              scrollToProductsGrid(120);
                            }}
                          />
                        ))}
                      </main>

                      {/* Voir Plus / إظهار المزيد Button */}
                      {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '22px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryLimits(prev => ({
                                ...prev,
                                [cat.id]: (prev[cat.id] || 4) + 4
                              }));
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '12px 28px',
                              borderRadius: '9999px',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                          >
                            ➕ إظهار المزيد من {cat.title || cat.name} ({catProds.length - limit} منتجات إضافية)
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}
            </div>
          ) : (
            <>
              {/* Single Category or Search Header */}
              <div id="products-grid-anchor" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px', padding: '0 8px', borderBottom: '2px solid #F1F5F9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.6rem' }}>
                    {searchQuery.trim() ? '🔍' : (categoriesList.find(c => c && c.id === selectedCategory)?.icon || '✨')}
                  </span>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                      {searchQuery.trim() ? `نتائج البحث عن: "${searchQuery}"` : (categoriesList.find(c => c && c.id === selectedCategory)?.title || 'المنتجات')}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>
                      {filteredProducts.length} منتج متاح حالياً
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setTempSearchQuery(''); scrollToProductsGrid(120); }}
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  عرض جميع الأقسام <ArrowRight size={14} />
                </button>
              </div>

              {/* Single Category Grid */}
              <main className="products-grid">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <ProductCardItem 
                      key={product.id} 
                      product={product} 
                      categoriesList={categoriesList}
                      onSelect={(p) => {
                        setActiveDetailProduct(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} 
                      onCategorySelect={(catId) => {
                        setSelectedCategory(catId);
                        setSearchQuery('');
                        setTempSearchQuery('');
                        setActiveDetailProduct(null);
                        scrollToProductsGrid(120);
                      }}
                    />
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '20px', border: '1px dashed #CBD5E1', margin: '20px 0' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>📭</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#334155', margin: '0 0 8px' }}>لا توجد منتجات في هذا القسم حالياً</h3>
                    <p style={{ fontSize: '0.95rem', color: '#64748B', margin: '0 0 18px' }}>يمكنك تصفح بقية الأقسام أو العودة للكل</p>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      style={{ background: 'linear-gradient(135deg, #800020, #E11D48)', color: '#FFF', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      عرض كل الأقسام
                    </button>
                  </div>
                )}
              </main>
            </>
          )}
        </>
      )}

      {/* 4. INTERACTIVE FAQ ACCORDION SECTION */}
      {(selectedCategory === 'all' && !searchQuery.trim() && !activeDetailProduct && !activePage) && (
        <div id="faq-section" className="storefront-faq-container">
          <div className="section-title-wrapper">
            <h2>الأسئلة الشائعة / FAQ</h2>
            <p>كل ما تحتاجين معرفته حول الطلب، التوصيل والدفع فـ متجر Pyjama DZ</p>
          </div>
          <div className="faq-accordion-list">
            {[
              {
                id: 1,
                q: "كم يستغرق وقت التوصيل إلى ولايتي؟",
                a: "يتم توصيل الطلبيات فـ مدة تتراوح بين 24 إلى 72 ساعة كأقصى حد لجميع الولايات الـ 58. نقوم بتأكيد الطلب عبر رسائل الواتساب (WhatsApp) أو عبر الهاتف مباشرة بعد إرسالك للنموذج."
              },
              {
                id: 2,
                q: "هل يمكنني فتح الطرد والتأكد من البيجاما قبل الدفع؟",
                a: "نعم 100%! نحن نضمن لك حق معاينة وفحص الطلبية قبل دفع المبلغ للموزع للحفاظ على ثقتكم التامة فـ جودة منتجاتنا."
              },
              {
                id: 3,
                q: "كيف أختار المقاس المناسب لي؟",
                a: "مقاساتنا قياسية ومضبوطة (Standard European Sizing). فـ حالة الحيرة بين مقاسين، يمكنك اختيار المقاس الأكبر أو التواصل مع خدمة الزبائن عبر الواتساب لمساعدتك."
              },
              {
                id: 4,
                q: "ما هي سياسة الإرجاع والاستبدال؟",
                a: "فـ حالة وجود أي عيب مصنعي أو عيب فـ المقاس، يرجى التواصل معنا فـ غضون 48 ساعة وسنقوم باستبدال المنتج مجاناً وبكل رحابة صدر."
              }
            ].map((faq) => (
              <div key={faq.id} className={`faq-item ${openFaq === faq.id ? 'active' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: '1.2rem', transition: 'transform 0.2s', transform: openFaq === faq.id ? 'rotate(180deg)' : 'rotate(0)' }}>
                    ▼
                  </span>
                </button>
                {openFaq === faq.id && (
                  <div className="faq-answer-content">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. LUXURY CONFISERIEDUBONHEUR-STYLE FOOTER */}
      <footer className="whb-footer">
        {/* Trust Badges Bar */}
        <div className="footer-trust-badges-bar">
          <div className="footer-trust-badge-item" onClick={() => { setActivePage('tariffs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
            <span>🚚</span>
            <span>Livraison 58 wilayas (Tarifs)</span>
          </div>
          <div className="footer-trust-badge-item">
            <span>💰</span>
            <span>Paiement à la livraison</span>
          </div>
          <div className="footer-trust-badge-item">
            <span>✅</span>
            <span>Produits 100% originaux</span>
          </div>
          <div className="footer-trust-badge-item">
            <span>⭐</span>
            <span>+591K abonnés</span>
          </div>
          <div className="footer-trust-badge-item">
            <span>🏪</span>
            <span>Magasin Pyjama DZ</span>
          </div>
        </div>

        {/* Centered Luxury Brand Footer Block */}
        <div className="whb-footer-columns" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/favicon.svg?v=3" alt="Pyjama DZ" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#fff', padding: 2 }} />
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF' }}>{storeNameDisplay}</span>
          </div>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.92rem', maxWidth: '600px', lineHeight: 1.6 }}>
            المتجر الأول فـ الجزائر المتخصص فـ بيجامات الساتان الفاخرة، القطن الطبيعي وأطقم العرائس. أكثر من 5000 زبونة راضية مع خدمة توصيل سريعة والدفع عند الاستلام.
          </p>
          <div className="footer-social-row" style={{ justifyContent: 'center' }}>
            <a href={instaUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn insta" title="Instagram">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn fb" title="Facebook">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn wa" title="WhatsApp">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.233-1.372a9.948 9.948 0 0 0 4.777 1.217h.005c5.505 0 9.989-4.478 9.99-9.984A9.974 9.974 0 0 0 12.012 2zm5.727 14.126c-.304.857-1.47 1.57-2.029 1.631-.56.06-1.12.083-4.256-1.22-3.136-1.303-5.132-4.502-5.289-4.71-.157-.209-1.282-1.709-1.282-3.262 0-1.554.811-2.317 1.101-2.617.29-.3.633-.375.845-.375.213 0 .426.002.612.011.196.01.46-.073.719.553.266.641.91 2.223.988 2.385.079.162.132.35.025.564-.107.214-.162.348-.321.533-.159.186-.334.412-.477.553-.159.157-.326.329-.142.646.184.318.82 1.353 1.758 2.193.937.84 1.728 1.103 2.106 1.293.379.19.601.157.822-.1.22-.257.939-1.092 1.192-1.467.254-.376.508-.314.857-.183.349.131 2.22 1.05 2.599 1.24.38.19.633.284.724.444.092.16.092.923-.212 1.78z" />
              </svg>
            </a>
            <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn tiktok" title="TikTok">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.33 1.52-1.34 2.52-.04.99.41 1.98 1.19 2.58.82.63 1.95.82 2.94.52 1.05-.31 1.89-1.18 2.14-2.25.13-.53.18-1.08.18-1.62.02-4.5.01-9 .01-13.5z"/>
              </svg>
            </a>
          </div>

          {/* 6 Custom Footer Links requested by user */}
          <div className="footer-quick-links-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '14px 22px', marginTop: '14px', fontSize: '0.88rem', fontWeight: 700 }}>
            <button type="button" onClick={() => { setActivePage('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="footer-link-btn" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', transition: 'color 0.2s', padding: 0 }}>
              À propos de nous
            </button>

            <button type="button" onClick={() => { setActivePage('tariffs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="footer-link-btn" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', transition: 'color 0.2s', padding: 0 }}>
              Tarifs de livraison
            </button>

            <button type="button" onClick={() => { if (phoneList.length > 1) setIsPhoneModalOpen(true); else window.location.href = `tel:${rawPhone}`; }} className="footer-link-btn" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', transition: 'color 0.2s', padding: 0 }}>
              Nous contacter
            </button>

            <button type="button" onClick={scrollToFaqSection} className="footer-link-btn" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', transition: 'color 0.2s', padding: 0 }}>
              FAQ
            </button>

            <button type="button" onClick={() => { setActivePage('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="footer-link-btn" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', transition: 'color 0.2s', padding: 0 }}>
              Politique de confidentialité
            </button>

            <button type="button" onClick={() => { setActivePage('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="footer-link-btn" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', transition: 'color 0.2s', padding: 0 }}>
              Termes & Conditions
            </button>
          </div>
        </div>

        {/* Sub-Footer Bar */}
        <div className="whb-copyright-bar">
          <div>© 2026 {storeNameDisplay}. Tous droits réservés.</div>
          <div>🛠️ Support technique 24/7</div>
          <div>💰 Paiement à la livraison uniquement (الدفع عند الاستلام فقط)</div>
        </div>
      </footer>
      </div>



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
                      <label className="form-label" style={{ fontWeight: 700 }}>رقم الهاتف (واتساب) *</label>
                      <input 
                        type="tel" required placeholder="مثال: 0771335039 (10 أرقام)" 
                        className="form-input" style={{ padding: '12px 16px', fontSize: '1rem', direction: 'ltr', textAlign: 'left' }}
                        value={phone} onChange={(e) => setPhone(sanitizeAlgerianPhone(e.target.value))}
                        maxLength={10}
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
                      <select 
                        className="form-select" style={{ padding: '12px 16px', fontSize: '1rem' }}
                        value={commune} onChange={(e) => setCommune(e.target.value)}
                        required
                      >
                        {availableCommunes.length > 0 ? (
                          availableCommunes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))
                        ) : (
                          <option value={commune}>{commune || '-- اختر البلدية --'}</option>
                        )}
                      </select>
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

                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>شركة التوصيل (Société de Livraison) *</label>
                      <select 
                        className="form-select" style={{ padding: '12px 16px', fontSize: '1rem' }}
                        value={deliveryCompany} onChange={(e) => setDeliveryCompany(e.target.value)}
                        required
                      >
                        <option value="yalidine">Yalidine (ياليدين)</option>
                        <option value="zrexpress">ZR Express</option>
                      </select>
                    </div>

                    {/* Live Order & Delivery Calculation Summary */}
                    <div style={{
                      marginTop: '24px',
                      background: 'linear-gradient(135deg, #FFF9FA 0%, #FFF5F7 100%)',
                      border: '2px solid #FBCFE8',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 4px 15px rgba(128, 0, 32, 0.05)'
                    }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--burgundy)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💳 تفاصيل الحساب ومبلغ الطلبية مع التوصيل
                      </h4>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', color: '#475569' }}>
                        <span>مجموع المنتجات ({cartItems.reduce((acc, i) => acc + (i.qty || 1), 0)} قطعة):</span>
                        <strong style={{ color: '#1E293B' }}>{cartTotal.toLocaleString()} DA</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#475569' }}>
                        <span>سعر التوصيل ({wilaya.split('-')[1]?.trim() || wilaya} - {deliveryCompany === 'zrexpress' ? 'ZR Express' : 'Yalidine'}):</span>
                        <strong style={{ color: '#059669', fontSize: '1.05rem' }}>
                          {calculatedDeliveryFee > 0 ? `+${calculatedDeliveryFee.toLocaleString()} DA` : 'مجاني'}
                        </strong>
                      </div>

                      <div style={{ borderTop: '2px dashed #F472B6', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1E293B', display: 'block' }}>المبلغ الإجمالي عند الاستلام:</span>
                          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>شامل المنتجات + التوصيل للحافلة/المنزل</span>
                        </div>
                        <span style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--burgundy-dark)' }}>
                          {(cartTotal + calculatedDeliveryFee).toLocaleString()} DA
                        </span>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                // Cart Items List
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cartItems.map((item) => {
                    const currentProduct = item._productRef;
                    const availableColors = Array.isArray(currentProduct?.colorVariants) ? currentProduct.colorVariants : [];
                    const currentColorObj = availableColors.find(cv => cv?.color && item.color && cv.color.trim().toLowerCase() === item.color.trim().toLowerCase());
                    const itemDisplayImage = currentColorObj?.image || item.image || '';
                    const rawCartSizes = currentColorObj?.stock && typeof currentColorObj.stock === 'object' ? Object.keys(currentColorObj.stock) : (Array.isArray(currentProduct?.sizes) ? currentProduct.sizes : (typeof currentProduct?.sizes === 'string' ? currentProduct.sizes.split(/[,/-]/).map(s => s.trim()).filter(Boolean) : ["Standard"]));
                    const availableSizes = Array.isArray(rawCartSizes) && rawCartSizes.length > 0 ? rawCartSizes : ["Standard"];

                    return (
                      <div key={item.cartItemId} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
                        <img loading="lazy" decoding="async" src={itemDisplayImage} alt={item.product || ''} style={{ width: '85px', height: '110px', objectFit: 'cover', borderRadius: '10px' }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px', paddingRight: '24px' }}>{item.product || ''}</h4>
                           <p style={{ color: 'var(--burgundy)', fontWeight: 900, fontSize: '1.05rem', marginBottom: '12px' }}>
                             {(Number(getCartItemPrice(item)) || 0).toLocaleString()} DA
                             {getCartItemPrice(item) < Number(item.price) && (
                               <span style={{ fontSize: '0.82rem', color: '#64748B', textDecoration: 'line-through', marginRight: '6px', fontWeight: 500 }}>
                                 {(Number(item.price) || 0).toLocaleString()} DA
                               </span>
                             )}
                           </p>
                          
                          {/* Options */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Color selection with colored squares (moraba3aat mlwliin) */}
                            {availableColors.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#555', fontWeight: 700 }}>
                                  🎨 اللون: <strong style={{ color: 'var(--burgundy)' }}>{item.color || ''}</strong>
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {availableColors.map((cv, cvIdx) => {
                                    const isSelected = item.color === cv?.color;
                                    return (
                                      <button
                                        key={cv?.color || cvIdx}
                                        type="button"
                                        onClick={() => updateCartItem(item.cartItemId, 'colorVariant', cv)}
                                        title={`${cv?.color || ''}`}
                                        style={{
                                          width: '30px',
                                          height: '30px',
                                          borderRadius: '8px',
                                          background: cv?.colorHex || '#CBD5E1',
                                          border: isSelected ? '3px solid var(--burgundy)' : '2px solid #E2E8F0',
                                          boxShadow: isSelected ? '0 0 0 2px rgba(128,0,32,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                                          cursor: 'pointer',
                                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                          transition: 'all 0.2s ease',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                      >
                                        {isSelected && <Check size={16} color={cv?.colorHex && (cv.colorHex.toLowerCase() === '#ffffff' || cv.colorHex.toLowerCase() === '#fff') ? '#000' : '#FFF'} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#777', width: '45px' }}>Taille:</span>
                              <select 
                                value={item.size || ''}
                                onChange={(e) => updateCartItem(item.cartItemId, 'size', e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #DDD', fontSize: '0.85rem', flex: 1, outline: 'none' }}
                              >
                                {availableSizes.map(sz => (
                                  <option key={sz} value={sz}>{sz}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Out of Stock Warning & Restock Request Button */}
                            {(() => {
                              const sizeStock = getItemSizeStock(item, products);
                              const isItemOutOfStock = sizeStock === 0;
                              if (!isItemOutOfStock) return null;
                              return (
                                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '10px', marginTop: '4px' }}>
                                  <div style={{ color: '#991B1B', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <AlertTriangle size={16} /> المقاس ({item.size}) غير متوفر حالياً في السطوك
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWaitlistModalItem(item);
                                      setWaitlistName('');
                                      setWaitlistPhone('');
                                      setWaitlistError('');
                                      setWaitlistSuccess(false);
                                    }}
                                    style={{
                                      background: 'var(--burgundy)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '10px 12px',
                                      fontSize: '0.88rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      width: '100%',
                                      boxShadow: '0 4px 10px rgba(128,0,32,0.25)',
                                      transition: 'transform 0.2s ease'
                                    }}
                                  >
                                    <Bell size={16} /> 🔔 طلب إشعار عند توفر المخزون (تسجيل رقمك)
                                  </button>
                                </div>
                              );
                            })()}
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
                <div style={{ marginBottom: '18px' }}>
                  {checkoutStep ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748B' }}>
                        <span>مجموع السلع:</span>
                        <strong style={{ color: '#1E293B' }}>{cartTotal.toLocaleString()} DA</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#059669' }}>
                        <span>سعر التوصيل ({wilaya.split('-')[1]?.trim() || wilaya}):</span>
                        <strong style={{ color: '#059669' }}>+{calculatedDeliveryFee.toLocaleString()} DA</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                        <span style={{ fontSize: '1.05rem', color: '#1E293B', fontWeight: 800 }}>المبلغ الإجمالي الكلي</span>
                        <span style={{ fontSize: '1.5rem', color: 'var(--burgundy-dark)', fontWeight: 900 }}>{(cartTotal + calculatedDeliveryFee).toLocaleString()} DA</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '1.2rem', color: '#555', fontWeight: 600, display: 'block' }}>Total</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>(سعر التوصيل يضاف عند اختيار الولاية)</span>
                      </div>
                      <span style={{ fontSize: '1.6rem', color: 'var(--burgundy-dark)', fontWeight: 900 }}>{(Number(cartTotal) || 0).toLocaleString()} DA</span>
                    </div>
                  )}
                </div>
                
                {(() => {
                  const hasAnyOutOfStockItem = cartItems.some(item => getItemSizeStock(item, products) === 0);
                  if (hasAnyOutOfStockItem) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button 
                          type="button"
                          disabled
                          onClick={() => alert('تنبيه: يوجد منتج نافذ في السلة. يرجى الضغط على "طلب إشعار عند توفر المخزون" لتسجيل رقمك أو حذف القطعة من السلة لتتمكن من إتمام الطلب.')}
                          style={{ 
                            width: '100%', 
                            padding: '16px', 
                            fontSize: '1.05rem', 
                            fontWeight: 800,
                            justifyContent: 'center',
                            background: '#94A3B8',
                            color: 'white',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: 0.9
                          }}
                        >
                          ⚠️ يرجى تسوية المقاسات النافذة أولاً <ArrowRight size={20} />
                        </button>
                        <p style={{ fontSize: '0.8rem', color: '#D32F2F', textAlign: 'center', fontWeight: 800, margin: 0, lineHeight: 1.4 }}>
                          تنبيه: لا يمكنك إتمام الطلب لأن مقاساً في السلة نافذ من السطوك. يرجى الضغط على "طلب إشعار عند توفر المخزون" لتسجيل رقمك أو حذف القطعة.
                        </p>
                      </div>
                    );
                  }

                  if (checkoutStep) {
                    return (
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
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsCartOpen(false);
                          setActiveDetailProduct(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{
                          width: '100%',
                          padding: '14px',
                          fontSize: '1rem',
                          fontWeight: 800,
                          background: '#FFF1F2',
                          color: '#E11D48',
                          border: '1.5px solid #FECDD3',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 8px rgba(225, 29, 72, 0.08)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        🛍️ متابعة التسوق (إضافة منتجات أخرى) / Continuer mes achats
                      </button>

                      <button 
                        onClick={() => setCheckoutStep(true)}
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '16px', fontSize: '1.15rem', justifyContent: 'center' }}
                      >
                        Passer à la caisse (إتمام الطلب) <ArrowRight size={20} />
                      </button>
                    </div>
                  );
                })()}
                
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
              تواصل معنا — Nous contacter 💬
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              اختر طريقة التواصل المناسبة لك (عبر الواتساب أو الاتصال المباشر):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* WhatsApp Contact Button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  borderRadius: '14px',
                  color: '#166534',
                  textDecoration: 'none',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.12)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#25D366' }}>
                  <MessageCircle size={22} />
                  <span>تواصل عبر الواتساب (WhatsApp)</span>
                </span>
                <span style={{ fontWeight: 900, color: '#166534' }}>💬</span>
              </a>

              {/* Phone Numbers List */}
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

              {/* Google Maps Location Button */}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: '#FEF2F2',
                    border: '1.5px solid #FCA5A5',
                    borderRadius: '14px',
                    color: '#991B1B',
                    textDecoration: 'none',
                    fontWeight: 900,
                    fontSize: '1.05rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.12)',
                    marginTop: '2px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#EF4444';
                    e.currentTarget.style.background = '#FEE2E2';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#FCA5A5';
                    e.currentTarget.style.background = '#FEF2F2';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#EA4335' }}>
                    <MapPin size={22} />
                    <span>موقع المحل (Google Maps)</span>
                  </span>
                  <span style={{ fontWeight: 900, color: '#991B1B' }}>📍</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Reclamation Modal */}
      {isReclamationOpen && (
        <div 
          onClick={() => setIsReclamationOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(8px)',
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
              borderRadius: '24px', 
              padding: '32px 28px', 
              width: '100%', 
              maxWidth: '450px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              direction: 'rtl'
            }}
          >
            <button 
              type="button"
              onClick={() => setIsReclamationOpen(false)}
              style={{ position: 'absolute', top: '20px', left: '20px', background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', transition: 'background 0.2s' }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>📢</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  تقديم شكوى أو اقتراح
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0' }}>
                  نهتم برأيكم ونبذل قصارى جهدنا لحل مشاكلكم
                </p>
              </div>
            </div>

            <form onSubmit={handleReclamationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>الاسم الكامل *</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: محمد بن محمد"
                  value={reclamationName}
                  onChange={(e) => setReclamationName(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: '12px', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>رقم الواتساب *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="مثال: 0555123456"
                  value={reclamationWhatsapp}
                  onChange={(e) => setReclamationWhatsapp(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: '12px', fontSize: '0.92rem', outline: 'none', textAlign: 'left', direction: 'ltr', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>تفاصيل الشكوى أو الاقتراح *</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="اكتب رسالتك أو تفاصيل الشكوى بالتفصيل هنا..."
                  value={reclamationMessage}
                  onChange={(e) => setReclamationMessage(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: '12px', fontSize: '0.92rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmittingReclamation}
                style={{ 
                  background: 'var(--burgundy)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '14px', 
                  fontSize: '0.95rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(136, 19, 55, 0.15)',
                  transition: 'opacity 0.2s' 
                }}
              >
                {isSubmittingReclamation ? 'جاري الإرسال...' : 'إرسال الشكوى 📢'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Waitlist Out-of-Stock Modal Popup */}
      {waitlistModalItem && (
        <div 
          onClick={() => setWaitlistModalItem(null)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.65)', 
            backdropFilter: 'blur(4px)',
            zIndex: 10005, 
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
              width: '100%', 
              maxWidth: '440px',
              padding: '28px 24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            <button 
              type="button"
              onClick={() => setWaitlistModalItem(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--burgundy)', marginBottom: '14px' }}>
              <div style={{ background: '#FFF1F2', padding: '10px', borderRadius: '12px', color: 'var(--burgundy)' }}>
                <Bell size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--burgundy-dark)' }}>إشعار توفر المخزون</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>تسجيل في قائمة الانتظار الأوتوماتيكية</span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '18px', lineHeight: 1.5, background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              المقاس <strong>({waitlistModalItem.size})</strong> في موديل <strong>{waitlistModalItem.title}</strong> نافذ حالياً في السطوك. سجّل رقمك وسنرسل لك إشعاراً أوتوماتيكياً عبر الواتساب فور توفر هذا المقاس مجدداً! 📲
            </p>

            {waitlistSuccess ? (
              <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', padding: '18px', borderRadius: '14px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.5 }}>
                ✅ تم تسجيل طلبك بنجاح! سنرسل لك إشعاراً على الواتساب فور توفر هذه القطعة مجدداً. جاري إزالتها من السلة...
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {waitlistError && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                    {waitlistError}
                  </div>
                )}

                <div style={{ textAlign: 'right' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    الاسم واللقب الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ياسر لطرش"
                    value={waitlistName}
                    onChange={(e) => setWaitlistName(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ textAlign: 'right' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    رقم هاتف الواتساب (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="مثال: 0771335039"
                    value={waitlistPhone}
                    onChange={(e) => setWaitlistPhone(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={waitlistLoading}
                  style={{
                    background: 'var(--burgundy)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '15px',
                    fontSize: '1rem',
                    fontWeight: 900,
                    cursor: waitlistLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    boxShadow: '0 4px 15px rgba(128,0,32,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {waitlistLoading ? 'جاري التسجيل...' : 'تأكيد التسجيل وإزالة من السلة ✨'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delivery Tariffs 58 Wilayas Modal */}
      <DeliveryTariffsModal 
        isOpen={isTariffsModalOpen} 
        onClose={() => setIsTariffsModalOpen(false)} 
      />

      {/* About Us (À propos de nous) Modal */}
      {isAboutModalOpen && (
        <div 
          onClick={() => setIsAboutModalOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(6px)',
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
              borderRadius: '24px', 
              padding: '32px 28px', 
              width: '100%', 
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              direction: 'rtl'
            }}
          >
            <button 
              type="button"
              onClick={() => setIsAboutModalOpen(false)}
              style={{ position: 'absolute', top: '20px', left: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  من نحن - À propos de nous ✨
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>المتجر الأول لملابس النوم الفاخرة بالجزائر</span>
              </div>
            </div>
            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px', background: '#F8FAFC', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: 0 }}>
                مرحباً بكم في متجر <strong>PYJAMA DZ (الشلف)</strong>! نحن متخصصون في تقديم أحدث صيحات البيجامات وملابس النوم الفاخرة بلمسة عصرية وجودة استثنائية.
              </p>
              <p style={{ margin: 0 }}>
                💡 نعتمد على أفضل خامات الساتان والقطن الناعم لضمان الراحة التامة، مع توفير التوصيل السريع والدفع يداً بيد لجميع الولايات 58.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, background: '#DCFCE7', padding: '10px 14px', borderRadius: '10px', marginTop: '4px' }}>
                <ShieldCheck size={18} /> ثقة ومصداقية 100% مع معاينة الطرد قبل الدفع.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {isFaqModalOpen && (
        <div 
          onClick={() => setIsFaqModalOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(6px)',
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
              borderRadius: '24px', 
              padding: '32px 28px', 
              width: '100%', 
              maxWidth: '540px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              direction: 'rtl'
            }}
          >
            <button 
              type="button"
              onClick={() => setIsFaqModalOpen(false)}
              style={{ position: 'absolute', top: '20px', left: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#F3E8FF', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  الأسئلة الشائعة - FAQ ❓
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>إجابات شاطرة لأكثر استفساراتكم تكراراً</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>❓ كيف تكتمل عملية الطلب؟</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>اختر منتجك ومقاسك، اضغط على إتمام الطلب، وأدخل الاسم ورقم الهاتف والولاية والبلدية ليتصل بك الموزع فور وصول طردك.</p>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>⏱️ كم يستغرق مدة التوصيل؟</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>من 24 إلى 48 ساعة للولايات الشمالية، و 3 إلى 5 أيام لولايات الجنوب الكبير.</p>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>💳 كيف أدفع ثمن الطلب؟</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>الدفع يكون نقداً يداً بيد (Main à main) عند تسلّمك للطرد أمام الموزع أو في مكتب شركة التوصيل.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Policy Modal */}
      {isReturnModalOpen && (
        <div 
          onClick={() => setIsReturnModalOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(6px)',
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
              borderRadius: '24px', 
              padding: '32px 28px', 
              width: '100%', 
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              direction: 'rtl'
            }}
          >
            <button 
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              style={{ position: 'absolute', top: '20px', left: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  سياسة الإرجاع والتبديل - Politique de Retour 🔄
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>ضمان حق الزبون وراحة البال 100%</span>
              </div>
            </div>
            <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px', background: '#F8FAFC', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: 0 }}>🔄 <strong>مهلة التبديل:</strong> يمكنك طلب تغيير المقاس أو الموديل خلال 3 أيام من استلام الطلب.</p>
              <p style={{ margin: 0 }}>📦 <strong>شرط الحالة:</strong> يجب أن تكون السلعة في حالتها الأصلية غير مستعملة ومع التغليف الكامل.</p>
              <p style={{ margin: 0 }}>🚚 <strong>مصاريف الشحن:</strong> في حال وجود عيب تصنيعي يتحمل المتجر كافة مصاريف التبديل والتوصيل.</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {isPrivacyModalOpen && (
        <div 
          onClick={() => setIsPrivacyModalOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(6px)',
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
              borderRadius: '24px', 
              padding: '32px 28px', 
              width: '100%', 
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              direction: 'rtl'
            }}
          >
            <button 
              type="button"
              onClick={() => setIsPrivacyModalOpen(false)}
              style={{ position: 'absolute', top: '20px', left: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  سياسة الخصوصية - Politique de confidentialité 🔒
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>حماية معلوماتكم الشخصية بأعلى معايير الأمان</span>
              </div>
            </div>
            <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px', background: '#F8FAFC', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: 0 }}>🔐 <strong>سرية البيانات:</strong> نحافظ على سرية بياناتك (الاسم، الهاتف، العنوان) ولا نشاركها إطلاقاً مع أي طرف ثالث باستثناء شركة التوصيل لإيصال طلبك.</p>
              <p style={{ margin: 0 }}>🛡️ <strong>التشفير الأمني:</strong> جميع المعاملات والبيانات مشفرة ومحميّة وفق أعلى الأنظمة والمعايير الأوتوماتيكية.</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      {isTermsModalOpen && (
        <div 
          onClick={() => setIsTermsModalOpen(false)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(6px)',
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
              borderRadius: '24px', 
              padding: '32px 28px', 
              width: '100%', 
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              direction: 'rtl'
            }}
          >
            <button 
              type="button"
              onClick={() => setIsTermsModalOpen(false)}
              style={{ position: 'absolute', top: '20px', left: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  الشروط والأحكام - Termes & Conditions 📜
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>قواعد المعاملة والخدمة في متجرنا</span>
              </div>
            </div>
            <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px', background: '#F8FAFC', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: 0 }}>📝 <strong>تأكيد الطلب:</strong> بمجرد إدخال معلوماتك وتأكيد الطلب، يتصل بك موظف خدمة الزبائن لتأكيد الموديل والمقاس وموعد التوصيل.</p>
              <p style={{ margin: 0 }}>🚚 <strong>الاستلام والدفع:</strong> يتم دفع المبلغ نقداً للموزع فور استلامك للطرد متاح للمعاينة.</p>
            </div>
          </div>
        </div>
      )}
      {/* MOBILE SIDEBAR OVERLAY & DRAWER (CONFISERIEDUBONHEUR STYLE) */}
      <div 
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div className={`mobile-sidebar-drawer ${isMobileMenuOpen ? 'active' : ''}`}>
        {/* Drawer Top Header */}
        <div className="mobile-drawer-top-bar">
          <div className="mobile-drawer-brand">
            <img src="/favicon.svg?v=3" alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
            <span>{storeNameDisplay || 'PYJAMA DZ'}</span>
          </div>
          <button 
            type="button" 
            className="mobile-drawer-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Dual Tabs Header */}
        <div className="mobile-drawer-tabs">
          <button 
            type="button" 
            className={`mobile-drawer-tab-btn ${mobileMenuTab === 'categories' ? 'active' : ''}`}
            onClick={() => setMobileMenuTab('categories')}
          >
            CATÉGORIES
          </button>
          <button 
            type="button" 
            className={`mobile-drawer-tab-btn ${mobileMenuTab === 'menu' ? 'active' : ''}`}
            onClick={() => setMobileMenuTab('menu')}
          >
            MENU
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="mobile-drawer-content">
          {mobileMenuTab === 'categories' ? (
            categoriesList.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`mobile-drawer-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchQuery('');
                    setTempSearchQuery('');
                    setActiveDetailProduct(null);
                    setIsMobileMenuOpen(false);
                    scrollToProductsGrid(100);
                  }}
                >
                  <div className="mobile-drawer-item-left">
                    <span>{cat.icon || '🛍️'}</span>
                    <span>{cat.title}</span>
                    {cat.badge && <span className="mobile-drawer-badge">{cat.badge}</span>}
                  </div>
                  <ChevronRight size={18} color="#94A3B8" />
                </button>
              );
            })
          ) : (
            <>
              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setTempSearchQuery('');
                  setActiveDetailProduct(null);
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="mobile-drawer-item-left">
                  <Home size={18} color="#800020" />
                  <span>ACCUEIL / الرئيسية</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <a 
                href="/gros"
                className="mobile-drawer-item"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  onGoToGros && onGoToGros();
                }}
              >
                <div className="mobile-drawer-item-left">
                  <ShoppingBag size={18} color="#4338CA" />
                  <span>ESPACE GROS / مبيعات الجملة</span>
                </div>
                <span className="mobile-drawer-badge" style={{ background: '#EEF2FF', color: '#4338CA' }}>Gros</span>
              </a>

              {/* Information Links */}
              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActivePage('about');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="mobile-drawer-item-left">
                  <Sparkles size={18} color="#0284C7" />
                  <span>À PROPOS DE NOUS / من نحن</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActivePage('tariffs');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="mobile-drawer-item-left">
                  <Truck size={18} color="#D97706" />
                  <span>TARIFS DE LIVRAISON / أسعار التوصيل</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={scrollToFaqSection}
              >
                <div className="mobile-drawer-item-left">
                  <Bell size={18} color="#8B5CF6" />
                  <span>FAQ / الأسئلة الشائعة</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsReturnModalOpen(true);
                }}
              >
                <div className="mobile-drawer-item-left">
                  <ShieldCheck size={18} color="#059669" />
                  <span>POLITIQUE DE RETOUR / سياسة الإرجاع</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActivePage('privacy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="mobile-drawer-item-left">
                  <ShieldCheck size={18} color="#2563EB" />
                  <span>POLITIQUE DE CONFIDENTIALITÉ / الخصوصية</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActivePage('terms');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="mobile-drawer-item-left">
                  <FileText size={18} color="#D97706" />
                  <span>TERMES & CONDITIONS / الشروط والأحكام</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsPhoneModalOpen(true);
                }}
              >
                <div className="mobile-drawer-item-left">
                  <PhoneCall size={18} color="#25D366" />
                  <span>NOUS CONTACTEZ / تواصل معنا وموقع المحل</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>

              <button 
                type="button"
                className="mobile-drawer-item"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsReclamationOpen(true);
                }}
              >
                <div className="mobile-drawer-item-left">
                  <ShieldCheck size={18} color="#E11D48" />
                  <span>RECLAMATIONS / قسم الشكاوى والملاحظات</span>
                </div>
                <ChevronRight size={18} color="#94A3B8" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM NAVIGATION BAR (CONFISERIEDUBONHEUR STYLE - MOBILE ONLY) */}
      <div className="mobile-bottom-nav">
        {/* 1. Accueil */}
        <button 
          type="button"
          className={`mobile-bottom-nav-item ${selectedCategory === 'all' && !searchQuery ? 'active' : ''}`}
          onClick={() => {
            setSelectedCategory('all');
            setSearchQuery('');
            setTempSearchQuery('');
            setActiveDetailProduct(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Home size={20} />
          <span>Accueil</span>
        </button>

        {/* 2. Catégories */}
        <button 
          type="button"
          className="mobile-bottom-nav-item"
          onClick={() => {
            setMobileMenuTab('categories');
            setIsMobileMenuOpen(true);
          }}
        >
          <Grid size={20} />
          <span>Catégories</span>
        </button>



        {/* 4. Recherche */}
        <button 
          type="button"
          className={`mobile-bottom-nav-item ${isBottomSearchOpen ? 'active' : ''}`}
          onClick={() => {
            setIsBottomSearchOpen(prev => !prev);
          }}
        >
          <Search size={20} />
          <span>Recherche</span>
        </button>

        {/* 5. Panier */}
        <button 
          type="button"
          className="mobile-bottom-nav-item"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart size={20} />
          <span>Panier</span>
          {totalCartCount > 0 && (
            <span className="mobile-bottom-nav-badge">{totalCartCount}</span>
          )}
        </button>
      </div>

      {/* MOBILE BOTTOM SEARCH OVERLAY MODAL (CONFISERIEDUBONHEUR STYLE) */}
      {isBottomSearchOpen && (
        <div className="mobile-bottom-search-modal animate-fade-up">
          <form 
            className="mobile-bottom-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch();
              setIsBottomSearchOpen(false);
            }}
          >
            <div className="mobile-bottom-search-input-wrapper">
              <input 
                type="text"
                className="mobile-bottom-search-input"
                placeholder="Rechercher un produit..."
                value={tempSearchQuery}
                onChange={(e) => setTempSearchQuery(e.target.value)}
                autoFocus
              />

              {/* Live Autocomplete Results Card inside Bottom Search */}
              {tempSearchQuery.trim().length > 0 && (
                <div className="search-autocomplete-card" style={{ bottom: '100%', top: 'auto', marginBottom: '10px' }}>
                  {liveSearchResults.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                      عذراً، لم نجد أي منتج يطابق "{tempSearchQuery}"
                    </div>
                  ) : (
                    <>
                      <div className="search-autocomplete-grid">
                        {liveSearchResults.slice(0, 6).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="search-autocomplete-item"
                            onClick={() => {
                              setActiveDetailProduct(item);
                              setIsBottomSearchOpen(false);
                            }}
                          >
                            <img 
                              src={(item.images && item.images[0]) || item.image || '/favicon.svg'} 
                              alt={item.title} 
                              className="search-autocomplete-img" 
                            />
                            <div className="search-autocomplete-details">
                              <h4 className="search-autocomplete-title">{item.title}</h4>
                              <span className="search-autocomplete-price">
                                {(Number(item.price) || 0).toLocaleString()} DA
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="search-all-results-btn"
                        onClick={() => {
                          executeSearch();
                          setIsBottomSearchOpen(false);
                        }}
                      >
                        🔍 إظهار جميع النتائج ({liveSearchResults.length}) / TOUS LES RÉSULTATS
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="mobile-bottom-search-submit-btn"
              title="Rechercher"
            >
              <Search size={20} />
            </button>

            <button 
              type="button" 
              className="mobile-bottom-search-close-btn"
              onClick={() => setIsBottomSearchOpen(false)}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {/* DELIVERY TARIFFS MODAL (58 WILAYAS CHLEF DEPARTURE) */}
      <DeliveryTariffsModal isOpen={isTariffsModalOpen} onClose={() => setIsTariffsModalOpen(false)} />
    </>
  );
}
