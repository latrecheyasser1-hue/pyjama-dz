import React, { useState, useMemo } from 'react';
import { Phone, Trash2, CheckCircle2, Clock, AlertCircle, MessageSquare, ExternalLink, Search } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function ReclamationsTab({ settings, onUpdateSettings }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const reclamations = useMemo(() => {
    return settings?.reclamations && Array.isArray(settings.reclamations) 
      ? settings.reclamations 
      : [];
  }, [settings?.reclamations]);

  // Compute counts
  const counts = useMemo(() => {
    return {
      total: reclamations.length,
      nouvelle: reclamations.filter(r => r.status === 'nouvelle').length,
      en_cours: reclamations.filter(r => r.status === 'en_cours').length,
      resolue: reclamations.filter(r => r.status === 'resolue').length,
    };
  }, [reclamations]);

  // Filter list
  const filteredList = useMemo(() => {
    return reclamations.filter(r => {
      // 0. Exclude resolved
      if (r.status === 'resolue') return false;

      // 1. Status Filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // 2. Search Term
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = r.clientName && r.clientName.toLowerCase().includes(q);
        const matchesPhone = r.whatsappNumber && r.whatsappNumber.includes(q);
        const matchesMsg = r.message && r.message.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesMsg;
      }
      return true;
    });
  }, [reclamations, statusFilter, searchTerm]);

  // Update Status
  const handleUpdateStatus = async (id, newStatus) => {
    const updated = reclamations.map(r => {
      if (r.id === id) {
        return { ...r, status: newStatus };
      }
      return r;
    });
    await onUpdateSettings({ reclamations: updated });
    showToast('تم تحديث حالة الشكوى بنجاح', 'success');
  };

  // Delete Reclamation
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الشكوى نهائياً؟')) return;
    const updated = reclamations.filter(r => r.id !== id);
    await onUpdateSettings({ reclamations: updated });
    showToast('تم حذف الشكوى بنجاح', 'success');
  };

  // WhatsApp Link Builder
  const getWhatsAppLink = (num) => {
    let clean = num.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '213' + clean.substring(1);
    } else if (!clean.startsWith('213')) {
      clean = '213' + clean;
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent('السلام عليكم، نحن نتصل بك بخصوص الشكوى التي قدمتها في موقعنا...')}`;
  };

  return (
    <div style={{ direction: 'rtl', fontFamily: 'var(--font-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
            📢 الشكاوي والاقتراحات
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            متابعة وحل مشاكل الزبائن الواردة من موقع الويب بالوقت الحقيقي
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>إجمالي الشكاوي</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>{counts.total}</div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#B91C1C', fontWeight: 600 }}>جديدة (Nouvelle)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#991B1B', marginTop: '2px' }}>{counts.nouvelle}</div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#1D4ED8', fontWeight: 600 }}>قيد المعالجة (En cours)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E3A8A', marginTop: '2px' }}>{counts.en_cours}</div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600 }}>تم حلها (Résolue)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#065F46', marginTop: '2px' }}>{counts.resolue}</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{ display: 'flex', gap: '16px', background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text"
            placeholder="البحث بالاسم، رقم الواتساب، أو نص الرسالة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 42px 10px 16px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--burgundy)'}
            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setStatusFilter('all')}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: statusFilter === 'all' ? 'var(--burgundy)' : '#F1F5F9', color: statusFilter === 'all' ? 'white' : '#475569', transition: 'all 0.2s' }}
          >
            الكل ({counts.total - counts.resolue})
          </button>
          <button 
            onClick={() => setStatusFilter('nouvelle')}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: statusFilter === 'nouvelle' ? '#EF4444' : '#F1F5F9', color: statusFilter === 'nouvelle' ? 'white' : '#475569', transition: 'all 0.2s' }}
          >
            جديدة ({counts.nouvelle})
          </button>
          <button 
            onClick={() => setStatusFilter('en_cours')}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: statusFilter === 'en_cours' ? '#3B82F6' : '#F1F5F9', color: statusFilter === 'en_cours' ? 'white' : '#475569', transition: 'all 0.2s' }}
          >
            قيد المعالجة ({counts.en_cours})
          </button>
        </div>
      </div>

      {/* Complaints List */}
      {filteredList.length === 0 ? (
        <div style={{ background: 'white', padding: '60px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
          <span style={{ fontSize: '3rem' }}>📭</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--burgundy-dark)', marginTop: '16px', marginBottom: '6px' }}>لا توجد شكاوي مطابقة للبحث</h3>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>كل الشكاوي الواردة تم تصفيتها أو أن الصندوق فارغ تماماً.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredList.map(r => (
            <div 
              key={r.id} 
              style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '16px', 
                border: '1px solid #E2E8F0', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                position: 'relative',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>{r.clientName}</h3>
                    
                    {/* Status Badge */}
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 800, 
                      padding: '4px 10px', 
                      borderRadius: '20px',
                      background: r.status === 'nouvelle' ? '#FEF2F2' : (r.status === 'en_cours' ? '#EFF6FF' : '#ECFDF5'),
                      color: r.status === 'nouvelle' ? '#EF4444' : (r.status === 'en_cours' ? '#3B82F6' : '#10B981'),
                    }}>
                      {r.status === 'nouvelle' ? 'جديدة' : (r.status === 'en_cours' ? 'قيد المعالجة' : 'تم حلها')}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.82rem', color: '#64748B' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🟢 واتساب: <strong style={{ color: '#0F172A' }}>{r.whatsappNumber}</strong>
                    </span>
                    <span>•</span>
                    <span>التاريخ: {r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : 'غير محدد'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Resolve Button */}
                  <button 
                    onClick={() => handleUpdateStatus(r.id, 'resolue')}
                    style={{ 
                      background: '#ECFDF5',
                      color: '#059669',
                      border: '1.5px solid #10B981',
                      borderRadius: '8px', 
                      padding: '8px 14px', 
                      fontSize: '0.82rem', 
                      fontWeight: 800, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s' 
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#ECFDF5'; e.currentTarget.style.color = '#059669'; }}
                  >
                    <CheckCircle2 size={14} />
                    <span>تمت المعالجة</span>
                  </button>

                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDelete(r.id)}
                    style={{ 
                      background: '#FFF1F2', 
                      color: '#F43F5E', 
                      border: 'none', 
                      borderRadius: '8px', 
                      width: '36px', 
                      height: '36px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.2s' 
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#FFE4E6'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#FFF1F2'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9', fontSize: '0.92rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: 'right' }}>
                {r.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
