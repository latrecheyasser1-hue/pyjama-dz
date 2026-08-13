import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Heart, Bell, LogOut, ExternalLink, CheckCircle2, Clock, Truck, ShieldAlert, RefreshCw, ShoppingBag } from 'lucide-react';
import { getCustomerOrders, updateCustomerProfile, setCustomerSession } from '../services/customerService';
import { ALGERIA_WILAYAS } from '../data/mockData';
import { getCommunesForWilaya } from '../data/algeriaCities';

export default function CustomerDashboardModal({ isOpen, onClose, customer, onLogout, onReorder }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'address', 'favorites', 'alerts'
  
  // Orders & Loading
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Address fields
  const [wilaya, setWilaya] = useState(customer?.wilaya || '');
  const [commune, setCommune] = useState(customer?.commune || '');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState('');

  useEffect(() => {
    if (isOpen && customer?.phone) {
      setWilaya(customer.wilaya || '');
      setCommune(customer.commune || '');
      fetchOrders();
    }
  }, [isOpen, customer]);

  const fetchOrders = async () => {
    if (!customer?.phone) return;
    setLoadingOrders(true);
    try {
      const data = await getCustomerOrders(customer.phone);
      setOrders(data);
    } catch (e) {
      console.warn('Error fetching orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    setAddressMsg('');
    try {
      await updateCustomerProfile(customer.phone, { wilaya, commune });
      setAddressMsg('تم حفظ العنوان بنجاح! سيتم تعبئته تلقائياً عند الطلب 🎉');
      setTimeout(() => setAddressMsg(''), 3000);
    } catch (e) {
      setAddressMsg('حدث خطأ أثناء حفظ العنوان');
    } finally {
      setSavingAddress(false);
    }
  };

  if (!isOpen || !customer) return null;

  const communesList = wilaya ? getCommunesForWilaya(wilaya) : [];

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('livre') || s.includes('تم التسليم') || s.includes('تسليم')) {
      return { text: 'تم التسليم بنجاح ✅', bg: '#DCFCE7', color: '#15803D', icon: CheckCircle2, step: 4 };
    }
    if (s.includes('expedie') || s.includes('شحن') || s.includes('طريق')) {
      return { text: 'تم الشحن وفي الطريق 🚚', bg: '#DBEAFE', color: '#1D4ED8', icon: Truck, step: 3 };
    }
    if (s.includes('confirme') || s.includes('تأكيد') || s.includes('تجهيز')) {
      return { text: 'قيد التحضير والتجهيز 📦', bg: '#FEF3C7', color: '#B45309', icon: Package, step: 2 };
    }
    if (s.includes('annul') || s.includes('إلغاء') || s.includes('مغلقة')) {
      return { text: 'ملغاة ⚠️', bg: '#FEE2E2', color: '#B91C1C', icon: ShieldAlert, step: 0 };
    }
    return { text: 'قيد التأكيد 🕒', bg: '#F3E8FF', color: '#6B21A8', icon: Clock, step: 1 };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', padding: '24px 20px 16px', color: '#FFFFFF', position: 'relative' }}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#FFFFFF', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '40px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', fontFamily: 'var(--font-arabic, sans-serif)' }}>
                مرحباً بكِ، {customer.full_name || 'زبوننا العزيز'} 👋
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#FFE4E6', opacity: 0.9 }}>
                📱 {customer.phone}
              </span>
            </div>

            <button
              onClick={() => {
                setCustomerSession(null);
                if (onLogout) onLogout();
                onClose();
              }}
              style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} /> خروج
            </button>
          </div>

          {/* Dashboard Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'orders', label: '📦 طلبياتي', icon: Package },
              { id: 'address', label: '📍 عنواني', icon: MapPin },
              { id: 'favorites', label: '❤️ المفضلة', icon: Heart },
              { id: 'alerts', label: '🔔 التنبيهات', icon: Bell }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ flex: 1, minWidth: '100px', padding: '10px 8px', borderRadius: '12px', border: 'none', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s', background: isActive ? '#FFFFFF' : 'rgba(0, 0, 0, 0.15)', color: isActive ? '#881337' : '#FFFFFF' }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          
          {/* TAB 1: ORDERS HISTORY & SUIVI */}
          {activeTab === 'orders' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>
                  تتبع الطلبيات المباشر ({orders.length})
                </h3>
                <button 
                  onClick={fetchOrders}
                  style={{ background: '#F1F5F9', border: 'none', color: '#475569', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={14} className={loadingOrders ? 'spin' : ''} /> تحديث
                </button>
              </div>

              {loadingOrders ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                  <RefreshCw className="spin" size={28} style={{ margin: '0 auto 10px', display: 'block' }} />
                  جاري جلب طلبياتكِ...
                </div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                  <ShoppingBag size={40} color="#94A3B8" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: '#334155' }}>لا توجد طلبيات مسجلة بعد</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>تصفحي المتجر واختاري أفضل بيجامات الجزائر لطلبها بنقرة واحدة!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {orders.map((order, idx) => {
                    const badge = getStatusBadge(order.status);
                    const StatusIcon = badge.icon;
                    const trackingNum = order.tracking_number || order.trackingNumber;

                    return (
                      <div key={order.id || idx} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>طلب رقم #{order.id?.slice(0, 8) || idx + 1}</span>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{order.created_at ? new Date(order.created_at).toLocaleDateString('ar-DZ') : ''}</div>
                          </div>
                          <span style={{ background: badge.bg, color: badge.color, padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <StatusIcon size={14} />
                            {badge.text}
                          </span>
                        </div>

                        {/* Real-time Status Progress Bar */}
                        {badge.step > 0 && (
                          <div style={{ margin: '14px 0', background: '#F8FAFC', padding: '10px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                              <span>قيد التأكيد 🕒</span>
                              <span>قيد التجهيز 📦</span>
                              <span>في الطريق 🚚</span>
                              <span>تم التسليم ✅</span>
                            </div>
                            <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${(badge.step / 4) * 100}%`, background: 'linear-gradient(90deg, #881337, #BE123C)', transition: 'width 0.4s ease' }} />
                            </div>
                          </div>
                        )}

                        {/* Items summary */}
                        <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700, marginBottom: '10px' }}>
                          📍 التوصيل إلى: {order.wilaya || ''} - {order.commune || ''}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed #E2E8F0' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#881337' }}>
                            المجموع: {order.total_price || order.totalPrice || order.total || 0} دج
                          </span>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            {trackingNum && (
                              <a
                                href={`https://yalidine.app/tracking/${trackingNum}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ background: '#EFF6FF', color: '#2563EB', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <ExternalLink size={12} /> تتبع الطرد
                              </a>
                            )}
                            <button
                              onClick={() => {
                                if (onReorder) onReorder(order);
                                onClose();
                              }}
                              style={{ background: '#FCE7F3', color: '#BE123C', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              إعادة الطلب 🛍️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADDRESS MANAGEMENT */}
          {activeTab === 'address' && (
            <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem', color: '#9F1239', fontWeight: 700 }}>
                💡 احفظي ولايتكِ وبلديتكِ هنا ليتم إدخالها تلقائياً عند طلب أي بيجامة في المتجر!
              </div>

              {addressMsg && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                  {addressMsg}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>الولاية *</label>
                <select
                  value={wilaya}
                  onChange={(e) => { setWilaya(e.target.value); setCommune(''); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                >
                  <option value="">اختر الولاية...</option>
                  {ALGERIA_WILAYAS.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>البلدية *</label>
                <select
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  disabled={!wilaya}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem', boxSizing: 'border-box' }}
                >
                  <option value="">اختر البلدية...</option>
                  {communesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={savingAddress}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', color: '#FFFFFF', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
              >
                {savingAddress ? <RefreshCw className="spin" size={18} /> : <CheckCircle2 size={18} />}
                حفظ العنوان المفضل ✅
              </button>
            </form>
          )}

          {/* TAB 3: FAVORITES */}
          {activeTab === 'favorites' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
              <Heart size={40} color="#BE123C" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: '#334155' }}>قائمة بيجاماتكِ المفضلة ❤️</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>اضغطي على القلوب فوق صور البيجامات في المتجر لحفظها هنا والرجوع إليها في أي وقت!</p>
            </div>
          )}

          {/* TAB 4: WAITLIST ALERTS */}
          {activeTab === 'alerts' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
              <Bell size={40} color="#25D366" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: '#334155' }}>تنبيهات توفر المخزون 💬</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>جميع المنتجات والمقاسات التي سجلتي فيها تصلكِ رسالة واتساب أوتوماتيكية فور توفرها مجدداً!</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
