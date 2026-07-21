import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, ArrowLeft, RefreshCw, Volume2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { showToast } from '../utils/toast';
import AdminLogin from './admin/AdminLogin';
import Sidebar from './admin/Sidebar';
import OrdersTab from './admin/OrdersTab';
import StockTab from './admin/StockTab';
import SuppliersTab from './admin/SuppliersTab';
import AnalyticsTab from './admin/AnalyticsTab';
import HistoryTab from './admin/HistoryTab';
import SettingsTab from './admin/SettingsTab';
import CategoriesTab from './admin/CategoriesTab';
import PosModal from './admin/PosModal';
import ClientsTab from './admin/ClientsTab';
import ReclamationsTab from './admin/ReclamationsTab';

import { usePWAInstall } from '../hooks/usePWAInstall';

export default function AdminDashboard({
  orders,
  products,
  suppliers,
  expenses,
  settings,
  onPlaceOrder,
  onUpdateStatus,
  onDeleteOrder,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddExpense,
  onDeleteExpense,
  onUpdateSettings,
  onSwitchToClient
}) {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [authLoading, setAuthLoading] = useState(true);

  const [showPosModal, setShowPosModal] = useState(false);
  const [posCart, setPosCart] = useState([]);

  const addProductToPosCart = (prod) => {
    setPosCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.productId === prod.id || (prod.barcode && item._productRef?.barcode === prod.barcode));
      if (existingIndex !== -1) {
        const updated = [...prevCart];
        const existingItem = updated[existingIndex];
        const newQty = (Number(existingItem.qty) || 0) + 1;
        updated[existingIndex] = {
          ...existingItem,
          qty: newQty,
          total: (Number(existingItem.price) || 0) * newQty
        };
        return updated;
      } else {
        const defColor = prod.colorVariants?.[0]?.color || 'Standard';
        const defColObj = prod.colorVariants?.find(cv => cv.color === defColor);
        const availSizes = defColObj?.stock ? Object.keys(defColObj.stock) : (prod.sizes || ['Standard']);
        const defSize = availSizes[0] || 'Standard';
        const itemPrice = Number(prod.price) || 0;

        const newItem = {
          productId: prod.id,
          product: prod.title,
          image: (prod.images && prod.images.length > 0 ? prod.images[0] : prod.image) || "",
          color: defColor,
          size: defSize,
          qty: 1,
          price: itemPrice,
          total: itemPrice,
          _productRef: prod
        };
        return [...prevCart, newItem];
      }
    });
  };

  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showPosModal) return;
      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 150) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length >= 3) {
          const matchedProd = products.find(p => 
            (p.barcode && String(p.barcode).trim() === scannedCode) ||
            (p.id && String(p.id).trim() === scannedCode)
          );

          if (matchedProd) {
            e.preventDefault();
            addProductToPosCart(matchedProd);
            setShowPosModal(true);
            barcodeBufferRef.current = '';
            return;
          } else if (barcodeBufferRef.current.length >= 6) {
            e.preventDefault();
            showToast(`⚠️ تنبيه: الكود بار الممسوح (${scannedCode}) غير مسجل في المخزون!`, 'warning');
            barcodeBufferRef.current = '';
            return;
          }
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, showPosModal]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track previous orders count to trigger sound on new order entry
  const prevOrdersCountRef = useRef(orders.length);

  // Web Audio API Sound Generator for Real-Time Order Notification
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Chime sequence: High-Low-High happy notification
      const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + startTime);
        osc.stop(audioCtx.currentTime + startTime + duration);
      };

      playTone(587.33, 0, 0.15);     // D5
      playTone(880.00, 0.15, 0.35);  // A5
    } catch (e) {
      console.log("Audio not allowed or blocked by browser", e);
    }
  };

  useEffect(() => {
    if (session && orders.length > prevOrdersCountRef.current) {
      playNotificationSound();
    }
    prevOrdersCountRef.current = orders.length;
  }, [orders, session]);

  // Active new orders count
  const newOrdersCount = orders.filter(o => o.status === 'nouvelle').length;

  const reclamationsCount = React.useMemo(() => {
    const list = settings?.reclamations && Array.isArray(settings.reclamations) ? settings.reclamations : [];
    return list.filter(r => r.status === 'nouvelle').length;
  }, [settings?.reclamations]);

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F1EA', color: 'var(--burgundy)', fontWeight: 700 }}>جاري التحميل...</div>;

  if (!session) {
    return <AdminLogin onSwitchToClient={onSwitchToClient} onLoginSuccess={setSession} />;
  }

  // Main Dashboard Content when Unlocked
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F1EA', fontFamily: 'var(--font-primary)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        newOrdersCount={newOrdersCount}
        reclamationsCount={reclamationsCount}
        onLock={async () => await supabase.auth.signOut()}
        onSwitchToClient={onSwitchToClient}
        playNotificationSound={playNotificationSound}
        onOpenPos={() => setShowPosModal(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, position: 'relative' }}>
        
        {isInstallable && (
          <button 
            onClick={promptInstall}
            style={{ position: 'absolute', top: 24, right: 24, zIndex: 50, background: 'var(--burgundy)', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            تثبيت التطبيق 📱
          </button>
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            products={products}
            settings={settings}
            onPlaceOrder={onPlaceOrder}
            onUpdateProduct={onUpdateProduct}
            onUpdateStatus={onUpdateStatus}
            onDeleteOrder={onDeleteOrder}
            onOpenPos={() => setShowPosModal(true)}
          />
        )}

        {activeTab.startsWith('stock_') && (
          <StockTab
            products={products}
            suppliers={suppliers}
            settings={settings}
            onAddProduct={onAddProduct}
            onUpdateProduct={onUpdateProduct}
            onDeleteProduct={onDeleteProduct}
            stockMode={activeTab.replace('stock_', '')}
            onTabChange={setActiveTab}
            isPosOpen={showPosModal}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            products={products}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers}
            onAddSupplier={onAddSupplier}
            onUpdateSupplier={onUpdateSupplier}
            onDeleteSupplier={onDeleteSupplier}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsTab
            orders={orders}
            products={products}
          />
        )}

        {activeTab === 'reclamations' && (
          <ReclamationsTab
            settings={settings}
            onUpdateSettings={onUpdateSettings}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            orders={orders}
            products={products}
            expenses={expenses}
            onAddExpense={onAddExpense}
            onDeleteExpense={onDeleteExpense}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            orders={orders}
            products={products}
            settings={settings}
            onUpdateStatus={onUpdateStatus}
            onUpdateProduct={onUpdateProduct}
            onDeleteOrder={onDeleteOrder}
            onUpdateSettings={onUpdateSettings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            
          />
        )}

        <PosModal
          show={showPosModal}
          onClose={() => setShowPosModal(false)}
          products={products}
          settings={settings}
          posCart={posCart}
          setPosCart={setPosCart}
          addProductToPosCart={addProductToPosCart}
          onPlaceOrder={onPlaceOrder}
          onUpdateProduct={onUpdateProduct}
        />
      </main>
    </div>
  );
}
