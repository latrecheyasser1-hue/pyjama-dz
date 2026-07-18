import React, { useState, useEffect, useMemo } from 'react';
import { ALGERIA_WILAYAS, DEFAULT_CATEGORIES } from '../data/mockData';
import { showToast } from '../utils/toast';
import { ShoppingBag, Sparkles, ShieldCheck, Truck, PhoneCall, CheckCircle2, ArrowRight, Lock, MapPin, ShoppingCart, X, Plus, Minus, Trash2, Check, Heart, Star, Search, User } from 'lucide-react';

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
              <img src={img || ''} alt={product?.title || ''} className="product-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
  const rawSizes = activeVariant?.stock && typeof activeVariant.stock === 'object'
    ? Object.keys(activeVariant.stock)
    : (Array.isArray(product?.sizes) ? product.sizes : (typeof product?.sizes === 'string' ? product.sizes.split(/[,/-]/).map(s => s.trim()).filter(Boolean) : ["Standard"]));
  const availableSizes = (Array.isArray(rawSizes) && rawSizes.length > 0 ? rawSizes : ["Standard"]).sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return 0; // maintain original order for clothes (e.g. S, M, L)
  });

  // Clear selected size if it's no longer available or out of stock in the newly selected color variant
  useEffect(() => {
    if (selectedSize) {
      const sizeStock = activeVariant?.stock && typeof activeVariant.stock === 'object' && activeVariant.stock[selectedSize] !== undefined
        ? Number(activeVariant.stock[selectedSize])
        : null;
      if (!availableSizes.includes(selectedSize) || (sizeStock !== null && sizeStock <= 0)) {
        setSelectedSize(null);
      }
    }
  }, [selectedVariantIdx]);

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
                  <img src={img} alt={`${product.title} thumbnail ${idx}`} />
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
                      <img src={firstImg} alt={lp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                const sizeStock = activeVariant?.stock && typeof activeVariant.stock === 'object' && activeVariant.stock[size] !== undefined
                  ? Number(activeVariant.stock[size])
                  : null;
                const isZeroStock = sizeStock !== null && sizeStock <= 0;

                return (
                  <button
                    key={size}
                    type="button"
                    className={`size-swatch-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => !isZeroStock && setSelectedSize(size)}
                    disabled={isZeroStock}
                    style={isZeroStock ? { opacity: 0.45, border: '1px dashed #94A3B8', color: '#94A3B8', cursor: 'not-allowed', background: '#F1F5F9', textDecoration: 'line-through' } : {}}
                  >
                    {size} {isZeroStock && <span style={{ fontSize: '0.75em', display: 'block', fontWeight: 800, color: '#94A3B8' }}>(0)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector */}
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
                onClick={() => setQuantity(quantity + 1)}
                className="qty-btn"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button 
            type="button" 
            className="mazyoud-pdp-add-btn" 
            onClick={handleAdd}
          >
            <ShoppingCart size={20} style={{ marginLeft: '8px' }} />
            <span>إضافة إلى السلة / Ajouter au Panier</span>
          </button>

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
                      <img src={firstImage} alt={lp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

export default function Storefront({ products, settings, onPlaceOrder, onUpdateSettings, onGoToGros }) {
  const categoriesList = useMemo(() => {
    let list = settings?.categories && Array.isArray(settings.categories) && settings.categories.length > 0
      ? [...settings.categories]
      : [...DEFAULT_CATEGORIES];

    if (!list.some(c => c.id === 'all')) {
      list.unshift({ id: 'all', title: 'TOUT VOIR', icon: '✨', image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=300&q=80' });
    }
    if (!list.some(c => c.id === 'promo')) {
      list.push({ id: 'promo', title: '% SOLDES', icon: '🔥', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&q=80' });
    }
    return list;
  }, [settings?.categories]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeDetailProduct, setActiveDetailProduct] = useState(null);

  const [isReclamationOpen, setIsReclamationOpen] = useState(false);
  const [reclamationName, setReclamationName] = useState('');
  const [reclamationWhatsapp, setReclamationWhatsapp] = useState('');
  const [reclamationMessage, setReclamationMessage] = useState('');
  const [isSubmittingReclamation, setIsSubmittingReclamation] = useState(false);

  const handleReclamationSubmit = async (e) => {
    e.preventDefault();
    if (!reclamationName.trim() || !reclamationWhatsapp.trim() || !reclamationMessage.trim()) {
      alert('الرجاء ملء جميع الخانات المتاحة.');
      return;
    }
    setIsSubmittingReclamation(true);
    try {
      const newRecl = {
        id: 'REC-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        clientName: reclamationName.trim(),
        whatsappNumber: reclamationWhatsapp.trim(),
        message: reclamationMessage.trim(),
        status: 'nouvelle',
        createdAt: new Date().toISOString()
      };
      
      const existing = settings && Array.isArray(settings.reclamations) ? settings.reclamations : [];
      await onUpdateSettings({ reclamations: [newRecl, ...existing] });
      
      setReclamationName('');
      setReclamationWhatsapp('');
      setReclamationMessage('');
      setIsReclamationOpen(false);
      
      alert('تم إرسال شكواك بنجاح! سنتواصل معك عبر الواتساب في أقرب وقت.');
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Form fields
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState(ALGERIA_WILAYAS[15]); // Default Alger
  const [commune, setCommune] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('Livraison Domicile (توصيل للمنزل)');
  const [deliveryCompany, setDeliveryCompany] = useState('');

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

  const totalCartCount = cartItems.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
  const storeNameDisplay = settings?.storeName || "PYJAMA DZ";

  return (
    <>
      <div className="storefront-wrapper animate-fade-up">
        {/* 1. EXACT MAZYOUD HERO BANNER & HEADER REPLICA */}
        <section className={`mazyoud-hero-container ${(selectedCategory !== 'all' || searchQuery.trim() || activeDetailProduct) ? 'category-page-mode' : ''}`}>
          {(selectedCategory === 'all' && !searchQuery.trim() && !activeDetailProduct) && <div className="mazyoud-hero-overlay"></div>}

          {/* Top Header + Category Bar Layer */}
          <div className="mazyoud-top-nav-wrapper">
            {/* Main Luxury Transparent/Glass Header */}
            <header className="mazyoud-header">
              {/* Left: Brand Logo */}
              <div 
                className="mazyoud-brand" 
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setTempSearchQuery(''); setActiveDetailProduct(null); }}
              >
                <img 
                  src="/favicon.svg?v=3" 
                  alt="Pyjama DZ" 
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFFFF', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                />
                <span className="mazyoud-brand-text">{storeNameDisplay || 'PYJAMA DZ'}</span>
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
            </header>

            {/* Secondary Category Menu Bar (Horizontally Centered with Badges) */}
            <nav className="mazyoud-category-bar">
              {categoriesList.map((cat) => {
                let badgeText = cat.badge || null;
                let badgeColor = { bg: '#DC2626', color: '#FFFFFF' };
                if (cat.id === 'promo' && !badgeText) {
                  badgeText = '🔥 تخفيضات';
                  badgeColor = { bg: '#DC2626', color: '#FFFFFF' };
                } else if (cat.badge) {
                  badgeColor = { bg: '#581845', color: '#FFFFFF' };
                }

                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`mazyoud-cat-link ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSearchQuery('');
                      setTempSearchQuery('');
                      setActiveDetailProduct(null);
                      scrollToProductsGrid(120);
                    }}
                  >
                    {badgeText && (
                      <span 
                        className="mazyoud-cat-badge"
                        style={{ backgroundColor: badgeColor.bg, color: badgeColor.color }}
                      >
                        {badgeText}
                      </span>
                    )}
                    <span>{cat.title}</span>
                  </button>
                );
              })}
            </nav>

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
                          <img src={(prod.images && prod.images[0]) || prod.image || ''} alt={prod.title} className="mazyoud-search-prod-img" />
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
          </div>

          {/* Hero Brand Content */}
          {(selectedCategory === 'all' && !searchQuery.trim() && !activeDetailProduct) && (
            <div className="mazyoud-hero-content">
              <p className="mazyoud-hero-subtitle">أناقتك تبدأ من البيت — ملابس نوم فاخرة بجودة عالية</p>
              <p className="mazyoud-hero-tagline">Livraison partout en Algérie</p>
            </div>
          )}
        </section>

      {activeDetailProduct ? (
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
          {/* Product Grid Section Header */}
          <div id="products-grid-anchor" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px', padding: '0 8px', borderBottom: '2px solid #F1F5F9', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>
                {searchQuery.trim() ? '🔍' : (categoriesList.find(c => c && c.id === selectedCategory)?.icon || '✨')}
              </span>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                  {searchQuery.trim() ? `نتائج البحث عن: "${searchQuery}"` : (selectedCategory === 'all' ? 'جميع المنتجات (Catalogue Général)' : categoriesList.find(c => c && c.id === selectedCategory)?.title || 'المنتجات')}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>
                  {filteredProducts.length} منتج متاح حالياً
                </span>
              </div>
            </div>
            {(selectedCategory !== 'all' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setTempSearchQuery(''); scrollToProductsGrid(120); }}
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                عرض جميع المنتجات <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Product Grid */}
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
                  عرض كل المنتجات ({products.length})
                </button>
              </div>
            )}
          </main>
        </>
      )}

      {/* WoodMart Footer (whb-footer) */}
      <footer className="whb-footer">
        <div className="whb-footer-columns">
          {/* Column 1: Brand & Bio */}
          <div className="whb-footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img src="/favicon.svg?v=3" alt="Pyjama DZ" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#fff' }} />
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FFFFFF' }}>{storeNameDisplay}</span>
            </div>
            <p>
              المتجر الأول في الجزائر المتخصص في بيجامات الساتان الفاخرة، القطن الطبيعي وأطقم العرائس. جودة عالية وأسعار في متناول الجميع مع خدمة توصيل سريعة والدفع عند الاستلام.
            </p>
          </div>

          {/* Column 2: Catégories Populaires */}
          <div className="whb-footer-col">
            <h4>Catégories Populaires</h4>
            <ul>
              <li onClick={() => { setSelectedCategory('satin'); scrollToProductsGrid(120); }}>✨ Collection Satin de Soie</li>
              <li onClick={() => { setSelectedCategory('coton'); scrollToProductsGrid(120); }}>🧸 100% Coton Confort</li>
              <li onClick={() => { setSelectedCategory('mariee'); scrollToProductsGrid(120); }}>👰 Trousseau Mariée VIP</li>
              <li onClick={() => { setSelectedCategory('promo'); scrollToProductsGrid(120); }}>🔥 Promotions et Soldes</li>
            </ul>
          </div>

          {/* Column 3: Service & Livraison */}
          <div className="whb-footer-col">
            <h4>Service & Livraison</h4>
            <ul>
              <li>🚚 Livraison Rapide 58 Wilayas</li>
              <li>💵 Paiement à la Livraison (الدفع عند الاستلام)</li>
              <li>📐 Guide des Tailles & Coupe Standard</li>
              <li>🔄 Échange et Garantie Client</li>
            </ul>
          </div>

          {/* Column 4: Contact & Réseaux */}
          <div className="whb-footer-col">
            <h4>📞 Contact & Réseaux</h4>
            <ul>
              <li>
                <a href={instaUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1', textDecoration: 'none' }}>
                  <span>📸 Instagram : +591,000 Abonnées</span>
                </a>
              </li>
              <li>
                <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1', textDecoration: 'none' }}>
                  <span>💬 WhatsApp : {rawWa}</span>
                </a>
              </li>
              <li 
                onClick={() => {
                  if (phoneList.length > 1) setIsPhoneModalOpen(true);
                  else window.location.href = `tel:${rawPhone}`;
                }}
                style={{ cursor: 'pointer' }}
              >
                📞 Téléphone : {phoneList.join(' - ')}
              </li>
              <li>📍 {settings?.address || "Bab Ezzouar & Hydra, Alger"}</li>
            </ul>
          </div>

          {/* Column 5: Réclamation */}
          <div className="whb-footer-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '4px' }}>
            <button 
              onClick={() => setIsReclamationOpen(true)}
              style={{
                background: '#E11D48',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 20px',
                fontSize: '1rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                transition: 'all 0.2s',
                width: '100%',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#BE123C'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#E11D48'; }}
            >
              <span>📢</span>
              <span>تقديم شكوى أو اقتراح</span>
            </button>
          </div>
        </div>

        <div className="whb-copyright-bar">
          <div>© 2026 {storeNameDisplay}. Tous droits réservés. Conçu avec excellence pour l'Algérie 🇩🇿</div>
          <div>Paiement à la livraison 100% sécurisé (الدفع عند الاستلام)</div>
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

                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>شركة التوصيل (Société de Livraison) *</label>
                      <select 
                        className="form-select" style={{ padding: '12px 16px', fontSize: '1rem' }}
                        value={deliveryCompany} onChange={(e) => setDeliveryCompany(e.target.value)}
                        required
                      >
                        <option value="" disabled>-- إختر شركة التوصيل --</option>
                        <option value="yalidine">Yalidine (ياليدين)</option>
                        <option value="zrexpress">ZR Express</option>
                      </select>
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
                        <img src={itemDisplayImage} alt={item.product || ''} style={{ width: '85px', height: '110px', objectFit: 'cover', borderRadius: '10px' }} />
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
                            
                            {/* Qty & Remove */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', background: '#F5F5F5', borderRadius: '8px', padding: '4px' }}>
                                <button type="button" onClick={() => updateCartItem(item.cartItemId, 'qty', Math.max(0, item.qty - 1))} style={{ background: 'white', border: '1px solid #DDD', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={14} /></button>
                                <input type="number" min="0" value={item.qty} onChange={(e) => updateCartItem(item.cartItemId, 'qty', e.target.value)} style={{ width: '40px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', border: '1px solid #DDD', borderRadius: '4px', background: item.qty === 0 ? '#FFF0F0' : 'white', color: item.qty === 0 ? '#D32F2F' : '#333' }} />
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
                  <span style={{ fontSize: '1.6rem', color: 'var(--burgundy-dark)', fontWeight: 900 }}>{(Number(cartTotal) || 0).toLocaleString()} DA</span>
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
    </>
  );
}
