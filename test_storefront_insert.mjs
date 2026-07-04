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
      id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: "Test 3",
      phone: "05555555",
      wilaya: "Alger",
      commune: "Alger",
      deliveryMode: "domicile",
      product: "Test Prod (x1)",
      items: [{ productId: "test", product: "Test Prod", qty: 1, price: 100 }],
      price: 100,
      status: "nouvelle",
      archived: false
    };

    const { id, ...orderWithoutId } = newOrder;
    const { data: insertedOrder, error } = await supabase.from('orders').insert(orderWithoutId).select().single();
    
    console.log("INSERT RESULT:", { error, insertedOrder });
}
test();
