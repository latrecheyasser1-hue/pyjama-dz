import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Printer, CheckCircle2, Store, Search, Plus, Trash2, X, ShoppingBag } from 'lucide-react';
import { getClientReputation } from '../../utils/reputation';

export default function OrdersTab({ orders, products = [], settings, onPlaceOrder, onUpdateProduct, onUpdateStatus, onOpenPos }) {
  const [printingOrder, setPrintingOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState('livraison');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

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

  // Active orders: orders where archived is false, OR (archived is undefined and status is 'nouvelle')
  const activeOrders = orders.filter(o => o.archived === false || (o.archived === undefined && o.status === 'nouvelle'));

  const grosOrders = activeOrders.filter(o => {
    return (o.product && o.product.includes('(جملة -')) || 
           (o.clientName && o.clientName.includes('(واتساب:')) ||
           (o.items && o.items.some(it => it.size === 'Série'));
  });

  const hanoutOrders = activeOrders.filter(o => o.isPos === true || o.clientName === 'زبون المحل (بيع حضوري)' || o.commune === 'المتجر الحضوري');

  const livraisonOrders = activeOrders.filter(o => 
    !grosOrders.some(go => go.id === o.id) && !hanoutOrders.some(ho => ho.id === o.id)
  );

  const displayOrders = orderFilter === 'gros' ? grosOrders : (orderFilter === 'hanout' ? hanoutOrders : livraisonOrders);

  const handleConfirmAction = (order) => {
    if (order.status === 'confirmee') {
      // Confirm and Print
      onUpdateStatus(order.id, 'confirmee', true);
      setPrintingOrder(order);
    } else if (order.status === 'annulee') {
      // Confirm Cancellation
      onUpdateStatus(order.id, 'annulee', true);
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
          <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem' }}>
            ● قيد الانتظار ({displayOrders.length} طلبية)
          </div>
        </div>
      </div>

      {/* Sub-tabs for separating Livraison and Gros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>
        <button
          onClick={() => setOrderFilter('livraison')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.92rem',
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
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.92rem',
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
              {displayOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    لا توجد طلبيات جديدة بانتظار المعالجة.
                  </td>
                </tr>
              ) : (
                displayOrders.map(order => (
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
                    <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{order.clientName}</td>
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
                    <td style={{ fontWeight: 800, color: 'var(--burgundy)', fontSize: '0.95rem' }}>
                      {(Number(order.price) || 0).toLocaleString()} DA
                    </td>
                    <td>
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={order.status}
                        onChange={(e) => onUpdateStatus(order.id, e.target.value, false)}
                        className={`status-badge status-${order.status}`}
                        style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-primary)', fontWeight: 800 }}
                      >
                        <option value="nouvelle">🆕 جديدة (Nouvelle)</option>
                        <option value="confirmee">📞 مؤكدة (Confirmée)</option>
                        <option value="annulee">❌ ملغاة (Annulée)</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {order.status === 'nouvelle' && (
                          <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>👈 حدد الحالة</span>
                        )}

                        {order.status === 'confirmee' && (
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
                            <Printer size={16} />
                            <span>تأكيد وطباعة</span>
                          </button>
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
                  {/* Ticket Header */}
                  <div style={{ textAlign: 'center', borderBottom: '2px dashed #333', paddingBottom: '12px', marginBottom: '12px' }}>
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
                              <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{((it.price || 0) * (it.qty || it.quantity || 1)).toLocaleString()} د.ج</td>
                            </tr>
                          ))
                        ) : (
                          <tr style={{ borderBottom: '1.5px dashed #aaa' }}>
                            <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{printingOrder.product}</td>
                            <td style={{ padding: '8px 4px' }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{printingOrder.color || '—'}</span></td>
                            <td style={{ padding: '8px 4px', fontWeight: 800 }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{printingOrder.size}</span></td>
                            <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{(printingOrder.price || 0).toLocaleString()} د.ج</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Discount if exists */}
                  {(printingOrder.discount > 0 || printingOrder.remise > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#D32F2F', marginBottom: '8px' }}>
                      <span>تخفيض للزبون (Remise):</span>
                      <span style={{ direction: 'ltr' }}>- {(printingOrder.discount || printingOrder.remise || 0).toLocaleString()} د.ج</span>
                    </div>
                  )}

                  {/* Total */}
                  <table style={{ width: '100%', fontSize: '1.2rem', fontWeight: 900, borderTop: '2px dashed #333', marginTop: '8px', marginBottom: '8px' }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingTop: '12px', border: 'none', textAlign: 'right' }}>{isPosOrder ? 'المجموع الإجمالي:' : 'المجموع الإجمالي للدفع:'}</td>
                        <td style={{ paddingTop: '12px', border: 'none', textAlign: 'left', direction: 'ltr' }}>{(printingOrder.totalPrice || printingOrder.price || 0).toLocaleString()} د.ج</td>
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

            {/* Order Items Section */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1E293B', fontSize: '1rem', fontWeight: 800 }}>
                🛍️ المنتجات المطلوبة (Ordered Items)
              </h4>
              
              {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrderDetails.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#1E293B', display: 'block' }}>{item.product}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          اللون: <strong>{item.color || 'Standard'}</strong> | المقاس: <strong>{item.size || 'Standard'}</strong>
                        </span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'block' }}>
                          {item.qty} × {Number(item.price || 0).toLocaleString()} DA
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--burgundy)' }}>
                          {(Number(item.qty || 1) * Number(item.price || 0)).toLocaleString()} DA
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444', marginBottom: 8 }}>
                    الخصم: <strong>-{(Number(selectedOrderDetails.discount) || 0).toLocaleString()} DA</strong>
                  </div>
                )}
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>المبلغ الإجمالي المستحق:</span>
              </div>
              <strong style={{ fontSize: '1.4rem', color: 'var(--burgundy)', fontWeight: 900 }}>
                {Number(selectedOrderDetails.price || 0).toLocaleString()} DA
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
