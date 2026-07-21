import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually to avoid depending on 'dotenv' package
function loadEnv() {
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const envData = fs.readFileSync(envPath, 'utf8');
      envData.split('\n').forEach(line => {
        const cleanLine = line.replace(/\r/g, '');
        const match = cleanLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
        }
      });
    }
  } catch (e) {
    console.warn('Could not load .env file');
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const META_WHATSAPP_TOKEN = process.env.META_WHATSAPP_TOKEN || 'YOUR_META_TOKEN';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runHotSaleBot() {
  try {
    console.log('🤖 Starting Hot Sale & WhatsApp Bot...');

    // 1. Calculate Top 10 products from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('items')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (ordersError) throw ordersError;

    const productSales = {};
    orders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.productId) {
            productSales[item.productId] = (productSales[item.productId] || 0) + (item.qty || 1);
          }
        });
      }
    });

    const top10ProductIds = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);

    console.log(`🔥 Found ${top10ProductIds.length} trending products from the last 7 days!`);

    if (top10ProductIds.length > 0) {
      // Save to 'settings' table instead of 'products' table to avoid schema changes
      const { data: existingSetting } = await supabase.from('settings').select('*').eq('key', 'hot_sale_products').single();
      
      const valStr = JSON.stringify(top10ProductIds);
      if (existingSetting) {
        await supabase.from('settings').update({ value: valStr }).eq('key', 'hot_sale_products');
      } else {
        await supabase.from('settings').insert({ key: 'hot_sale_products', value: valStr });
      }
      
      console.log('✅ Updated settings table with Hot Sale products.');
    }

    // 2. Fetch all unique clients
    const { data: clientsOrders } = await supabase.from('orders').select('phone, clientName');
    const { data: clientsWaitlist } = await supabase.from('waitlist').select('whatsapp_number, client_name');

    const uniqueClients = new Map();
    
    if (clientsOrders) {
      clientsOrders.forEach(c => {
        if (c.phone && c.phone.length >= 9) uniqueClients.set(c.phone, c.clientName);
      });
    }
    if (clientsWaitlist) {
      clientsWaitlist.forEach(c => {
        if (c.whatsapp_number && c.whatsapp_number.length >= 9) uniqueClients.set(c.whatsapp_number, c.client_name);
      });
    }

    console.log(`📱 Found ${uniqueClients.size} unique clients to message.`);

    // 3. Send WhatsApp Messages
    if (META_WHATSAPP_TOKEN === 'YOUR_META_TOKEN') {
      console.log('⚠️ Meta WhatsApp Token is missing! Skipping messaging.');
      console.log('👉 Please add META_WHATSAPP_TOKEN and META_PHONE_NUMBER_ID to your .env file to enable messaging.');
      return;
    }

    let successCount = 0;
    for (const [phone, name] of uniqueClients.entries()) {
      // Format phone (e.g., 077... -> 21377...)
      let formattedPhone = phone.replace(/\s/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '213' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('213')) {
        formattedPhone = '213' + formattedPhone;
      }

      // We are using a Meta WhatsApp Template.
      // Make sure you create a template named 'hot_sale_weekly' in your Meta Dashboard.
      const messageBody = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: "hot_sale_weekly",
          language: { code: "ar" }
        }
      };

      try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${META_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${META_WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageBody)
        });
        
        if (response.ok) {
          successCount++;
        } else {
          const errData = await response.json();
          console.error(`Failed to send to ${formattedPhone}`, errData.error.message);
        }
      } catch (err) {
        console.error(`Failed to send to ${formattedPhone}`, err.message);
      }
    }

    console.log(`✅ Successfully sent WhatsApp messages to ${successCount} clients!`);

  } catch (error) {
    console.error('❌ Error running Hot Sale Bot:', error);
  }
}

runHotSaleBot();
