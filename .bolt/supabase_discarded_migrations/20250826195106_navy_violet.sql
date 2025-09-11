/*
  # إضافة سعر البيع لكل مستخدم في المشتريات

  1. تعديلات الجدول
    - إضافة حقل `sale_price_per_user` في جدول `purchases`
    - نوع البيانات: numeric(10,2) مع قيمة افتراضية 0

  2. الهدف
    - تحديد سعر البيع المقترح لكل مستخدم
    - تسهيل عملية تسعير المبيعات
    - حساب الأرباح المتوقعة
*/

-- إضافة حقل سعر البيع لكل مستخدم
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS sale_price_per_user numeric(10,2) DEFAULT 0;