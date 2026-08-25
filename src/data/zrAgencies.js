// Official ZR Express Hubs & Agencies list (Grouped by Wilaya Code)
export const ZR_AGENCIES = {
  "10": [
    {
      "id": "bed0e06d-d4af-4fa4-809e-0bc8d0ff9213",
      "name": "Hub Bouira 10 مكتب البويرة",
      "street": "Cité 338 Logements",
      "city": "Bouira",
      "cityTerritoryId": "a1f0229c-4f34-40aa-9238-fadde6757cba",
      "districtTerritoryId": "200547e7-e8f0-44e0-8953-cd89cbd76ca9",
      "phone": "+213550372615",
      "isPickupPoint": true
    }
  ],
  "13": [
    {
      "id": "d17c6a44-c53c-4c2e-a489-219b1212aecd",
      "name": "Tri Tlemcen 13 مركز فرز تلمسان",
      "street": "Mansourah",
      "city": "Tlemcen",
      "cityTerritoryId": "53c9e062-9c4e-4c77-8b71-55eabf887f83",
      "districtTerritoryId": "cd4baaa2-fd46-4e1d-94b6-50ac300441e1",
      "phone": "+213770396954",
      "isPickupPoint": false
    }
  ],
  "16": [
    {
      "id": "774f0116-43a5-4dc5-a878-11b8b4eb1380",
      "name": "Hub Birkhadem 16 مكتب بئرخادم",
      "street": "Gué de Constantine",
      "city": "Alger",
      "cityTerritoryId": "d134c182-7dac-4655-9d9b-bbdb62aa2ec4",
      "districtTerritoryId": "85fa42cc-3d00-4984-8da9-b192351a8ee1",
      "phone": "+213770601836",
      "isPickupPoint": true
    }
  ],
  "18": [
    {
      "id": "376ea7e4-a89c-4ebb-96d4-0e0720244b4a",
      "name": "Hub Taher 18 مكتب الطاهير",
      "street": "Boukaabour",
      "city": "Jijel",
      "cityTerritoryId": "dc851e52-55b2-4beb-a7f1-79d4e73e9458",
      "districtTerritoryId": "e1dd5ed6-4a25-4cce-80e9-70a1fa705cfd",
      "phone": "+213770367618",
      "isPickupPoint": true
    }
  ],
  "19": [
    {
      "id": "456252e7-2937-423f-81a9-250bf42a7c8c",
      "name": "Hub El Eulma 19 مكتب العلمة",
      "street": "Logements participatif LSP",
      "city": "Setif",
      "cityTerritoryId": "56ee938d-7887-408e-8731-364d07ad3594",
      "districtTerritoryId": "62762808-0c86-4c6a-a605-146a6d124fa3",
      "phone": "+213770788097",
      "isPickupPoint": true
    }
  ],
  "20": [
    {
      "id": "dfdd69b1-9209-4c22-a451-0fcfa12afade",
      "name": "Hub Saida 20 مكتب سعيدة",
      "street": "Cité 5 Juillet",
      "city": "Saida",
      "cityTerritoryId": "27b2042a-77f8-4c91-b62d-60934fa0daca",
      "districtTerritoryId": "96f2733c-a1ac-40d7-9c64-21258d5ec29a",
      "phone": "+213795271265",
      "isPickupPoint": true
    }
  ],
  "24": [
    {
      "id": "2f6c55b5-c104-43cf-a334-230a5f798ab1",
      "name": "Hub Guelma 24 مكتب قالمة",
      "street": "Hassani Mohamed",
      "city": "Guelma",
      "cityTerritoryId": "2d1e61ff-e2af-4b4d-a592-0a6436c5fffd",
      "districtTerritoryId": "97529486-399a-4020-834e-510eb0b4b905",
      "phone": "+213791482266",
      "isPickupPoint": true
    }
  ],
  "35": [
    {
      "id": "77c20585-fc73-44f7-91bc-11f11e4a3689",
      "name": "Hub DELLYS 35 مكتب دلس",
      "street": "Dellys",
      "city": "Boumerdes",
      "cityTerritoryId": "f823492c-f79d-4c2d-befe-933bf9917a65",
      "districtTerritoryId": "6eb90e5f-bbf6-4ca4-a6d9-b3ea8bb3552a",
      "phone": "+213551904529",
      "isPickupPoint": true
    }
  ],
  "39": [
    {
      "id": "77aea009-96a2-4a42-b786-01b208a20294",
      "name": "Hub El Oued 39 مكتب الوادي",
      "street": "حي سيدي عبد الله, El Oued",
      "city": "El Oued",
      "cityTerritoryId": "cd82549a-b1f7-48c1-9a25-2f3f05b80b1d",
      "districtTerritoryId": "25551e68-ea40-4df7-9630-7ace25b29fba",
      "phone": "+213791699902",
      "isPickupPoint": true
    }
  ],
  "01": [
    {
      "id": "ee77ffe4-19bf-4e34-9435-01a4b7670b7a",
      "name": "Hub Adrar 01 مكتب أدرار",
      "street": "Cité 140 Logements",
      "city": "Adrar",
      "cityTerritoryId": "6e978fc5-f20a-4b5f-9adf-61dd21a7672a",
      "districtTerritoryId": "b9170873-bebd-40d2-98fb-96a5ace84aba",
      "phone": "+213661110053",
      "isPickupPoint": true
    }
  ]
};

export function getZRAgenciesForWilaya(wilayaInput) {
  if (!wilayaInput) return [];
  const codeMatch = String(wilayaInput).match(/^(\d{2})/);
  const code = codeMatch ? codeMatch[1] : "16";
  return ZR_AGENCIES[code] || [];
}
