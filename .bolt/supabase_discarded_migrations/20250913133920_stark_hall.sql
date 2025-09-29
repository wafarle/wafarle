/*
  # نظام المصادقة برقم الهاتف للعملاء

  1. التحديثات
    - إضافة عمود رقم الهاتف كمعرف فريد
    - تحديث سياسات RLS للمصادقة برقم الهاتف
    - دوال للتحقق من رقم الهاتف

  2. الأمان
    - سياسات RLS محدثة
    - فهارس محسنة للبحث برقم الهاتف
    - التحقق من صحة رقم الهاتف
*/

-- إضافة عمود phone_auth للعملاء (رقم الهاتف المستخدم للمصادقة)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'phone_auth'
  ) THEN
    ALTER TABLE customers ADD COLUMN phone_auth text UNIQUE;
  END IF;
END $$;

-- إنشاء فهرس لرقم الهاتف للمصادقة
CREATE INDEX IF NOT EXISTS idx_customers_phone_auth ON customers(phone_auth);

-- دالة لتنظيف رقم الهاتف (إزالة المسافات والرموز غير الضرورية)
CREATE OR REPLACE FUNCTION clean_phone_number(phone_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- إزالة جميع المسافات والرموز باستثناء الأرقام والعلامة +
  RETURN regexp_replace(phone_input, '[^0-9+]', '', 'g');
END;
$$;

-- دالة للتحقق من صحة رقم الهاتف السعودي
CREATE OR REPLACE FUNCTION validate_saudi_phone(phone_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_phone text;
BEGIN
  cleaned_phone := clean_phone_number(phone_input);
  
  -- التحقق من الأنماط الصحيحة للرقم السعودي
  RETURN cleaned_phone ~ '^(\+966|966|0)5[0-9]{8}$';
END;
$$;

-- دالة لتحويل رقم الهاتف إلى التنسيق الموحد
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_phone text;
BEGIN
  cleaned_phone := clean_phone_number(phone_input);
  
  -- تحويل إلى التنسيق الموحد +966xxxxxxxxx
  IF cleaned_phone ~ '^05[0-9]{8}$' THEN
    RETURN '+966' || substring(cleaned_phone from 2);
  ELSIF cleaned_phone ~ '^9665[0-9]{8}$' THEN
    RETURN '+' || cleaned_phone;
  ELSIF cleaned_phone ~ '^5[0-9]{8}$' THEN
    RETURN '+966' || cleaned_phone;
  ELSIF cleaned_phone ~ '^\+9665[0-9]{8}$' THEN
    RETURN cleaned_phone;
  ELSE
    RETURN cleaned_phone; -- إرجاع الرقم كما هو إذا لم يتطابق مع الأنماط
  END IF;
END;
$$;

-- تحديث جدول العملاء لتعيين phone_auth من الهاتف الموجود
UPDATE customers 
SET phone_auth = normalize_phone_number(phone)
WHERE phone IS NOT NULL 
  AND phone != '' 
  AND validate_saudi_phone(phone) 
  AND phone_auth IS NULL;

-- إنشاء trigger لتحديث phone_auth تلقائياً عند تحديث رقم الهاتف
CREATE OR REPLACE FUNCTION update_phone_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- تحديث phone_auth عند تحديث رقم الهاتف
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    IF validate_saudi_phone(NEW.phone) THEN
      NEW.phone_auth := normalize_phone_number(NEW.phone);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول العملاء
DROP TRIGGER IF EXISTS trigger_update_phone_auth ON customers;
CREATE TRIGGER trigger_update_phone_auth
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_auth();

-- تحديث سياسات RLS للمصادقة برقم الهاتف
DROP POLICY IF EXISTS "Customers can view own data by phone" ON customers;
CREATE POLICY "Customers can view own data by phone" ON customers
  FOR SELECT
  USING (
    -- السماح للمدراء بالوصول لجميع البيانات
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    ))
    OR
    -- السماح للعملاء بالوصول لبياناتهم عبر phone_auth
    (phone_auth = auth.jwt() ->> 'phone')
    OR
    -- السماح للعملاء بالوصول لبياناتهم عبر البريد الإلكتروني (احتياطي)
    (email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Customers can update own data by phone" ON customers;
CREATE POLICY "Customers can update own data by phone" ON customers
  FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    ))
    OR
    (phone_auth = auth.jwt() ->> 'phone')
    OR
    (email = auth.jwt() ->> 'email')
  );

-- تحديث سياسات الاشتراكات للعمل برقم الهاتف
DROP POLICY IF EXISTS "Customers can view own subscriptions by phone" ON subscriptions;
CREATE POLICY "Customers can view own subscriptions by phone" ON subscriptions
  FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = subscriptions.customer_id 
      AND (
        customers.phone_auth = auth.jwt() ->> 'phone'
        OR customers.email = auth.jwt() ->> 'email'
      )
    ))
  );

-- تحديث سياسات الفواتير للعمل برقم الهاتف  
DROP POLICY IF EXISTS "Customers can view own invoices by phone" ON invoices;
CREATE POLICY "Customers can view own invoices by phone" ON invoices
  FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = invoices.customer_id 
      AND (
        customers.phone_auth = auth.jwt() ->> 'phone'
        OR customers.email = auth.jwt() ->> 'email'
      )
    ))
  );

-- إضافة سياسات للجداول الجديدة
DROP POLICY IF EXISTS "Customers can view own requests by phone" ON subscription_requests;
CREATE POLICY "Customers can view own requests by phone" ON subscription_requests
  FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = subscription_requests.customer_id 
      AND (
        customers.phone_auth = auth.jwt() ->> 'phone'
        OR customers.email = auth.jwt() ->> 'email'
      )
    ))
  );

-- سياسة إنشاء طلبات الاشتراك
DROP POLICY IF EXISTS "Customers can create own requests by phone" ON subscription_requests;
CREATE POLICY "Customers can create own requests by phone" ON subscription_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = subscription_requests.customer_id 
      AND (
        customers.phone_auth = auth.jwt() ->> 'phone'
        OR customers.email = auth.jwt() ->> 'email'
      )
    )
  );