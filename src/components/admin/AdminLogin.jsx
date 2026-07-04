import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminLogin({ onLoginSuccess, onSwitchToClient }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const CORRECT_PIN = "765483"; // Le code PIN souhaité (6 chiffres)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loading) return;
      if (/^[0-9]$/.test(e.key)) {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading]);

  const handlePinInput = (num) => {
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
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = async (enteredPin) => {
    setLoading(true);
    if (enteredPin === CORRECT_PIN) {
      // Direct login since PIN is correct
      onLoginSuccess({ user: { role: 'admin' } });
    } else {
      setError(true);
      setTimeout(() => setPin(''), 500);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #4A0E17 0%, #1A0508 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-primary)' }}>
      <div className={`animate-fade-up ${error ? 'shake' : ''}`} style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--rose-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--burgundy)' }}>
          <Lock size={30} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: 6 }}>Espace Administrateur</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>Utilisez votre clavier pour taper le code PIN à 6 chiffres</p>
        
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
