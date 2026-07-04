import React, { useState, useEffect, useMemo } from 'react';
import Storefront from './components/Storefront';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './lib/supabaseClient';

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

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

    // Fallback Polling (Every 5 seconds) to ensure orders and stock arrive instantly 
    // even if Real-time is not enabled in Supabase dashboard.
    const pollInterval = setInterval(async () => {
      fetchData('products', setProducts);
      
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setOrders(prev => {
          if (prev.length > 0 && data.length > prev.length) {
            playNotificationSound();
          }
          return data;
        });
      }
    }, 5000);

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
    await Promise.all([
      fetchData('products', setProducts),
      fetchData('orders', setOrders),
      fetchData('suppliers', setSuppliers),
      fetchData('expenses', setExpenses),
      fetchSettings()
    ]);
    setLoading(false);
  };

  const fetchData = async (table, setter) => {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setter(data);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*');
    if (!error && data) {
      const obj = {};
      data.forEach(item => {
        if (item && item.key) obj[item.key] = item.value;
      });
      setSettings(prev => ({ ...prev, ...obj }));
    }
  };

  const handlePlaceOrder = async (newOrder) => {
    const { id, ...orderWithoutId } = newOrder;
    const { data: insertedOrder, error } = await supabase.from('orders').insert(orderWithoutId).select().single();
    
    if (!error) {
      setOrders(prev => [...prev, insertedOrder]);
      // Deduct stock for POS orders
      if (newOrder.items) {
        for (const item of newOrder.items) {
          const product = products.find(p => p.id === item.productId || p.title === item.product);
          if (product) {
            let updatedPayload = {};
            if (product.colorVariants && product.colorVariants.length > 0 && item.color) {
               const updatedVariants = product.colorVariants.map(v => {
                 if (v.color === item.color && v.stock && v.stock[item.size] !== undefined) {
                   const currentStock = v.stock[item.size];
                   return { ...v, stock: { ...v.stock, [item.size]: Math.max(0, currentStock - (item.qty || 1)) } };
                 }
                 return v;
               });
               updatedPayload.colorVariants = updatedVariants;
               if (product.stock !== undefined) {
                 updatedPayload.stock = Math.max(0, product.stock - (item.qty || 1));
               }
            } else if (product.stock !== undefined) {
               updatedPayload.stock = Math.max(0, product.stock - (item.qty || 1));
            }
            if (Object.keys(updatedPayload).length > 0) {
              await supabase.from('products').update(updatedPayload).eq('id', product.id);
            }
          }
        }
      } 
      // Deduct stock for Storefront orders
      else if (newOrder.productId) {
        const product = products.find(p => p.id === newOrder.productId);
        if (product && product.stock !== undefined) {
          const newStock = Math.max(0, product.stock - (newOrder.qty || 1));
          await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
        }
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, archived) => {
    const updatePayload = { status: newStatus };
    if (archived !== undefined) updatePayload.archived = archived;
    
    const orderToUpdate = orders.find(o => o.id === orderId);
    
    // If order is being cancelled, restore stock
    if (orderToUpdate && orderToUpdate.status !== 'annulee' && newStatus === 'annulee') {
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
            if (Object.keys(updatedPayload).length > 0) {
              await supabase.from('products').update(updatedPayload).eq('id', product.id);
            }
          }
        }
      } else if (orderToUpdate.productId) {
        const product = products.find(p => p.id === orderToUpdate.productId);
        if (product && product.stock !== undefined) {
          const newStock = product.stock + (orderToUpdate.qty || 1);
          await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
        }
      }
    }
    
    const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatePayload } : o));
    }
  };

  const handleDeleteOrder = async (orderId) => {
    await supabase.from('orders').delete().eq('id', orderId);
  };

  const handleAddProduct = async (newProd) => {
    const { id, ...prodWithoutId } = newProd;
    const { data, error } = await supabase.from('products').insert(prodWithoutId).select();
    if (error) {
      console.error(error);
      alert("Erreur lors de l'ajout du produit: " + error.message);
    } else if (data && data.length > 0) {
      setProducts(prev => [data[0], ...prev]);
    }
  };

  const handleUpdateProduct = async (updatedProd) => {
    const { id, ...prodWithoutId } = updatedProd;
    const { data, error } = await supabase.from('products').update(prodWithoutId).eq('id', id).select();
    if (error) {
      console.error(error);
      alert("Erreur lors de la modification du produit: " + error.message);
    } else if (data && data.length > 0) {
      setProducts(prev => prev.map(p => p.id === id ? data[0] : p));
    } else {
      alert("Erreur: La modification a été bloquée (vérifiez que RLS est bien désactivé).");
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
      const { data: existing } = await supabase.from('settings').select('id').eq('key', key);
      if (existing && existing.length > 0) {
        await supabase.from('settings').update({ value: String(value) }).eq('key', key);
      } else {
        await supabase.from('settings').insert({ key, value: String(value) });
      }
    }
    await fetchSettings();
  };

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const isAdminRoute = currentPath.toLowerCase().startsWith('/admin');

  const enrichedOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    const sorted = [...orders].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateA - dateB;
    });
    
    const idToTicket = {};
    sorted.forEach((order, index) => {
      idToTicket[order.id] = index < 10 ? `0${index}` : `${index}`;
    });

    return orders.map(order => ({
      ...order,
      ticketNumber: idToTicket[order.id] || '00'
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
      ) : (
        <Storefront 
          products={products}
          settings={settings}
          onPlaceOrder={handlePlaceOrder}
        />
      )}
    </div>
  );
}
