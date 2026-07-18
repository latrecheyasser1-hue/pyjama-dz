import React, { useState } from 'react';
import { Package, Search, LogOut, CheckCircle2, RotateCcw, Clock, Box, ShieldCheck, ArrowLeft, Delete, Truck } from 'lucide-react';
import { showToast } from '../utils/toast';

export default function EmballagePOS({ settings = {}, products = [], orders = [], onUpdateStatus, onGoBack }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('pyjama_dz_embalage_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [activeTab, setActiveTab] = useState('livraison'); // livraison, gros, history
  const [searchQuery, setSearchQuery] = useState('');

  const validPin = settings?.cashierPin || '0000';

  const handlePinLogin = (e) => {
    if (e) e.preventDefault();
    if (pinInput === validPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('pyjama_dz_embalage_auth', 'true');
      setPinError(false);
      setPinInput('');
      showToast('✅ تم الدخول بنجاح!', 'success');
    } else {
      setPinError(true);
      showToast('❌ الرمز السري غير صحيح!', 'error');
    }
  };

  const handleKeypadPress = (num) => {
    if (pinInput.length < 6) {
      setPinInput(prev => prev + num);
      setPinError(false);
    }
  };

  const handleBackspace = () => setPinInput(prev => prev.slice(0, -1));

  const handleLogout = () => {
    sessionStorage.removeItem('pyjama_dz_embalage_auth');
    setIsAuthenticated(false);
  };

  // Keyboard support for PIN pad
  React.useEffect(() => {
    if (isAuthenticated) return;

    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handlePinLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, pinInput, validPin]);

  // Filter Logic
  const confirmedLivraison = orders.filter(o => 
    o.status === 'confirmee' && 
    (!o.product || !o.product.includes('(جملة')) &&
    o.deliveryMode !== 'pos'
  );

  const confirmedGros = orders.filter(o => 
    o.status === 'confirmee' && 
    o.product && o.product.includes('(جملة') &&
    o.deliveryMode !== 'pos'
  );

  const historyOrders = orders.filter(o => 
    o.deliveryMode !== 'pos' && 
    (o.status === 'emballee' || o.status === 'expediee' || o.status === 'livree' || o.status === 'retour' || o.status === 'annulee')
  );

  const displayedOrders = (() => {
    let base = [];
    if (activeTab === 'livraison') base = confirmedLivraison;
    if (activeTab === 'gros') base = confirmedGros;
    if (activeTab === 'history') base = historyOrders;

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const isNumber = /^\d+$/.test(q);
      
      base = base.filter(o => {
        const ticketStr = o.ticketNumber ? String(o.ticketNumber) : String(o.id).substring(0, 8);
        
        // Exact ticket match first
        if (ticketStr === q) return true;

        // If user typed a short number (like "2" or "18"), they want an exact ticket.
        // Don't fall back to partial phone matching, otherwise "2" matches every phone with a "2".
        if (isNumber && q.length < 8) {
          return false;
        }

        // For long numbers (like 10-digit phones) or text (like names), do partial matching
        return (
          (o.clientName && o.clientName.toLowerCase().includes(q)) ||
          (o.phone && o.phone.includes(q))
        );
      });
    }
    return base.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  })();

  const handleEmballer = (orderId) => {
    onUpdateStatus(orderId, 'emballee', false);
    showToast('✅ تم تغليف الطلبية بنجاح!', 'success');
  };

  const handleRetour = (orderId) => {
    if (window.confirm('هل أنت متأكد من استرجاع هذه الطلبية؟ سيتم إعادة المخزون.')) {
      onUpdateStatus(orderId, 'retour', true);
      showToast('📦 تم استرجاع الطلبية بنجاح!', 'success');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F1EA', padding: '20px' }}>
        <div style={{ background: '#FFF', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--burgundy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Package size={40} color="#FFF" />
          </div>
          <h2 style={{ color: 'var(--burgundy)', margin: '0 0 10px', fontSize: '24px', fontWeight: 800 }}>فريق التغليف</h2>
          <p style={{ color: '#666', margin: '0 0 30px' }}>أدخل الرمز السري للمتابعة</p>

          <form onSubmit={handlePinLogin}>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ width: '45px', height: '55px', border: `2px solid ${pinError ? '#ef4444' : pinInput.length > i ? 'var(--burgundy)' : '#E5E7EB'}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'var(--burgundy)', background: pinInput.length > i ? '#FDF8F5' : '#FFF', transition: 'all 0.2s' }}>
                  {pinInput[i] ? '•' : ''}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button key={num} type="button" onClick={() => handleKeypadPress(num.toString())} style={{ padding: '15px', fontSize: '20px', fontWeight: 600, background: '#F9FAFB', border: 'none', borderRadius: '12px', color: '#1F2937', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {num}
                </button>
              ))}
              <button type="button" onClick={() => setPinInput('')} style={{ padding: '15px', fontSize: '16px', fontWeight: 600, background: '#FEF2F2', border: 'none', borderRadius: '12px', color: '#EF4444', cursor: 'pointer' }}>
                مسح
              </button>
              <button type="button" onClick={() => handleKeypadPress('0')} style={{ padding: '15px', fontSize: '20px', fontWeight: 600, background: '#F9FAFB', border: 'none', borderRadius: '12px', color: '#1F2937', cursor: 'pointer' }}>
                0
              </button>
              <button type="button" onClick={handleBackspace} style={{ padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', border: 'none', borderRadius: '12px', color: '#1F2937', cursor: 'pointer' }}>
                <Delete size={24} />
              </button>
            </div>

            <button type="submit" style={{ width: '100%', padding: '16px', background: 'var(--burgundy)', color: '#FFF', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <ShieldCheck size={24} /> دخول
            </button>
          </form>
          
          <button onClick={onGoBack} style={{ width: '100%', padding: '16px', background: 'transparent', color: '#666', border: 'none', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            <ArrowLeft size={20} /> العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F1EA', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <header style={{ background: '#FFF', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: 'var(--burgundy)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} color="#FFF" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: 'var(--burgundy)', fontWeight: 800 }}>قسم التغليف (Emballage)</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>إدارة وتجهيز الطلبيات المؤكدة</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
          <LogOut size={18} /> خروج
        </button>
      </header>

      <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '5px' }}>
          <button onClick={() => setActiveTab('livraison')} style={{ flex: 1, minWidth: '200px', padding: '20px', background: activeTab === 'livraison' ? 'var(--burgundy)' : '#FFF', color: activeTab === 'livraison' ? '#FFF' : '#333', border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <Truck size={30} color={activeTab === 'livraison' ? '#FFF' : 'var(--burgundy)'} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>طلبيات التوصيل</span>
            <span style={{ background: activeTab === 'livraison' ? 'rgba(255,255,255,0.2)' : '#F3F4F6', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 600 }}>{confirmedLivraison.length}</span>
          </button>

          <button onClick={() => setActiveTab('gros')} style={{ flex: 1, minWidth: '200px', padding: '20px', background: activeTab === 'gros' ? 'var(--burgundy)' : '#FFF', color: activeTab === 'gros' ? '#FFF' : '#333', border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <Box size={30} color={activeTab === 'gros' ? '#FFF' : 'var(--burgundy)'} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>طلبيات الجملة</span>
            <span style={{ background: activeTab === 'gros' ? 'rgba(255,255,255,0.2)' : '#F3F4F6', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 600 }}>{confirmedGros.length}</span>
          </button>

          <button onClick={() => setActiveTab('history')} style={{ flex: 1, minWidth: '200px', padding: '20px', background: activeTab === 'history' ? 'var(--burgundy)' : '#FFF', color: activeTab === 'history' ? '#FFF' : '#333', border: 'none', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <Clock size={30} color={activeTab === 'history' ? '#FFF' : 'var(--burgundy)'} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>سجل الطلبيات</span>
            <span style={{ background: activeTab === 'history' ? 'rgba(255,255,255,0.2)' : '#F3F4F6', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 600 }}>{historyOrders.length}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ background: '#FFF', padding: '20px', borderRadius: '16px', marginBottom: '30px', display: 'flex', gap: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} color="#9CA3AF" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="ابحث برقم الطلبية، اسم الزبون، أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '15px 45px 15px 15px', border: '2px solid #F3F4F6', borderRadius: '12px', fontSize: '16px', outline: 'none' }}
            />
          </div>
        </div>

        {/* Orders List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {displayedOrders.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: '16px', border: '2px dashed #E5E7EB' }}>
              <Package size={60} color="#D1D5DB" style={{ margin: '0 auto 20px' }} />
              <h3 style={{ margin: '0 0 10px', color: '#4B5563', fontSize: '20px' }}>لا توجد طلبيات حالياً</h3>
              <p style={{ margin: 0, color: '#9CA3AF' }}>الطلبيات المؤكدة ستظهر هنا لتغليفها</p>
            </div>
          ) : (
            displayedOrders.map(order => (
              <div key={order.id} style={{ background: '#FFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', background: 'var(--burgundy)', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>#{order.ticketNumber || String(order.id).substring(0, 8)}</div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                    {new Date(order.date).toLocaleDateString('ar-DZ')}
                  </div>
                </div>
                
                <div style={{ padding: '20px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '5px' }}>معلومات الزبون</div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1F2937' }}>{order.clientName}</div>
                      <div style={{ color: '#4B5563', fontSize: '15px' }}>{order.phone}</div>
                      <div style={{ color: '#6B7280', fontSize: '14px', marginTop: '5px' }}>{order.wilaya} - {order.commune}</div>
                    </div>

                    {/* Product Images Block removed */}
                  </div>

                  <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '15px' }}>
                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '10px' }}>المنتجات</div>
                    {order.items ? (
                      order.items.map((item, idx) => {
                        const p = products.find(prod => prod.id === item.productId || prod.title === item.product);
                        let imgUrl = p?.images?.[0] || p?.image || null;
                        if (p?.colorVariants && item.color) {
                          const colorIndex = p.colorVariants.findIndex(cv => cv.color === item.color);
                          if (colorIndex !== -1 && p.images && p.images[colorIndex]) {
                            imgUrl = p.images[colorIndex];
                          }
                        }

                        return (
                          <div key={idx} style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              {imgUrl && (
                                <img src={imgUrl} alt={item.product} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                              )}
                              <div>
                                <div style={{ fontWeight: 'bold', color: '#1F2937' }}>{item.product}</div>
                                {(item.color || item.size) && (
                                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                                    {item.color && item.color !== 'Standard' && <span>اللون: {item.color} </span>}
                                    {item.size && item.size !== 'Standard' && <span>| المقاس: {item.size}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ background: 'var(--burgundy)', color: '#FFF', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                              {item.qty}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', fontWeight: 'bold', color: '#1F2937' }}>
                        {order.product}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '15px 20px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '10px' }}>
                  {(activeTab === 'livraison' || activeTab === 'gros') ? (
                    <button 
                      onClick={() => handleEmballer(order.id)}
                      style={{ flex: 1, padding: '14px', background: 'var(--burgundy)', color: '#FFF', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' }}
                      onMouseOver={(e) => e.target.style.opacity = '0.9'}
                      onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                      <CheckCircle2 size={20} /> تمت التعبئة (Emballer)
                    </button>
                  ) : (
                    <>
                      <div style={{ flex: 1, padding: '14px', background: '#E5E7EB', color: '#4B5563', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
                        {order.status === 'emballee' && '📦 مغلفة'}
                        {order.status === 'expediee' && '🚚 مشحونة'}
                        {order.status === 'livree' && '✅ تم التوصيل'}
                        {order.status === 'retour' && '↩️ مسترجعة'}
                        {order.status === 'annulee' && '❌ ملغاة'}
                      </div>
                      
                      {order.status !== 'retour' && order.status !== 'annulee' && (
                        <button 
                          onClick={() => handleRetour(order.id)}
                          style={{ padding: '14px 20px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                        >
                          <RotateCcw size={20} /> استرجاع
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
