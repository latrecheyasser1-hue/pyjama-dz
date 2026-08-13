import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminLogin({ onLoginSuccess, onSwitchToClient }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return Number(localStorage.getItem('admin_login_failed_attempts') || 0);
  });
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  const CORRECT_PIN = "765483"; // Le code PIN souhaité (6 chiffres)

  useEffect(() => {
    const checkLockout = () => {
      const lockUntil = Number(localStorage.getItem('admin_login_lockout_until') || 0);
      const remainingSec = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remainingSec > 0) {
        setLockoutTimeLeft(remainingSec);
      } else {
        setLockoutTimeLeft(0);
        localStorage.removeItem('admin_login_lockout_until');
      }
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loading || lockoutTimeLeft > 0) return;
      if (/^[0-9]$/.test(e.key)) {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading, lockoutTimeLeft]);

  const handlePinInput = (num) => {
    if (lockoutTimeLeft > 0) return;
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (lockoutTimeLeft > 0) return;
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = async (enteredPin) => {
    if (lockoutTimeLeft > 0) return;
    setLoading(true);
    if (enteredPin === CORRECT_PIN) {
      localStorage.removeItem('admin_login_failed_attempts');
      localStorage.removeItem('admin_login_lockout_until');
      setFailedAttempts(0);
      onLoginSuccess({ user: { role: 'admin' } });
    } else {
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);
      localStorage.setItem('admin_login_failed_attempts', String(nextFailCount));

      if (nextFailCount >= 5) {
        const lockUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lockout!
        localStorage.setItem('admin_login_lockout_until', String(lockUntil));
        localStorage.setItem('admin_login_failed_attempts', '0');
        setFailedAttempts(0);
        setLockoutTimeLeft(300);
      }

      setError(true);
      setTimeout(() => setPin(''), 500);
    }
    setLoading(false);
  };

  const formatMinSec = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #4A0E17 0%, #1A0508 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-primary)' }}>
      <div className={`animate-fade-up ${error ? 'shake' : ''}`} style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--rose-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--burgundy)' }}>
          <Lock size={30} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: 6 }}>Espace Administrateur</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 18 }}>Utilisez votre clavier pour taper le code PIN à 6 chiffres</p>
        
        {lockoutTimeLeft > 0 ? (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', padding: '14px', borderRadius: '14px', color: '#991B1B', fontSize: '0.85rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.5 }}>
            ⚠️ تم تجميد لوحة الدخول لحماية المتجر (5 محاولات خاطئة متكررة).
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#DC2626', marginTop: '6px' }}>
              الرجاء الانتظار {formatMinSec(lockoutTimeLeft)} ⏳
            </div>
          </div>
        ) : failedAttempts > 0 ? (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '8px 12px', borderRadius: '10px', color: '#92400E', fontSize: '0.8rem', fontWeight: 700, marginBottom: '16px' }}>
            تنبيه: محاولات خاطئة ({failedAttempts}/5) - سيتوقف الدخول عند المحاولة الـ 5
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: pin.length > i ? 'var(--burgundy)' : '#E2E8F0', transition: 'all 0.2s', transform: pin.length > i ? 'scale(1.2)' : 'scale(1)' }} />
          ))}
        </div>
        
        <button type="button" onClick={onSwitchToClient} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '14px', width: '100%', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
          Retour à la boutique
        </button>

        <style>{`
          .shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          }
          @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
          }
        `}</style>
      </div>
    </div>
  );
}
