import { createClient } from '@supabase/supabase-js';
import { INITIAL_PRODUCTS, INITIAL_SUPPLIERS, INITIAL_EXPENSES } from './src/data/mockData.js';

const NEW_SUPABASE_URL = 'https://tdhxdnmjmnfjkictdzpk.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaHhkbm1qbW5mamtpY3RkenBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIyMjEwMCwiZXhwIjoyMTAyNzk4MTAwfQ.2RWEeSVfxF8MOVF8KYg5pZYl1tsWTp4MJR_-rBwaoJM';

const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY);

async function testCustomerAuth() {
  const phone = '0771335039';
  const password = 'mypassword123';
  const fullName = 'ياسر لطرش';

  console.log('Testing customer insert in customers table...');
  const { data: reg, error: regErr } = await supabase.from('customers').upsert({
    id: 'cust_' + Date.now(),
    full_name: fullName,
    phone: phone,
    password_hash: password,
    wilaya: '16 - الجزائر',
    commune: 'باب الزوار'
  });
  console.log('REGISTRATION RESULT:', { reg, regErr });

  console.log('Testing customer login query...');
  const { data: user, error: logErr } = await supabase.from('customers').select('*').eq('phone', phone).single();
  console.log('LOGIN RESULT:', { user, logErr });
}

testCustomerAuth();




