/*
  # إضافة عمود phone_auth لجدول العملاء

  1. إضافات جديدة
    - إضافة عمود `phone_auth` لجدول `customers`
    - العمود من نوع TEXT مع قيد UNIQUE
    - يُستخدم لتسجيل الدخول برقم الهاتف

  2. الفهارس
    - إضافة فهرس للبحث السريع برقم الهاتف المؤهل للمصادقة

  3. الأمان
    - العمود يتبع نفس سياسات الأمان الموجودة لجدول customers
*/

-- إضافة عمود phone_auth لجدول customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'phone_auth'
  ) THEN
    ALTER TABLE customers ADD COLUMN phone_auth TEXT UNIQUE;
  END IF;
END $$;

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_phone_auth ON customers(phone_auth);

-- إضافة تعليق على العمود
COMMENT ON COLUMN customers.phone_auth IS 'رقم الهاتف المنسق للمصادقة (مع رمز الدولة)';