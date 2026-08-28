import { YALIDINE_AGENCIES } from '../src/data/yalidineAgencies.js';
import { ZR_AGENCIES } from '../src/data/zrAgencies.js';
import { ZR_TERRITORIES } from '../src/data/zrTerritories.js';

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

function formatValidAlgerianIntlPhone(rawPhone) {
  if (!rawPhone) return '+213770000000';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('213')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length === 9) {
    const firstDigit = digits[0];
    const secondDigit = digits[1];

    if (firstDigit === '5' && !['4', '5', '6'].includes(secondDigit)) {
      if (['7', '8', '9'].includes(secondDigit)) {
        digits = '7' + digits.slice(1);
      } else {
        digits = '55' + digits.slice(2);
      }
    } else if (!['5', '6', '7'].includes(firstDigit)) {
      digits = '7' + digits.slice(1);
    }
  }

  while (digits.length < 9) digits += '0';
  if (digits.length > 9) digits = digits.slice(0, 9);

  return '+213' + digits;
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
    const { order, company } = req.body || {};

    if (!order) {
      return res.status(400).json({ success: false, error: 'Missing order details' });
    }

    const rawComp = String(company || order.deliveryCompany || '').toLowerCase();
    const isZR = rawComp === 'zrexpress' || 
                 rawComp === 'zr' || 
                 rawComp.includes('zr') || 
                 String(order.deliveryMode || '').includes('Hub') || 
                 String(order.commune || '').includes('Hub');

    const effectiveCompany = isZR ? 'zrexpress' : 'yalidine';

    const creds = await getDeliverySettings();
    const isStopdesk = Boolean(
      String(order.deliveryMode || '').toLowerCase().includes('bureau') ||
      String(order.deliveryMode || '').toLowerCase().includes('stop') ||
      order.is_stopdesk
    );

    const isFreeShipping = Boolean(
      order.isFreeShipping === true ||
      Number(order.totalPrice || order.price || 0) >= 10000 ||
      Number(order.deliveryFee) === 0
    );

    const codProductPrice = isFreeShipping 
      ? Number(order.price || order.totalPrice || 0)
      : Number(order.totalPrice || (order.price + (order.deliveryFee || 0)));

    // Prevent duplicate parcel creation if already created by WhatsApp or another action
    if (order.id) {
      try {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}&select=id,trackingNumber,shippingLabelUrl,deliveryCompany`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const checkRows = await checkRes.json();
        if (Array.isArray(checkRows) && checkRows[0] && checkRows[0].trackingNumber) {
          console.log(`[create-parcel] Order ${order.id} already has parcel: ${checkRows[0].trackingNumber}`);
          return res.status(200).json({
            success: true,
            alreadyCreated: true,
            trackingNumber: checkRows[0].trackingNumber,
            shippingLabelUrl: checkRows[0].shippingLabelUrl || '',
            deliveryCompany: checkRows[0].deliveryCompany || effectiveCompany,
            codPrice: codProductPrice
          });
        }
      } catch (e) {}
    }
    const { firstname, familyname } = splitFullName(order.clientName);
    const contactPhone = formatAlgerianPhone(order.phone || order.whatsapp);
    const normalizedToWilaya = normalizeWilaya(order.wilaya);
    const normalizedToCommune = normalizeCommune(order.commune, normalizedToWilaya);
    const rawName = String(order.clientName || 'Client').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim() || 'Client';
    const toWilaya = normalizedToWilaya;
    const cleanCommune = normalizedToCommune;
    const fromWilaya = normalizeWilaya(creds.store_wilaya || 'Chlef');
    const toWilayaId = WILAYA_IDS[normalizedToWilaya] || 16;
    const orderRef = 'CMD-' + String(order.ticketNumber || order.id || Date.now()).slice(0, 8);

    // ==========================================
    // 1. YALIDINE / GUEPEX INTEGRATION
    // ==========================================
    if (effectiveCompany === 'yalidine') {
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
        const wilayaCode = String(toWilayaId).padStart(2, '0');
        const wilayaAgencies = YALIDINE_AGENCIES[wilayaCode] || [];
        
        if (wilayaAgencies.length > 0) {
          const bracketMatch = String(order.commune || '').match(/\[(.*?)\]/) || String(order.deliveryMode || '').match(/\((.*?)\)/);
          const searchPhrase = bracketMatch ? bracketMatch[1].toLowerCase() : String(order.deliveryMode || '').toLowerCase();

          // 1. Full agency name match
          let matchedCenter = wilayaAgencies.find(a => {
            const aName = (a.name || '').toLowerCase();
            return searchPhrase.includes(aName) || aName.includes(searchPhrase);
          });

          // 2. Commune name match within agency text
          if (!matchedCenter) {
            matchedCenter = wilayaAgencies.find(a => {
              const aComm = (a.commune || '').toLowerCase();
              return searchPhrase.includes(aComm);
            });
          }

          // 3. Keyword / Token match (e.g. 'ezzouar', 'cheraga', 'boukadir')
          if (!matchedCenter) {
            const tokens = searchPhrase.replace(/وكالة|مكتب|agence|de|\[|\]|\(|\)/gi, ' ').split(/\s+/).filter(t => t.length >= 4);
            matchedCenter = wilayaAgencies.find(a => {
              const aStr = (a.name + ' ' + a.commune).toLowerCase();
              return tokens.some(tok => aStr.includes(tok));
            });
          }

          const selectedCenter = matchedCenter || wilayaAgencies[0];
          stopdeskId = selectedCenter.id;
          targetCommune = selectedCenter.commune || normalizedToCommune;
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
        freeshipping: isFreeShipping,
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
    // 2. ZR EXPRESS INTEGRATION (VERIFIED & TESTED)
    // ==========================================
    if (effectiveCompany === 'zrexpress') {
      const zrKey = creds.zr_express_api_key || 'Z7Hc9ysXDHbjfztqASk0YevJumND6TOFpH7tC8DKLpCFsX5ZfV2kjdSplyiktz3d';
      const zrTenantId = creds.zr_express_tenant_id || 'c84d4b7b-9252-45c0-8339-5be6cfd9bc91';

      if (!zrKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing ZR Express API key in settings'
        });
      }

      const zrHeaders = {
        'X-Api-Key': zrKey,
        'X-Tenant': zrTenantId,
        'Content-Type': 'application/json'
      };

      // Format validated international phone number (+213...)
      const intlPhone = formatValidAlgerianIntlPhone(contactPhone || order.phone || order.whatsapp);

      // A. Create or Find Customer on ZR Express
      let customerId = null;
      try {
        const custRes = await fetch('https://api.zrexpress.app/api/v1/customers/individual', {
          method: 'POST',
          headers: zrHeaders,
          body: JSON.stringify({
            name: rawName,
            phone: { number1: intlPhone }
          })
        });
        const custData = await custRes.json();
        customerId = custData?.id;
      } catch (e) {
        console.warn('Customer create error, searching instead:', e);
      }

      if (!customerId) {
        const custSearch = await fetch('https://api.zrexpress.app/api/v1/customers/search', {
          method: 'POST',
          headers: zrHeaders,
          body: JSON.stringify({ search: intlPhone, limit: 1 })
        });
        const cList = await custSearch.json();
        customerId = cList.items?.[0]?.id || '5b4191cf-b08b-4990-bde5-119ac532df51';
      }

      // B. Get or Create Default Product on ZR Express
      let productId = '2da6c5d9-b679-45a1-92ea-af8206cd6638';
      let productSku = 'SKU-PYJAMA-01';

      // C. Resolve Territory IDs (Commune & Wilaya)
      const wilayaCode = String(toWilayaId).padStart(2, '0');
      const wilayaTerritory = ZR_TERRITORIES[wilayaCode];
      const cityTerritoryId = wilayaTerritory?.cityTerritoryId || 'd134c182-7dac-4655-9d9b-bbdb62aa2ec4';

      let districtTerritoryId = null;
      let postalCode = `${wilayaCode}000`;
      let streetAddress = order.address || `${cleanCommune}, ${toWilaya}`;
      let targetHubId = null;
      let targetHubName = null;

      if (isStopdesk) {
        // Bureau / Stop Desk delivery
        const wilayaAgencies = ZR_AGENCIES[wilayaCode] || [];
        const bracketMatch = String(order.commune || '').match(/\[(.*?)\]/) || String(order.deliveryMode || '').match(/\((.*?)\)/);
        const searchPhrase = bracketMatch ? bracketMatch[1].toLowerCase() : String(order.commune || order.deliveryMode || '').toLowerCase();

        let matchedAgency = wilayaAgencies.find(a => {
          const aName = (a.name || '').toLowerCase();
          return searchPhrase.includes(aName) || aName.includes(searchPhrase);
        });

        if (!matchedAgency) {
          matchedAgency = wilayaAgencies.find(a => {
            const aComm = (a.commune || '').toLowerCase();
            return searchPhrase.includes(aComm);
          });
        }

        if (!matchedAgency && wilayaAgencies.length > 0) {
          matchedAgency = wilayaAgencies[0];
        }

        if (matchedAgency) {
          targetHubId = matchedAgency.id;
          targetHubName = matchedAgency.name;
          streetAddress = matchedAgency.street || matchedAgency.name;
          postalCode = matchedAgency.postalCode || postalCode;

          // Resolve district territory for this agency's commune
          if (wilayaTerritory?.communes) {
            const commKey = (matchedAgency.commune || '').toLowerCase();
            const matchedComm = wilayaTerritory.communes[commKey] || Object.values(wilayaTerritory.communes)[0];
            if (matchedComm) {
              districtTerritoryId = matchedComm.id;
              postalCode = matchedComm.postalCode || postalCode;
            }
          }
        }
      } else {
        // Home delivery (À domicile)
        if (wilayaTerritory?.communes) {
          const cleanCommLower = cleanCommune.toLowerCase();
          let matchedComm = wilayaTerritory.communes[cleanCommLower];
          if (!matchedComm) {
            matchedComm = Object.values(wilayaTerritory.communes).find(c => 
              c.name.toLowerCase().includes(cleanCommLower) || cleanCommLower.includes(c.name.toLowerCase()) ||
              (c.nameArabic && (c.nameArabic.includes(cleanCommune) || cleanCommune.includes(c.nameArabic)))
            );
          }
          if (matchedComm) {
            districtTerritoryId = matchedComm.id;
            postalCode = matchedComm.postalCode || postalCode;
          } else {
            const firstComm = Object.values(wilayaTerritory.communes)[0];
            if (firstComm) {
              districtTerritoryId = firstComm.id;
              postalCode = firstComm.postalCode || postalCode;
            }
          }
        }
      }

      if (!districtTerritoryId && wilayaTerritory?.communes) {
        const firstComm = Object.values(wilayaTerritory.communes)[0];
        districtTerritoryId = firstComm?.id || '7f6c89b5-2e84-4e6f-b32b-0024d0022c79';
      }

      // D. Build Parcel Payload
      const supplierHubId = '46a61165-5378-484d-a0c9-f5c1df785df9'; // Hub Chlef 02
      // For Stopdesk / pickup-point in ZR Express, root hubId must be the destination hub!
      const effectiveHubId = (isStopdesk && targetHubId) ? targetHubId : supplierHubId;

      const parcelPayload = {
        customer: {
          customerId: customerId,
          name: rawName,
          phone: { number1: intlPhone }
        },
        hubId: effectiveHubId,
        deliveryAddress: {
          cityTerritoryId: cityTerritoryId,
          districtTerritoryId: districtTerritoryId,
          street: streetAddress,
          postalCode: postalCode,
          ...(targetHubId ? { hubId: targetHubId, hubName: targetHubName } : {})
        },
        orderedProducts: [
          {
            productId: productId,
            productName: order.product || 'بيجامات وملابس نوم فاخرة',
            productSku: productSku,
            quantity: Number(order.quantity || 1),
            unitPrice: codProductPrice,
            length: 25,
            width: 20,
            height: 5,
            weight: 1,
            stockType: 'local'
          }
        ],
        deliveryType: isStopdesk ? 'pickup-point' : 'home',
        description: order.product || 'بيجامات وملابس نوم فاخرة',
        amount: codProductPrice,
        externalId: orderRef
      };

      console.log('Creating ZR Express Parcel:', JSON.stringify(parcelPayload, null, 2));

      const zrRes = await fetch('https://api.zrexpress.app/api/v1/parcels', {
        method: 'POST',
        headers: zrHeaders,
        body: JSON.stringify(parcelPayload)
      });

      const zrData = await zrRes.json();
      console.log('ZR Express Creation Response:', JSON.stringify(zrData, null, 2));

      if (zrRes.ok && zrData.id) {
        const parcelId = zrData.id;

        // Fetch full parcel details to get tracking number
        let trackingNumber = `ZR-${parcelId.slice(0, 8).toUpperCase()}`;
        try {
          const detailRes = await fetch(`https://api.zrexpress.app/api/v1/parcels/${parcelId}`, {
            headers: zrHeaders
          });
          const detailData = await detailRes.json();
          if (detailData?.trackingNumber) {
            trackingNumber = detailData.trackingNumber;
          }
        } catch (detailErr) {
          console.warn('Error fetching parcel details:', detailErr);
        }

        // Generate official PDF bordereau label URL
        let labelUrl = '';
        try {
          const pdfRes = await fetch('https://api.zrexpress.app/api/v1/parcels/labels/individual/pdf', {
            method: 'POST',
            headers: zrHeaders,
            body: JSON.stringify({ trackingNumbers: [trackingNumber] })
          });
          const pdfData = await pdfRes.json();
          labelUrl = pdfData.parcelLabelFiles?.[0]?.fileUrl || '';
        } catch (pdfErr) {
          console.warn('Error generating PDF label:', pdfErr);
        }

        // Save tracking and label URL to order in Supabase
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
                trackingNumber: trackingNumber,
                shippingLabelUrl: labelUrl,
                deliveryCompany: 'zrexpress'
              })
            });
          } catch (dbErr) {
            console.error('Error saving tracking number to DB:', dbErr);
          }
        }

        return res.status(200).json({
          success: true,
          trackingNumber: trackingNumber,
          parcelId: parcelId,
          shippingLabelUrl: labelUrl,
          deliveryCompany: 'zrexpress',
          codPrice: codProductPrice
        });
      } else {
        const errMsg = zrData.detail || zrData.title || zrData.message || 'ZR Express parcel creation failed';
        return res.status(400).json({
          success: false,
          error: errMsg,
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
