/**
 * Service to handle integrations with delivery companies (Yalidine, ZR Express)
 */

const YALIDINE_API_ID = import.meta.env.VITE_YALIDINE_API_ID;
const YALIDINE_API_TOKEN = import.meta.env.VITE_YALIDINE_API_TOKEN;
const ZREXPRESS_API_KEY = import.meta.env.VITE_ZREXPRESS_API_KEY;

/**
 * Creates a parcel in Yalidine
 * @param {Object} order - The order details
 * @returns {Promise<Object>} - Contains tracking number and label URL
 */
export const createYalidineParcel = async (order) => {
  console.log('Sending to Yalidine API...', order);
  
  if (!YALIDINE_API_ID || !YALIDINE_API_TOKEN) {
    console.warn('Yalidine API keys missing. Using mock data.');
    // MOCK RESPONSE
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          trackingNumber: `YAL-${Math.floor(Math.random() * 1000000)}`,
          shippingLabelUrl: `https://yalidine.app/mock-label/${order.id}.pdf`,
          deliveryCompany: 'yalidine'
        });
      }, 500); // simulate network delay
    });
  }

  // TODO: Implement actual API call when keys are provided
  // Example implementation:
  // const payload = { ... };
  // const response = await fetch('https://api.yalidine.app/v1/parcels', { ... });
  // return await response.json();
  throw new Error('Real API not yet implemented');
};

/**
 * Creates a parcel in ZR Express
 * @param {Object} order - The order details
 * @returns {Promise<Object>} - Contains tracking number and label URL
 */
export const createZRExpressParcel = async (order) => {
  console.log('Sending to ZR Express API...', order);

  if (!ZREXPRESS_API_KEY) {
    console.warn('ZR Express API key missing. Using mock data.');
    // MOCK RESPONSE
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          trackingNumber: `ZR-${Math.floor(Math.random() * 1000000)}`,
          shippingLabelUrl: `https://zrexpress.com/mock-label/${order.id}.pdf`,
          deliveryCompany: 'zrexpress'
        });
      }, 500); // simulate network delay
    });
  }

  // TODO: Implement actual API call when key is provided
  throw new Error('Real API not yet implemented');
};

/**
 * Main function to process order for delivery
 * @param {Object} order - The order details
 */
export const processOrderDelivery = async (order) => {
  try {
    // If we have a preferred company in the order, use it. Otherwise, default to Yalidine or some logic.
    const company = (order.deliveryCompany || 'yalidine').toLowerCase(); 

    let result;
    if (company === 'zrexpress') {
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
