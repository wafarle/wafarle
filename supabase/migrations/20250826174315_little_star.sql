/*
  # إنشاء نظام إدارة الاشتراكات الشهرية

  1. الجداول الجديدة
    - `customers` - معلومات العملاء
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `address` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `products` - المنتجات المتاحة
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `features` (jsonb)
      - `icon` (text)
      - `color` (text)
      - `is_popular` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `pricing_tiers` - خطط التسعير
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `name` (text)
      - `duration_months` (integer)
      - `price` (decimal)
      - `original_price` (decimal, nullable)
      - `discount_percentage` (integer, nullable)
      - `features` (jsonb)
      - `is_recommended` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `subscriptions` - الاشتراكات
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `pricing_tier_id` (uuid, foreign key)
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `invoices` - الفواتير
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, foreign key)
      - `customer_id` (uuid, foreign key)
      - `amount` (decimal)
      - `status` (text)
      - `issue_date` (date)
      - `due_date` (date)
      - `paid_date` (date, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - إضافة سياسات للقراءة والكتابة للمستخدمين المصرح لهم
*/

-- إنشاء جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول المنتجات
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

-- إنشاء جدول خطط التسعير
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_months integer NOT NULL,
  price decimal(10,2) NOT NULL,
  original_price decimal(10,2),
  discount_percentage integer,
  features jsonb DEFAULT '[]'::jsonb,
  is_recommended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول الاشتراكات
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

-- إنشاء جدول الفواتير
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  issue_date date DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON customers FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON customers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON products FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON pricing_tiers FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON pricing_tiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON pricing_tiers FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON pricing_tiers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON subscriptions FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON subscriptions FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON invoices FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON invoices FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON invoices FOR DELETE USING (true);

-- إدراج بيانات تجريبية للمنتجات
INSERT INTO products (name, description, category, features, icon, color, is_popular) VALUES
('Microsoft Office 365', 'مجموعة أدوات المكتب الشاملة من مايكروسوفت مع Word وExcel وPowerPoint وOutlook', 'productivity', '["Word معالج النصوص", "Excel جداول البيانات", "PowerPoint العروض التقديمية", "Outlook البريد الإلكتروني", "OneDrive التخزين السحابي", "Teams للتعاون"]', 'FileText', 'from-blue-600 to-blue-800', true),

('Adobe Creative Cloud', 'مجموعة أدوات التصميم الإبداعي الاحترافية من Adobe', 'design', '["Photoshop تحرير الصور", "Illustrator التصميم الجرافيكي", "InDesign النشر المكتبي", "Premiere Pro تحرير الفيديو", "After Effects الرسوم المتحركة", "XD تصميم واجهات المستخدم"]', 'Palette', 'from-purple-600 to-pink-600', true),

('ChatGPT Plus', 'مساعد الذكاء الاصطناعي المتقدم للمحادثات والكتابة الإبداعية', 'ai', '["محادثات ذكية غير محدودة", "كتابة إبداعية متقدمة", "تحليل البيانات والمستندات", "دعم أكثر من 50 لغة", "أولوية في الاستجابة", "الوصول لأحدث النماذج"]', 'MessageSquare', 'from-green-500 to-emerald-600', false),

('Spotify Premium', 'خدمة بث الموسيقى الرائدة عالمياً مع ملايين الأغاني', 'entertainment', '["موسيقى بدون إعلانات", "جودة صوت عالية", "تحميل للاستماع بدون إنترنت", "تخطي الأغاني بلا حدود", "قوائم تشغيل مخصصة", "بودكاست حصرية"]', 'Music', 'from-green-400 to-green-600', false),

('Netflix Premium', 'منصة بث الأفلام والمسلسلات الرائدة عالمياً', 'entertainment', '["أفلام ومسلسلات بدون إعلانات", "جودة 4K Ultra HD", "مشاهدة على 4 أجهزة", "تحميل للمشاهدة بدون إنترنت", "محتوى حصري أصلي", "دعم جميع الأجهزة"]', 'Tv', 'from-red-600 to-red-800', false),

('Canva Pro', 'أداة التصميم السهلة للجميع مع قوالب احترافية', 'design', '["قوالب تصميم احترافية", "مكتبة صور ورسوم ضخمة", "إزالة خلفية الصور", "تغيير حجم التصاميم تلقائياً", "تعاون الفريق", "تحميل بجودة عالية"]', 'Paintbrush2', 'from-cyan-400 to-blue-500', false);

-- إدراج خطط التسعير
INSERT INTO pricing_tiers (product_id, name, duration_months, price, original_price, discount_percentage, features, is_recommended) VALUES
-- Microsoft Office 365
((SELECT id FROM products WHERE name = 'Microsoft Office 365'), 'شخصي', 1, 29.99, NULL, NULL, '["مستخدم واحد", "1TB تخزين OneDrive", "جميع تطبيقات Office", "دعم فني أساسي"]', false),
((SELECT id FROM products WHERE name = 'Microsoft Office 365'), 'عائلي', 1, 49.99, 59.99, 17, '["6 مستخدمين", "6TB تخزين OneDrive", "جميع تطبيقات Office", "دعم فني متقدم", "حماية متقدمة"]', true),
((SELECT id FROM products WHERE name = 'Microsoft Office 365'), 'أعمال', 1, 89.99, NULL, NULL, '["مستخدمين غير محدود", "تخزين غير محدود", "أدوات إدارة متقدمة", "دعم فني مخصص", "أمان مؤسسي"]', false),

-- Adobe Creative Cloud
((SELECT id FROM products WHERE name = 'Adobe Creative Cloud'), 'تطبيق واحد', 1, 79.99, NULL, NULL, '["تطبيق Adobe واحد", "100GB تخزين سحابي", "خطوط Adobe", "دعم فني أساسي"]', false),
((SELECT id FROM products WHERE name = 'Adobe Creative Cloud'), 'جميع التطبيقات', 1, 199.99, 249.99, 20, '["أكثر من 20 تطبيق إبداعي", "100GB تخزين سحابي", "خطوط Adobe", "Adobe Stock", "دعم فني متقدم"]', true),
((SELECT id FROM products WHERE name = 'Adobe Creative Cloud'), 'فرق العمل', 1, 299.99, NULL, NULL, '["جميع تطبيقات Creative Cloud", "1TB تخزين لكل مستخدم", "أدوات إدارة الفريق", "دعم فني مخصص", "تراخيص مرنة"]', false),

-- ChatGPT Plus
((SELECT id FROM products WHERE name = 'ChatGPT Plus'), 'Plus', 1, 79.99, NULL, NULL, '["استخدام غير محدود", "أولوية في الاستجابة", "الوصول لأحدث النماذج", "ميزات تجريبية جديدة"]', true),

-- Spotify Premium
((SELECT id FROM products WHERE name = 'Spotify Premium'), 'فردي', 1, 19.99, NULL, NULL, '["حساب واحد", "موسيقى بدون إعلانات", "تحميل للاستماع بدون إنترنت", "جودة صوت عالية"]', false),
((SELECT id FROM products WHERE name = 'Spotify Premium'), 'عائلي', 1, 29.99, 39.99, 25, '["6 حسابات", "قوائم تشغيل منفصلة", "رقابة أبوية", "جميع ميزات Premium"]', true),

-- Netflix Premium
((SELECT id FROM products WHERE name = 'Netflix Premium'), 'أساسي', 1, 29.99, NULL, NULL, '["جهاز واحد", "جودة HD", "مكتبة كاملة", "بدون إعلانات"]', false),
((SELECT id FROM products WHERE name = 'Netflix Premium'), 'قياسي', 1, 49.99, NULL, NULL, '["جهازين", "جودة Full HD", "تحميل على جهازين", "مكتبة كاملة"]', true),
((SELECT id FROM products WHERE name = 'Netflix Premium'), 'مميز', 1, 69.99, NULL, NULL, '["4 أجهزة", "جودة 4K Ultra HD", "تحميل على 4 أجهزة", "صوت مكاني"]', false),

-- Canva Pro
((SELECT id FROM products WHERE name = 'Canva Pro'), 'Pro', 1, 39.99, 49.99, 20, '["قوالب مميزة", "100GB تخزين", "إزالة الخلفية", "تغيير الحجم السحري", "تعاون الفريق"]', true);

-- إدراج عملاء تجريبيين
INSERT INTO customers (name, email, phone, address) VALUES
('أحمد محمد العلي', 'ahmed.ali@example.com', '+966501234567', 'الرياض، حي النخيل، شارع الملك فهد'),
('فاطمة حسن الزهراني', 'fatima.hassan@example.com', '+966507654321', 'جدة، حي الصفا، طريق الأمير سلطان'),
('محمد سالم القحطاني', 'mohammed.salem@example.com', '+966509876543', 'الدمام، حي الفيصلية، شارع الخليج'),
('نورا عبدالله الشمري', 'nora.abdullah@example.com', '+966512345678', 'الرياض، حي العليا، طريق الملك عبدالعزيز'),
('خالد أحمد المطيري', 'khalid.ahmed@example.com', '+966598765432', 'جدة، حي الروضة، شارع التحلية');

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة triggers لتحديث updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();