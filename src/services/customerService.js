import { supabase } from '../lib/supabaseClient';

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

/**
 * Register a new customer
 */
export const registerCustomer = async ({ fullName, phone, password, wilaya = '', commune = '' }) => {
  const cleanPhone = formatPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 9) {
    throw new Error('رقم الهاتف غير صالح');
  }

  // Check if customer already exists in Supabase DB
  const { data: existing } = await supabase
    .from('customers')
    .select('id, phone')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (existing) {
    throw new Error('هذا الرقم مسجل بالفعل في المتجر، يمكنك تسجيل الدخول مباشرة');
  }

  const newCustomer = {
    full_name: fullName.trim(),
    phone: cleanPhone,
    password_hash: password,
    wilaya: wilaya || '',
    commune: commune || '',
    wishlist: [],
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('customers')
    .insert([newCustomer])
    .select('*')
    .single();

  if (error) {
    // If customers table doesn't exist yet in DB, fallback to local session object for seamless Localhost testing
    console.warn('Supabase customers table notice/fallback:', error);
    const mockCustomer = { ...newCustomer, id: 'cust_' + Date.now() };
    setCustomerSession(mockCustomer);
    return mockCustomer;
  }

  setCustomerSession(data);
  return data;
};

/**
 * Login customer with phone and password
 */
export const loginCustomer = async (phone, password) => {
  const cleanPhone = formatPhoneNumber(phone);
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (error || !data) {
    // Fallback check in local session if matching
    const current = getCurrentCustomer();
    if (current && current.phone === cleanPhone && current.password_hash === password) {
      return current;
    }
    throw new Error('رقم الهاتف أو كلمة السر غير صحيحة، يرجى التثبت وإعادة المحاولة');
  }

  if (data.password_hash !== password) {
    throw new Error('كلمة السر غير صحيحة');
  }

  setCustomerSession(data);
  return data;
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

    // Sort chronologically ascending to calculate global ticketNumber (1, 2, 3... 341) matching Admin dashboard
    const sortedAll = [...data].sort((a, b) => {
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
