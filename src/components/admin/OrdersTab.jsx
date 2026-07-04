import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Printer, CheckCircle2, Store, Search, Plus, Trash2, X, ShoppingBag } from 'lucide-react';

export default function OrdersTab({ orders, products = [], settings, onPlaceOrder, onUpdateProduct, onUpdateStatus, onOpenPos }) {
  const [printingOrder, setPrintingOrder] = useState(null);

  // Active orders: orders where archived is false, OR (archived is undefined and status is 'nouvelle')
  const activeOrders = orders.filter(o => o.archived === false || (o.archived === undefined && o.status === 'nouvelle'));

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
          <button
            onClick={() => onOpenPos && onOpenPos()}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, var(--burgundy), #6b2135)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(139,48,70,0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Store size={18} />
            <span>🏬 بيع حضوري في المحل (POS)</span>
          </button>
          <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem' }}>
            ● قيد الانتظار ({activeOrders.length} طلبية)
          </div>
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
              {activeOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    لا توجد طلبيات جديدة بانتظار المعالجة.
                  </td>
                </tr>
              ) : (
                activeOrders.map(order => (
                  <tr key={order.id} style={{ background: order.status === 'nouvelle' ? '#FFFDF9' : 'white' }}>
                    <td style={{ fontWeight: 700 }}>
                      {order.ticketNumber || order.id}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {order.date || (order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : "À l'instant")}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{order.clientName}</td>
                    <td>
                      <a 
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
                      {order.price.toLocaleString()} DA
                    </td>
                    <td>
                      <select
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {order.status === 'nouvelle' && (
                          <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>👈 حدد الحالة</span>
                        )}

                        {order.status === 'confirmee' && (
                          <button
                            onClick={() => handleConfirmAction(order)}
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
                            onClick={() => handleConfirmAction(order)}
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
                    <div style={{ fontSize: '0.8rem', fontWeight: isPosOrder ? 800 : 500, color: isPosOrder ? '#000' : '#555', marginTop: '4px' }}>
                      {isPosOrder ? '✨ وصل شراء حضوري من المتجر ✨' : 'توصيل لجميع ولايات الجزائر (58 ولاية)'}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '8px', direction: 'ltr' }}>
                      رقم الوصل: #{printingOrder.ticketNumber || printingOrder.id}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>
                      التاريخ: {printingOrder.date || new Date().toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {/* Client Info */}
                  <div style={{ marginBottom: '12px', fontSize: '0.85rem', lineHeight: '1.8', borderBottom: '2px dashed #333', paddingBottom: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '6px', color: '#000' }}>
                      {isPosOrder ? 'معلومات الشراء الحضوري:' : 'معلومات الزبونة:'}
                    </div>
                    <div><strong>{isPosOrder ? 'الزبون:' : 'الاسم واللقب:'}</strong> {isPosOrder ? (printingOrder.clientName !== 'زبون المحل (بيع حضوري)' ? `شراء حضوري (${printingOrder.clientName})` : 'شراء حضوري مباشر من المحل') : (printingOrder.clientInfo?.fullName || printingOrder.clientName || 'زبون')}</div>
                    {(printingOrder.clientInfo?.phone || printingOrder.phone) && (printingOrder.clientInfo?.phone || printingOrder.phone) !== '0000000000' && (
                      <div><strong>رقم الهاتف:</strong> <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: 800 }}>{printingOrder.clientInfo?.phone || printingOrder.phone}</span></div>
                    )}
                    {!isPosOrder && (
                      <>
                        <div><strong>الولاية والبلدية:</strong> {printingOrder.clientInfo?.wilaya || printingOrder.wilaya || ''} ({printingOrder.clientInfo?.commune || printingOrder.commune || ''})</div>
                        <div><strong>طريقة التوصيل:</strong> {printingOrder.clientInfo?.deliveryType === 'home' || printingOrder.deliveryMode === 'توصيل للمنزل' ? 'توصيل للمنزل' : 'توصيل للمكتب / نقطة استلام'}</div>
                      </>
                    )}
                  </div>

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: 900, borderBottom: '2px dashed #333', paddingBottom: '12px', marginBottom: '12px' }}>
                    <span>{isPosOrder ? 'المجموع الإجمالي:' : 'المجموع الإجمالي للدفع:'}</span>
                    <span style={{ direction: 'ltr' }}>{(printingOrder.totalPrice || printingOrder.price || 0).toLocaleString()} د.ج</span>
                  </div>

                  {/* Notice Box */}
                  <div style={{ border: '1.5px dashed #444', borderRadius: '8px', padding: '8px', textAlign: 'center', fontSize: '0.75rem', lineHeight: '1.6', marginBottom: '14px', background: '#F9F9F9' }}>
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
      )}


    </div>
  );
}
