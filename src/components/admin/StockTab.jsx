import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Upload, Check, X, Layers, PlusCircle, MinusCircle, Printer, Image as ImageIcon, Barcode as BarcodeIcon } from 'lucide-react';

const ALL_SIZES = ["Standard", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export default function StockTab({ products, onAddProduct, onUpdateProduct, onDeleteProduct, suppliers }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('satin');
  const [purchasePrice, setPurchasePrice] = useState(2800);
  const [price, setPrice] = useState(4000);
  const [oldPrice, setOldPrice] = useState('');
  const [supplierName, setSupplierName] = useState(suppliers[0]?.name || '');
  const [images, setImages] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('Pyjama en tissu luxueux de haute qualité.');
  
  // Matrix State: Array of { color: string, selectedSizes: { "M": 10, "L": 15 } }
  const [colorVariants, setColorVariants] = useState([
    { color: 'Rose Royale', selectedSizes: { "M": 10, "L": 10, "XL": 5 } }
  ]);

  const handleOpenNew = () => {
    setEditingId(null);
    setTitle('');
    setCategory("✨ Satin de Soie (ساتان)");
    setPurchasePrice('');
    setPrice('');
    setOldPrice('');
    setSupplierName(suppliers[0]?.name || '');
    setImages([]);
    setBarcode(String(100000000000 + Math.floor(Math.random() * 900000000000)));
    setDescription('');
    setColorVariants([{ color: 'Rose Poudre', selectedSizes: { "M": 5, "L": 5 } }]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setTitle(p.title);
    setCategory(p.category);
    setPurchasePrice(p.purchasePrice || Math.round(p.price * 0.65));
    setPrice(p.price);
    setOldPrice(p.oldPrice || '');
    setSupplierName(p.supplier || suppliers[0]?.name || '');
    setImages(p.images || []);
    setBarcode(p.barcode || String(100000000000 + Math.floor(Math.random() * 900000000000)));
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

  // Multiple Image Upload Handlers
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Réduire la taille de l'image (max 800px)
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
          
          // Compresser en JPEG 70% de qualité
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          setImages(prev => {
            const newImages = prev.filter(img => img !== '');
            return [...newImages, compressedBase64];
          });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };
  const handleRemoveImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));
  const generateBarcode = () => setBarcode(String(100000000000 + Math.floor(Math.random() * 900000000000)));

  const handlePrintBarcodeDirectly = (product) => {
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    const barcodeValue = product.barcode || String(100000000000 + Math.floor(Math.random() * 900000000000));
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            @page { size: 1.80in 1.10in; margin: 0; }
            body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 1.80in; height: 1.10in; font-family: sans-serif; overflow: hidden; background: #fff; }
            .price { font-size: 12px; font-weight: bold; margin-top: 2px; color: #000; text-align: center; }
            .title { font-size: 10px; font-weight: bold; margin-bottom: 2px; width: 1.70in; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #000; text-align: center; }
            svg { max-width: 1.70in; max-height: 0.65in; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="title">${product.title}</div>
          <svg id="barcode"></svg>
          <div class="price">${product.price.toLocaleString()} DA</div>
          <script>
            window.onload = function() {
              JsBarcode("#barcode", "${barcodeValue}", {
                width: 1.2,
                height: 35,
                fontSize: 10,
                textMargin: 0,
                margin: 0,
                background: "#ffffff",
                lineColor: "#000000"
              });
              setTimeout(() => {
                window.focus();
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Matrix handlers
  const handleAddColor = () => {
    setColorVariants(prev => [...prev, { color: '', selectedSizes: {} }]);
  };

  const handleRemoveColor = (index) => {
    setColorVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleColorNameChange = (index, newName) => {
    setColorVariants(prev => prev.map((item, i) => i === index ? { ...item, color: newName } : item));
  };

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
      alert("Veuillez entrer le nom du produit");
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
        stock: stockObj
      };
    });

    const productData = {
      id: editingId || Date.now(),
      title,
      category,
      purchasePrice: Number(purchasePrice),
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      supplier: supplierName,
      images,
      barcode,
      description,
      colorVariants: formattedVariants
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
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-select">
                    <option value="satin">✨ Satin de Soie (ساتان)</option>
                    <option value="coton">🧸 Coton & Confort (قطن)</option>
                    <option value="mariee">👰 Trousseau Mariée (جهاز العروس)</option>
                  </select>
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

              {/* Barcode Generation */}
              <div className="form-group" style={{ background: '#F0F9FF', padding: '16px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                <label className="form-label">باركود المنتج (Code-barres) *</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="text" required value={barcode} onChange={(e) => setBarcode(e.target.value)} className="form-input" placeholder="Scannez ou entrez le code-barres" style={{ flex: 1, fontWeight: 'bold' }} />
                  <button type="button" onClick={generateBarcode} className="btn btn-secondary" style={{ flexShrink: 0 }}>
                    <Layers size={16} /> Générer Aléatoire
                  </button>
                </div>
              </div>

              {/* Multiple Images Upload */}
              <div className="form-group">
                <label className="form-label">صور المنتج (Images du produit) *</label>
                <div style={{ border: '2px dashed #CBD5E1', padding: '20px', borderRadius: '12px', textAlign: 'center', background: '#F8FAFC' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #E2E8F0', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Upload size={18} color="#475569" />
                    <span>رفع الصور من الهاتف / PC</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                  <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748B' }}>يمكنك اختيار عدة صور في نفس الوقت</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
                  {images.filter(img => img).map((img, index) => (
                    <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                      <button type="button" onClick={() => handleRemoveImage(index)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#EF4444', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
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

                {colorVariants.map((variant, cIndex) => (
                  <div key={cIndex} style={{ background: 'white', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--burgundy)' }}>#{cIndex + 1} اللون :</span>
                      <input 
                        type="text" 
                        placeholder="Ex: Rose Poudre, Bordeaux, Noir..." 
                        value={variant.color} 
                        onChange={(e) => handleColorNameChange(cIndex, e.target.value)}
                        className="form-input" 
                        style={{ flex: 1, padding: '6px 10px' }}
                      />
                      {colorVariants.length > 1 && (
                        <button type="button" onClick={() => handleRemoveColor(cIndex)} style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      ✔️ اختر المقاسات المتوفرة وأدخل الكمية (Cochez les tailles en stock) :
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {ALL_SIZES.map(size => {
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
                        {Object.entries(variant.selectedSizes).map(([sz, qty]) => (
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
                ))}
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
              <img src={p.images && p.images.length > 0 ? p.images[0] : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f1f5f9'/%3E%3Ctext x='400' y='400' font-family='sans-serif' font-size='40' font-weight='bold' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3ESans%20Image%3C/text%3E%3C/svg%3E"} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--burgundy-dark)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                {p.category.toUpperCase()}
              </span>
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => handlePrintBarcodeDirectly(p)} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Imprimer Code Barres">
                  <BarcodeIcon size={16} color="#4F46E5" />
                </button>
                <button type="button" onClick={() => handleOpenEdit(p)} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Modifier">
                  <Edit2 size={16} color="#1565C0" />
                </button>
                <button type="button" onClick={() => { if(window.confirm("Supprimer définitivement ce pyjama ?")) onDeleteProduct(p.id); }} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Supprimer">
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
                            <span>{sz}: <strong style={{ color: qty > 0 ? '#2E7D32' : '#D32F2F' }}>{qty}</strong> pièce</span>
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
    </div>
  );
}
