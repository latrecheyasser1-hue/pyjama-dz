import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import Storefront from './components/Storefront';
import ToastContainer from './components/ToastContainer';
import CookieConsent from './components/CookieConsent';
import { supabase } from './lib/supabaseClient';
import { processOrderDelivery } from './services/deliveryApi';

import CashierPOS from './components/CashierPOS';
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const GrosStorefront = lazy(() => import('./components/GrosStorefront'));
const EmballagePOS = lazy(() => import('./components/EmballagePOS'));


const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
    oscillator.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.log('Audio error:', e);
  }
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('pyjama_products_cache');
      return cached ? JSON.parse(cached) : [];
    } catch(e) { return []; }
  });
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('pyjama_orders_cache');
      return cached ? JSON.parse(cached) : [];
    } catch(e) { return []; }
  });
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('pyjama_settings_cache');
      return cached ? JSON.parse(cached) : {};
    } catch(e) { return {}; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cachedProds = localStorage.getItem('pyjama_products_cache');
      return !cachedProds;
    } catch(e) { return true; }
  });

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    // Preload all page route bundles silently in background after 500ms for 0ms instant page transitions
    const preloadTimer = setTimeout(() => {
      import('./components/AdminDashboard').catch(() => {});
      import('./components/GrosStorefront').catch(() => {});
      import('./components/EmballagePOS').catch(() => {});
    }, 500);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(preloadTimer);
    };
  }, []);

  useEffect(() => {
    fetchInitialData();
    
    // Subscribe to real-time changes
    const productsSub = supabase.channel('products_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        fetchData('products', setProducts);
      }).subscribe();

    const ordersSub = supabase.channel('orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        fetchData('orders', setOrders);
      }).subscribe();

    const suppliersSub = supabase.channel('suppliers_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, payload => {
        fetchData('suppliers', setSuppliers);
      }).subscribe();

    const expensesSub = supabase.channel('expenses_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, payload => {
        fetchData('expenses', setExpenses);
      }).subscribe();

    const settingsSub = supabase.channel('settings_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
        fetchSettings();
      }).subscribe();

    // Fallback Polling (Every 3 seconds) to ensure orders, stock, and reclamations arrive instantly in real-time
    const pollInterval = setInterval(async () => {
      fetchData('products', setProducts);
      fetchSettings();
      
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setOrders(prev => {
          if (prev.length > 0 && data.length > prev.length) {
            playNotificationSound();
          }
          return data;
        });
      }
    }, 3000);

    return () => {
      supabase.removeChannel(productsSub);
      supabase.removeChannel(ordersSub);
      supabase.removeChannel(suppliersSub);
      supabase.removeChannel(expensesSub);
      supabase.removeChannel(settingsSub);
      clearInterval(pollInterval);
    };
  }, []);

  const fetchInitialData = async () => {
    // Instant unblock loading screen if cached data exists or in max 100ms
    setTimeout(() => setLoading(false), 100);

    // Fetch fresh data in parallel in background
    Promise.all([
      fetchData('products', setProducts),
      fetchSettings(),
      fetchData('orders', setOrders),
      fetchData('suppliers', setSuppliers),
      fetchData('expenses', setExpenses)
    ]).then(() => setLoading(false)).catch(err => {
      console.error('Initial data fetch error:', err);
      setLoading(false);
    });
  };

  const pendingUpdatesRef = useRef({});
  const updateDebounceRef = useRef({});

  const fetchData = async (table, setter) => {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (!error && data) {
      if (table === 'products') {
        try { localStorage.setItem('pyjama_products_cache', JSON.stringify(data)); } catch(e) {}
        const now = Date.now();
        setter(prev => {
          return data.map(dbProd => {
            const pending = pendingUpdatesRef.current[dbProd.id];
            if (pending && (now - pending.timestamp < 4000)) {
              return pending.product;
            }
            return dbProd;
          });
        });
      } else {
        if (table === 'orders') {
          try { localStorage.setItem('pyjama_orders_cache', JSON.stringify(data)); } catch(e) {}
        }
        setter(data);
      }
    }
  };

  const handleUpdateProduct = (updatedProd) => {
    const { id } = updatedProd;
    if (!id) return;

    const now = Date.now();
    pendingUpdatesRef.current[id] = { product: updatedProd, timestamp: now };

    // 1. Instant Optimistic Local Update (0ms lag!)
    setProducts(prev => prev.map(p => p.id === id ? updatedProd : p));

    // 2. Clear previous pending DB update for this product
    if (updateDebounceRef.current[id]) {
      clearTimeout(updateDebounceRef.current[id]);
    }

    // 3. Debounce background Supabase sync (250ms) to combine rapid + / - clicks into 1 single DB query
    updateDebounceRef.current[id] = setTimeout(async () => {
      try {
        const sanitizedProd = sanitizeProductForDb(updatedProd);
        const { data, error } = await supabase.from('products').update(sanitizedProd).eq('id', id).select();
        if (error) {
          console.error('Error updating product:', error);
        } else if (data && data.length > 0) {
          const finalProduct = { ...updatedProd, ...data[0] };
          pendingUpdatesRef.current[id] = { product: finalProduct, timestamp: Date.now() };
          setProducts(prev => prev.map(p => p.id === id ? finalProduct : p));

          setTimeout(() => {
            if (pendingUpdatesRef.current[id] && (Date.now() - pendingUpdatesRef.current[id].timestamp >= 3500)) {
              delete pendingUpdatesRef.current[id];
            }
          }, 4000);

          // Single source of truth trigger for low stock check
          fetch('/api/check-low-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: finalProduct })
          }).catch(err => console.error('Low stock check error:', err));
        }
      } catch (err) {
        console.error('Error in debounced product update:', err);
      }
    }, 250);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*');
    if (!error && data) {
      const obj = {};
      data.forEach(item => {
        if (item && item.key) {
          if (typeof item.value === 'string' && (item.value.trim().startsWith('[') || item.value.trim().startsWith('{'))) {
            try {
              obj[item.key] = JSON.parse(item.value);
            } catch (e) {
              obj[item.key] = item.value;
            }
          } else {
            obj[item.key] = item.value;
          }
        }
      });
      setSettings(prev => {
        const newSettings = { ...prev, ...obj };
        try { localStorage.setItem('pyjama_settings_cache', JSON.stringify(newSettings)); } catch(e) {}
        const prevRecs = Array.isArray(prev?.reclamations) ? prev.reclamations : [];
        const newRecs = Array.isArray(obj?.reclamations) ? obj.reclamations : [];
        if (prevRecs.length > 0 && newRecs.length > prevRecs.length) {
          try { playNotificationSound(); } catch(e) {}
        }
        return newSettings;
      });
    }
  };

  const sanitizeProductForDb = (prodObj) => {
    const validProductColumns = ['title', 'category', 'purchasePrice', 'price', 'oldPrice', 'supplier', 'images', 'barcode', 'description', 'colorVariants', 'stock', 'created_at'];
    const sanitized = {};
    validProductColumns.forEach(col => {
      if (prodObj && prodObj[col] !== undefined) {
        sanitized[col] = prodObj[col];
      }
    });
    return sanitized;
  };

  const handlePlaceOrder = async (newOrder) => {
    const { id, ...orderWithoutId } = newOrder;
    
    // Sanitise payload: only include valid DB columns of 'orders' table
    const validColumns = ['clientName', 'phone', 'wilaya', 'commune', 'deliveryMode', 'deliveryCompany', 'trackingNumber', 'shippingLabelUrl', 'product', 'price', 'quantity', 'status', 'archived', 'date', 'items'];
    const sanitizedOrder = {};
    validColumns.forEach(col => {
      if (orderWithoutId[col] !== undefined) {
        sanitizedOrder[col] = orderWithoutId[col];
      }
    });

    const { data: insertedOrder, error } = await supabase.from('orders').insert(sanitizedOrder).select().single();
    
    if (error) {
      console.error("Supabase Order Insert Error:", error);
    }
    
    if (!error) {
      setOrders(prev => [...prev, insertedOrder]);
      
      // Auto Send WhatsApp Confirmation to Customer via Serverless API
      try {
        const customerPhone = insertedOrder.whatsapp || insertedOrder.phone;
        if (customerPhone) {
          fetch('/api/send-order-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: customerPhone,
              clientName: insertedOrder.clientName || insertedOrder.nom,
              nom: insertedOrder.clientName || insertedOrder.nom,
              id: insertedOrder.id,
              wilaya: insertedOrder.wilaya,
              product: insertedOrder.product
            })
          }).catch(e => console.error("WhatsApp trigger error:", e));
        }
      } catch (err) {
        console.error("WhatsApp notification error:", err);
      }
      // Deduct stock and trigger low stock alerts for Storefront & POS orders
      if (newOrder.items) {
        for (const item of newOrder.items) {
          if (item.isDiscount) continue;

          const product = products.find(p => p.id === item.productId || (p.title && item.product && p.title.toLowerCase().trim() === item.product.toLowerCase().trim()));
          if (product) {
            let updatedPayload = {};
            let updatedProductObj = { ...product };
            const itemQty = Math.max(1, parseInt(item.qty) || 1);

            if (product.colorVariants && product.colorVariants.length > 0) {
              const targetColor = (item.color || '').trim().toLowerCase();
              const targetSize = String(item.size || '').trim().toLowerCase();

              // Bulletproof variant index locator
              let targetVariantIdx = product.colorVariants.findIndex(v => {
                const vColor = (v.name || v.color || '').trim().toLowerCase();
                return targetColor && (vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor));
              });

              if (targetVariantIdx === -1) {
                targetVariantIdx = product.colorVariants.findIndex(v => {
                  if (!v.stock) return false;
                  return Object.keys(v.stock).some(k => String(k).trim().toLowerCase() === targetSize);
                });
              }

              if (targetVariantIdx === -1) targetVariantIdx = 0;

              const updatedVariants = product.colorVariants.map((v, idx) => {
                if (idx === targetVariantIdx && v.stock) {
                  const sizeKey = Object.keys(v.stock).find(k => String(k).trim().toLowerCase() === targetSize) || item.size;
                  const currentStock = parseInt(v.stock[sizeKey]) || 0;
                  const newQty = Math.max(0, currentStock - itemQty);
                  return { ...v, stock: { ...v.stock, [sizeKey]: newQty } };
                }
                return v;
              });

              const newTotalStock = updatedVariants.reduce((sum, v) => {
                if (!v.stock) return sum;
                return sum + Object.values(v.stock).reduce((a, b) => a + (parseInt(b) || 0), 0);
              }, 0);

              updatedPayload.colorVariants = updatedVariants;
              updatedPayload.stock = newTotalStock;
              updatedProductObj.colorVariants = updatedVariants;
              updatedProductObj.stock = newTotalStock;
            } else {
              const currentStock = parseInt(product.stock) || 0;
              const newRootStock = Math.max(0, currentStock - itemQty);
              updatedPayload.stock = newRootStock;
              updatedProductObj.stock = newRootStock;
            }

            const safePayload = sanitizeProductForDb(updatedPayload);
            if (Object.keys(safePayload).length > 0) {
              const { error: updateErr } = await supabase.from('products').update(safePayload).eq('id', product.id);
              if (updateErr) {
                console.error("Failed to update product stock in Supabase:", updateErr);
              } else {
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...safePayload } : p));
              }
            }

            // Trigger low stock check & manager alert for order item
            fetch('/api/check-low-stock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product: updatedProductObj, productId: product.id })
            }).catch(e => console.error("Low stock check error:", e));
          }
        }
      } 
      // Deduct stock for Storefront orders
      else if (newOrder.productId || newOrder.product) {
        const product = products.find(p => p.id === newOrder.productId || p.title === newOrder.product);
        if (product) {
          let updatedPayload = {};
          let updatedProductObj = { ...product };

          if (product.colorVariants && product.colorVariants.length > 0) {
            const targetColor = newOrder.color || newOrder.colorVariant || '';
            const targetSize = newOrder.size || '';
            
            const updatedVariants = product.colorVariants.map(v => {
              const vColor = v.name || v.color || '';
              const isMatchColor = !targetColor || vColor.toLowerCase().trim() === targetColor.toLowerCase().trim();
              if (isMatchColor && v.stock && v.stock[targetSize] !== undefined) {
                const currentStock = parseInt(v.stock[targetSize]) || 0;
                const newQty = Math.max(0, currentStock - (newOrder.qty || 1));
                return { ...v, stock: { ...v.stock, [targetSize]: newQty } };
              }
              return v;
            });

            updatedPayload.colorVariants = updatedVariants;
            updatedProductObj.colorVariants = updatedVariants;

            if (product.stock !== undefined) {
              const newRootStock = Math.max(0, (parseInt(product.stock) || 0) - (newOrder.qty || 1));
              updatedPayload.stock = newRootStock;
              updatedProductObj.stock = newRootStock;
            }
          } else if (product.stock !== undefined) {
            const newRootStock = Math.max(0, (parseInt(product.stock) || 0) - (newOrder.qty || 1));
            updatedPayload.stock = newRootStock;
            updatedProductObj.stock = newRootStock;
          }

          const safePayload = sanitizeProductForDb(updatedPayload);
          if (Object.keys(safePayload).length > 0) {
            await supabase.from('products').update(safePayload).eq('id', product.id);
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...safePayload } : p));
          }

          // Trigger low stock check & manager alert for storefront order
          fetch('/api/check-low-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: updatedProductObj })
          }).catch(e => console.error('Low stock check error:', e));
        }
      }
      return insertedOrder;
    }
    return null;
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, archived) => {
    const updatePayload = { status: newStatus };
    if (archived !== undefined) updatePayload.archived = archived;
    
    const orderToUpdate = orders.find(o => o.id === orderId);
    
    // If order is being cancelled or returned, restore stock
    const wasAlreadyReturned = orderToUpdate?.status === 'annulee' || orderToUpdate?.status === 'retour';
    const isNowReturned = newStatus === 'annulee' || newStatus === 'retour';
    const shouldRestoreStock = isNowReturned && !wasAlreadyReturned;

    if (orderToUpdate && shouldRestoreStock) {
      if (orderToUpdate.items) {
        for (const item of orderToUpdate.items) {
          const product = products.find(p => p.id === item.productId || p.title === item.product);
          if (product) {
            let updatedPayload = {};
            if (product.colorVariants && product.colorVariants.length > 0 && item.color) {
               const updatedVariants = product.colorVariants.map(v => {
                 if (v.color === item.color && v.stock && v.stock[item.size] !== undefined) {
                   const currentStock = v.stock[item.size];
                   return { ...v, stock: { ...v.stock, [item.size]: currentStock + (item.qty || 1) } };
                 }
                 return v;
               });
               updatedPayload.colorVariants = updatedVariants;
               if (product.stock !== undefined) {
                 updatedPayload.stock = product.stock + (item.qty || 1);
               }
            } else if (product.stock !== undefined) {
               updatedPayload.stock = product.stock + (item.qty || 1);
            }
             const safePayload = sanitizeProductForDb(updatedPayload);
             if (Object.keys(safePayload).length > 0) {
               await supabase.from('products').update(safePayload).eq('id', product.id);
               setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...safePayload } : p));
             }
          }
        }
      } else if (orderToUpdate.productId) {
        const product = products.find(p => p.id === orderToUpdate.productId);
        if (product && product.stock !== undefined) {
          const newStock = product.stock + (orderToUpdate.qty || 1);
           const safePayload = sanitizeProductForDb({ stock: newStock });
           if (Object.keys(safePayload).length > 0) {
             await supabase.from('products').update(safePayload).eq('id', product.id);
             setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...safePayload } : p));
           }
        }
      }
    }
    
    // Process delivery API if status is changed to confirmee and no tracking number exists
    if (newStatus === 'confirmee' && orderToUpdate && !orderToUpdate.trackingNumber) {
      const deliveryResult = await processOrderDelivery(orderToUpdate);
      if (deliveryResult.success) {
        updatePayload.trackingNumber = deliveryResult.trackingNumber;
        updatePayload.shippingLabelUrl = deliveryResult.shippingLabelUrl;
        updatePayload.deliveryCompany = deliveryResult.deliveryCompany;
      } else {
        // Optionally handle API failure (e.g. show alert)
        console.error('Failed to process delivery API', deliveryResult.error);
      }
    }

    const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatePayload } : o));
    } else {
      console.error("Supabase Order Update Error:", error);
      alert("خطأ تقني من قاعدة البيانات: \n" + (error.message || JSON.stringify(error)) + "\n\nصورلي هاد الخطأ باش نعرف المشكل وين راه بالظبط!");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    await supabase.from('orders').delete().eq('id', orderId);
  };

  const handleAddProduct = async (newProd) => {
    const sanitizedProd = sanitizeProductForDb(newProd);
    const { data, error } = await supabase.from('products').insert(sanitizedProd).select();
    if (error) {
      console.error(error);
      alert("Erreur lors de l'ajout du produit: " + error.message);
    } else if (data && data.length > 0) {
      setProducts(prev => [{ ...newProd, ...data[0] }, ...prev]);
    }
  };

  const handleDeleteProduct = async (prodId) => {
    const { error } = await supabase.from('products').delete().eq('id', prodId);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== prodId));
    }
  };

  const handleAddSupplier = async (newSup) => {
    const { id, ...supWithoutId } = newSup;
    await supabase.from('suppliers').insert(supWithoutId);
  };

  const handleUpdateSupplier = async (updatedSup) => {
    const { id, ...supWithoutId } = updatedSup;
    await supabase.from('suppliers').update(supWithoutId).eq('id', id);
  };

  const handleDeleteSupplier = async (supId) => {
    await supabase.from('suppliers').delete().eq('id', supId);
  };

  const handleAddExpense = async (newExp) => {
    const { id, ...expWithoutId } = newExp;
    await supabase.from('expenses').insert(expWithoutId);
  };

  const handleDeleteExpense = async (expId) => {
    await supabase.from('expenses').delete().eq('id', expId);
  };

  const handleUpdateSettings = async (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    for (const [key, value] of Object.entries(newSettings)) {
      if (value === undefined || value === null) continue;
      const valStr = (key === 'categories' || typeof value === 'object') ? JSON.stringify(value) : (Array.isArray(value) ? value.join(' - ') : String(value));
      try {
        const { data: updated } = await supabase
          .from('settings')
          .update({ value: valStr })
          .eq('key', key)
          .select();
        if (!updated || updated.length === 0) {
          await supabase.from('settings').upsert({ key, value: valStr }, { onConflict: 'key' });
        }
      } catch (err) {
        console.error(`Error updating settings key ${key}:`, err);
      }
    }
    await fetchSettings();
  };

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const isAdminRoute = currentPath.toLowerCase().startsWith('/admin');
  const isGrosRoute = currentPath.toLowerCase().startsWith('/gros');
  const isCashierRoute = currentPath.toLowerCase().startsWith('/cashier');
  const isEmballageRoute = currentPath.toLowerCase().startsWith('/embalage') || currentPath.toLowerCase().startsWith('/emballage');

  const enrichedOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    const sorted = [...orders].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateA - dateB;
    });
    
    const idToTicket = {};
    sorted.forEach((order, index) => {
      const ticketNum = index + 1;
      idToTicket[order.id] = ticketNum < 10 ? `0${ticketNum}` : `${ticketNum}`;
    });

    return orders.map(order => ({
      ...order,
      ticketNumber: idToTicket[order.id] || '01'
    }));
  }, [orders]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F1EA' }}>
        <h2 style={{ color: 'var(--burgundy)', fontWeight: 800 }}>جاري تحميل البيانات...</h2>
      </div>
    );
  }

  return (
    <div className="app-main">
      <Suspense fallback={
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Cairo, sans-serif', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #F1F5F9', borderTopColor: 'var(--burgundy, #6B1D2F)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--burgundy, #6B1D2F)' }}>⚡ جاري التحميل السريع...</span>
        </div>
      }>
        {isAdminRoute ? (
          <AdminDashboard 
            orders={enrichedOrders}
            onPlaceOrder={handlePlaceOrder}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onSwitchToClient={() => navigateTo('/')}
          />
        ) : isCashierRoute ? (
          <CashierPOS 
            products={products}
            settings={settings}
            orders={enrichedOrders}
            onPlaceOrder={handlePlaceOrder}
            onGoBack={() => navigateTo('/')}
            onUpdateStatus={handleUpdateOrderStatus}
            onUpdateProduct={handleUpdateProduct}
          />
        ) : isEmballageRoute ? (
          <EmballagePOS 
            products={products}
            settings={settings}
            orders={enrichedOrders}
            onUpdateStatus={handleUpdateOrderStatus}
            onGoBack={() => navigateTo('/')}
          />
        ) : isGrosRoute ? (
          <GrosStorefront 
            products={products}
            settings={settings}
            onPlaceOrder={handlePlaceOrder}
            onGoToRetail={() => navigateTo('/')}
          />
        ) : (
          <Storefront 
            products={products}
            settings={settings}
            onPlaceOrder={handlePlaceOrder}
          />
        )}
      </Suspense>
      <CookieConsent />
      <ToastContainer />
    </div>
  );
}
