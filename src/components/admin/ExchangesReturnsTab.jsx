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
import ExchangeOrderCard from './ExchangeOrderCard';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'rejected' | 'archived'
  const [archiveSection, setArchiveSection] = useState('all'); // 'all' | 'retours' | 'exchanges'

  const isArchiveMode = internalMode === 'archived' || statusFilter === 'archived';
  const currentMode = isArchiveMode ? 'archived' : (internalMode === 'retour' || (onTabChange && mode === 'retour') ? 'retour' : 'exchange');
  const isRetourMode = currentMode === 'retour';

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

  // Process and normalize ALL exchange and retour orders
  const allNormalizedOrders = useMemo(() => {
    return (orders || []).filter(order => isOrderRetour(order) || isOrderExchange(order)).map(order => {
      const isRet = isOrderRetour(order);
      const isExch = !isRet;

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
      if (isRet) {
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
        isRetour: isRet,
        isExchange: isExch,
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
        reason: meta.reason || (isRet ? 'طلب استرجاع المنتج واسترداد المبلغ' : 'تغيير المقاس أو الموديل')
      };
    }).sort((a, b) => {
      // Prioritize pending orders at top, then sort by date descending
      if (a.approvalState === 'pending' && b.approvalState !== 'pending') return -1;
      if (b.approvalState === 'pending' && a.approvalState !== 'pending') return 1;
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [orders, localPaidRefundIds, istilamOverrides]);

  // All Archived Orders
  const allArchivedOrders = useMemo(() => {
    return allNormalizedOrders.filter(o => o.isArchived);
  }, [allNormalizedOrders]);

  const archivedRetours = useMemo(() => {
    return allArchivedOrders.filter(o => o.isRetour);
  }, [allArchivedOrders]);

  const archivedExchanges = useMemo(() => {
    return allArchivedOrders.filter(o => o.isExchange);
  }, [allArchivedOrders]);

  const totalArchivedRefundAmount = useMemo(() => {
    return archivedRetours.reduce((sum, o) => sum + (Number(o.refundDue) || 0), 0);
  }, [archivedRetours]);

  // Counts for current active mode: isolates active vs archived orders
  const counts = useMemo(() => {
    const list = isRetourMode 
      ? allNormalizedOrders.filter(o => !o.isArchived && o.isRetour)
      : allNormalizedOrders.filter(o => !o.isArchived && o.isExchange);

    const approvedList = list.filter(o => o.approvalState === 'approved');

    return {
      total: list.length,
      pending: list.filter(o => o.approvalState === 'pending').length,
      approved: approvedList.length,
      approvedReceived: approvedList.filter(o => o.isTamIstilam).length,
      approvedNotReceived: approvedList.filter(o => !o.isTamIstilam).length,
      rejected: list.filter(o => o.approvalState === 'rejected').length,
      archived: allArchivedOrders.length
    };
  }, [allNormalizedOrders, allArchivedOrders.length, isRetourMode]);

  // Search filter helper
  const filterBySearch = (list) => {
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    const cleanQ = q.replace(/\s+/g, '');
    return list.filter(order => {
      const cleanPhone = String(order.phone || '').replace(/\s+/g, '');
      const cleanRip = String(order.baridiMobRip || '').replace(/\s+/g, '');
      const name = String(order.clientName || '').toLowerCase();
      const ticket = String(order.ticketNumber || order.id || '').toLowerCase();
      const tracking = String(order.trackingNumber || '').toLowerCase();
      const prod = String(order.product || '').toLowerCase();

      return (
        name.includes(q) ||
        cleanPhone.includes(cleanQ) ||
        cleanRip.includes(cleanQ) ||
        ticket.includes(q) ||
        tracking.includes(q) ||
        prod.includes(q)
      );
    });
  };

  // Filtered lists
  const filteredActiveOrders = useMemo(() => {
    let list = isRetourMode 
      ? allNormalizedOrders.filter(o => !o.isArchived && o.isRetour)
      : allNormalizedOrders.filter(o => !o.isArchived && o.isExchange);

    if (statusFilter !== 'all' && statusFilter !== 'archived') {
      list = list.filter(o => o.approvalState === statusFilter);
    }

    if (istilamFilter === 'received') {
      list = list.filter(o => o.approvalState === 'approved' && o.isTamIstilam);
    } else if (istilamFilter === 'not_received') {
      list = list.filter(o => o.approvalState === 'approved' && !o.isTamIstilam);
    }

    return filterBySearch(list);
  }, [allNormalizedOrders, isRetourMode, statusFilter, istilamFilter, searchTerm]);

  const filteredArchivedRetours = useMemo(() => {
    return filterBySearch(archivedRetours);
  }, [archivedRetours, searchTerm]);

  const filteredArchivedExchanges = useMemo(() => {
    return filterBySearch(archivedExchanges);
  }, [archivedExchanges, searchTerm]);

  const displayedArchivedOrders = useMemo(() => {
    if (archiveSection === 'retours') return filteredArchivedRetours;
    if (archiveSection === 'exchanges') return filteredArchivedExchanges;
    return [...filteredArchivedRetours, ...filteredArchivedExchanges];
  }, [archiveSection, filteredArchivedRetours, filteredArchivedExchanges]);

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
      {/* Sub-tabs Switcher (Exchanges vs Retours vs Historique) */}
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
            setStatusFilter('all');
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
            background: (!isArchiveMode && !isRetourMode) ? 'var(--burgundy)' : '#F1F5F9',
            color: (!isArchiveMode && !isRetourMode) ? '#FFF' : '#64748B',
            boxShadow: (!isArchiveMode && !isRetourMode) ? '0 4px 14px rgba(107, 29, 47, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <ArrowRightLeft size={18} />
          <span>طلبات الاستبدال (Échanges)</span>
          {exchangePendingCount > 0 && (
            <span style={{
              background: (!isArchiveMode && !isRetourMode) ? '#F59E0B' : '#EF4444',
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
            setStatusFilter('all');
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
            background: (!isArchiveMode && isRetourMode) ? '#B91C1C' : '#F1F5F9',
            color: (!isArchiveMode && isRetourMode) ? '#FFF' : '#64748B',
            boxShadow: (!isArchiveMode && isRetourMode) ? '0 4px 14px rgba(185, 28, 28, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <RotateCcw size={18} />
          <span>طلبات الاسترجاع (Retours & Remboursements)</span>
          {retourPendingCount > 0 && (
            <span style={{
              background: (!isArchiveMode && isRetourMode) ? '#F59E0B' : '#EF4444',
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

        <button
          type="button"
          onClick={() => {
            setInternalMode('archived');
            setStatusFilter('archived');
            setArchiveSection('all');
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
            background: isArchiveMode ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : '#F1F5F9',
            color: isArchiveMode ? '#FFF' : '#64748B',
            boxShadow: isArchiveMode ? '0 4px 14px rgba(16, 185, 129, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Archive size={18} />
          <span>سجل الأرشيف والمكتملة (L'Historique)</span>
          {allArchivedOrders.length > 0 && (
            <span style={{
              background: isArchiveMode ? '#047857' : '#10B981',
              color: '#FFF',
              fontSize: '0.78rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {allArchivedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ACTIVE ORDERS VIEW (!isArchiveMode)                              */}
      {/* ========================================================================= */}
      {!isArchiveMode && (
        <>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '14px', flexWrap: 'wrap' }}>
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
                  setInternalMode('archived');
                  setStatusFilter('archived');
                  setArchiveSection('all');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ECFDF5',
                  color: '#047857',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Archive size={15} />
                <span>الأرشيف والمكتملة ({allArchivedOrders.length}) 📁</span>
              </button>
            </div>

            {/* Istilam Sub-filter for Approved Orders */}
            {statusFilter === 'approved' && (
              <div style={{
                width: '100%',
                paddingTop: '12px',
                borderTop: '1px dashed #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>
                    فرز حالة استلام الطرد بالمحل:
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

          {/* Active Orders Cards List */}
          {filteredActiveOrders.length === 0 ? (
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
                لا توجد طلبات نشطة حالياً
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: 0 }}>
                {searchTerm ? 'جرّب تغيير كلمات البحث' : 'ستظهر الطلبات الجديدة هنا فور تقديمها من طرف الزبائن'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredActiveOrders.map((order, idx) => (
                <ExchangeOrderCard
                  key={order.id || idx}
                  order={order}
                  idx={idx}
                  isProcessing={processingOrderId === order.id}
                  onApprove={handleApprove}
                  onReject={setRejectionModalOrder}
                  onToggleIstilam={handleToggleIstilam}
                  onToggleArchive={handleToggleArchiveOrder}
                  onOpenPhotoModal={setSelectedPhotoModal}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: L'HISTORIQUE WITH DEDICATED SECTIONS (أقسام الأرشيف)             */}
      {/* ========================================================================= */}
      {isArchiveMode && (
        <div>



          {/* Historique Search & Section Switcher */}
          <div style={{
            background: '#FFF',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '26px',
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
                placeholder="ابحث في الأرشيف (الاسم، الهاتف، كود بار، رقم RIP، كود التتبع)..."
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

            {/* Section Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setArchiveSection('all')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: archiveSection === 'all' ? '#0F172A' : 'transparent',
                  color: archiveSection === 'all' ? '#FFFFFF' : '#475569',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: archiveSection === 'all' ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                كافة الأرشيف ({allArchivedOrders.length})
              </button>

              <button
                type="button"
                onClick={() => setArchiveSection('retours')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: archiveSection === 'retours' ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : 'transparent',
                  color: archiveSection === 'retours' ? '#FFFFFF' : '#047857',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: archiveSection === 'retours' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>↩️ قسم الاسترجاع ({archivedRetours.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setArchiveSection('exchanges')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: archiveSection === 'exchanges' ? 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)' : 'transparent',
                  color: archiveSection === 'exchanges' ? '#FFFFFF' : '#1D4ED8',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: archiveSection === 'exchanges' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔄 قسم الاستبدال ({archivedExchanges.length})</span>
              </button>
            </div>
          </div>

          {/* Direct Archived Orders List */}
          {displayedArchivedOrders.length === 0 ? (
            <div style={{
              background: '#FFF',
              borderRadius: '24px',
              padding: '60px 20px',
              textAlign: 'center',
              border: '1.5px dashed #CBD5E1',
              color: '#64748B'
            }}>
              <Archive size={48} color="#86EFAC" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
                لا توجد طلبات مؤرشفة أو مكتملة تطابق البحث 📁
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: 0 }}>
                {searchTerm ? 'جرّب تغيير كلمات البحث' : 'تظهر هنا الطلبات المؤرشفة والمكتملة تلقائياً'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {displayedArchivedOrders.map((order, idx) => (
                <ExchangeOrderCard
                  key={order.id || idx}
                  order={order}
                  idx={idx}
                  isProcessing={processingOrderId === order.id}
                  onApprove={handleApprove}
                  onReject={setRejectionModalOrder}
                  onToggleIstilam={handleToggleIstilam}
                  onToggleArchive={handleToggleArchiveOrder}
                  onOpenPhotoModal={setSelectedPhotoModal}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          )}
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
