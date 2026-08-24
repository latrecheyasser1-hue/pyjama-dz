import fs from 'fs';
import path from 'path';

const OLD_URL = 'https://qnbwyblbxtwubmuejwtp.supabase.co';
const NEW_URL = 'https://lrepmdrzpgvctssywjsn.supabase.co';

const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZXBtZHJ6cGd2Y3Rzc3l3anNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTE4OTAsImV4cCI6MjEwMzE2Nzg5MH0.lzHxSmKiVHytt8-Rvr0uKEbtYVb0rylGcnViiXSFQjc';

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
    content = content.replaceAll(OLD_URL, NEW_URL);
    content = content.replaceAll(OLD_KEY, NEW_KEY);
    fs.writeFileSync(full, content, 'utf8');
    console.log(`Switched to new DB: ${rel}`);
  }
}





