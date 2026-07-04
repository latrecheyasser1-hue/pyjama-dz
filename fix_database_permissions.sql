-- ====================================================================
-- إصلاح تصاريح وحماية قاعدة البيانات (Supabase RLS Fix)
-- ====================================================================
-- السبب: النظام كان مبرمجاً بالسماح فقط للمستخدمين المسجلين عبر Supabase Auth (Authenticated)
-- بتعديل الإعدادات والمنتجات والطلبيات. وبما أن لوحة التحكم تعمل برمز PIN محلي،
-- فإن قاعدة البيانات كانت ترفض جميع التعديلات بصمت وترجع البيانات القديمة عند التحديث.
--
-- طريقة الحل: انسخ هذا الكود بالكامل، وضعه في الـ SQL Editor في حسابك على Supabase واضغط Run.
-- ====================================================================

-- 1. السماح بحفظ وتعديل الإعدادات (Settings)
DROP POLICY IF EXISTS "Authenticated users can do all on settings" ON settings;
CREATE POLICY "Public can do all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- 2. السماح بتعديل وإضافة المنتجات والمخزون (Products)
DROP POLICY IF EXISTS "Authenticated users can do all on products" ON products;
CREATE POLICY "Public can do all on products" ON products FOR ALL USING (true) WITH CHECK (true);

-- 3. السماح بتحديث حالات الطلبيات وحذفها (Orders)
DROP POLICY IF EXISTS "Authenticated users can do all on orders" ON orders;
CREATE POLICY "Public can do all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- 4. السماح بإدارة الموردين (Suppliers)
DROP POLICY IF EXISTS "Authenticated users can do all on suppliers" ON suppliers;
CREATE POLICY "Public can do all on suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- 5. السماح بإدارة المصاريف (Expenses)
DROP POLICY IF EXISTS "Authenticated users can do all on expenses" ON expenses;
CREATE POLICY "Public can do all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
