import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = "تأكيد الإجراء",
  message = "هل أنت متأكد من القيام بهذا الإجراء؟ لا يمكن التراجع عن هذا العمل.",
  confirmText = "نعم، تأكيد الحذف",
  cancelText = "إلغاء والتراجع",
  onConfirm,
  onClose,
  isDanger = true
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '440px',
          padding: '32px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-light, #E2E8F0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Close Icon Top Left/Right */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="إغلاق"
        >
          <X size={18} color="#64748B" />
        </button>

        {/* Warning Icon Banner */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: isDanger ? '#FEE2E2' : '#FEF3C7',
            color: isDanger ? '#DC2626' : '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: isDanger ? '0 0 20px rgba(220, 38, 38, 0.18)' : '0 0 20px rgba(217, 119, 6, 0.18)'
          }}
        >
          {isDanger ? <Trash2 size={36} /> : <AlertTriangle size={36} />}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-dark, #1E293B)',
            marginBottom: '12px',
            lineHeight: 1.3
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: '0.96rem',
            color: 'var(--text-muted, #64748B)',
            lineHeight: 1.6,
            marginBottom: '28px',
            fontWeight: 500
          }}
        >
          {message}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: isDanger ? '#DC2626' : 'var(--burgundy, #581845)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isDanger ? '0 4px 14px rgba(220, 38, 38, 0.35)' : '0 4px 14px rgba(88, 24, 69, 0.35)',
              transition: 'transform 0.15s ease, background 0.2s ease'
            }}
          >
            {isDanger && <Trash2 size={18} />}
            <span>{confirmText}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: '#F8FAFC',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
