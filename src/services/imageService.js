/**
 * Cloudflare R2 Image Upload Service
 * Automatically converts and uploads client images directly to Cloudflare R2
 * Returns high-speed CDN URLs and falls back gracefully if network fails.
 */

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_PARCEL_SECRET || 'pyjama_dz_sec_99a8b7c6d5e4f3';

export const uploadImageToR2 = async (base64Data, folder = 'products') => {
  if (!base64Data || typeof base64Data !== 'string') return base64Data;
  
  // Already a hosted CDN or external URL
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }

  try {
    const res = await fetch('/api/product-image', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      },
      body: JSON.stringify({ image: base64Data, folder })
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.url) {
      return data.url;
    }
  } catch (err) {
    console.warn('Cloudflare R2 upload fallback:', err.message);
  }

  // Graceful fallback to local base64 if offline/error
  return base64Data;
};
