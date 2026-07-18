import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


async function check() {
  const { data, error } = await supabase.from('orders').insert({
    clientName: 'Test',
    phone: '123',
    wilaya: 'Test',
    commune: 'Test',
    deliveryMode: 'Test',
    product: 'Test',
    price: 100,
    quantity: 1,
    status: 'nouvelle',
    archived: true
  }).select();
  console.log('Error:', error);
  console.log('Data:', data);
  if (data) {
     await supabase.from('orders').delete().eq('id', data[0].id);
  }
}

check();
