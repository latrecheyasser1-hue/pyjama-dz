import { supabase } from '../lib/supabaseClient.js';

const CUSTOMER_SESSION_KEY = 'pyjama_customer_session';
const OTP_EXPIRATION_SECONDS = 60; // 1 minute validity

// In-memory OTP storage for client-side validation
const activeOTPs = new Map();

/**
 * Format phone number to clean string (e.g. 0770123456)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('213')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
};

const otpRequestLog = new Map(); // Track request timestamps per phone number

/**
 * Generate a random 4-digit OTP code with 60-second expiration and Rate Limiting
 */
export const generateOTPCode = (phone) => {
  const cleanPhone = formatPhoneNumber(phone);
  const now = Date.now();
  const history = otpRequestLog.get(cleanPhone) || [];

  // Filter requests in the last 10 minutes
  const recentRequests = history.filter(ts => now - ts < 10 * 60 * 1000);

  if (recentRequests.length >= 3) {
    const oldest = recentRequests[0];
    const waitSec = Math.ceil((10 * 60 * 1000 - (now - oldest)) / 1000);
    const mins = Math.floor(waitSec / 60);
    throw new Error(`⚠️ تم تجاوز الحد الأقصى لطلبات رمز التأكيد (3 طلبات / 10 دقائق). يرجى الانتظار ${mins} دقيقة قبل الطلب مجدداً ⏳`);
  }

  recentRequests.push(now);
  otpRequestLog.set(cleanPhone, recentRequests);

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = now + OTP_EXPIRATION_SECONDS * 1000;

  activeOTPs.set(cleanPhone, { code, expiresAt });
  return { code, expiresAt };
};

/**
 * Verify if the entered OTP code is valid and not expired
 */
export const verifyOTPCode = (phone, enteredCode) => {
  const cleanPhone = formatPhoneNumber(phone);
  const record = activeOTPs.get(cleanPhone);

  if (!record) {
    return { valid: false, reason: 'لم يتم طلب كود تفعيل لهذا الرقم، يرجى إعادة طلب الكود' };
  }

  if (Date.now() > record.expiresAt) {
    activeOTPs.delete(cleanPhone);
    return { valid: false, reason: 'انتهت صلاحية الرمز (مرت أكثر من دقيقة)، يرجى إعادة إرسال رمز جديد 🔄' };
  }

  if (String(record.code).trim() !== String(enteredCode).trim()) {
    return { valid: false, reason: 'رمز التأكيد غير صحيح، يرجى التثبت وإعادة المحاولة ❌' };
  }

  // OTP verified successfully -> clear it
  activeOTPs.delete(cleanPhone);
  return { valid: true };
};

/**
 * Get current logged in customer from localStorage
 */
export const getCurrentCustomer = () => {
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

/**
 * Save customer session to localStorage
 */
export const setCustomerSession = (customer) => {
  try {
    if (!customer) {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
    } else {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customer));
    }
  } catch (e) {}
};

const LOCAL_ACCOUNTS_KEY = 'pyjama_registered_accounts_v2';

const getLocalAccounts = () => {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalAccount = (acc) => {
  try {
    const list = getLocalAccounts();
    const cleanPhone = formatPhoneNumber(acc.phone);
    const core9 = cleanPhone.slice(-9);
    const filtered = list.filter(a => formatPhoneNumber(a.phone).slice(-9) !== core9);
    filtered.push(acc);
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch (e) {}
};

/**
 * Register a new customer
 */
export const registerCustomer = async ({ fullName, phone, password, wilaya = '', commune = '' }) => {
  const cleanPhone = formatPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('رقم الهاتف غير صالح');
  }

  const core9 = cleanPhone.slice(-9);

  // Check if account already exists in Supabase orders system records
  try {
    const { data: dbAccs } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'account');

    if (dbAccs && dbAccs.length > 0) {
      const match = dbAccs.find(r => formatPhoneNumber(r.phone).slice(-9) === core9);
      if (match) {
        throw new Error('هذا الرقم مسجل بالفعل في المتجر، يمكنك تسجيل الدخول مباشرة');
      }
    }
  } catch (e) {}

  // Check local storage
  const localList = getLocalAccounts();
  if (localList.some(a => formatPhoneNumber(a.phone).slice(-9) === core9)) {
    throw new Error('هذا الرقم مسجل بالفعل في المتجر، يمكنك تسجيل الدخول مباشرة');
  }

  const newCustomer = {
    id: 'cust_' + Date.now(),
    full_name: fullName.trim(),
    phone: cleanPhone,
    password_hash: password,
    wilaya: wilaya || '',
    commune: commune || '',
    wishlist: [],
    created_at: new Date().toISOString()
  };

  // 1. Insert into Supabase orders table (status: 'account') -> Persists globally on all devices!
  try {
    await supabase.from('orders').insert([{
      clientName: `ACCOUNT: ${fullName.trim()}`,
      phone: cleanPhone,
      product: '_CUSTOMER_ACCOUNT_',
      items: [{ password_hash: password, wilaya, commune, full_name: fullName.trim(), wishlist: [] }],
      status: 'account',
      archived: true
    }]);
  } catch (errSupabase) {
    console.warn('Supabase account insert fallback:', errSupabase);
  }

  // 2. Try customers table if present
  try {
    await supabase.from('customers').insert([newCustomer]);
  } catch (e2) {}

  // 3. Save locally
  saveLocalAccount(newCustomer);
  setCustomerSession(newCustomer);
  return newCustomer;
};

/**
 * Login customer with phone and password
 */
export const loginCustomer = async (phone, password) => {
  const cleanPhone = formatPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('رقم الهاتف غير صالح');
  }
  const core9 = cleanPhone.slice(-9);

  // 1. Query Supabase orders table for system account records
  try {
    const { data: dbAccs } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'account');

    if (dbAccs && dbAccs.length > 0) {
      const match = dbAccs.find(r => formatPhoneNumber(r.phone).slice(-9) === core9);
      if (match) {
        const itemInfo = (match.items && match.items[0]) || {};
        const storedPass = itemInfo.password_hash || match.password_hash;
        if (storedPass !== password) {
          throw new Error('كلمة السر غير صحيحة، يرجى التثبت وإعادة المحاولة');
        }
        const custObj = {
          id: match.id || 'cust_' + Date.now(),
          full_name: itemInfo.full_name || match.clientName?.replace(/^ACCOUNT:\s*/, '') || 'زبون',
          phone: cleanPhone,
          password_hash: password,
          wilaya: itemInfo.wilaya || match.wilaya || '',
          commune: itemInfo.commune || match.commune || '',
          wishlist: itemInfo.wishlist || []
        };
        saveLocalAccount(custObj);
        setCustomerSession(custObj);
        return custObj;
      }
    }
  } catch (errDb) {
    if (errDb.message && errDb.message.includes('كلمة السر')) {
      throw errDb;
    }
  }

  // 2. Check local storage
  const localList = getLocalAccounts();
  const localMatch = localList.find(a => formatPhoneNumber(a.phone).slice(-9) === core9);
  if (localMatch) {
    if (localMatch.password_hash !== password) {
      throw new Error('كلمة السر غير صحيحة، يرجى التثبت وإعادة المحاولة');
    }
    setCustomerSession(localMatch);
    return localMatch;
  }

  // 3. Check current session
  const current = getCurrentCustomer();
  if (current && formatPhoneNumber(current.phone).slice(-9) === core9) {
    if (current.password_hash !== password) {
      throw new Error('كلمة السر غير صحيحة، يرجى التثبت وإعادة المحاولة');
    }
    return current;
  }

  throw new Error('رقم الهاتف غير مسجل أو كلمة السر غير صحيحة، يرجى إنشاء حساب جديد أو الدخول السريع عبر رمز الواتساب 📲');
};

/**
 * 1-Click WhatsApp OTP Login or Auto-Register
 */
export const loginOrCreateWithOTP = async (phone, fullName = '') => {
  const cleanPhone = formatPhoneNumber(phone);
  const core9 = cleanPhone.slice(-9);

  // Check if account already exists
  try {
    const { data: dbAccs } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'account');

    if (dbAccs && dbAccs.length > 0) {
      const match = dbAccs.find(r => formatPhoneNumber(r.phone).slice(-9) === core9);
      if (match) {
        const itemInfo = (match.items && match.items[0]) || {};
        const custObj = {
          id: match.id || 'cust_' + Date.now(),
          full_name: itemInfo.full_name || fullName || 'زبون الممتاز',
          phone: cleanPhone,
          wilaya: itemInfo.wilaya || '',
          commune: itemInfo.commune || '',
          wishlist: itemInfo.wishlist || []
        };
        saveLocalAccount(custObj);
        setCustomerSession(custObj);
        return custObj;
      }
    }
  } catch (e) {}

  // Auto-create new account
  const autoAccount = {
    id: 'cust_' + Date.now(),
    full_name: fullName.trim() || `زبون (${cleanPhone})`,
    phone: cleanPhone,
    password_hash: 'OTP_VERIFIED_' + Date.now(),
    wilaya: '',
    commune: '',
    wishlist: [],
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('orders').insert([{
      clientName: `ACCOUNT: ${autoAccount.full_name}`,
      phone: cleanPhone,
      product: '_CUSTOMER_ACCOUNT_',
      items: [{ password_hash: autoAccount.password_hash, full_name: autoAccount.full_name, wilaya: '', commune: '', wishlist: [] }],
      status: 'account',
      archived: true
    }]);
  } catch (e) {}

  saveLocalAccount(autoAccount);
  setCustomerSession(autoAccount);
  return autoAccount;
};

/**
 * Update customer profile (Wilaya, Commune, Full Name)
 */
export const updateCustomerProfile = async (phone, updates) => {
  const cleanPhone = formatPhoneNumber(phone);
  const current = getCurrentCustomer();

  const nextProfile = { ...(current || {}), ...updates };
  setCustomerSession(nextProfile);

  try {
    await supabase
      .from('customers')
      .update(updates)
      .eq('phone', cleanPhone);
  } catch (e) {
    console.warn('DB profile update fallback:', e);
  }

  return nextProfile;
};

/**
 * Fetch all orders for a customer by phone number
 */
export const getCustomerOrders = async (phone) => {
  const cleanPhone = formatPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 9) return [];

  const core9 = cleanPhone.slice(-9);

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.warn('Orders fetch note:', error);
      return [];
    }

    // Filter out system account records (status === 'account' or product === '_CUSTOMER_ACCOUNT_')
    const realOrdersOnly = data.filter(order => {
      if (order.status === 'account') return false;
      if (order.product === '_CUSTOMER_ACCOUNT_') return false;
      if (typeof order.product === 'object' && order.product?.type === '_CUSTOMER_ACCOUNT_') return false;
      return true;
    });

    // Sort chronologically ascending to calculate global ticketNumber (1, 2, 3... 341) matching Admin dashboard
    const sortedAll = [...realOrdersOnly].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateA - dateB;
    });

    const enrichedAll = sortedAll.map((order, idx) => {
      const ticketNum = idx + 1;
      return {
        ...order,
        ticketNumber: order.ticketNumber || order.order_number || order.orderNum || ticketNum
      };
    });

    // Filter strictly by phone matching core 9 digits
    const matched = enrichedAll.filter(order => {
      const p = formatPhoneNumber(order.phone || order.clientPhone || order.whatsapp);
      return p && p.slice(-9) === core9;
    });

    // Return newest orders first for customer view
    return matched.reverse();
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    return [];
  }
};
