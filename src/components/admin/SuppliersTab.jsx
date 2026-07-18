import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Phone, MapPin, Building, Package } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { showToast } from '../../utils/toast';

export default function SuppliersTab({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }) {
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null, targetName: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('Alger');
  const [category, setCategory] = useState('Atelier Satin');

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setWilaya('Alger');
    setCategory('Atelier Satin');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingId(s.id);
    setName(s.name);
    setPhone(s.phone);
    setWilaya(s.wilaya || 'Alger');
    setCategory(s.category || 'Atelier Pyjama');
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) {
      showToast("⚠️ الرجاء إدخال اسم المورد ورقم الهاتف", 'warning');
      return;
    }

    if (editingId) {
      onUpdateSupplier({ id: editingId, name, phone, wilaya, category });
    } else {
      onAddSupplier({ id: Date.now(), name, phone, wilaya, category });
    }
    setIsFormOpen(false);
  };

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
            🤝 دليل الموردين والورشات (Annuaire Fournisseurs)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enregistrez tous vos grossistes et ateliers. Leurs noms seront automatiquement liés à vos fiches produits.
          </p>
        </div>
        <button onClick={handleOpenNew} className="btn btn-primary">
          <Plus size={18} />
          <span>إضافة مورد جديد (Nouveau Fournisseur)</span>
        </button>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {editingId ? "✏️ تعديل بيانات المورد" : "✨ إضافة مورد / ورشة جديدة"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">إسم المورد أو الورشة (Nom du Fournisseur) *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Ex: Atelier Alger Centre - Sid Ali..." />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف (Téléphone) *</label>
                <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="Ex: 0555123456" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">الولاية / المنطقة</label>
                  <input type="text" value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">التخصص</label>
                  <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="form-input" placeholder="Ex: Soie & Satin" />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '12px', justifyContent: 'center' }}>
                <span>💾 حفظ بيانات المورد</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Suppliers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {suppliers.map(s => (
          <div key={s.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: '12px', background: 'var(--rose-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--burgundy)', fontWeight: 800, fontSize: '1.2rem' }}>
                  <Building size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>{s.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--burgundy)', fontWeight: 600 }}>{s.category || 'Atelier Pyjama'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => handleOpenEdit(s)} style={{ background: '#F5F5F5', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' }} title="Modifier">
                  <Edit2 size={16} color="#1565C0" />
                </button>
                <button onClick={() => setDeleteModal({ isOpen: true, targetId: s.id, targetName: s.name })} style={{ background: '#FFEBEE', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' }} title="Supprimer">
                  <Trash2 size={16} color="#D32F2F" />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#FAF8F5', padding: '12px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                <Phone size={15} color="#1F8A55" />
                <a href={`tel:${s.phone}`} style={{ fontWeight: 800, color: '#1F8A55', textDecoration: 'none' }}>{s.phone}</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <MapPin size={15} />
                <span>{s.wilaya || 'Algérie'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="تأكيد حذف المورد"
        message={`هل أنت متأكد من رغبتك في حذف المورد "${deleteModal.targetName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، حذف المورد"
        cancelText="تراجع وإلغاء"
        onConfirm={() => {
          if (deleteModal.targetId) {
            onDeleteSupplier(deleteModal.targetId);
          }
        }}
        onClose={() => setDeleteModal({ isOpen: false, targetId: null, targetName: '' })}
      />
    </div>
  );
}
