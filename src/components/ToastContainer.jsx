import React, { useState, useEffect } from 'react';
import { subscribeToToast } from '../utils/toast';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToToast((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration !== Infinity) {
        setTimeout(() => {
          removeToast(newToast.id);
        }, newToast.duration || 3500);
      }
    });

    return () => unsubscribe();
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getStyleAndIcon = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={22} color="#10B981" style={{ flexShrink: 0 }} />,
          border: '#10B981',
          background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
          textColor: '#065F46'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={22} color="#F59E0B" style={{ flexShrink: 0 }} />,
          border: '#F59E0B',
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          textColor: '#92400E'
        };
      case 'error':
        return {
          icon: <XCircle size={22} color="#EF4444" style={{ flexShrink: 0 }} />,
          border: '#EF4444',
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
          textColor: '#991B1B'
        };
      default:
        return {
          icon: <Info size={22} color="#3B82F6" style={{ flexShrink: 0 }} />,
          border: '#3B82F6',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
          textColor: '#1E40AF'
        };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        left: '24px',
        maxWidth: '440px',
        marginLeft: 'auto',
        marginRight: 'auto',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((t) => {
        const style = getStyleAndIcon(t.type);
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '16px 18px',
              borderRadius: '16px',
              background: style.background,
              border: `2px solid ${style.border}`,
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(12px)',
              animation: 'toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              color: style.textColor,
              direction: 'rtl'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
              {style.icon}
              <span style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.5, wordBreak: 'break-word' }}>
                {t.message}
              </span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: style.textColor,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseOut={(e) => (e.currentTarget.style.opacity = 0.7)}
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes toastSlideIn {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
