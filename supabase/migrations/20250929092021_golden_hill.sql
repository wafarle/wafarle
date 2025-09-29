/*
  # إضافة أعمدة المصادقة لجدول العملاء

  1. Changes
    - إضافة عمود `auth_user_id` للربط مع جدول المصادقة
    - إضافة عمود `phone_auth` لحفظ رقم الهاتف المنسق للمصادقة
    - إضافة فهرس فريد لرقم الهاتف
    - إضافة فهرس للبحث السريع

  2. Security
    - العمود `auth_user_id` مربوط بجدول المصادقة مع CASCADE
    - العمود `phone_auth` فريد لمنع التكرار
*/

-- إضافة عمود auth_user_id للربط مع المستخدمين
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE customers 
    ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- إضافة عمود phone_auth لرقم الهاتف المنسق
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'phone_auth'
  ) THEN
    ALTER TABLE customers 
    ADD COLUMN phone_auth text UNIQUE;
  END IF;
END $$;

-- إضافة فهرس للبحث السريع بواسطة auth_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'customers' AND indexname = 'idx_customers_auth_user_id'
  ) THEN
    CREATE INDEX idx_customers_auth_user_id ON customers(auth_user_id);
  END IF;
END $$;

-- إضافة فهرس للبحث السريع بواسطة phone_auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'customers' AND indexname = 'idx_customers_phone_auth'
  ) THEN
    CREATE INDEX idx_customers_phone_auth ON customers(phone_auth);
  END IF;
END $$;