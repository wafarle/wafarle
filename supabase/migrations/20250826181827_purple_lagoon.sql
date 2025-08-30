/*
  # إضافة جداول المشتريات والمبيعات

  1. جداول جديدة
    - `purchases` - المشتريات (الحسابات المشتراة)
      - `id` (uuid, primary key)
      - `service_name` (text) - اسم الخدمة
      - `account_details` (text) - تفاصيل الحساب
      - `purchase_price` (numeric) - سعر الشراء
      - `purchase_date` (date) - تاريخ الشراء
      - `max_users` (integer) - عدد المستخدمين المسموح
      - `current_users` (integer) - عدد المستخدمين الحالي
      - `status` (text) - الحالة
      - `notes` (text) - ملاحظات
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `sales` - المبيعات (بيع الحسابات للمستخدمين)
      - `id` (uuid, primary key)
      - `purchase_id` (uuid) - مرجع للمشتريات
      - `customer_id` (uuid) - مرجع للعميل
      - `sale_price` (numeric) - سعر البيع
      - `sale_date` (date) - تاريخ البيع
      - `status` (text) - الحالة
      - `access_details` (text) - تفاصيل الوصول للعميل
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على الجداول الجديدة
    - إضافة سياسات للوصول العام
*/

-- إنشاء جدول المشتريات
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  account_details text,
  purchase_price numeric(10,2) NOT NULL DEFAULT 0,
  purchase_date date DEFAULT CURRENT_DATE,
  max_users integer NOT NULL DEFAULT 1,
  current_users integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'full', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول المبيعات
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  sale_price numeric(10,2) NOT NULL DEFAULT 0,
  sale_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  access_details text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان
CREATE POLICY "Enable all operations for purchases"
  ON purchases
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for sales"
  ON sales
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- إضافة triggers للتحديث التلقائي
CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إضافة trigger لتحديث عدد المستخدمين تلقائياً
CREATE OR REPLACE FUNCTION update_purchase_users_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE purchases 
    SET current_users = (
      SELECT COUNT(*) 
      FROM sales 
      WHERE purchase_id = NEW.purchase_id AND status = 'active'
    ),
    status = CASE 
      WHEN (SELECT COUNT(*) FROM sales WHERE purchase_id = NEW.purchase_id AND status = 'active') >= max_users 
      THEN 'full' 
      ELSE 'active' 
    END
    WHERE id = NEW.purchase_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE purchases 
    SET current_users = (
      SELECT COUNT(*) 
      FROM sales 
      WHERE purchase_id = NEW.purchase_id AND status = 'active'
    ),
    status = CASE 
      WHEN (SELECT COUNT(*) FROM sales WHERE purchase_id = NEW.purchase_id AND status = 'active') >= max_users 
      THEN 'full' 
      ELSE 'active' 
    END
    WHERE id = NEW.purchase_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE purchases 
    SET current_users = (
      SELECT COUNT(*) 
      FROM sales 
      WHERE purchase_id = OLD.purchase_id AND status = 'active'
    ),
    status = CASE 
      WHEN (SELECT COUNT(*) FROM sales WHERE purchase_id = OLD.purchase_id AND status = 'active') >= max_users 
      THEN 'full' 
      ELSE 'active' 
    END
    WHERE id = OLD.purchase_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_users_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_users_count();

-- إدراج بيانات تجريبية للمشتريات
INSERT INTO purchases (service_name, account_details, purchase_price, purchase_date, max_users, current_users, status, notes) VALUES
('Microsoft Office 365 Business', 'admin@company.com', 450.00, CURRENT_DATE - INTERVAL '30 days', 10, 3, 'active', 'اشتراك سنوي لشركة'),
('Adobe Creative Cloud', 'design@company.com', 890.00, CURRENT_DATE - INTERVAL '15 days', 5, 2, 'active', 'اشتراك سنوي لفريق التصميم'),
('ChatGPT Plus', 'ai@company.com', 750.00, CURRENT_DATE - INTERVAL '7 days', 3, 1, 'active', 'اشتراك سنوي لفريق الذكاء الاصطناعي'),
('Spotify Premium', 'hr@company.com', 199.99, CURRENT_DATE - INTERVAL '45 days', 20, 15, 'active', 'اشتراك سنوي للموظفين'),
('Netflix Premium', 'entertainment@company.com', 560.00, CURRENT_DATE - INTERVAL '60 days', 8, 6, 'active', 'اشتراك سنوي لقسم الترفيه');

-- إدراج بيانات تجريبية للمبيعات
INSERT INTO sales (purchase_id, customer_id, sale_price, sale_date, status, access_details) VALUES
((SELECT id FROM purchases WHERE service_name = 'Microsoft Office 365 Business' LIMIT 1), 
 (SELECT id FROM customers WHERE name = 'أحمد محمد علي' LIMIT 1), 
 89.00, CURRENT_DATE - INTERVAL '25 days', 'active', 'ahmed.ali@company.com'),

((SELECT id FROM purchases WHERE service_name = 'Microsoft Office 365 Business' LIMIT 1), 
 (SELECT id FROM customers WHERE name = 'فاطمة أحمد' LIMIT 1), 
 89.00, CURRENT_DATE - INTERVAL '20 days', 'active', 'fatima.ahmed@company.com'),

((SELECT id FROM purchases WHERE service_name = 'Adobe Creative Cloud' LIMIT 1), 
 (SELECT id FROM customers WHERE name = 'محمد عبدالله' LIMIT 1), 
 178.00, CURRENT_DATE - INTERVAL '10 days', 'active', 'mohammed.abdullah@company.com'),

((SELECT id FROM purchases WHERE service_name = 'ChatGPT Plus' LIMIT 1), 
 (SELECT id FROM customers WHERE name = 'نورا سالم' LIMIT 1), 
 150.00, CURRENT_DATE - INTERVAL '5 days', 'active', 'nora.salem@company.com'),

((SELECT id FROM purchases WHERE service_name = 'Spotify Premium' LIMIT 1), 
 (SELECT id FROM customers WHERE name = 'خالد الأحمد' LIMIT 1), 
 39.99, CURRENT_DATE - INTERVAL '40 days', 'active', 'khalid.ahmed@company.com');

-- إدراج مشتريات إضافية لليوم الحالي والأمس
INSERT INTO purchases (service_name, account_details, purchase_price, purchase_date, max_users, current_users, status, notes, created_at) VALUES
('Zoom Pro', 'meetings@company.com', 199.99, CURRENT_DATE, 50, 0, 'active', 'اشتراك شهري لاجتماعات الفيديو', CURRENT_DATE),
('Slack Premium', 'communication@company.com', 89.99, CURRENT_DATE, 25, 0, 'active', 'اشتراك شهري للتواصل', CURRENT_DATE),
('Trello Business', 'project@company.com', 149.99, CURRENT_DATE - INTERVAL '1 day', 15, 0, 'active', 'اشتراك شهري لإدارة المشاريع', CURRENT_DATE - INTERVAL '1 day'),
('Dropbox Business', 'storage@company.com', 299.99, CURRENT_DATE - INTERVAL '1 day', 30, 0, 'active', 'اشتراك شهري للتخزين السحابي', CURRENT_DATE - INTERVAL '1 day');