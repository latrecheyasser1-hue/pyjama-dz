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
  const { data: prods } = await supabase.from('products').select('*').limit(1);
  if (!prods || prods.length === 0) { console.log("No products"); return; }
  
  const p = prods[0];
  const { data, error } = await supabase.from('products').update({ stock: p.stock }).eq('id', p.id);
  console.log("UPDATE PRODUCT RESULT:", error || "Success");
}
test();
