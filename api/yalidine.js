export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-YALIDINE-SIGNATURE');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract all possible query parameters
  const rawUrl = req.url || '';
  const searchParams = new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : '');
  const crcToken = req.query?.crc_token || searchParams.get('crc_token');

  if (crcToken) {
    console.log('✅ Yalidine CRC Token Echo:', crcToken);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(String(crcToken));
  }

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('YALIDINE_OK');
  }

  if (req.method === 'POST') {
    console.log('📦 Yalidine webhook event received:', JSON.stringify(req.body));
    return res.status(200).json({ success: true });
  }

  return res.status(200).send('OK');
}
