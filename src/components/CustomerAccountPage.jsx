import React, { useState, useEffect } from 'react';
import { ArrowRight, Lock, Phone, User, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { generateOTPCode, verifyOTPCode, registerCustomer, loginCustomer, loginOrCreateWithOTP } from '../services/customerService';

export default function CustomerAccountPage({ onBackToStore, onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'login'
  
  // Registration form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Eye Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // OTP Verification state
  const [step, setStep] = useState('input'); // 'input' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [toastOTP, setToastOTP] = useState(null);

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password strength criteria checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('يرجى كتابة الاسم واللقب الكامل');
      return;
    }
    
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!/^0[567]\d{8}$/.test(cleanPhone)) {
      setErrorMsg('يرجى كتابة رقم هاتف جزائري صحيح مكون من 10 أرقام ويبدأ بـ 05 أو 06 أو 07 (مثال: 0770123456)');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('يرجى استيفاء جميع شروط كلمة السر القوية المطلوبة أولاً');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('كلمتا السر غير متطابقتين، يرجى التثبت وإعادة المحاولة');
      return;
    }

    setLoading(true);
    try {
      const { code } = generateOTPCode(phone);

      let formattedPhone = cleanPhone;
      if (formattedPhone.startsWith('0')) formattedPhone = '213' + formattedPhone.substring(1);
      if (!formattedPhone.startsWith('213')) formattedPhone = '213' + formattedPhone;

      const messageText = `رمز تأكيد حسابكِ في متجر Pyjama DZ - بيجامات الجزائر هو: ${code} 🔒\n\n⏱️ الرمز صالـح لمدة دقيقة واحدة (1 MIN) فقط.\nيرجى إدخاله في المتجر لإتمام إنشاء الحساب بنجاح ✨`;

      // Send WhatsApp OTP securely via backend serverless endpoint (no tokens exposed in frontend)
      try {
        const otpRes = await fetch('/api/send-otp-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone, code })
        });
        const otpData = await otpRes.json();
        if (!otpRes.ok && otpData.error) {
          console.warn('OTP API response:', otpData.error);
        }
      } catch (e) {
        console.error('API send OTP error:', e);
      }

      setStep('otp');
      setTimerSeconds(60);
      setIsTimerActive(true);
      setSuccessMsg('تم إرسال رمز التأكيد إلى رقم الواتساب الخاص بك');
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
      let customer;
      if (password && fullName) {
        customer = await registerCustomer({ fullName, phone, password });
      } else {
        customer = await loginOrCreateWithOTP(phone, fullName);
      }

      setSuccessMsg('تم إنشاء حسابك بنجاح');
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(customer);
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const [loginFailedCount, setLoginFailedCount] = useState(() => {
    return Number(localStorage.getItem('cust_login_fail_count') || 0);
  });
  const [custLockoutSec, setCustLockoutSec] = useState(0);

  useEffect(() => {
    const checkCustLock = () => {
      const lockUntil = Number(localStorage.getItem('cust_login_lock_until') || 0);
      const rem = Math.ceil((lockUntil - Date.now()) / 1000);
      if (rem > 0) {
        setCustLockoutSec(rem);
      } else {
        setCustLockoutSec(0);
        localStorage.removeItem('cust_login_lock_until');
      }
    };
    checkCustLock();
    const interval = setInterval(checkCustLock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (custLockoutSec > 0) {
      const mins = Math.floor(custLockoutSec / 60);
      const secs = custLockoutSec % 60;
      setErrorMsg(`⚠️ تم تجميد محاولات الدخول لحماية حسابك (5 محاولات خاطئة). يرجى الانتظار ${mins}:${secs < 10 ? '0' : ''}${secs} ⏳`);
      return;
    }

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
      localStorage.removeItem('cust_login_fail_count');
      localStorage.removeItem('cust_login_lock_until');
      setLoginFailedCount(0);

      setSuccessMsg(`أهلاً وسهلاً بك ${customer.full_name || ''}`);
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(customer);
      }, 800);
    } catch (err) {
      const nextFail = loginFailedCount + 1;
      setLoginFailedCount(nextFail);
      localStorage.setItem('cust_login_fail_count', String(nextFail));

      if (nextFail >= 5) {
        const lockUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lockout!
        localStorage.setItem('cust_login_lock_until', String(lockUntil));
        localStorage.setItem('cust_login_fail_count', '0');
        setLoginFailedCount(0);
        setCustLockoutSec(300);
        setErrorMsg('⚠️ تم تجميد تسجيل الدخول لحسابك لمدة 5 دقائق بعد 5 محاولات خاطئة متكررة لحمايته من التخمين!');
      } else {
        setErrorMsg(`${err.message || 'خطأ في تسجيل الدخول'} (محاولة ${nextFail}/5)`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-arabic, system-ui, sans-serif)', color: '#0F172A' }}>
      
      {/* Top Standalone Header */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', sticky: 'top', top: 0, zIndex: 10 }}>
        <button
          type="button"
          onClick={onBackToStore}
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '10px 18px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
        >
          <ArrowRight size={18} />
          العودة للمتجر / Retour
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#881337', margin: 0 }}>
            Pyjama DZ - بيجامات الجزائر
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 700 }}>صفحة إنشاء الحساب والحساب الشخصي</span>
        </div>

        <div style={{ width: '120px' }} /> {/* Spacer */}
      </header>

      {/* Main Standalone Container Page */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)', border: '1px solid #E2E8F0' }}>
          
          {/* Card Title Bar */}
          <div style={{ background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', padding: '28px 24px 20px', color: '#FFFFFF' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 6px' }}>
              حسابي في Pyjama DZ
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#FFE4E6', opacity: 0.95 }}>
              تتبع طلبياتك وحفظ بيانات التوصيل بنقرة واحدة
            </p>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', background: 'rgba(0, 0, 0, 0.15)', padding: '4px', borderRadius: '14px' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setStep('input'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: 'none', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'register' ? '#FFFFFF' : 'transparent', color: activeTab === 'register' ? '#881337' : '#FFFFFF' }}
              >
                إنشاء حساب جديد
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: 'none', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', background: activeTab === 'login' ? '#FFFFFF' : 'transparent', color: activeTab === 'login' ? '#881337' : '#FFFFFF' }}
              >
                تسجيل الدخول
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div style={{ padding: '28px 24px' }}>
            
            {errorMsg && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px 14px', borderRadius: '12px', marginBottom: '18px', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px 14px', borderRadius: '12px', marginBottom: '18px', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: REGISTRATION */}
            {activeTab === 'register' && (
              <div>
                {step === 'input' ? (
                  <form onSubmit={handleSendOTP} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                        الاسم واللقب الكامل *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text"
                          name="customer_full_name_input"
                          autoComplete="off"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder=""
                          style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        />
                        <User size={20} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                        رقم الهاتف / الواتساب (WhatsApp) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="tel"
                          name="customer_whatsapp_phone_input"
                          autoComplete="off"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder=""
                          style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        />
                        <Phone size={20} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                        كلمة السر (Mot de passe) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showPassword ? "text" : "password"}
                          name="customer_account_new_password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder=""
                          style={{ width: '100%', padding: '14px 44px 14px 40px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        />
                        <Lock size={20} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B', display: 'flex', alignItems: 'center' }}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>

                      {/* Live Password Criteria Checklist */}
                      {password.length > 0 && (
                        <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '8px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#334155', marginBottom: '2px' }}>شروط كلمة السر القوية:</span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasMinLength ? '#15803D' : '#64748B', fontWeight: hasMinLength ? 800 : 600 }}>
                            {hasMinLength ? <CheckCircle2 size={16} color="#16A34A" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #CBD5E1' }} />}
                            <span>8 أحرف أو أكثر على الأقل</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasUpper ? '#15803D' : '#64748B', fontWeight: hasUpper ? 800 : 600 }}>
                            {hasUpper ? <CheckCircle2 size={16} color="#16A34A" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #CBD5E1' }} />}
                            <span>حرف كبير على الأقل (A-Z)</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasLower ? '#15803D' : '#64748B', fontWeight: hasLower ? 800 : 600 }}>
                            {hasLower ? <CheckCircle2 size={16} color="#16A34A" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #CBD5E1' }} />}
                            <span>حرف صغير على الأقل (a-z)</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasNumber ? '#15803D' : '#64748B', fontWeight: hasNumber ? 800 : 600 }}>
                            {hasNumber ? <CheckCircle2 size={16} color="#16A34A" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #CBD5E1' }} />}
                            <span>رقم على الأقل (0-9)</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasSpecial ? '#15803D' : '#64748B', fontWeight: hasSpecial ? 800 : 600 }}>
                            {hasSpecial ? <CheckCircle2 size={16} color="#16A34A" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #CBD5E1' }} />}
                            <span>رمز خاص على الأقل (مثل @, #, $, %, !)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                        تأكيد كلمة السر (Confirmation) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          name="customer_account_confirm_password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder=""
                          style={{ width: '100%', padding: '14px 44px 14px 40px', borderRadius: '14px', border: confirmPassword ? (passwordsMatch ? '2px solid #22C55E' : '2px solid #EF4444') : '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        />
                        <Lock size={20} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B', display: 'flex', alignItems: 'center' }}
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {confirmPassword && (
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: passwordsMatch ? '#15803D' : '#DC2626', marginTop: '4px', display: 'block' }}>
                          {passwordsMatch ? '✓ كلمتا السر متطابقتان' : '✕ كلمتا السر غير متطابقتين'}
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{ width: '100%', marginTop: '8px', padding: '16px', background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 20px -4px rgba(37, 211, 102, 0.4)', transition: 'all 0.2s' }}
                    >
                      {loading ? <RefreshCw className="spin" size={20} /> : <MessageSquare size={20} />}
                      إرسال كود التأكيد عبر الواتساب (WhatsApp)
                    </button>
                  </form>
                ) : (
                  /* STEP 2: OTP ENTRY */
                  <form onSubmit={handleVerifyAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ textAlign: 'center', background: '#F8FAFC', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                      <p style={{ margin: '0 0 6px', fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>
                        أدخل رمز التأكيد المكون من 4 أرقام المندرج لرقمك:
                      </p>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#BE123C' }}>{phone}</span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px', textAlign: 'center' }}>
                        رمز التأكيد (4 أرقام)
                      </label>
                      <input 
                        type="text"
                        maxLength={4}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder=""
                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #CBD5E1', fontSize: '2rem', fontWeight: 900, textAlign: 'center', letterSpacing: '14px', outline: 'none', color: '#881337', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* 60-Second Countdown Timer & Resend */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: isTimerActive ? '#059669' : '#DC2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                      style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px -4px rgba(190, 18, 60, 0.4)' }}
                    >
                      {loading ? <RefreshCw className="spin" size={20} /> : <CheckCircle2 size={20} />}
                      تأكيد وإنشاء الحساب
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      تعديل البيانات أو رقم الهاتف
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: LOGIN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    رقم الهاتف (الواتساب) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder=""
                      style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <Phone size={20} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    كلمة السر *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showLoginPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=""
                      style={{ width: '100%', padding: '14px 44px 14px 40px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <Lock size={20} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(prev => !prev)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B', display: 'flex', alignItems: 'center' }}
                    >
                      {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', marginTop: '8px', padding: '16px', background: 'linear-gradient(135deg, #881337 0%, #BE123C 100%)', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px -4px rgba(190, 18, 60, 0.4)' }}
                >
                  {loading ? <RefreshCw className="spin" size={20} /> : <CheckCircle2 size={20} />}
                  تسجيل الدخول
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setStep('input');
                      setErrorMsg('');
                      setSuccessMsg('📲 أدخل رقم هاتفك وسنرسل لك رمز التأكيد للواتساب لتسجيل الدخول المباشر والتفعيل بدون كلمة سر');
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#F0FDF4',
                      border: '1.5px solid #86EFAC',
                      color: '#15803D',
                      borderRadius: '14px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    💬 نسيت كلمة السر أو حساب جديد؟ الدخول السريع عبر رمز الواتساب (WhatsApp OTP)
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </main>

    </div>
  );
}
