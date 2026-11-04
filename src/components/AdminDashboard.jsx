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
import ClientsTab from './admin/ClientsTab';
import ReclamationsTab from './admin/ReclamationsTab';
import ExchangesReturnsTab from './admin/ExchangesReturnsTab';

import { usePWAInstall } from '../hooks/usePWAInstall';
import { playNotificationSound } from '../utils/audio';

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
  onRefreshOrders,
  onSwitchToClient
}) {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const normalizedActiveTab = (activeTab === 'exchanges_returns') ? 'exchanges' : (activeTab === 'stock' ? 'stock_livraison' : activeTab);
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['orders', (activeTab === 'exchanges_returns') ? 'exchanges' : (activeTab === 'stock' ? 'stock_livraison' : activeTab)]));

  useEffect(() => {
    setMountedTabs(prev => {
      if (prev.has(normalizedActiveTab)) return prev;
      const next = new Set(prev);
      next.add(normalizedActiveTab);
      return next;
    });
  }, [normalizedActiveTab]);

  // POS modal and scanner removed as requested

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

  // Pure real orders list (filtering out reclamations)
  const realOrders = React.useMemo(() => {
    return (orders || []).filter(o => o.deliveryMode !== 'reclamation' && o.deliveryCompany !== 'RECLAMATION' && o.orderType !== 'reclamation');
  }, [orders]);

  // Track previous orders count to trigger sound on new order entry
  const prevOrdersCountRef = useRef(realOrders.length);

  useEffect(() => {
    if (session && realOrders.length > prevOrdersCountRef.current && prevOrdersCountRef.current > 0) {
      playNotificationSound();
    }
    prevOrdersCountRef.current = realOrders.length;
  }, [realOrders.length, session]);

  // Active new orders count (real orders only)
  const newOrdersCount = realOrders.filter(o => o.status === 'nouvelle').length;

  const isOrderRetour = (order) => {
    if (!order) return false;
    if (order.isRetour === true || order.orderType === 'retour' || order.orderType === 'return') return true;
    if (order.exchangeDetails?.type === 'retour' || order.exchangeDetails?.isRetour === true) return true;
    if (Array.isArray(order.items) && order.items.some(it => it && (it.isRetour === true || it.isReturnMeta === true))) {
      return true;
    }
    const clientName = String(order.clientName || '').toLowerCase();
    const product = String(order.product || '').toLowerCase();
    if (clientName.includes('طلب استرجاع') || product.includes('طلب استرجاع') || product.includes('طلب إرجاع')) {
      return true;
    }
    return false;
  };

  const isOrderExchange = (order) => {
    if (!order) return false;
    if (isOrderRetour(order)) return false;
    if (order.isExchange === true || order.orderType === 'exchange') return true;
    const clientName = String(order.clientName || '').toLowerCase();
    const product = String(order.product || '').toLowerCase();
    if (clientName.includes('استبدال') || clientName.includes('تبديل') || clientName.includes('échange') || clientName.includes('echange')) {
      return true;
    }
    if (product.includes('استبدال') || product.includes('تبديل')) return true;
    if (order.exchangeDetails) return true;
    if (Array.isArray(order.items) && order.items.some(it => it && (it.isExchangeItem || it.isExchangeMeta))) return true;
    return false;
  };

  const pendingExchangesCount = React.useMemo(() => {
    return (orders || []).filter(order => {
      if (!isOrderExchange(order)) return false;
      const isApproved = order.exchangeStatus === 'approved' || (order.trackingNumber && order.status !== 'annulee');
      const isRejected = order.exchangeStatus === 'rejected' || order.status === 'annulee';
      return !isApproved && !isRejected;
    }).length;
  }, [orders]);

  const pendingRetoursCount = React.useMemo(() => {
    return (orders || []).filter(order => {
      if (!isOrderRetour(order)) return false;
      const isApproved = order.exchangeStatus === 'approved' || (order.trackingNumber && order.status !== 'annulee');
      const isRejected = order.exchangeStatus === 'rejected' || order.status === 'annulee';
      return !isApproved && !isRejected;
    }).length;
  }, [orders]);

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
    <div style={{ display: 'flex', height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: '#F4F1EA', fontFamily: 'var(--font-primary)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        newOrdersCount={newOrdersCount}
        pendingExchangesCount={pendingExchangesCount}
        pendingRetoursCount={pendingRetoursCount}
        reclamationsCount={reclamationsCount}
        onLock={async () => await supabase.auth.signOut()}
        onSwitchToClient={onSwitchToClient}
        playNotificationSound={playNotificationSound}
      />

      {/* Main Content Area */}
      <main className="admin-main-scroll" style={{ flex: 1, height: '100vh', maxHeight: '100vh', padding: '24px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, position: 'relative' }}>
        


        {/* Persistent Keep-Alive Tab Panels */}
        {mountedTabs.has('orders') && (
          <div style={{ display: normalizedActiveTab === 'orders' ? 'block' : 'none' }}>
            <OrdersTab
              orders={realOrders}
              products={products}
              settings={settings}
              onPlaceOrder={onPlaceOrder}
              onUpdateProduct={onUpdateProduct}
              onUpdateStatus={onUpdateStatus}
              onDeleteOrder={onDeleteOrder}
              onRefreshOrders={onRefreshOrders}
            />
          </div>
        )}

        {mountedTabs.has('exchanges') && (
          <div style={{ display: normalizedActiveTab === 'exchanges' ? 'block' : 'none' }}>
            <ExchangesReturnsTab
              orders={orders}
              products={products}
              settings={settings}
              mode="exchange"
              onUpdateStatus={onUpdateStatus}
              onTabChange={setActiveTab}
            />
          </div>
        )}

        {mountedTabs.has('retours') && (
          <div style={{ display: normalizedActiveTab === 'retours' ? 'block' : 'none' }}>
            <ExchangesReturnsTab
              orders={orders}
              products={products}
              settings={settings}
              mode="retour"
              onUpdateStatus={onUpdateStatus}
              onTabChange={setActiveTab}
            />
          </div>
        )}

        {mountedTabs.has('stock_livraison') && (
          <div style={{ display: normalizedActiveTab === 'stock_livraison' ? 'block' : 'none' }}>
            <StockTab
              products={products}
              suppliers={suppliers}
              settings={settings}
              onAddProduct={onAddProduct}
              onUpdateProduct={onUpdateProduct}
              onDeleteProduct={onDeleteProduct}
              stockMode="livraison"
              onTabChange={setActiveTab}
              isActive={normalizedActiveTab === 'stock_livraison'}
            />
          </div>
        )}

        {mountedTabs.has('categories') && (
          <div style={{ display: normalizedActiveTab === 'categories' ? 'block' : 'none' }}>
            <CategoriesTab
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              products={products}
              setActiveTab={setActiveTab}
            />
          </div>
        )}

        {mountedTabs.has('suppliers') && (
          <div style={{ display: normalizedActiveTab === 'suppliers' ? 'block' : 'none' }}>
            <SuppliersTab
              suppliers={suppliers}
              onAddSupplier={onAddSupplier}
              onUpdateSupplier={onUpdateSupplier}
              onDeleteSupplier={onDeleteSupplier}
            />
          </div>
        )}

        {mountedTabs.has('clients') && (
          <div style={{ display: normalizedActiveTab === 'clients' ? 'block' : 'none' }}>
            <ClientsTab
              orders={orders}
              products={products}
            />
          </div>
        )}

        {mountedTabs.has('reclamations') && (
          <div style={{ display: normalizedActiveTab === 'reclamations' ? 'block' : 'none' }}>
            <ReclamationsTab
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        )}

        {mountedTabs.has('analytics') && (
          <div style={{ display: normalizedActiveTab === 'analytics' ? 'block' : 'none' }}>
            <AnalyticsTab
              orders={orders}
              products={products}
              expenses={expenses}
              onAddExpense={onAddExpense}
              onDeleteExpense={onDeleteExpense}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        )}

        {mountedTabs.has('history') && (
          <div style={{ display: normalizedActiveTab === 'history' ? 'block' : 'none' }}>
            <HistoryTab
              orders={orders}
              products={products}
              settings={settings}
              onUpdateStatus={onUpdateStatus}
              onUpdateProduct={onUpdateProduct}
              onDeleteOrder={onDeleteOrder}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        )}

        {mountedTabs.has('settings') && (
          <div style={{ display: normalizedActiveTab === 'settings' ? 'block' : 'none' }}>
            <SettingsTab
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        )}

        </main>
    </div>
  );
}
