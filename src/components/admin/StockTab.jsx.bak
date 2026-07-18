import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Upload, Check, X, Layers, PlusCircle, MinusCircle } from 'lucide-react';

const ALL_SIZES = ["Standard", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export default function StockTab({ products, onAddProduct, onUpdateProduct, onDeleteProduct, suppliers }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedViewCategory, setSelectedViewCategory] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('satin');
  const [purchasePrice, setPurchasePrice] = useState(2500);
  const [price, setPrice] = useState(4000);
  const [oldPrice, setOldPrice] = useState(5500);
  const [supplierName, setSupplierName] = useState(suppliers[0]?.name || '');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800');
  const [description, setDescription] = useState('Pyjama en tissu luxueux de haute qualité.');
  
  // Matrix State: Array of { color: string, selectedSizes: { "M": 10, "L": 15 } }
  const [colorVariants, setColorVariants] = useState([
    { color: 'Rose Royale', selectedSizes: { "M": 10, "L": 10, "XL": 5 } }
  ]);

  const handleOpenNew = () => {
    setEditingId(null);
    setTitle('');
    setCategory('satin');
    setPurchasePrice(2500);
    setPrice(4000);
    setOldPrice(5500);
    setSupplierName(suppliers[0]?.name || '');
    setImage('https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800');
    setDescription('');
    setColorVariants([{ color: 'Rose Poudre', selectedSizes: { "M": 5, "L": 5 } }]);
    setIsFormOpen(true);
  };

  const handleOpenNewForCategory = (catId) => {
    handleOpenNew();
    setCategory(catId);
    setIsCustomCategory(false);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setTitle(p.title);
    setCategory(p.category);
    setPurchasePrice(p.purchasePrice || Math.round(p.price * 0.65));
    setPrice(p.price);
    setOldPrice(p.oldPrice || '');
    setSupplierName(p.supplier || suppliers[0]?.name || '');
    setImage(p.image);
    setDescription(p.description || '');

    if (p.colorVariants && p.colorVariants.length > 0) {
      setColorVariants(p.colorVariants.map(cv => ({
        color: cv.color,
        selectedSizes: { ...cv.stock }
      })));
    } else {
      // Fallback from basic sizes
      const sizesObj = {};
      (p.sizes || ["M", "L"]).forEach(s => { sizesObj[s] = 10; });
      setColorVariants([{ color: 'Standard', selectedSizes: sizesObj }]);
    }

    setIsFormOpen(true);
  };

  // Image file upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result); // Base64 data URL
      };
      reader.readAsDataURL(file);
    }
  };

  // Matrix handlers
  const handleAddColor = () => {
    setColorVariants(prev => [...prev, { color: '', colorHex: '', image: images[0] || '', selectedSizes: {} }]);
  };

  const handleRemoveColor = (index) => {
    setColorVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleColorNameChange = (index, newName) => {
    setColorVariants(prev => prev.map((item, i) => i === index ? { ...item, color: newName } : item));
  };

  const handleColorHexChange = (index, newHex) => {
    setColorVariants(prev => prev.map((item, i) => i === index ? { ...item, colorHex: newHex } : item));
  };

  const handleColorImageChange = (index, newImgUrl) => {
    setColorVariants(prev => prev.map((item, i) => i === index ? { ...item, image: newImgUrl } : item));
  };

  const handleVariantImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImages(prev => prev.includes(compressedBase64) ? prev : [...prev, compressedBase64]);
        handleColorImageChange(index, compressedBase64);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const openImageColorPicker = (index) => {
    const targetImg = colorVariants[index]?.image || images[0] || '';
    setPickerImageSrc(targetImg);
    setActiveColorPickerIndex(index);
    setPickerHoveredColor(colorVariants[index]?.colorHex || '#E11D48');
  };

  useEffect(() => {
    if (activeColorPickerIndex !== null && pickerImageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const maxW = 500;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = pickerImageSrc;
    }
  }, [activeColorPickerIndex, pickerImageSrc]);

  const handleToggleSize = (colorIndex, size) => {
    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      const nextSizes = { ...item.selectedSizes };
      if (nextSizes[size] !== undefined) {
        delete nextSizes[size];
      } else {
        nextSizes[size] = 5; // default qty
      }
      return { ...item, selectedSizes: nextSizes };
    }));
  };

  const handleSelectAllSizes = (colorIndex) => {
    let sizesList = [];
    if (sizeSystem === 'shoes') {
      const min = Math.min(Number(minPointure), Number(maxPointure)) || 36;
      const max = Math.max(Number(minPointure), Number(maxPointure)) || 42;
      const sizeKeys = Object.keys(colorVariants[colorIndex]?.selectedSizes || {}).filter(k => !isNaN(k) && k.trim() !== '').map(Number);
      const finalMin = sizeKeys.length > 0 ? Math.min(min, ...sizeKeys) : min;
      const finalMax = sizeKeys.length > 0 ? Math.max(max, ...sizeKeys) : max;
      for (let p = finalMin; p <= finalMax; p++) {
        sizesList.push(String(p));
      }
    } else {
      sizesList = ALL_SIZES;
    }

    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      const nextSizes = { ...item.selectedSizes };
      sizesList.forEach(size => {
        if (nextSizes[size] === undefined) {
          nextSizes[size] = 5; // default qty
        }
      });
      return { ...item, selectedSizes: nextSizes };
    }));
  };

  const handleDeselectAllSizes = (colorIndex) => {
    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      return { ...item, selectedSizes: {} };
    }));
  };

  const handleSizeQtyChange = (colorIndex, size, qty) => {
    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      return {
        ...item,
        selectedSizes: { ...item.selectedSizes, [size]: Number(qty) }
      };
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) {
      showToast("⚠️ الرجاء إدخال اسم المنتج", 'warning');
      return;
    }

    // Aggregate unique available sizes across all colors for quick storefront filtering
    const allAvailableSizesSet = new Set();
    const formattedVariants = colorVariants.map(cv => {
      const stockObj = {};
      Object.entries(cv.selectedSizes).forEach(([sz, qty]) => {
        if (qty > 0) {
          stockObj[sz] = qty;
          allAvailableSizesSet.add(sz);
        }
      });
      return {
        color: cv.color || "Couleur Standard",
        colorHex: cv.colorHex || "#CBD5E1",
        image: cv.image || (images && images[0] ? images[0] : ""),
        stock: stockObj
      };
    });

    const finalCategory = (category === '__custom__' || isCustomCategory)
      ? (customCategoryInput.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') || 'custom')
      : category;

    const productData = {
      id: editingId || Date.now(),
      title,
      category: finalCategory,
      purchasePrice: Number(purchasePrice),
      price: Number(price),
      oldPrice: Number(oldPrice),
      supplier: supplierName,
      image,
      description,
      sizes: Array.from(allAvailableSizesSet).length > 0 ? Array.from(allAvailableSizesSet) : ["Standard"],
      colorVariants: formattedVariants,
      promo: Number(oldPrice) > Number(price),
      badge: Number(oldPrice) > Number(price) ? "Promo 🔥" : "Nouveau ✨"
    };

    if (editingId) {
      onUpdateProduct(productData);
    } else {
      onAddProduct(productData);
    }

    setIsFormOpen(false);
  };

  // Quick stock quantity adjuster
  const handleQuickQtyAdjust = (product, colorIdx, size, delta) => {
    const updatedVariants = product.colorVariants.map((cv, i) => {
      if (i !== colorIdx) return cv;
      const currentQty = cv.stock[size] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      return {
        ...cv,
        stock: { ...cv.stock, [size]: nextQty }
      };
    });

    onUpdateProduct({
      ...product,
      colorVariants: updatedVariants
    });
  };

  // Selected supplier phone
  const selectedSupplierObj = suppliers.find(s => s.name === supplierName);

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
            📦 إدارة المخزون، المقاسات والألوان (Catalogue & Stock)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ajoutez vos pyjamas avec prix d'achat/vente, photos, et gérez les quantités exactes par couleur et taille.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="بحث عن منتج... (Rechercher)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ width: '250px' }}
          />
          <button onClick={handleOpenNew} className="btn btn-primary">
            <Plus size={18} />
            <span>إضافة منتج جديد (Ajouter un Pyjama)</span>
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--burgundy)' }}>
                {editingId ? "✏️ تعديل المنتج (Modifier Pyjama)" : "✨ إضافة منتج جديد للمخزون"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">إسم المنتج (Nom du Pyjama) *</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="Ex: Ensemble Royale Satin..." />
                </div>
                <div className="form-group">
                  <label className="form-label">الصنف (Catégorie) *</label>
                  <select
                    value={isCustomCategory ? '__custom__' : category}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomCategory(true);
                        setCategory('__custom__');
                      } else {
                        setIsCustomCategory(false);
                        setCategory(e.target.value);
                      }
                    }}
                    className="form-select"
                    style={{ marginBottom: (isCustomCategory || category === '__custom__') ? '8px' : '4px', fontWeight: 700 }}
                  >
                    {selectableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || '📦'} {cat.title}
                      </option>
                    ))}
                    <option value="__custom__">➕ إضافة صنف آخر مخصص (Autre catégorie)...</option>
                  </select>

                  {(isCustomCategory || category === '__custom__') && (
                    <input
                      type="text"
                      required
                      value={customCategoryInput}
                      placeholder="أدخل معرف أو إسم الصنف (مثال: robes-soiree)"
                      className="form-input"
                      style={{ marginBottom: '4px' }}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                    />
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--burgundy-dark)', fontWeight: 600 }}>
                    💡 نصيحة: لإضافة صنف جديد بالكامل مع إيموجي وصورة، استخدم تبويب "🏷️ الأقسام والتصنيفات" في القائمة الجانبية.
                  </span>
                </div>
              </div>

              {/* Pricing Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: '#F7F5F2', padding: '16px', borderRadius: '12px' }}>
                <div className="form-group">
                  <label className="form-label">سعر الشراء (Prix d'achat DA) *</label>
                  <input type="number" required value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="form-input" style={{ borderColor: '#1F8A55' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">سعر البيع (Prix de Vente DA) *</label>
                  <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="form-input" style={{ borderColor: 'var(--burgundy)', fontWeight: 800 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">السعر القديم قبل الخصم (DA)</label>
                  <input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} className="form-input" />
                </div>
              </div>

              {/* Supplier Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">المورد (Fournisseur) *</label>
                  <select value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="form-select">
                    <option value="">-- Choisir un fournisseur --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم هاتف المورد (Téléphone)</label>
                  <input type="text" readOnly disabled value={selectedSupplierObj?.phone || "N/A"} className="form-input" style={{ background: '#EEE' }} />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label">صورة المنتج (Upload photo ou Lien URL) *</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '10px 16px', flexShrink: 0 }}>
                    <Upload size={16} />
                    <span>رفع صورة من الهاتف / PC</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                  <input type="text" value={image} onChange={(e) => setImage(e.target.value)} className="form-input" placeholder="Ou coller un lien d'image..." />
                </div>
                {image && <img src={image} alt="" style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', marginTop: '10px' }} />}
              </div>

              {/* Multi-Color & Multi-Size Matrix */}
              <div style={{ border: '2px dashed var(--border-light)', padding: '16px', borderRadius: '12px', background: '#FAF8F5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                    🎨 الألوان والمقاسات والكمية (Matrice Couleurs & Tailles)
                  </h4>
                  <button type="button" onClick={handleAddColor} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    <Plus size={14} /> إضافة لون آخر
                  </button>
                </div>

                {/* NOUVEAU: Selecteur de type de tailles et generateur de pointures */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '10px', marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>نوع المقاسات (Type de Tailles) :</label>
                    <select
                      value={sizeSystem}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSizeSystem(val);
                        if (val === 'clothes') {
                          setColorVariants(prev => prev.map(cv => ({ ...cv, selectedSizes: { "M": 5, "L": 5 } })));
                        } else {
                          setColorVariants(prev => prev.map(cv => ({ ...cv, selectedSizes: {} })));
                        }
                      }}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 700 }}
                    >
                      <option value="clothes">👚 ملابس (S, M, L...)</option>
                      <option value="shoes">👟 مقاسات بالأرقام (Pointures / Chaussures)</option>
                    </select>
                  </div>

                  {sizeSystem === 'shoes' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', borderLeft: '2px solid #E2E8F0', paddingLeft: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '90px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>أصغر مقاس :</label>
                        <input
                          type="number"
                          min="15"
                          max="60"
                          value={minPointure}
                          onChange={(e) => setMinPointure(e.target.value)}
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '90px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>أكبر مقاس :</label>
                        <input
                          type="number"
                          min="15"
                          max="60"
                          value={maxPointure}
                          onChange={(e) => setMaxPointure(e.target.value)}
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 800 }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generatePointuresGlobally}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', height: '38px', background: 'linear-gradient(135deg, #1E293B, #334155)', color: '#FFF', fontWeight: 800, border: 'none' }}
                      >
                        ⚡ توليد المقاسات (Générer)
                      </button>
                    </div>
                  )}
                </div>

                {colorVariants.map((variant, cIndex) => {
                  const variantImg = variant.image || images[0] || '';
                  return (
                  <div key={cIndex} style={{ background: 'white', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontWeight: 800, color: 'var(--burgundy)' }}>#{cIndex + 1} اللون :</span>
                      
                      {/* Image Thumbnail & Selector for this variant */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {variantImg ? (
                          <img src={variantImg} alt="variant" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border-light)' }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#64748B' }}>
                            لا صورة
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {images.length > 0 && (
                            <select
                              value={variantImg}
                              onChange={(e) => handleColorImageChange(cIndex, e.target.value)}
                              style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid #CBD5E1', maxWidth: '110px' }}
                            >
                              <option value="">-- صورة اللون --</option>
                              {images.map((imgUrl, iIdx) => (
                                <option key={iIdx} value={imgUrl}>صورة #{iIdx + 1}</option>
                              ))}
                            </select>
                          )}
                          <label style={{ fontSize: '0.72rem', color: 'var(--burgundy)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Upload size={12} /> رفع صورة للون
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleVariantImageUpload(cIndex, e)} />
                          </label>
                        </div>
                      </div>

                      {/* Color Square Box & Eyedropper Launcher */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openImageColorPicker(cIndex)}
                          title="اضغط لاختيار اللون من الصورة"
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            background: variant.colorHex || '#FFFFFF',
                            border: variant.colorHex ? '2px solid #334155' : '2px dashed #94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          {!variant.colorHex && <Pipette size={18} color="#64748B" />}
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--burgundy)' }}>
                            {variant.colorHex ? 'درجة اللون:' : 'مربع اللون (فارغ):'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                            {variant.colorHex || 'اضغط للاختيار'}
                          </span>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="اسم اللون (Ex: Rose Poudre, أحمر)..." 
                          value={variant.color} 
                          onChange={(e) => handleColorNameChange(cIndex, e.target.value)}
                          className="form-input" 
                          style={{ flex: 1, padding: '6px 10px', fontWeight: 700 }}
                        />
                        {colorVariants.length > 1 && (
                          <button type="button" onClick={() => handleRemoveColor(cIndex)} style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer' }}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        ✔️ اختر المقاسات المتوفرة وأدخل الكمية (Cochez les tailles en stock) :
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectAllSizes(cIndex)}
                          style={{
                            padding: '4px 10px',
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            color: '#1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                        >
                          ✓ تحديد الكل (Tout sélectionner)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeselectAllSizes(cIndex)}
                          style={{
                            padding: '4px 10px',
                            background: '#FFF5F5',
                            border: '1px solid #FEE2E2',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            color: '#991B1B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#FFF5F5'; }}
                        >
                          ✕ إلغاء الكل (Désélectionner)
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {(sizeSystem === 'shoes'
                        ? (() => {
                            const min = Math.min(Number(minPointure), Number(maxPointure)) || 36;
                            const max = Math.max(Number(minPointure), Number(maxPointure)) || 42;
                            const sizeKeys = Object.keys(variant.selectedSizes).filter(k => !isNaN(k) && k.trim() !== '').map(Number);
                            const finalMin = sizeKeys.length > 0 ? Math.min(min, ...sizeKeys) : min;
                            const finalMax = sizeKeys.length > 0 ? Math.max(max, ...sizeKeys) : max;
                            const arr = [];
                            for (let p = finalMin; p <= finalMax; p++) {
                              arr.push(String(p));
                            }
                            return arr;
                          })()
                        : ALL_SIZES
                      ).map(size => {
                        const isChecked = variant.selectedSizes[size] !== undefined;
                        return (
                          <button
                            type="button"
                            key={size}
                            onClick={() => handleToggleSize(cIndex, size)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: isChecked ? '2px solid var(--burgundy)' : '1px solid var(--border-light)',
                              background: isChecked ? 'var(--rose-light)' : '#FAF8F5',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isChecked ? '✅ ' : ''}{size}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quantity Inputs for checked sizes */}
                    {Object.keys(variant.selectedSizes).length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#F7F5F2', padding: '10px', borderRadius: '8px' }}>
                        {Object.entries(variant.selectedSizes).sort((a, b) => {
                          const numA = Number(a[0]);
                          const numB = Number(b[0]);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          if (!isNaN(numA)) return -1;
                          if (!isNaN(numB)) return 1;
                          return ALL_SIZES.indexOf(a[0]) - ALL_SIZES.indexOf(b[0]);
                        }).map(([sz, qty]) => (
                          <div key={sz}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Quantité ({sz}) :</label>
                            <input 
                              type="number" 
                              min="0" 
                              value={qty} 
                              onChange={(e) => handleSizeQtyChange(cIndex, sz, e.target.value)}
                              className="form-input"
                              style={{ padding: '6px', textAlign: 'center', fontWeight: 800 }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>

              <div className="form-group">
                <label className="form-label">وصف المنتج (Description)</label>
                <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '1.05rem', justifyContent: 'center' }}>
                <span>{editingId ? "💾 حفظ التعديلات (Enregistrer les modifications)" : "💾 حفظ المنتج في المخزون (Enregistrer dans le Stock)"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product List Card View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {products
          .filter(p => p.title.toLowerCase().startsWith(searchQuery.toLowerCase()))
          .map(p => (
          <div key={p.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', height: '180px' }}>
              <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--burgundy-dark)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {categoriesList.find(c => c && c.id === p.category)?.icon || '📦'} {categoriesList.find(c => c && c.id === p.category)?.title || (p.category || '').toUpperCase()}
              </span>
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
                <button onClick={() => handleOpenEdit(p)} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Modifier">
                  <Edit2 size={16} color="#1565C0" />
                </button>
                <button onClick={() => { if(window.confirm("Supprimer définitivement ce pyjama ?")) onDeleteProduct(p.id); }} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Supprimer">
                  <Trash2 size={16} color="#D32F2F" />
                </button>
              </div>
            </div>

            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 6 }}>{p.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  🏢 Fournisseur : <strong>{p.supplier || 'N/A'}</strong>
                </p>

                {/* Colors & Sizes breakdown */}
                <div style={{ background: '#FAF8F5', padding: '10px', borderRadius: '8px', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--burgundy)' }}>📊 المخزون الحالي حسب اللون والمقاس :</span>
                  {p.colorVariants?.map((cv, cIdx) => (
                    <div key={cIdx} style={{ marginTop: 8, borderTop: cIdx > 0 ? '1px dashed #DDD' : 'none', paddingTop: cIdx > 0 ? 6 : 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>🎨 {cv.color} :</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {Object.entries(cv.stock || {}).map(([sz, qty]) => (
                          <div key={sz} style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E0E0E0', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                            <span>{sz}: <strong style={{ color: qty > 0 ? '#2E7D32' : '#D32F2F' }}>{qty}</strong> hba</span>
                            <div style={{ display: 'flex', marginLeft: 6, gap: 2 }}>
                              <button onClick={() => handleQuickQtyAdjust(p, cIdx, sz, 1)} style={{ border: 'none', background: '#E8F5E9', color: '#2E7D32', cursor: 'pointer', borderRadius: 2, padding: '0 4px', fontWeight: 900 }}>+</button>
                              <button onClick={() => handleQuickQtyAdjust(p, cIdx, sz, -1)} style={{ border: 'none', background: '#FFEBEE', color: '#C62828', cursor: 'pointer', borderRadius: 2, padding: '0 4px', fontWeight: 900 }}>-</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Prix d'achat : {p.purchasePrice ? `${p.purchasePrice.toLocaleString()} DA` : 'N/A'}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--burgundy)' }}>Vente : {p.price.toLocaleString()} DA</span>
                </div>
                <button onClick={() => handleOpenEdit(p)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  <Edit2 size={14} /> Modifier
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Canvas Color Picker from Image Modal */}
      {activeColorPickerIndex !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--burgundy)', margin: 0 }}>
                🎨 اختر درجة اللون من صورة البيجامة (Pipette)
              </h3>
              <button type="button" onClick={() => setActiveColorPickerIndex(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748B" />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
              💡 مرر الفأرة أو اصبعك فوق الصورة لاختيار درجة اللون بدقة، ثم اضغط على المكان المطلوب:
            </p>

            {/* Image selector inside picker if multiple images exist */}
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {images.map((imgUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setPickerImageSrc(imgUrl)}
                    style={{
                      border: pickerImageSrc === imgUrl ? '3px solid var(--burgundy)' : '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <img src={imgUrl} alt={`img-${idx}`} style={{ width: '50px', height: '50px', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Live Hover Preview Loupe */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: pickerHoveredColor, border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>اللون تحت المؤشر :</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1E293B', fontFamily: 'monospace' }}>{pickerHoveredColor}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>أو اختر يدوياً:</label>
                <input
                  type="color"
                  value={pickerHoveredColor}
                  onChange={(e) => setPickerHoveredColor(e.target.value)}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Canvas Area */}
            <div style={{ display: 'flex', justifyContent: 'center', background: '#1E293B', padding: '12px', borderRadius: '12px', overflow: 'auto', minHeight: '200px' }}>
              {pickerImageSrc ? (
                <canvas
                  ref={canvasRef}
                  onClick={() => {
                    handleColorHexChange(activeColorPickerIndex, pickerHoveredColor);
                    setActiveColorPickerIndex(null);
                  }}
                  onMouseMove={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    const x = Math.floor((e.clientX - rect.left) * scaleX);
                    const y = Math.floor((e.clientY - rect.top) * scaleY);
                    const ctx = canvas.getContext('2d');
                    try {
                      const data = ctx.getImageData(x, y, 1, 1).data;
                      const hex = "#" + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1).toUpperCase();
                      setPickerHoveredColor(hex);
                    } catch (err) {}
                  }}
                  style={{ cursor: 'crosshair', maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                />
              ) : (
                <div style={{ color: 'white', textAlign: 'center', padding: '30px', fontSize: '0.9rem' }}>
                  ❌ لا توجد صورة محملة للمنتج بعد. يرجى رفع صور للمنتج أولاً.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  handleColorHexChange(activeColorPickerIndex, pickerHoveredColor);
                  setActiveColorPickerIndex(null);
                }}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
              >
                ✅ اعتماد هذا اللون ({pickerHoveredColor})
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="تأكيد حذف المنتج"
        message={`هل أنت متأكد من رغبتك في حذف بيجاما/منتج "${deleteModal.targetTitle}" نهائياً من المخزون؟`}
        confirmText="نعم، حذف المنتج"
        cancelText="تراجع وإلغاء"
        onConfirm={() => {
          if (deleteModal.targetId) {
            onDeleteProduct(deleteModal.targetId);
          }
        }}
        onClose={() => setDeleteModal({ isOpen: false, targetId: null, targetTitle: '' })}
      />
    </div>
  );
}
