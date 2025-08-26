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