import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const newOrder = {
    clientName: "Test Type",
    phone: "0555555555",
    wilaya: "Alger",
    commune: "Alger Centre",
    deliveryMode: "Livraison",
    product: "Test",
    price: 1500,
    status: "nouvelle",
    productId: "this-is-a-string"
  };
  const { data, error } = await supabase.from('orders').insert(newOrder).select().single();
  console.log("RESULT:", error || "Success");
}
test();
