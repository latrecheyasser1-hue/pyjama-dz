import { supabase } from '../lib/supabaseClient.js';

const CUSTOMER_SESSION_KEY = 'pyjama_customer_session';

/**
 * Format phone number to clean Algerian phone string (e.g. 0770123456)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('213')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.length === 9 && (cleaned.startsWith('5') || cleaned.startsWith('6') || cleaned.startsWith('7'))) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
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
 * Update customer profile (Phone, Wilaya, Commune, Full Name)
 * Saves to localStorage and persists to Supabase settings key-value store
 */
export const updateCustomerProfile = async (identifier, updates = {}) => {
  const current = getCurrentCustomer() || {};
  const nextProfile = { ...current, ...updates };

  const phoneCandidate = updates.phone || nextProfile.phone || (typeof identifier === 'string' && /^\d+$/.test(identifier.replace(/\D/g, '')) ? identifier : '');
  const cleanPhone = formatPhoneNumber(phoneCandidate);
  if (cleanPhone) {
    nextProfile.phone = cleanPhone;
  }

  // 1. Save to customer session in localStorage
  setCustomerSession(nextProfile);

  // 2. Save individual checkout fields to localStorage so checkout auto-populates
  try {
    if (nextProfile.full_name) localStorage.setItem('customer_name', nextProfile.full_name);
    if (nextProfile.phone) localStorage.setItem('customer_phone', nextProfile.phone);
    if (nextProfile.wilaya) localStorage.setItem('customer_wilaya', nextProfile.wilaya);
    if (nextProfile.commune) localStorage.setItem('customer_commune', nextProfile.commune);
  } catch (e) {}

  // 3. Persist to Supabase settings table
  if (supabase) {
    const valStr = JSON.stringify(nextProfile);
    const keysToSave = [];
    if (cleanPhone) keysToSave.push(`cust_profile_phone_${cleanPhone}`);
    if (nextProfile.email) keysToSave.push(`cust_profile_email_${nextProfile.email.toLowerCase().trim()}`);
    if (nextProfile.id) keysToSave.push(`cust_profile_id_${nextProfile.id}`);

    for (const k of keysToSave) {
      try {
        await supabase
          .from('settings')
          .upsert({ key: k, value: valStr }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Supabase profile save note:', err);
      }
    }
  }

  return nextProfile;
};

/**
 * Fetch customer profile from Supabase by phone, email, or id
 */
export const fetchCustomerProfile = async (identifier) => {
  if (!identifier || !supabase) return null;
  const cleanPhone = formatPhoneNumber(identifier);
  const keysToCheck = [];
  if (cleanPhone && cleanPhone.length >= 9) keysToCheck.push(`cust_profile_phone_${cleanPhone}`);
  if (typeof identifier === 'string' && identifier.includes('@')) keysToCheck.push(`cust_profile_email_${identifier.toLowerCase().trim()}`);
  keysToCheck.push(`cust_profile_id_${identifier}`);

  for (const k of keysToCheck) {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', k)
        .maybeSingle();

      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (parsed) return parsed;
      }
    } catch (e) {}
  }
  return null;
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

/**
 * Save customer wishlist to localStorage and Supabase
 */
export const saveCustomerWishlist = async (identifier, wishlist) => {
  try {
    localStorage.setItem('pyjama_customer_wishlist', JSON.stringify(wishlist));
  } catch (e) {}

  if (!supabase || !identifier) return;
  const cleanPhone = formatPhoneNumber(identifier);
  const key = cleanPhone ? `cust_wishlist_${cleanPhone}` : `cust_wishlist_${identifier}`;

  try {
    await supabase
      .from('settings')
      .upsert({ key, value: JSON.stringify(wishlist) }, { onConflict: 'key' });
  } catch (e) {
    console.warn('Wishlist remote save note:', e);
  }
};

/**
 * Fetch customer wishlist from Supabase
 */
export const fetchCustomerWishlist = async (identifier) => {
  if (!supabase || !identifier) return null;
  const cleanPhone = formatPhoneNumber(identifier);
  const key = cleanPhone ? `cust_wishlist_${cleanPhone}` : `cust_wishlist_${identifier}`;

  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (data && data.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return null;
};
