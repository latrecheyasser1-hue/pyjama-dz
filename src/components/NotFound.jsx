import React from 'react';

export default function NotFound({ onGoHome, onGoGros, whatsapp = '0554128933' }) {
  const cleanPhone = String(whatsapp || '0554128933').replace(/\D/g, '');
  const waUrl = `https://wa.me/213${cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent('السلام عليكم، كنت نتصفح في موقع Pyjama DZ وخرجلي رابط غير موجود، حبيت نسألكم عن السلعة 🌸')}`;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FDF8F9 0%, #F8FAFC 100%)',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#1E293B',
      padding: '24px 16px'
    }}>
      {/* Top Header / Brand Bar */}
      <header style={{
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0 24px',
        borderBottom: '1px solid #F1E5E7'
      }}>
        <div 
          onClick={onGoHome}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #800020, #E11D48)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '1.3rem',
            boxShadow: '0 4px 14px rgba(128, 0, 32, 0.25)'
          }}>
            ✨
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#800020', lineHeight: 1.1 }}>
              Pyjama DZ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>
              متجر بيجامات الجزائر
            </div>
          </div>
        </div>

        <button
          onClick={onGoHome}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: '#800020',
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          الرئيسية 🏠
        </button>
      </header>

      {/* Main 404 Hero Container */}
      <main style={{
        maxWidth: '680px',
        margin: '40px auto',
        width: '100%',
        textAlign: 'center',
        background: '#FFFFFF',
        borderRadius: '32px',
        padding: '48px 24px',
        boxShadow: '0 20px 45px rgba(128, 0, 32, 0.06)',
        border: '1px solid #FDE8EC'
      }}>
        {/* Glowing Badge 404 */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 24px',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, #FFF1F3, #FFE4E8)',
          border: '1px solid #FECDD3',
          color: '#E11D48',
          fontSize: '0.95rem',
          fontWeight: 900,
          marginBottom: '20px',
          letterSpacing: '1px'
        }}>
          ⚠️ خطأ 404 — PAGE INTROUVABLE
        </div>

        {/* Big 404 Typography */}
        <div style={{
          fontSize: 'clamp(5rem, 15vw, 7.5rem)',
          fontWeight: 950,
          lineHeight: 1,
          margin: '0 0 16px 0',
          background: 'linear-gradient(135deg, #800020 0%, #E11D48 60%, #BE123C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-2px'
        }}>
          404
        </div>

        <h1 style={{
          fontSize: 'clamp(1.35rem, 4vw, 1.85rem)',
          fontWeight: 900,
          color: '#1E293B',
          margin: '0 0 14px 0',
          lineHeight: 1.3
        }}>
          عذراً، هذه الصفحة غير موجودة!
        </h1>

        <p style={{
          fontSize: '1.02rem',
          color: '#64748B',
          lineHeight: 1.75,
          margin: '0 auto 32px',
          maxWidth: '520px'
        }}>
          يبدو أن الرابط الذي دخلت إليه غير صحيح، أو ربما تم بيع هذا الموديل ونقله. لا تقلق، كامل تشكيلاتنا الجديدة الفاخرة بانتظارك!
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '420px',
          margin: '0 auto'
        }}>
          <button
            onClick={onGoHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, #800020 0%, #E11D48 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '16px 28px',
              borderRadius: '16px',
              fontSize: '1.05rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(225, 29, 72, 0.28)',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
          >
            <span>🛍️</span>
            <span>العودة للتسوق في المتجر</span>
          </button>

          {onGoGros && (
            <button
              onClick={onGoGros}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#F8FAFC',
                color: '#334155',
                border: '1px solid #E2E8F0',
                padding: '14px 28px',
                borderRadius: '16px',
                fontSize: '0.98rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <span>📦</span>
              <span>تصفح عروض الجملة (Gros)</span>
            </button>
          )}

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#F0FDF4',
              color: '#166534',
              border: '1px solid #BBF7D0',
              padding: '13px 24px',
              borderRadius: '16px',
              fontSize: '0.92rem',
              fontWeight: 800,
              textDecoration: 'none',
              marginTop: '4px'
            }}
          >
            <span>💬</span>
            <span>تحتاج مساعدة؟ تواصل معنا عبر واتساب</span>
          </a>
        </div>

        {/* Confidence Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginTop: '36px',
          paddingTop: '24px',
          borderTop: '1px solid #F1F5F9'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
            🚚 توصيل لـ 58 ولاية
          </div>
          <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
            🔍 فحص السلعة قبل الدفع
          </div>
          <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
            🔄 ضمان الاستبدال والاسترجاع
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        fontSize: '0.82rem',
        color: '#94A3B8',
        padding: '16px 0 8px'
      }}>
        © 2026 Pyjama DZ — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
