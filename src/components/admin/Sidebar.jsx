import React from 'react';
import { Package, ShoppingBag, Users, BarChart3, History, Settings, Lock, ExternalLink, Bell, Volume2 } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, newOrdersCount, onLock, onSwitchToClient, playNotificationSound, onOpenPos }) {
  const menuItems = [
    { id: 'orders', label: '📥 الطلبيات الجديدة', desc: 'Commandes en temps réel', badge: newOrdersCount > 0 ? newOrdersCount : null },
    { id: 'stock', label: '📦 المخزون والمنتجات', desc: 'Gestion catalogue & tailles' },
    { id: 'suppliers', label: '🤝 الموردين', desc: 'Annuaire fournisseurs' },
    { id: 'analytics', label: '📊 التحليلات والمصاريف', desc: 'Marge, Achats & Caisse' },
    { id: 'history', label: '📜 سجل الطلبيات', desc: 'Historique complet' },
    { id: 'settings', label: '⚙️ الإعدادات', desc: 'Code PIN & Réseaux' }
  ];

  return (
    <aside style={{
      width: '250px',
      background: 'var(--burgundy-dark)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 16px',
      minHeight: '100vh',
      boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
      flexShrink: 0
    }}>
      <div>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--rose-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', color: 'white' }}>
            P
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Pyjama DZ</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--champagne)', fontWeight: 600 }}>Pro Admin OS v2.5</span>
          </div>
        </div>


        {/* Navigation Menu */}
        <nav style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {menuItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive ? 'var(--rose-primary)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-primary)'
                }}
              >
                <div>
                  <div style={{ fontWeight: isActive ? 800 : 600, fontSize: '0.95rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: isActive ? 'white' : 'rgba(255,255,255,0.6)' }}>{item.desc}</div>
                </div>
                {item.badge && (
                  <span style={{
                    background: '#FFD700',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={playNotificationSound}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
          title="Tester l'alerte sonore des commandes"
        >
          <Volume2 size={16} color="var(--champagne)" />
          <span>Test Sonore (تجرِبة الصوت)</span>
        </button>

        <button
          onClick={onSwitchToClient}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <ExternalLink size={16} />
          <span>Voir Boutique Client</span>
        </button>

        <button
          onClick={onLock}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: '8px',
            background: '#D32F2F',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 800
          }}
        >
          <Lock size={16} />
          <span>Quitter & Verrouiller (قفل)</span>
        </button>
      </div>
    </aside>
  );
}
