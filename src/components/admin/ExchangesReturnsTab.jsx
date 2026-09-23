import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowRightLeft,
  RotateCcw,
  Archive
} from 'lucide-react';
import { showToast } from '../../utils/toast';
import { supabase } from '../../lib/supabaseClient';

export default function ExchangesReturnsTab({ 
  orders = [], 
  products = [], 
  settings = {}, 
  onUpdateStatus, 
  mode = 'exchange', 
  onTabChange 
}) {
  const [internalMode, setInternalMode] = useState(mode);
  
  useEffect(() => {
    setInternalMode(mode);
  }, [mode]);

  const currentMode = onTabChange ? mode : internalMode;
  const isRetourMode = currentMode === 'retour';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'rejected'
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [rejectionModalOrder, setRejectionModalOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(isRetourMode ? 'السلعة غير مطابقة لشروط الاسترجاع' : 'السلعة غير مطابقة لشروط الاستبدال');
  const [istilamOverrides, setIstilamOverrides] = useState({});
  const [istilamFilter, setIstilamFilter] = useState('all'); // 'all' | 'received' | 'not_received'
  const [isSyncingCourier, setIsSyncingCourier] = useState(false);

  // Sync paid refund IDs from Ali's actions in real-time
  const [localPaidRefundIds, setLocalPaidRefundIds] = useState(() => {
    try {
      const saved = localStorage.getItem('pyjama_ali_paid_refunds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const handleRefundPaid = () => {
      try {
        const saved = localStorage.getItem('pyjama_ali_paid_refunds');
        if (saved) setLocalPaidRefundIds(JSON.parse(saved));
      } catch (err) {}
    };
    window.addEventListener('pyjama_order_refund_paid', handleRefundPaid);
    window.addEventListener('storage', handleRefundPaid);
    return () => {
      window.removeEventListener('pyjama_order_refund_paid', handleRefundPaid);
      window.removeEventListener('storage', handleRefundPaid);
    };
  }, []);

  // Sync tracking live from courier companies (Yalidine & ZR Express)
  const handleSyncCourierTracking = async () => {
    if (isSyncingCourier) return;
    setIsSyncingCourier(true);
    showToast('⏳ جاري فحص ومزامنة حالة طرود الاستبدال مع شركات التوصيل...', 'info');
    try {
      const res = await fetch('/api/track-shipments', { method: 'GET' });
      const data = await res.json();
      if (data && data.success) {
        showToast('✅ تم فحص وتحديث طرود الاستبدال مع شركات التوصيل بنجاح!', 'success');
      } else {
        showToast('✅ اكتمل الفحص مع شركات التوصيل', 'info');
      }
    } catch (e) {
      console.warn('Track shipments sync error:', e);
      showToast('تعذر الاتصال بخدمة التتبع حالياً', 'warning');
    } finally {
      setIsSyncingCourier(false);
    }
  };

  // Helper: Detect pure return order
  const isOrderRetour = (order) => {
    if (!order) return false;
    if (order.isRetour === true || order.orderType === 'retour' || order.orderType === 'return') return true;
    if (order.exchangeDetails?.type === 'retour' || order.exchangeDetails?.isRetour === true) return true;
    if (Array.isArray(order.items) && order.items.some(it => it && (it.isRetour === true || it.isReturnMeta === true))) {
      return true;
    }
    const clientName = String(order.clientName || '').toLowerCase();
    const product = String(order.product || '').toLowerCase();
    if (clientName.includes('طلب استرجاع') || product.includes('طلب استرجاع') || product.includes('طلب إرجاع')) {
      return true;
    }
    return false;
  };

  // Helper: Detect pure exchange order
  const isOrderExchange = (order) => {
    if (!order) return false;
    if (isOrderRetour(order)) return false;
    if (order.isExchange === true || order.orderType === 'exchange') return true;
    const clientName = String(order.clientName || '').toLowerCase();
    const product = String(order.product || '').toLowerCase();
    if (clientName.includes('استبدال') || clientName.includes('تبديل') || clientName.includes('échange') || clientName.includes('echange')) {
      return true;
    }
    if (product.includes('استبدال') || product.includes('تبديل')) return true;
    if (order.exchangeDetails) return true;
    if (Array.isArray(order.items) && order.items.some(it => it && (it.isExchangeItem || it.isExchangeMeta))) return true;
    return false;
  };

  // Global pending counts for sub-tab badges
  const exchangePendingCount = useMemo(() => {
    return (orders || []).filter(order => {
      if (!isOrderExchange(order)) return false;
      const isApproved = order.exchangeStatus === 'approved' || (order.trackingNumber && order.status !== 'annulee');
      const isRejected = order.exchangeStatus === 'rejected' || order.status === 'annulee';
      return !isApproved && !isRejected;
    }).length;
  }, [orders]);

  const retourPendingCount = useMemo(() => {
    return (orders || []).filter(order => {
      if (!isOrderRetour(order)) return false;
      const isApproved = order.exchangeStatus === 'approved' || (order.trackingNumber && order.status !== 'annulee');
      const isRejected = order.exchangeStatus === 'rejected' || order.status === 'annulee';
      return !isApproved && !isRejected;
    }).length;
  }, [orders]);

  // Filter orders according to current active mode (strictly isolated)
  const allCurrentOrders = useMemo(() => {
    return (orders || []).filter(order => {
      return isRetourMode ? isOrderRetour(order) : isOrderExchange(order);
    }).map(order => {
      // Extract normalized metadata
      const meta = order.exchangeDetails || 
        (Array.isArray(order.items) ? order.items.find(it => it && it.isExchangeMeta) : null) || {};
      
      const replacementItems = Array.isArray(order.items) 
        ? order.items.filter(it => it && !it.isExchangeMeta && it.title)
        : [];

      const rawRip = String(meta.baridiMobRip || order.baridiMobRip || '').trim();

      const reasonText = String(meta.reason || order.reason || '').toLowerCase();
      const isDefect = Boolean(
        reasonText.includes('عيب') ||
        reasonText.includes('تصنيع') ||
        reasonText.includes('تمزق') ||
        reasonText.includes('مقطوع') ||
        reasonText.includes('مطاشي') ||
        reasonText.includes('طاشة') ||
        reasonText.includes('تالف') ||
        reasonText.includes('تلف') ||
        reasonText.includes('بالخطأ') ||
        reasonText.includes('défaut') ||
        reasonText.includes('defect') ||
        meta.isDefect === true ||
        order.isDefect === true
      );

      const oldProductPrice = Number(meta.oldProductPrice || order.price || order.totalPrice || 0);
      const deliveryFeeVal = isDefect ? 0 : (Number(meta.deliveryFee || order.deliveryFee) || 500);

      let refundDue = 0;
      if (isRetourMode) {
        const storedRefund = Number(meta.refundDue !== undefined ? meta.refundDue : (order.refundDue !== undefined ? order.refundDue : 0));
        if (storedRefund > 0 && storedRefund < oldProductPrice) {
          refundDue = storedRefund;
        } else {
          refundDue = isDefect ? oldProductPrice : Math.max(0, oldProductPrice - deliveryFeeVal);
        }
      } else {
        refundDue = Number(meta.refundDue || order.refundDue || 0);
      }

      // Determine approval status
      let approvalState = 'pending';
      if (order.exchangeStatus === 'approved' || (order.trackingNumber && order.status !== 'annulee')) {
        approvalState = 'approved';
      } else if (order.exchangeStatus === 'rejected' || order.status === 'annulee') {
        approvalState = 'rejected';
      }

      // Return parcel collected from courier by merchant detection
      const courierStatus = String(order.exchange_return_courier_status || order.yalidine_last_status || order.zrStatus || '').toLowerCase();
      const isCourierReceived = [
        'retourné au vendeur', 'retourne au vendeur',
        'livré au vendeur', 'livre au vendeur',
        'reçu par le vendeur', 'recu par le vendeur',
        'retour récupéré', 'retour recupere',
        'retour retiré', 'retour retire',
        'échange reçu', 'echange recu',
        'returned_to_merchant', 'received_by_merchant',
        'return_delivered_to_sender', 'return_collected',
        'colis récupéré par l\'expéditeur', 'colis recupere par l\'expediteur',
        'recupere_vendeur', 'retourne_au_vendeur', 'retour_recupere'
      ].some(s => courierStatus.includes(s));

      const localOverride = istilamOverrides[order.id];
      const isTamIstilam = localOverride !== undefined 
        ? localOverride 
        : Boolean(
            order.tam_istilam === true || 
            order.isExchangeParcelReceived === true || 
            meta.tam_istilam === true || 
            meta.isExchangeParcelReceived === true || 
            order.tam_istilam_at || 
            order.exchange_parcel_received_at || 
            meta.tam_istilam_at || 
            meta.exchange_parcel_received_at || 
            isCourierReceived
          );

      const orderKey = String(order.ticketNumber || order.id || '');
      const isRefundPaid = Boolean(
        localPaidRefundIds.includes(order.id) ||
        localPaidRefundIds.includes(order.ticketNumber) ||
        localPaidRefundIds.includes(orderKey) ||
        order.isRefundPaid === true ||
        meta.isRefundPaid === true ||
        order.is_refund_paid === true ||
        meta.is_refund_paid === true
      );

      const isArchived = Boolean(
        isRefundPaid ||
        order.isArchived === true ||
        order.archived === true ||
        meta.isArchived === true ||
        meta.archived === true
      );

      return {
        ...order,
        meta,
        isRetour: isRetourMode,
        isDefect,
        isRefundPaid,
        isArchived,
        refundPaidAt: meta.refund_paid_at || order.refund_paid_at || null,
        replacementItems,
        approvalState,
        refundDue,
        deliveryFee: deliveryFeeVal,
        baridiMobRip: rawRip,
        isTamIstilam,
        tamIstilamAt: order.tam_istilam_at || order.exchange_parcel_received_at || null,
        courierReturnStatus: courierStatus,
        photo: meta.productPhoto || order.productPhoto || null,
        oldTitle: meta.oldProductTitle || order.product || 'بيجامة',
        oldBarcode: meta.oldProductBarcode || '',
        oldPrice: oldProductPrice,
        reason: meta.reason || (isRetourMode ? 'طلب استرجاع المنتج واسترداد المبلغ' : 'تغيير المقاس أو الموديل')
      };
    }).sort((a, b) => {
      // Prioritize pending orders at top, then sort by date descending
      if (a.approvalState === 'pending' && b.approvalState !== 'pending') return -1;
      if (b.approvalState === 'pending' && a.approvalState !== 'pending') return 1;
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [orders, isRetourMode, localPaidRefundIds, istilamOverrides]);

  // Counts for current mode: isolates active vs archived orders
  const counts = useMemo(() => {
    const activeOrders = allCurrentOrders.filter(o => !o.isArchived);
    const archivedOrders = allCurrentOrders.filter(o => o.isArchived);
    const approvedOrders = activeOrders.filter(o => o.approvalState === 'approved');

    return {
      total: activeOrders.length,
      pending: activeOrders.filter(o => o.approvalState === 'pending').length,
      approved: approvedOrders.length,
      approvedReceived: approvedOrders.filter(o => o.isTamIstilam).length,
      approvedNotReceived: approvedOrders.filter(o => !o.isTamIstilam).length,
      rejected: activeOrders.filter(o => o.approvalState === 'rejected').length,
      archived: archivedOrders.length
    };
  }, [allCurrentOrders]);

  // Filtered list according to tab, istilam, archive status & search
  const filteredOrders = useMemo(() => {
    return allCurrentOrders.filter(order => {
      // If user is in the Archive tab, strictly show ONLY archived/completed orders!
      if (statusFilter === 'archived') {
        if (!order.isArchived) return false;
      } else {
        // In all regular active tabs, strictly HIDE archived orders!
        if (order.isArchived) return false;

        // Status filter
        if (statusFilter !== 'all' && order.approvalState !== statusFilter) {
          return false;
        }

        // Istilam filter for approved orders
        if (istilamFilter === 'received') {
          if (order.approvalState !== 'approved' || !order.isTamIstilam) return false;
        } else if (istilamFilter === 'not_received') {
          if (order.approvalState !== 'approved' || order.isTamIstilam) return false;
        }
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
  }, [allCurrentOrders, statusFilter, istilamFilter, searchTerm]);

  // Handle Archive / Transfer Confirmation directly from Admin
  const handleToggleArchiveOrder = async (order) => {
    const willBeArchived = !order.isArchived;
    const orderKey = order.id;

    // Instant local state update
    setLocalPaidRefundIds(prev => {
      const next = willBeArchived 
        ? [...prev, orderKey, order.ticketNumber].filter(Boolean) 
        : prev.filter(id => id !== orderKey && id !== order.ticketNumber);
      try {
        localStorage.setItem('pyjama_ali_paid_refunds', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      const updatedDetails = {
        ...(order.meta || order.exchangeDetails || {}),
        isRefundPaid: willBeArchived,
        isArchived: willBeArchived,
        archived: willBeArchived,
        refund_paid_at: willBeArchived ? new Date().toISOString() : null
      };

      await supabase.from('orders').update({
        exchangeDetails: updatedDetails,
        isRefundPaid: willBeArchived,
        isArchived: willBeArchived,
        archived: willBeArchived
      }).eq('id', order.id);

      window.dispatchEvent(new CustomEvent('pyjama_order_refund_paid', {
        detail: {
          orderId: order.id,
          ticketNumber: order.ticketNumber,
          willBePaid: willBeArchived
        }
      }));

      showToast(
        willBeArchived
          ? '✅ تم تأكيد التحويل ونقل الطلب فوراً إلى الأرشيف والمكتملة (L\'Historique)!'
          : '↩️ تم إلغاء الأرشفة وإعادة الطلب إلى القائمة النشطة بنجاح',
        'info'
      );
    } catch (err) {
      console.error('Error toggling archive status:', err);
      showToast('حدث خطأ أثناء تحديث حالة الأرشفة', 'error');
    }
  };

  // Handle Approve (Create Parcel & Send WhatsApp)
  const handleApprove = async (order) => {
    if (processingOrderId) return;
    setProcessingOrderId(order.id);

    try {
      const isRet = isRetourMode || order.isRetour;
      showToast(isRet ? '⏳ جاري تأكيد قبول الاسترجاع وإشعار الزبون...' : '⏳ جاري إنشاء كولي الاستبدال وإشعار الزبون عبر الواتساب...', 'info');

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
        showToast(isRet ? `✅ تم قبول الاسترجاع وتحديث الحالة بنجاح!` : `✅ تمت الموافقة بنجاح! تم إنشاء الشحنة برقم تتبع: ${data.trackingNumber}`, 'success');
        if (onUpdateStatus) {
          onUpdateStatus(order.id, 'confirmee');
        }
      } else {
        showToast(`⚠️ ${data.error || 'حدث خطأ أثناء المعالجة، يرجى المحاولة ثانية'}`, 'warning');
      }
    } catch (err) {
      console.error('Error approving exchange/return:', err);
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

  // Handle Confirm Istilam (Manual receipt confirmation for returns & exchanges - One-way irreversible)
  const handleToggleIstilam = async (order) => {
    if (processingOrderId) return;
    if (order.isTamIstilam) {
      showToast('⚠️ لا يمكن إلغاء الاستلام بعد تأكيده (الحالة نهائية)', 'warning');
      return;
    }
    setProcessingOrderId(order.id);
    const newIstilamState = true;

    // Instant optimistic UI update
    setIstilamOverrides(prev => ({ ...prev, [order.id]: true }));

    try {
      showToast('⏳ جاري تسجيل استلام الطرد في المحل...', 'info');

      const updatedItems = Array.isArray(order.items) ? [...order.items] : [];
      const metaIdx = updatedItems.findIndex(it => it && (it.isExchangeMeta || it.isReturnMeta));
      const nowIso = new Date().toISOString();
      if (metaIdx >= 0) {
        updatedItems[metaIdx] = {
          ...updatedItems[metaIdx],
          tam_istilam: newIstilamState,
          isExchangeParcelReceived: newIstilamState,
          tam_istilam_at: newIstilamState ? nowIso : null,
          exchange_parcel_received_at: newIstilamState ? nowIso : null
        };
      } else {
        updatedItems.push({
          isExchangeMeta: true,
          tam_istilam: newIstilamState,
          isExchangeParcelReceived: newIstilamState,
          tam_istilam_at: newIstilamState ? nowIso : null,
          exchange_parcel_received_at: newIstilamState ? nowIso : null
        });
      }

      const { error } = await supabase
        .from('orders')
        .update({
          items: updatedItems
        })
        .eq('id', order.id);

      if (error) {
        // Rollback on error
        setIstilamOverrides(prev => ({ ...prev, [order.id]: !newIstilamState }));
        throw error;
      }

      showToast('🟢 تم تأكيد استلام الطرد بنجاح في المحل / المخزن!', 'success');
      
      if (onUpdateStatus) {
        onUpdateStatus(order.id, order.status);
      }
    } catch (err) {
      console.error('Error toggling istilam:', err);
      showToast('حدث خطأ أثناء تحديث حالة الاستلام', 'error');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const copyToClipboard = (text, label = 'النص') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`✅ تم نسخ ${label} بنجاح!`, 'success');
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Sub-tabs Switcher (Exchanges vs Retours) */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '22px',
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: '14px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => {
            if (onTabChange) onTabChange('exchanges');
            setInternalMode('exchange');
          }}
          style={{
            padding: '12px 24px',
            borderRadius: '14px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.96rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: !isRetourMode ? 'var(--burgundy)' : '#F1F5F9',
            color: !isRetourMode ? '#FFF' : '#64748B',
            boxShadow: !isRetourMode ? '0 4px 14px rgba(107, 29, 47, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <ArrowRightLeft size={18} />
          <span>طلبات الاستبدال (Échanges)</span>
          {exchangePendingCount > 0 && (
            <span style={{
              background: !isRetourMode ? '#F59E0B' : '#EF4444',
              color: '#FFF',
              fontSize: '0.78rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {exchangePendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            if (onTabChange) onTabChange('retours');
            setInternalMode('retour');
          }}
          style={{
            padding: '12px 24px',
            borderRadius: '14px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.96rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: isRetourMode ? '#B91C1C' : '#F1F5F9',
            color: isRetourMode ? '#FFF' : '#64748B',
            boxShadow: isRetourMode ? '0 4px 14px rgba(185, 28, 28, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <RotateCcw size={18} />
          <span>طلبات الاسترجاع (Retours & Remboursements)</span>
          {retourPendingCount > 0 && (
            <span style={{
              background: isRetourMode ? '#F59E0B' : '#EF4444',
              color: '#FFF',
              fontSize: '0.78rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {retourPendingCount}
            </span>
          )}
        </button>
      </div>

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
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400E' }}>
              {isRetourMode ? 'في انتظار موافقة الاسترجاع ⏳' : 'في انتظار موافقة الاستبدال ⏳'}
            </span>
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
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
              {isRetourMode ? 'استرجاع مقبول ومؤكد 🚚' : 'استبدال مقبول وتم الشحن 🚚'}
            </span>
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
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991B1B' }}>
              {isRetourMode ? 'استرجاع مرفوض ❌' : 'استبدال مرفوض ❌'}
            </span>
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
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
              {isRetourMode ? 'إجمالي طلبات الاسترجاع 📦' : 'إجمالي طلبات الاستبدال 📦'}
            </span>
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
              boxShadow: statusFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            النشطة ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('approved');
              setIstilamFilter('all');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'approved' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'approved' ? '#15803D' : '#64748B',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'approved' ? '0 2px 6px rgba(21, 128, 61, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            المقبولة ({counts.approved})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('pending');
              setIstilamFilter('all');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'pending' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'pending' ? '#B45309' : '#64748B',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'pending' ? '0 2px 6px rgba(180, 83, 9, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            قيد الانتظار ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('rejected');
              setIstilamFilter('all');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'rejected' ? '#FFFFFF' : 'transparent',
              color: statusFilter === 'rejected' ? '#B91C1C' : '#64748B',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'rejected' ? '0 2px 6px rgba(185, 28, 28, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            المرفوضة ({counts.rejected})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('archived');
              setIstilamFilter('all');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: statusFilter === 'archived' ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : '#ECFDF5',
              color: statusFilter === 'archived' ? '#FFFFFF' : '#047857',
              fontWeight: 900,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: statusFilter === 'archived' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Archive size={15} />
            <span>الأرشيف والمكتملة ({counts.archived}) 📁</span>
          </button>
        </div>

        {/* Sub-filter specifically for Approved Orders (Only appears when statusFilter === 'approved') */}
        {statusFilter === 'approved' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            width: '100%',
            paddingTop: '14px',
            borderTop: '1px solid #F1F5F9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span>📦 فرز حسب الاستلام:</span>
              </span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setIstilamFilter('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: istilamFilter === 'all' ? '#0F172A' : 'transparent',
                    color: istilamFilter === 'all' ? '#FFFFFF' : '#64748B',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: istilamFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  كافة المقبولة ({counts.approved})
                </button>

                <button
                  type="button"
                  onClick={() => setIstilamFilter('received')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: istilamFilter === 'received' ? '#15803D' : 'transparent',
                    color: istilamFilter === 'received' ? '#FFFFFF' : '#15803D',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: istilamFilter === 'received' ? '0 2px 8px rgba(21, 128, 61, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🟢</span>
                  <span>تم الاستلام ({counts.approvedReceived})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIstilamFilter('not_received')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: istilamFilter === 'not_received' ? '#DC2626' : 'transparent',
                    color: istilamFilter === 'not_received' ? '#FFFFFF' : '#DC2626',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: istilamFilter === 'not_received' ? '0 2px 8px rgba(220, 38, 38, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🔴</span>
                  <span>في الطريق (لم يتم الاستلام) ({counts.approvedNotReceived})</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={isSyncingCourier}
                onClick={handleSyncCourierTracking}
                title="تحديث ومزامنة حالة طرود الاستبدال مع منصات Yalidine و ZR Express"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#EFF6FF',
                  border: '1.5px solid #BFDBFE',
                  color: '#1D4ED8',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: isSyncingCourier ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <RefreshCw size={14} className={isSyncingCourier ? 'spin' : ''} />
                <span>{isSyncingCourier ? 'جاري الفحص...' : 'تحديث التتبع من شركات التوصيل 🔄'}</span>
              </button>

              {istilamFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setIstilamFilter('all')}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء الفرز (عرض الكل) ↩️
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Historique Header Banner */}
      {statusFilter === 'archived' && (
        <div style={{
          background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
          border: '1.5px solid #86EFAC',
          borderRadius: '20px',
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 4px 16px rgba(22, 101, 52, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)'
            }}>
              <Archive size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900, color: '#14532D' }}>
                سجل الأرشيف والطلبات المكتملة (L'Historique) 📁
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                هنا تجد جميع الطلبات التي تم استلام طرودها في المحل وتأكيد تحويل مستحقاتها عبر بريدي موب بنجاح.
              </p>
            </div>
          </div>

          <div style={{
            background: '#15803D',
            color: '#FFFFFF',
            padding: '8px 18px',
            borderRadius: '12px',
            fontWeight: 900,
            fontSize: '0.92rem',
            boxShadow: '0 2px 8px rgba(21, 128, 61, 0.2)'
          }}>
            {counts.archived} طلب مكتمل ومؤرشف
          </div>
        </div>
      )}

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
          {statusFilter === 'archived' ? (
            <>
              <Archive size={48} color="#86EFAC" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
                لا توجد طلبات مؤرشفة أو مكتملة بعد 📁
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: 0 }}>
                {searchTerm ? 'جرّب البحث برقم هاتف أو رقم RIP آخر' : 'عند تأكيد استلام الطرود وتحويل المبالغ للزبائن، ستنتقل الطلبات تلقائياً إلى هذا السجل.'}
              </p>
            </>
          ) : (
            <>
              <ArrowRightLeft size={48} color="#CBD5E1" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
                لا توجد طلبات استبدال أو استرجاع نشطة حالياً
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: 0 }}>
                {searchTerm ? 'جرّب تغيير كلمات البحث' : 'ستظهر الطلبات الجديدة هنا فور تقديمها من طرف الزبائن'}
              </p>
            </>
          )}
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
            const isApproved = order.approvalState === 'approved';
            const isPending = order.approvalState === 'pending';
            const isRejected = order.approvalState === 'rejected';

            // User Rule: Received = Green, In Transit / Not Received = Red
            let cardBorder = '1px solid #E2E8F0';
            let cardShadow = '0 4px 14px rgba(0,0,0,0.02)';
            let headerBg = '#F8FAFC';

            if (order.isArchived) {
              cardBorder = '2px solid #86EFAC';
              cardShadow = '0 6px 20px rgba(22, 163, 74, 0.08)';
              headerBg = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)';
            } else if (isApproved) {
              if (order.isTamIstilam) {
                // 🟢 GREEN for Received
                cardBorder = '2.5px solid #16A34A';
                cardShadow = '0 6px 22px rgba(220, 38, 38, 0.15)';
                cardShadow = '0 6px 22px rgba(22, 163, 74, 0.15)';
                headerBg = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)';
              } else {
                // 🔴 RED for In transit / not yet received
                cardBorder = '2.5px solid #DC2626';
                cardShadow = '0 6px 22px rgba(220, 38, 38, 0.15)';
                headerBg = 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)';
              }
            } else if (isPending) {
              cardBorder = '2px solid #FDE68A';
              cardShadow = '0 8px 24px rgba(217, 119, 6, 0.08)';
              headerBg = 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)';
            } else if (isRejected) {
              cardBorder = '1.5px solid #FCA5A5';
              headerBg = '#FEF2F2';
            }

            return (
              <div 
                key={order.id || idx}
                style={{
                  background: '#FFF',
                  borderRadius: '24px',
                  border: cardBorder,
                  boxShadow: cardShadow,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Archive Top Ribbon if Archived */}
                {order.isArchived && (
                  <div style={{
                    background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                    color: '#FFFFFF',
                    padding: '8px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.84rem',
                    fontWeight: 900
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} />
                      <span>طلب مؤرشف ومكتمل — تم استلام الطرد في المحل وتأكيد تحويل المستحقات عبر بريدي موب 💳✨</span>
                    </span>
                    {order.refundPaidAt && (
                      <span style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '6px' }}>
                        {new Date(order.refundPaidAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}

                {/* Card Top Header */}
                <div style={{
                  padding: '16px 24px',
                  background: headerBg,
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

                  {/* Status Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {isApproved && (
                      <>
                        {/* Primary Receipt Status: Green if received, Red if in transit */}
                        {order.isTamIstilam ? (
                          <span style={{
                            background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                            color: '#FFFFFF',
                            padding: '6px 14px',
                            borderRadius: '12px',
                            fontWeight: 900,
                            fontSize: '0.84rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(21, 128, 61, 0.25)'
                          }}>
                            <CheckCircle2 size={16} color="#FFFFFF" />
                            <span>🟢 تم الاستلام (المحل / المخزن) ✅</span>
                            {order.tamIstilamAt && (
                              <span style={{ fontSize: '0.72rem', opacity: 0.9, background: 'rgba(0,0,0,0.15)', padding: '2px 6px', borderRadius: '6px' }}>
                                {new Date(order.tamIstilamAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{
                            background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                            color: '#FFFFFF',
                            padding: '6px 14px',
                            borderRadius: '12px',
                            fontWeight: 900,
                            fontSize: '0.84rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                          }}>
                            <Clock size={16} color="#FFFFFF" />
                            <span>🔴 في الطريق (لم يتم الاستلام بعد) ⏳</span>
                          </span>
                        )}

                        {/* Approval Tag with Tracking Code */}
                        <span style={{
                          background: '#FFFFFF',
                          color: '#0F172A',
                          border: '1.5px solid #CBD5E1',
                          padding: '5px 12px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <CheckCircle2 size={14} color="#16A34A" />
                          <span>طلب مقبول {order.trackingNumber ? `(${order.trackingNumber})` : ''}</span>
                        </span>
                      </>
                    )}

                    {isPending && (
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

                    {isRejected && (
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

                    {/* COL 2: NEW REPLACEMENT PRODUCTS OR RETURN REFUND DETAILS */}
                    {isRetourMode ? (
                      <div style={{
                        background: '#EFF6FF',
                        border: '1.5px solid #BFDBFE',
                        borderRadius: '18px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ background: '#2563EB', color: '#FFF', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 900 }}>
                              بيانات استرجاع المبلغ والحساب
                            </span>
                          </div>

                          <div style={{ background: '#FFF', padding: '14px', borderRadius: '14px', border: '1px solid #DBEAFE', marginBottom: '14px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#1E40AF', display: 'block', fontWeight: 700, marginBottom: '4px' }}>
                              المبلغ المستحق للزبون (Remboursement):
                            </span>
                            <strong style={{ fontSize: '1.4rem', color: '#1E3A8A', fontWeight: 900 }}>
                              {Number(order.refundDue || order.price || order.totalPrice || 0).toLocaleString('ar-DZ')} دج
                            </strong>
                          </div>

                          {order.baridiMobRip ? (
                            <div style={{ background: '#FFF', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #86EFAC' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 800 }}>حساب بريدي موب (RIP):</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(order.baridiMobRip, 'رقم الـ RIP')}
                                  style={{
                                    background: '#DCFCE7',
                                    border: '1px solid #86EFAC',
                                    color: '#15803D',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  نسخ الـ RIP 📋
                                </button>
                              </div>
                              <strong style={{ fontFamily: 'monospace', fontSize: '0.96rem', letterSpacing: '1px', color: '#0F172A', direction: 'ltr', display: 'block' }}>
                                {formattedRip}
                              </strong>
                            </div>
                          ) : (
                            <div style={{ padding: '12px', background: '#FFF', borderRadius: '12px', border: '1px dashed #93C5FD', color: '#1E40AF', fontSize: '0.84rem', fontWeight: 700 }}>
                              لم يتم تسجيل رقم RIP بريدي موب بعد
                            </div>
                          )}
                        </div>

                        {/* Delivery Status */}
                        <div style={{ marginTop: '16px', background: '#DBEAFE', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#1E40AF', fontWeight: 800 }}>
                            <Truck size={16} />
                            <span>شركة الشحن: {order.deliveryCompany === 'yalidine' ? 'Yalidine Express' : 'ZR Express'}</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#1D4ED8', fontWeight: 700 }}>
                            {order.yalidine_last_status || order.status === 'retour' ? 'طرد مرتجع 📦' : (order.deliveryMode || 'Livraison à domicile')}
                          </span>
                        </div>
                      </div>
                    ) : (
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
                    )}
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
                        <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>
                          مصاريف التوصيل {order.isDefect ? '🛡️ (على المحل)' : (isRetourMode ? '🚚 (مخصومة من المسترد)' : '🚚 (على الزبون)')}
                        </span>
                        <strong style={{ 
                          fontSize: '1rem', 
                          color: order.isDefect ? '#059669' : (isRetourMode ? '#D97706' : '#475569'),
                          fontWeight: 800
                        }}>
                          {order.isDefect ? '0 دج (مجاني - عيب مصنعي) 🛡️' : `${(Number(order.deliveryFee) || 500).toLocaleString('ar-DZ')} دج (${isRetourMode ? 'مخصومة من المسترد' : 'على الزبون'})`}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>المبلغ الصافي للتحصيل (COD)</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--burgundy)', fontWeight: 900 }}>
                          {isRetourMode ? '0 دج (استرجاع - بدون تحصيل)' : `${Number(order.price || order.totalPrice || 0).toLocaleString('ar-DZ')} دج`}
                        </strong>
                      </div>

                      {order.refundDue > 0 && (
                        <div style={{ background: '#DCFCE7', padding: '6px 14px', borderRadius: '12px', border: '1px solid #86EFAC' }}>
                          <span style={{ fontSize: '0.78rem', color: '#166534', display: 'block', fontWeight: 800 }}>
                            {isRetourMode ? 'المبلغ المسترد للزبون عبر بريدي موب 💳' : 'فارق السعر المستحق للزبون 💳'}
                          </span>
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
                          <span>
                            {isProcessing 
                              ? (isRetourMode ? 'جاري تأكيد الاسترجاع...' : 'جاري إنشاء الشحنة...') 
                              : (isRetourMode ? 'قبول وتأكيد الاسترجاع ✅' : 'قبول وتأكيد الشحن الآن 🚚')}
                          </span>
                        </button>
                      </div>
                    ) : order.approvalState === 'approved' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                        {/* Status Label & Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: order.isTamIstilam ? '#DCFCE7' : '#FEE2E2',
                            color: order.isTamIstilam ? '#166534' : '#991B1B',
                            border: order.isTamIstilam ? '1.5px solid #86EFAC' : '1.5px solid #FCA5A5',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontWeight: 900,
                            fontSize: '0.88rem'
                          }}>
                            <span>{order.isTamIstilam ? '🟢' : '🔴'}</span>
                            <span>
                              {order.isTamIstilam 
                                ? (isRetourMode ? 'تم استلام طرد الاسترجاع في المحل بنجاح' : 'تم استلام طرد الاستبدال من شركة التوصيل') 
                                : (isRetourMode ? 'طرد الاسترجاع في الطريق (لم يتم الاستلام بالمحل بعد)' : 'طرد الاستبدال مع شركة التوصيل (لم يتم الاستلام بالمحل بعد)')}
                            </span>
                          </span>
                        </div>

                        {/* Action Toggle Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {!order.isTamIstilam ? (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleToggleIstilam(order)}
                              style={{
                                background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                                color: '#FFF',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '10px 22px',
                                fontWeight: 900,
                                fontSize: '0.92rem',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <CheckCircle2 size={18} />
                              <span>{isProcessing ? 'جاري التسجيل...' : 'تأكيد استلام الطرد في المحل (تم الاستلام) 🟢'}</span>
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <div
                                style={{
                                  background: '#F0FDF4',
                                  color: '#166534',
                                  border: '1.5px solid #86EFAC',
                                  borderRadius: '12px',
                                  padding: '8px 16px',
                                  fontWeight: 900,
                                  fontSize: '0.86rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  userSelect: 'none'
                                }}
                              >
                                <CheckCircle2 size={16} color="#16A34A" />
                                <span>تم استلام الطرد نهائياً بالمحل 📦</span>
                              </div>

                              {/* Archive / Transfer Confirmation Actions */}
                              {order.isArchived ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchiveOrder(order)}
                                  title="إلغاء الأرشفة وإعادة الطلب للقائمة النشطة"
                                  style={{
                                    border: '1.5px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    color: '#475569',
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    fontSize: '0.84rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
                                >
                                  <RotateCcw size={14} />
                                  <span>إلغاء الأرشفة (إعادة للنشطة) ↩️</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchiveOrder(order)}
                                  title="تأكيد التحويل ونقل العملية فوراً إلى سجل الأرشيف"
                                  style={{
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
                                    color: '#FFFFFF',
                                    padding: '9px 18px',
                                    borderRadius: '12px',
                                    fontSize: '0.86rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(180, 83, 9, 0.25)',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <CreditCard size={15} />
                                  <span>تأكيد التحويل والأرشفة (L'Historique) 💳📁</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
              {isRetourMode ? 'تأكيد رفض طلب الاسترجاع' : 'تأكيد رفض طلب الاستبدال'}
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
                {isRetourMode ? (
                  <>
                    <option value="السلعة غير مطابقة لشروط الاسترجاع (مستعملة، مغسولة، أو تالفة)">السلعة غير مطابقة لشروط الاسترجاع (مستعملة، مغسولة، أو تالفة)</option>
                    <option value="انقضاء المدة المحددة لطلب الاسترجاع (تجاوزت 4 أيام من الاستلام)">انقضاء المدة المحددة لطلب الاسترجاع (تجاوزت 4 أيام من الاستلام)</option>
                    <option value="رقم الحساب البريدي RIP المدخل غير صحيح أو غير مطابق">رقم الحساب البريدي RIP المدخل غير صحيح أو غير مطابق</option>
                    <option value="بيانات الطلبية الأصلية غير متطابقة مع السجلات">بيانات الطلبية الأصلية غير متطابقة مع السجلات</option>
                  </>
                ) : (
                  <>
                    <option value="السلعة غير مطابقة لشروط الاستبدال (مستعملة أو تالفة)">السلعة غير مطابقة لشروط الاستبدال (مستعملة أو تالفة)</option>
                    <option value="انقضاء المدة المحددة لطلب الاستبدال (تجاوزت 4 أيام)">انقضاء المدة المحددة لطلب الاستبدال (تجاوزت 4 أيام)</option>
                    <option value="الموديل البديل غير متوفر حالياً في المخزن">الموديل البديل غير متوفر حالياً في المخزن</option>
                    <option value="البيانات المدخلة أو كود بار الطلبية الأصلية غير صحيحة">البيانات المدخلة أو كود بار الطلبية الأصلية غير صحيحة</option>
                  </>
                )}
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
