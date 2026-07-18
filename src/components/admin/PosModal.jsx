import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Store, Search, Plus, Trash2, X, Printer, ShoppingBag } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function PosModal({
  show,
  onClose,
  products = [],
  settings,
  posCart = [],
  setPosCart,
  addProductToPosCart,
  onPlaceOrder,
  onUpdateProduct
}) {
  const [posSearch, setPosSearch] = useState('');
  const [posDiscount, setPosDiscount] = useState(0);
  const [posPaymentMode, setPosPaymentMode] = useState('دفع كامل (زبون حضوري)');
  const [posClientName, setPosClientName] = useState('زبون المحل (بيع حضوري)');
  const [posClientPhone, setPosClientPhone] = useState('0000000000');
  const [printingOrder, setPrintingOrder] = useState(null);

  if (!show && !printingOrder) return null;

  const filteredPosProducts = products.filter(p => {
    if (!p.category || !p.category.startsWith('boutique__')) return false;
    
    const q = posSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.title && p.title.toLowerCase().startsWith(q)) ||
      (p.category && p.category.toLowerCase().startsWith(q)) ||
      (p.barcode && String(p.barcode).startsWith(q))
    );
  });

  const handleUpdatePosItem = (index, field, value) => {
    setPosCart(prevCart => {
      const updated = [...prevCart];
      const item = { ...updated[index] };
      item[field] = value;

      // If color changed, update size to first available size in new color
      if (field === 'color') {
        const matchedCol = item._productRef?.colorVariants?.find(cv => cv.color === value);
        if (matchedCol && matchedCol.stock) {
          const sizes = Object.keys(matchedCol.stock);
          if (sizes.length > 0 && !sizes.includes(item.size)) {
            item.size = sizes[0];
          }
        }
      }

      // If price or qty changed, recalculate total
      if (field === 'price' || field === 'qty') {
        const p = Number(field === 'price' ? value : item.price) || 0;
        const q = Math.max(0, Number(field === 'qty' ? value : item.qty) || 0);
        item.total = p * q;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemovePosItem = (idx) => {
    setPosCart(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmPosOrder = (e) => {
    if (e) e.preventDefault();
    const activeCart = posCart.filter(it => (Number(it.qty) || 0) > 0);
    if (activeCart.length === 0) {
      showToast("⚠️ الرجاء إضافة منتج واحد على الأقل بكمية أكبر من 0 للطلب", 'warning');
      return;
    }

    const cartSubtotal = activeCart.reduce((acc, it) => acc + (it.total || 0), 0);
    const finalTotal = Math.max(0, cartSubtotal - (Number(posDiscount) || 0));

    // Deduct stock if possible
    activeCart.forEach(it => {
      const prodToUpdate = products.find(p => p.id === it.productId) || 
                           products.find(p => p.title === it.product && p.category && p.category.startsWith('boutique__'));
      if (prodToUpdate && onUpdateProduct && prodToUpdate.colorVariants) {
        const updatedVariants = prodToUpdate.colorVariants.map(cv => {
          if (cv.color === it.color && cv.stock && cv.stock[it.size] !== undefined) {
            return {
              ...cv,
              stock: {
                ...cv.stock,
                [it.size]: Math.max(0, cv.stock[it.size] - (Number(it.qty) || 1))
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

    const newOrder = {
      id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
      isPos: true,
      clientName: posClientName || 'زبون المحل (بيع حضوري)',
      phone: posClientPhone || '0000000000',
      wilaya: 'الجزائر العاصمة',
      commune: 'المتجر الحضوري',
      deliveryMode: posPaymentMode,
      product: activeCart.length === 1 && activeCart[0].color && activeCart[0].color !== 'Standard' ? `${activeCart[0].product} (${activeCart[0].color})` : activeCart.map(it => `${it.product}`).join(' + '),
      size: activeCart.length === 1 ? (activeCart[0].qty > 1 ? `${activeCart[0].size} (x${activeCart[0].qty})` : activeCart[0].size) : activeCart.map(it => `${it.size} (x${it.qty})`).join(', '),
      price: finalTotal,
      items: activeCart,
      discount: Number(posDiscount) || 0,
      status: 'confirmee',
      archived: true,
      createdAt: new Date().toISOString()
    };

    if (onPlaceOrder) {
      onPlaceOrder(newOrder);
    }
    
    // Close modal & reset
    setPosCart([]);
    setPosDiscount(0);
    setPosSearch('');
    setPosClientName('زبون المحل (بيع حضوري)');
    setPosClientPhone('0000000000');

    // Open printing ticket immediately
    setPrintingOrder(newOrder);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const triggerPrint = () => {
    window.print();
  };

  return createPortal(
    <>
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

      {/* POS Modal */}
      {show && (
        <div className="modal-overlay no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 999999, padding: '30px 16px', overflowY: 'auto' }}>
          <div className="modal-content animate-scale" style={{ background: '#FFF', borderRadius: '20px', width: '100%', maxWidth: '950px', maxHeight: 'calc(100vh - 60px)', margin: 'auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border-light)' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'var(--burgundy-dark)', color: 'white', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--rose-primary)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>🏬 بيع حضوري في المحل (POS - نقطة بيع ذكية)</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--champagne)' }}>امسح بالكود بار في أي لحظة أو اختر من القائمة لإضافة المنتجات مباشرة</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
              
              {/* Step 1: Search & Pick Product */}
              <div style={{ marginBottom: '24px', background: '#FAF8F5', padding: '16px', borderRadius: '14px', border: '1px solid #EFEAE6' }}>
                <label style={{ display: 'block', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: '10px', fontSize: '0.95rem' }}>
                  1. ابحث باسم المنتج أو امسح بالكود بار (Scanner ou Rechercher) :
                </label>
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                  <input
                    type="text"
                    placeholder="امسح بالكود بار هنا أو ابحث باسم المنتج (مثال: فستان، بيجاما ساتان)..."
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 42px 10px 14px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-primary)' }}
                  />
                </div>

                {/* Products List Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', maxHeight: '170px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredPosProducts.map(prod => (
                    <div
                      key={prod.id}
                      onClick={() => addProductToPosCart(prod)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px',
                        borderRadius: '10px',
                        background: '#FFF',
                        border: '1px solid #E5E5E5',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--burgundy)'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                    >
                      <img src={(prod.images && prod.images.length > 0 ? prod.images[0] : prod.image) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f1f5f9'/%3E%3Ctext x='400' y='400' font-family='sans-serif' font-size='40' font-weight='bold' fill='%2394a3b8' text-anchor='middle' dominant-baseline='middle'%3ESans%20Image%3C/text%3E%3C/svg%3E"} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#222' }}>
                          {prod.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--burgundy-dark)' }}>
                          {prod.price?.toLocaleString()} DA
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Cart Table (Direct customization) */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: '10px', fontSize: '0.95rem' }}>
                  2. المنتجات المضافة للطلب ({posCart.length}) - يمكنك تعديل المقاس واللون والكمية مباشرة :
                </label>
                {posCart.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#FAF8F5', borderRadius: '12px', color: '#888', fontWeight: 600, border: '1px dashed #DDD' }}>
                    🛒 لم تقم بإضافة أي منتج للطلب بعد. امسح بالكود بار أو اختر منتجاً من الأعلى ليتم إضافته فوراً.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #E5E5E5', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                      <thead style={{ background: '#F5EBE6', color: 'var(--burgundy-dark)', fontWeight: 800 }}>
                        <tr>
                          <th style={{ padding: '10px 12px' }}>المنتج</th>
                          <th style={{ padding: '10px 12px' }}>اللون (Couleur)</th>
                          <th style={{ padding: '10px 12px' }}>المقاس (Taille)</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>سعر الوحدة</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية (Qty)</th>
                          <th style={{ padding: '10px 12px' }}>المجموع</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posCart.map((it, idx) => {
                          const prodRef = it._productRef || products.find(p => p.id === it.productId);
                          const colorVariants = prodRef?.colorVariants || [];
                          const matchedCol = colorVariants.find(cv => cv.color === it.color);
                          const availSizes = matchedCol?.stock ? Object.keys(matchedCol.stock) : (prodRef?.sizes || ['Standard']);
                          const itemImg = it.image || (prodRef?.images && prodRef.images.length > 0 ? prodRef.images[0] : prodRef?.image);

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #EEE' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {itemImg && <img src={itemImg} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />}
                                  <span>{it.product}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {colorVariants.length > 0 ? (
                                  <select
                                    value={it.color}
                                    onChange={(e) => handleUpdatePosItem(idx, 'color', e.target.value)}
                                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #CCC', fontWeight: 700, fontSize: '0.8rem', background: '#FFF' }}
                                  >
                                    {colorVariants.map(cv => (
                                      <option key={cv.color} value={cv.color}>{cv.color}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span style={{ fontWeight: 700, color: '#666' }}>{it.color}</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <select
                                  value={it.size}
                                  onChange={(e) => handleUpdatePosItem(idx, 'size', e.target.value)}
                                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #CCC', fontWeight: 800, fontSize: '0.8rem', background: 'var(--rose-light)', color: 'var(--burgundy-dark)' }}
                                >
                                  {availSizes.map(sz => {
                                    const rem = matchedCol?.stock ? matchedCol.stock[sz] : null;
                                    return (
                                      <option key={sz} value={sz}>
                                        {sz} {rem !== null ? `(باقي ${rem})` : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  value={it.price}
                                  onChange={(e) => handleUpdatePosItem(idx, 'price', e.target.value)}
                                  style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #CCC', fontWeight: 800, textAlign: 'center' }}
                                />
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePosItem(idx, 'qty', Math.max(0, (Number(it.qty) || 0) - 1))}
                                    style={{ width: 26, height: 26, borderRadius: 6, background: '#E0E0E0', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                                  >-</button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={it.qty}
                                    onChange={(e) => handleUpdatePosItem(idx, 'qty', e.target.value)}
                                    style={{ width: '45px', padding: '4px', textAlign: 'center', borderRadius: 6, border: '1px solid #CCC', fontWeight: 800, background: Number(it.qty) === 0 ? '#FFEBEE' : '#FFF', color: Number(it.qty) === 0 ? '#D32F2F' : '#000' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePosItem(idx, 'qty', (Number(it.qty) || 0) + 1)}
                                    style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--burgundy)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                                  >+</button>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 900, color: 'var(--burgundy)' }}>
                                {((Number(it.price) || 0) * (Number(it.qty) || 0)).toLocaleString()} DA
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePosItem(idx)}
                                  style={{ background: '#FFEBEE', color: '#D32F2F', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Step 3: Order Details & Checkout */}
              <div style={{ background: '#FAF8F5', padding: '18px', borderRadius: '14px', border: '1px solid #EFEAE6' }}>
                <label style={{ display: 'block', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: '12px', fontSize: '0.95rem' }}>
                  3. التخفيض وتأكيد البيع (Remise & Paiement) :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>تخفيض للزبون (Remise DA):</label>
                    <input
                      type="number"
                      min="0"
                      value={posDiscount}
                      onChange={(e) => setPosDiscount(e.target.value)}
                      placeholder="0"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '1rem', fontWeight: 800, color: '#D32F2F' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>طريقة الدفع:</label>
                    <select
                      value={posPaymentMode}
                      onChange={(e) => setPosPaymentMode(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.95rem', fontWeight: 700 }}
                    >
                      <option value="دفع كامل (زبون حضوري)">دفع كامل (زبون حضوري)</option>
                      <option value="نقداً (Espece)">نقداً (Espèce)</option>
                      <option value="بطاقة الدفع (CIB/Edahabia)">بطاقة الدفع (CIB/Edahabia)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>اسم الزبون (اختياري):</label>
                    <input
                      type="text"
                      value={posClientName}
                      onChange={(e) => setPosClientName(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.9rem', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>رقم الهاتف (اختياري):</label>
                    <input
                      type="text"
                      value={posClientPhone}
                      onChange={(e) => setPosClientPhone(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #DDD', fontSize: '0.9rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Final Total Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E5E5E5' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#333' }}>
                    المجموع الإجمالي للطلب :
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1F8A55' }}>
                    {Math.max(0, posCart.reduce((acc, it) => acc + (it.total || 0), 0) - (Number(posDiscount) || 0)).toLocaleString()} DA
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ background: '#F9F9F9', padding: '16px 24px', borderTop: '1px solid #EEE', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #CCC', background: '#FFF', color: '#555', fontWeight: 800, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmPosOrder}
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--burgundy)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', boxShadow: '0 4px 14px rgba(139,48,70,0.3)' }}
              >
                <Printer size={18} />
                <span>✅ تأكيد وطبع الوصل (Valider & Imprimer)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Receipt Printing Modal (POS) */}
      {printingOrder && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999999, padding: '20px' }}>
          <div className="receipt-print-modal animate-scale" style={{ background: '#FFF', width: '100%', maxWidth: '380px', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: '1px solid #DDD', color: '#000', fontFamily: 'monospace, sans-serif' }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '14px', marginBottom: '14px' }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>PYJAMA DZ</h2>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>تذكرة بيع حضوري (Ticket POS)</div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>{new Date().toLocaleString('ar-DZ')}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', background: '#F0F0F0', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                رقم الوصل: #{printingOrder.ticketNumber || printingOrder.id?.slice(-4)}
              </div>
            </div>

            {/* Client info */}
            <div style={{ fontSize: '0.8rem', marginBottom: '12px', lineHeight: '1.5' }}>
              <div><strong>الزبون:</strong> {printingOrder.clientName}</div>
              <div><strong>الهاتف:</strong> <span style={{ direction: 'ltr', display: 'inline-block' }}>{printingOrder.phone}</span></div>
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
                        <td style={{ padding: '8px 4px' }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{it.color || '—'}</span></td>
                        <td style={{ padding: '8px 4px', fontWeight: 800 }}><span style={{ direction: 'ltr', display: 'inline-block' }}>{it.size} {it.qty > 1 ? `(x${it.qty})` : ''}</span></td>
                        <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, direction: 'ltr' }}>{((it.price || 0) * (it.qty || 1)).toLocaleString()} د.ج</td>
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
            {(printingOrder.discount > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#D32F2F', marginBottom: '8px' }}>
                <span>تخفيض للزبون (Remise):</span>
                <span style={{ direction: 'ltr' }}>- {(printingOrder.discount || 0).toLocaleString()} د.ج</span>
              </div>
            )}

            {/* Total */}
            <table style={{ width: '100%', fontSize: '1.2rem', fontWeight: 900, borderTop: '2px dashed #333', marginTop: '8px', marginBottom: '8px' }}>
              <tbody>
                <tr>
                  <td style={{ paddingTop: '12px', border: 'none', textAlign: 'right' }}>المجموع الإجمالي:</td>
                  <td style={{ paddingTop: '12px', border: 'none', textAlign: 'left', direction: 'ltr' }}>{(printingOrder.price || 0).toLocaleString()} د.ج</td>
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

            {/* Buttons (No print) */}
            <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={triggerPrint}
                style={{ flex: 1, background: '#000', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>🖨️ طباعة التذكرة (Ticket)</span>
              </button>
              <button
                type="button"
                onClick={() => { setPrintingOrder(null); onClose(); }}
                style={{ background: '#E5E5E5', color: '#333', border: 'none', padding: '12px 18px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  , document.body);
}
