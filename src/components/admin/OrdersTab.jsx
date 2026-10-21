import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Printer, CheckCircle2, Store, Search, Plus, Trash2, X, ShoppingBag, RefreshCw, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getClientReputation } from '../../utils/reputation';
import { formatPrice } from '../../utils/formatUtils';

export default function OrdersTab({ orders, products = [], settings, onPlaceOrder, onUpdateProduct, onUpdateStatus, onOpenPos, onRefreshOrders }) {
  const [printingOrder, setPrintingOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState('livraison');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States: Status & Period
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  React.useEffect(() => {
    if (selectedOrderDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedOrderDetails]);

  // Active orders: orders matching the current status filter or active processing statuses
  const activeOrders = orders.filter(o => {
    // If user filtered by a specific status, include all matching orders regardless of archive flag:
    if (statusFilter !== 'all') {
      return o.status === statusFilter;
    }
    // Default 'all' view: show all active/processing orders:
    // nouvelle, en_attente, ne_repond_pas_1, ne_repond_pas_2, and confirmee!
    if (['nouvelle', 'en_attente', 'ne_repond_pas_1', 'ne_repond_pas_2', 'confirmee'].includes(o.status)) {
      return true;
    }
    return o.archived === false;
  });

  const isExchangeOrReturn = (order) => {
    if (!order) return false;
    return Boolean(
      order.isExchange === true ||
      order.isRetour === true ||
      (order.clientName && (order.clientName.includes('استبدال') || order.clientName.includes('استرجاع') || order.clientName.includes('Retour') || order.clientName.includes('Échange'))) ||
      (order.product && (order.product.includes('استبدال') || order.product.includes('استرجاع') || order.product.includes('Retour') || order.product.includes('Échange'))) ||
      order.exchangeDetails ||
      order.returnDetails ||
      (Array.isArray(order.items) && order.items.some(it => it.isExchangeItem || it.isExchangeMeta || it.isReturnItem || it.isReturnMeta || it.type === 'retour' || it.type === 'exchange'))
    );
  };

  const isExchangeOrder = (order) => isExchangeOrReturn(order);

  const grosOrders = activeOrders.filter(o => {
    return (o.product && o.product.includes('(جملة -')) || 
           (o.clientName && o.clientName.includes('(واتساب:')) ||
           (o.items && o.items.some(it => it.size === 'Série'));
  });

  const hanoutOrders = activeOrders.filter(o => o.isPos === true || o.clientName === 'زبون المحل (بيع حضوري)' || o.commune === 'المتجر الحضوري');

  const livraisonOrders = activeOrders.filter(o => 
    !grosOrders.some(go => go.id === o.id) && !hanoutOrders.some(ho => ho.id === o.id) && !isExchangeOrReturn(o)
  );

  const displayOrders = orderFilter === 'gros' 
    ? grosOrders 
    : (orderFilter === 'hanout' 
      ? hanoutOrders 
      : livraisonOrders);

  // Helper function to check if order falls in specified date range
  const isOrderMatchingDate = (order, filterType, startDateStr, endDateStr) => {
    if (filterType === 'all' && !startDateStr && !endDateStr) return true;

    let orderDate = null;
    if (order.created_at) {
      orderDate = new Date(order.created_at);
    } else if (order.date) {
      orderDate = new Date(order.date);
    }

    if (!orderDate || isNaN(orderDate.getTime())) {
      return filterType === 'all';
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filterType === 'today') {
      return orderDate >= startOfToday && orderDate <= endOfToday;
    }

    if (filterType === 'yesterday') {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      return orderDate >= startOfYesterday && orderDate <= endOfYesterday;
    }

    if (filterType === 'week') {
      const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= startOfWeek && orderDate <= endOfToday;
    }

    if (filterType === 'month') {
      const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
      return orderDate >= startOfMonth && orderDate <= endOfToday;
    }

    if (filterType === 'custom') {
      if (startDateStr) {
        const [sY, sM, sD] = startDateStr.split('-').map(Number);
        const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDateStr) {
        const [eY, eM, eD] = endDateStr.split('-').map(Number);
        const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    }

    return true;
  };

  // Filtered orders taking status and date period into account
  const filteredDisplayOrders = displayOrders.filter(order => {
    // 1. Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // 2. Date filter
    if (!isOrderMatchingDate(order, dateFilter, customStartDate, customEndDate)) {
      return false;
    }

    return true;
  });

  // Export confirmed orders to Excel with exactly 3 aggregated columns:
  // 1: المنتوج (Produit)
  // 2: الباركود (Code-barres)
  // 3: الكمية (Quantité)
  const exportConfirmedOrdersToExcel = () => {
    const confirmedOrders = filteredDisplayOrders.filter(o => o.status === 'confirmee');

    if (confirmedOrders.length === 0) {
      alert('لا توجد أي طلبيات مؤكدة لتصديرها في هذا الفلتر.');
      return;
    }

    // Aggregate items across all confirmed orders
    const itemsMap = new Map();

    confirmedOrders.forEach(order => {
      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach(it => {
          if (it.isExchangeMeta || it.isReturnMeta) return;

          const rawTitle = (it.product || it.title || it.name || '').trim();
          if (!rawTitle) return;

          // Resolve barcode
          let barcode = (it.barcode ? String(it.barcode).trim() : '');
          if (!barcode || barcode === '—') {
            const found = products.find(p => 
              (it.productId && String(p.id) === String(it.productId)) ||
              (p.title && (p.title.trim() === rawTitle || rawTitle.includes(p.title.trim()) || p.title.trim().includes(rawTitle)))
            );
            if (found && found.barcode) {
              barcode = String(found.barcode).trim();
            }
          }

          const qty = parseInt(it.qty || it.quantity || 1, 10) || 1;

          // Unique grouping key: prefer barcode if exists, otherwise lowercase title
          const key = barcode && barcode !== '—'
            ? `bc_${barcode}`
            : `title_${rawTitle.toLowerCase()}`;

          if (itemsMap.has(key)) {
            const entry = itemsMap.get(key);
            entry.qty += qty;
            if ((!entry.barcode || entry.barcode === '—') && barcode && barcode !== '—') {
              entry.barcode = barcode;
            }
          } else {
            itemsMap.set(key, {
              title: rawTitle,
              barcode: barcode || '—',
              qty: qty
            });
          }
        });
      } else if (order.product) {
        // Fallback for orders stored as text summary
        const parts = order.product.split(' + ');
        parts.forEach(part => {
          const match = part.match(/^(.*?)\s*\(x(\d+)\)$/);
          let pTitle = part.trim();
          let pQty = parseInt(order.quantity || order.qty || 1, 10) || 1;
          if (match) {
            pTitle = match[1].trim();
            pQty = parseInt(match[2], 10) || 1;
          }

          let barcode = (order.barcode ? String(order.barcode).trim() : '');
          if (!barcode || barcode === '—') {
            const found = products.find(p => 
              (order.productId && String(p.id) === String(order.productId)) ||
              (p.title && (p.title.trim() === pTitle || pTitle.includes(p.title.trim()) || p.title.trim().includes(pTitle)))
            );
            if (found && found.barcode) {
              barcode = String(found.barcode).trim();
            }
          }

          const key = barcode && barcode !== '—'
            ? `bc_${barcode}`
            : `title_${pTitle.toLowerCase()}`;

          if (itemsMap.has(key)) {
            const entry = itemsMap.get(key);
            entry.qty += pQty;
            if ((!entry.barcode || entry.barcode === '—') && barcode && barcode !== '—') {
              entry.barcode = barcode;
            }
          } else {
            itemsMap.set(key, {
              title: pTitle,
              barcode: barcode || '—',
              qty: pQty
            });
          }
        });
      }
    });

    if (itemsMap.size === 0) {
      alert('لم يتم العثور على أي منتجات في الطلبيات المؤكدة المحددة.');
      return;
    }

    // Build exactly the 3 requested columns
    const exportRows = Array.from(itemsMap.values()).map(item => ({
      'المنتوج (Produit)': item.title,
      'الباركود (Code-barres)': item.barcode,
      'الكمية (Quantité)': item.qty
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 45 },
      { wch: 22 },
      { wch: 15 }
    ];
    worksheet['!views'] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Commandes Confirmées');

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `commandes_confirmees_${dateFormatted}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  const handleConfirmAction = (order) => {
    if (order.status === 'confirmee') {
      onUpdateStatus(order.id, 'confirmee', true);
    } else if (order.status === 'annulee') {
      onUpdateStatus(order.id, 'annulee', true);
    }
  };

  const handleRefresh = async () => {
    if (onRefreshOrders) {
      setIsRefreshing(true);
      try {
        await onRefreshOrders();
      } catch (err) {
        console.error('Refresh error:', err);
      }
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const triggerPrint = () => {
    window.print();
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
            📥 الطلبيات الجديدة و قيد المعالجة (Commandes Actives)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            اختر الحالة من القائمة المنسدلة ثم اضغط على زر التأكيد ليتم حفظ الطلبية في الأرشيف.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {onRefreshOrders && (
            <button 
              type="button"
              onClick={handleRefresh}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'var(--burgundy-dark)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
              title="تحديث الطلبيات مباشرة من السيرفر"
            >
              <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث الطلبيات'}</span>
            </button>
          )}
          <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem' }}>
            ● {statusFilter === 'confirmee' ? 'الطلبيات المؤكدة' : (statusFilter === 'all' ? 'الطلبيات النشطة' : 'الطلبيات المفلترة')} ({filteredDisplayOrders.length === displayOrders.length ? `${displayOrders.length} طلبية` : `${filteredDisplayOrders.length} من ${displayOrders.length} طلبية`})
          </div>
        </div>
      </div>

      {/* Sub-tabs for separating Livraison and Gros + Compact Corner Filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setOrderFilter('livraison')}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              background: orderFilter === 'livraison' ? 'var(--burgundy)' : '#F1F5F9',
              color: orderFilter === 'livraison' ? 'white' : '#64748B',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🛒 طلبيات التوصيل (Livraison)</span>
            <span style={{
              background: orderFilter === 'livraison' ? 'white' : 'var(--burgundy)',
              color: orderFilter === 'livraison' ? 'var(--burgundy)' : 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 900
            }}>
              {livraisonOrders.length}
            </span>
          </button>

          <button
            onClick={() => setOrderFilter('gros')}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              background: orderFilter === 'gros' ? '#4F46E5' : '#F1F5F9',
              color: orderFilter === 'gros' ? 'white' : '#64748B',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📦 طلبيات الجملة (Gros)</span>
            <span style={{
              background: orderFilter === 'gros' ? 'white' : '#4F46E5',
              color: orderFilter === 'gros' ? '#4F46E5' : 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 900
            }}>
              {grosOrders.length}
            </span>
          </button>
        </div>

        {/* Compact Filters in the Top Corner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          background: '#FFFFFF',
          border: '1.5px solid #CBD5E1',
          padding: '4px 10px',
          borderRadius: '12px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: statusFilter !== 'all' ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
              background: statusFilter !== 'all' ? '#EFF6FF' : '#F8FAFC',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: statusFilter !== 'all' ? '#1D4ED8' : '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">🏷️ كل الحالات</option>
            <option value="nouvelle">🆕 جديدة (Nouvelle)</option>
            <option value="en_attente">⏳ قيد الانتظار (En attente)</option>
            <option value="ne_repond_pas_1">📵 لا يجيب 1 (Ne répond pas 1)</option>
            <option value="ne_repond_pas_2">📵 لا يجيب 2 (Ne répond pas 2)</option>
            <option value="confirmee">📞 مؤكدة (Confirmée)</option>
            <option value="livree">🚚 مستلمة (Livrée)</option>
            <option value="annulee">❌ ملغاة (Annulée)</option>
          </select>

          {/* Period Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: dateFilter !== 'all' ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
              background: dateFilter !== 'all' ? '#FEF3C7' : '#F8FAFC',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: dateFilter !== 'all' ? '#B45309' : '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">📅 كل الأوقات</option>
            <option value="today">⚡ اليوم</option>
            <option value="yesterday">⏱️ البارحة</option>
            <option value="week">📆 هذا الأسبوع (7 أيام)</option>
            <option value="month">🗓️ هذا الشهر (30 يوم)</option>
            <option value="custom">🎯 فترة مخصصة</option>
          </select>

          {/* Custom Date Inputs inline */}
          {dateFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                title="من تاريخ"
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                title="إلى تاريخ"
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Reset button if active */}
          {(statusFilter !== 'all' || dateFilter !== 'all' || customStartDate || customEndDate) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              title="تفريغ الفلتر"
              style={{
                background: '#FEE2E2',
                color: '#DC2626',
                border: 'none',
                padding: '5px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <X size={12} />
              <span>تفريغ</span>
            </button>
          )}

          {/* Excel Export Button: Only visible when statusFilter is 'confirmee' */}
          {statusFilter === 'confirmee' && (
            <button
              type="button"
              onClick={exportConfirmedOrdersToExcel}
              title="تصدير السلع المؤكدة في ملف Excel (المنتوج، الباركود، الكمية)"
              style={{
                background: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(22, 163, 74, 0.35)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#15803D')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#16A34A')}
            >
              <FileSpreadsheet size={15} />
              <span>تصدير ملف Excel ({filteredDisplayOrders.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID & Date</th>
                <th>Client(e)</th>
                <th>Téléphone (Appel Rapide)</th>
                <th>Wilaya & Commune</th>
                <th>Mode Livraison</th>
                <th>Produit & Taille</th>
                <th>Montant</th>
                <th>تغيير الحالة (Statut)</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراء (Action)</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisplayOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {displayOrders.length === 0 
                      ? 'لا توجد طلبيات جديدة بانتظار المعالجة.' 
                      : 'لا توجد طلبيات تطابق معايير الفلترة المحددة.'}
                  </td>
                </tr>
              ) : (
                filteredDisplayOrders.map(order => (
                  <tr 
                    key={order.id} 
                    style={{ background: (() => {
                      const rep = getClientReputation(order.phone, orders);
                      if (rep === 'good') return '#ECFDF5';
                      if (rep === 'bad') return '#FEF2F2';
                      return order.status === 'nouvelle' ? '#FFFDF9' : 'white';
                    })(), cursor: 'pointer' }}
                    onClick={() => setSelectedOrderDetails(order)}
                  >
                    <td style={{ fontWeight: 700 }}>
                      {order.ticketNumber || order.id}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {order.date || (order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : "À l'instant")}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                      <div>{order.clientName}</div>
                      {isExchangeOrReturn(order) && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          background: '#FFF1F2', 
                          color: '#BE123C', 
                          border: '1px solid #FECDD3', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.72rem', 
                          fontWeight: 900,
                          marginTop: '4px'
                        }}>
                          🔄 طلب استبدال (Échange)
                        </span>
                      )}
                    </td>
                    <td>
                      <a 
                        onClick={(e) => e.stopPropagation()}
                        href={`tel:${order.phone}`} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          background: '#E3F7EB', 
                          color: '#1F8A55', 
                          padding: '6px 14px', 
                          borderRadius: '20px', 
                          textDecoration: 'none', 
                          fontWeight: 800, 
                          fontSize: '0.85rem' 
                        }}
                      >
                        <Phone size={14} />
                        {order.phone}
                      </a>
                    </td>
                    <td>
                      <strong>{order.wilaya}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.commune}</div>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        background: order.deliveryMode?.includes('bureau') ? '#E0F2FE' : '#F3E8FF', 
                        color: order.deliveryMode?.includes('bureau') ? '#0369A1' : '#6B21A8', 
                        padding: '4px 8px', 
                        borderRadius: 6, 
                        fontWeight: 700 
                      }}>
                        {order.deliveryMode || 'À domicile'}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {order.product}
                      </div>
                      <span style={{ fontSize: '0.75rem', background: 'var(--rose-light)', color: 'var(--burgundy)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        Taille : {order.size}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--burgundy)', fontSize: '0.95rem', direction: 'ltr' }}>
                      {formatPrice(order.price)} DA
                    </td>
                    <td>
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={order.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          const shouldArchive = (newStatus === 'livree');
                          onUpdateStatus(order.id, newStatus, shouldArchive);
                        }}
                        className={`status-badge status-${order.status}`}
                        style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-primary)', fontWeight: 800, padding: '6px 12px', outline: 'none' }}
                      >
                        <option value="nouvelle">🆕 جديدة (Nouvelle)</option>
                        <option value="en_attente">⏳ قيد الانتظار (En attente)</option>
                        <option value="ne_repond_pas_1">📵 لا يجيب 1 (Ne répond pas 1)</option>
                        <option value="ne_repond_pas_2">📵 لا يجيب 2 (Ne répond pas 2)</option>
                        <option value="confirmee">📞 مؤكدة (Confirmée)</option>
                        <option value="livree">🚚 تم التوصيل / مستلمة (Livrée)</option>
                        <option value="annulee">❌ ملغاة (Annulée)</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {order.status === 'nouvelle' && (
                          <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>👈 حدد الحالة</span>
                        )}

                        {order.status === 'en_attente' && (
                          <span style={{ color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            ⏳ في الانتظار
                          </span>
                        )}

                        {order.status === 'ne_repond_pas_1' && (
                          <span style={{ color: '#7E22CE', background: '#F3E8FF', border: '1px solid #E9D5FF', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            📞 محاولة ثانية لاحقاً
                          </span>
                        )}

                        {order.status === 'ne_repond_pas_2' && (
                          <span style={{ color: '#BE185D', background: '#FCE7F3', border: '1px solid #FBCFE8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            ⚠️ لا يجيب (المحاولة 2)
                          </span>
                        )}

                        {order.status === 'confirmee' && (
                          order.archived ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#166534', background: '#DCFCE7', border: '1px solid #BBF7D0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                ✅ مؤكدة
                              </span>
                              {order.shippingLabelUrl && (
                                <a 
                                  onClick={(e) => e.stopPropagation()} 
                                  href={order.shippingLabelUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ background: '#1E293B', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
                                >
                                  📄 البوليصة
                                </a>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleConfirmAction(order); }}
                              style={{
                                background: '#1F8A55',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(31,138,85,0.25)'
                              }}
                            >
                              <CheckCircle2 size={16} />
                              <span>تأكيد النهائي</span>
                            </button>
                          )
                        )}

                        {order.status === 'annulee' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleConfirmAction(order); }}
                            style={{
                              background: '#DC2626',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <CheckCircle2 size={16} />
                            <span>تأكيد الإلغاء</span>
                          </button>
                        )}

                        {order.status === 'livree' && (
                          <span style={{ color: '#00695C', background: '#E0F2F1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            ✅ مستلمة
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal (Ticket POS Style Centered) */}
      {printingOrder && createPortal(
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
            {/* Determine if order is POS (In-Store) */}
            {(() => {
              const isPosOrder = printingOrder.isPos || printingOrder.clientName === 'زبون المحل (بيع حضوري)' || printingOrder.commune === 'المتجر الحضوري';
              return (
                <>
                  <div style={{ textAlign: 'center', borderBottom: '2px dashed #333', paddingBottom: '12px', marginBottom: '12px' }}>
                    <img src="/favicon.svg?v=4" alt="Pyjama DZ" style={{ width: 48, height: 48, margin: '0 auto 6px', display: 'block' }} />
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
                      رقم الوصل: #{printingOrder.ticketNumber || printingOrder.id}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>
                      التاريخ: {printingOrder.date || new Date().toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {/* Client Info */}
                  {!isPosOrder && (
                    <div style={{ marginBottom: '12px', fontSize: '0.85rem', lineHeight: '1.8', borderBottom: '2px dashed #333', paddingBottom: '12px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '6px', color: '#000' }}>
                        معلومات الزبونة:
                      </div>
                      <div><strong>الاسم واللقب:</strong> {printingOrder.clientInfo?.fullName || printingOrder.clientName || 'زبون'}</div>
                      {(printingOrder.clientInfo?.phone || printingOrder.phone) && (printingOrder.clientInfo?.phone || printingOrder.phone) !== '0000000000' && (
                        <div><strong>رقم الهاتف:</strong> <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: 800 }}>{printingOrder.clientInfo?.phone || printingOrder.phone}</span></div>
                      )}
                      <div><strong>الولاية والبلدية:</strong> {printingOrder.clientInfo?.wilaya || printingOrder.wilaya || ''} ({printingOrder.clientInfo?.commune || printingOrder.commune || ''})</div>
                      <div><strong>طريقة التوصيل:</strong> {printingOrder.clientInfo?.deliveryType === 'home' || printingOrder.deliveryMode === 'توصيل للمنزل' ? 'توصيل للمنزل' : 'توصيل للمكتب / نقطة استلام'}</div>
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
                              <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{formatPrice((it.price || 0) * (it.qty || it.quantity || 1))} د.ج</td>
                            </tr>
                          ))
                        ) : (
                          <tr style={{ borderBottom: '1.5px dashed #aaa' }}>
                            <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{printingOrder.product}</td>
                            <td style={{ padding: '8px 4px' }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{printingOrder.color || '—'}</span></td>
                            <td style={{ padding: '8px 4px', fontWeight: 800 }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{printingOrder.size}</span></td>
                            <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{formatPrice(printingOrder.price)} د.ج</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Discount if exists */}
                  {(printingOrder.discount > 0 || printingOrder.remise > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#D32F2F', marginBottom: '8px' }}>
                      <span>تخفيض للزبون (Remise):</span>
                      <span style={{ direction: 'ltr' }}>- {formatPrice(printingOrder.discount || printingOrder.remise)} د.ج</span>
                    </div>
                  )}

                  {/* Total */}
                  <table style={{ width: '100%', fontSize: '1.2rem', fontWeight: 900, borderTop: '2px dashed #333', marginTop: '8px', marginBottom: '8px' }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingTop: '12px', border: 'none', textAlign: 'right' }}>{isPosOrder ? 'المجموع الإجمالي:' : 'المجموع الإجمالي للدفع:'}</td>
                        <td style={{ paddingTop: '12px', border: 'none', textAlign: 'left', direction: 'ltr' }}>{formatPrice(printingOrder.totalPrice || printingOrder.price)} د.ج</td>
                      </tr>
                    </tbody>
                  </table>

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
                </>
              );
            })()}
            {/* Buttons (No print) */}
            <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
        </div>,
        document.body
      )}      {/* Order Details Modal */}
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
                  📄 تفاصيل الطلبية #{selectedOrderDetails.ticketNumber || selectedOrderDetails.id?.substring(0, 8) || selectedOrderDetails.id}
                </h3>
                <span className={`status-badge status-${selectedOrderDetails.status}`} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem' }}>
                  {selectedOrderDetails.status === 'nouvelle' && '🆕 جديدة'}
                  {selectedOrderDetails.status === 'en_attente' && '⏳ قيد الانتظار'}
                  {selectedOrderDetails.status === 'ne_repond_pas_1' && '📵 لا يجيب 1'}
                  {selectedOrderDetails.status === 'ne_repond_pas_2' && '📵 لا يجيب 2'}
                  {selectedOrderDetails.status === 'confirmee' && '📞 مؤكدة'}
                  {selectedOrderDetails.status === 'annulee' && '❌ ملغاة'}
                  {selectedOrderDetails.status === 'expediee' && '🚚 تم الشحن'}
                  {selectedOrderDetails.status === 'livree' && '✅ تم التوصيل'}
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

            {/* Exchange Details Special Card */}
            {(() => {
              const exchangeDetails = selectedOrderDetails.exchangeDetails || 
                (Array.isArray(selectedOrderDetails.items) ? selectedOrderDetails.items.find(it => it.isExchangeMeta) : null);

              if (!exchangeDetails && !isExchangeOrder(selectedOrderDetails)) return null;

              return (
                <div style={{ background: '#FFF1F2', padding: '18px', borderRadius: '16px', border: '1.5px solid #FECDD3', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #FFE4E6', paddingBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: '#9F1239', fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔄 تفاصيل طلب الاستبدال (Détails de l'Échange)
                    </h4>
                    <span style={{ background: '#BE123C', color: 'white', fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px' }}>
                      طلب استبدال رسمي
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#881337', display: 'block', fontWeight: 700 }}>السلعة القديمة المراد استبدالها:</span>
                      <strong style={{ fontSize: '0.92rem', color: '#1E293B' }}>{exchangeDetails?.oldProductTitle || 'غير محدد'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#881337', display: 'block', fontWeight: 700 }}>باركود السلعة القديمة (Code Barres):</span>
                      <code style={{ fontSize: '0.88rem', color: '#BE123C', fontWeight: 800, background: '#FFE4E6', padding: '2px 8px', borderRadius: '6px' }}>
                        {exchangeDetails?.oldProductBarcode || 'غير مسجل'}
                      </code>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#881337', display: 'block', fontWeight: 700 }}>سعر السلعة القديمة:</span>
                      <strong style={{ fontSize: '0.92rem', color: '#1E293B', direction: 'ltr', display: 'inline-block' }}>{formatPrice(exchangeDetails?.oldProductPrice)} DA</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#881337', display: 'block', fontWeight: 700 }}>سبب الاستبدال:</span>
                      <strong style={{ fontSize: '0.88rem', color: '#1E293B' }}>{exchangeDetails?.reason || 'غير محدد'}</strong>
                    </div>
                  </div>

                  {/* Photo Preview of Old Product */}
                  {exchangeDetails?.productPhoto && (
                    <div style={{ marginBottom: '14px', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #FECDD3' }}>
                      <span style={{ fontSize: '0.78rem', color: '#881337', display: 'block', fontWeight: 800, marginBottom: '6px' }}>
                        📸 صورة السلعة المرفقة من الزبونة للمعاينة:
                      </span>
                      <a href={exchangeDetails.productPhoto} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                        <img 
                          src={exchangeDetails.productPhoto} 
                          alt="صورة السلعة" 
                          style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #FDA4AF', cursor: 'zoom-in' }} 
                        />
                      </a>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>اضغط على الصورة لفتحها بالحجم الكامل</div>
                    </div>
                  )}

                  {/* BaridiMob RIP Refund Section if store owes client money */}
                  {(exchangeDetails?.refundDue > 0 || exchangeDetails?.baridiMobRip) && (
                    <div style={{ background: '#FEF3C7', border: '1.5px solid #FDE68A', padding: '14px', borderRadius: '14px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ color: '#92400E', fontSize: '0.9rem' }}>⚠️ مستحقات يجب إرجاعها للزبونة (Remboursement):</strong>
                        <span style={{ background: '#D97706', color: 'white', fontWeight: 900, padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem', direction: 'ltr', display: 'inline-block' }}>
                          {formatPrice(exchangeDetails?.refundDue)} DA
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#78350F', display: 'block', fontWeight: 700 }}>رقم حساب بريدي موب (BaridiMob RIP):</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <code style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '1px', background: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #FCD34D', color: '#B45309', direction: 'ltr' }}>
                            {exchangeDetails?.baridiMobRip ? exchangeDetails.baridiMobRip.replace(/(\d{4})(?=\d)/g, '$1 ') : 'غير متوفر'}
                          </code>
                          {exchangeDetails?.baridiMobRip && (
                            <button 
                              type="button" 
                              onClick={() => {
                                navigator.clipboard.writeText(exchangeDetails.baridiMobRip);
                                alert('✅ تم نسخ رقم الـ RIP بنجاح!');
                              }}
                              style={{ background: '#B45309', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              نسخ RIP
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Order Items Section */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1E293B', fontSize: '1rem', fontWeight: 800 }}>
                🛍️ المنتجات المطلوبة (Ordered Items)
              </h4>
              
              {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrderDetails.items.filter(it => !it.isExchangeMeta).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#1E293B', display: 'block' }}>{item.product}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          اللون: <strong>{item.color || 'Standard'}</strong> | المقاس: <strong>{item.size || 'Standard'}</strong>
                        </span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'block', direction: 'ltr' }}>
                          {item.qty} × {formatPrice(item.price)} DA
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--burgundy)', direction: 'ltr', display: 'inline-block' }}>
                          {formatPrice(Number(item.qty || 1) * Number(item.price || 0))} DA
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444', marginBottom: 8, direction: 'ltr' }}>
                    الخصم: <strong>-{formatPrice(selectedOrderDetails.discount)} DA</strong>
                  </div>
                )}
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>المبلغ الإجمالي المستحق:</span>
              </div>
              <strong style={{ fontSize: '1.4rem', color: 'var(--burgundy)', fontWeight: 900, direction: 'ltr', display: 'inline-block' }}>
                {formatPrice(selectedOrderDetails.price)} DA
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
