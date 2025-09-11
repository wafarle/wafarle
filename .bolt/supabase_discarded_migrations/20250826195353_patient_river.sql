/*
  # إضافة عمود سعر البيع لكل مستخدم

  1. تعديل الجدول
    - إضافة عمود `sale_price_per_user` إلى جدول `purchases`
    - نوع البيانات: `numeric(10,2)` 
    - القيمة الافتراضية: 0

  2. الهدف
    - السماح بتحديد سعر البيع المقترح لكل مستخدم
    - تسهيل حساب الأرباح المتوقعة
    - تحسين عملية التسعير
*/

-- إضافة عمود سعر البيع لكل مستخدم إلى جدول المشتريات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'sale_price_per_user'
  ) THEN
    ALTER TABLE purchases ADD COLUMN sale_price_per_user numeric(10,2) DEFAULT 0;
  END IF;
END $$;