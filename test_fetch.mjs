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

  const response = await fetch('https://qnbwyblbxtwubmuejwtp.supabase.co/rest/v1/orders', {
    method: 'POST',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnd5YmxieHR3dWJtdWVqd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDEwMDUsImV4cCI6MjA5ODY3NzAwNX0.CyhfuvI0IW1hxwDEkcih54uIH6T2kSU1pH_OPOz7Eoo',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(newOrder)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("INSERT ERROR:", errorText);
  } else {
    const data = await response.json();
    console.log("INSERT SUCCESS:", data);
  }
}

testInsert();
