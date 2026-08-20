const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tdhxdnmjmnfjkictdzpk.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaHhkbm1qbW5mamtpY3RkenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIxMDAsImV4cCI6MjEwMjc5ODEwMH0.K3moWEWjE5cvBmFwaGyPspx_yIixii9tY136DgpCZ3g';

export default async function handler(req, res) {
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

    let contentType = 'image/jpeg';
    let imageBuffer;

    const matches = imgData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      contentType = matches[1];
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      imageBuffer = Buffer.from(imgData, 'base64');
    }

    res.setHeader('Content-Type', contentType);
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
