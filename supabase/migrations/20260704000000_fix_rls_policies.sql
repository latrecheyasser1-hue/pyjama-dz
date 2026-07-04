-- Fix RLS policies to allow public (anon key) CRUD since admin uses local PIN authentication
DROP POLICY IF EXISTS "Authenticated users can do all on settings" ON settings;
CREATE POLICY "Public can do all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can do all on products" ON products;
CREATE POLICY "Public can do all on products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can do all on orders" ON orders;
CREATE POLICY "Public can do all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can do all on suppliers" ON suppliers;
CREATE POLICY "Public can do all on suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can do all on expenses" ON expenses;
CREATE POLICY "Public can do all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
