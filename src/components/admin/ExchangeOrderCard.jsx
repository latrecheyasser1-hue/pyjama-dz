import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ZoomIn, 
  Truck, 
  CreditCard, 
  Copy, 
  MessageCircle, 
  RotateCcw 
} from 'lucide-react';

export default function ExchangeOrderCard({
  order,
  idx = 0,
  isProcessing = false,
  onApprove,
  onReject,
  onToggleIstilam,
  onToggleArchive,
  onOpenPhotoModal,
  onCopy
}) {
  const isRetour = Boolean(order.isRetour);
  const rawPhone = String(order.phone || '').replace(/\D/g, '');
  const intlPhone = rawPhone.startsWith('213') ? rawPhone : (rawPhone.startsWith('0') ? '213' + rawPhone.slice(1) : '213' + rawPhone);
  const waLink = `https://wa.me/${intlPhone}`;

  const formattedRip = order.baridiMobRip && order.baridiMobRip.length === 20
    ? `${order.baridiMobRip.slice(0, 4)} ${order.baridiMobRip.slice(4, 8)} ${order.baridiMobRip.slice(8, 12)} ${order.baridiMobRip.slice(12, 16)} ${order.baridiMobRip.slice(16, 20)}`
    : order.baridiMobRip;

  const isApproved = order.approvalState === 'approved';
  const isPending = order.approvalState === 'pending';
  const isRejected = order.approvalState === 'rejected';

  // Visual status framing
  let cardBorder = '1px solid #E2E8F0';
  let cardShadow = '0 4px 14px rgba(0,0,0,0.02)';
  let headerBg = '#F8FAFC';

  if (order.isArchived) {
    cardBorder = '2px solid #86EFAC';
    cardShadow = '0 6px 20px rgba(22, 163, 74, 0.08)';
    headerBg = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)';
  } else if (isApproved) {
    if (order.isTamIstilam) {
      cardBorder = '2.5px solid #16A34A';
      cardShadow = '0 6px 22px rgba(22, 163, 74, 0.15)';
      headerBg = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)';
    } else {
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
      style={{
        background: '#FFF',
        borderRadius: '24px',
        border: cardBorder,
        boxShadow: cardShadow,
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Archive Ribbon if order is archived */}
      {order.isArchived && (
        <div style={{
          background: isRetour
            ? 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)'
            : 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
          color: '#FFFFFF',
          padding: '9px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.86rem',
          fontWeight: 900
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={17} />
            <span>
              {isRetour
                ? 'طلب استرجاع مؤرشف ومكتمل — تم استلام الطرد وتأكيد تحويل المستحقات عبر بريدي موب 💳✨'
                : 'طلب استبدال مؤرشف ومكتمل — تم تسوية الطلب واستلام الطرد بالمحل بنجاح 📦🔄'}
            </span>
          </span>
          {order.refundPaidAt && (
            <span style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.25)', padding: '3px 10px', borderRadius: '8px' }}>
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
            background: isRetour ? '#991B1B' : 'var(--burgundy-dark)',
            color: '#FFF',
            padding: '4px 12px',
            borderRadius: '10px',
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: '0.88rem'
          }}>
            #{order.ticketNumber || order.id?.slice(0, 10) || (isRetour ? 'RET' : 'ECH')}
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

          {onCopy && (
            <button
              type="button"
              onClick={() => onCopy(order.phone, 'رقم الهاتف')}
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
          )}
        </div>

        {/* Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isApproved && (
            <>
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
                <span>{isRetour ? 'طلب استرجاع مقبول' : 'طلب استبدال مقبول'} {order.trackingNumber ? `(${order.trackingNumber})` : ''}</span>
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
                  <strong style={{ color: '#C2410C' }}>{Number(order.oldPrice || 0).toLocaleString('ar-DZ')} دج</strong>
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
                  onClick={() => onOpenPhotoModal && onOpenPhotoModal(order.photo)}
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
          {isRetour ? (
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
                      {onCopy && (
                        <button
                          type="button"
                          onClick={() => onCopy(order.baridiMobRip, 'رقم الـ RIP')}
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
                      )}
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

                {(!order.replacementItems || order.replacementItems.length === 0) ? (
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

        {/* Financial Breakdown */}
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
              <strong style={{ fontSize: '1rem', color: '#475569' }}>{Number(order.oldPrice || 0).toLocaleString('ar-DZ')} دج</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>
                مصاريف التوصيل {order.isDefect ? '🛡️ (على المحل)' : (isRetour ? '🚚 (مخصومة من المسترد)' : '🚚 (على الزبون)')}
              </span>
              <strong style={{ 
                fontSize: '1rem', 
                color: order.isDefect ? '#059669' : (isRetour ? '#D97706' : '#475569'),
                fontWeight: 800
              }}>
                {order.isDefect ? '0 دج (مجاني - عيب مصنعي) 🛡️' : `${(Number(order.deliveryFee) || 500).toLocaleString('ar-DZ')} دج (${isRetour ? 'مخصومة من المسترد' : 'على الزبون'})`}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', fontWeight: 700 }}>المبلغ الصافي للتحصيل (COD)</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--burgundy)', fontWeight: 900 }}>
                {isRetour ? '0 دج (استرجاع - بدون تحصيل)' : `${Number(order.price || order.totalPrice || 0).toLocaleString('ar-DZ')} دج`}
              </strong>
            </div>

            {order.refundDue > 0 && (
              <div style={{ background: '#DCFCE7', padding: '6px 14px', borderRadius: '12px', border: '1px solid #86EFAC' }}>
                <span style={{ fontSize: '0.78rem', color: '#166534', display: 'block', fontWeight: 800 }}>
                  {isRetour ? 'المبلغ المسترد للزبون عبر بريدي موب 💳' : 'فارق السعر المستحق للزبون 💳'}
                </span>
                <strong style={{ fontSize: '1.1rem', color: '#15803D', fontWeight: 900 }}>
                  {Number(order.refundDue).toLocaleString('ar-DZ')} دج
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
              {onCopy && (
                <button
                  type="button"
                  onClick={() => onCopy(order.baridiMobRip, 'رقم الـ RIP')}
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
              )}
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
                {onCopy && (
                  <button
                    type="button"
                    onClick={() => onCopy(order.trackingNumber, 'رقم التتبع')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B'
                    }}
                  >
                    <Copy size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Decision Buttons for Pending */}
          {order.approvalState === 'pending' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onReject && onReject(order)}
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
                onClick={() => onApprove && onApprove(order)}
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
                    ? (isRetour ? 'جاري تأكيد الاسترجاع...' : 'جاري إنشاء الشحنة...') 
                    : (isRetour ? 'قبول وتأكيد الاسترجاع ✅' : 'قبول وتأكيد الشحن الآن 🚚')}
                </span>
              </button>
            </div>
          ) : order.approvalState === 'approved' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
              {/* Receipt status text */}
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
                      ? (isRetour ? 'تم استلام طرد الاسترجاع في المحل بنجاح' : 'تم استلام طرد الاستبدال من شركة التوصيل') 
                      : (isRetour ? 'طرد الاسترجاع في الطريق (لم يتم الاستلام بالمحل بعد)' : 'طرد الاستبدال مع شركة التوصيل (لم يتم الاستلام بالمحل بعد)')}
                  </span>
                </span>
              </div>

              {/* Action Toggle Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!order.isTamIstilam ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onToggleIstilam && onToggleIstilam(order)}
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

                    {/* Restore to active button ONLY if order is currently archived */}
                    {order.isArchived && onToggleArchive && (
                      <button
                        type="button"
                        onClick={() => onToggleArchive(order)}
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
}
