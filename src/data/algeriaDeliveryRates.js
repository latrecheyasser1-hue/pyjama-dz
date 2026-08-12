// Pre-loaded delivery rates for 58 Wilayas (Departure: Wilaya 02 - Chlef)
// Providers: Yalidine Express & ZR Express (À domicile & Au bureau/Stopdesk)

export const CHLEF_DEPARTURE_WILAYA = {
  code: "02",
  name: "Chlef",
  nameAr: "الشلف"
};

export const CHLEF_DELIVERY_RATES = [
  { code: "01", name: "Adrar", nameAr: "أدرار", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 650, note: "Bureau Yalidine Adrar Centre" },
    { provider: "Yalidine Express", type: "À domicile", price: 1000, note: "Toutes communes principales" },
    { provider: "ZR Express", type: "Au bureau", price: 600, note: "Point Relais ZR Adrar" },
    { provider: "ZR Express", type: "À domicile", price: 950, note: "Livraison rapide à domicile" }
  ]},
  { code: "02", name: "Chlef", nameAr: "الشلف", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 200, note: "Bureau Yalidine Chlef" },
    { provider: "Yalidine Express", type: "À domicile", price: 350, note: "Livraison locale express" },
    { provider: "ZR Express", type: "Au bureau", price: 180, note: "Agence ZR Chlef Centre" },
    { provider: "ZR Express", type: "À domicile", price: 300, note: "Livraison à domicile le jour même" }
  ]},
  { code: "03", name: "Laghouat", nameAr: "الأغواط", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Laghouat" },
    { provider: "Yalidine Express", type: "À domicile", price: 750, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 700, note: "Livraison domicile" }
  ]},
  { code: "04", name: "Oum El Bouaghi", nameAr: "أم البواقي", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 500, note: "Bureau Oum El Bouaghi" },
    { provider: "Yalidine Express", type: "À domicile", price: 800, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 450, note: "Agence ZR" },
    { provider: "ZR Express", type: "À domicile", price: 750, note: "Livraison domicile" }
  ]},
  { code: "05", name: "Batna", nameAr: "باتنة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 500, note: "Bureau Batna Centre" },
    { provider: "Yalidine Express", type: "À domicile", price: 800, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 450, note: "Point Relais ZR Batna" },
    { provider: "ZR Express", type: "À domicile", price: 750, note: "Livraison rapide" }
  ]},
  { code: "06", name: "Béjaïa", nameAr: "بجاية", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Béjaïa Ville" },
    { provider: "Yalidine Express", type: "À domicile", price: 750, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Agence ZR Béjaïa" },
    { provider: "ZR Express", type: "À domicile", price: 700, note: "Livraison domicile" }
  ]},
  { code: "07", name: "Biskra", nameAr: "بسكرة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 500, note: "Bureau Biskra" },
    { provider: "Yalidine Express", type: "À domicile", price: 800, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 450, note: "Point Relais ZR Biskra" },
    { provider: "ZR Express", type: "À domicile", price: 750, note: "Livraison domicile" }
  ]},
  { code: "08", name: "Béchar", nameAr: "بشار", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 600, note: "Bureau Yalidine Béchar" },
    { provider: "Yalidine Express", type: "À domicile", price: 950, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 550, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 900, note: "Livraison domicile" }
  ]},
  { code: "09", name: "Blida", nameAr: "البليدة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureau Blida Centre" },
    { provider: "Yalidine Express", type: "À domicile", price: 550, note: "Livraison express 24h" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Blida" },
    { provider: "ZR Express", type: "À domicile", price: 500, note: "Livraison rapide à domicile" }
  ]},
  { code: "10", name: "Bouira", nameAr: "البويرة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 400, note: "Bureau Bouira" },
    { provider: "Yalidine Express", type: "À domicile", price: 650, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 350, note: "Agence ZR Bouira" },
    { provider: "ZR Express", type: "À domicile", price: 600, note: "Livraison domicile" }
  ]},
  { code: "11", name: "Tamanrasset", nameAr: "تمنراست", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 800, note: "Bureau Yalidine Tamanrasset" },
    { provider: "Yalidine Express", type: "À domicile", price: 1300, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 750, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 1250, note: "Livraison domicile" }
  ]},
  { code: "12", name: "Tébessa", nameAr: "تبسة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Tébessa" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "13", name: "Tlemcen", nameAr: "تلمسان", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Tlemcen Ville" },
    { provider: "Yalidine Express", type: "À domicile", price: 700, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR Tlemcen" },
    { provider: "ZR Express", type: "À domicile", price: 650, note: "Livraison domicile" }
  ]},
  { code: "14", name: "Tiaret", nameAr: "تيارت", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 400, note: "Bureau Tiaret" },
    { provider: "Yalidine Express", type: "À domicile", price: 650, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 350, note: "Point Relais ZR Tiaret" },
    { provider: "ZR Express", type: "À domicile", price: 600, note: "Livraison domicile" }
  ]},
  { code: "15", name: "Tizi Ouzou", nameAr: "تيزي وزو", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 400, note: "Bureau Tizi Ouzou" },
    { provider: "Yalidine Express", type: "À domicile", price: 650, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 350, note: "Point Relais ZR Tizi Ouzou" },
    { provider: "ZR Express", type: "À domicile", price: 600, note: "Livraison domicile" }
  ]},
  { code: "16", name: "Alger (العاصمة)", nameAr: "الجزائر العاصمة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureaux Alger (Chéraga, Kouba, Bab Ezzouar, etc.)" },
    { provider: "Yalidine Express", type: "À domicile", price: 550, note: "Livraison express 24h/48h" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Agences ZR Alger" },
    { provider: "ZR Express", type: "À domicile", price: 500, note: "Livraison rapide à domicile" }
  ]},
  { code: "17", name: "Djelfa", nameAr: "الجلفة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Djelfa" },
    { provider: "Yalidine Express", type: "À domicile", price: 750, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR Djelfa" },
    { provider: "ZR Express", type: "À domicile", price: 700, note: "Livraison domicile" }
  ]},
  { code: "18", name: "Jijel", nameAr: "جيجل", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Jijel Ville" },
    { provider: "Yalidine Express", type: "À domicile", price: 700, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR Jijel" },
    { provider: "ZR Express", type: "À domicile", price: 650, note: "Livraison domicile" }
  ]},
  { code: "19", name: "Sétif", nameAr: "سطيف", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Sétif Centre" },
    { provider: "Yalidine Express", type: "À domicile", price: 700, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR Sétif" },
    { provider: "ZR Express", type: "À domicile", price: 650, note: "Livraison domicile" }
  ]},
  { code: "20", name: "Saïda", nameAr: "سعيدة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Saïda" },
    { provider: "Yalidine Express", type: "À domicile", price: 700, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR Saïda" },
    { provider: "ZR Express", type: "À domicile", price: 650, note: "Livraison domicile" }
  ]},
  { code: "21", name: "Skikda", nameAr: "سكيكدة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 500, note: "Bureau Skikda" },
    { provider: "Yalidine Express", type: "À domicile", price: 800, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 450, note: "Point Relais ZR Skikda" },
    { provider: "ZR Express", type: "À domicile", price: 750, note: "Livraison domicile" }
  ]},
  { code: "22", name: "Sidi Bel Abbès", nameAr: "سيدي بلعباس", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 400, note: "Bureau Sidi Bel Abbès" },
    { provider: "Yalidine Express", type: "À domicile", price: 650, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 350, note: "Point Relais ZR Sidi Bel Abbès" },
    { provider: "ZR Express", type: "À domicile", price: 600, note: "Livraison domicile" }
  ]},
  { code: "23", name: "Annaba", nameAr: "عنابة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 500, note: "Bureau Annaba Centre" },
    { provider: "Yalidine Express", type: "À domicile", price: 800, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 450, note: "Point Relais ZR Annaba" },
    { provider: "ZR Express", type: "À domicile", price: 750, note: "Livraison domicile" }
  ]},
  { code: "24", name: "Guelma", nameAr: "قالمة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 500, note: "Bureau Guelma" },
    { provider: "Yalidine Express", type: "À domicile", price: 800, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 450, note: "Point Relais ZR Guelma" },
    { provider: "ZR Express", type: "À domicile", price: 750, note: "Livraison domicile" }
  ]},
  { code: "25", name: "Constantine", nameAr: "قسنطينة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 500, note: "Bureau Constantine" },
    { provider: "Yalidine Express", type: "À domicile", price: 750, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 450, note: "Point Relais ZR Constantine" },
    { provider: "ZR Express", type: "À domicile", price: 700, note: "Livraison domicile" }
  ]},
  { code: "26", name: "Médéa", nameAr: "المدية", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureau Médéa" },
    { provider: "Yalidine Express", type: "À domicile", price: 600, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Médéa" },
    { provider: "ZR Express", type: "À domicile", price: 550, note: "Livraison domicile" }
  ]},
  { code: "27", name: "Mostaganem", nameAr: "مستغانم", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureau Mostaganem" },
    { provider: "Yalidine Express", type: "À domicile", price: 550, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Mostaganem" },
    { provider: "ZR Express", type: "À domicile", price: 500, note: "Livraison domicile" }
  ]},
  { code: "28", name: "M'Sila", nameAr: "المسيلة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau M'Sila" },
    { provider: "Yalidine Express", type: "À domicile", price: 700, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR M'Sila" },
    { provider: "ZR Express", type: "À domicile", price: 650, note: "Livraison domicile" }
  ]},
  { code: "29", name: "Mascara", nameAr: "معسكر", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureau Mascara" },
    { provider: "Yalidine Express", type: "À domicile", price: 600, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Mascara" },
    { provider: "ZR Express", type: "À domicile", price: 550, note: "Livraison domicile" }
  ]},
  { code: "30", name: "Ouargla", nameAr: "ورقلة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Ouargla" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR Ouargla" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "31", name: "Oran (وهران)", nameAr: "وهران", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureaux Oran (Akid Lotfi, Es Senia, etc.)" },
    { provider: "Yalidine Express", type: "À domicile", price: 600, note: "Livraison express 24h" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Oran" },
    { provider: "ZR Express", type: "À domicile", price: 550, note: "Livraison rapide domicile" }
  ]},
  { code: "32", name: "El Bayadh", nameAr: "البيض", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau El Bayadh" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR El Bayadh" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "33", name: "Illizi", nameAr: "إليزي", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 800, note: "Bureau Illizi" },
    { provider: "Yalidine Express", type: "À domicile", price: 1300, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 750, note: "Point Relais ZR Illizi" },
    { provider: "ZR Express", type: "À domicile", price: 1250, note: "Livraison domicile" }
  ]},
  { code: "34", name: "Bordj Bou Arréridj", nameAr: "برج بوعريريج", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Bordj" },
    { provider: "Yalidine Express", type: "À domicile", price: 700, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR Bordj" },
    { provider: "ZR Express", type: "À domicile", price: 650, note: "Livraison domicile" }
  ]},
  { code: "35", name: "Boumerdès", nameAr: "بومرداس", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureau Boumerdès" },
    { provider: "Yalidine Express", type: "À domicile", price: 600, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Boumerdès" },
    { provider: "ZR Express", type: "À domicile", price: 550, note: "Livraison domicile" }
  ]},
  { code: "36", name: "El Tarf", nameAr: "الطارف", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau El Tarf" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR El Tarf" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "37", name: "Tindouf", nameAr: "تندوف", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 800, note: "Bureau Tindouf" },
    { provider: "Yalidine Express", type: "À domicile", price: 1300, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 750, note: "Point Relais ZR Tindouf" },
    { provider: "ZR Express", type: "À domicile", price: 1250, note: "Livraison domicile" }
  ]},
  { code: "38", name: "Tissemsilt", nameAr: "تيسمسيلت", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureau Tissemsilt" },
    { provider: "Yalidine Express", type: "À domicile", price: 600, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Tissemsilt" },
    { provider: "ZR Express", type: "À domicile", price: 550, note: "Livraison domicile" }
  ]},
  { code: "39", name: "El Oued", nameAr: "الوادي", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau El Oued" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR El Oued" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "40", name: "Khenchela", nameAr: "خنشلة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Khenchela" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR Khenchela" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "41", name: "Souk Ahras", nameAr: "سوق أهراس", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Souk Ahras" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR Souk Ahras" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "42", name: "Tipaza", nameAr: "تيبازة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 350, note: "Bureau Tipaza" },
    { provider: "Yalidine Express", type: "À domicile", price: 550, note: "Livraison express" },
    { provider: "ZR Express", type: "Au bureau", price: 300, note: "Point Relais ZR Tipaza" },
    { provider: "ZR Express", type: "À domicile", price: 500, note: "Livraison domicile" }
  ]},
  { code: "43", name: "Mila", nameAr: "ميلة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 450, note: "Bureau Mila" },
    { provider: "Yalidine Express", type: "À domicile", price: 750, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 400, note: "Point Relais ZR Mila" },
    { provider: "ZR Express", type: "À domicile", price: 700, note: "Livraison domicile" }
  ]},
  { code: "44", name: "Aïn Defla", nameAr: "عين الدفلى", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 300, note: "Bureau Aïn Defla" },
    { provider: "Yalidine Express", type: "À domicile", price: 500, note: "Livraison rapide 24h" },
    { provider: "ZR Express", type: "Au bureau", price: 250, note: "Point Relais ZR Aïn Defla" },
    { provider: "ZR Express", type: "À domicile", price: 450, note: "Livraison domicile" }
  ]},
  { code: "45", name: "Naâma", nameAr: "النعامة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Naâma / Mécheria" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR Naâma" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "46", name: "Aïn Témouchent", nameAr: "عين تموشنت", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 400, note: "Bureau Aïn Témouchent" },
    { provider: "Yalidine Express", type: "À domicile", price: 650, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 350, note: "Point Relais ZR Témouchent" },
    { provider: "ZR Express", type: "À domicile", price: 600, note: "Livraison domicile" }
  ]},
  { code: "47", name: "Ghardaïa", nameAr: "غرداية", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Ghardaïa" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR Ghardaïa" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "48", name: "Relizane", nameAr: "غليزان", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 300, note: "Bureau Relizane" },
    { provider: "Yalidine Express", type: "À domicile", price: 500, note: "Livraison rapide 24h" },
    { provider: "ZR Express", type: "Au bureau", price: 250, note: "Point Relais ZR Relizane" },
    { provider: "ZR Express", type: "À domicile", price: 450, note: "Livraison domicile" }
  ]},
  { code: "49", name: "El M'Ghair", nameAr: "المغير", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 600, note: "Bureau El M'Ghair" },
    { provider: "Yalidine Express", type: "À domicile", price: 900, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 550, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 850, note: "Livraison domicile" }
  ]},
  { code: "50", name: "El Meniaa", nameAr: "المنيعة", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 600, note: "Bureau El Meniaa" },
    { provider: "Yalidine Express", type: "À domicile", price: 950, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 550, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 900, note: "Livraison domicile" }
  ]},
  { code: "51", name: "Ouled Djellal", nameAr: "أولاد جلال", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Ouled Djellal" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "52", name: "Bordj Baji Mokhtar", nameAr: "برج باجي مختار", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 900, note: "Bureau Bordj Baji Mokhtar" },
    { provider: "Yalidine Express", type: "À domicile", price: 1400, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 850, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 1350, note: "Livraison domicile" }
  ]},
  { code: "53", name: "Béni Abbès", nameAr: "بني عباس", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 650, note: "Bureau Béni Abbès" },
    { provider: "Yalidine Express", type: "À domicile", price: 1000, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 600, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 950, note: "Livraison domicile" }
  ]},
  { code: "54", name: "Timimoun", nameAr: "تيميمون", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 650, note: "Bureau Timimoun" },
    { provider: "Yalidine Express", type: "À domicile", price: 1000, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 600, note: "Point Relais ZR" },
    { provider: "ZR Express", type: "À domicile", price: 950, note: "Livraison domicile" }
  ]},
  { code: "55", name: "Touggourt", nameAr: "تقرت", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 550, note: "Bureau Touggourt" },
    { provider: "Yalidine Express", type: "À domicile", price: 850, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 500, note: "Point Relais ZR Touggourt" },
    { provider: "ZR Express", type: "À domicile", price: 800, note: "Livraison domicile" }
  ]},
  { code: "56", name: "Djanet", nameAr: "جانت", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 900, note: "Bureau Djanet" },
    { provider: "Yalidine Express", type: "À domicile", price: 1400, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 850, note: "Point Relais ZR Djanet" },
    { provider: "ZR Express", type: "À domicile", price: 1350, note: "Livraison domicile" }
  ]},
  { code: "57", name: "In Salah", nameAr: "عين صالح", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 800, note: "Bureau In Salah" },
    { provider: "Yalidine Express", type: "À domicile", price: 1300, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 750, note: "Point Relais ZR In Salah" },
    { provider: "ZR Express", type: "À domicile", price: 1250, note: "Livraison domicile" }
  ]},
  { code: "58", name: "In Guezzam", nameAr: "عين قزام", options: [
    { provider: "Yalidine Express", type: "Au bureau", price: 950, note: "Bureau In Guezzam" },
    { provider: "Yalidine Express", type: "À domicile", price: 1500, note: "Livraison à domicile" },
    { provider: "ZR Express", type: "Au bureau", price: 900, note: "Point Relais ZR In Guezzam" },
    { provider: "ZR Express", type: "À domicile", price: 1450, note: "Livraison domicile" }
  ]}
];
