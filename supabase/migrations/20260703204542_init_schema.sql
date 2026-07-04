CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  "purchasePrice" numeric,
  price numeric,
  "oldPrice" numeric,
  supplier text,
  images jsonb DEFAULT '[]'::jsonb,
  barcode text,
  description text,
  "colorVariants" jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientName" text,
  phone text,
  wilaya text,
  commune text,
  "deliveryMode" text,
  product jsonb,
  price numeric,
  quantity integer,
  status text DEFAULT 'En Attente',
  archived boolean DEFAULT false,
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text,
  amount numeric,
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Public can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Authenticated users can do all on products" ON products FOR ALL USING (auth.role() = 'authenticated');

-- Policies for orders
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can do all on orders" ON orders FOR ALL USING (auth.role() = 'authenticated');

-- Policies for others
CREATE POLICY "Authenticated users can do all on suppliers" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do all on expenses" ON expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do all on settings" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- RPC to allow public to update product stock when placing an order
CREATE OR REPLACE FUNCTION update_product_variants(p_id uuid, new_variants jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products SET "colorVariants" = new_variants WHERE id = p_id;
$$;
