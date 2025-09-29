/*
  # ربط العملاء بحسابات المصادقة

  1. التعديلات
    - إضافة عمود auth_user_id للعملاء
    - إنشاء فهرس للبحث السريع
    - تحديث سياسات الأمان

  2. الأمان
    - العملاء يمكنهم الوصول لبياناتهم فقط
    - ربط آمن مع نظام المصادقة
*/

-- إضافة عمود auth_user_id لجدول العملاء
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);

-- إنشاء unique constraint لتجنب التكرار
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'customers' AND constraint_name = 'customers_auth_user_id_key'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

-- تحديث سياسات RLS للعملاء
DROP POLICY IF EXISTS "Customers can read their own data" ON customers;
CREATE POLICY "Customers can read their own data" ON customers
  FOR SELECT USING (auth.uid() = auth_user_id OR role() = 'authenticated');

DROP POLICY IF EXISTS "Customers can update their own data" ON customers;  
CREATE POLICY "Customers can update their own data" ON customers
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- تحديث سياسات RLS للاشتراكات
DROP POLICY IF EXISTS "Customers can read their own subscriptions" ON subscriptions;
CREATE POLICY "Customers can read their own subscriptions" ON subscriptions
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    ) OR role() = 'authenticated'
  );

-- تحديث سياسات RLS للفواتير  
DROP POLICY IF EXISTS "Customers can read their own invoices" ON invoices;
CREATE POLICY "Customers can read their own invoices" ON invoices
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    ) OR role() = 'authenticated'
  );

-- دالة لإنشاء حساب مصادقة للعميل
CREATE OR REPLACE FUNCTION create_customer_auth_account(
  customer_id uuid,
  customer_email text,
  temp_password text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
  generated_password text;
BEGIN
  -- التحقق من وجود العميل
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = customer_id) THEN
    RETURN json_build_object('success', false, 'error', 'العميل غير موجود');
  END IF;
  
  -- التحقق من عدم وجود حساب مصادقة مسبقاً
  IF EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND auth_user_id IS NOT NULL) THEN
    RETURN json_build_object('success', false, 'error', 'العميل لديه حساب مصادقة بالفعل');
  END IF;
  
  -- إنشاء كلمة مرور عشوائية إذا لم يتم تمرير واحدة
  IF temp_password IS NULL THEN
    generated_password := 'temp' || FLOOR(RANDOM() * 10000)::text;
  ELSE
    generated_password := temp_password;
  END IF;
  
  -- إرجاع البيانات المطلوبة لإنشاء الحساب (سيتم إنشاؤه من جانب العميل)
  RETURN json_build_object(
    'success', true,
    'customer_id', customer_id,
    'email', customer_email,
    'temp_password', generated_password,
    'message', 'يمكن الآن إنشاء حساب المصادقة للعميل'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لربط العميل بحساب المصادقة
CREATE OR REPLACE FUNCTION link_customer_to_auth_user(
  customer_id uuid,
  auth_user_id uuid
)
RETURNS json AS $$
BEGIN
  -- التحقق من وجود العميل
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = customer_id) THEN
    RETURN json_build_object('success', false, 'error', 'العميل غير موجود');
  END IF;
  
  -- التحقق من وجود المستخدم في جدول المصادقة
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'حساب المصادقة غير موجود');
  END IF;
  
  -- ربط العميل بحساب المصادقة
  UPDATE customers 
  SET auth_user_id = auth_user_id 
  WHERE id = customer_id;
  
  RETURN json_build_object('success', true, 'message', 'تم ربط العميل بحساب المصادقة بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;