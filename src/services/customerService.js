import { supabase } from '../lib/supabaseClient.js';

const CUSTOMER_SESSION_KEY = 'pyjama_customer_session';

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
