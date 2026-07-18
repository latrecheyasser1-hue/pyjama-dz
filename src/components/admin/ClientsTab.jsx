import React, { useState, useMemo } from 'react';
import { Search, UserCheck, UserX, User, Phone, MapPin, Calendar, ShoppingBag, Eye, X } from 'lucide-react';

export default function ClientsTab({ orders = [], products = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'good' | 'bad' | 'normal'
  const [selectedClient, setSelectedClient] = useState(null);

  // Group website orders by client phone number
  const clientsList = useMemo(() => {
    const clientMap = {};

    orders.forEach(o => {
      // Exclude POS purchases (which are in-store and have no real client phone in general, or are marked as Pos)
      const isPos = o.isPos || o.orderType === 'hanoot' || o.clientName?.includes('زبون المحل') || o.commune === 'المتجر الحضوري' || o.phone === '-';
      if (isPos || !o.phone || o.phone.length < 5) return;

      const phoneNormalized = o.phone.trim().replace(/\s+/g, '');
      if (!phoneNormalized) return;

      if (!clientMap[phoneNormalized]) {
        clientMap[phoneNormalized] = {
          phone: phoneNormalized,
          clientName: o.clientName || 'زبون',
          wilaya: o.wilaya || '',
          commune: o.commune || '',
          orders: [],
          latestOrderDate: o.created_at || ''
        };
      }

      clientMap[phoneNormalized].orders.push(o);

      // Keep latest order info
      if (new Date(o.created_at || 0) >= new Date(clientMap[phoneNormalized].latestOrderDate || 0)) {
        clientMap[phoneNormalized].clientName = o.clientName || clientMap[phoneNormalized].clientName;
        clientMap[phoneNormalized].wilaya = o.wilaya || clientMap[phoneNormalized].wilaya;
        clientMap[phoneNormalized].commune = o.commune || clientMap[phoneNormalized].commune;
        clientMap[phoneNormalized].latestOrderDate = o.created_at || '';
      }
    });

    return Object.values(clientMap).map(c => {
      const totalCount = c.orders.length;
      const livreeCount = c.orders.filter(o => o.status === 'confirmee' || o.status === 'expediee' || o.status === 'livree').length;
      const annuleeCount = c.orders.filter(o => o.status === 'annulee').length;
      const retourCount = c.orders.filter(o => o.status === 'retour').length;
      const pendingCount = c.orders.filter(o => o.status === 'nouvelle' || o.status === 'confirmee' || o.status === 'expediee').length;

      // Classification logic
      let reputation = 'normal'; // 'good' | 'bad' | 'normal'
      const badOrdersCount = annuleeCount + retourCount;
      if (badOrdersCount - livreeCount >= 2) {
        reputation = 'bad';
      } else if (livreeCount - badOrdersCount >= 5) {
        reputation = 'good';
      }

      return {
        ...c,
        totalCount,
        livreeCount,
        annuleeCount,
        retourCount,
        pendingCount,
        reputation
      };
    });
  }, [orders]);

  // Filter and search clients
  const filteredClients = useMemo(() => {
    return clientsList.filter(c => {
      // 1. Filter by type
      if (filterType === 'good' && c.reputation !== 'good') return false;
      if (filterType === 'bad' && c.reputation !== 'bad') return false;
      if (filterType === 'normal' && c.reputation !== 'normal') return false;

      // 2. Filter by search term
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = c.clientName && c.clientName.toLowerCase().includes(q);
        const matchesPhone = c.phone && c.phone.includes(q);
        return matchesName || matchesPhone;
      }

      return true;
    });
  }, [clientsList, filterType, searchTerm]);

  // Metrics counts
  const goodCount = useMemo(() => clientsList.filter(c => c.reputation === 'good').length, [clientsList]);
  const badCount = useMemo(() => clientsList.filter(c => c.reputation === 'bad').length, [clientsList]);
  const normalCount = useMemo(() => clientsList.filter(c => c.reputation === 'normal').length, [clientsList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', direction: 'rtl', fontFamily: 'var(--font-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>👥 إدارة سمعة الزبائن (CRM)</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0' }}>متابعة وتقييم طلبات زبائن الموقع الإلكتروني لكشف المشبوهين ومكافأة الأوفياء</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Good Clients Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, #10B981, #059669)', 
          color: 'white', 
          padding: '24px', 
          borderRadius: '20px', 
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, opacity: 0.9 }}>💚 الزبائن الأوفياء (Bon Clients)</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0 0' }}>{goodCount}</h2>
            <p style={{ fontSize: '0.82rem', margin: '4px 0 0', opacity: 0.85 }}>أكثر من 5 طلبيات ناجحة ولم يلغوا أي طلبية</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '16px' }}>
            <UserCheck size={36} />
          </div>
        </div>

        {/* Bad Clients Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, #EF4444, #DC2626)', 
          color: 'white', 
          padding: '24px', 
          borderRadius: '20px', 
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, opacity: 0.9 }}>💔 الزبائن المشبوهين (Mauvais Clients)</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0 0' }}>{badCount}</h2>
            <p style={{ fontSize: '0.82rem', margin: '4px 0 0', opacity: 0.85 }}>قاموا بإلغاء أو إرجاع طلبين أو أكثر</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '16px' }}>
            <UserX size={36} />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div style={{ 
        background: 'white', 
        padding: '16px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text" 
            placeholder="ابحث باسم الزبون أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 40px 10px 12px', 
              fontSize: '0.9rem', 
              border: '1px solid #E2E8F0', 
              borderRadius: '10px',
              fontFamily: 'var(--font-primary)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--burgundy)'}
            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: `الكل (${clientsList.length})` },
            { id: 'good', label: `🟢 الأوفياء (${goodCount})` },
            { id: 'bad', label: `🔴 المشبوهين (${badCount})` },
            { id: 'normal', label: `⚪ العاديين (${normalCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                border: 'none',
                background: filterType === tab.id ? 'var(--burgundy-dark)' : '#F1F5F9',
                color: filterType === tab.id ? 'white' : '#475569',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 750,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem' }}>الزبون</th>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem' }}>رقم الهاتف</th>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem' }}>العنوان</th>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem', textAlign: 'center' }}>الطلبات الإجمالية</th>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem', textAlign: 'center' }}>الناجحة / المؤكدة</th>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem', textAlign: 'center' }}>الملغاة / المسترجعة</th>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem' }}>السمعة</th>
              <th style={{ padding: '16px', fontWeight: 800, color: '#475569', fontSize: '0.88rem', textAlign: 'center' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(c => (
              <tr 
                key={c.phone} 
                onClick={() => setSelectedClient(c)}
                style={{ 
                  borderBottom: '1px solid #F1F5F9', 
                  cursor: 'pointer', 
                  transition: 'background 0.2s' 
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: c.reputation === 'good' ? '#D1FAE5' : (c.reputation === 'bad' ? '#FEE2E2' : '#F1F5F9'), 
                    color: c.reputation === 'good' ? '#065F46' : (c.reputation === 'bad' ? '#991B1B' : '#475569'), 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 800
                  }}>
                    {c.clientName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 750, color: '#1E293B' }}>{c.clientName}</span>
                </td>
                <td style={{ padding: '16px', color: '#475569', fontWeight: 600 }}>{c.phone}</td>
                <td style={{ padding: '16px', color: '#475569', fontSize: '0.88rem' }}>
                  {c.wilaya ? `${c.wilaya} - ${c.commune}` : '—'}
                </td>
                <td style={{ padding: '16px', fontWeight: 700, color: '#1E293B', textAlign: 'center' }}>{c.totalCount}</td>
                <td style={{ padding: '16px', fontWeight: 800, color: '#059669', textAlign: 'center' }}>{c.livreeCount}</td>
                <td style={{ padding: '16px', fontWeight: 800, color: '#DC2626', textAlign: 'center' }}>
                  {c.annuleeCount + c.retourCount}
                </td>
                <td style={{ padding: '16px' }}>
                  {c.reputation === 'good' && (
                    <span style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800 }}>
                      💚 زبون ممتاز
                    </span>
                  )}
                  {c.reputation === 'bad' && (
                    <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800 }}>
                      💔 زبون مشبوه / تحذير
                    </span>
                  )}
                  {c.reputation === 'normal' && (
                    <span style={{ background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800 }}>
                      ⚪ عادي
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedClient(c); }}
                    style={{ border: 'none', background: 'none', color: 'var(--burgundy)', cursor: 'pointer', padding: '6px' }}
                    title="عرض الطلبيات"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '40px', color: '#94A3B8', textAlign: 'center', fontSize: '0.95rem' }}>
                  لا يوجد أي زبائن مسجلين يطابقون الفلتر والبحث الحالي
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', width: '750px', borderRadius: '20px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', direction: 'rtl' }}>
            <button 
              onClick={() => setSelectedClient(null)}
              style={{ position: 'absolute', left: '16px', top: '16px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            {/* Profile Info Header */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '20px', marginBottom: '20px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: selectedClient.reputation === 'good' ? '#D1FAE5' : (selectedClient.reputation === 'bad' ? '#FEE2E2' : '#F1F5F9'), 
                color: selectedClient.reputation === 'good' ? '#065F46' : (selectedClient.reputation === 'bad' ? '#991B1B' : '#475569'), 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.5rem'
              }}>
                {selectedClient.clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>{selectedClient.clientName}</h3>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: '#64748B', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {selectedClient.phone}</span>
                  {selectedClient.wilaya && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {selectedClient.wilaya} - {selectedClient.commune}</span>}
                </div>
              </div>
            </div>

            {/* Status counts in modal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>إجمالي الطلبات</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>{selectedClient.totalCount}</div>
              </div>
              <div style={{ background: '#ECFDF5', padding: '12px', borderRadius: '10px', textAlign: 'center', color: '#065F46' }}>
                <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>الناجحة / المؤكدة</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>{selectedClient.livreeCount}</div>
              </div>
              <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '10px', textAlign: 'center', color: '#991B1B' }}>
                <span style={{ fontSize: '0.78rem', color: '#B91C1C', fontWeight: 600 }}>الملغاة (Annulée)</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>{selectedClient.annuleeCount}</div>
              </div>
              <div style={{ background: '#FFF7ED', padding: '12px', borderRadius: '10px', textAlign: 'center', color: '#C2410C' }}>
                <span style={{ fontSize: '0.78rem', color: '#C2410C', fontWeight: 600 }}>المسترجعة (Retour)</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>{selectedClient.retourCount}</div>
              </div>
            </div>

            {/* History Table */}
            <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '12px', color: 'var(--burgundy-dark)' }}>📜 سجل طلبيات الزبون التفصيلي:</h4>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>رقم الطلب</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>التاريخ</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>المنتجات</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>المجموع</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedClient.orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, textTransform: 'uppercase' }}>#{o.ticketNumber || o.id?.toString().substring(0, 8)}</td>
                      <td style={{ padding: '10px 12px', color: '#64748B' }}>
                        {o.created_at ? new Date(o.created_at).toLocaleDateString('ar-DZ') : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {Array.isArray(o.items) 
                          ? o.items.map(it => `${it.product} (x${it.qty})`).join(' + ') 
                          : o.productTitle || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 750, color: 'var(--burgundy)' }}>
                        {o.price?.toLocaleString()} DA
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {o.status === 'nouvelle' && <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 750 }}>🆕 جديدة</span>}
                        {o.status === 'confirmee' && <span style={{ background: '#FDF4FF', color: '#86198F', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 750 }}>📞 مؤكدة</span>}
                        {o.status === 'annulee' && <span style={{ background: '#FEF2F2', color: '#991B1B', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 750 }}>❌ ملغاة</span>}
                        {o.status === 'expediee' && <span style={{ background: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 750 }}>🚚 تم الشحن</span>}
                        {o.status === 'livree' && <span style={{ background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 750 }}>✅ تم التوصيل</span>}
                        {o.status === 'retour' && <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 750 }}>↩️ مسترجعة</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
