import React, { useState, useEffect } from 'react';
import { KeyRound, Lock, Save, Globe, Phone, MapPin, Share2, Check, Plus, Trash2 } from 'lucide-react';

export default function SettingsTab({ settings, onUpdateSettings, currentPin, onChangePin }) {
  // PIN change state
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinMessage, setPinMessage] = useState(null);

  const parsePhones = (val) => {
    if (Array.isArray(val) && val.length > 0) return val.map(v => String(v));
    if (typeof val === 'string' && val.trim()) {
      return val.split('-').map(s => s.trim()).filter(Boolean);
    }
    return ['0555123456'];
  };

  // General settings state
  const [instaUrl, setInstaUrl] = useState(settings?.instagramUrl || 'https://www.instagram.com/pyjama_dz');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsapp || '0555123456');
  const [phoneList, setPhoneList] = useState(() => parsePhones(settings?.phoneOrders));
  const [address, setAddress] = useState(settings?.address || 'Bab Ezzouar & Hydra, Alger');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(settings?.googleMapsUrl || 'https://maps.google.com/?q=Bab+Ezzouar+Alger');
  const [storeName, setStoreName] = useState((settings?.storeName || 'Pyjama DZ').replace(/\s*-\s*Luxury\s*Homewear/i, '').trim());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.instagramUrl !== undefined) setInstaUrl(settings.instagramUrl);
      if (settings.whatsapp !== undefined) setWhatsapp(settings.whatsapp);
      if (settings.phoneOrders !== undefined) setPhoneList(parsePhones(settings.phoneOrders));
      if (settings.address !== undefined) setAddress(settings.address);
      if (settings.googleMapsUrl !== undefined) setGoogleMapsUrl(settings.googleMapsUrl);
      if (settings.storeName !== undefined) setStoreName(settings.storeName.replace(/\s*-\s*Luxury\s*Homewear/i, '').trim());
    }
  }, [settings]);

  const handlePinChangeSubmit = (e) => {
    e.preventDefault();
    setPinMessage(null);

    if (oldPinInput !== currentPin) {
      setPinMessage({ type: 'error', text: '❌ الكود القديم غير صحيح (Ancien code PIN incorrect) !' });
      return;
    }
    if (newPinInput.length < 4 || newPinInput.length > 6) {
      setPinMessage({ type: 'error', text: '⚠️ الكود الجديد يجب أن يتكون من 4 إلى 6 أرقام.' });
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinMessage({ type: 'error', text: '⚠️ الكود الجديد غير متطابق في الخانتين.' });
      return;
    }

    onChangePin(newPinInput);
    setPinMessage({ type: 'success', text: `✅ تم تغيير رمز الدخول بنجاح إلى: ${newPinInput}` });
    setOldPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    const cleanPhones = phoneList.map(p => p.trim()).filter(Boolean);
    const finalPhones = cleanPhones.length > 0 ? cleanPhones : ['0555123456'];
    onUpdateSettings({
      ...settings,
      instagramUrl: instaUrl,
      googleMapsUrl,
      whatsapp,
      phoneOrders: finalPhones,
      address,
      storeName
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
          ⚙️ إعدادات المتجر والأمان (Paramètres & Sécurité)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Gérez votre code secret d'accès (PIN) et les liens de vos réseaux sociaux affichés aux clients.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Security PIN Change Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ background: '#FFEBEE', padding: 10, borderRadius: 12, color: '#C62828' }}>
              <KeyRound size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy)' }}>تغيير رمز الدخول السري (Code PIN)</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>يجب إدخال الرمز القديم للتأكد من هويتك</span>
            </div>
          </div>

          <form onSubmit={handlePinChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">الرمز السري القديم الحالي (Ancien PIN) *</label>
              <input 
                type="password" 
                required 
                value={oldPinInput} 
                onChange={(e) => setOldPinInput(e.target.value)} 
                className="form-input" 
                placeholder="••••••" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">الرمز السري الجديد (Nouveau PIN 4-6 chiffres) *</label>
              <input 
                type="text" 
                required 
                value={newPinInput} 
                onChange={(e) => setNewPinInput(e.target.value)} 
                className="form-input" 
                placeholder="Ex: 889900" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">تأكيد الرمز السري الجديد (Confirmation) *</label>
              <input 
                type="text" 
                required 
                value={confirmPinInput} 
                onChange={(e) => setConfirmPinInput(e.target.value)} 
                className="form-input" 
                placeholder="Ex: 889900" 
              />
            </div>

            {pinMessage && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: pinMessage.type === 'error' ? '#FFEBEE' : '#E8F5E9',
                color: pinMessage.type === 'error' ? '#C62828' : '#2E7D32',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {pinMessage.text}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              <Lock size={16} />
              <span>تحديث وحفظ الرمز السري</span>
            </button>
          </form>
        </div>

        {/* Store Contacts & Social Links Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ background: 'var(--rose-light)', padding: 10, borderRadius: 12, color: 'var(--burgundy)' }}>
              <Globe size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy)' }}>معلومات المتجر وشبكات التواصل</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تظهر مباشرة في واجهة الزبائن في الأسفل</span>
            </div>
          </div>

          <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">إسم المتجر (Nom de la Boutique)</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">رابط الإنستغرام (Instagram URL)</label>
              <input type="text" value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">رابط خريطة جوجل (Google Maps URL)</label>
              <input type="text" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} className="form-input" placeholder="https://maps.google.com/..." />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>رقم أو أرقام الطلبيات الهاتفية (Téléphones)</label>
                <button 
                  type="button"
                  onClick={() => setPhoneList([...phoneList, ''])}
                  style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                >
                  <Plus size={14} /> إضافة رقم آخر
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {phoneList.map((num, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={num} 
                      onChange={(e) => {
                        const newList = [...phoneList];
                        newList[idx] = e.target.value;
                        setPhoneList(newList);
                      }} 
                      className="form-input" 
                      style={{ flex: 1 }}
                      placeholder={`رقم الهاتف ${idx + 1} (Ex: 0555123456)`}
                    />
                    {phoneList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPhoneList(phoneList.filter((_, i) => i !== idx))}
                        style={{ background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="حذف هذا الرقم"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">رقم الواتساب (WhatsApp Direct)</label>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">العنوان والمناطق (Adresse & Localisation)</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="form-input" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              <Save size={16} />
              <span>{savedSuccess ? "✅ تم حفظ التعديلات بنجاح !" : "💾 حفظ معلومات المتجر"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
