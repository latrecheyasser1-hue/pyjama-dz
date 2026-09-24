// Lightweight, zero-dependency sliding window rate limiter for Vercel Serverless Functions

const requestStore = new Map();

// Periodic cleanup of expired IP records every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a client IP has exceeded the allowed rate limit.
 * 
 * @param {Object} req - Incoming HTTP request
 * @param {Object} options - Configuration options
 * @param {number} options.maxRequests - Maximum allowed requests in the time window (default 10)
 * @param {number} options.windowMs - Time window in milliseconds (default 60,000 ms = 1 min)
 * @param {string} options.endpointKey - Unique identifier for the endpoint
 * @returns {{ allowed: boolean, remaining: number, resetTime: number, ip: string }}
 */
export function checkRateLimit(req, options = {}) {
  const maxRequests = options.maxRequests || 10;
  const windowMs = options.windowMs || 60 * 1000;
  const endpointKey = options.endpointKey || 'global';

  // Extract client IP (Vercel forwards the real client IP in x-forwarded-for or x-real-ip)
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || 
                   req.headers['x-real-ip'] || 
                   req.socket?.remoteAddress || 
                   '127.0.0.1';

  const now = Date.now();
  const rateLimitKey = `${endpointKey}:${clientIp}`;
  const record = requestStore.get(rateLimitKey);

  if (!record || now > record.resetTime) {
    // New or expired window
    requestStore.set(rateLimitKey, {
      count: 1,
      resetTime: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
      ip: clientIp
    };
  }

  // Active window
  record.count += 1;
  const remaining = Math.max(0, maxRequests - record.count);

  if (record.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      ip: clientIp
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime: record.resetTime,
    ip: clientIp
  };
}

/**
 * Middleware helper to enforce rate limiting on API handlers.
 * Returns true if allowed, or automatically sends 429 response and returns false.
 */
export function enforceRateLimit(req, res, options = {}) {
  const result = checkRateLimit(req, options);
  
  res.setHeader('X-RateLimit-Limit', options.maxRequests || 10);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'تم تجاوز الحد المسموح من الطلبات لمنع السبام. يرجى الانتظار قليلاً والمحاولة مجدداً.',
      retryAfterSeconds: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
    return false;
  }

  return true;
}
