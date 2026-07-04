import React, { useState } from 'react';
import { Search, Printer } from 'lucide-react';

export default function HistoryTab({ orders, products, settings, onUpdateProduct, onUpdateStatus }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printingOrder, setPrintingOrder] = useState(null);
  const [returnConfirmationId, setReturnConfirmationId] = useState(null);

  // Filter for archived orders (or old non-nouvelle orders)
  const archivedOrders = orders.filter(o => o.archived === true || (o.archived === undefined && o.status !== 'nouvelle'));

  const filteredOrders = archivedOrders.filter(o => {
    const searchLower = search.toLowerCase();
    const phoneMatches = o.phone && String(o.phone).toLowerCase().startsWith(searchLower);
    const idMatches = (o.ticketNumber && String(o.ticketNumber).toLowerCase().startsWith(searchLower)) || 
                      (o.id && String(o.id).toLowerCase().startsWith(searchLower));
    
    const matchesSearch = search === '' || phoneMatches || idMatches;
      
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const triggerPrint = () => {
    window.print();
  };

  const handleConfirmRetour = (order) => {
    // 1. Replenish stock
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const prodToUpdate = products.find(p => p.id === item.productId || p.title === item.product);
        if (prodToUpdate && prodToUpdate.colorVariants) {
          const updatedVariants = prodToUpdate.colorVariants.map(cv => {
            if (cv.color === item.color && cv.stock && cv.stock[item.size] !== undefined) {
              return {
                ...cv,
                stock: {
                  ...cv.stock,
                  [item.size]: cv.stock[item.size] + (Number(item.qty) || 1)
                }
              };
            }
            return cv;
          });
          onUpdateProduct({
            ...prodToUpdate,
            colorVariants: updatedVariants
          });
        }
      });
    }

    // 2. Change status to retour
    onUpdateStatus(order.id, 'retour', true);
    setReturnConfirmationId(null);
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
            📜 أرشيف وسجل الطلبيات المؤكدة والملغاة (Historique)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            الطلبيات التي تم تأكيدها أو إلغاؤها تنتقل تلقائياً إلى هذا الأرشيف.
          </p>
        </div>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--burgundy)' }}>
          إجمالي الأرشيف : {filteredOrders.length} طلبية
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
          <input
            type="text"
            placeholder="البحث برقم الهاتف (05...) أو رقم الطلبية (Ticket ID)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '44px' }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select" style={{ width: '220px', fontWeight: 800 }}>
          <option value="all">الكل (Tous les statuts)</option>
          <option value="confirmee">✅ مؤكدة (Confirmée)</option>
          <option value="annulee">❌ ملغاة (Annulée)</option>
          <option value="retour">↩️ إسترجاع (Retour)</option>
        </select>
      </div>

      {/* Archive Table */}
      <div className="table-container">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID & Date</th>
                <th>Client(e)</th>
                <th>Téléphone</th>
                <th>Wilaya / Commune</th>
                <th>Produit & Taille</th>
                <th>Montant</th>
                <th>الحالة (Statut)</th>
                <th style={{ minWidth: '150px', textAlign: 'center' }}>الإجراء (Action)</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>لا توجد طلبيات في الأرشيف مطابقة للبحث.</td></tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.ticketNumber || o.id}<div style={{ fontSize: '0.75rem', color: '#888' }}>{o.date || (o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : "À l'instant")}</div></td>
                    <td style={{ fontWeight: 700 }}>{o.clientName}</td>
                    <td style={{ fontWeight: 800, color: '#1F8A55' }}>{o.phone}</td>
                    <td><strong>{o.wilaya}</strong><div style={{ fontSize: '0.8rem', color: '#777' }}>{o.commune}</div></td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.product}
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#F5F5F5', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{o.size}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--burgundy)' }}>{o.price.toLocaleString()} DA</td>
                    <td>
                      {o.status === 'confirmee' ? (
                        <select
                          value={o.status}
                          onChange={(e) => {
                            if (e.target.value === 'retour') {
                              setReturnConfirmationId(o.id);
                            }
                          }}
                          className={`status-badge status-${o.status}`}
                          style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--font-primary)', fontWeight: 800, background: 'transparent' }}
                        >
                          <option value="confirmee">✅ مؤكدة (Confirmée)</option>
                          <option value="retour">↩️ إسترجاع (Retour)</option>
                        </select>
                      ) : (
                        <span className={`status-badge status-${o.status}`} style={{ fontWeight: 800 }}>
                          {o.status === 'annulee' && '❌ ملغاة (Annulée)'}
                          {o.status === 'retour' && '↩️ مسترجعة (Retour)'}
                          {o.status === 'livree' && '📦 مستلمة (Livrée)'}
                          {o.status !== 'annulee' && o.status !== 'retour' && o.status !== 'livree' && o.status}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {returnConfirmationId === o.id ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleConfirmRetour(o)}
                            style={{ background: '#EF4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            تأكيد الإسترجاع
                          </button>
                          <button
                            onClick={() => setReturnConfirmationId(null)}
                            style={{ background: '#E5E7EB', color: '#374151', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : o.status === 'confirmee' ? (
                        <button
                          onClick={() => setPrintingOrder(o)}
                          style={{
                            background: 'var(--burgundy)',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Printer size={15} />
                          <span>إعادة طباعة</span>
                        </button>
                      ) : (
                        <span style={{ color: '#CCC', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal (Ticket POS Style Centered) */}
      {printingOrder && (
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
            {/* Determine if order is POS */}
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
                      التاريخ: {printingOrder.date}
                    </div>
                  </div>

                  {/* Client Info */}
                  <div style={{ marginBottom: '12px', fontSize: '0.85rem', lineHeight: '1.8', borderBottom: '2px dashed #333', paddingBottom: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '6px', color: '#000' }}>
                      {isPosOrder ? 'معلومات الشراء الحضوري:' : 'معلومات الزبونة:'}
                    </div>
                    <div><strong>{isPosOrder ? 'الزبون:' : 'الاسم واللقب:'}</strong> {isPosOrder ? (printingOrder.clientName !== 'زبون المحل (بيع حضوري)' ? `شراء حضوري (${printingOrder.clientName})` : 'شراء حضوري مباشر من المحل') : printingOrder.clientName}</div>
                    {printingOrder.phone && printingOrder.phone !== '0000000000' && (
                      <div><strong>رقم الهاتف:</strong> <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: 800 }}>{printingOrder.phone}</span></div>
                    )}
                    {!isPosOrder && (
                      <>
                        <div><strong>الولاية والبلدية:</strong> {printingOrder.wilaya} ({printingOrder.commune})</div>
                        <div><strong>طريقة التوصيل:</strong> {printingOrder.deliveryMode || 'توصيل للمنزل'}</div>
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
                    <span>المجموع الإجمالي:</span>
                    <span style={{ direction: 'ltr' }}>{(printingOrder.price || 0).toLocaleString()} د.ج</span>
                  </div>
                </>
              );
            })() || null}

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

            {/* Buttons (No print) */}
            <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
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
        </div>
      )}
    </div>
  );
}
