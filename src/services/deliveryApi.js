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
  // COD amount sent to Yalidine MUST BE product price only (order.price).
  // Yalidine API automatically calculates & adds the delivery rate for the target Wilaya!
  const codProductPrice = Number(order.price || 0);
  console.log(`Sending to Yalidine API... Colis COD Price: ${codProductPrice} DA (Product price only) | Customer Total: ${order.totalPrice || codProductPrice} DA`);
  
  if (!YALIDINE_API_ID || !YALIDINE_API_TOKEN) {
    console.warn('Yalidine API keys missing. Using mock data.');
    // MOCK RESPONSE
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          trackingNumber: `YAL-${Math.floor(Math.random() * 1000000)}`,
          shippingLabelUrl: `https://yalidine.app/mock-label/${order.id}.pdf`,
          deliveryCompany: 'yalidine',
          codPrice: codProductPrice
        });
      }, 500); // simulate network delay
    });
  }

  // Real Yalidine payload format:
  // const payload = {
  //   order_id: order.id,
  //   firstname: order.clientName,
  //   familyname: '',
  //   contact_phone: order.phone,
  //   address: order.commune || order.address,
  //   to_wilaya_name: order.wilaya,
  //   to_commune_name: order.commune,
  //   price: codProductPrice, // Product price ONLY (Yalidine adds shipping fee automatically)
  //   freeshipping: false,
  //   is_center: order.deliveryMode?.includes('Bureau') ? 1 : 0
  // };

  throw new Error('Real API not yet implemented');
};

/**
 * Creates a parcel in ZR Express
 * @param {Object} order - The order details
 * @returns {Promise<Object>} - Contains tracking number and label URL
 */
export const createZRExpressParcel = async (order) => {
  const codProductPrice = Number(order.price || 0);
  console.log(`Sending to ZR Express API... Colis COD Price: ${codProductPrice} DA (Product price only) | Customer Total: ${order.totalPrice || codProductPrice} DA`);

  if (!ZREXPRESS_API_KEY) {
    console.warn('ZR Express API key missing. Using mock data.');
    // MOCK RESPONSE
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          trackingNumber: `ZR-${Math.floor(Math.random() * 1000000)}`,
          shippingLabelUrl: `https://zrexpress.com/mock-label/${order.id}.pdf`,
          deliveryCompany: 'zrexpress',
          codPrice: codProductPrice
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
