import { enforceRateLimit } from './utils/rate-limiter.js';

const ADMIN_PIN = process.env.ADMIN_PIN || '765483';
export const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'PYJAMA_DZ_ADMIN_SECURE_TOKEN_2026_ALPHA_KEY';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Enforce brute-force protection: Max 5 login attempts per 5 minutes per IP
  const allowed = enforceRateLimit(req, res, {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    endpointKey: 'admin-auth-login'
  });
  if (!allowed) return;

  // Add realistic security response delay (400ms) to eliminate automated timing / high-frequency attacks
  await new Promise(r => setTimeout(r, 400));

  try {
    const { pin, action, token } = req.body || {};

    // Token verification check
    if (action === 'verify') {
      const cleanToken = String(token || req.headers['x-admin-token'] || req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
      const isValid = cleanToken === ADMIN_SECRET_KEY;
      return res.status(200).json({ valid: isValid });
    }

    // PIN Authentication
    if (!pin) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رمز الدخول' });
    }

    const cleanPin = String(pin).trim();
    if (cleanPin === ADMIN_PIN) {
      return res.status(200).json({
        success: true,
        token: ADMIN_SECRET_KEY,
        role: 'admin',
        message: 'تم تسجيل الدخول بنجاح'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'رمز الدخول غير صحيح'
    });
  } catch (err) {
    console.error('Admin Auth Error:', err);
    return res.status(500).json({ error: 'Server authentication error' });
  }
}
