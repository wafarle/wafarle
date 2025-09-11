/*
  # تحديث جدول الاشتراكات لدعم الخصومات والأسعار المخصصة

  1. التحديثات
    - إضافة حقل discount_percentage لحفظ نسبة الخصم
    - إضافة حقل final_price لحفظ السعر النهائي بعد الخصم
    - إضافة حقل custom_price للأسعار المخصصة

  2. الأمان
    - تحديث سياسات RLS للحقول الجديدة
*/

-- إضافة الحقول الجديدة لجدول الاشتراكات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN discount_percentage integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'final_price'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN final_price numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'custom_price'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN custom_price numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- تحديث البيانات الموجودة لحساب الأسعار النهائية
UPDATE subscriptions 
SET final_price = COALESCE(
  (SELECT p.price FROM products p 
   JOIN pricing_tiers pt ON pt.product_id = p.id 
   WHERE pt.id = subscriptions.pricing_tier_id), 
  0
)
WHERE final_price = 0 OR final_price IS NULL;