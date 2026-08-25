const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const YALIDINE_BASE_URL = 'https://api.guepex.app/v1/';

async function getDeliverySettings() {
  const creds = {
    yalidine_api_id: process.env.YALIDINE_API_ID || '',
    yalidine_api_token: process.env.YALIDINE_API_TOKEN || '',
    zr_express_api_key: process.env.ZREXPRESS_API_KEY || '',
    store_wilaya: 'Chlef'
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=in.(yalidine_api_id,yalidine_api_token,zrexpress_api_key,zr_express_api_key,store_wilaya)&select=key,value`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r.key === 'yalidine_api_id' && r.value) creds.yalidine_api_id = r.value.trim();
        if (r.key === 'yalidine_api_token' && r.value) creds.yalidine_api_token = r.value.trim();
        if ((r.key === 'zrexpress_api_key' || r.key === 'zr_express_api_key') && r.value) creds.zr_express_api_key = r.value.trim();
        if (r.key === 'store_wilaya' && r.value) creds.store_wilaya = r.value.trim();
      });
    }
  } catch (err) {
    console.error('Error fetching delivery settings:', err);
  }

  return creds;
}

function formatAlgerianPhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('213')) return '0' + digits.substring(3);
  if (digits.length === 9) return '0' + digits;
  return digits;
}

const WILAYAS_MAP = {
  '1': 'Adrar', 'أدرار': 'Adrar', 'adrar': 'Adrar',
  '2': 'Chlef', 'الشلف': 'Chlef', 'chlef': 'Chlef',
  '3': 'Laghouat', 'الأغواط': 'Laghouat', 'laghouat': 'Laghouat',
  '4': 'Oum El Bouaghi', 'أم البواقي': 'Oum El Bouaghi',
  '5': 'Batna', 'باتنة': 'Batna', 'batna': 'Batna',
  '6': 'Béjaïa', 'بجاية': 'Béjaïa', 'bejaia': 'Béjaïa',
  '7': 'Biskra', 'بسكرة': 'Biskra', 'biskra': 'Biskra',
  '8': 'Béchar', 'بشار': 'Béchar', 'bechar': 'Béchar',
  '9': 'Blida', 'البليدة': 'Blida', 'blida': 'Blida',
  '10': 'Bouira', 'البويرة': 'Bouira', 'bouira': 'Bouira',
  '11': 'Tamanrasset', 'تمنراست': 'Tamanrasset',
  '12': 'Tébessa', 'تبسة': 'Tébessa', 'tebessa': 'Tébessa',
  '13': 'Tlemcen', 'تلمسان': 'Tlemcen', 'tlemcen': 'Tlemcen',
  '14': 'Tiaret', 'تيارت': 'Tiaret', 'tiaret': 'Tiaret',
  '15': 'Tizi Ouzou', 'تيزي وزو': 'Tizi Ouzou', 'tizi ouzou': 'Tizi Ouzou',
  '16': 'Alger', 'الجزائر': 'Alger', 'alger': 'Alger', 'algiers': 'Alger',
  '17': 'Djelfa', 'الجلفة': 'Djelfa', 'djelfa': 'Djelfa',
  '18': 'Jijel', 'جيجل': 'Jijel', 'jijel': 'Jijel',
  '19': 'Sétif', 'سطيف': 'Sétif', 'setif': 'Sétif',
  '20': 'Saïda', 'سعيدة': 'Saïda', 'saida': 'Saïda',
  '21': 'Skikda', 'سكيكدة': 'Skikda', 'skikda': 'Skikda',
  '22': 'Sidi Bel Abbès', 'سيدي بلعباس': 'Sidi Bel Abbès',
  '23': 'Annaba', 'عنابة': 'Annaba', 'annaba': 'Annaba',
  '24': 'Guelma', 'قالمة': 'Guelma', 'guelma': 'Guelma',
  '25': 'Constantine', 'قسنطينة': 'Constantine', 'constantine': 'Constantine',
  '26': 'Médéa', 'المدية': 'Médéa', 'medea': 'Médéa',
  '27': 'Mostaganem', 'مستغانم': 'Mostaganem', 'mostaganem': 'Mostaganem',
  '28': 'M\'Sila', 'المسيلة': 'M\'Sila', 'msila': 'M\'Sila',
  '29': 'Mascara', 'معسكر': 'Mascara', 'mascara': 'Mascara',
  '30': 'Ouargla', 'ورقلة': 'Ouargla', 'ouargla': 'Ouargla',
  '31': 'Oran', 'وهران': 'Oran', 'oran': 'Oran',
  '32': 'El Bayadh', 'البيض': 'El Bayadh',
  '33': 'Illizi', 'إليزي': 'Illizi',
  '34': 'Bordj Bou Arreridj', 'برج بوعريريج': 'Bordj Bou Arreridj',
  '35': 'Boumerdès', 'بومرداس': 'Boumerdès', 'boumerdes': 'Boumerdès',
  '36': 'El Tarf', 'الطارف': 'El Tarf',
  '37': 'Tindouf', 'تندوف': 'Tindouf',
  '38': 'Tissemsilt', 'تيسمسيلت': 'Tissemsilt',
  '39': 'El Oued', 'الوادي': 'El Oued',
  '40': 'Khenchela', 'خنشلة': 'Khenchela',
  '41': 'Souk Ahras', 'سوق أهراس': 'Souk Ahras',
  '42': 'Tipaza', 'تيبازة': 'Tipaza', 'tipaza': 'Tipaza',
  '43': 'Mila', 'ميلة': 'Mila',
  '44': 'Aïn Defla', 'عين الدفلى': 'Aïn Defla', 'ain defla': 'Aïn Defla',
  '45': 'Naâma', 'النعامة': 'Naâma', 'naama': 'Naâma',
  '46': 'Aïn Témouchent', 'عين تموشنت': 'Aïn Témouchent',
  '47': 'Ghardaïa', 'غرداية': 'Ghardaïa', 'ghardaia': 'Ghardaïa',
  '48': 'Relizane', 'غليزان': 'Relizane', 'relizane': 'Relizane',
  '49': 'Timimoun', 'تيميمون': 'Timimoun',
  '50': 'Bordj Badji Mokhtar', 'برج باجي مختار': 'Bordj Badji Mokhtar',
  '51': 'Ouled Djellal', 'أولاد جلال': 'Ouled Djellal',
  '52': 'Béni Abbès', 'بني عباس': 'Béni Abbès',
  '53': 'In Salah', 'عين صالح': 'In Salah',
  '54': 'In Guezzam', 'عين قزام': 'In Guezzam',
  '55': 'Touggourt', 'تقرت': 'Touggourt',
  '56': 'Djanet', 'جانت': 'Djanet',
  '57': 'El M\'Ghair', 'المغير': 'El M\'Ghair',
  '58': 'El Meniaa', 'المنيعة': 'El Meniaa'
};

function normalizeWilaya(rawWilaya) {
  if (!rawWilaya) return 'Alger';
  const clean = String(rawWilaya).replace(/^\d+[\s\-_]*/, '').trim().toLowerCase();
  for (const [key, val] of Object.entries(WILAYAS_MAP)) {
    if (clean === key.toLowerCase() || clean.includes(key.toLowerCase()) || key.toLowerCase().includes(clean)) {
      return val;
    }
  }
  return String(rawWilaya).replace(/^\d+[\s\-_]*/, '').trim() || 'Alger';
}

function normalizeCommune(rawCommune, wilayaName) {
  if (!rawCommune) return wilayaName;
  const cleaned = String(rawCommune)
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/^\d+[\s\-_]*/, '')
    .trim();
  return cleaned || wilayaName;
}

function splitFullName(rawName) {
  const clean = String(rawName || '')
    .replace(/\(واتساب:[^\)]+\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: 'Client', familyname: '' };
  if (parts.length === 1) return { firstname: parts[0], familyname: '' };
  return { firstname: parts[0], familyname: parts.slice(1).join(' ') };
}

const WILAYA_IDS = {
  'Adrar': 1, 'Chlef': 2, 'Laghouat': 3, 'Oum El Bouaghi': 4, 'Batna': 5,
  'Béjaïa': 6, 'Biskra': 7, 'Béchar': 8, 'Blida': 9, 'Bouira': 10,
  'Tamanrasset': 11, 'Tébessa': 12, 'Tlemcen': 13, 'Tiaret': 14, 'Tizi Ouzou': 15,
  'Alger': 16, 'Djelfa': 17, 'Jijel': 18, 'Sétif': 19, 'Saïda': 20,
  'Skikda': 21, 'Sidi Bel Abbès': 22, 'Annaba': 23, 'Guelma': 24, 'Constantine': 25,
  'Médéa': 26, 'Mostaganem': 27, 'M\'Sila': 28, 'Mascara': 29, 'Ouargla': 30,
  'Oran': 31, 'El Bayadh': 32, 'Illizi': 33, 'Bordj Bou Arreridj': 34, 'Boumerdès': 35,
  'El Tarf': 36, 'Tindouf': 37, 'Tissemsilt': 38, 'El Oued': 39, 'Khenchela': 40,
  'Souk Ahras': 41, 'Tipaza': 42, 'Mila': 43, 'Aïn Defla': 44, 'Naâma': 45,
  'Aïn Témouchent': 46, 'Ghardaïa': 47, 'Relizane': 48, 'Timimoun': 49, 'Bordj Badji Mokhtar': 50,
  'Ouled Djellal': 51, 'Béni Abbès': 52, 'In Salah': 53, 'In Guezzam': 54, 'Touggourt': 55,
  'Djanet': 56, 'El M\'Ghair': 57, 'El Meniaa': 58
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { order, company = 'yalidine' } = req.body || {};

    if (!order) {
      return res.status(400).json({ success: false, error: 'Missing order details' });
    }

    const creds = await getDeliverySettings();
    const isStopdesk = Boolean(
      String(order.deliveryMode || '').toLowerCase().includes('bureau') ||
      String(order.deliveryMode || '').toLowerCase().includes('stop') ||
      order.is_stopdesk
    );

    const codProductPrice = Number(order.price || order.totalPrice || 0);
    const { firstname, familyname } = splitFullName(order.clientName);
    const contactPhone = formatAlgerianPhone(order.phone || order.whatsapp);
    const normalizedToWilaya = normalizeWilaya(order.wilaya);
    let normalizedToCommune = normalizeCommune(order.commune, normalizedToWilaya);
    const fromWilaya = normalizeWilaya(creds.store_wilaya || 'Chlef');
    const toWilayaId = WILAYA_IDS[normalizedToWilaya] || 16;

    // ==========================================
    // 1. YALIDINE / GUEPEX INTEGRATION
    // ==========================================
    if (company.toLowerCase() === 'yalidine' || company.toLowerCase() === 'guepex') {
      const apiId = creds.yalidine_api_id;
      const apiToken = creds.yalidine_api_token;

      if (!apiId || !apiToken) {
        return res.status(200).json({
          success: true,
          isMock: true,
          trackingNumber: `YAL-${Math.floor(100000 + Math.random() * 900000)}`,
          shippingLabelUrl: `https://guepex.app/app/bordereau.php?tracking=yal-mock`,
          deliveryCompany: 'yalidine',
          codPrice: codProductPrice,
          message: 'Yalidine simulation (keys pending in Settings)'
        });
      }

      // Pre-mapped Yalidine Stopdesk centers lookup (Official Guepex Database)
      let stopdeskId = null;
      let targetCommune = normalizedToCommune;

      if (isStopdesk) {
        let officialCenters = [];
        try {
          const fs = await import('fs');
          const path = await import('path');
          const centersPath = path.join(process.cwd(), 'src/data/official_centers.json');
          if (fs.existsSync(centersPath)) {
            officialCenters = JSON.parse(fs.readFileSync(centersPath, 'utf8'));
          }
        } catch(e) {}

        const wilayaCenters = officialCenters.filter(c => c.wilaya_id === toWilayaId || (c.wilaya_name && c.wilaya_name.toLowerCase() === normalizedToWilaya.toLowerCase()));
        
        if (wilayaCenters.length > 0) {
          const combinedSearch = `${order.commune || ''} ${order.deliveryMode || ''}`.toLowerCase();
          const matchedCenter = wilayaCenters.find(c => {
            const cName = (c.name || '').toLowerCase();
            const cComm = (c.commune_name || '').toLowerCase();
            return combinedSearch.includes(cComm) || combinedSearch.includes(cName) || cName.includes(normalizedToCommune.toLowerCase());
          });

          const selectedCenter = matchedCenter || wilayaCenters[0];
          stopdeskId = selectedCenter.center_id;
          targetCommune = selectedCenter.commune_name || normalizedToCommune;
        } else {
          stopdeskId = (toWilayaId * 10000 + 101);
          targetCommune = normalizedToCommune || normalizedToWilaya;
        }
      }

      const orderRef = String(order.ticketNumber || order.id || Date.now());
      const parcelPayload = [{
        order_id: orderRef,
        from_wilaya_name: fromWilaya,
        firstname: firstname,
        familyname: familyname,
        contact_phone: contactPhone,
        address: order.address || `${targetCommune}, ${normalizedToWilaya}`,
        to_commune_name: targetCommune,
        to_wilaya_name: normalizedToWilaya,
        product_list: order.product || 'بيجامات وملابس نوم فاخرة',
        price: codProductPrice,
        do_insurance: false,
        declared_value: 0,
        length: 25,
        width: 20,
        height: 5,
        weight: 1,
        freeshipping: false,
        is_stopdesk: isStopdesk,
        ...(stopdeskId ? { stopdesk_id: stopdeskId } : {}),
        has_exchange: false
      }];

      console.log('Sending Yalidine Parcel payload:', JSON.stringify(parcelPayload, null, 2));

      const yResponse = await fetch(`${YALIDINE_BASE_URL}parcels/`, {
        method: 'POST',
        headers: {
          'X-API-ID': apiId,
          'X-API-TOKEN': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parcelPayload)
      });

      const yData = await yResponse.json();
      console.log('Yalidine API Response:', JSON.stringify(yData, null, 2));

      const result = yData[orderRef] || Object.values(yData)[0];

      if (result && result.success) {
        const tracking = result.tracking;
        const labelUrl = result.label || result.labels || '';

        // Save tracking number to order in Supabase
        if (order.id) {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                trackingNumber: tracking,
                shippingLabelUrl: labelUrl,
                deliveryCompany: 'yalidine'
              })
            });
          } catch (dbErr) {
            console.error('Error saving tracking number to DB:', dbErr);
          }
        }

        return res.status(200).json({
          success: true,
          trackingNumber: tracking,
          shippingLabelUrl: labelUrl,
          importId: result.import_id,
          deliveryCompany: 'yalidine',
          codPrice: codProductPrice
        });
      } else {
        const errMsg = result?.message || yData.message || 'Yalidine parcel creation failed';
        return res.status(400).json({
          success: false,
          error: errMsg,
          details: yData
        });
      }
    }

    // ==========================================
    // 2. ZR EXPRESS INTEGRATION
    // ==========================================
    if (company.toLowerCase() === 'zrexpress' || company.toLowerCase() === 'zr') {
      const zrKey = creds.zr_express_api_key;
      if (!zrKey) {
        return res.status(200).json({
          success: true,
          isMock: true,
          trackingNumber: `ZR-${Math.floor(100000 + Math.random() * 900000)}`,
          shippingLabelUrl: `https://zrexpress.com/label-mock`,
          deliveryCompany: 'zrexpress',
          codPrice: codProductPrice,
          message: 'ZR Express simulation (keys pending in Settings)'
        });
      }

      // ZR Express direct API
      const zrRes = await fetch('https://proapi.zr-express.com/api/v1/colis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${zrKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_name: order.clientName,
          client_phone: contactPhone,
          wilaya: order.wilaya,
          commune: order.commune,
          type: isStopdesk ? 'stopdesk' : 'domicile',
          price: codProductPrice,
          product_name: order.product || 'بيجامات'
        })
      });

      const zrData = await zrRes.json();
      if (zrRes.ok && zrData.tracking) {
        return res.status(200).json({
          success: true,
          trackingNumber: zrData.tracking,
          shippingLabelUrl: zrData.label_url || '',
          deliveryCompany: 'zrexpress',
          codPrice: codProductPrice
        });
      } else {
        return res.status(400).json({
          success: false,
          error: zrData.message || 'ZR Express parcel creation failed',
          details: zrData
        });
      }
    }

    return res.status(400).json({ success: false, error: 'Unsupported delivery provider' });

  } catch (error) {
    console.error('Create parcel handler error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
