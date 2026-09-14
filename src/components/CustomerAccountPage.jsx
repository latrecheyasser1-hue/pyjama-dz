import React, { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag, Sparkles, ShieldCheck } from 'lucide-react';
import { SignIn, SignUp, useUser } from '@clerk/clerk-react';

export default function CustomerAccountPage({ onBackToStore, onAuthSuccess }) {
  const { isSignedIn, user, isLoaded } = useUser();
  const [mode, setMode] = useState('sign-in'); // 'sign-in' or 'sign-up'

  // Auto-transition to dashboard on successful Clerk authentication
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const custObj = {
        id: user.id,
        full_name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'زبون المتجر',
        email: user.primaryEmailAddress?.emailAddress || '',
        phone: user.primaryPhoneNumber?.phoneNumber || '',
        imageUrl: user.imageUrl,
        isClerk: true
      };
      if (onAuthSuccess) {
        onAuthSuccess(custObj);
      }
    }
  }, [isLoaded, isSignedIn, user, onAuthSuccess]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF5F5',
      padding: '24px 16px',
      direction: 'rtl',
      fontFamily: 'Cairo, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Top Bar with Back to Store */}
      <div style={{
        maxWidth: '520px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <button
          type="button"
          onClick={onBackToStore}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FFFFFF',
            color: '#8B1818',
            border: '1.5px solid #F3E8E8',
            borderRadius: '12px',
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(139, 24, 24, 0.06)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#8B1818';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.color = '#8B1818';
          }}
        >
          <ArrowRight size={18} />
          <span>الرجوع إلى المتجر</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#8B1818',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShoppingBag size={20} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1E293B' }}>
            Pyjama DZ
          </span>
        </div>
      </div>

      {/* Branded Header Notice */}
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid #F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={18} color="#8B1818" />
            <span>{mode === 'sign-in' ? 'تسجيل الدخول إلى حسابكِ' : 'إنشاء حساب جديد'}</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
            متابعة فورية للطلبيات، نقاط الوفاء، وتخفيضات حصرية
          </p>
        </div>

        {/* Toggle Mode Button */}
        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          style={{
            backgroundColor: '#FFF1F2',
            color: '#8B1818',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {mode === 'sign-in' ? 'ليس لديكِ حساب؟ سجّلي الآن' : 'لديكِ حساب؟ سجّلي الدخول'}
        </button>
      </div>

      {/* Clerk Auth Card Container */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '520px'
      }}>
        {mode === 'sign-in' ? (
          <SignIn
            routing="virtual"
            appearance={{
              variables: {
                colorPrimary: '#8B1818',
                borderRadius: '16px',
                fontFamily: 'Cairo, sans-serif'
              },
              elements: {
                card: {
                  boxShadow: '0 10px 30px rgba(139, 24, 24, 0.08)',
                  border: '1px solid #F1F5F9'
                }
              }
            }}
          />
        ) : (
          <SignUp
            routing="virtual"
            appearance={{
              variables: {
                colorPrimary: '#8B1818',
                borderRadius: '16px',
                fontFamily: 'Cairo, sans-serif'
              },
              elements: {
                card: {
                  boxShadow: '0 10px 30px rgba(139, 24, 24, 0.08)',
                  border: '1px solid #F1F5F9'
                }
              }
            }}
          />
        )}
      </div>

      {/* Bottom Guest Assurance Banner */}
      <div style={{
        marginTop: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.82rem',
        color: '#64748B'
      }}>
        <ShieldCheck size={16} color="#10B981" />
        <span>الشراء السريع كـ ضيف متاح دائماً عند الطلب دون الحاجة لتسجيل الدخول</span>
      </div>
    </div>
  );
}
