import React, { useState } from 'react';
import { Tag, Plus, Trash2, Edit2, Check, X, ShieldAlert, Image as ImageIcon, Upload } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../../data/mockData';
import ConfirmModal from './ConfirmModal';
import { showToast } from '../../utils/toast';

export default function CategoriesTab({ settings, onUpdateSettings, products = [], setActiveTab }) {
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetIndex: null, targetTitle: '' });
  
  const parseCategories = (catData) => {
    let parsed = catData;
    if (!catData) parsed = DEFAULT_CATEGORIES;
    else if (typeof catData === 'string') {
      try { parsed = JSON.parse(catData); } catch (e) { parsed = DEFAULT_CATEGORIES; }
    }
    if (!Array.isArray(parsed)) parsed = DEFAULT_CATEGORIES;

    let list = [...parsed];
    // Ensure all, hot_sale, and promo are present in the list
    if (!list.some(c => c.id === 'all')) {
      list.unshift({ id: 'all', title: 'TOUT VOIR', icon: '', image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=300&q=80' });
    }
    if (!list.some(c => c.id === 'hot_sale')) {
      const allIndex = list.findIndex(c => c.id === 'all');
      list.splice(allIndex + 1, 0, { id: 'hot_sale', title: 'الأكثر مبيعاً (HOT SALE)', icon: '', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80' });
    }
    if (!list.some(c => c.id === 'promo')) {
      list.push({ id: 'promo', title: '% SOLDES', icon: '', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&q=80' });
    }
    return list;
  };

  const [categoriesList, setCategoriesList] = useState(() => parseCategories(settings?.categories));

  // New Category State (Direct File Upload Only - No URLs, No Emojis)
  const [newTitle, setNewTitle] = useState('');
  const [newId, setNewId] = useState('');
  const [newImage, setNewImage] = useState('');

  // Editing State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editImage, setEditImage] = useState('');

  const handleTitleChange = (val) => {
    setNewTitle(val);
    if (!newId || newId === generateSlug(newTitle)) {
      setNewId(generateSlug(val));
    }
  };

  const generateSlug = (text) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
      .replace(/\s+/g, '-') || 'cat-' + Math.floor(Math.random() * 1000);
  };

  // High-Definition Intelligent Canvas Image Compressor
  const handleImageFileUpload = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('⚠️ يرجى اختيار ملف صورة صالح (JPG, PNG, WebP...)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800; // Perfect crisp resolution for 1:1 category squares
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Compress to WebP / JPEG 85% for ultra light size (~60KB) with crystal clear HD sharpness
        let compressed = canvas.toDataURL('image/webp', 0.85);
        if (!compressed.startsWith('data:image/webp')) {
          compressed = canvas.toDataURL('image/jpeg', 0.85);
        }

        if (isEdit) {
          setEditImage(compressed);
        } else {
          setNewImage(compressed);
        }
        showToast('✅ تم ضغط الصورة وحفظها بدقة عالية HD وبحجم خفيف جداً!', 'success');
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const baseSlug = generateSlug(newTitle.trim());
    const finalId = baseSlug + '-' + Date.now().toString(36);
    const newCategory = {
      id: finalId,
      title: newTitle.trim(),
      icon: '',
      image: newImage || ''
    };

    // Place before 'promo' if 'promo' is at the end, or just append
    let updatedList = [...categoriesList];
    const promoIndex = updatedList.findIndex(c => c.id === 'promo');
    if (promoIndex !== -1) {
      updatedList.splice(promoIndex, 0, newCategory);
    } else {
      updatedList.push(newCategory);
    }

    setCategoriesList(updatedList);
    onUpdateSettings({ categories: updatedList });

    // Reset Form
    setNewTitle('');
    setNewId('');
    setNewImage('');
    showToast(`✅ تم إضافة القسم الجديد "${newCategory.title}" بنجاح!`, 'success');
  };

  const handleDeleteCategory = (index) => {
    const target = categoriesList[index];
    if (!target) return;
    if (target.id === 'all') {
      showToast("⚠️ لا يمكن حذف صنف العرض الشامل (TOUT VOIR) لأنه الصنف الرئيسي للمتجر.", 'warning');
      return;
    }
    if (target.id === 'hot_sale') {
      showToast("⚠️ لا يمكن حذف صنف الأكثر مبيعاً (HOT SALE) لأنه صنف ذكي يعمل تلقائياً مع تحليلات المبيعات.", 'warning');
      return;
    }
    if (target.id === 'promo') {
      showToast("⚠️ لا يمكن حذف صنف التخفيضات (% SOLDES) لأنه صنف ذكي يعمل تلقائياً عند وضع سعر قديم للمنتجات.", 'warning');
      return;
    }

    setDeleteModal({
      isOpen: true,
      targetIndex: index,
      targetTitle: target.title
    });
  };

  const confirmDeleteCategory = () => {
    if (deleteModal.targetIndex === null) return;
    const targetTitle = deleteModal.targetTitle;
    const updatedList = categoriesList.filter((_, i) => i !== deleteModal.targetIndex);
    setCategoriesList(updatedList);
    onUpdateSettings({ categories: updatedList });
    setDeleteModal({ isOpen: false, targetIndex: null, targetTitle: '' });
    showToast(`✅ تم حذف القسم "${targetTitle}" بنجاح!`, 'success');
  };

  const startEditing = (index) => {
    const target = categoriesList[index];
    setEditingIndex(index);
    setEditTitle(target.title);
    setEditImage(target.image || '');
  };

  const saveEditing = (index) => {
    if (!editTitle.trim()) return;
    const updatedList = [...categoriesList];
    updatedList[index] = {
      ...updatedList[index],
      title: editTitle.trim(),
      icon: '',
      image: editImage || ''
    };
    setCategoriesList(updatedList);
    onUpdateSettings({ categories: updatedList });
    setEditingIndex(null);
    showToast(`✅ تم تحديث بيانات وصورة القسم بنجاح!`, 'success');
  };

  return (
    <div style={{ padding: '8px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Card: Add New Category */}
        <div className="admin-card" style={{ position: 'sticky', top: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #EAE3DC', paddingBottom: '12px' }}>
            <Plus size={22} style={{ color: 'var(--rose-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--burgundy-dark)' }}>إضافة قسم جديد (Nouvelle Catégorie)</h3>
          </div>

          <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">إسم القسم بالعربية أو الفرنسية (Nom) *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="مثال: بيجامات حريرية، أو Robes d'été..."
                className="form-input"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">المعرّف التقني (ID / Code)</label>
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="يتم توليده تلقائياً (مثال: robes-ete)"
                className="form-input"
                style={{ fontSize: '0.85rem', color: '#666' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>يستخدم داخلياً لربط المنتجات بهذا القسم</span>
            </div>

            {/* Category Photo: File Upload Only */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} color="var(--burgundy-dark)" /> صورة القسم (Photo de la catégorie)
              </label>

              {/* Live Preview & Direct Upload Button */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '14px',
                  border: newImage ? '2px solid var(--burgundy-dark)' : '2px dashed #CBD5E1',
                  overflow: 'hidden',
                  background: '#F8FAFC',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  {newImage ? (
                    <>
                      <img src={newImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setNewImage('')}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: '#E11D48',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="حذف الصورة"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <ImageIcon size={32} color="#94A3B8" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E6 100%)',
                    border: '1.5px solid #FDA4AF',
                    color: 'var(--burgundy-dark)',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    width: '100%',
                    boxShadow: '0 2px 6px rgba(225, 29, 72, 0.08)',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}>
                    <Upload size={18} /> {newImage ? 'تغيير صورة القسم' : 'رفع صورة من الهاتف أو الحاسوب'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, false)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '6px', lineHeight: 1.3 }}>
                    ✨ يتم تقليل حجم الصورة وضغطها بدقة HD للحفاظ على سرعة المتجر
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'var(--rose-primary)',
                borderColor: 'var(--rose-primary)',
                padding: '14px',
                fontSize: '1.05rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              <Plus size={20} /> حفظ وإضافة القسم للمتجر
            </button>
          </form>
        </div>

        {/* Right Card: Existing Categories List */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #EAE3DC', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Tag size={22} style={{ color: 'var(--burgundy-dark)' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--burgundy-dark)' }}>قائمة الأقسام الحالية ({categoriesList.filter(c => c.id !== 'all').length})</h3>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>يتم حفظ التعديلات تلقائياً في المتجر</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoriesList.map((cat, index) => {
              if (cat.id === 'all') return null;
              const isHotSale = cat.id === 'hot_sale';
              const isPromo = cat.id === 'promo';
              const isProtected = isHotSale || isPromo;
              const isEditing = editingIndex === index;
              
              const productCount = isHotSale
                ? products.filter(p => p.isHotSale || p.badge === 'HOT SALE' || (p.totalSales && p.totalSales > 0)).length || products.length
                : isPromo
                  ? products.filter(p => p.oldPrice && Number(p.oldPrice) > Number(p.price || 0)).length
                  : products.filter(p => p.category === cat.id).length;

              return (
                <div
                  key={cat.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: isProtected ? '#FDFBF7' : 'white',
                    border: isProtected ? '2px solid #EAE3DC' : '1px solid #EAE3DC',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  {isEditing ? (
                    /* In-Place Edit Row: Upload Only */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, flexWrap: 'wrap' }}>
                      <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1.5px solid #CBD5E1',
                        flexShrink: 0,
                        background: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {editImage ? (
                          <img src={editImage} alt="Edit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ImageIcon size={22} color="#94A3B8" />
                        )}
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="إسم القسم..."
                          className="form-input"
                          style={{ fontWeight: 700 }}
                        />
                        <label style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: 'fit-content'
                        }}>
                          <Upload size={14} /> {editImage ? 'تغيير صورة القسم' : 'رفع صورة من الجهاز'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageFileUpload(e, true)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => saveEditing(index)}
                          className="btn"
                          style={{ background: '#1F8A55', color: 'white', padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="حفظ"
                        >
                          <Check size={16} /> حفظ
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="btn"
                          style={{ background: '#E53E3E', color: 'white', padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="إلغاء"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Row */
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '12px',
                          background: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1.5px solid #E2E8F0',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          {cat.image ? (
                            <img 
                              src={cat.image} 
                              alt={cat.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<span style="color:#94A3B8">🏷️</span>';
                              }}
                            />
                          ) : (
                            <ImageIcon size={24} color="#800020" />
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                              {cat.title}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              background: isPromo ? '#FFF3E0' : isHotSale ? '#FEE2E2' : '#F0EBE6',
                              color: isPromo ? '#E65100' : isHotSale ? '#B91C1C' : '#555',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              ID: {cat.id}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              background: '#E8F5E9',
                              color: '#1B5E20',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {productCount} منتج
                            </span>
                          </div>

                          {isHotSale && (
                            <div style={{ fontSize: '0.8rem', color: '#B91C1C', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              🔥 صنف الأكثر مبيعاً (Hot Sale): يعرض تلقائياً المنتجات الأكثر طلباً في المتجر
                            </div>
                          )}
                          {isPromo && (
                            <div style={{ fontSize: '0.8rem', color: '#E65100', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              صنف التخفيضات الدائم: يعرض تلقائياً أي منتج تم إدخال سعر قديم وسعر جديد له في المخزون
                            </div>
                          )}
                          {!isProtected && (
                            <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '4px' }}>
                              صنف مخصص جاهز للربط في المخزون
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => startEditing(index)}
                          className="btn"
                          style={{
                            background: '#F0EBE6',
                            color: 'var(--burgundy-dark)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                          title="تعديل إسم وصورة القسم"
                        >
                          <Edit2 size={16} /> تعديل
                        </button>

                        {!isProtected ? (
                          <button
                            onClick={() => handleDeleteCategory(index)}
                            className="btn"
                            style={{
                              background: '#FFF5F5',
                              color: '#C53030',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #FEB2B2',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                            title="حذف القسم"
                          >
                            <Trash2 size={16} /> حذف
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', padding: '6px 10px', background: '#F5F2EC', borderRadius: '6px' }}>
                            🔒 صنف رئيسي
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="تأكيد حذف القسم"
        message={`هل أنت متأكد من رغبتك في حذف قسم "${deleteModal.targetTitle}" من المتجر؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، حذف القسم"
        cancelText="تراجع وإلغاء"
        onConfirm={confirmDeleteCategory}
        onClose={() => setDeleteModal({ isOpen: false, targetIndex: null, targetTitle: '' })}
      />
    </div>
  );
}
