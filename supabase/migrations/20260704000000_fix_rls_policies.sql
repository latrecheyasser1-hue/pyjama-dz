-- Secure RLS Policies Hardening (Zero Trust / Least Privilege)

-- 1. Enable RLS on all sensitive tables
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;

-- 2. PRODUCTS: Public can read active catalog products; modifications restricted to admin/service_role
DROP POLICY IF EXISTS "Public can do all on products" ON products;
DROP POLICY IF EXISTS "Authenticated users can do all on products" ON products;
DROP POLICY IF EXISTS "Allow public read access on products" ON products;
CREATE POLICY "Allow public read access on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow admin service full access on products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. ORDERS: Public storefront can only INSERT new orders; reading/updating/deleting restricted to admin/service_role
DROP POLICY IF EXISTS "Public can do all on orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can do all on orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert on orders" ON orders;
CREATE POLICY "Allow public insert on orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin service full access on orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. SETTINGS: Public can only read public store configuration; writing restricted to admin/service_role
DROP POLICY IF EXISTS "Public can do all on settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can do all on settings" ON settings;
DROP POLICY IF EXISTS "Allow public read non-secret settings" ON settings;
CREATE POLICY "Allow public read non-secret settings" ON settings FOR SELECT USING (
  key NOT IN (
    'meta_access_token',
    'yalidine_api_token',
    'yalidine_api_id',
    'zr_express_api_key',
    'zr_express_token',
    'groq_api_key',
    'cloudflare_r2_secret_access_key',
    'cashierPin',
    'embalagePin',
    'emballagePin'
  )
);
CREATE POLICY "Allow admin service full access on settings" ON settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. SUPPLIERS & EXPENSES: Strictly private - zero public access
DROP POLICY IF EXISTS "Public can do all on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can do all on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Public can do all on expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can do all on expenses" ON expenses;
CREATE POLICY "Allow admin service full access on suppliers" ON suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin service full access on expenses" ON expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
