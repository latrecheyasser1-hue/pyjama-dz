import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, RefreshCw, ShoppingBag, Sparkles, Camera, Check } from 'lucide-react';
import { calculateRecommendedSize } from '../utils/sizeAdvisor';

export default function VirtualTryOnModal({
  isOpen,
  onClose,
  product,
  selectedVariantIdx = 0,
  initialImage = null,
  onAddToCart
}) {
  const [customerImage, setCustomerImage] = useState(initialImage || null);

  // Height & Weight for Size Recommendation ONLY (does not reload/regenerate image)
  const [height, setHeight] = useState('165');
  const [weight, setWeight] = useState('65');
  const [fitPreference] = useState('relaxed');
  const [currentColorIdx, setCurrentColorIdx] = useState(selectedVariantIdx || 0);

  // Loading & Result states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [cachedResults, setCachedResults] = useState({});

  const nativeCameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Available colors from product
  const colorVariants = useMemo(() => {
    if (Array.isArray(product?.colorVariants) && product.colorVariants.length > 0) {
      return product.colorVariants;
    }
    return [{
      color: 'اللون الأساسي',
      colorHex: '#800020',
      image: product?.image || (Array.isArray(product?.images) ? product.images[0] : '')
    }];
  }, [product]);

  const activeVariant = colorVariants[currentColorIdx] || colorVariants[0];

  // Available sizes
  const availableSizes = useMemo(() => {
    if (activeVariant?.stock && typeof activeVariant.stock === 'object') {
      return Object.keys(activeVariant.stock);
    }
    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
      return product.sizes;
    }
    if (typeof product?.sizes === 'string') {
      return product.sizes.split(/[,/-]/).map(s => s.trim()).filter(Boolean);
    }
    return ['S', 'M', 'L', 'XL', '2XL'];
  }, [activeVariant, product]);

  // Real-time size recommendation (Height + Weight update this instantly without touching the image)
  const sizeAnalysis = useMemo(() => {
    return calculateRecommendedSize({
      height,
      weight,
      fitPreference,
      availableSizes
    });
  }, [height, weight, fitPreference, availableSizes]);

  // Run Virtual Try-On (supports Fashn.ai cloud or local instant studio)
  const handleRunTryOn = async (targetColorIdx = currentColorIdx, sourceImage = customerImage) => {
    const imgToUse = sourceImage || customerImage;
    if (!imgToUse) {
      setErrorMessage('يرجى التقاط صورتك أو اختيارها من المعرض');
      return;
    }

    const targetVariant = colorVariants[targetColorIdx] || activeVariant;
    const targetGarmentImg = targetVariant?.image || product?.image || (Array.isArray(product?.images) ? product.images[0] : '');

    // Check cache for instant switching ("fem fem")
    const cacheKey = `${targetVariant.color || targetColorIdx}`;
    if (cachedResults[cacheKey]) {
      setResultImage(cachedResults[cacheKey]);
      setCurrentColorIdx(targetColorIdx);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCurrentColorIdx(targetColorIdx);

    try {
      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerImage: imgToUse,
          garmentImage: targetGarmentImg,
          productTitle: product?.title || 'Pyjama',
          color: targetVariant.color || '',
          height: Number(height) || 165,
          weight: Number(weight) || 65,
          bodyType: sizeAnalysis.bodyType || 'regular'
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'فشلت معالجة القياس الافتراضي');
      }

      setResultImage(data.resultImage);
      setCachedResults(prev => ({ ...prev, [cacheKey]: data.resultImage }));

    } catch (err) {
      console.error('Try-On request failed:', err);
      setErrorMessage(err.message || 'تعذر توليد الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image selected from gallery or native camera app
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target.result;
      setCustomerImage(dataUri);
      setErrorMessage(null);
      handleRunTryOn(currentColorIdx, dataUri);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add to cart with recommended size
  const handleAddToCartWithResult = () => {
    if (!onAddToCart) return;
    const finalSize = sizeAnalysis.recommendedSize || 'M';
    onAddToCart(product, currentColorIdx, {
      color: activeVariant?.color || 'Couleur',
      colorHex: activeVariant?.colorHex || '#800020',
      size: finalSize,
      image: activeVariant?.image || product?.image,
      qty: 1
    });
    onClose();
  };

  // Reset to retake photo directly via phone camera
  const handleRetakeCamera = () => {
    nativeCameraInputRef.current?.click();
  };

  const handlePickGallery = () => {
    galleryInputRef.current?.click();
  };

  // Trigger when opened or initialImage is provided
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentColorIdx(selectedVariantIdx || 0);
      setErrorMessage(null);

      if (initialImage) {
        setCustomerImage(initialImage);
        handleRunTryOn(selectedVariantIdx || 0, initialImage);
      }
    } else {
      document.body.style.overflow = '';
      setCustomerImage(null);
      setResultImage(null);
      setCachedResults({});
      setIsLoading(false);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialImage, selectedVariantIdx]);

  // Loading animation message sequence
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      setLoadingStep(0);
      const steps = [
        'جاري مسح الصورة وتجهيز استوديو القياس الافتراضي...',
        `جاري معالجة البيجاما بالذكاء الاصطناعي بلون ${activeVariant?.color || ''}...`,
        'جاري مطابقة القوام والمقاس المثالي...',
        'اللمسات الأخيرة للصورة بجودة واقعية...'
      ];
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % steps.length);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, activeVariant]);

  if (!isOpen || !product) return null;

  const loadingSteps = [
    'جاري مسح الصورة وتجهيز استوديو القياس الافتراضي...',
    `جاري معالجة البيجاما بالذكاء الاصطناعي بلون ${activeVariant?.color || ''}...`,
    'جاري مطابقة القوام والمقاس المثالي...',
    'اللمسات الأخيرة للصورة بجودة واقعية...'
  ];

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box',
        fontFamily: 'Cairo, sans-serif'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      {/* Hidden Native File Inputs */}
      {/* 1. Direct Native Phone Camera (opens phone camera app directly) */}
      <input 
        ref={nativeCameraInputRef}
        type="file" 
        accept="image/*" 
        capture="user"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* 2. Phone Gallery / Photo Library */}
      <input 
        ref={galleryInputRef}
        type="file" 
        accept="image/*" 
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* Modal Container */}
      <div 
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 1: LOADING / AI PROCESSING SCREEN                             */}
        {/* ------------------------------------------------------------------ */}
        {isLoading && (
          <div 
            style={{
              padding: '60px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              textAlign: 'center',
              backgroundColor: '#0F172A',
              color: '#FFFFFF'
            }}
          >
            <div style={{ position: 'relative', width: '84px', height: '84px' }}>
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '4px solid rgba(255, 255, 255, 0.1)',
                  borderTopColor: '#EC4899',
                  animation: 'spin 0.9s linear infinite'
                }} 
              />
              <div 
                style={{
                  position: 'absolute',
                  inset: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(236, 72, 153, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EC4899'
                }}
              >
                <Sparkles size={32} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                {loadingSteps[loadingStep]}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#94A3B8' }}>
                الذكاء الاصطناعي يقوم بتلبيس البيجاما بدقة الآن...
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 2: RESULT & SIZE FIT ADVISOR SCREEN                           */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && resultImage && (
          <div 
            style={{
              width: '100%',
              overflowY: 'auto',
              maxHeight: '92vh',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header on Result */}
            <div 
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAFAFA'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--burgundy, #6B1D2F)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--burgundy, #6B1D2F)" />
                <span>نتيجة القياس الافتراضي</span>
              </div>
              <button 
                type="button"
                onClick={onClose}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Dressed Studio Photo */}
              <div 
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '3/4',
                  backgroundColor: '#0F172A',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }}
              >
                <img 
                  src={resultImage} 
                  alt="نتيجة القياس" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Recommended Size Badge */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(107, 29, 47, 0.94)',
                    backdropFilter: 'blur(4px)',
                    color: '#FFFFFF',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  المقاس المقترح: {sizeAnalysis.recommendedSize || 'M'}
                </div>

                {/* Color Badge */}
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    color: '#FFFFFF',
                    padding: '4px 12px',
                    borderRadius: '14px',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  {activeVariant?.color || 'اللون المختار'}
                </div>
              </div>

              {/* Color Switcher (Cached = Instant "fem fem" switching) */}
              {colorVariants.length > 1 && (
                <div 
                  style={{
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #F1F5F9',
                    borderRadius: '14px',
                    padding: '12px'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>
                    جربي لون آخر مباشرة:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {colorVariants.map((variant, idx) => {
                      const isSelected = currentColorIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleRunTryOn(idx)}
                          disabled={isLoading}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid var(--burgundy, #6B1D2F)' : '1px solid #CBD5E1',
                            backgroundColor: isSelected ? '#FDF2F8' : '#FFFFFF',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            transition: 'all 0.15s'
                          }}
                        >
                          <span 
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: variant.colorHex || '#800020',
                              border: '1px solid rgba(0,0,0,0.1)'
                            }} 
                          />
                          <span>{variant.color || `لون ${idx + 1}`}</span>
                          {isSelected && <Check size={12} color="var(--burgundy, #6B1D2F)" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Height & Weight Inputs (ONLY for size recommendation, does NOT reload image) */}
              <div 
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1E293B' }}>
                    قياساتك لاقتراح المقاس المناسب:
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    (تغيير الطول والوزن هنا يُحدد المقاس المناسب فوراً بدون تغيير الصورة)
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      الطول (سم):
                    </label>
                    <input 
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      min="130"
                      max="220"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      الوزن (كغ):
                    </label>
                    <input 
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      min="35"
                      max="180"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Dynamic Size Match Badge */}
                {sizeAnalysis.recommendedSize && (
                  <div 
                    style={{
                      backgroundColor: '#FDF2F8',
                      border: '1px solid #FBCFE8',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#831843', fontWeight: 700 }}>
                        المقاس المثالي لقوامك:
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '1px' }}>
                        {sizeAnalysis.fitNote}
                      </div>
                    </div>
                    <div 
                      style={{
                        backgroundColor: 'var(--burgundy, #6B1D2F)',
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 900
                      }}
                    >
                      {sizeAnalysis.recommendedSize}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleAddToCartWithResult}
                  style={{
                    backgroundColor: 'var(--burgundy, #6B1D2F)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(107, 29, 47, 0.3)'
                  }}
                >
                  <ShoppingBag size={18} />
                  <span>إضافة المقاس المقترح ({sizeAnalysis.recommendedSize || 'M'}) إلى السلة</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRetakeCamera}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: 'var(--burgundy, #6B1D2F)',
                      border: '1px solid var(--burgundy, #6B1D2F)',
                      borderRadius: '12px',
                      padding: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Camera size={15} />
                    <span>تصوير بالكاميرا 📸</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePickGallery}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: '12px',
                      padding: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ImageIcon size={15} />
                    <span>من المعرض 🖼️</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 3: INITIAL PICKER SCREEN (Only shown if opened without photo)  */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && !resultImage && (
          <div 
            style={{
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy, #6B1D2F)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} />
                <span>القياس الافتراضي بالذكاء الاصطناعي</span>
              </div>
              <button 
                type="button"
                onClick={onClose}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B', lineHeight: 1.5 }}>
              التقطي صورة لجسمك أو اختاري صورة من الهاتف لرؤية البيجاما عليكِ واقتراح المقاس المناسب لكِ بدقة.
            </p>

            {errorMessage && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECDD3', color: '#991B1B', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Button 1: Native Phone Camera */}
              <button
                type="button"
                onClick={handleRetakeCamera}
                style={{
                  backgroundColor: 'var(--burgundy, #6B1D2F)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(107, 29, 47, 0.25)',
                  transition: 'transform 0.1s'
                }}
              >
                <Camera size={22} />
                <span>التقاط صورة بالكاميرا مباشرة 📸</span>
              </button>

              {/* Button 2: Phone Gallery */}
              <button
                type="button"
                onClick={handlePickGallery}
                style={{
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '16px',
                  padding: '14px 20px',
                  fontSize: '0.95rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <ImageIcon size={20} />
                <span>اختيار صورة من المعرض 🖼️</span>
              </button>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              🔒 صوركِ آمنة تماماً وخاصة، تُستخدم حصرياً لمعاينة المقاس.
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
