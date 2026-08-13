import React, { useState, useEffect } from 'react';
import { ArrowRight, Package, MapPin, Heart, LogOut, ExternalLink, CheckCircle2, Clock, Truck, ShieldAlert, RefreshCw, ShoppingBag, Building2 } from 'lucide-react';
import { getCustomerOrders, updateCustomerProfile, setCustomerSession } from '../services/customerService';
import { ALGERIA_WILAYAS } from '../data/mockData';
import { getCommunesForWilaya } from '../data/algeriaCities';

export default function CustomerDashboardPage({ customer, onBackToStore, onLogout, onReorder, wishlist = [], onToggleWishlist, onSelectProduct }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'address', 'favorites'
  
  // Orders & Loading
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Address fields
  const [wilaya, setWilaya] = useState(customer?.wilaya || '');
  const [commune, setCommune] = useState(customer?.commune || '');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState('');

  useEffect(() => {
    if (customer?.phone) {
      setWilaya(customer.wilaya || '');
      setCommune(customer.commune || '');
      fetchOrders();
    }
  }, [customer]);

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

  if (!customer) return null;

  const communesList = wilaya ? getCommunesForWilaya(wilaya) : [];

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('livre') || s.includes('تم التسليم') || s.includes('مستلمة') || s.includes('استلام')) {
      return { text: 'مستلمة ✅', bg: '#DCFCE7', color: '#15803D', icon: CheckCircle2, step: 4 };
    }
    if (s.includes('bureau') || s.includes('stopdesk') || s.includes('centre') || s.includes('مكتب') || s.includes('واصل')) {
      return { text: 'واصل في المكتب 🏢', bg: '#E0F2FE', color: '#0369A1', icon: Building2, step: 3 };
    }
    if (s.includes('expedie') || s.includes('transit') || s.includes('شحن') || s.includes('طريق')) {
      return { text: 'تم الشحن وفي الطريق 🚚', bg: '#DBEAFE', color: '#1D4ED8', icon: Truck, step: 2 };
    }
    if (s.includes('confirme') || s.includes('تأكيد') || s.includes('تجهيز')) {
      return { text: 'قيد التحضير والتجهيز 📦', bg: '#FEF3C7', color: '#B45309', icon: Package, step: 1 };
    }
    if (s.includes('annul') || s.includes('إلغاء') || s.includes('مغلقة')) {
      return { text: 'ملغاة ⚠️', bg: '#FEE2E2', color: '#B91C1C', icon: ShieldAlert, step: 0 };
    }
    return { text: 'قيد التأكيد 🕒', bg: '#F3E8FF', color: '#6B21A8', icon: Clock, step: 1 };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-arabic, system-ui, sans-serif)', color: '#0F172A' }}>
      
      {/* Top Standalone Navigation Header */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          type="button"
          onClick={onBackToStore}
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '10px 18px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
        >
          <ArrowRight size={18} />
          العودة للمتجر / Retour
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#881337', margin: 0 }}>
            Pyjama DZ - بيجامات الجزائر
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>لوحة حسابي الشخصية</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setCustomerSession(null);
            if (onLogout) onLogout();
          }}
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: '640px', overflow: 'hidden', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)', border: '1px solid #E2E8F0' }}>
          
          {/* Header User Profile Banner */}
          <div style={{ background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', padding: '28px 24px 20px', color: '#FFFFFF' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 6px' }}>
              مرحباً بكِ، {customer.full_name || 'زبوننا العزيز'} 👋
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#FFE4E6', opacity: 0.95 }}>
              📱 رقم الهاتف: {customer.phone}
            </p>

            {/* Dashboard Tabs (3 Tabs ONLY: Orders, Address, Favorites) */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', background: 'rgba(0, 0, 0, 0.15)', padding: '4px', borderRadius: '14px' }}>
              {[
                { id: 'orders', label: '📦 طلبياتي', icon: Package },
                { id: 'address', label: '📍 عنواني', icon: MapPin },
                { id: 'favorites', label: '❤️ المفضلة', icon: Heart }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ flex: 1, padding: '12px 10px', borderRadius: '10px', border: 'none', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', background: isActive ? '#FFFFFF' : 'transparent', color: isActive ? '#881337' : '#FFFFFF' }}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Body */}
          <div style={{ padding: '24px' }}>
            
            {/* TAB 1: ORDERS */}
            {activeTab === 'orders' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, color: '#1E293B' }}>
                    تتبع الطلبيات المباشر ({orders.length})
                  </h3>
                  <button 
                    onClick={fetchOrders}
                    style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', padding: '6px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
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

                      // Calculate clean displayed order number matching System/Admin numeric ID (e.g. 341, 333, 331, 326)
                      let displayOrderNum = '';
                      if (order.ticketNumber && !isNaN(order.ticketNumber)) {
                        displayOrderNum = String(order.ticketNumber);
                      } else if (order.order_number && !isNaN(order.order_number)) {
                        displayOrderNum = String(order.order_number);
                      } else if (order.orderNum && !isNaN(order.orderNum)) {
                        displayOrderNum = String(order.orderNum);
                      } else if (order.id && /^\d+$/.test(String(order.id).trim())) {
                        displayOrderNum = String(order.id).trim();
                      } else if (order.id) {
                        const digitsOnly = String(order.id).replace(/\D/g, '');
                        displayOrderNum = digitsOnly ? String(parseInt(digitsOnly.slice(-4), 10) || 1) : String(orders.length - idx);
                      } else {
                        displayOrderNum = String(orders.length - idx);
                      }

                      // Parse items list
                      let itemsList = order.items || order.cartItems || [];
                      if (typeof itemsList === 'string') {
                        try { itemsList = JSON.parse(itemsList); } catch (e) { itemsList = []; }
                      }
                      if (!Array.isArray(itemsList) || itemsList.length === 0) {
                        if (order.product) {
                          itemsList = [{
                            title: order.product,
                            size: order.size || order.selectedSize || '',
                            color: order.color || order.selectedColor || '',
                            qty: order.qty || order.quantity || 1,
                            price: order.price || order.total_price || order.totalPrice || 0,
                            image: order.image || order.product_image || ''
                          }];
                        }
                      }

                      return (
                        <div key={order.id || idx} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '18px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#881337', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>طلب رقم</span>
                              <span dir="ltr" style={{ direction: 'ltr', display: 'inline-block' }}>#{displayOrderNum}</span>
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700 }}>{order.created_at ? new Date(order.created_at).toLocaleDateString('ar-DZ') : ''}</span>
                          </div>

                          {/* Detailed Ordered Items List ONLY */}
                          {itemsList.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0', background: '#F8FAFC', padding: '12px', borderRadius: '14px', border: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                                🛍️ تفاصيل المنتجات المطلوبــة ({itemsList.length}):
                              </span>
                              {itemsList.map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', padding: '10px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                  {item.image || item.image_url ? (
                                    <img src={item.image || item.image_url} alt={item.title || item.name} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #E2E8F0' }} />
                                  ) : (
                                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BE123C' }}>
                                      <ShoppingBag size={22} />
                                    </div>
                                  )}
                                  
                                  <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 4px', color: '#1E293B' }}>
                                      {item.title || item.name || order.product || 'بيجامة فاخرة'}
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                      {(item.size || item.selectedSize) && (
                                        <span style={{ background: '#FFF1F2', color: '#BE123C', padding: '2px 8px', borderRadius: '6px' }}>
                                          المقاس: {item.size || item.selectedSize}
                                        </span>
                                      )}
                                      {(item.color || item.selectedColor) && (
                                        <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                                          اللون: {item.color || item.selectedColor}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'left' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                                      الكمية: {item.qty || item.quantity || 1}
                                    </span>
                                    {item.price && (
                                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
                                        {item.price} دج
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ADDRESS MANAGEMENT */}
            {activeTab === 'address' && (
              <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', padding: '14px 16px', borderRadius: '14px', fontSize: '0.88rem', color: '#9F1239', fontWeight: 800 }}>
                  💡 احفظي ولايتكِ وبلديتكِ هنا ليتم إدخالها تلقائياً عند طلب أي بيجامة في المتجر!
                </div>

                {addressMsg && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px 14px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 800 }}>
                    {addressMsg}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>الولاية *</label>
                  <select
                    value={wilaya}
                    onChange={(e) => { setWilaya(e.target.value); setCommune(''); }}
                    style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="">اختر الولاية...</option>
                    {ALGERIA_WILAYAS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>البلدية *</label>
                  <select
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    disabled={!wilaya}
                    style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
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
                  style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                >
                  {savingAddress ? <RefreshCw className="spin" size={20} /> : <CheckCircle2 size={20} />}
                  حفظ العنوان المفضل ✅
                </button>
              </form>
            )}

            {/* TAB 3: FAVORITES */}
            {activeTab === 'favorites' && (
              <div>
                {!wishlist || wishlist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', background: '#F8FAFC', borderRadius: '20px', border: '1px dashed #CBD5E1' }}>
                    <Heart size={44} color="#BE123C" style={{ margin: '0 auto 14px', display: 'block' }} />
                    <p style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#334155' }}>قائمة بيجاماتكِ المفضلة فارغة حالياً ❤️</p>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>اضغطي على القلوب فوق صور البيجامات في المتجر لحفظها هنا والرجوع إليها في أي وقت!</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, color: '#1E293B' }}>
                        المنتجات المفضلة لديكِ ({wishlist.length})
                      </h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                      {wishlist.map(product => (
                        <div key={product.id} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onToggleWishlist) onToggleWishlist(product);
                            }}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255, 255, 255, 0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                            title="إزالة من المفضلة"
                          >
                            <Heart size={18} fill="#E53935" color="#E53935" />
                          </button>

                          <img 
                            src={product.image || (Array.isArray(product.images) && product.images[0]) || ''} 
                            alt={product.title || product.name} 
                            style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                          />

                          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                            <div>
                              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 6px', color: '#1E293B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {product.title || product.name}
                              </h4>
                              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#881337', display: 'block', marginBottom: '10px' }}>
                                {product.price} دج
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (onBackToStore) onBackToStore();
                                if (onSelectProduct) onSelectProduct(product);
                              }}
                              style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              طلب الآن 🛍️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

    </div>
  );
}
