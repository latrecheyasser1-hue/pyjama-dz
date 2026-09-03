import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import Storefront from './components/Storefront';
import ToastContainer from './components/ToastContainer';
import CookieConsent from './components/CookieConsent';
import { supabase } from './lib/supabaseClient';
import { processOrderDelivery } from './services/deliveryApi';

import CashierPOS from './components/CashierPOS';
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageReloaded = sessionStorage.getItem('chunk_reload_flag');
    try {
      const component = await componentImport();
      sessionStorage.removeItem('chunk_reload_flag');
      return component;
    } catch (error) {
      if (!pageReloaded) {
        sessionStorage.setItem('chunk_reload_flag', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'));
const GrosStorefront = lazyWithRetry(() => import('./components/GrosStorefront'));
const EmballagePOS = lazyWithRetry(() => import('./components/EmballagePOS'));
const AliOwnerDashboard = lazyWithRetry(() => import('./components/AliOwnerDashboard'));


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
      if (!cached) return {};
      const parsed = JSON.parse(cached);
      const isAdmin = window.location.pathname.startsWith('/admin') || 
                      window.location.pathname.startsWith('/ali') || 
                      window.location.pathname.startsWith('/pos') || 
                      window.location.pathname.startsWith('/emballage');
      if (!isAdmin && typeof parsed === 'object') {
        delete parsed.zr_express_api_key;
        delete parsed.zr_express_token;
        delete parsed.yalidine_api_token;
        delete parsed.yalidine_api_id;
        delete parsed.meta_access_token;
        Object.keys(parsed).forEach(k => {
          if (k.startsWith('alert_') || k.startsWith('active_msgs_') || k.startsWith('notified_')) delete parsed[k];
        });
      }
      return parsed;
    } catch(e) { return {}; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cachedProds = localStorage.getItem('pyjama_products_cache');
      return !cachedProds;
    } catch(e) { return true; }
  });

  const pendingUpdatesRef = useRef({});
  const updateDebounceRef = useRef({});
  const lowStockDebounceRef = useRef({});
  const parcelCreationLockRef = useRef(new Set());

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    // Preload all page route bundles silently in background after 500ms for 0ms instant page transitions
    const preloadTimer = setTimeout(() => {
      import('./components/AdminDashboard').catch(() => {});
      import('./components/GrosStorefront').catch(() => {});
      import('./components/EmballagePOS').catch(() => {});
      import('./components/AliOwnerDashboard').catch(() => {});
    }, 500);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(preloadTimer);
    };
  }, []);

  useEffect(() => {
    fetchInitialData();
    
    // 1. Subscribe to real-time database changes with instant in-memory state updates
    const isAdmin = window.location.pathname.startsWith('/admin') || 
                    window.location.pathname.startsWith('/ali') || 
                    window.location.pathname.startsWith('/pos') || 
                    window.location.pathname.startsWith('/emballage');

    const productsSub = supabase.channel('products_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          // Prevent DB echo from reverting active user edits
          const pending = pendingUpdatesRef.current[payload.new.id];
          if (pending && (Date.now() - pending.timestamp < 6000)) {
            return;
          }
          const incoming = payload.new;
          if (typeof incoming.colorVariants === 'string') {
            try { incoming.colorVariants = JSON.parse(incoming.colorVariants); } catch(e) {}
          }
          setProducts(prev => {
            const nextList = prev.map(p => p.id === incoming.id ? { ...p, ...incoming } : p);
            try { localStorage.setItem('pyjama_products_cache', JSON.stringify(nextList)); } catch(e) {}
            return nextList;
          });
        } else if (payload.eventType === 'INSERT' && payload.new) {
          const incoming = payload.new;
          if (typeof incoming.colorVariants === 'string') {
            try { incoming.colorVariants = JSON.parse(incoming.colorVariants); } catch(e) {}
          }
          setProducts(prev => {
            const nextList = [incoming, ...prev];
            try { localStorage.setItem('pyjama_products_cache', JSON.stringify(nextList)); } catch(e) {}
            return nextList;
          });
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setProducts(prev => {
            const nextList = prev.filter(p => p.id !== payload.old.id);
            try { localStorage.setItem('pyjama_products_cache', JSON.stringify(nextList)); } catch(e) {}
            return nextList;
          });
        } else {
          fetchData('products', setProducts);
        }
      }).subscribe();

    let ordersSub = null;
    let suppliersSub = null;
    let expensesSub = null;

    // Only subscribe to private backoffice data if on an admin/staff route (saves massive client bandwidth)
    if (isAdmin) {
      ordersSub = supabase.channel('orders_realtime_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setOrders(prev => [payload.new, ...prev]);
            playNotificationSound();
          } else {
            fetchData('orders', setOrders);
          }
        }).subscribe();

      suppliersSub = supabase.channel('suppliers_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, payload => {
          fetchData('suppliers', setSuppliers);
        }).subscribe();

      expensesSub = supabase.channel('expenses_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, payload => {
          fetchData('expenses', setExpenses);
        }).subscribe();
    }

    const settingsSub = supabase.channel('settings_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
        fetchSettings();
        if (payload?.new?.key === 'products_last_updated') {
          fetchData('products', setProducts);
        }
      }).subscribe();

    let lastFocusSync = Date.now();
    const handleFocusOrVisible = () => {
      if (!document.hidden) {
        const timeSinceSync = Date.now() - lastFocusSync;
        // For admin/backoffice pages, when user returns to tab after > 4 seconds, refresh products automatically
        if (isAdmin && timeSinceSync > 4000) {
          lastFocusSync = Date.now();
          fetchData('products', setProducts);
        } else if (timeSinceSync > 15 * 60 * 1000) {
          lastFocusSync = Date.now();
        }
      }
    };

    const handleBeforeUnload = () => {
      Object.keys(updateDebounceRef.current).forEach(id => {
        if (updateDebounceRef.current[id]) {
          clearTimeout(updateDebounceRef.current[id]);
          const info = pendingUpdatesRef.current[id];
          if (info?.product) {
            const sanitized = sanitizeProductForDb(info.product);
            supabase.from('products').update(sanitized).eq('id', id).then();
          }
        }
      });
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      supabase.removeChannel(productsSub);
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (suppliersSub) supabase.removeChannel(suppliersSub);
      if (expensesSub) supabase.removeChannel(expensesSub);
      supabase.removeChannel(settingsSub);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const fetchInitialData = async () => {
    // Instant unblock loading screen if cached data exists or in max 100ms
    setTimeout(() => setLoading(false), 100);

    const isAdmin = window.location.pathname.startsWith('/admin') || 
                    window.location.pathname.startsWith('/ali') || 
                    window.location.pathname.startsWith('/pos') || 
                    window.location.pathname.startsWith('/emballage');

    // Public shoppers only load products & settings (saves ~300KB orders & expenses payload on every visit!)
    const initialFetches = [
      fetchData('products', setProducts),
      fetchSettings()
    ];

    if (isAdmin) {
      initialFetches.push(
        fetchData('orders', setOrders),
        fetchData('suppliers', setSuppliers),
        fetchData('expenses', setExpenses)
      );
    }

    Promise.all(initialFetches).then(() => setLoading(false)).catch(err => {
      console.error('Initial data fetch error:', err);
    });
  };

  // On-demand loader for admin routes when navigating client-side
  useEffect(() => {
    const isAdmin = currentPath.startsWith('/admin') || 
                    currentPath.startsWith('/ali') || 
                    currentPath.startsWith('/pos') || 
                    currentPath.startsWith('/emballage');
    if (isAdmin && orders.length === 0) {
      fetchData('orders', setOrders);
      fetchData('suppliers', setSuppliers);
      fetchData('expenses', setExpenses);
    }
  }, [currentPath]);

  useEffect(() => {
    const channel = supabase
      .channel('settings_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new && payload.new.key === 'categories') {
          let val = payload.new.value;
          if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch(e) {}
          }
          if (Array.isArray(val)) {
            setSettings(prev => ({ ...prev, categories: val }));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async (table, setter) => {
    const isAdmin = window.location.pathname.startsWith('/admin') || 
                    window.location.pathname.startsWith('/ali') || 
                    window.location.pathname.startsWith('/pos') || 
                    window.location.pathname.startsWith('/emballage');

    // Smart lightweight cache check for products (ONLY on public storefront - admins ALWAYS get fresh real stock!)
    if (table === 'products' && !isAdmin) {
      const cached = localStorage.getItem('pyjama_products_cache');
      const cachedTime = localStorage.getItem('pyjama_products_cache_time');
      if (cached && cachedTime) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check lightweight last_updated setting (~50 bytes)
            const { data: verData } = await supabase
              .from('settings')
              .select('value')
              .eq('key', 'products_last_updated')
              .maybeSingle();

            const lastUpdated = verData?.value ? parseInt(verData.value) : 0;
            if (lastUpdated && parseInt(cachedTime) >= lastUpdated) {
              setter(parsed);
              return;
            }
          }
        } catch(e) {}
      }
    }

    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (!error && data) {
      if (table === 'products') {
        try { 
          localStorage.setItem('pyjama_products_cache', JSON.stringify(data)); 
          localStorage.setItem('pyjama_products_cache_time', String(Date.now()));
        } catch(e) {}
        const now = Date.now();
        setter(prev => {
          return data.map(dbProd => {
            const pending = pendingUpdatesRef.current[dbProd.id];
            if (pending && (now - pending.timestamp < 6000)) {
              return pending.product;
            }
            let cvs = dbProd.colorVariants;
            if (typeof cvs === 'string') {
              try { cvs = JSON.parse(cvs); } catch(e) { cvs = []; }
            }
            return { ...dbProd, colorVariants: cvs };
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

  const handleUpdateProduct = (updatedProd, changedVariant) => {
    const { id } = updatedProd;
    if (!id) return;

    const now = Date.now();
    pendingUpdatesRef.current[id] = { product: updatedProd, changedVariant, timestamp: now };

    // 1. Instant Optimistic Local Update (0ms lag!) + Immediate LocalStorage Sync (survives instant F5 refresh!)
    setProducts(prev => {
      const nextList = prev.map(p => p.id === id ? updatedProd : p);
      try { localStorage.setItem('pyjama_products_cache', JSON.stringify(nextList)); } catch(e) {}
      return nextList;
    });

    // 2. Single debounced trigger for low stock alert if stock drops to <= 5 or 0 (350ms debounce prevents rapid click spam)
    if (changedVariant && typeof changedVariant.qty === 'number' && changedVariant.qty <= 5) {
      const alertKey = `${id}_${changedVariant.colorIdx}_${changedVariant.size}`;
      if (lowStockDebounceRef.current[alertKey]) {
        clearTimeout(lowStockDebounceRef.current[alertKey]);
      }
      lowStockDebounceRef.current[alertKey] = setTimeout(() => {
        delete lowStockDebounceRef.current[alertKey];
        fetch('/api/check-low-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: updatedProd, changedVariant })
        }).catch(err => console.error('Low stock check error:', err));
      }, 350);
    }

    // 2b. Debounced trigger for customer restock waitlist notification if stock increases (> 0)
    if (changedVariant && typeof changedVariant.qty === 'number' && changedVariant.qty > 0) {
      const restockKey = `restock_${id}_${changedVariant.colorIdx}_${changedVariant.size}`;
      if (lowStockDebounceRef.current[restockKey]) {
        clearTimeout(lowStockDebounceRef.current[restockKey]);
      }
      lowStockDebounceRef.current[restockKey] = setTimeout(() => {
        delete lowStockDebounceRef.current[restockKey];
        const targetCv = (updatedProd.colorVariants || [])[changedVariant.colorIdx];
        fetch('/api/notify-restock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: id,
            productTitle: updatedProd.title,
            size: changedVariant.size,
            color: targetCv?.color || targetCv?.name,
            newQty: changedVariant.qty
          })
        }).catch(err => console.error('Restock notify error:', err));
      }, 400);
    }

    // 3. Clear previous pending DB update for this product
    if (updateDebounceRef.current[id]) {
      clearTimeout(updateDebounceRef.current[id]);
    }

    // 4. Fast debounce background Supabase sync (120ms) to ensure rapid persistence
    updateDebounceRef.current[id] = setTimeout(async () => {
      try {
        const latestInfo = pendingUpdatesRef.current[id];
        const latestProd = latestInfo?.product || updatedProd;
        const lastChangedVariant = latestInfo?.changedVariant || changedVariant;
        const sanitizedProd = sanitizeProductForDb(latestProd);
        const { data, error } = await supabase.from('products').update(sanitizedProd).eq('id', id).select();
        if (error) {
          console.error('Error updating product:', error);
        } else if (data && data.length > 0) {
          const currentPending = pendingUpdatesRef.current[id];
          // If user made a newer edit while this request was running, do not overwrite!
          if (currentPending && currentPending.timestamp > now) {
            return;
          }
          const dbData = data[0];
          if (typeof dbData.colorVariants === 'string') {
            try { dbData.colorVariants = JSON.parse(dbData.colorVariants); } catch(e) {}
          }
          // User latest edits ALWAYS have precedence over dbData
          const finalProduct = { ...dbData, ...latestProd };
          pendingUpdatesRef.current[id] = { product: finalProduct, changedVariant: lastChangedVariant, timestamp: Date.now() };
          setProducts(prev => {
            const nextList = prev.map(p => p.id === id ? finalProduct : p);
            try { localStorage.setItem('pyjama_products_cache', JSON.stringify(nextList)); } catch(e) {}
            return nextList;
          });

          setTimeout(() => {
            if (pendingUpdatesRef.current[id] && (Date.now() - pendingUpdatesRef.current[id].timestamp >= 5000)) {
              delete pendingUpdatesRef.current[id];
            }
          }, 6000);
        }
      } catch (err) {
        console.error('Error in debounced product update:', err);
      }
    }, 120);
  };

  const fetchSettings = async () => {
    try {
      const { data: catData } = await supabase.from('settings').select('*').eq('key', 'categories');
      if (catData && catData.length > 0 && catData[0].value) {
        let val = catData[0].value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch(e) {}
        }
        if (Array.isArray(val)) {
          setSettings(prev => ({ ...prev, categories: val }));
        }
      }
    } catch (e) {}

    const isAdmin = window.location.pathname.startsWith('/admin') || 
                    window.location.pathname.startsWith('/ali') || 
                    window.location.pathname.startsWith('/pos') || 
                    window.location.pathname.startsWith('/emballage');

    let settingsQuery = supabase.from('settings').select('key,value');
    
    // Always exclude backend-only internal message logs from frontend memory
    settingsQuery = settingsQuery
      .not('key', 'like', 'alert_%')
      .not('key', 'like', 'active_msgs_%')
      .not('key', 'like', 'notified_%')
      .not('key', 'like', 'lock_%')
      .not('key', 'like', 'meta_%')
      .not('key', 'like', 'groq_%');

    // On public storefront (non-admin), also strictly exclude delivery credentials
    if (!isAdmin) {
      settingsQuery = settingsQuery
        .not('key', 'like', 'zr_express_%')
        .not('key', 'like', 'yalidine_%');
    }

    const { data, error } = await settingsQuery.limit(100);
    const obj = {};
    if (!error && data) {
      data.forEach(item => {
        if (!item || !item.key) return;

        // Security shield: Never inject private tokens into public client state or localStorage
        if (!isAdmin && (
          item.key.startsWith('zr_express_') || 
          item.key.startsWith('yalidine_') || 
          item.key.startsWith('meta_') || 
          item.key.startsWith('alert_') ||
          item.key.startsWith('active_msgs_')
        )) {
          return;
        }

        if (typeof item.value === 'string' && (item.value.trim().startsWith('[') || item.value.trim().startsWith('{'))) {
          try {
            obj[item.key] = JSON.parse(item.value);
          } catch (e) {
            obj[item.key] = item.value;
          }
        } else {
          obj[item.key] = item.value;
        }
      });
      setSettings(prev => {
        const merged = { ...prev, ...obj };
        try { localStorage.setItem('pyjama_settings_cache', JSON.stringify(merged)); } catch(e) {}
        return merged;
      });
    }

    // Also fetch dedicated 'reclamations' table and RLS-free 'orders' reclamations from Supabase DB to ensure instant mobile delivery
    try {
      const { data: recsDb } = await supabase.from('reclamations').select('*').neq('status', 'resolue').order('created_at', { ascending: false });
      let mapped = [];
      if (recsDb && recsDb.length > 0) {
        mapped = recsDb.map(r => ({
          id: r.id || 'REC-' + (r.created_at ? new Date(r.created_at).getTime() : Date.now()),
          clientName: r.clientName || r.client_name || 'زائر المتجر',
          whatsappNumber: r.whatsappNumber || r.whatsapp_number || r.phone || '',
          message: r.message || '',
          status: r.status || 'nouvelle',
          createdAt: r.created_at || r.createdAt || new Date().toISOString()
        }));
      }

      const { data: recsFromOrders } = await supabase.from('orders').select('*').or('deliveryMode.eq.reclamation,deliveryCompany.eq.RECLAMATION').neq('status', 'resolue').order('created_at', { ascending: false });
      let mappedOrderRecs = [];
      if (recsFromOrders && recsFromOrders.length > 0) {
        mappedOrderRecs = recsFromOrders.map(o => ({
          id: o.id || 'REC-' + (o.created_at ? new Date(o.created_at).getTime() : Date.now()),
          clientName: o.clientName || 'زائر المتجر',
          whatsappNumber: o.phone || '',
          message: o.product || o.commune || '',
          status: o.status || 'nouvelle',
          createdAt: o.created_at || o.date || new Date().toISOString()
        }));
      }

      const existingRecs = Array.isArray(obj.reclamations) ? obj.reclamations : [];
      const merged = [...mappedOrderRecs, ...mapped, ...existingRecs];
      const uniqueRecs = Array.from(new Map(merged.map(item => [String(item.id || item.createdAt), item])).values());
      obj.reclamations = uniqueRecs;
    } catch (e) {
      console.warn('Reclamations query notice:', e);
    }

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
    try {
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
      
      if (!error && insertedOrder) {
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

        // Deduct stock for Storefront & POS orders
        const orderItems = newOrder.items || (newOrder.productId || newOrder.product ? [{
          productId: newOrder.productId,
          product: newOrder.product,
          color: newOrder.color || newOrder.colorVariant,
          size: newOrder.size,
          qty: newOrder.qty || 1
        }] : []);

        // Determine order type: POS Cashier vs Wholesale (Gros) vs Online Storefront Delivery
        const isPosOrder = Boolean(
          newOrder.isPos === true || 
          newOrder.orderType === 'hanoot' || 
          newOrder.deliveryMode === 'محل البيع المباشر' || 
          newOrder.deliveryMode === 'pos'
        );
        const isGrosOrder = Boolean(
          newOrder.orderType === 'gros' || 
          newOrder.orderType === 'super_gros' || 
          newOrder.deliveryMode === 'gros'
        );

        let workingProducts = [...products];

        const soldItemsCollected = [];

        for (const item of orderItems) {
          if (item.isDiscount) continue;

          // Strictly separate Hanoot (boutique__) vs Gros (gros__) vs Delivery (pure category) stocks
          let targetProducts = [];

          // 1. If item.productId is provided, match THAT EXACT product
          if (item.productId) {
            const exactProd = workingProducts.find(p => String(p.id).trim().toLowerCase() === String(item.productId).trim().toLowerCase());
            if (exactProd) targetProducts = [exactProd];
          }

          // 2. Otherwise match by barcode or title adhering strictly to order category
          if (targetProducts.length === 0) {
            targetProducts = workingProducts.filter(p => {
              if (!p) return false;

              const cat = String(p.category || '').trim();
              const isBoutiqueProd = cat.startsWith('boutique__') || cat === '__boutique__';
              const isGrosProd = cat.startsWith('gros__') || cat.startsWith('super_gros__');

              if (isPosOrder && isGrosProd) return false;
              if (isGrosOrder && !isGrosProd) return false;
              if (isPosOrder && !isBoutiqueProd && workingProducts.some(other => other.title === p.title && String(other.category).startsWith('boutique__'))) {
                return false;
              }

              if (item.barcode && p.barcode && String(p.barcode).trim() === String(item.barcode).trim()) return true;

              if (p.title && item.product) {
                const cleanItemTitle = String(item.product).replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
                const cleanProdTitle = String(p.title).trim().toLowerCase();
                if (cleanProdTitle === cleanItemTitle) return true;
              }
              return false;
            });
          }

          if (targetProducts.length === 0) {
            const fallbackProd = workingProducts.find(p => {
              if (!p || !p.title || !item.product) return false;
              const cat = String(p.category || '').trim();
              const isBoutiqueProd = cat.startsWith('boutique__') || cat === '__boutique__';
              const isGrosProd = cat.startsWith('gros__') || cat.startsWith('super_gros__');

              if (isPosOrder && isGrosProd) return false;
              if (isGrosOrder && !isGrosProd) return false;

              const cleanItemTitle = String(item.product).replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
              const cleanProdTitle = String(p.title).trim().toLowerCase();
              return cleanProdTitle.includes(cleanItemTitle) || cleanItemTitle.includes(cleanProdTitle);
            });
            if (fallbackProd) targetProducts.push(fallbackProd);
          }

          let alreadyCapturedForThisItem = false;

          for (const product of targetProducts) {
            let updatedPayload = {};
            const itemQty = Math.max(1, parseInt(item.qty) || 1);

            let colorVariantsArr = product.colorVariants;
            if (typeof colorVariantsArr === 'string') {
              try { colorVariantsArr = JSON.parse(colorVariantsArr); } catch (e) { colorVariantsArr = []; }
            }

            if (Array.isArray(colorVariantsArr) && colorVariantsArr.length > 0) {
              const targetColor = (item.color || '').trim().toLowerCase();
              const targetSize = String(item.size || '').trim().toLowerCase();

              let targetVariantIdx = -1;

              if (isPosOrder) {
                if (targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    const isBoutique = vColor.includes('محل') || vColor.includes('boutique') || vColor.includes('حانيت');
                    return isBoutique && (vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor));
                  });
                }
                if (targetVariantIdx === -1 && targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    return vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor);
                  });
                }
                if (targetVariantIdx === -1) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    return vColor.includes('محل') || vColor.includes('boutique') || vColor.includes('حانيت');
                  });
                }
              } else {
                if (targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    const isBoutique = vColor.includes('محل') || vColor.includes('boutique') || vColor.includes('حانيت');
                    return !isBoutique && (vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor));
                  });
                }
                if (targetVariantIdx === -1 && targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    return vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor);
                  });
                }
              }

              if (targetVariantIdx === -1) {
                targetVariantIdx = colorVariantsArr.findIndex(v => {
                  if (!v || !v.stock) return false;
                  return Object.keys(v.stock).some(k => String(k).trim().toLowerCase() === targetSize);
                });
              }

              if (targetVariantIdx === -1) targetVariantIdx = 0;

              const updatedVariants = colorVariantsArr.map((v, idx) => {
                if (idx === targetVariantIdx && v && v.stock) {
                  const sizeKey = Object.keys(v.stock).find(k => String(k).trim().toLowerCase() === targetSize) || item.size;
                  const currentStock = parseInt(v.stock[sizeKey]) || 0;
                  const newQty = Math.max(0, currentStock - itemQty);
                  return { ...v, stock: { ...v.stock, [sizeKey]: newQty } };
                }
                return v;
              });

              updatedPayload.colorVariants = updatedVariants;
            } else {
              const currentStock = parseInt(product.stock) || 0;
              updatedPayload.stock = Math.max(0, currentStock - itemQty);
            }

            const safePayload = sanitizeProductForDb(updatedPayload);
            if (Object.keys(safePayload).length > 0) {
              const updatedProductFull = { ...product, ...safePayload };
              
              pendingUpdatesRef.current[product.id] = { 
                product: updatedProductFull, 
                timestamp: Date.now() 
              };

              const targetIdStr = String(product.id).trim().toLowerCase();
              workingProducts = workingProducts.map(p => {
                const pIdStr = String(p.id).trim().toLowerCase();
                return pIdStr === targetIdStr ? updatedProductFull : p;
              });

              await supabase.from('products').update(safePayload).eq('id', product.id);

              // Capture exact sold item with colorIdx for precise 1:1 alert matching (once per order item)
              if (!alreadyCapturedForThisItem && typeof targetVariantIdx === 'number' && targetVariantIdx >= 0) {
                soldItemsCollected.push({
                  productId: product.id,
                  colorIdx: targetVariantIdx,
                  color: item.color,
                  size: item.size,
                  isPos: isPosOrder
                });
                alreadyCapturedForThisItem = true;
              }
            }
          }
        }

        setProducts([...workingProducts]);
        try { localStorage.setItem('pyjama_products_cache', JSON.stringify(workingProducts)); } catch(e) {}
        fetchData('products', setProducts);

        // Trigger single low stock check exclusively for sold items/sizes in this specific order
        const soldProductIds = orderItems.map(i => i.productId).filter(Boolean);

        fetch('/api/check-low-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPos: isPosOrder, productIds: soldProductIds, soldItems: soldItemsCollected })
        }).catch(e => console.error("Low stock check error:", e));
      }
      return insertedOrder;
    } catch (err) {
      console.error("Critical error in handlePlaceOrder:", err);
      return null;
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, archived) => {
    try {
      const updatePayload = { status: newStatus };
      if (archived !== undefined) updatePayload.archived = archived;
      
      const orderToUpdate = orders.find(o => String(o.id).trim() === String(orderId).trim());

      const wasAlreadyReturned = orderToUpdate?.status === 'annulee' || orderToUpdate?.status === 'retour';
      const isNowReturned = newStatus === 'annulee' || newStatus === 'retour';
      const shouldRestoreStock = isNowReturned && !wasAlreadyReturned;

      if (orderToUpdate && shouldRestoreStock) {
        const isPosOrder = Boolean(
          orderToUpdate.isPos === true || 
          orderToUpdate.orderType === 'hanoot' || 
          orderToUpdate.deliveryMode === 'محل البيع المباشر' || 
          orderToUpdate.deliveryMode === 'pos'
        );
        const isGrosOrder = Boolean(
          orderToUpdate.orderType === 'gros' || 
          orderToUpdate.orderType === 'super_gros' || 
          orderToUpdate.deliveryMode === 'gros'
        );

        const orderItems = orderToUpdate.items || (orderToUpdate.productId || orderToUpdate.product ? [{
          productId: orderToUpdate.productId,
          product: orderToUpdate.product,
          color: orderToUpdate.color || orderToUpdate.colorVariant,
          size: orderToUpdate.size,
          qty: orderToUpdate.qty || 1
        }] : []);

        let workingProducts = [...products];

        for (const item of orderItems) {
          if (item.isDiscount) continue;

          let targetProducts = [];

          if (item.productId) {
            const exactProd = workingProducts.find(p => String(p.id).trim().toLowerCase() === String(item.productId).trim().toLowerCase());
            if (exactProd) targetProducts = [exactProd];
          }

          if (targetProducts.length === 0) {
            targetProducts = workingProducts.filter(p => {
              if (!p) return false;

              const cat = String(p.category || '').trim();
              const isBoutiqueProd = cat.startsWith('boutique__') || cat === '__boutique__';
              const isGrosProd = cat.startsWith('gros__') || cat.startsWith('super_gros__');

              if (isPosOrder && isGrosProd) return false;
              if (isGrosOrder && !isGrosProd) return false;
              if (isPosOrder && !isBoutiqueProd && workingProducts.some(other => other.title === p.title && String(other.category).startsWith('boutique__'))) {
                return false;
              }

              if (item.barcode && p.barcode && String(p.barcode).trim() === String(item.barcode).trim()) return true;

              if (p.title && item.product) {
                const cleanItemTitle = String(item.product).replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
                const cleanProdTitle = String(p.title).trim().toLowerCase();
                if (cleanProdTitle === cleanItemTitle) return true;
              }
              return false;
            });
          }

          if (targetProducts.length === 0) {
            const fallbackProd = workingProducts.find(p => {
              if (!p || !p.title || !item.product) return false;
              const cat = String(p.category || '').trim();
              const isBoutiqueProd = cat.startsWith('boutique__') || cat === '__boutique__';
              const isGrosProd = cat.startsWith('gros__') || cat.startsWith('super_gros__');

              if (isPosOrder && isGrosProd) return false;
              if (isGrosOrder && !isGrosProd) return false;

              const cleanItemTitle = String(item.product).replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
              const cleanProdTitle = String(p.title).trim().toLowerCase();
              return cleanProdTitle.includes(cleanItemTitle) || cleanItemTitle.includes(cleanProdTitle);
            });
            if (fallbackProd) targetProducts.push(fallbackProd);
          }

          for (const product of targetProducts) {
            let updatedPayload = {};
            const restoreQty = Math.max(1, parseInt(item.qty) || 1);

            let colorVariantsArr = product.colorVariants;
            if (typeof colorVariantsArr === 'string') {
              try { colorVariantsArr = JSON.parse(colorVariantsArr); } catch (e) { colorVariantsArr = []; }
            }

            if (Array.isArray(colorVariantsArr) && colorVariantsArr.length > 0) {
              const targetColor = (item.color || '').trim().toLowerCase();
              const targetSize = String(item.size || '').trim().toLowerCase();

              let targetVariantIdx = -1;

              if (isPosOrder) {
                if (targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    const isBoutique = vColor.includes('محل') || vColor.includes('boutique') || vColor.includes('حانيت');
                    return isBoutique && (vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor));
                  });
                }
                if (targetVariantIdx === -1 && targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    return vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor);
                  });
                }
                if (targetVariantIdx === -1) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    return vColor.includes('محل') || vColor.includes('boutique') || vColor.includes('حانيت');
                  });
                }
              } else {
                if (targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    const isBoutique = vColor.includes('محل') || vColor.includes('boutique') || vColor.includes('حانيت');
                    return !isBoutique && (vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor));
                  });
                }
                if (targetVariantIdx === -1 && targetColor) {
                  targetVariantIdx = colorVariantsArr.findIndex(v => {
                    if (!v) return false;
                    const vColor = (v.name || v.color || '').trim().toLowerCase();
                    return vColor === targetColor || vColor.includes(targetColor) || targetColor.includes(vColor);
                  });
                }
              }

              if (targetVariantIdx === -1) {
                targetVariantIdx = colorVariantsArr.findIndex(v => {
                  if (!v || !v.stock) return false;
                  return Object.keys(v.stock).some(k => String(k).trim().toLowerCase() === targetSize);
                });
              }

              if (targetVariantIdx === -1) targetVariantIdx = 0;

              const updatedVariants = colorVariantsArr.map((v, idx) => {
                if (idx === targetVariantIdx && v && v.stock) {
                  const sizeKey = Object.keys(v.stock).find(k => String(k).trim().toLowerCase() === targetSize) || item.size;
                  const currentStock = parseInt(v.stock[sizeKey]) || 0;
                  const newQty = currentStock + restoreQty;
                  return { ...v, stock: { ...v.stock, [sizeKey]: newQty } };
                }
                return v;
              });

              updatedPayload.colorVariants = updatedVariants;
            } else {
              const currentStock = parseInt(product.stock) || 0;
              updatedPayload.stock = currentStock + restoreQty;
            }

            const safePayload = sanitizeProductForDb(updatedPayload);
            if (Object.keys(safePayload).length > 0) {
              const updatedProductFull = { ...product, ...safePayload };
              
              pendingUpdatesRef.current[product.id] = { 
                product: updatedProductFull, 
                timestamp: Date.now() 
              };

              const targetIdStr = String(product.id).trim().toLowerCase();
              workingProducts = workingProducts.map(p => {
                const pIdStr = String(p.id).trim().toLowerCase();
                return pIdStr === targetIdStr ? updatedProductFull : p;
              });

              await supabase.from('products').update(safePayload).eq('id', product.id);
            }
          }
        }

        setProducts([...workingProducts]);
        try { localStorage.setItem('pyjama_products_cache', JSON.stringify(workingProducts)); } catch(e) {}
        fetchData('products', setProducts);
      }

      // Process delivery API if status is changed to confirmee and no tracking number exists
      if (newStatus === 'confirmee' && orderToUpdate) {
        const isHanoutOrPos = Boolean(
          orderToUpdate.isPos === true || 
          orderToUpdate.clientName === 'زبون المحل (بيع حضوري)' || 
          orderToUpdate.commune === 'المتجر الحضوري'
        );

        if (!isHanoutOrPos && !orderToUpdate.trackingNumber && !orderToUpdate.tracking_number) {
          // Double check fresh database state to prevent race conditions with WhatsApp bot
          let alreadyHasTracking = false;
          try {
            const { data: dbOrder } = await supabase.from('orders').select('trackingNumber,shippingLabelUrl,deliveryCompany').eq('id', orderId).maybeSingle();
            if (dbOrder && dbOrder.trackingNumber) {
              alreadyHasTracking = true;
              updatePayload.trackingNumber = dbOrder.trackingNumber;
              updatePayload.shippingLabelUrl = dbOrder.shippingLabelUrl || '';
              updatePayload.deliveryCompany = dbOrder.deliveryCompany || orderToUpdate.deliveryCompany || 'yalidine';
            }
          } catch (e) {}

          if (!alreadyHasTracking && !parcelCreationLockRef.current.has(orderId)) {
            parcelCreationLockRef.current.add(orderId);
            try {
              const deliveryResult = await processOrderDelivery(orderToUpdate);
              if (deliveryResult && deliveryResult.success && deliveryResult.trackingNumber) {
                const compName = deliveryResult.deliveryCompany || orderToUpdate.deliveryCompany || 'yalidine';
                updatePayload.trackingNumber = deliveryResult.trackingNumber;
                updatePayload.shippingLabelUrl = deliveryResult.shippingLabelUrl || '';
                updatePayload.deliveryCompany = compName;
              } else {
                console.error('Failed to process delivery API:', deliveryResult?.error);
              }
            } catch (err) {
              console.error('Failed to process delivery API:', err);
            } finally {
              parcelCreationLockRef.current.delete(orderId);
            }
          }
        }
      }

      const { error: finalOrderErr } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
      if (!finalOrderErr) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatePayload } : o));
      } else {
        console.error("Supabase Order Update Error:", finalOrderErr);
      }
    } catch (err) {
      console.error("Critical error in handleUpdateOrderStatus:", err);
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
    if (newSettings.categories) {
      try {
        localStorage.setItem('pyjama_dz_categories_cache', JSON.stringify(newSettings.categories));
      } catch(e) {}
    }

    setSettings(prev => {
      const nextSettings = { ...prev, ...newSettings };
      try { localStorage.setItem('pyjama_settings_cache', JSON.stringify(nextSettings)); } catch(e) {}
      return nextSettings;
    });

    for (const [key, value] of Object.entries(newSettings)) {
      if (value === undefined || value === null) continue;
      const valStr = (key === 'categories' || typeof value === 'object') ? JSON.stringify(value) : (Array.isArray(value) ? value.join(' - ') : String(value));
      try {
        const { error } = await supabase.from('settings').upsert({ key, value: valStr }, { onConflict: 'key' });
        if (error) {
          console.error(`Supabase settings upsert error for key ${key}:`, error);
        }
      } catch (err) {
        console.error(`Error updating settings key ${key}:`, err);
      }
    }
  };

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const isAdminRoute = currentPath.toLowerCase().startsWith('/admin');
  const isGrosRoute = currentPath.toLowerCase().startsWith('/gros');
  const isCashierRoute = currentPath.toLowerCase().startsWith('/cashier');
  const isEmballageRoute = currentPath.toLowerCase().startsWith('/embalage') || currentPath.toLowerCase().startsWith('/emballage');
  const isAliRoute = currentPath.toLowerCase().startsWith('/ali');

  const enrichedOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    const filteredRealOrders = orders.filter(o => {
      if (o.status === 'account') return false;
      if (o.product === '_CUSTOMER_ACCOUNT_') return false;
      if (typeof o.product === 'object' && o.product?.type === '_CUSTOMER_ACCOUNT_') return false;
      return true;
    });

    const sorted = [...filteredRealOrders].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateA - dateB;
    });
    
    const idToTicket = {};
    sorted.forEach((order, index) => {
      const ticketNum = index + 1;
      idToTicket[order.id] = ticketNum < 10 ? `0${ticketNum}` : `${ticketNum}`;
    });

    return filteredRealOrders.map(order => ({
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
        ) : isAliRoute ? (
          <AliOwnerDashboard
            orders={enrichedOrders}
            products={products}
            expenses={expenses}
            settings={settings}
            onGoToStore={() => navigateTo('/')}
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
            orders={orders}
            settings={settings}
            onPlaceOrder={handlePlaceOrder}
            onUpdateSettings={handleUpdateSettings}
            onGoToGros={() => navigateTo('/gros')}
          />
        )}
      </Suspense>
      <CookieConsent />
      <ToastContainer />
    </div>
  );
}
