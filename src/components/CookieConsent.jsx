import React, { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted or declined cookies
    const cookieConsent = localStorage.getItem('pyjama_dz_cookie_consent');
    if (!cookieConsent) {
      // Small delay so it doesn't pop up instantly on first paint
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('pyjama_dz_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('pyjama_dz_cookie_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      background: '#0F172A',
      color: 'white',
      padding: '20px',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      zIndex: 999999,
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'var(--font-sans)',
      direction: 'rtl'
    }}>
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>نحن نهتم بخصوصيتك 🍪</h4>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94A3B8', lineHeight: '1.5' }}>
          نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك في تصفح متجرنا، تقديم إعلانات مخصصة، وتحليل حركة المرور. بالضغط على "قبول الكل"، فإنك توافق على استخدامنا لجميع ملفات تعريف الارتباط.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button 
          onClick={handleDecline}
          style={{
            background: 'transparent',
            color: '#CBD5E1',
            border: '1px solid #334155',
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#1E293B'; e.currentTarget.style.color = 'white'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CBD5E1'; }}
        >
          رفض الاختياري
        </button>
        <button 
          onClick={handleAccept}
          style={{
            background: 'var(--burgundy, #8B1818)',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(139, 24, 24, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          قبول الكل
        </button>
      </div>
    </div>
  );
}
