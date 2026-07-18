import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit2, Check, X, ShieldAlert, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../../data/mockData';
import ConfirmModal from './ConfirmModal';
import { showToast } from '../../utils/toast';

export default function CategoriesTab({ settings, onUpdateSettings, products = [], setActiveTab }) {
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetIndex: null, targetTitle: '' });
  const [categoriesList, setCategoriesList] = useState(() => {
    return (settings?.categories && Array.isArray(settings.categories) && settings.categories.length > 0)
      ? settings.categories
      : DEFAULT_CATEGORIES;
  });

  // Ensure 'all' and 'promo' exist right away
  useEffect(() => {
    let current = (settings?.categories && Array.isArray(settings.categories) && settings.categories.length > 0)
      ? settings.categories
      : DEFAULT_CATEGORIES;

    let modified = false;
    if (!current.some(c => c.id === 'all')) {
      current = [{ id: 'all', title: 'TOUT VOIR', icon: '✨', image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=300&q=80' }, ...current];
      modified = true;
    }
    if (!current.some(c => c.id === 'promo')) {
      current = [...current, { id: 'promo', title: '% SOLDES', icon: '🔥', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&q=80' }];
      modified = true;
    }
    if (modified) {
      setCategoriesList(current);
      if (onUpdateSettings) {
        onUpdateSettings({ ...settings, categories: current });
      }
    } else {
      setCategoriesList(current);
    }
  }, [settings?.categories]);

  // New Category State
  const [newTitle, setNewTitle] = useState('');
  const [newId, setNewId] = useState('');
  const [newIcon, setNewIcon] = useState('🎀');
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80');

  // Editing State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editImage, setEditImage] = useState('');

  const presetEmojis = ['✨', '👗', '🧸', '👰', '👘', '🧕', '🥿', '👑', '🌸', '🎀', '💖', '🔥', '🛍️', '💄', '🌙'];
  const presetImages = [
    { label: 'سلسلة ساتان وردي', url: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=300&q=80' },
    { label: 'سلسلة حرير ذهبي', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80' },
    { label: 'قطن مريح ناعم', url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=300&q=80' },
    { label: 'تجهيزات العروس VIP', url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=300&q=80' },
    { label: 'عباءات أنيقة', url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&q=80' },
    { label: 'أحذية خفيفة منزلية', url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&q=80' }
  ];

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

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const baseSlug = newId.trim() ? generateSlug(newId) : generateSlug(newTitle);
    const finalId = baseSlug + '-' + Math.floor(Math.random() * 100);
    const newCategory = {
      id: finalId,
      title: newTitle.trim(),
      icon: newIcon || '✨',
      image: newImage || presetImages[0].url
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
    onUpdateSettings({ ...settings, categories: updatedList });

    // Reset Form
    setNewTitle('');
    setNewId('');
    setNewIcon('🎀');
    showToast(`✅ تم إضافة الصنف الجديد "${newCategory.title}" بنجاح!`, 'success');
  };

  const handleDeleteCategory = (index) => {
    const target = categoriesList[index];
    if (!target) return;
    if (target.id === 'all') {
      showToast("⚠️ لا يمكن حذف صنف العرض الشامل (TOUT VOIR) لأنه الصنف الرئيسي للمتجر.", 'warning');
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
    const updatedList = categoriesList.filter((_, i) => i !== deleteModal.targetIndex);
    setCategoriesList(updatedList);
    onUpdateSettings({ ...settings, categories: updatedList });
  };

  const startEditing = (index) => {
    const target = categoriesList[index];
    setEditingIndex(index);
    setEditTitle(target.title);
    setEditIcon(target.icon || '✨');
    setEditImage(target.image || presetImages[0].url);
  };

  const saveEditing = (index) => {
    if (!editTitle.trim()) return;
    const updatedList = [...categoriesList];
    updatedList[index] = {
      ...updatedList[index],
      title: editTitle.trim(),
      icon: editIcon || '✨',
      image: editImage || presetImages[0].url
    };
    setCategoriesList(updatedList);
    onUpdateSettings({ ...settings, categories: updatedList });
    setEditingIndex(null);
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

            <div className="form-group">
              <label className="form-label">أيقونة القسم (Emoji) *</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  type="text"
                  required
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="form-input"
                  style={{ width: '70px', textAlign: 'center', fontSize: '1.5rem', padding: '4px' }}
                />
                <span style={{ fontSize: '0.82rem', color: '#666' }}>اختر إيموجي من الأسفل أو اكتب إيموجي مخصص:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', background: '#F9F8F6', borderRadius: '10px', border: '1px solid #EAE3DC' }}>
                {presetEmojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewIcon(emoji)}
                    style={{
                      border: newIcon === emoji ? '2px solid var(--rose-primary)' : '1px solid #DDD',
                      background: newIcon === emoji ? 'var(--rose-light)' : 'white',
                      borderRadius: '8px',
                      width: '36px',
                      height: '36px',
                      fontSize: '1.3rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
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
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--burgundy-dark)' }}>قائمة الأقسام الحالية ({categoriesList.length})</h3>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>يتم حفظ التعديلات تلقائياً في المتجر</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoriesList.map((cat, index) => {
              const isAll = cat.id === 'all';
              const isPromo = cat.id === 'promo';
              const isProtected = isAll || isPromo;
              const isEditing = editingIndex === index;
              const productCount = isAll
                ? products.length
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
                    padding: '16px',
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
                    /* In-Place Edit Row */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="form-input"
                        style={{ width: '60px', textAlign: 'center', fontSize: '1.3rem', padding: '6px' }}
                      />
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="form-input"
                        style={{ flex: 1, minWidth: '180px', fontWeight: 700 }}
                      />
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'var(--rose-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.8rem',
                          flexShrink: 0,
                          border: '1px solid #E8A598',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          {cat.icon || '✨'}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                              {cat.title}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              background: isPromo ? '#FFF3E0' : '#F0EBE6',
                              color: isPromo ? '#E65100' : '#555',
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
                              📦 {productCount} منتج
                            </span>
                          </div>

                          {isAll && (
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldAlert size={14} color="#C53030" /> يعرض جميع المنتجات المتوفرة في المتجر بشكل افتراضي
                            </div>
                          )}
                          {isPromo && (
                            <div style={{ fontSize: '0.8rem', color: '#E65100', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              🔥 صنف التخفيضات الدائم: يعرض تلقائياً أي منتج تم إدخال سعر قديم وسعر جديد له في المخزون!
                            </div>
                          )}
                          {!isProtected && (
                            <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '4px' }}>
                              صنف مخصص جاهز للربط في المخزون
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!isProtected && (
                          <>
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
                                fontWeight: 600
                              }}
                              title="تعديل إسم وأيقونة القسم"
                            >
                              <Edit2 size={16} /> تعديل
                            </button>

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
                          </>
                        )}
                        {isProtected && (
                          <span style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', padding: '8px' }}>
                            🔒 أساسي للنظام
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
