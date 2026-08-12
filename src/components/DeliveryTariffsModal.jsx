import React, { useState, useMemo } from 'react';
import { CHLEF_DELIVERY_RATES, CHLEF_DEPARTURE_WILAYA } from '../data/algeriaDeliveryRates';
import { Search, X, Truck, Building2, MapPin, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export default function DeliveryTariffsModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWilaya, setExpandedWilaya] = useState(null);

  const filteredWilayas = useMemo(() => {
    if (!searchQuery.trim()) return CHLEF_DELIVERY_RATES;
    const q = searchQuery.toLowerCase().trim();
    return CHLEF_DELIVERY_RATES.filter(w => 
      w.code.includes(q) || 
      w.name.toLowerCase().includes(q) || 
      w.nameAr.includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="tariffs-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="tariffs-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(135deg, #1C0812 0%, #2D0C1C 100%)', color: '#FFFFFF', padding: '24px', position: 'relative' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.8rem' }}>🚚</span>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#FFFFFF' }}>
                Tarifs de livraison par wilaya / أسعار التوصيل 58 ولاية
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#FDA4AF', margin: 0, fontWeight: 700 }}>
                أسعار رسمية محدثة لجميع الولايات الجزائرية
              </p>
            </div>
          </div>

          {/* Departure Wilaya Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(225, 29, 72, 0.25)', border: '1px solid rgba(225, 29, 72, 0.5)', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800, marginTop: '10px' }}>
            <MapPin size={16} color="#F87171" />
            <span>ولاية الانطلاق (Départ): <b>02 - {CHLEF_DEPARTURE_WILAYA.name} ({CHLEF_DEPARTURE_WILAYA.nameAr})</b></span>
          </div>
        </div>

        {/* Feature Highlights Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <Truck size={20} color="#800020" />
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>Livraison à domicile</h4>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>التوصيل إلى باب المنزل</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <Building2 size={20} color="#0284C7" />
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>Livraison au bureau</h4>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>الاستلام من المكتب (Stopdesk)</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <ShieldCheck size={20} color="#16A34A" />
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>Transporteurs agréés</h4>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Yalidine & ZR Express</span>
            </div>
          </div>
        </div>

        {/* Live Search Input */}
        <div style={{ padding: '16px 24px 8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="ابحث عن ولايتك بالاسم أو الرقم (ex: 16, Alger, Oran, الشلف...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 42px 12px 16px',
                borderRadius: '14px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.92rem',
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Wilayas Accordion List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredWilayas.map((wilaya) => {
              const isExpanded = expandedWilaya === wilaya.code;
              return (
                <div 
                  key={wilaya.code}
                  style={{
                    border: isExpanded ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedWilaya(isExpanded ? null : wilaya.code)}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      background: isExpanded ? '#FFF1F2' : '#FFFFFF',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ background: '#800020', color: '#FFF', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900 }}>
                        {wilaya.code}
                      </span>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1E293B' }}>
                        {wilaya.code} - {wilaya.name} ({wilaya.nameAr})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.8rem', background: '#F1F5F9', padding: '4px 10px', borderRadius: '9999px', color: '#475569', fontWeight: 700 }}>
                        {wilaya.options.length} خيارات توصيل
                      </span>
                      {isExpanded ? <ChevronUp size={18} color="#E11D48" /> : <ChevronDown size={18} color="#64748B" />}
                    </div>
                  </button>

                  {/* Options Details Grid */}
                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px dashed #FDA4AF', background: '#FAFAFA' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        {wilaya.options.map((opt, idx) => (
                          <div 
                            key={idx}
                            style={{
                              background: '#FFFFFF',
                              padding: '14px',
                              borderRadius: '12px',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: opt.provider.includes('Yalidine') ? '#800020' : '#0284C7' }}>
                                {opt.provider}
                              </span>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: opt.type === 'À domicile' ? '#FEF2F2' : '#F0F9FF', color: opt.type === 'À domicile' ? '#991B1B' : '#075985', fontWeight: 800 }}>
                                {opt.type === 'À domicile' ? '🏠 المنزل' : '🏢 المكتب'}
                              </span>
                            </div>

                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#E11D48', margin: '4px 0 2px' }}>
                              {opt.price} DA
                            </div>

                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {opt.note}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
