import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Printer, Trash2, X } from 'lucide-react';
import { getClientReputation } from '../../utils/reputation';

export default function HistoryTab({ orders, products, settings, onUpdateProduct, onUpdateStatus, onUpdateSettings }) {
  const [historyType, setHistoryType] = useState('orders'); // 'orders' | 'reclamations'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [printingOrder, setPrintingOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [returnConfirmationId, setReturnConfirmationId] = useState(null);

  // Complaints History Logic
  const resolvedReclamations = useMemo(() => {
    const list = settings?.reclamations && Array.isArray(settings.reclamations) ? settings.reclamations : [];
    return list.filter(r => r.status === 'resolue');
  }, [settings?.reclamations]);

  const filteredReclamations = useMemo(() => {
    if (!search.trim()) return resolvedReclamations;
    const q = search.toLowerCase().trim();
    return resolvedReclamations.filter(r => {
      return (r.clientName && r.clientName.toLowerCase().includes(q)) ||
             (r.whatsappNumber && r.whatsappNumber.includes(q)) ||
             (r.message && r.message.toLowerCase().includes(q));
    });
  }, [resolvedReclamations, search]);

  const handleDeleteReclamation = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الشكوى نهائياً من الأرشيف؟')) return;
    const allRecs = settings?.reclamations && Array.isArray(settings.reclamations) ? settings.reclamations : [];
    const updated = allRecs.filter(r => r.id !== id);
    if (onUpdateSettings) {
      await onUpdateSettings({ reclamations: updated });
    }
  };

  // Filter for archived orders (or old non-nouvelle orders)
  const archivedOrders = orders.filter(o => o.archived === true || (o.archived === undefined && o.status !== 'nouvelle') || o.isPos === true);

  const filteredOrders = archivedOrders.filter(o => {
    const searchLower = search.toLowerCase();
    const phoneMatches = o.phone && String(o.phone).toLowerCase().includes(searchLower);
    const displayedId = (o.ticketNumber || (o.id && String(o.id).substring(0, 8)))?.toString().toLowerCase() || '';
    const idMatches = displayedId.includes(searchLower);
    
    const matchesSearch = search === '' || phoneMatches || idMatches;
      
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    const isGros = (o.product && o.product.includes('(جملة -')) || 
                   (o.clientName && o.clientName.includes('(واتساب:')) ||
                   (o.items && o.items.some(it => it.size === 'Série'));
    const isHanout = o.isPos === true || o.clientName === 'زبون المحل (بيع حضوري)' || o.commune === 'المتجر الحضوري';
    const isLivraison = !isGros && !isHanout;
    
    const matchesType = orderTypeFilter === 'all' || 
                        (orderTypeFilter === 'gros' && isGros) ||
                        (orderTypeFilter === 'hanout' && isHanout) ||
                        (orderTypeFilter === 'livraison' && isLivraison);

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const itemDateStr = o.created_at || o.date;
      if (itemDateStr) {
        let itemDate;
        if (typeof itemDateStr === 'string' && itemDateStr.includes('/') && itemDateStr.split('/').length === 3) {
          const [day, month, year] = itemDateStr.split('/');
          itemDate = new Date(`${year}-${month}-${day}`);
        } else {
          itemDate = new Date(itemDateStr);
        }

        if (!isNaN(itemDate.getTime())) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
          const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

          const diffTime = Math.abs(now - itemDate);
          const diffDays = diffTime / (1000 * 60 * 60 * 24);

          if (dateFilter === 'today') {
            matchesDate = itemDate >= todayStart && itemDate <= now;
          } else if (dateFilter === 'yesterday') {
            matchesDate = itemDate >= yesterdayStart && itemDate <= yesterdayEnd;
          } else if (dateFilter === 'last_week') {
            matchesDate = diffDays <= 7;
          } else if (dateFilter === 'last_month') {
            matchesDate = diffDays <= 30;
          } else if (dateFilter === 'single' && singleDate) {
            const sDateStart = new Date(`${singleDate}T00:00:00`);
            const sDateEnd = new Date(`${singleDate}T23:59:59.999`);
            matchesDate = itemDate >= sDateStart && itemDate <= sDateEnd;
          } else if (dateFilter === 'range') {
            if (startDate) {
              const rStart = new Date(`${startDate}T00:00:00`);
              if (itemDate < rStart) matchesDate = false;
            }
            if (endDate && matchesDate) {
              const rEnd = new Date(`${endDate}T23:59:59.999`);
              if (itemDate > rEnd) matchesDate = false;
            }
          }
        }
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const triggerPrint = () => {
    window.print();
  };

  const handleConfirmRetour = (order) => {
    // 1. Replenish stock
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
          onUpdateProduct({
            ...prodToUpdate,
            colorVariants: updatedVariants
          });
        }
      });
    }

    // 2. Change status to retour
    onUpdateStatus(order.id, 'retour', true);
    setReturnConfirmationId(null);
  };

  return (
    <div className="animate-fade-up">
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
          aside, nav, header, footer, .sidebar, .no-print {
            display: none !important;
          }
          div, main, section, article {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            box-sizing: border-box !important;
          }
          body * {
            visibility: hidden !important;
          }
          .receipt-print-modal, .receipt-print-modal * {
            visibility: visible !important;
          }
          .modal-overlay {
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
          .receipt-print-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: auto !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8px !important;
            box-shadow: none !important;
            border: none !important;
            max-height: none !important;
            overflow: visible !important;
            background: #FFF !important;
            color: #000 !important;
            box-sizing: border-box !important;
            font-size: 12px !important;
          }
          .receipt-print-modal h2 {
            font-size: 18px !important;
          }
          .receipt-print-modal table {
            width: 100% !important;
            font-size: 11px !important;
            table-layout: fixed !important;
            word-break: break-word !important;
          }
        }
      `}</style>

      {/* Tab Switcher: Orders History vs Complaints History */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px' }}>
        <button
          onClick={() => setHistoryType('orders')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: historyType === 'orders' ? '3px solid var(--burgundy)' : '3px solid transparent',
            color: historyType === 'orders' ? 'var(--burgundy-dark)' : '#64748B',
            fontSize: '1rem',
            fontWeight: 800,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-11px'
          }}
        >
          📜 أرشيف وسجل الطلبيات ({filteredOrders.length})
        </button>
        <button
          onClick={() => setHistoryType('reclamations')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: historyType === 'reclamations' ? '3px solid var(--burgundy)' : '3px solid transparent',
            color: historyType === 'reclamations' ? 'var(--burgundy-dark)' : '#64748B',
            fontSize: '1rem',
            fontWeight: 800,
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-11px'
          }}
        >
          📢 سجل الشكاوي المعالجة ({filteredReclamations.length})
        </button>
      </div>

      {historyType === 'reclamations' ? (
        /* Complaints History List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--burgundy-dark)', margin: 0 }}>
                📢 أرشيف الشكاوي والاقتراحات المعالجة
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                الشكاوي التي تم حلها ومعالجتها ونقلها للأرشيف
              </p>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--burgundy)' }}>
              إجمالي الشكاوي المعالجة : {filteredReclamations.length} شكوى
            </div>
          </div>

          {/* Search bar inside complaints history */}
          <div style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
            <input
              type="text"
              placeholder="البحث بالاسم، رقم الواتساب، أو محتوى الرسالة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '44px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {filteredReclamations.length === 0 ? (
            <div style={{ background: 'white', padding: '60px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
              <span style={{ fontSize: '3rem' }}>📭</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--burgundy-dark)', marginTop: '16px', marginBottom: '6px' }}>لا توجد شكاوي معالجة في الأرشيف</h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>الشكاوي التي تقوم بتحديدها كـ "تمت المعالجة" ستظهر هنا.</p>
            </div>
          ) : (
            filteredReclamations.map(r => (
              <div 
                key={r.id} 
                style={{ 
                  background: 'white', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  border: '1px solid #E2E8F0', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>{r.clientName}</h4>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        padding: '4px 10px', 
                        borderRadius: '20px',
                        background: '#ECFDF5',
                        color: '#10B981',
                      }}>
                        تمت المعالجة ✔️
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.82rem', color: '#64748B' }}>
                      <span>واتساب: <strong style={{ color: '#0F172A' }}>{r.whatsappNumber}</strong></span>
                      <span>•</span>
                      <span>التاريخ: {r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : 'غير محدد'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteReclamation(r.id)}
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
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9', fontSize: '0.92rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: 'right' }}>
                  {r.message}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                📜 أرشيف وسجل الطلبيات المؤكدة والملغاة (Historique)
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                الطلبيات التي تم تأكيدها أو إلغاؤها تنتقل تلقائياً إلى هذا الأرشيف.
              </p>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--burgundy)' }}>
              إجمالي الأرشيف : {filteredOrders.length} طلبية
            </div>
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
                <input
                  type="text"
                  placeholder="البحث برقم الهاتف (05...) أو رقم الطلبية (Ticket ID)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
              <select value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value)} className="form-select" style={{ width: '200px', fontWeight: 800 }}>
                <option value="all">كل الأنواع (Tous les types)</option>
                <option value="livraison">🚚 توصيل (Livraison)</option>
                <option value="gros">📦 جملة (Gros)</option>
                <option value="hanout">🏪 حضوري (Boutique)</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select" style={{ width: '200px', fontWeight: 800 }}>
                <option value="all">الكل (Tous les statuts)</option>
                <option value="confirmee">✅ مؤكدة (Confirmée)</option>
                <option value="annulee">❌ ملغاة (Annulée)</option>
                <option value="retour">↩️ إسترجاع (Retour)</option>
              </select>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="form-select" style={{ width: '220px', fontWeight: 800 }}>
                <option value="all">📅 كل الأيام (Toutes les dates)</option>
                <option value="today">⭐ اليوم (Aujourd'hui)</option>
                <option value="yesterday">⏪ الأمس (Hier)</option>
                <option value="last_week">📆 آخر 7 أيام (7 Jours)</option>
                <option value="last_month">🗓️ آخر 30 يوم (30 Jours)</option>
                <option value="single">📌 اختيار يوم محدد (Date précise)</option>
                <option value="range">🔍 تحديد فترة معينة (Période)</option>
              </select>
            </div>

            {/* Conditional Date Pickers for Single Date or Date Range */}
            {dateFilter === 'single' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '10px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', width: 'fit-content' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B' }}>📌 حدد اليوم:</span>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="form-input"
                  style={{ width: '180px', fontWeight: 800, padding: '6px 12px' }}
                />
              </div>
            )}

            {dateFilter === 'range' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#F8FAFC', padding: '10px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', width: 'fit-content' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B' }}>🔍 من يوم:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input"
                  style={{ width: '170px', fontWeight: 800, padding: '6px 12px' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B' }}>إلى يوم:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input"
                  style={{ width: '170px', fontWeight: 800, padding: '6px 12px' }}
                />
              </div>
            )}
          </div>

          {/* Archive Table */}
          <div className="table-container">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>ID & Date</th>
                    <th>Client(e)</th>
                    {orderTypeFilter !== 'hanout' && <th>Téléphone</th>}
                    {orderTypeFilter !== 'hanout' && <th>Wilaya / Commune</th>}
                    {orderTypeFilter === 'hanout' && <th>الخصم (Remise)</th>}
                    <th>Produit & Taille</th>
                    <th>Montant</th>
                    <th>الحالة (Statut)</th>
                    <th style={{ minWidth: '150px', textAlign: 'center' }}>الإجراء (Action)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={orderTypeFilter === 'hanout' ? 7 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>لا توجد طلبيات في الأرشيف مطابقة للبحث.</td></tr>
                  ) : (
                    filteredOrders.map(o => {
                      const discountItem = o.items && Array.isArray(o.items) && o.items.find(it => it.productId === 'discount' || it.product?.includes('Remise') || it.product?.includes('تخفيض'));
                      const discountVal = discountItem ? Math.abs(discountItem.price || 0) : (o.discount || 0);

                      return (
                        <tr 
                          key={o.id} 
                          style={{ background: (() => {
                            const rep = getClientReputation(o.phone, orders);
                            if (rep === 'good') return '#ECFDF5';
                            if (rep === 'bad') return '#FEF2F2';
                            return 'white';
                          })(), cursor: 'pointer' }} 
                          onClick={() => setSelectedOrderDetails(o)}
                        >
                          <td style={{ fontWeight: 600, textTransform: 'uppercase' }}>#{o.ticketNumber || o.id?.toString().substring(0, 8)}<div style={{ fontSize: '0.75rem', color: '#888' }}>{o.date || (o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : "À l'instant")}</div></td>
                          <td style={{ fontWeight: 700 }}>{o.clientName}</td>
                          {orderTypeFilter !== 'hanout' && (
                            <td style={{ fontWeight: 800, color: '#1F8A55' }}>{o.phone}</td>
                          )}
                          {orderTypeFilter !== 'hanout' && (
                            <td>
                              <strong>{o.wilaya}</strong>
                              <div style={{ fontSize: '0.8rem', color: '#777' }}>{o.commune}</div>
                            </td>
                          )}
                          {orderTypeFilter === 'hanout' && (
                            <td style={{ fontWeight: 800, color: '#DC2626' }}>
                              {discountVal > 0 ? `${discountVal.toLocaleString()} DA` : '-'}
                            </td>
                          )}
                          <td style={{ fontWeight: 600 }}>
                          <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.product}
                          </div>
                          <span style={{ fontSize: '0.75rem', background: '#F5F5F5', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{o.size}</span>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--burgundy)' }}>{(o.price || 0).toLocaleString()} DA</td>
                        <td>
                          {o.status === 'confirmee' || o.status === 'livree' ? (
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={o.status}
                              onChange={(e) => {
                                if (e.target.value === 'retour') {
                                  setReturnConfirmationId(o.id);
                                }
                              }}
                              className={`status-badge status-${o.status}`}
                              style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-primary)', fontWeight: 800 }}
                            >
                              {o.status === 'confirmee' && <option value="confirmee">✅ مؤكدة</option>}
                              {o.status === 'livree' && <option value="livree">🚚 مستلمة</option>}
                              <option value="retour">↩️ إرجاع (Retour)</option>
                            </select>
                          ) : (
                            <span className={`status-badge status-${o.status}`}>
                              {o.status === 'annulee' ? '❌ ملغاة' : '↩️ مسترجعة'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {returnConfirmationId === o.id ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleConfirmRetour(o); }}
                                style={{ background: '#EF4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                              >
                                تأكيد الإسترجاع
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setReturnConfirmationId(null); }}
                                style={{ background: '#E5E7EB', color: '#374151', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : o.status === 'confirmee' || o.status === 'livree' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPrintingOrder(o); }}
                              style={{
                                background: 'var(--burgundy)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Printer size={15} />
                              <span>إعادة طباعة</span>
                            </button>
                          ) : (
                            <span style={{ color: '#CCC', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Printable Receipt Modal (Ticket POS Style Centered) */}
      {printingOrder && (
        <div 
          className="modal-overlay" 
          onClick={(e) => { if (e.target.className === 'modal-overlay') setPrintingOrder(null); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="receipt-print-modal animate-fade-up" 
            style={{ 
              width: '100%',
              maxWidth: '360px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              color: '#000000',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              fontFamily: 'var(--font-primary), sans-serif',
              direction: 'rtl',
              textAlign: 'right',
              border: '1px solid #E5E5E5',
              boxSizing: 'border-box'
            }}
          >
            {/* Determine if order is POS */}
            {(() => {
              const isPosOrder = printingOrder.isPos || printingOrder.clientName === 'زبون المحل (بيع حضوري)' || printingOrder.commune === 'المتجر الحضوري';
              return (
                <>
                  {/* Ticket Header */}
                  <div style={{ textAlign: 'center', borderBottom: '2px dashed #333', paddingBottom: '12px', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 4px', color: '#000' }}>
                      Pyjama DZ
                    </h2>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#444' }}>
                      متجر بيجامات نسائية وملابس منزلية
                    </div>
                    {!isPosOrder && (
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#555', marginTop: '4px' }}>
                        توصيل لجميع ولايات الجزائر (58 ولاية)
                      </div>
                    )}
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '8px', direction: 'ltr' }}>
                      رقم الوصل: #{printingOrder.ticketNumber || printingOrder.id?.toString().substring(0, 8)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>
                      التاريخ: {printingOrder.date}
                    </div>
                  </div>

                  {/* Client Info */}
                  {!isPosOrder && (
                    <div style={{ marginBottom: '12px', fontSize: '0.85rem', lineHeight: '1.8', borderBottom: '2px dashed #333', paddingBottom: '12px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '6px', color: '#000' }}>
                        معلومات الزبونة:
                      </div>
                      <div><strong>الاسم واللقب:</strong> {printingOrder.clientName || 'زبون'}</div>
                      {printingOrder.phone && printingOrder.phone !== '0000000000' && (
                        <div><strong>رقم الهاتف:</strong> <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: 800 }}>{printingOrder.phone}</span></div>
                      )}
                      <div><strong>الولاية والبلدية:</strong> {printingOrder.wilaya} ({printingOrder.commune})</div>
                      <div><strong>طريقة التوصيل:</strong> {printingOrder.deliveryMode || 'توصيل للمنزل'}</div>
                    </div>
                  )}

                  {/* Items Table */}
                  <div style={{ marginBottom: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #000', borderTop: '1.5px solid #000' }}>
                          <th style={{ padding: '8px 4px', textAlign: 'right' }}>المنتج</th>
                          <th style={{ padding: '8px 4px' }}>اللون</th>
                          <th style={{ padding: '8px 4px' }}>المقاس</th>
                          <th style={{ padding: '8px 4px', textAlign: 'left' }}>المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printingOrder.items && printingOrder.items.length > 0 ? (
                          printingOrder.items.map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: '1.5px dashed #aaa' }}>
                              <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{it.product || it.title}</td>
                              <td style={{ padding: '8px 4px' }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{it.color || it.selectedColor || '—'}</span></td>
                              <td style={{ padding: '8px 4px', fontWeight: 800 }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{it.size || it.selectedSize} {it.qty > 1 ? `(x${it.qty})` : ''}</span></td>
                              <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{((it.price || 0) * (it.qty || it.quantity || 1)).toLocaleString()} د.ج</td>
                            </tr>
                          ))
                        ) : (
                          <tr style={{ borderBottom: '1.5px dashed #aaa' }}>
                            <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{printingOrder.product}</td>
                            <td style={{ padding: '8px 4px' }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{printingOrder.color || '—'}</span></td>
                            <td style={{ padding: '8px 4px', fontWeight: 800 }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{printingOrder.size}</span></td>
                            <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{(printingOrder.price || 0).toLocaleString()} د.ج</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Discount if exists */}
                  {(printingOrder.discount > 0 || printingOrder.remise > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#D32F2F', marginBottom: '8px' }}>
                      <span>تخفيض للزبون (Remise):</span>
                      <span style={{ direction: 'ltr' }}>- {(printingOrder.discount || printingOrder.remise || 0).toLocaleString()} د.ج</span>
                    </div>
                  )}

                  {/* Total */}
                  <table style={{ width: '100%', fontSize: '1.2rem', fontWeight: 900, borderTop: '2px dashed #333', marginTop: '8px', marginBottom: '8px' }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingTop: '12px', border: 'none', textAlign: 'right' }}>المجموع الإجمالي:</td>
                        <td style={{ paddingTop: '12px', border: 'none', textAlign: 'left', direction: 'ltr' }}>{(printingOrder.price || 0).toLocaleString()} د.ج</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              );
            })() || null}

            {/* Notice Box */}
            <div style={{ border: '1.5px dashed #444', borderRadius: '8px', padding: '8px', textAlign: 'center', fontSize: '0.75rem', lineHeight: '1.5', marginBottom: '4px', background: '#F9F9F9' }}>
              <strong style={{ display: 'block', marginBottom: '2px' }}>تنبيه:</strong>
              السلع المباعة تُستبدل ولا تُرد خلال مدة أقصاها 48 ساعة من تاريخ الاستلام، مع إحضار فاتورة الشراء.
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '0.8rem', lineHeight: '1.6', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800 }}>شكراً لثقتكم بـ Pyjama DZ!</div>
              <div style={{ color: '#555' }}>لأي استفسار يرجى الاتصال بنا على:</div>
              <div style={{ fontWeight: 800, direction: 'ltr' }}>{Array.isArray(settings?.phoneOrders) ? settings.phoneOrders.join(' - ') : (settings?.phoneOrders || settings?.whatsapp || "0555 12 34 56")}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Instagram: {(settings?.instagramUrl || "@pyjama_dz").replace('https://www.instagram.com/', '@').replace('https://instagram.com/', '@').replace(/\/$/, '')}</div>
            </div>

            {/* Buttons (No print) */}
            <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={triggerPrint}
                style={{
                  flex: 1,
                  background: '#000',
                  color: '#FFF',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={16} />
                <span>🖨️ طباعة التذكرة (Ticket)</span>
              </button>
              <button
                onClick={() => setPrintingOrder(null)}
                style={{
                  background: '#E5E5E5',
                  color: '#333',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px 16px',
          overflow: 'hidden'
        }} onClick={() => setSelectedOrderDetails(null)}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            padding: '28px 24px',
            position: 'relative',
            direction: 'rtl'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedOrderDetails(null)}
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: '#F1F5F9',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div style={{ borderBottom: '2px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--burgundy)' }}>
                  📄 تفاصيل الطلبية #{selectedOrderDetails.ticketNumber || selectedOrderDetails.id?.toString().substring(0, 8)}
                </h3>
                <span className={`status-badge status-${selectedOrderDetails.status}`} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem' }}>
                  {selectedOrderDetails.status === 'nouvelle' && '🆕 جديدة'}
                  {selectedOrderDetails.status === 'confirmee' && '📞 مؤكدة'}
                  {selectedOrderDetails.status === 'annulee' && '❌ ملغاة'}
                  {selectedOrderDetails.status === 'expediee' && '🚚 تم الشحن'}
                  {selectedOrderDetails.status === 'livree' && '✅ تم التوصيل'}
                  {selectedOrderDetails.status === 'retour' && '↩️ إسترجاع'}
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'block', marginTop: '6px' }}>
                تاريخ الطلب: <strong>{selectedOrderDetails.date || (selectedOrderDetails.created_at ? new Date(selectedOrderDetails.created_at).toLocaleString('fr-FR') : "غير محدد")}</strong>
              </span>
            </div>

            {/* Customer Information Section */}
            <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1E293B', fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
                👤 معلومات الزبون (Customer Info)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>الاسم واللقب:</span>
                  <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>{selectedOrderDetails.clientName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>رقم الهاتف:</span>
                  <a href={`tel:${selectedOrderDetails.phone}`} style={{ textDecoration: 'none', color: '#1F8A55', fontWeight: 800, fontSize: '0.95rem' }}>
                    📞 {selectedOrderDetails.phone}
                  </a>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>العنوان (الولاية والبلدية):</span>
                  <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>{selectedOrderDetails.wilaya} - {selectedOrderDetails.commune}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>طريقة التوصيل (Mode):</span>
                  <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>{selectedOrderDetails.deliveryMode || 'غير محدد'}</strong>
                </div>
              </div>
            </div>

            {/* Order Items Section */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1E293B', fontSize: '1rem', fontWeight: 800 }}>
                🛍️ المنتجات المطلوبة (Ordered Items)
              </h4>
              
              {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrderDetails.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#1E293B', display: 'block' }}>{item.product}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          اللون: <strong>{item.color || 'Standard'}</strong> | المقاس: <strong>{item.size || 'Standard'}</strong>
                        </span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'block' }}>
                          {item.qty} × {Number(item.price || 0).toLocaleString()} DA
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--burgundy)' }}>
                          {(Number(item.qty || 1) * Number(item.price || 0)).toLocaleString()} DA
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#1E293B', display: 'block' }}>{selectedOrderDetails.product}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    المقاس: <strong>{selectedOrderDetails.size || 'Standard'}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Price & Summary */}
            <div style={{ borderTop: '2px solid #F1F5F9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                {selectedOrderDetails.discount > 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#E53935', display: 'block' }}>
                    الخصم: <strong>-{(selectedOrderDetails.discount || 0).toLocaleString()} DA</strong>
                  </span>
                )}
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>المبلغ الإجمالي المستحق:</span>
              </div>
              <strong style={{ fontSize: '1.4rem', color: 'var(--burgundy)', fontWeight: 900 }}>
                {Number(selectedOrderDetails.price || 0).toLocaleString()} DA
              </strong>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
              <button
                onClick={() => {
                  setPrintingOrder(selectedOrderDetails);
                  setTimeout(() => window.print(), 300);
                }}
                style={{
                  padding: '12px 20px',
                  background: '#1E293B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Printer size={16} />
                <span>طبع تذكرة البيع (Ticket)</span>
              </button>
              
              <button
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  padding: '12px 20px',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
