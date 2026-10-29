import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '73b22fc72b6c98643bbab88ae6dbbfad';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '3b062c585b133c9a8d794b293b2ebc02';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '718502b158cda1bbf01943d01f8a64aceed4ecac06a86f8b0ac2cb6880fe442a';
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'pyjama-dz-images';
const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-c4303fc65006440686ecfb21188f6877.r2.dev').replace(/\/+$/, '');

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function uploadBufferToR2(buffer, filename, contentType = 'image/webp') {
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- POST: Upload image to Cloudflare R2 ---
  if (req.method === 'POST') {
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
        contentType = matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        imageBuffer = Buffer.from(image, 'base64');
      }

      const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'webp';
      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
      const uniqueId = customName 
        ? customName.replace(/[^a-zA-Z0-9_-]/g, '') + '_' + Date.now().toString(36)
        : `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const filename = `${safeFolder}/${uniqueId}.${ext}`;

      const publicUrl = await uploadBufferToR2(imageBuffer, filename, contentType);
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
