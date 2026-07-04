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
  pin: "765483",
  instagram: "https://www.instagram.com/pyjama_dz",
  googleMaps: "https://maps.app.goo.gl/algeria-pyjama-dz",
  phones: ["0554 12 89 33", "0661 98 23 45"],
  whatsapp: "0554128933"
};

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    title: "Ensemble Satin Royale - 3 Pièces (Rose Poudre)",
    category: "satin",
    purchasePrice: 2800,
    price: 4500,
    oldPrice: 6200,
    supplier: "Atelier Satin Luxe (Algiers)",
    sizes: ["S", "M", "L", "XL"],
    colorVariants: [
      { color: "Rose Poudre", stock: { "S": 5, "M": 12, "L": 8, "XL": 3 } },
      { color: "Bordeaux Royal", stock: { "S": 4, "M": 10, "L": 6, "XL": 2 } }
    ],
    images: ["https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800"],
    barcode: "100858539887",
    promo: true,
    badge: "Top Vente 🔥",
    description: "Ensemble somptueux en satin de soie d'une douceur incomparable. Comprend caraco, pantalon fluide et robe de chambre assortie."
  },
  {
    id: 2,
    title: "Pyjama Coton Bio Douceur d'Hiver (Écru & Beige)",
    category: "coton",
    purchasePrice: 1900,
    price: 3200,
    oldPrice: 4500,
    supplier: "Importateur Coton Turc (Sétif)",
    sizes: ["M", "L", "XL", "XXL"],
    colorVariants: [
      { color: "Écru", stock: { "M": 15, "L": 20, "XL": 14, "2XL": 8 } }
    ],
    images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800"],
    barcode: "100795289030",
    promo: false,
    badge: "Nouveau ✨",
    description: "Confort absolu pour vos soirées cocooning. 100% coton turc respirant, doux sur la peau."
  },
  {
    id: 3,
    title: "Pack Trousseau de Mariée VIP - 6 Pièces (Blanc & Doré)",
    category: "mariee",
    purchasePrice: 8200,
    price: 12500,
    oldPrice: 16000,
    supplier: "Confection Trousseau VIP (Oran)",
    sizes: ["S", "M", "L"],
    colorVariants: [
      { color: "Blanc Impérial", stock: { "S": 3, "M": 6, "L": 4 } },
      { color: "Doré Champagne", stock: { "S": 2, "M": 5, "L": 3 } }
    ],
    images: ["https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800"],
    barcode: "100902750513",
    promo: true,
    badge: "Spécial Mariée 👰",
    description: "Le coffret prestige indispensable pour le جهاز العروسة. Finitions en dentelle fine et satin luxueux."
  },
  {
    id: 4,
    title: "Nuisette Satinée de Luxe avec Kimono (Bordeaux)",
    category: "satin",
    purchasePrice: 2200,
    price: 3800,
    oldPrice: 5000,
    supplier: "Atelier Satin Luxe (Algiers)",
    sizes: ["S", "M", "L", "XL"],
    colorVariants: [
      { color: "Bordeaux", stock: { "S": 8, "M": 14, "L": 10, "XL": 5 } }
    ],
    images: ["https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800"],
    barcode: "100399877873",
    promo: true,
    badge: "Promo -25%",
    description: "Un toucher velours unique avec une coupe ajustée et élégante. Idéal pour offrir."
  },
  {
    id: 5,
    title: "Ensemble Loungewear Cocooning 2 Pièces (Gris Perle)",
    category: "coton",
    purchasePrice: 2100,
    price: 3500,
    oldPrice: 4200,
    supplier: "Importateur Coton Turc (Sétif)",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colorVariants: [
      { color: "Gris Perle", stock: { "S": 10, "M": 18, "L": 15, "XL": 9, "2XL": 6 } }
    ],
    images: ["https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800"],
    barcode: "100729385180",
    promo: false,
    badge: "Confort 🧸",
    description: "Tenue d'intérieur moderne, parfaite pour se détendre avec style à la maison."
  },
  {
    id: 6,
    title: "Coffret Trousseau Soie & Dentelle - 4 Pièces (Rouge Rubis)",
    category: "mariee",
    purchasePrice: 5600,
    price: 8900,
    oldPrice: 11500,
    supplier: "Confection Trousseau VIP (Oran)",
    sizes: ["M", "L", "XL"],
    colorVariants: [
      { color: "Rouge Rubis", stock: { "M": 7, "L": 8, "XL": 4 } }
    ],
    images: ["https://images.unsplash.com/photo-1502716119720-b23a93e5fc1b?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&q=80&w=800"],
    barcode: "100671479519",
    promo: true,
    badge: "Recommandé ⭐",
    description: "Élégance royale et raffinement extrême. Livré dans un coffret cadeau Pyjama DZ exclusif."
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
