import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'pyjama-dz-images';
const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-c4303fc65006440686ecfb21188f6877.r2.dev').replace(/\/+$/, '');
const ADMIN_TOKEN = process.env.ADMIN_PARCEL_SECRET || process.env.VITE_ADMIN_PARCEL_SECRET || 'pyjama_dz_sec_99a8b7c6d5e4f3';

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function uploadBufferToR2(buffer, filename, contentType = 'image/webp') {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Cloudflare R2 credentials are missing from environment variables.');
  }
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${R2_BUCKET}/${filename}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = hash(buffer);

  const canonicalHeaders = 
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = 
    `PUT\n` +
    `/${R2_BUCKET}/${filename}\n` +
    `\n` +
    canonicalHeaders +
    `\n` +
    signedHeaders +
    `\n` +
    payloadHash;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;

  const stringToSign = 
    `${algorithm}\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    hash(canonicalRequest);

  const kSecret = 'AWS4' + R2_SECRET_ACCESS_KEY;
  const kDate = hmac(kSecret, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorizationHeader = 
    `${algorithm} ` +
    `Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Host': host,
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader,
    },
    body: buffer
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 Upload failed HTTP ${res.status}: ${errText}`);
  }

  return `${R2_PUBLIC_URL}/${filename}`;
}


// In-memory upload rate limiting: max 30 image uploads per minute per IP
const uploadRateLimitMap = new Map();
function isUploadRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxLimit = 30;

  const item = uploadRateLimitMap.get(ip);
  if (!item || now > item.resetTime) {
    uploadRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  item.count++;
  return item.count > maxLimit;
}

// Deep binary magic bytes validation (Prevents malicious files disguised as images)
function detectAndValidateImageFormat(buffer, declaredContentType) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    return { ext: 'gif', mime: 'image/gif' };
  }

  // AVIF: ftypavif or ftypmif1
  const headerStr = buffer.slice(0, 32).toString('ascii');
  if (headerStr.includes('ftypavif') || headerStr.includes('ftypmif1')) {
    return { ext: 'avif', mime: 'image/avif' };
  }

  // SVG: Strict sanitization against stored XSS
  if (declaredContentType === 'image/svg+xml' || declaredContentType.includes('svg')) {
    const text = buffer.toString('utf8').toLowerCase();
    if (
      (text.includes('<svg') || text.includes('<?xml')) &&
      !text.includes('<script') &&
      !text.includes('javascript:') &&
      !text.includes('onload=') &&
      !text.includes('onerror=')
    ) {
      return { ext: 'svg', mime: 'image/svg+xml' };
    }
  }

  return null;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://pyjama-dz.net',
    'https://www.pyjama-dz.net',
    'https://admin.pyjama-dz.net',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.pyjama-dz.net');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- POST: Upload image to Cloudflare R2 ---
  if (req.method === 'POST') {
    // 1. Rate Limiting Check
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (isUploadRateLimited(clientIp)) {
      console.warn(`[product-image] Upload rate limit exceeded for IP: ${clientIp}`);
      return res.status(429).json({ error: 'Too many upload requests. Please wait a minute.' });
    }

    // 2. Authentication check
    const tokenHeader = req.headers['x-admin-token'] || req.headers['x-internal-secret'] || '';
    const authHeader = req.headers['authorization'] || '';
    const isAuthed = (tokenHeader && tokenHeader === ADMIN_TOKEN) || 
                     (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === ADMIN_TOKEN);

    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication required to upload assets' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { image, folder = 'products', filename: customName } = body;

      if (!image) {
        return res.status(400).json({ error: 'Missing image data' });
      }

      // If already a hosted URL, just return it
      if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
        return res.status(200).json({ success: true, url: image });
      }

      let imageBuffer;
      let contentType = 'image/webp';

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contentType = matches[1].toLowerCase();
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        imageBuffer = Buffer.from(image, 'base64');
      }

      // 3. File size limit: 10MB max, minimum 12 bytes
      if (imageBuffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds maximum permitted 10MB limit.' });
      }
      if (imageBuffer.length < 12) {
        return res.status(400).json({ error: 'Corrupted image file: File payload is too small.' });
      }

      // 4. Deep Binary Magic Bytes Validation (CWE-434 protection)
      const detected = detectAndValidateImageFormat(imageBuffer, contentType);
      if (!detected) {
        return res.status(400).json({ 
          error: 'Invalid file payload. The file header does not match any recognized genuine image format (JPEG, PNG, WebP, GIF, AVIF).' 
        });
      }

      // 5. Strict Folder & Path Traversal Prevention
      const ALLOWED_FOLDERS = ['products', 'reviews', 'banners', 'categories', 'uploads'];
      const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : 'products';
      const safeCustomName = (customName || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
      const uniqueSuffix = `${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      const uniqueId = safeCustomName ? `${safeCustomName}_${uniqueSuffix}` : uniqueSuffix;
      const filename = `${safeFolder}/${uniqueId}.${detected.ext}`;

      const publicUrl = await uploadBufferToR2(imageBuffer, filename, detected.mime);
      return res.status(200).json({ success: true, url: publicUrl, filename });
    } catch (uploadErr) {
      console.error('Error handling R2 upload in product-image API:', uploadErr);
      return res.status(500).json({ error: uploadErr.message });
    }
  }

  // --- GET / HEAD: Retrieve or redirect product image ---
  let { id, color, idx } = req.query;

  if (id && id.includes('.')) {
    id = id.split('.')[0];
  }

  if (!id) {
    return res.status(400).send('Missing product id');
  }

  try {
    const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const products = await prodRes.json();

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(404).send('Product not found');
    }

    const product = products[0];
    let imgData = null;

    if (color && Array.isArray(product.colorVariants)) {
      const match = product.colorVariants.find(cv => cv.color === color || cv.name === color);
      if (match?.image) imgData = match.image;
    }

    if (!imgData && idx !== undefined && Array.isArray(product.colorVariants)) {
      const cvIdx = parseInt(idx, 10);
      if (product.colorVariants[cvIdx]?.image) imgData = product.colorVariants[cvIdx].image;
    }

    if (!imgData) {
      if (product.image && typeof product.image === 'string') imgData = product.image;
      else if (product.imageUrl && typeof product.imageUrl === 'string') imgData = product.imageUrl;
      else if (Array.isArray(product.images) && product.images[0]) imgData = product.images[0];
      else if (Array.isArray(product.colorVariants) && product.colorVariants[0]?.image) {
        imgData = product.colorVariants[0].image;
      }
    }

    if (!imgData) {
      return res.status(404).send('No image available for product');
    }

    if (imgData.startsWith('http://') || imgData.startsWith('https://')) {
      return res.redirect(302, imgData);
    }

    let imageBuffer;
    const matches = imgData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      imageBuffer = Buffer.from(imgData, 'base64');
    }

    // Convert to compliant JPEG using sharp for Meta WhatsApp
    try {
      const sharp = (await import('sharp')).default;
      imageBuffer = await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();
    } catch (conversionErr) {
      console.warn('Sharp conversion fallback:', conversionErr);
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    return res.status(200).send(imageBuffer);
  } catch (err) {
    console.error('Error serving product image:', err);
    return res.status(500).send('Internal Server Error');
  }
}
