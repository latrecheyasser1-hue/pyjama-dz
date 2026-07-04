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
      clientName: "Test Name 2",
      phone: "0555555555",
      wilaya: "Alger",
      commune: "Alger Centre",
      deliveryMode: "domicile",
      product: "Test Product (x1)",
      items: [{productId: "test", product: "Test Product", qty: 1, price: 2500}],
      price: 2500,
      status: "nouvelle",
      archived: false,
      date: "À l'instant"
  };
  const { data, error } = await supabase.from('orders').insert(newOrder).select().single();
  console.log("INSERT RESULT:", { error, data });
}
test();
