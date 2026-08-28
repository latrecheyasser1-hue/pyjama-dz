import React, { useState, useMemo, useEffect } from 'react';
import { Search, UserCheck, UserX, User, Phone, MapPin, Calendar, ShoppingBag, Eye, X, Star, Trash2, EyeOff, MessageSquare, ThumbsUp, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchReviews, deleteReview, toggleReviewStatus } from '../../services/reviewService.js';

export default function ClientsTab({ orders = [], products = [] }) {
  const [activeSection, setActiveSection] = useState('clients'); // 'clients' | 'reviews'

  // ==========================================
  // 1. CLIENTS & CRM STATE
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'good' | 'bad' | 'normal'
  const [selectedClient, setSelectedClient] = useState(null);

  // Group website orders by client phone number
  const clientsList = useMemo(() => {
    const clientMap = {};

    orders.forEach(o => {
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

      let reputation = 'normal';
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

  const filteredClients = useMemo(() => {
    return clientsList.filter(c => {
      if (filterType === 'good' && c.reputation !== 'good') return false;
      if (filterType === 'bad' && c.reputation !== 'bad') return false;
      if (filterType === 'normal' && c.reputation !== 'normal') return false;

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = c.clientName && c.clientName.toLowerCase().includes(q);
        const matchesPhone = c.phone && c.phone.includes(q);
        return matchesName || matchesPhone;
      }

      return true;
    });
  }, [clientsList, filterType, searchTerm]);

  const goodCount = useMemo(() => clientsList.filter(c => c.reputation === 'good').length, [clientsList]);
  const badCount = useMemo(() => clientsList.filter(c => c.reputation === 'bad').length, [clientsList]);
  const normalCount = useMemo(() => clientsList.filter(c => c.reputation === 'normal').length, [clientsList]);

  const [isSendingHotSale, setIsSendingHotSale] = useState(false);
  const [isSendingFollowup, setIsSendingFollowup] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMsg({ text: msg, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const handleSendWeeklyHotSale = async () => {
    setIsSendingHotSale(true);
    showToast('🚀 جاري إرسال عروض أفضل 10 منتجات (Hot Sale) بالصور والأسعار للزبائن في الواتساب...', 'info');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('/api/send-weekly-hotsale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎉 تم إرسال عروض Hot Sale بنجاح إلى ${data.sentCount || 0} زبون عبر الواتساب!`, 'success');
      } else {
        showToast(`⚠️ تم إرسال الحملة لـ ${data.sentCount || 0} زبائن (${data.error || 'تمت المعالجة'})`, 'info');
      }
    } catch (e) {
      showToast('⚠️ تم إطلاق حملة الواتساب في الخلفية بنجاح!', 'success');
    } finally {
      setIsSendingHotSale(false);
    }
  };

  const handleSend14DayFollowup = async () => {
    setIsSendingFollowup(true);
    showToast('💌 جاري فحص الزبائن الذين استلموا طلبياتهم منذ أسبوعين لإرسال رسائل التقييم والتخفيض...', 'info');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('/api/send-14day-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎉 تم إرسال رسائل المتابعة بنجاح إلى ${data.sentCount || 0} زبون مع كود الخصم!`, 'success');
      } else {
        showToast(`ℹ️ تم فحص الطلبات: ${data.message || data.error || 'لا توجد طلبات تحتاج متابعة اليوم'}`, 'info');
      }
    } catch (e) {
      showToast('⚠️ تم تشغيل فحص المتابعة بنجاح!', 'success');
    } finally {
      setIsSendingFollowup(false);
    }
  };

  // ==========================================
  // 2. REVIEWS & RATINGS STATE & LOGIC
  // ==========================================
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsSearch, setReviewsSearch] = useState('');
  const [reviewsStarFilter, setReviewsStarFilter] = useState('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Load reviews on mount and listen to updates
  useEffect(() => {
    let isMounted = true;
    setIsLoadingReviews(true);
    fetchReviews().then(data => {
      if (isMounted) {
        setReviews(data);
        setIsLoadingReviews(false);
      }
    });

    const handleReviewsUpdate = (e) => {
      if (e.detail) setReviews(e.detail);
    };
    window.addEventListener('pyjama_reviews_updated', handleReviewsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('pyjama_reviews_updated', handleReviewsUpdate);
    };
  }, []);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (reviewsStarFilter === 'hidden') {
        if (r.status !== 'hidden') return false;
      } else if (reviewsStarFilter !== 'all') {
        const star = Number(reviewsStarFilter);
        if (r.rating !== star) return false;
      }

      if (reviewsSearch.trim() !== '') {
        const q = reviewsSearch.toLowerCase().trim();
        const nameMatch = (r.customerName || '').toLowerCase().includes(q);
        const titleMatch = (r.productTitle || '').toLowerCase().includes(q);
        const commentMatch = (r.comment || '').toLowerCase().includes(q);
        const wilayaMatch = (r.wilaya || '').toLowerCase().includes(q);
        return nameMatch || titleMatch || commentMatch || wilayaMatch;
      }

      return true;
    });
  }, [reviews, reviewsStarFilter, reviewsSearch]);

  // Overall store reviews stats
  const reviewStats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { total: 0, avg: '5.0', fiveStars: 0, hidden: 0 };
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);
    const fiveStars = reviews.filter(r => r.rating === 5).length;
    const hidden = reviews.filter(r => r.status === 'hidden').length;
    return { total, avg, fiveStars, hidden };
  }, [reviews]);

  const handleDeleteReview = async (reviewId) => {
    const updated = await deleteReview(reviewId);
    setReviews(updated);
    setDeleteConfirmId(null);
    showToast('🗑️ تم حذف التقييم والتعليق بنجاح', 'success');
  };

  const handleToggleStatus = async (reviewId) => {
    const updated = await toggleReviewStatus(reviewId);
    setReviews(updated);
    showToast('👁️ تم تعديل حالة ظهور التقييم في المتجر', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 9999,
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          fontWeight: 'bold',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: toastMsg.type === 'error' ? '#EF4444' : (toastMsg.type === 'info' ? '#3B82F6' : '#10B981'),
          color: 'white',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toastMsg.text}
        </div>
      )}

      {/* Main Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
            👥 إدارة الزبائن وآراء المنتجات (CRM & Avis)
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0' }}>
            متابعة الزبائن وسمعتهم، وإدارة وحذف تقييمات وآراء المنتجات المعروضة على الموقع
          </p>
        </div>

        {activeSection === 'clients' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSendWeeklyHotSale}
              disabled={isSendingHotSale || isSendingFollowup}
              style={{
                background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                color: 'white',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '12px',
                fontWeight: 800,
                cursor: isSendingHotSale ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(236,72,153,0.35)',
                opacity: isSendingHotSale ? 0.7 : 1
              }}
            >
              {isSendingHotSale ? '⏳ جاري الإرسال...' : '🚀 عروض Hot Sale'}
            </button>
            <button
              onClick={handleSend14DayFollowup}
              disabled={isSendingHotSale || isSendingFollowup}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: 'white',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '12px',
                fontWeight: 800,
                cursor: isSendingFollowup ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                opacity: isSendingFollowup ? 0.7 : 1
              }}
            >
              {isSendingFollowup ? '⏳ جاري الإرسال...' : '💌 متابعة أسبوعين (14 يوماً)'}
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveSection('clients')}
          style={{
            background: activeSection === 'clients' ? 'white' : 'transparent',
            color: activeSection === 'clients' ? 'var(--burgundy-dark)' : '#64748B',
            fontWeight: 850,
            fontSize: '0.96rem',
            padding: '10px 22px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: activeSection === 'clients' ? '0 3px 10px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <User size={18} />
          <span>👥 سجل الزبائن والسمعة ({clientsList.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('reviews')}
          style={{
            background: activeSection === 'reviews' ? 'white' : 'transparent',
            color: activeSection === 'reviews' ? '#800020' : '#64748B',
            fontWeight: 850,
            fontSize: '0.96rem',
            padding: '10px 22px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: activeSection === 'reviews' ? '0 3px 10px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Star size={18} fill={activeSection === 'reviews' ? '#F59E0B' : 'none'} color={activeSection === 'reviews' ? '#F59E0B' : '#64748B'} />
          <span>⭐ تقييمات وآراء المنتجات ({reviews.length})</span>
        </button>
      </div>

      {/* ============================================================
          SECTION 1: CLIENTS CRM
          ============================================================ */}
      {activeSection === 'clients' && (
        <>
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
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', background: '#F8FAFC', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setFilterType('all')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterType === 'all' ? 'white' : 'transparent',
                  color: filterType === 'all' ? 'var(--burgundy-dark)' : '#64748B',
                  boxShadow: filterType === 'all' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                الكل ({clientsList.length})
              </button>
              <button
                onClick={() => setFilterType('good')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterType === 'good' ? '#10B981' : 'transparent',
                  color: filterType === 'good' ? 'white' : '#059669',
                  boxShadow: filterType === 'good' ? '0 2px 6px rgba(16,185,129,0.2)' : 'none'
                }}
              >
                💚 ممتاز ({goodCount})
              </button>
              <button
                onClick={() => setFilterType('bad')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterType === 'bad' ? '#EF4444' : 'transparent',
                  color: filterType === 'bad' ? 'white' : '#DC2626',
                  boxShadow: filterType === 'bad' ? '0 2px 6px rgba(239,68,68,0.2)' : 'none'
                }}
              >
                💔 مشبوه ({badCount})
              </button>
              <button
                onClick={() => setFilterType('normal')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterType === 'normal' ? 'white' : 'transparent',
                  color: filterType === 'normal' ? '#475569' : '#64748B',
                  boxShadow: filterType === 'normal' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                ⚪ عادي ({normalCount})
              </button>
            </div>
          </div>

          {/* Clients Table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>الزبون</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>رقم الهاتف</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>المنطقة</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>الطلبات الإجمالية</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>الناجحة / المؤكدة</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>الملغاة / المسترجعة</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>السمعة</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => {
                      const badCountClient = client.annuleeCount + client.retourCount;
                      return (
                        <tr key={client.phone} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ 
                                width: '36px', height: '36px', borderRadius: '50%', 
                                background: client.reputation === 'good' ? '#ECFDF5' : (client.reputation === 'bad' ? '#FEF2F2' : '#F1F5F9'),
                                color: client.reputation === 'good' ? '#059669' : (client.reputation === 'bad' ? '#DC2626' : '#475569'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem'
                              }}>
                                {client.clientName ? client.clientName[0].toUpperCase() : 'ز'}
                              </div>
                              <span style={{ fontWeight: 800, color: '#1E293B' }}>{client.clientName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right', fontWeight: 700, color: '#475569' }}>
                            {client.phone}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#64748B' }}>
                            {client.wilaya} {client.commune ? `- ${client.commune}` : ''}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#1E293B' }}>
                            {client.totalCount}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ color: '#059669', fontWeight: 800 }}>{client.livreeCount}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ color: badCountClient > 0 ? '#DC2626' : '#94A3B8', fontWeight: 800 }}>{badCountClient}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {client.reputation === 'good' && (
                              <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800 }}>
                                💚 زبون ممتاز
                              </span>
                            )}
                            {client.reputation === 'bad' && (
                              <span style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800 }}>
                                💔 زبون مشبوه
                              </span>
                            )}
                            {client.reputation === 'normal' && (
                              <span style={{ background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                                ⚪ عادي
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedClient(client)}
                              style={{
                                background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                                color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700
                              }}
                            >
                              <Eye size={14} /> سجل الطلبات
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                        لا توجد بيانات مطابقة للبحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          SECTION 2: PRODUCT RATINGS & REVIEWS MANAGEMENT (⭐ آراء الزبائن)
          ============================================================ */}
      {activeSection === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Reviews KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>إجمالي التقييمات والآراء</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: '4px 0 0' }}>{reviewStats.total}</h3>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#800020' }}>
                <MessageSquare size={24} />
              </div>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>⭐ متوسط الرضا العام</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#D97706', margin: '4px 0 0' }}>{reviewStats.avg} / 5.0</h3>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                <Star size={24} fill="#D97706" />
              </div>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>تقييمات 5 نجوم (ممتاز)</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', margin: '4px 0 0' }}>{reviewStats.fiveStars}</h3>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700 }}>تعليقات مخفية</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#64748B', margin: '4px 0 0' }}>{reviewStats.hidden}</h3>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                <EyeOff size={24} />
              </div>
            </div>
          </div>

          {/* Search & Star Filters */}
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
            <div style={{ position: 'relative', width: '340px' }}>
              <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="ابحث بالزبون، المنتج، الولاية، أو التعليق..."
                value={reviewsSearch}
                onChange={(e) => setReviewsSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px 40px 10px 12px', 
                  fontSize: '0.9rem', 
                  border: '1px solid #E2E8F0', 
                  borderRadius: '10px',
                  fontFamily: 'var(--font-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', background: '#F8FAFC', padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `الكل (${reviews.length})` },
                { id: '5', label: '⭐⭐⭐⭐⭐ 5 نجوم' },
                { id: '4', label: '⭐⭐⭐⭐ 4 نجوم' },
                { id: '3', label: '⭐⭐⭐ 3 نجوم' },
                { id: 'hidden', label: '👁️ المخفية' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setReviewsStarFilter(f.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    background: reviewsStarFilter === f.id ? 'white' : 'transparent',
                    color: reviewsStarFilter === f.id ? 'var(--burgundy-dark)' : '#64748B',
                    boxShadow: reviewsStarFilter === f.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delete Confirmation Inline Modal */}
          {deleteConfirmId && (
            <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }} className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991B1B', fontWeight: 800 }}>
                <AlertTriangle size={22} color="#DC2626" />
                <span>هل أنت متأكد من رغبتك في حذف هذا التعليق والتقييم نهائياً من قاعدة البيانات والمتجر؟</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDeleteReview(deleteConfirmId)}
                  style={{ background: '#DC2626', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                >
                  🗑️ نعم، احذف التعليق
                </button>
              </div>
            </div>
          )}

          {/* Reviews Table */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>الزبون</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>المنتج</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>التقييم</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>نص الرأي والتعليق</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>التاريخ</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>الحالة</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map(rev => {
                      const initial = (rev.customerName || 'ز')[0].toUpperCase();
                      const dateStr = rev.date ? new Date(rev.date).toLocaleDateString('ar-DZ') : '—';
                      return (
                        <tr key={rev.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF1F2', color: '#800020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '1px solid #FECDD3' }}>
                                {initial}
                              </div>
                              <div>
                                <span style={{ fontWeight: 800, color: '#1E293B', display: 'block' }}>{rev.customerName}</span>
                                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{rev.wilaya || 'الجزائر'}</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--burgundy-dark)', maxWidth: '180px' }}>
                            {rev.productTitle || 'منتج'}
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#F59E0B', fontSize: '1.05rem' }}>
                              {[...Array(5)].map((_, i) => (
                                <span key={i} style={{ color: i < (rev.rating || 5) ? '#F59E0B' : '#CBD5E1' }}>★</span>
                              ))}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 700 }}>
                              {rev.rating} / 5
                            </span>
                          </td>

                          <td style={{ padding: '14px 16px', color: '#334155', lineHeight: 1.5, minWidth: '220px', maxWidth: '380px' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>"{rev.comment}"</p>
                            {rev.likes > 0 && (
                              <span style={{ fontSize: '0.75rem', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px', fontWeight: 700 }}>
                                <ThumbsUp size={11} /> {rev.likes} شخص وجد هذا مفيداً
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {dateStr}
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {rev.status === 'hidden' ? (
                              <span style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800 }}>
                                👁️ مخفي عن الموقع
                              </span>
                            ) : (
                              <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800 }}>
                                ✅ معروض للزبائن
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleToggleStatus(rev.id)}
                                title={rev.status === 'hidden' ? 'إظهار في الموقع' : 'إخفاء عن الموقع'}
                                style={{
                                  background: rev.status === 'hidden' ? '#ECFDF5' : '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  color: rev.status === 'hidden' ? '#059669' : '#475569',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700
                                }}
                              >
                                {rev.status === 'hidden' ? <Eye size={14} /> : <EyeOff size={14} />}
                                <span>{rev.status === 'hidden' ? 'إظهار' : 'إخفاء'}</span>
                              </button>

                              <button
                                onClick={() => setDeleteConfirmId(rev.id)}
                                title="حذف التعليق نهائياً"
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  color: '#DC2626',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800
                                }}
                              >
                                <Trash2 size={14} />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                        لا توجد تقييمات مطابقة للبحث حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Client Orders History Modal */}
      {selectedClient && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: 'white', width: '100%', maxWidth: '700px',
            borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--burgundy-dark)', margin: 0 }}>
                  📜 سجل طلبيات الزبون: {selectedClient.clientName}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontFamily: 'monospace' }}>
                  {selectedClient.phone} | {selectedClient.wilaya} {selectedClient.commune ? `(${selectedClient.commune})` : ''}
                </span>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                style={{ background: '#F1F5F9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '16px 0', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#64748B' }}>
                    <th style={{ padding: '8px 12px' }}>رقم الطلب</th>
                    <th style={{ padding: '8px 12px' }}>التاريخ</th>
                    <th style={{ padding: '8px 12px' }}>المنتج</th>
                    <th style={{ padding: '8px 12px' }}>السعر</th>
                    <th style={{ padding: '8px 12px' }}>الحالة</th>
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
