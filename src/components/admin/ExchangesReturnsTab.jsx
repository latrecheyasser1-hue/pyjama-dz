import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  Search, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  Phone, 
  Copy, 
  ExternalLink, 
  ZoomIn, 
  Package, 
  CreditCard, 
  AlertCircle,
  MessageCircle,
  Tag,
  ArrowRightLeft
} from 'lucide-react';
import { showToast } from '../../utils/toast';
import { supabase } from '../../lib/supabaseClient';

export default function ExchangesReturnsTab({ orders = [], products = [], settings = {}, onUpdateStatus }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [rejectionModalOrder, setRejectionModalOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('السلعة غير مطابقة لشروط الاستبدال');

  // Filter only exchange and return orders
  const allExchangeOrders = useMemo(() => {
    return (orders || []).filter(order => {
      const isEx = Boolean(
        order.isExchange === true ||
        order.isRetour === true ||
        String(order.clientName || '').includes('استبدال') ||
        String(order.product || '').includes('استبدال') ||
        String(order.product || '').includes('استرجاع') ||
        order.exchangeDetails ||
        (Array.isArray(order.items) && order.items.some(it => it && (it.isExchangeItem || it.isExchangeMeta)))
      );
      return isEx;
    }).map(order => {
      // Extract normalized exchange metadata
      const meta = order.exchangeDetails || 
        (Array.isArray(order.items) ? order.items.find(it => it && it.isExchangeMeta) : null) || {};
      
      const replacementItems = Array.isArray(order.items) 
        ? order.items.filter(it => it && !it.isExchangeMeta && it.title)
        : [];

      const rawRip = String(meta.baridiMobRip || order.baridiMobRip || '').trim();
      const refundDue = Number(meta.refundDue || order.refundDue || 0);

      // Determine approval status
      let approvalState = 'pending';
      if (order.exchangeStatus === 'approved' || (order.trackingNumber && order.status !== 'annulee')) {
        approvalState = 'approved';
      } else if (order.exchangeStatus === 'rejected' || order.status === 'annulee') {
        approvalState = 'rejected';
      }

      return {
        ...order,
        meta,
        replacementItems,
        approvalState,
        refundDue,
        baridiMobRip: rawRip,
        photo: meta.productPhoto || order.productPhoto || null,
        oldTitle: meta.oldProductTitle || order.product || 'بيجامة',
        oldBarcode: meta.oldProductBarcode || '',
        oldPrice: Number(meta.oldProductPrice || 0),
        reason: meta.reason || 'تغيير المقاس أو الموديل'
      };
    });
  }, [orders]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: allExchangeOrders.length,
      pending: allExchangeOrders.filter(o => o.approvalState === 'pending').length,
      approved: allExchangeOrders.filter(o => o.approvalState === 'approved').length,
      rejected: allExchangeOrders.filter(o => o.approvalState === 'rejected').length
    };
  }, [allExchangeOrders]);

  // Filtered list according to tab & search
  const filteredOrders = useMemo(() => {
    return allExchangeOrders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.approvalState !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const cleanPhone = String(order.phone || '').replace(/\s+/g, '');
        const cleanRip = String(order.baridiMobRip || '').replace(/\s+/g, '');
        const name = String(order.clientName || '').toLowerCase();
        const ticket = String(order.ticketNumber || order.id || '').toLowerCase();
        const tracking = String(order.trackingNumber || '').toLowerCase();
        const prod = String(order.product || '').toLowerCase();

        return (
          name.includes(q) ||
          cleanPhone.includes(q.replace(/\s+/g, '')) ||
          cleanRip.includes(q.replace(/\s+/g, '')) ||
          ticket.includes(q) ||
          tracking.includes(q) ||
          prod.includes(q)
        );
      }

      return true;
    });
  }, [allExchangeOrders, statusFilter, searchTerm]);

  // Handle Approve (Create Parcel & Send WhatsApp)
  const handleApprove = async (order) => {
    if (processingOrderId) return;
    setProcessingOrderId(order.id);

    try {
      showToast('⏳ جاري إنشاء كولي الاستبدال وإشعار الزبون عبر الواتساب...', 'info');

      const res = await fetch('/api/approve-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'approve'
        })
      });

      const data = await res.json();
      if (data && data.success) {
        showToast(`✅ تمت الموافقة بنجاح! تم إنشاء الشحنة برقم تتبع: ${data.trackingNumber}`, 'success');
        if (onUpdateStatus) {
          onUpdateStatus(order.id, 'confirmee');
        }
      } else {
        showToast(`⚠️ ${data.error || 'حدث خطأ أثناء الموافقة، يرجى المحاولة ثانية'}`, 'warning');
      }
    } catch (err) {
      console.error('Error approving exchange:', err);
      showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectionModalOrder || processingOrderId) return;
    const order = rejectionModalOrder;
    setProcessingOrderId(order.id);

    try {
      showToast('⏳ جاري تسجيل رفض الطلب وإشعار الزبون...', 'info');

      const res = await fetch('/api/approve-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'reject',
          reason: rejectionReason
        })
      });

      const data = await res.json();
      if (data && data.success) {
        showToast('تم رفض طلب الاستبدال وتحديث الحالة بنجاح', 'info');
        if (onUpdateStatus) {
          onUpdateStatus(order.id, 'annulee');
        }
      } else {
        showToast(`⚠️ ${data.error || 'حدث خطأ أثناء معالجة الرفض'}`, 'warning');
      }
    } catch (err) {
      console.error('Error rejecting exchange:', err);
      showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
      setProcessingOrderId(null);
      setRejectionModalOrder(null);
    }
  };

  const copyToClipboard = (text, label = 'النص') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`✅ تم نسخ ${label} بنجاح!`, 'success');
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div 
          onClick={() => setStatusFilter('pending')}
          style={{
            background: statusFilter === 'pending' ? '#FEF3C7' : '#FFFFFF',
            border: statusFilter === 'pending' ? '2px solid #D97706' : '1px solid #E2E8F0',
            borderRadius: '18px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400E' }}>في انتظار القرار ⏳</span>
            <span style={{
              background: '#FDE68A',
              color: '#B45309',
              padding: '2px 8px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 900
            }}>جديدة</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#B45309' }}>{counts.pending}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          style={{
            background: statusFilter === 'approved' ? '#DCFCE7' : '#FFFFFF',
            border: statusFilter === 'approved' ? '2px solid #16A34A' : '1px solid #E2E8F0',
            borderRadius: '18px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>مقبولة وتم الشحن 🚚</span>
            <CheckCircle2 size={18} color="#16A34A" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803D' }}>{counts.approved}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('rejected')}
          style={{
            background: statusFilter === 'rejected' ? '#FEE2E2' : '#FFFFFF',
            border: statusFilter === 'rejected' ? '2px solid #DC2626' : '1px solid #E2E8F0',
            borderRadius: '18px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991B1B' }}>المرفوضة ❌</span>
            <XCircle size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#B91C1C' }}>{counts.rejected}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('all')}
          style={{
            background: statusFilter === 'all' ? '#F1F5F9' : '#FFFFFF',
            border: statusFilter === 'all' ? '2px solid #64748B' : '1px solid #E2E8F0',
            borderRadius: '18px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>إجمالي الطلبات 📦</span>
            <Package size={18} color="#64748B" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1E293B' }}>{counts.total}</div>
        </div>
      </div>

      {/* Search Bar & Filters Switcher */}
      <div style={{
        background: '#FFF',
        borderRadius: '20px',
        padding: '16px 20px',
        marginBottom: '24px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الزبون، رقم الهاتف، كود التتبع، أو رقم الطلبية..."
            style={{
              width: '100%',
              padding: '12px 42px 12px 36px',
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              fontSize: '0.92rem',
              outline: 'none',
              background: '#F8FAFC',
              fontWeight: 700,
              boxSizing: 'border-box'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Segmented Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '14px' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'pending' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'pending' ? '#B45309' : '#64748B',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'pending' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            قيد الانتظار ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'approved' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'approved' ? '#15803D' : '#64748B',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'approved' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            المقبولة ({counts.approved})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'rejected' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'rejected' ? '#B91C1C' : '#64748B',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'rejected' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            المرفوضة ({counts.rejected})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'all' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'all' ? '#1E293B' : '#64748B',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            الكل ({counts.total})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div style={{
          background: '#FFF',
          borderRadius: '24px',
          padding: '60px 20px',
          textAlign: 'center',
          border: '1.5px dashed #CBD5E1',
          color: '#64748B'
        }}>
          <ArrowRightLeft size={48} color="#CBD5E1" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
            لا توجد طلبات استبدال أو استرجاع مطابقة حالياً
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: 0 }}>
            {searchTerm ? 'جرّب تغيير كلمات البحث' : 'ستظهر الطلبات الجديدة هنا فور تقديمها من طرف الزبائن'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredOrders.map((order, idx) => {
            const rawPhone = String(order.phone || '').replace(/\D/g, '');
            const intlPhone = rawPhone.startsWith('213') ? rawPhone : (rawPhone.startsWith('0') ? '213' + rawPhone.slice(1) : '213' + rawPhone);
            const waLink = `https://wa.me/${intlPhone}`;

            const formattedRip = order.baridiMobRip.length === 20
              ? `${order.baridiMobRip.slice(0, 4)} ${order.baridiMobRip.slice(4, 8)} ${order.baridiMobRip.slice(8, 12)} ${order.baridiMobRip.slice(12, 16)} ${order.baridiMobRip.slice(16, 20)}`
              : order.baridiMobRip;

            const isProcessing = processingOrderId === order.id;

            return (
              <div 
                key={order.id || idx}
                style={{
                  background: '#FFF',
                  borderRadius: '24px',
                  border: order.approvalState === 'pending' ? '2px solid #FDE68A' : '1px solid #E2E8F0',
                  boxShadow: order.approvalState === 'pending' ? '0 8px 24px rgba(217, 119, 6, 0.08)' : '0 4px 14px rgba(0,0,0,0.02)',
                  overflow: 'hidden'
                }}
              >
                {/* Card Top Header */}
                <div style={{
                  padding: '16px 24px',
                  background: order.approvalState === 'pending' 
                    ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' 
                    : (order.approvalState === 'approved' ? '#F0FDF4' : '#FEF2F2'),
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      background: 'var(--burgundy-dark)',
                      color: '#FFF',
                      padding: '4px 12px',
                      borderRadius: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.88rem'
                    }}>
                      #{order.ticketNumber || order.id?.slice(0, 10) || 'ECH'}
                    </span>

                    <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#1E293B' }}>
                      {String(order.clientName || 'الزبون').replace(/\[.*?\]/g, '').trim()}
                    </h3>

                    {/* Quick WhatsApp & Call */}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="مراسلة الزبون عبر الواتساب"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#25D366',
                        color: '#FFF',
                        padding: '4px 12px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
                      }}
                    >
                      <MessageCircle size={14} />
                      <span>واتساب ({order.phone})</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.phone, 'رقم الهاتف')}
                      title="نسخ رقم الهاتف"
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <Copy size={13} color="#475569" />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {order.approvalState === 'pending' && (
                      <span style={{
                        background: '#FEF3C7',
                        color: '#B45309',
                        border: '1.5px solid #FCD34D',
                        padding: '6px 14px',
                        borderRadius: '12px',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Clock size={15} color="#D97706" />
                        <span>في انتظار قرار الموظف ⏳</span>
                      </span>
                    )}

                    {order.approvalState === 'approved' && (
                      <span style={{
                        background: '#DCFCE7',
                        color: '#15803D',
                        border: '1.5px solid #86EFAC',
                        padding: '6px 14px',
                        borderRadius: '12px',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <CheckCircle2 size={15} color="#16A34A" />
                        <span>مقبول وتم إنشاء الشحنة ✅ ({order.trackingNumber || 'قيد الشحن'})</span>
                      </span>
                    )}

                    {order.approvalState === 'rejected' && (
                      <span style={{
                        background: '#FEE2E2',
                        color: '#B91C1C',
                        border: '1.5px solid #FCA5A5',
                        padding: '6px 14px',
                        borderRadius: '12px',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <XCircle size={15} color="#DC2626" />
                        <span>طلب مرفوض ❌</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Main Body */}
                <div style={{ padding: '24px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    {/* COL 1: OLD PRODUCT TO RETURN */}
                    <div style={{
                      background: '#FFF7ED',
                      border: '1.5px solid #FFEDD5',
                      borderRadius: '18px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ background: '#FDBA74', color: '#9A3412', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 900 }}>
                            السلعة القديمة المُراد استرجاعها
                          </span>
                        </div>

                        <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800, color: '#9A3412' }}>
                          {order.oldTitle}
                        </h4>

                        <div style={{ fontSize: '0.86rem', color: '#7C2D12', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                          {order.oldBarcode && (
                            <div>
                              <span>كود بار السلعة: </span>
                              <strong style={{ fontFamily: 'monospace', background: '#FFF', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FED7AA' }}>
                                {order.oldBarcode}
                              </strong>
                            </div>
                          )}
                          <div>
                            <span>السعر الأصلي: </span>
                            <strong style={{ color: '#C2410C' }}>{order.oldPrice.toLocaleString('ar-DZ')} دج</strong>
                          </div>
                          <div>
                            <span>سبب الاستبدال: </span>
                            <strong style={{ color: '#B45309' }}>{order.reason}</strong>
                          </div>
                          {order.wilaya && (
                            <div>
                              <span>الوجهة: </span>
                              <strong>{order.wilaya} ({order.commune || ''})</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Photo Thumbnail */}
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#9A3412', display: 'block', marginBottom: '6px' }}>
                          📸 صورة السلعة المرفوعة من طرف الزبون:
                        </span>
                        {order.photo ? (
                          <div 
                            onClick={() => setSelectedPhotoModal(order.photo)}
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '140px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: '2px solid #FDBA74',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                            }}
                          >
                            <img 
                              src={order.photo} 
                              alt="صورة السلعة القديمة" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: '8px',
                              left: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              color: '#FFF',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <ZoomIn size={13} />
                              <span>انقر لتكبير ومعاينة الحالة</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            padding: '16px',
                            background: '#FFF',
                            borderRadius: '12px',
                            border: '1px dashed #FDBA74',
                            textAlign: 'center',
                            color: '#9A3412',
                            fontSize: '0.84rem',
                            fontWeight: 700
                          }}>
                            لم يتم إرفاق صورة مع هذا الطلب
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COL 2: NEW REPLACEMENT PRODUCTS */}
                    <div style={{
                      background: '#F0FDF4',
                      border: '1.5px solid #BBF7D0',
                      borderRadius: '18px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ background: '#86EFAC', color: '#14532D', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 900 }}>
                            السلع البديلة الجديدة المطلوبة
                          </span>
                        </div>

                        {order.replacementItems.length === 0 ? (
                          <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700, padding: '12px 0' }}>
                            {String(order.product || '').replace(/🔄 استبدال:\s*/, '')}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {order.replacementItems.map((item, itIdx) => (
                              <div 
                                key={itIdx}
                                style={{
                                  background: '#FFF',
                                  borderRadius: '12px',
                                  padding: '10px 14px',
                                  border: '1px solid #DCFCE7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {item.image && (
                                    <img 
                                      src={item.image} 
                                      alt={item.title} 
                                      style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                                    />
                                  )}
                                  <div>
                                    <strong style={{ fontSize: '0.92rem', color: '#1E293B', display: 'block' }}>
                                      {item.title}
                                    </strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                                      {item.color && (
                                        <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                          {item.color}
                                        </span>
                                      )}
                                      {item.size && (
                                        <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                          مقاس: {item.size}
                                        </span>
                                      )}
                                      <span>x{item.qty || 1}</span>
                                    </div>
                                    {item.barcode && (
                                      <div style={{ fontSize: '0.76rem', fontFamily: 'monospace', color: '#15803D', marginTop: '3px', fontWeight: 800 }}>
                                        CODE: {item.barcode}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ textAlign: 'left', fontWeight: 900, color: '#15803D', fontSize: '0.95rem' }}>
                                  {(Number(item.price || 0) * (item.qty || 1)).toLocaleString('ar-DZ')} دج
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delivery Mode & Company */}
                      <div style={{ marginTop: '16px', background: '#DCFCE7', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#166534', fontWeight: 800 }}>
                          <Truck size={16} />
                          <span>شركة الشحن: {order.deliveryCompany === 'yalidine' ? 'Yalidine Express' : 'ZR Express'}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 700 }}>
                          {order.deliveryMode || 'Livraison à domicile'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown & RIP (if any) */}
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>سعر السلعة القديمة</span>
                        <strong style={{ fontSize: '1rem', color: '#475569' }}>{order.oldPrice.toLocaleString('ar-DZ')} دج</strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>مصاريف التوصيل</span>
                        <strong style={{ fontSize: '1rem', color: '#475569' }}>{(Number(order.deliveryFee) || 500).toLocaleString('ar-DZ')} دج</strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>المبلغ الصافي للتحصيل (COD)</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--burgundy)', fontWeight: 900 }}>
                          {Number(order.price || order.totalPrice || 0).toLocaleString('ar-DZ')} دج
                        </strong>
                      </div>

                      {order.refundDue > 0 && (
                        <div style={{ background: '#DCFCE7', padding: '6px 14px', borderRadius: '12px', border: '1px solid #86EFAC' }}>
                          <span style={{ fontSize: '0.78rem', color: '#166534', display: 'block', fontWeight: 800 }}>فارق السعر المستحق للزبون 💳</span>
                          <strong style={{ fontSize: '1.1rem', color: '#15803D', fontWeight: 900 }}>
                            {order.refundDue.toLocaleString('ar-DZ')} دج
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* RIP Display if Refund Due */}
                    {order.baridiMobRip && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#FFF',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #86EFAC'
                      }}>
                        <CreditCard size={16} color="#15803D" />
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>BaridiMob RIP</span>
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.88rem', letterSpacing: '1px', color: '#0F172A', direction: 'ltr' }}>
                            {formattedRip}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(order.baridiMobRip, 'رقم الـ RIP')}
                          title="نسخ رقم الـ RIP"
                          style={{
                            background: '#F0FDF4',
                            border: '1px solid #86EFAC',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: '#15803D',
                            fontSize: '0.76rem',
                            fontWeight: 800
                          }}
                        >
                          نسخ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      {order.trackingNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>رقم التتبع:</span>
                          <strong style={{
                            fontFamily: 'monospace',
                            fontSize: '1rem',
                            background: '#F1F5F9',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            color: '#0F172A'
                          }}>
                            {order.trackingNumber}
                          </strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.trackingNumber, 'رقم التتبع')}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748B'
                            }}
                          >
                            <Copy size={15} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* DECISION BUTTONS FOR PENDING REQUESTS */}
                    {order.approvalState === 'pending' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setRejectionModalOrder(order)}
                          style={{
                            background: '#FFF',
                            color: '#DC2626',
                            border: '1.5px solid #FCA5A5',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <XCircle size={16} />
                          <span>رفض الطلب ❌</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(order)}
                          style={{
                            background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 24px',
                            fontWeight: 900,
                            fontSize: '0.92rem',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span>{isProcessing ? 'جاري إنشاء الشحنة...' : 'قبول وتأكيد الشحن الآن 🚚'}</span>
                        </button>
                      </div>
                    ) : order.approvalState === 'approved' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#15803D', fontWeight: 800, fontSize: '0.88rem' }}>
                          ✅ تم إرسال رسالة الموافقة وكود التتبع للزبون
                        </span>
                      </div>
                    ) : (
                      <div style={{ color: '#DC2626', fontWeight: 800, fontSize: '0.88rem' }}>
                        ❌ تم رفض هذا الطلب: {order.exchange_rejection_reason || 'غير مطابق'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: PHOTO LIGHTBOX ZOOM */}
      {selectedPhotoModal && (
        <div 
          onClick={() => setSelectedPhotoModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              position: 'relative',
              maxWidth: '850px',
              width: '100%',
              background: '#FFF',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '1rem', color: '#1E293B' }}>معاينة وفحص صورة السلعة بجودة كاملة</strong>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', maxHeight: '75vh', overflowY: 'auto' }}>
              <img 
                src={selectedPhotoModal} 
                alt="معاينة السلعة" 
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECTION CONFIRMATION WITH REASON */}
      {rejectionModalOrder && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div style={{
            background: '#FFF',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <XCircle size={32} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 900, color: '#1E293B', textAlign: 'center' }}>
              تأكيد رفض طلب الاستبدال
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
              سيتم إشعار الزبون ({rejectionModalOrder.clientName}) عبر الواتساب بالاعتذار وتوضيح سبب الرفض.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                سبب الرفض (يصل للزبون):
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none',
                  marginBottom: '8px'
                }}
              >
                <option value="السلعة غير مطابقة لشروط الاستبدال (مستعملة أو تالفة)">السلعة غير مطابقة لشروط الاستبدال (مستعملة أو تالفة)</option>
                <option value="انقضاء المدة المحددة لطلب الاستبدال (تجاوزت 4 أيام)">انقضاء المدة المحددة لطلب الاستبدال (تجاوزت 4 أيام)</option>
                <option value="الموديل البديل غير متوفر حالياً في المخزن">الموديل البديل غير متوفر حالياً في المخزن</option>
                <option value="البيانات المدخلة أو كود بار الطلبية الأصلية غير صحيحة">البيانات المدخلة أو كود بار الطلبية الأصلية غير صحيحة</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRejectionModalOrder(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                إلغاء والتراجع
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFF',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                تأكيد الرفض والإشعار ❌
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
