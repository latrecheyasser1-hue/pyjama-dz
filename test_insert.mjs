import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file for credentials
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let supabaseUrl = '';
let supabaseAnonKey = '';

for (const line of envLines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const newOrder = {
    clientName: "Test Name",
    phone: "0555555555",
    wilaya: "Alger",
    commune: "Alger Centre",
    deliveryMode: "Livraison Domicile",
    product: "Test Product (x1)",
    price: 1500,
    status: "nouvelle",
    archived: false,
    date: new Date().toISOString(),
    items: [
      {
        productId: "test-id",
        product: "Test Product",
        color: "Standard",
        size: "M",
        qty: 1,
        price: 1500
      }
    ]
  };

  console.log("Attempting to insert order...");
  const { data, error } = await supabase.from('orders').insert(newOrder).select().single();
  
  if (error) {
    console.error("INSERT ERROR:", JSON.stringify(error));
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}

testInsert();
