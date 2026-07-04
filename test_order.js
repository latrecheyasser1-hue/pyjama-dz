import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  const newOrder = {
    clientName: 'Test',
    phone: '05555555',
    wilaya: 'Alger',
    commune: 'Bab Ezzouar',
    deliveryMode: 'Livraison',
    product: 'Test (x1)',
    items: [{ productId: '1', qty: 1 }],
    price: 1000,
    status: 'nouvelle',
    archived: false,
    date: 'A l\'instant'
  };

  const { data, error } = await supabase.from('orders').insert(newOrder).select();
  if (error) {
    console.log("INSERT ERROR:", JSON.stringify(error, null, 2));
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}

testInsert();
