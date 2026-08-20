import fs from 'fs';
import path from 'path';

const NEW_URL = 'https://tdhxdnmjmnfjkictdzpk.supabase.co';
const OLD_URL = 'https://qnbwyblbxtwubmuejwtp.supabase.co';

const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkaHhkbm1qbW5mamtpY3RkenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIxMDAsImV4cCI6MjEwMjc5ODEwMH0.K3moWEWjE5cvBmFwaGyPspx_yIixii9tY136DgpCZ3g';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';

const files = [
  'src/lib/supabaseClient.js',
  'index.html',
  'src/migrate_data.js',
  'src/components/Storefront.jsx',
  'api/notify-restock.js',
  'api/product-image.js',
  'api/send-order-whatsapp.js',
  'api/send-reclamation-whatsapp.js',
  'api/send-otp-whatsapp.js',
  'api/track-shipments.js',
  'api/process-delayed-confirmations.js',
  'api/cron-notifications.js',
  'api/check-low-stock.js',
  'api/webhook.js'
];

for (const rel of files) {
  const full = path.join(process.cwd(), rel);
  if (fs.existsSync(full)) {
    let content = fs.readFileSync(full, 'utf8');
    content = content.replaceAll(NEW_URL, OLD_URL);
    content = content.replaceAll(NEW_KEY, OLD_KEY);
    fs.writeFileSync(full, content, 'utf8');
    console.log(`Reverted: ${rel}`);
  }
}






