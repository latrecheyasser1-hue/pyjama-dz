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

export const INITIAL_PRODUCTS = [];

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

export const INITIAL_ORDERS = [];
