/**
 * Service to handle integrations with delivery companies (Yalidine / Guepex, ZR Express)
 */

/**
 * Creates a parcel in Yalidine / Guepex
 * @param {Object} order - The order details
 * @returns {Promise<Object>} - Contains tracking number and label URL
 */
export const createYalidineParcel = async (order) => {
  const codProductPrice = Number(order.price || order.totalPrice || 0);
  console.log(`[Yalidine] Processing parcel for Order #${order.ticketNumber || order.id}... COD Price: ${codProductPrice} DA`);

  try {
    const res = await fetch('/api/create-parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, company: 'yalidine' })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    throw new Error(data.error || 'Failed to create Yalidine parcel');
  } catch (err) {
    console.error('[Yalidine] Parcel creation error:', err.message);
    return {
      success: false,
      error: err.message,
      deliveryCompany: 'yalidine'
    };
  }
};

/**
 * Creates a parcel in ZR Express
 * @param {Object} order - The order details
 * @returns {Promise<Object>} - Contains tracking number and label URL
 */
export const createZRExpressParcel = async (order) => {
  const codProductPrice = Number(order.price || order.totalPrice || 0);
  console.log(`[ZR Express] Processing parcel for Order #${order.ticketNumber || order.id}... COD Price: ${codProductPrice} DA`);

  try {
    const res = await fetch('/api/create-parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, company: 'zrexpress' })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    throw new Error(data.error || 'Failed to create ZR Express parcel');
  } catch (err) {
    console.error('[ZR Express] Parcel creation error:', err.message);
    return {
      success: false,
      error: err.message,
      deliveryCompany: 'zrexpress'
    };
  }
};

/**
 * Main function to process order for delivery
 * @param {Object} order - The order details
 */
export const processOrderDelivery = async (order) => {
  try {
    const rawCompany = String(order.deliveryCompany || '').toLowerCase();
    const isZR = rawCompany === 'zrexpress' || 
                 rawCompany === 'zr' || 
                 rawCompany.includes('zr') || 
                 String(order.deliveryMode || '').includes('Hub') || 
                 String(order.commune || '').includes('Hub');

    let result;
    if (isZR) {
      result = await createZRExpressParcel(order);
    } else {
      result = await createYalidineParcel(order);
    }

    return result;
  } catch (error) {
    console.error('Error processing delivery:', error);
    return { success: false, error: error.message };
  }
};

