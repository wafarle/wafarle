/*
  # إنشاء نظام إدارة الاشتراكات الكامل

  1. الجداول الجديدة
    - `customers` - جدول العملاء
    - `products` - جدول المنتجات  
    - `pricing_tiers` - جدول خطط التسعير
    - `subscriptions` - جدول الاشتراكات
    - `invoices` - جدول الفواتير

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - إضافة سياسات للقراءة والكتابة للمستخدمين العموميين

  3. البيانات التجريبية
    - إضافة منتجات وخطط تسعير واقعية
    - إضافة عملاء تجريبيين
*/

-- إنشاء دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON customers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON customers
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Enable delete for all users"
  ON customers
  FOR DELETE
  TO public
  USING (true);

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- جدول المنتجات
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  icon text DEFAULT 'Package',
  color text DEFAULT 'from-blue-500 to-purple-500',
  is_popular boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON products
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON products
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Enable delete for all users"
  ON products
  FOR DELETE
  TO public
  USING (true);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- جدول خطط التسعير
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_months integer NOT NULL,
  price numeric(10,2) NOT NULL,
  original_price numeric(10,2),
  discount_percentage integer,
  features jsonb DEFAULT '[]'::jsonb,
  is_recommended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON pricing_tiers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON pricing_tiers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON pricing_tiers
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Enable delete for all users"
  ON pricing_tiers
  FOR DELETE
  TO public
  USING (true);

CREATE TRIGGER update_pricing_tiers_updated_at
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- جدول الاشتراكات
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  pricing_tier_id uuid REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON subscriptions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON subscriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON subscriptions
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Enable delete for all users"
  ON subscriptions
  FOR DELETE
  TO public
  USING (true);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- جدول الفواتير
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  issue_date date DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON invoices
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON invoices
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON invoices
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Enable delete for all users"
  ON invoices
  FOR DELETE
  TO public
  USING (true);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إدراج البيانات التجريبية

-- إدراج المنتجات
INSERT INTO products (name, description, category, features, icon, color, is_popular) VALUES
('Microsoft Office 365', 'مجموعة أدوات المكتب الشاملة من مايكروسوفت', 'إنتاجية', 
 '["Word, Excel, PowerPoint", "OneDrive 1TB", "Teams", "Outlook", "دعم فني 24/7"]'::jsonb, 
 'FileText', 'from-blue-600 to-blue-800', true),

('Adobe Creative Cloud', 'مجموعة أدوات التصميم الإبداعي الاحترافية', 'تصميم', 
 '["Photoshop", "Illustrator", "InDesign", "Premiere Pro", "After Effects", "100GB تخزين سحابي"]'::jsonb, 
 'Palette', 'from-red-500 to-pink-600', true),

('ChatGPT Plus', 'مساعد الذكاء الاصطناعي المتقدم للمحادثات والكتابة', 'ذكاء اصطناعي', 
 '["وصول أولوية", "استجابة أسرع", "ميزات حصرية", "GPT-4", "دعم الصور"]'::jsonb, 
 'MessageSquare', 'from-green-500 to-emerald-600', false),

('Spotify Premium', 'خدمة الموسيقى والبودكاست بجودة عالية', 'ترفيه', 
 '["موسيقى بلا إعلانات", "جودة عالية", "تحميل للاستماع بلا إنترنت", "تخطي غير محدود"]'::jsonb, 
 'Music', 'from-green-400 to-green-600', false),

('Netflix Premium', 'منصة المحتوى المرئي الرائدة عالمياً', 'ترفيه', 
 '["4K Ultra HD", "مشاهدة على 4 أجهزة", "تحميل المحتوى", "محتوى حصري"]'::jsonb, 
 'Play', 'from-red-600 to-red-800', false),

('Canva Pro', 'أداة التصميم السهلة للجميع', 'تصميم', 
 '["قوالب احترافية", "خلفيات شفافة", "تغيير حجم تلقائي", "100GB تخزين", "فريق العمل"]'::jsonb, 
 'Image', 'from-purple-500 to-indigo-600', false);

-- إدراج خطط التسعير
INSERT INTO pricing_tiers (product_id, name, duration_months, price, original_price, discount_percentage, features, is_recommended) 
SELECT 
  p.id,
  'خطة شهرية',
  1,
  CASE 
    WHEN p.name = 'Microsoft Office 365' THEN 45.00
    WHEN p.name = 'Adobe Creative Cloud' THEN 89.00
    WHEN p.name = 'ChatGPT Plus' THEN 75.00
    WHEN p.name = 'Spotify Premium' THEN 19.99
    WHEN p.name = 'Netflix Premium' THEN 56.00
    WHEN p.name = 'Canva Pro' THEN 45.00
  END,
  NULL,
  NULL,
  '["فوترة شهرية", "إلغاء في أي وقت", "دعم فني"]'::jsonb,
  false
FROM products p;

INSERT INTO pricing_tiers (product_id, name, duration_months, price, original_price, discount_percentage, features, is_recommended) 
SELECT 
  p.id,
  'خطة سنوية',
  12,
  CASE 
    WHEN p.name = 'Microsoft Office 365' THEN 450.00
    WHEN p.name = 'Adobe Creative Cloud' THEN 890.00
    WHEN p.name = 'ChatGPT Plus' THEN 750.00
    WHEN p.name = 'Spotify Premium' THEN 199.99
    WHEN p.name = 'Netflix Premium' THEN 560.00
    WHEN p.name = 'Canva Pro' THEN 450.00
  END,
  CASE 
    WHEN p.name = 'Microsoft Office 365' THEN 540.00
    WHEN p.name = 'Adobe Creative Cloud' THEN 1068.00
    WHEN p.name = 'ChatGPT Plus' THEN 900.00
    WHEN p.name = 'Spotify Premium' THEN 239.88
    WHEN p.name = 'Netflix Premium' THEN 672.00
    WHEN p.name = 'Canva Pro' THEN 540.00
  END,
  17,
  '["وفر 17%", "فوترة سنوية", "دعم أولوية", "ميزات إضافية"]'::jsonb,
  true
FROM products p;

-- إدراج عملاء تجريبيين
INSERT INTO customers (name, email, phone, address) VALUES
('أحمد محمد علي', 'ahmed.ali@email.com', '+966501234567', 'الرياض، المملكة العربية السعودية'),
('فاطمة أحمد', 'fatima.ahmed@email.com', '+966509876543', 'جدة، المملكة العربية السعودية'),
('محمد عبدالله', 'mohammed.abdullah@email.com', '+966512345678', 'الدمام، المملكة العربية السعودية'),
('نورا سالم', 'nora.salem@email.com', '+966598765432', 'مكة المكرمة، المملكة العربية السعودية'),
('خالد الأحمد', 'khalid.ahmed@email.com', '+966587654321', 'المدينة المنورة، المملكة العربية السعودية');

-- إدراج اشتراكات تجريبية
INSERT INTO subscriptions (customer_id, pricing_tier_id, start_date, end_date, status)
SELECT 
  c.id,
  pt.id,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '11 months',
  'active'
FROM customers c
CROSS JOIN pricing_tiers pt
JOIN products p ON pt.product_id = p.id
WHERE c.name = 'أحمد محمد علي' AND p.name = 'Microsoft Office 365' AND pt.name = 'خطة سنوية'
LIMIT 1;

INSERT INTO subscriptions (customer_id, pricing_tier_id, start_date, end_date, status)
SELECT 
  c.id,
  pt.id,
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '15 days',
  'active'
FROM customers c
CROSS JOIN pricing_tiers pt
JOIN products p ON pt.product_id = p.id
WHERE c.name = 'فاطمة أحمد' AND p.name = 'Adobe Creative Cloud' AND pt.name = 'خطة شهرية'
LIMIT 1;

-- إدراج فواتير تجريبية
INSERT INTO invoices (subscription_id, customer_id, amount, status, issue_date, due_date)
SELECT 
  s.id,
  s.customer_id,
  pt.price,
  'paid',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE - INTERVAL '20 days'
FROM subscriptions s
JOIN pricing_tiers pt ON s.pricing_tier_id = pt.id
JOIN customers c ON s.customer_id = c.id
WHERE c.name = 'أحمد محمد علي'
LIMIT 1;

INSERT INTO invoices (subscription_id, customer_id, amount, status, issue_date, due_date)
SELECT 
  s.id,
  s.customer_id,
  pt.price,
  'pending',
  CURRENT_DATE - INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '25 days'
FROM subscriptions s
JOIN pricing_tiers pt ON s.pricing_tier_id = pt.id
JOIN customers c ON s.customer_id = c.id
WHERE c.name = 'فاطمة أحمد'
LIMIT 1;

-- إدراج فواتير إضافية لليوم الحالي والأمس
INSERT INTO invoices (subscription_id, customer_id, amount, status, issue_date, due_date, paid_date, created_at) VALUES
((SELECT s.id FROM subscriptions s JOIN customers c ON s.customer_id = c.id WHERE c.name = 'أحمد محمد علي' LIMIT 1),
 (SELECT id FROM customers WHERE name = 'أحمد محمد علي' LIMIT 1),
 450.00, 'paid', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE, CURRENT_DATE),

((SELECT s.id FROM subscriptions s JOIN customers c ON s.customer_id = c.id WHERE c.name = 'فاطمة أحمد' LIMIT 1),
 (SELECT id FROM customers WHERE name = 'فاطمة أحمد' LIMIT 1),
 89.00, 'paid', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE, CURRENT_DATE),

((SELECT s.id FROM subscriptions s JOIN customers c ON s.customer_id = c.id WHERE c.name = 'محمد عبدالله' LIMIT 1),
 (SELECT id FROM customers WHERE name = 'محمد عبدالله' LIMIT 1),
 178.00, 'paid', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '29 days', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day'),

((SELECT s.id FROM subscriptions s JOIN customers c ON s.customer_id = c.id WHERE c.name = 'نورا سالم' LIMIT 1),
 (SELECT id FROM customers WHERE name = 'نورا سالم' LIMIT 1),
 150.00, 'paid', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '29 days', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day');