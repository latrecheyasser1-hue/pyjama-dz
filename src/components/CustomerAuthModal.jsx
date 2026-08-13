import React, { useState, useEffect } from 'react';
import { X, Lock, Phone, User, CheckCircle2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { generateOTPCode, verifyOTPCode, registerCustomer, loginCustomer } from '../services/customerService';
import { ALGERIA_WILAYAS } from '../data/mockData';
import { getCommunesForWilaya } from '../data/algeriaCities';

export default function CustomerAuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState('register'); // 'login' or 'register'
  
  // Registration form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');

  // OTP Verification state
  const [step, setStep] = useState('input'); // 'input' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [toastOTP, setToastOTP] = useState(null); // Show OTP code on screen for quick Localhost testing

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 60-second Countdown Timer Effect
  useEffect(() => {
    let interval = null;
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSeconds]);

  if (!isOpen) return null;

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('يرجى كتابة الاسم واللقب الكامل');
      return;
    }
    if (!phone || phone.trim().length < 9) {
      setErrorMsg('يرجى كتابة رقم هاتف/واتساب صحيح (مثلاً: 0770123456)');
      return;
    }
    if (!password || password.trim().length < 4) {
      setErrorMsg('يرجى اختيار كلمة سر من 4 أحرف/أرقام على الأقل');
      return;
    }

    setLoading(true);
    try {
      // Generate 60s 4-digit OTP
      const { code } = generateOTPCode(phone);
      setToastOTP(code);

      // Trigger WhatsApp API request to send OTP message
      try {
        const msg = `رمز تأكيد حسابكِ في متجر Pyjama DZ - بيجامات الجزائر هو: ${code} 🔒\n\n⏱️ الرمز صالـح لمدة دقيقة واحدة (1 MIN) فقط.\nيرجى إدخاله في المتجر لإتمام إنشاء الحساب بنجاح ✨`;
        await fetch('http://localhost:3001/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: msg })
        });
      } catch (err) {
        console.log('WhatsApp Bot local fetch note (running mock fallback):', err);
      }

      setStep('otp');
      setTimerSeconds(60);
      setIsTimerActive(true);
      setSuccessMsg('تم إرسال رمز التأكيد 🔒 إلى رقم الواتساب الخاص بك!');
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال الكود، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMsg('يرجى إدخال رمز التأكيد المكون من 4 أرقام');
      return;
    }

    const { valid, reason } = verifyOTPCode(phone, otpCode);
    if (!valid) {
      setErrorMsg(reason);
      return;
    }

    setLoading(true);
    try {
      const customer = await registerCustomer({
        fullName,
        phone,
        password,
        wilaya: selectedWilaya,
        commune: selectedCommune
      });

      setSuccessMsg('مبروك! تم إنشاء حسابكِ بنجاح 🎉');
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(customer);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone || phone.trim().length < 9) {
      setErrorMsg('يرجى كتابة رقم الهاتف المسجل');
      return;
    }
    if (!password) {
      setErrorMsg('يرجى كتابة كلمة السر');
      return;
    }

    setLoading(true);
    try {
      const customer = await loginCustomer(phone, password);
      setSuccessMsg(`أهلاً وسهلاً بكِ مجدداً ${customer.full_name || ''} 👋`);
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(customer);
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const communesList = selectedWilaya ? getCommunesForWilaya(selectedWilaya) : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(226, 232, 240, 0.8)', position: 'relative' }}>
        
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', padding: '24px 20px', color: '#FFFFFF', position: 'relative' }}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#FFFFFF', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <X size={18} />
          </button>
          
          <div style={{ marginBottom: '6px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-arabic, sans-serif)' }}>
              حسابي في Pyjama DZ
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#FFE4E6', opacity: 0.95 }}>
            تتبع طلبياتك وحفظ بيانات التوصيل بنقرة واحدة
          </p>

          {/* Tabs header */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px', background: 'rgba(0, 0, 0, 0.15)', padding: '4px', borderRadius: '14px' }}>
            <button
              onClick={() => { setActiveTab('register'); setStep('input'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'register' ? '#FFFFFF' : 'transparent', color: activeTab === 'register' ? '#881337' : '#FFFFFF' }}
            >
              إنشاء حساب جديد
            </button>
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'login' ? '#FFFFFF' : 'transparent', color: activeTab === 'login' ? '#881337' : '#FFFFFF' }}
            >
              تسجيل الدخول
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 20px' }}>
          
          {/* Toast OTP Banner for Localhost verification */}
          {toastOTP && step === 'otp' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 14px', borderRadius: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="#16A34A" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803D' }}>رمز الواتساب التجريبي:</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#166534', letterSpacing: '3px', background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', border: '1px solid #86EFAC' }}>
                {toastOTP}
              </span>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: REGISTRATION */}
          {activeTab === 'register' && (
            <div>
              {step === 'input' ? (
                <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      الاسم واللقب الكامل *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder=""
                        style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      />
                      <User size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      رقم الهاتف / الواتساب (WhatsApp) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder=""
                        style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      />
                      <Phone size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      كلمة السر اختيارك (Mot de passe) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder=""
                        style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      />
                      <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', marginTop: '6px', padding: '14px', background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: '#FFFFFF', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px -4px rgba(37, 211, 102, 0.4)', transition: 'all 0.2s' }}
                  >
                    {loading ? <RefreshCw className="spin" size={20} /> : <MessageSquare size={20} />}
                    إرسال كود التأكيد عبر الواتساب (WhatsApp)
                  </button>
                </form>
              ) : (
                /* STEP 2: OTP ENTRY */
                <form onSubmit={handleVerifyAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center', background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                      أدخل رمز التأكيد المكون من 4 أرقام المندرج لرقمك:
                    </p>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#BE123C' }}>{phone}</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px', textAlign: 'center' }}>
                      رمز التأكيد (4 أرقام)
                    </label>
                    <input 
                      type="text"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • •"
                      style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #E2E8F0', fontSize: '1.8rem', fontWeight: 900, textAlign: 'center', letterSpacing: '12px', outline: 'none', color: '#881337', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* 60-Second Countdown Timer & Resend */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: isTimerActive ? '#059669' : '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⏱️ الرمز صالـح لمدة: {isTimerActive ? `0:${timerSeconds < 10 ? '0' + timerSeconds : timerSeconds}` : 'انتهت الصلاحية'}
                    </span>
                    
                    <button
                      type="button"
                      disabled={isTimerActive || loading}
                      onClick={handleSendOTP}
                      style={{ background: 'none', border: 'none', color: isTimerActive ? '#94A3B8' : '#2563EB', fontWeight: 800, cursor: isTimerActive ? 'not-allowed' : 'pointer', textDecoration: 'underline' }}
                    >
                      إعادة إرسال رمز جديد
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', color: '#FFFFFF', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px -4px rgba(190, 18, 60, 0.4)' }}
                  >
                    {loading ? <RefreshCw className="spin" size={20} /> : <CheckCircle2 size={20} />}
                    تأكيد وإنشاء الحساب ✅
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    تعديل البيانات أو رقم الهاتف ✏️
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  رقم الهاتف (الواتساب) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder=""
                    style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <Phone size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  كلمة السر *
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', marginTop: '6px', padding: '14px', background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', color: '#FFFFFF', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px -4px rgba(190, 18, 60, 0.4)' }}
              >
                {loading ? <RefreshCw className="spin" size={20} /> : <CheckCircle2 size={20} />}
                تسجيل الدخول 👋
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
