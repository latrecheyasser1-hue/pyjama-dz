export const DEFAULT_CATEGORIES = [
  { id: 'all', title: 'TOUT VOIR', icon: '✨', image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400&q=80' },
  { id: 'hot_sale', title: 'الأكثر مبيعاً (HOT SALE)', icon: '🔥', badge: '🔥 Tendance', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80' },
  { id: 'jbeb-qatifa-mv2fahl5', title: 'DJEBBA KATIFA', icon: '👑', badge: '✨ Collection Royale', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80' },
  { id: 'pyjamas-95', title: 'pyjamas', icon: '☁️', badge: '🌸 Confort Absolu', image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400&q=80' },
  { id: 'pantoufl-mv2f89yh', title: 'PANTOUFL', icon: '🧸', badge: '❄️ Cocooning', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80' },
  { id: 'shoes-3', title: 'BASQUET', icon: '👟', badge: '⚡ Tendance', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { id: 'promo', title: '% SOLDES', icon: '🏷️', badge: '🏷️ Offres Limitées', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80' }
];

export const INITIAL_SUPPLIERS = [
  { id: 1, name: "Atelier Satin Luxe (Algiers)", phone: "0551234567" },
  { id: 2, name: "Importateur Coton Turc (Sétif)", phone: "0669876543" },
  { id: 3, name: "Confection Trousseau VIP (Oran)", phone: "0771122334" }
];

export const INITIAL_EXPENSES = [
  { id: 1, title: "Achat boîtes cadeaux prestige & rubans dorés", amount: 4500, date: "28 Juin 2026" },
  { id: 2, title: "Frais transport express Yalidine colis urgents", amount: 2200, date: "29 Juin 2026" },
  { id: 3, title: "Café & déjeuner équipe atelier", amount: 1100, date: "30 Juin 2026" }
];

export const INITIAL_SETTINGS = {
  categories: DEFAULT_CATEGORIES,
  pin: "765483",
  instagram: "https://www.instagram.com/pyjama_dz",
  googleMaps: "https://maps.app.goo.gl/algeria-pyjama-dz",
  phones: ["0554 12 89 33", "0661 98 23 45"],
  whatsapp: "0554128933"
};

export const INITIAL_PRODUCTS = [
  {
    id: '8a5149bb-e36e-45f3-ac9c-5d1aa74274b5',
    title: "Robe KT-260906Y",
    category: "jbeb-qatifa-mv2fahl5",
    purchasePrice: 2500,
    price: 2950,
    oldPrice: 3800,
    supplier: "Local Youcef",
    sizes: ["Standard"],
    colorVariants: [
      { color: "Standard", stock: { "Standard": 10 } }
    ],
    images: ["https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800"],
    barcode: "KT-260906Y",
    promo: false,
    badge: "Top Vente 🔥",
    description: "جبة قطيفة فاخرة بتصميم أنيق ومريح للمنزل والمناسبات."
  },
  {
    id: '6fac06fb-c251-409b-bae1-45b43803989b',
    title: "Pyjama Heat Underwear Enfant",
    category: "pyjamas-95",
    purchasePrice: 1050,
    price: 1400,
    oldPrice: 1900,
    supplier: "MEKI",
    sizes: ["80", "100", "120", "140", "160"],
    colorVariants: [
      { color: "Standard", stock: { "100": 8, "120": 10, "140": 6 } }
    ],
    images: ["https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800"],
    barcode: "9268225554864",
    promo: false,
    badge: "Nouveau ✨",
    description: "بيجاما حرارية ناعمة ومريحة للأطفال بمقاسات مختلفة."
  },
  {
    id: '9241a848-8fcb-498e-86bd-35f7d1416c32',
    title: "Pyjama Heat Underwear",
    category: "pyjamas-95",
    purchasePrice: 1450,
    price: 1800,
    oldPrice: 2400,
    supplier: "MEKI",
    sizes: ["M", "L", "XL", "2XL"],
    colorVariants: [
      { color: "Noir", stock: { "M": 6, "L": 10, "XL": 8 } }
    ],
    images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800"],
    barcode: "4070111775780",
    promo: true,
    badge: "Top Vente 🔥",
    description: "بيجاما حرارية عالية الجودة توفر الدفء والراحة الفائقة."
  },
  {
    id: 'eb8ac0b4-a345-4efe-9df1-f7516f986a76',
    title: "Robe KT-261008M",
    category: "jbeb-qatifa-mv2fahl5",
    purchasePrice: 2700,
    price: 3200,
    oldPrice: 4200,
    supplier: "LOCAL MED",
    sizes: ["Standard"],
    colorVariants: [
      { color: "Standard", stock: { "Standard": 8 } }
    ],
    images: ["https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800"],
    barcode: "Kt-261008M",
    promo: false,
    badge: "Édition Limitée 👑",
    description: "روب قطيفة فاخر بتطريزات أنيقة وقماش دافئ راقي."
  }
];


export const ALGERIA_WILAYAS = [
  "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna",
  "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
  "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
  "16 - Alger (العاصمة)", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
  "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
  "31 - Oran (وهران)", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arréridj", "35 - Boumerdès",
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
  "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
  "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane"
];

export const INITIAL_ORDERS = [
  {
    id: "CMD-8942",
    clientName: "Yasmine Benali",
    phone: "0554128933",
    wilaya: "16 - Alger (العاصمة)",
    commune: "Hydra",
    deliveryMode: "à domicile",
    product: "Ensemble Satin Royale - 3 Pièces (Rose Poudre)",
    size: "M",
    price: 4500,
    status: "nouvelle",
    date: "Aujourd'hui, 14:10"
  },
  {
    id: "CMD-8941",
    clientName: "Amira Mansouri",
    phone: "0661982345",
    wilaya: "31 - Oran (وهران)",
    commune: "Akid Lotfi",
    deliveryMode: "au bureau Yalidine",
    product: "Pack Trousseau de Mariée VIP - 6 Pièces",
    size: "L",
    price: 12500,
    status: "confirmee",
    date: "Aujourd'hui, 12:45"
  },
  {
    id: "CMD-8940",
    clientName: "Sarah Zerrouki",
    phone: "0770451298",
    wilaya: "25 - Constantine",
    commune: "Nouvelle Ville Ali Mendjeli",
    deliveryMode: "à domicile",
    product: "Pyjama Coton Bio Douceur d'Hiver",
    size: "XL",
    price: 3200,
    status: "expediee",
    date: "Hier, 18:20"
  },
  {
    id: "CMD-8939",
    clientName: "Meriem Kaddour",
    phone: "0558776611",
    wilaya: "09 - Blida",
    commune: "Ouled Yaïch",
    deliveryMode: "à domicile",
    product: "Nuisette Satinée de Luxe avec Kimono",
    size: "S",
    price: 3800,
    status: "livree",
    date: "29 Juin"
  }
];
