export const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'PYJAMA_DZ_ADMIN_SECURE_TOKEN_2026_ALPHA_KEY';

/**
 * Verify whether an incoming API request comes from an authenticated Admin or internal service.
 * Checks Bearer Authorization header, x-admin-token, or internal secret.
 * 
 * @param {Object} req - Incoming request
 * @returns {boolean}
 */
export function isAuthorizedAdmin(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || req.headers['x-internal-secret'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token && token === ADMIN_SECRET_KEY) {
    return true;
  }

  return false;
}
