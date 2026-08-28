import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, Package, ShoppingBag, TrendingUp, DollarSign, Users, 
  Calendar, Lock, Unlock, LogOut, CheckCircle2, Clock, Truck, 
  AlertCircle, Eye, EyeOff, Search, Filter, Sparkles, RefreshCw, 
  ExternalLink, Phone, MapPin, ChevronRight, X, Layers, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Award, HeartHandshake, MessageSquare, Star, Trash2, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { getTopSellingProducts, getTopWilayas, getDeliveryStats } from '../utils/analytics';
import { fetchReviews, deleteReview, toggleReviewStatus } from '../services/reviewService.js';

const OWNER_PIN = '765483';

// Helper to safely parse dates in multiple formats
const parseItemDate = (str) => {
  if (!str) return new Date(0);
  if (typeof str === 'string' && str.includes('/') && str.split('/').length === 3) {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(str);
};

// Universal Date Range Filter
const filterByDateRange = (items, dateField, periodType, customStart, customEnd) => {
  if (!Array.isArray(items)) return [];
  if (periodType === 'all') return items;

  const now = new Date();
  now.setHours(23, 59, 59, 999);
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  yesterdayEnd.setMilliseconds(-1);

  if (periodType === 'custom') {
    const start = customStart ? new Date(customStart) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const end = customEnd ? new Date(customEnd) : null;
    if (end) end.setHours(23, 59, 59, 999);

    return items.filter(item => {
      let itemDateStr = item[dateField] || item.created_at || item.date;
      if (!itemDateStr) return true;
      let itemDate = parseItemDate(itemDateStr);
      if (isNaN(itemDate.getTime())) return true;
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }

  return items.filter(item => {
    let itemDateStr = item[dateField] || item.created_at || item.date;
    if (!itemDateStr) return true;
    let itemDate = parseItemDate(itemDateStr);
    if (isNaN(itemDate.getTime())) return true;

    const diffTime = Math.abs(now - itemDate);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (periodType === 'today') return itemDate >= todayStart && itemDate <= now;
    if (periodType === 'yesterday') return itemDate >= yesterdayStart && itemDate <= yesterdayEnd;
    if (periodType === 'last_week') return diffDays <= 7;
    if (periodType === 'last_month') return diffDays <= 30;
    if (periodType === 'this_year') return itemDate.getFullYear() === now.getFullYear();
    return true;
  });
};

export default function AliOwnerDashboard({ 
  orders = [], 
  products = [], 
  expenses = [], 
  settings = {},
  onGoToStore
}) {
  // 1. Password Protection Gate
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem('pyjama_ali_auth') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Active Tab: 'analytics' | 'products' | 'orders' | 'reviews'
  const [activeTab, setActiveTab] = useState('analytics');

  // Modals
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [deleteConfirmReviewId, setDeleteConfirmReviewId] = useState(null);

  // Toast message
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ----------------------------------------------------
  // FILTERS FOR ANALYTICS TAB
  // ----------------------------------------------------
  const [analyticsPeriod, setAnalyticsPeriod] = useState('all');
  const [analyticsCustomStart, setAnalyticsCustomStart] = useState('');
  const [analyticsCustomEnd, setAnalyticsCustomEnd] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  // ----------------------------------------------------
  // FILTERS FOR PRODUCTS TAB
  // ----------------------------------------------------
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productsPeriod, setProductsPeriod] = useState('all');
  const [productsCustomStart, setProductsCustomStart] = useState('');
  const [productsCustomEnd, setProductsCustomEnd] = useState('');

  // ----------------------------------------------------
  // FILTERS FOR ORDERS TAB
  // ----------------------------------------------------
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [ordersPeriod, setOrdersPeriod] = useState('all');
  const [ordersCustomStart, setOrdersCustomStart] = useState('');
  const [ordersCustomEnd, setOrdersCustomEnd] = useState('');

  // ----------------------------------------------------
  // REVIEWS STATE
  // ----------------------------------------------------
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsSearch, setReviewsSearch] = useState('');
  const [reviewsStarFilter, setReviewsStarFilter] = useState('all');

  // Load reviews on mount and listen to updates
  useEffect(() => {
    setIsLoadingReviews(true);
    fetchReviews().then(data => {
      if (Array.isArray(data)) {
        setReviews(data);
      }
      setIsLoadingReviews(false);
    }).catch(() => setIsLoadingReviews(false));

    const handleReviewsUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) setReviews(e.detail);
    };
    window.addEventListener('pyjama_reviews_updated', handleReviewsUpdate);
    return () => window.removeEventListener('pyjama_reviews_updated', handleReviewsUpdate);
  }, []);

  // Lock body scroll when modal open
  useEffect(() => {
    if (selectedProductDetails || selectedOrderDetails || deleteConfirmReviewId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProductDetails, selectedOrderDetails, deleteConfirmReviewId]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (enteredPin.trim() === OWNER_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      try {
        sessionStorage.setItem('pyjama_ali_auth', 'true');
      } catch (err) {}
    } else {
      setPinError(true);
      setEnteredPin('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('pyjama_ali_auth');
    } catch (err) {}
  };

  // ----------------------------------------------------
  // REVIEWS ACTIONS (HIDE / SHOW / DELETE)
  // ----------------------------------------------------
  const handleToggleReviewStatus = async (reviewId) => {
    const targetRev = reviews.find(r => r.id === reviewId);
    const willBeHidden = targetRev?.status !== 'hidden';
    const updated = await toggleReviewStatus(reviewId);
    setReviews(updated);
    showToast(willBeHidden ? 'تم إخفاء التقييم عن زوار المتجر' : 'تم إظهار التقييم في المتجر بنجاح', 'info');
  };

  const handleDeleteReview = async (reviewId) => {
    const updated = await deleteReview(reviewId);
    setReviews(updated);
    setDeleteConfirmReviewId(null);
    showToast('تم حذف التقييم نهائياً بنجاح', 'success');
  };

  // Filtered reviews
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

  const reviewStats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { total: 0, avg: '5.0', fiveStars: 0, hidden: 0, visible: 0 };
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);
    const fiveStars = reviews.filter(r => r.rating === 5).length;
    const hidden = reviews.filter(r => r.status === 'hidden').length;
    const visible = total - hidden;
    return { total, avg, fiveStars, hidden, visible };
  }, [reviews]);

  // ----------------------------------------------------
  // FILTERING LOGIC: ANALYTICS TAB
  // ----------------------------------------------------
  const filteredOrdersForAnalytics = useMemo(() => {
    let list = filterByDateRange(orders, 'created_at', analyticsPeriod, analyticsCustomStart, analyticsCustomEnd);
    if (channelFilter !== 'all') {
      list = list.filter(o => {
        const isGros = (o.product && o.product.includes('(جملة -')) || 
                       (o.items && o.items.some(it => it.size === 'Série')) || 
                       o.stockMode === 'gros';
        if (channelFilter === 'gros') return isGros;
        if (channelFilter === 'retail') return !isGros;
        return true;
      });
    }
    return list;
  }, [orders, analyticsPeriod, analyticsCustomStart, analyticsCustomEnd, channelFilter]);

  const validOrdersForAnalytics = useMemo(() => {
    return filteredOrdersForAnalytics.filter(o => o.status !== 'annulee' && o.status !== 'retour');
  }, [filteredOrdersForAnalytics]);

  const totalCA = useMemo(() => {
    return validOrdersForAnalytics.reduce((sum, o) => sum + Number(o.price || 0), 0);
  }, [validOrdersForAnalytics]);

  const totalCostGoods = useMemo(() => {
    return validOrdersForAnalytics.reduce((sum, o) => {
      let cost = 0;
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          const matchedProduct = products.find(p => p.id === item.productId || p.title === item.product);
          const itemCost = matchedProduct?.purchasePrice || Math.round(Number(item.price || 0) * 0.65);
          cost += itemCost * (Number(item.qty) || 1);
        });
      } else {
        const matchedProduct = products.find(p => p.title === o.product);
        cost = matchedProduct?.purchasePrice || Math.round(Number(o.price || 0) * 0.65);
      }
      return sum + cost;
    }, 0);
  }, [validOrdersForAnalytics, products]);

  const filteredExpenses = useMemo(() => {
    return filterByDateRange(expenses, 'date', analyticsPeriod, analyticsCustomStart, analyticsCustomEnd);
  }, [expenses, analyticsPeriod, analyticsCustomStart, analyticsCustomEnd]);

  const totalExpenseVal = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0), [filteredExpenses]);
  const estimatedProfit = useMemo(() => totalCA - totalCostGoods - totalExpenseVal, [totalCA, totalCostGoods, totalExpenseVal]);

  const deliveryStatsData = useMemo(() => getDeliveryStats(filteredOrdersForAnalytics), [filteredOrdersForAnalytics]);
  const topSellingData = useMemo(() => getTopSellingProducts(filteredOrdersForAnalytics), [filteredOrdersForAnalytics]);
  const topWilayasData = useMemo(() => getTopWilayas(filteredOrdersForAnalytics), [filteredOrdersForAnalytics]);

  const deliverySuccessRate = useMemo(() => {
    const total = filteredOrdersForAnalytics.length;
    if (!total) return 0;
    const delivered = filteredOrdersForAnalytics.filter(o => o.status === 'livree').length;
    return Math.round((delivered / total) * 100);
  }, [filteredOrdersForAnalytics]);

  // ----------------------------------------------------
  // FILTERING LOGIC: PRODUCTS TAB
  // ----------------------------------------------------
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : (typeof a.id === 'number' ? a.id : 0);
      const timeB = b.created_at ? new Date(b.created_at).getTime() : (typeof b.id === 'number' ? b.id : 0);
      return timeB - timeA;
    });
  }, [products]);

  const productCategories = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      if (p.category) {
        const cleanCat = p.category.replace('boutique__', '').replace('gros__', '');
        set.add(cleanCat);
      }
    });
    return Array.from(set);
  }, [products]);

  const displayedProducts = useMemo(() => {
    // 1. Filter by date
    let list = filterByDateRange(sortedProducts, 'created_at', productsPeriod, productsCustomStart, productsCustomEnd);

    // 2. Filter by search & category
    return list.filter(p => {
      const matchesSearch = !productSearch || 
        (p.title || '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && String(p.barcode).includes(productSearch));

      const matchesCat = productCategoryFilter === 'all' || 
        (p.category && p.category.includes(productCategoryFilter));

      return matchesSearch && matchesCat;
    });
  }, [sortedProducts, productsPeriod, productsCustomStart, productsCustomEnd, productSearch, productCategoryFilter]);

  // Total items in stock
  const totalStockCount = useMemo(() => {
    let total = 0;
    products.forEach(p => {
      if (Array.isArray(p.colorVariants)) {
        p.colorVariants.forEach(cv => {
          if (cv.stock && typeof cv.stock === 'object') {
            Object.values(cv.stock).forEach(qty => {
              total += Number(qty) || 0;
            });
          }
        });
      }
    });
    return total;
  }, [products]);

  // ----------------------------------------------------
  // FILTERING LOGIC: ORDERS TAB
  // ----------------------------------------------------
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [orders]);

  const displayedOrders = useMemo(() => {
    // 1. Filter by date
    let list = filterByDateRange(sortedOrders, 'created_at', ordersPeriod, ordersCustomStart, ordersCustomEnd);

    // 2. Filter by search & status
    return list.filter(o => {
      const matchesSearch = !orderSearch ||
        (o.clientName || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.phone || '').includes(orderSearch) ||
        (o.wilaya || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.ticketNumber && String(o.ticketNumber).includes(orderSearch)) ||
        (o.trackingNumber && String(o.trackingNumber).toLowerCase().includes(orderSearch.toLowerCase()));

      const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sortedOrders, ordersPeriod, ordersCustomStart, ordersCustomEnd, orderSearch, orderStatusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'nouvelle':
        return { label: 'جديدة', bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE' };
      case 'confirmee':
        return { label: 'مؤكدة', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
      case 'expediee':
        return { label: 'مشحونة', bg: '#E0F2FE', color: '#0284C7', border: '#BAE6FD' };
      case 'livree':
        return { label: 'مستلمة', bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' };
      case 'annulee':
        return { label: 'ملغاة', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' };
      case 'retour':
        return { label: 'راجعة', bg: '#FCE7F3', color: '#DB2777', border: '#FBCFE8' };
      default:
        return { label: status || 'أخرى', bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    }
  };

  // Helper to calculate stock sum of a single product
  const getProductStockTotal = (product) => {
    let sum = 0;
    if (Array.isArray(product.colorVariants)) {
      product.colorVariants.forEach(cv => {
        if (cv.stock && typeof cv.stock === 'object') {
          Object.values(cv.stock).forEach(qty => {
            sum += Number(qty) || 0;
          });
        }
      });
    }
    return sum;
  };

  // ----------------------------------------------------
  // RENDER: PASSWORD LOCK SCREEN IF NOT AUTHENTICATED
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2A0812 0%, #4A0E1C 50%, #150308 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Cairo', sans-serif"
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '28px',
          padding: '44px 32px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          animation: 'fadeInUp 0.35s ease-out'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, #6B1D2F, #9B2C46)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 25px rgba(107, 29, 47, 0.35)'
          }}>
            <Lock size={34} color="#FFF" />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FDF2F4',
            color: '#6B1D2F',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 800,
            marginBottom: '12px'
          }}>
            <Award size={14} /> لوحة المالك
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1E293B', marginBottom: '8px' }}>
            مرحباً بك يا علي
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem', marginBottom: '28px', lineHeight: 1.5 }}>
            يرجى إدخال رمز الأمان الخاص بك للدخول إلى لوحة التحكم الشاملة لـ <strong>Pyjama DZ</strong>
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ position: 'relative', marginBottom: '18px' }}>
              <input
                type={showPin ? "text" : "password"}
                maxLength={6}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  if (pinError) setPinError(false);
                }}
                placeholder="أدخل رمز المرور..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '16px 48px 16px 16px',
                  borderRadius: '16px',
                  border: pinError ? '2px solid #EF4444' : '2px solid #E2E8F0',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  letterSpacing: showPin ? '3px' : '8px',
                  outline: 'none',
                  background: pinError ? '#FEF2F2' : '#F8FAFC',
                  color: '#1E293B',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {pinError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: '#DC2626',
                fontSize: '0.88rem',
                fontWeight: 700,
                marginBottom: '16px',
                animation: 'shake 0.3s ease-in-out'
              }}>
                <AlertCircle size={16} /> رمز المرور غير صحيح، يرجى المحاولة مجدداً
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6B1D2F 0%, #9B2C46 100%)',
                color: '#FFF',
                fontSize: '1.05rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(107, 29, 47, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Unlock size={20} /> دخول إلى لوحة التحكم
            </button>
          </form>

          <div style={{ marginTop: '24px', borderTop: '1px solid #F1F5F9', paddingTop: '18px' }}>
            <button
              onClick={onGoToStore || (() => window.location.href = '/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ShoppingBag size={15} /> العودة إلى المتجر الرئيسي
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: AUTHENTICATED DASHBOARD FOR ALI
  // ----------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      color: '#1E293B',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl'
    }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 9999,
          padding: '14px 22px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          fontWeight: 800,
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: toastMsg.type === 'error' ? '#EF4444' : (toastMsg.type === 'info' ? '#3B82F6' : '#10B981'),
          color: '#FFF',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMsg.text}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 16px 60px' }}>
        
        {/* Navigation Tabs Bar with Fluid Pill Transition (Clean Lucide Icons, No Emojis) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#FFF',
          padding: '8px',
          borderRadius: '22px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          marginBottom: '28px',
          border: '1px solid #E2E8F0',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              flex: 1,
              minWidth: '170px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: 'none',
              background: activeTab === 'analytics' 
                ? 'linear-gradient(135deg, #6B1D2F 0%, #8B253E 100%)' 
                : 'transparent',
              color: activeTab === 'analytics' ? '#FFF' : '#64748B',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'analytics' ? '0 8px 18px rgba(107, 29, 47, 0.28)' : 'none',
              transform: activeTab === 'analytics' ? 'scale(1.01)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
          >
            <BarChart3 size={19} />
            <span>الإحصائيات (Analytics)</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            style={{
              flex: 1,
              minWidth: '170px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: 'none',
              background: activeTab === 'products' 
                ? 'linear-gradient(135deg, #6B1D2F 0%, #8B253E 100%)' 
                : 'transparent',
              color: activeTab === 'products' ? '#FFF' : '#64748B',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'products' ? '0 8px 18px rgba(107, 29, 47, 0.28)' : 'none',
              transform: activeTab === 'products' ? 'scale(1.01)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
          >
            <Package size={19} />
            <span>آخر المنتجات ({displayedProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              flex: 1,
              minWidth: '170px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: 'none',
              background: activeTab === 'orders' 
                ? 'linear-gradient(135deg, #6B1D2F 0%, #8B253E 100%)' 
                : 'transparent',
              color: activeTab === 'orders' ? '#FFF' : '#64748B',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'orders' ? '0 8px 18px rgba(107, 29, 47, 0.28)' : 'none',
              transform: activeTab === 'orders' ? 'scale(1.01)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
          >
            <ShoppingBag size={19} />
            <span>الطلبيات ({displayedOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              flex: 1,
              minWidth: '170px',
              padding: '14px 16px',
              borderRadius: '16px',
              border: 'none',
              background: activeTab === 'reviews' 
                ? 'linear-gradient(135deg, #6B1D2F 0%, #8B253E 100%)' 
                : 'transparent',
              color: activeTab === 'reviews' ? '#FFF' : '#64748B',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'reviews' ? '0 8px 18px rgba(107, 29, 47, 0.28)' : 'none',
              transform: activeTab === 'reviews' ? 'scale(1.01)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
          >
            <Star size={19} />
            <span>آراء الزبائن ({filteredReviews.length})</span>
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: ANALYTICS & BUSINESS METRICS                 */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="tab-pane-fade" key="analytics">
            {/* Filter Controls with Custom Date Range */}
            <div style={{
              background: '#FFF',
              padding: '20px 22px',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Calendar size={18} color="#6B1D2F" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E293B' }}>
                    تصفية الفترة الزمنية:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'كل الأوقات' },
                      { id: 'today', label: 'اليوم' },
                      { id: 'yesterday', label: 'البارحة' },
                      { id: 'last_week', label: 'آخر أسبوع' },
                      { id: 'last_month', label: 'آخر شهر' },
                      { id: 'custom', label: 'فترة محددة' }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setAnalyticsPeriod(btn.id)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: analyticsPeriod === btn.id ? '#6B1D2F' : '#F1F5F9',
                          color: analyticsPeriod === btn.id ? '#FFF' : '#475569',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E293B' }}>
                    قناة البيع:
                  </span>
                  <select
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      outline: 'none',
                      background: '#F8FAFC',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">جميع القنوات</option>
                    <option value="retail">التوصيل والتجزئة</option>
                    <option value="gros">طلبيات الجملة (Gros)</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Range Pickers if selected */}
              {analyticsPeriod === 'custom' && (
                <div style={{
                  background: '#F8FAFC',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px dashed #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  flexWrap: 'wrap',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>من تاريخ:</span>
                    <input
                      type="date"
                      value={analyticsCustomStart}
                      onChange={(e) => setAnalyticsCustomStart(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        outline: 'none',
                        background: '#FFF'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>إلى تاريخ:</span>
                    <input
                      type="date"
                      value={analyticsCustomEnd}
                      onChange={(e) => setAnalyticsCustomEnd(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        outline: 'none',
                        background: '#FFF'
                      }}
                    />
                  </div>

                  {(analyticsCustomStart || analyticsCustomEnd) && (
                    <button
                      onClick={() => {
                        setAnalyticsCustomStart('');
                        setAnalyticsCustomEnd('');
                      }}
                      style={{
                        background: '#F1F5F9',
                        border: 'none',
                        color: '#64748B',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      إلغاء التحديد
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* KPI Cards inside Analytics Tab (Dynamic & Non-Sticky) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <DollarSign size={16} color="#B45309" />
                  <span>إجمالي المداخيل (CA)</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6B1D2F' }}>
                  {totalCA.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>دج</span>
                </div>
              </div>

              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <TrendingUp size={16} color="#16A34A" />
                  <span>الأرباح الصافية التقديرية</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: estimatedProfit >= 0 ? '#16A34A' : '#DC2626' }}>
                  {estimatedProfit.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>دج</span>
                </div>
              </div>

              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <ShoppingBag size={16} color="#0284C7" />
                  <span>عدد الطلبيات</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E293B' }}>
                  {filteredOrdersForAnalytics.length} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>طلبية</span>
                </div>
              </div>

              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <Truck size={16} color="#7C3AED" />
                  <span>نسبة نجاح التوصيل</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E293B' }}>
                  {deliverySuccessRate}%
                </div>
              </div>

              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <Package size={16} color="#D97706" />
                  <span>الستوك الإجمالي</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E293B' }}>
                  {totalStockCount} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>قطعة ({products.length} موديل)</span>
                </div>
              </div>
            </div>

            {/* Visual Analytics Charts Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '22px',
              marginBottom: '26px'
            }}>
              {/* Top 5 Products Bar Chart */}
              <div style={{
                background: '#FFF',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={20} color="#6B1D2F" /> أكثر 5 موديلات مبيعاً
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>بالقطع المباعة</span>
                </div>
                {topSellingData.length > 0 ? (
                  <div style={{ height: 260, direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSellingData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#FFF' }}
                          itemStyle={{ color: '#FDE68A' }}
                        />
                        <Bar dataKey="sales" fill="#6B1D2F" radius={[8, 8, 0, 0]} name="المبيعات (قطع)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                    لا توجد مبيعات مسجلة في هذه الفترة
                  </div>
                )}
              </div>

              {/* Delivery Status Breakdown Pie Chart */}
              <div style={{
                background: '#FFF',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={20} color="#0284C7" /> توزيع حالات التوصيل والشحن
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>نسب الطلبيات</span>
                </div>
                {deliveryStatsData.length > 0 ? (
                  <div style={{ height: 260, direction: 'ltr', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deliveryStatsData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {deliveryStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#FFF' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                    لا توجد بيانات شحن لهذه الفترة
                  </div>
                )}
                {/* Legend Chips */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {deliveryStatsData.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.fill }} />
                      <span>{s.name}: {s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Wilayas Card */}
            <div style={{
              background: '#FFF',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} color="#D97706" /> أكثر الولايات طلباً
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                {topWilayasData.map((w, idx) => (
                  <div key={idx} style={{
                    background: '#F8FAFC',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>المركز #{idx + 1}</span>
                      <h4 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#1E293B' }}>{w.name}</h4>
                    </div>
                    <div style={{
                      background: '#FEF3C7',
                      color: '#B45309',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.92rem',
                      fontWeight: 800
                    }}>
                      {w.value} طلبية
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: LATEST PRODUCTS ADDED                         */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'products' && (
          <div className="tab-pane-fade" key="products">
            {/* Search & Period Filter Bar */}
            <div style={{
              background: '#FFF',
              padding: '20px 22px',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Top Row: Search and Categories */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                  <Search size={18} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="ابحث باسم الموديل أو التصنيف..."
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      background: '#F8FAFC',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '100%' }}>
                  <button
                    onClick={() => setProductCategoryFilter('all')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      background: productCategoryFilter === 'all' ? '#6B1D2F' : '#F1F5F9',
                      color: productCategoryFilter === 'all' ? '#FFF' : '#475569',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    جميع التصنيفات
                  </button>
                  {productCategories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setProductCategoryFilter(cat)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        background: productCategoryFilter === cat ? '#6B1D2F' : '#F1F5F9',
                        color: productCategoryFilter === cat ? '#FFF' : '#475569',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Row: Time Filter for Products */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                borderTop: '1px solid #F1F5F9',
                paddingTop: '14px'
              }}>
                <Clock size={16} color="#6B1D2F" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>تاريخ الإضافة:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'كل المنتجات' },
                    { id: 'today', label: 'اليوم' },
                    { id: 'yesterday', label: 'البارحة' },
                    { id: 'last_week', label: 'آخر أسبوع' },
                    { id: 'last_month', label: 'آخر شهر' },
                    { id: 'custom', label: 'فترة محددة' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setProductsPeriod(btn.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: productsPeriod === btn.id ? '#6B1D2F' : '#F1F5F9',
                        color: productsPeriod === btn.id ? '#FFF' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {productsPeriod === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginRight: '8px' }}>
                    <input
                      type="date"
                      value={productsCustomStart}
                      onChange={(e) => setProductsCustomStart(e.target.value)}
                      style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.82rem' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>إلى</span>
                    <input
                      type="date"
                      value={productsCustomEnd}
                      onChange={(e) => setProductsCustomEnd(e.target.value)}
                      style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.82rem' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Products Grid */}
            {displayedProducts.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '22px'
              }}>
                {displayedProducts.map((p) => {
                  const stockSum = getProductStockTotal(p);
                  const mainImage = (Array.isArray(p.images) && p.images[0]) || p.image || 'https://via.placeholder.com/300x400?text=No+Image';
                  const purchasePrice = Number(p.purchasePrice || 0);
                  const retailPrice = Number(p.price || 0);
                  const unitMargin = retailPrice > purchasePrice && purchasePrice > 0 ? (retailPrice - purchasePrice) : 0;
                  const addedDate = p.created_at ? new Date(p.created_at).toLocaleDateString('ar-DZ', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  }) : 'مؤخراً';

                  return (
                    <div 
                      key={p.id}
                      style={{
                        background: '#FFF',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 25px rgba(0, 0, 0, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.04)';
                      }}
                    >
                      {/* Product Image Container */}
                      <div style={{ position: 'relative', width: '100%', height: '260px', background: '#F1F5F9' }}>
                        <img
                          src={mainImage}
                          alt={p.title}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        {/* Stock Badge on Top Left */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          background: stockSum === 0 ? '#EF4444' : (stockSum <= 5 ? '#F59E0B' : '#10B981'),
                          color: '#FFF',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                          {stockSum === 0 ? 'نفد المخزون' : (stockSum <= 5 ? `متبقي ${stockSum} قطع` : `متوفر: ${stockSum} قطعة`)}
                        </div>

                        {/* Category Badge on Top Right */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(6px)',
                          color: '#FFF',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          {p.category || 'عام'}
                        </div>
                      </div>

                      {/* Product Card Details */}
                      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>
                              {p.title}
                            </h4>
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>أضيف: {addedDate}</span>
                          </div>

                          {/* Price Breakdown */}
                          <div style={{
                            background: '#F8FAFC',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            marginBottom: '12px',
                            border: '1px solid #E2E8F0'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>سعر البيع للزبون:</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#6B1D2F' }}>
                                {retailPrice.toLocaleString()} دج
                              </span>
                            </div>

                            {purchasePrice > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
                                <span>سعر الشراء (التكلفة):</span>
                                <span style={{ fontWeight: 700 }}>{purchasePrice.toLocaleString()} دج</span>
                              </div>
                            )}

                            {unitMargin > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#16A34A', marginTop: '4px', borderTop: '1px dashed #E2E8F0', paddingTop: '4px' }}>
                                <span style={{ fontWeight: 700 }}>هامش الربح / قطعة:</span>
                                <span style={{ fontWeight: 800 }}>+{unitMargin.toLocaleString()} دج</span>
                              </div>
                            )}
                          </div>

                          {/* Color Variants Chips */}
                          {Array.isArray(p.colorVariants) && p.colorVariants.length > 0 && (
                            <div style={{ marginBottom: '14px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                                الألوان المتوفرة ({p.colorVariants.length}):
                              </span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {p.colorVariants.map((cv, cIdx) => (
                                  <span key={cIdx} style={{
                                    background: '#F1F5F9',
                                    color: '#334155',
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700
                                  }}>
                                    {cv.name || cv.color || `لون #${cIdx + 1}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* View Full Product Breakdown Button */}
                        <button
                          onClick={() => setSelectedProductDetails(p)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '12px',
                            background: '#F8FAFC',
                            border: '1.5px solid #CBD5E1',
                            color: '#1E293B',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#6B1D2F';
                            e.currentTarget.style.color = '#FFF';
                            e.currentTarget.style.borderColor = '#6B1D2F';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.color = '#1E293B';
                            e.currentTarget.style.borderColor = '#CBD5E1';
                          }}
                        >
                          <Eye size={16} /> معاينة تفاصيل المقاسات
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: '#FFF',
                padding: '60px 20px',
                borderRadius: '20px',
                textAlign: 'center',
                color: '#64748B',
                border: '1px solid #E2E8F0'
              }}>
                <Package size={48} color="#CBD5E1" style={{ marginBottom: '14px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px', color: '#1E293B' }}>
                  لم يتم العثور على منتجات تطابق هذا الفلتر
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  جرّب تغيير الفترة الزمنية، كلمة البحث أو التصنيف المختار
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: ORDERS FEED                                   */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div className="tab-pane-fade" key="orders">
            {/* Search & Period Filter Bar */}
            <div style={{
              background: '#FFF',
              padding: '20px 22px',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Top Row: Search and Status filters */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                  <Search size={18} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="ابحث باسم الزبون، رقم الهاتف، أو التذكرة..."
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      background: '#F8FAFC',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '100%' }}>
                  {['all', 'nouvelle', 'confirmee', 'expediee', 'livree', 'annulee'].map((st) => {
                    const badge = getStatusBadge(st);
                    const isSelected = orderStatusFilter === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setOrderStatusFilter(st)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: 'none',
                          background: isSelected ? '#6B1D2F' : '#F1F5F9',
                          color: isSelected ? '#FFF' : '#475569',
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {st === 'all' ? 'جميع الحالات' : badge.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Row: Time Filter for Orders */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                borderTop: '1px solid #F1F5F9',
                paddingTop: '14px'
              }}>
                <Clock size={16} color="#6B1D2F" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>تاريخ الطلبية:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'كل الأوقات' },
                    { id: 'today', label: 'اليوم' },
                    { id: 'yesterday', label: 'البارحة' },
                    { id: 'last_week', label: 'آخر أسبوع' },
                    { id: 'last_month', label: 'آخر شهر' },
                    { id: 'custom', label: 'فترة محددة' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setOrdersPeriod(btn.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: ordersPeriod === btn.id ? '#6B1D2F' : '#F1F5F9',
                        color: ordersPeriod === btn.id ? '#FFF' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {ordersPeriod === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginRight: '8px' }}>
                    <input
                      type="date"
                      value={ordersCustomStart}
                      onChange={(e) => setOrdersCustomStart(e.target.value)}
                      style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.82rem' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>إلى</span>
                    <input
                      type="date"
                      value={ordersCustomEnd}
                      onChange={(e) => setOrdersCustomEnd(e.target.value)}
                      style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.82rem' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Orders Feed Cards */}
            {displayedOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {displayedOrders.map((o) => {
                  const statusBadge = getStatusBadge(o.status);
                  const rawPhone = (o.phone || '').replace(/\D/g, '');
                  const waNumber = rawPhone.startsWith('213') ? rawPhone : (rawPhone.startsWith('0') ? '213' + rawPhone.substring(1) : '213' + rawPhone);
                  const orderDate = o.created_at ? new Date(o.created_at).toLocaleDateString('ar-DZ', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : (o.date || 'اليوم');

                  return (
                    <div
                      key={o.id}
                      style={{
                        background: '#FFF',
                        borderRadius: '18px',
                        padding: '20px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                        transition: 'border-color 0.2s ease'
                      }}
                    >
                      {/* Left Block: Ticket & Customer Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '240px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '14px',
                          background: '#FDF2F4',
                          color: '#6B1D2F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          fontWeight: 900,
                          border: '1.5px solid #FBCFE8'
                        }}>
                          #{o.ticketNumber || String(o.id).slice(0, 4)}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E293B' }}>
                              {o.clientName || 'زبون'}
                            </h4>
                            <span style={{
                              background: statusBadge.bg,
                              color: statusBadge.color,
                              border: `1px solid ${statusBadge.border}`,
                              padding: '2px 8px',
                              borderRadius: '8px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              {statusBadge.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.84rem', color: '#64748B' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={13} /> {o.phone || 'بدون هاتف'}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} /> {o.wilaya || 'الجزائر'} {o.commune ? `(${o.commune})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Block: Product Summary */}
                      <div style={{ flex: '1', minWidth: '220px' }}>
                        <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          المنتجات المطلوبة:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>
                          {o.product || 'بيجامات منوعة'}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                          التاريخ: {orderDate}
                        </span>
                      </div>

                      {/* Right Block: Amount & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>المبلغ الإجمالي</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6B1D2F' }}>
                            {Number(o.price || 0).toLocaleString()} <span style={{ fontSize: '0.85rem' }}>دج</span>
                          </span>
                        </div>

                        {/* Quick WhatsApp Chat */}
                        {rawPhone.length >= 8 && (
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25D366',
                              color: '#FFF',
                              width: '40px',
                              height: '40px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                              boxShadow: '0 4px 10px rgba(37, 211, 102, 0.3)'
                            }}
                            title="مراسلة الزبون عبر الواتساب"
                          >
                            <Phone size={18} />
                          </a>
                        )}

                        {/* Details Modal Trigger */}
                        <button
                          onClick={() => setSelectedOrderDetails(o)}
                          style={{
                            padding: '9px 14px',
                            borderRadius: '12px',
                            background: '#F1F5F9',
                            border: 'none',
                            color: '#334155',
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Eye size={15} /> التفاصيل
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: '#FFF',
                padding: '60px 20px',
                borderRadius: '20px',
                textAlign: 'center',
                color: '#64748B',
                border: '1px solid #E2E8F0'
              }}>
                <ShoppingBag size={48} color="#CBD5E1" style={{ marginBottom: '14px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px', color: '#1E293B' }}>
                  لا توجد طلبيات في هذه الفترة
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  تأكد من فلتر الفترة الزمنية أو جرب اختيار "كل الأوقات"
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: CUSTOMER REVIEWS & RATINGS                   */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'reviews' && (
          <div className="tab-pane-fade" key="reviews">
            {/* Reviews Summary Cards (Clean Lucide Icons, No Emojis) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Star size={26} fill="#F59E0B" color="#D97706" />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, display: 'block' }}>
                    متوسط التقييم العام
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E293B' }}>
                    {reviewStats.avg} <span style={{ fontSize: '0.85rem', color: '#64748B' }}>من 5 نجوم</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, display: 'block' }}>
                    إجمالي الآراء والتعليقات
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E293B' }}>
                    {reviewStats.total} <span style={{ fontSize: '0.85rem', color: '#64748B' }}>رأي</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Eye size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, display: 'block' }}>
                    آراء منشورة للزبائن
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16A34A' }}>
                    {reviewStats.visible} <span style={{ fontSize: '0.85rem', color: '#64748B' }}>ظاهر</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#FFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: '#F1F5F9',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <EyeOff size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, display: 'block' }}>
                    آراء مخفية عن المتجر
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#64748B' }}>
                    {reviewStats.hidden} <span style={{ fontSize: '0.85rem', color: '#64748B' }}>مخفي</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Star Filter Bar */}
            <div style={{
              background: '#FFF',
              padding: '18px 22px',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                <Search size={18} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={reviewsSearch}
                  onChange={(e) => setReviewsSearch(e.target.value)}
                  placeholder="ابحث في نص التعليق، اسم الزبون، أو الولاية..."
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.92rem',
                    outline: 'none',
                    background: '#F8FAFC',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '100%' }}>
                <button
                  onClick={() => setReviewsStarFilter('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: reviewsStarFilter === 'all' ? '#6B1D2F' : '#F1F5F9',
                    color: reviewsStarFilter === 'all' ? '#FFF' : '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  الكل ({reviews.length})
                </button>
                <button
                  onClick={() => setReviewsStarFilter('5')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: reviewsStarFilter === '5' ? '#6B1D2F' : '#F1F5F9',
                    color: reviewsStarFilter === '5' ? '#FFF' : '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  5 نجوم
                </button>
                <button
                  onClick={() => setReviewsStarFilter('4')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: reviewsStarFilter === '4' ? '#6B1D2F' : '#F1F5F9',
                    color: reviewsStarFilter === '4' ? '#FFF' : '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  4 نجوم
                </button>
                <button
                  onClick={() => setReviewsStarFilter('hidden')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: reviewsStarFilter === 'hidden' ? '#6B1D2F' : '#F1F5F9',
                    color: reviewsStarFilter === 'hidden' ? '#FFF' : '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  المخفية فقط ({reviewStats.hidden})
                </button>
              </div>
            </div>

            {/* Reviews List */}
            {filteredReviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredReviews.map((rev) => {
                  const isHidden = rev.status === 'hidden';
                  const revDate = rev.date ? new Date(rev.date).toLocaleDateString('ar-DZ', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  }) : 'مؤخراً';

                  return (
                    <div
                      key={rev.id}
                      style={{
                        background: '#FFF',
                        borderRadius: '18px',
                        padding: '22px',
                        border: isHidden ? '1.5px dashed #CBD5E1' : '1px solid #E2E8F0',
                        opacity: isHidden ? 0.75 : 1,
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Top Row: Customer Info + Rating Stars + Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: '#FDF2F4',
                            color: '#6B1D2F',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '1.1rem'
                          }}>
                            {(rev.customerName || 'ز')[0]}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E293B' }}>
                                {rev.customerName}
                              </h4>
                              {rev.verifiedPurchase && (
                                <span style={{
                                  background: '#DCFCE7',
                                  color: '#16A34A',
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Check size={12} /> شراء مؤكد
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                              الولاية: {rev.wilaya || 'الجزائر'} • التاريخ: {revDate}
                            </span>
                          </div>
                        </div>

                        {/* Rating Stars & Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Stars */}
                          <div style={{ display: 'flex', gap: '2px', direction: 'ltr' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={17}
                                fill={star <= rev.rating ? '#F59E0B' : '#E2E8F0'}
                                color={star <= rev.rating ? '#F59E0B' : '#CBD5E1'}
                              />
                            ))}
                          </div>

                          {/* Status Badge */}
                          <span style={{
                            background: isHidden ? '#F1F5F9' : '#DCFCE7',
                            color: isHidden ? '#64748B' : '#16A34A',
                            border: isHidden ? '1px solid #CBD5E1' : '1px solid #BBF7D0',
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '0.76rem',
                            fontWeight: 800
                          }}>
                            {isHidden ? 'مخفي عن المتجر' : 'ظاهر في المتجر'}
                          </span>
                        </div>
                      </div>

                      {/* Product Tag */}
                      {rev.productTitle && (
                        <div>
                          <span style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            color: '#475569',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <Package size={13} /> {rev.productTitle}
                          </span>
                        </div>
                      )}

                      {/* Comment Body */}
                      <p style={{
                        margin: 0,
                        fontSize: '0.98rem',
                        lineHeight: 1.6,
                        color: '#334155',
                        background: '#F8FAFC',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        border: '1px solid #F1F5F9'
                      }}>
                        "{rev.comment}"
                      </p>

                      {/* Action Buttons: Hide/Show + Delete */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                        {/* Toggle Hide/Show Button */}
                        <button
                          onClick={() => handleToggleReviewStatus(rev.id)}
                          style={{
                            background: isHidden ? '#FEF3C7' : '#F1F5F9',
                            color: isHidden ? '#B45309' : '#475569',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isHidden ? (
                            <>
                              <Eye size={15} /> إظهار في المتجر للزبائن
                            </>
                          ) : (
                            <>
                              <EyeOff size={15} /> إخفاء عن المتجر
                            </>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteConfirmReviewId(rev.id)}
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Trash2 size={15} /> حذف نهائي
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: '#FFF',
                padding: '60px 20px',
                borderRadius: '20px',
                textAlign: 'center',
                color: '#64748B',
                border: '1px solid #E2E8F0'
              }}>
                <MessageSquare size={48} color="#CBD5E1" style={{ marginBottom: '14px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px', color: '#1E293B' }}>
                  لم يتم العثور على آراء أو تعليقات
                </h4>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  تأكد من شروط البحث أو الفلتر المختار
                </p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: PRODUCT FULL DETAILS (SIZES & STOCK)        */}
      {/* ---------------------------------------------------- */}
      {selectedProductDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFF',
            borderRadius: '24px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#6B1D2F', fontWeight: 800 }}>تفاصيل المخزون الكاملة</span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#1E293B' }}>
                  {selectedProductDetails.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Variants Stock Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Array.isArray(selectedProductDetails.colorVariants) && selectedProductDetails.colorVariants.map((cv, idx) => (
                <div key={idx} style={{
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {cv.image && (
                        <img src={cv.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                      )}
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>
                        اللون: {cv.name || cv.color || `خيار #${idx + 1}`}
                      </h4>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                    {cv.stock && Object.entries(cv.stock).map(([sz, qty]) => {
                      const numQ = Number(qty) || 0;
                      return (
                        <div key={sz} style={{
                          background: numQ === 0 ? '#FEE2E2' : '#FFF',
                          border: numQ === 0 ? '1px solid #FECACA' : '1px solid #CBD5E1',
                          borderRadius: '10px',
                          padding: '8px',
                          textAlign: 'center'
                        }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>
                            {sz}
                          </span>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: numQ === 0 ? '#DC2626' : '#1E293B' }}>
                            {numQ}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                onClick={() => setSelectedProductDetails(null)}
                style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  background: '#6B1D2F',
                  color: '#FFF',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: ORDER FULL DETAILS                          */}
      {/* ---------------------------------------------------- */}
      {selectedOrderDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFF',
            borderRadius: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#6B1D2F', fontWeight: 800 }}>
                  تذكرة #{selectedOrderDetails.ticketNumber || selectedOrderDetails.id}
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#1E293B' }}>
                  معلومات الطلبية
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer Details */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.78rem' }}>الزبون:</span>
                  <strong>{selectedOrderDetails.clientName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.78rem' }}>الهاتف:</span>
                  <strong>{selectedOrderDetails.phone}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.78rem' }}>الولاية والبلدية:</span>
                  <strong>{selectedOrderDetails.wilaya} - {selectedOrderDetails.commune}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.78rem' }}>طريقة التوصيل:</span>
                  <strong>{selectedOrderDetails.deliveryMode || 'توصيل للمنزل'}</strong>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>المنتجات في الطرد:</h4>
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                  {selectedOrderDetails.product}
                </p>
              </div>
            </div>

            {/* Total Price */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FDF2F4', padding: '16px 20px', borderRadius: '16px', border: '1px solid #FBCFE8', marginBottom: '20px' }}>
              <span style={{ fontWeight: 800, color: '#6B1D2F' }}>المبلغ الإجمالي المطلوب من الزبون:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#6B1D2F' }}>
                {Number(selectedOrderDetails.price || 0).toLocaleString()} دج
              </span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  background: '#6B1D2F',
                  color: '#FFF',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: CONFIRM DELETE REVIEW MODAL                 */}
      {/* ---------------------------------------------------- */}
      {deleteConfirmReviewId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFF',
            borderRadius: '24px',
            maxWidth: '420px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInUp 0.25s ease-out',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash2 size={30} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 900, color: '#1E293B' }}>
              حذف التقييم نهائياً؟
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748B', lineHeight: 1.5 }}>
              هل أنت متأكد من حذف هذا التعليق نهائياً؟ لا يمكن التراجع عن هذه الخطوة بعد الحذف.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirmReviewId(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteReview(deleteConfirmReviewId)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#DC2626',
                  color: '#FFF',
                  border: 'none',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Smooth Transitions & Animations */}
      <style>{`
        .tab-pane-fade {
          animation: tabFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes tabFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
