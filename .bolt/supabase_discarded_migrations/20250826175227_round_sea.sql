/*
  # إضافة حقل السعر للمنتجات

  1. تعديلات الجداول
    - إضافة حقل `price` لجدول `products`
    - تحديث البيانات الموجودة بأسعار افتراضية

  2. تحديث البيانات
    - إضافة أسعار للمنتجات الموجودة
*/

-- إضافة حقل السعر للمنتجات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'price'
  ) THEN
    ALTER TABLE products ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- تحديث أسعار المنتجات الموجودة
UPDATE products SET price = 299.99 WHERE name = 'Microsoft Office 365';
UPDATE products SET price = 599.99 WHERE name = 'Adobe Creative Cloud';
UPDATE products SET price = 79.99 WHERE name = 'ChatGPT Plus';
UPDATE products SET price = 199.99 WHERE name = 'Canva Pro';
UPDATE products SET price = 149.99 WHERE name = 'Notion Pro';
UPDATE products SET price = 99.99 WHERE name = 'Spotify Premium';
UPDATE products SET price = 49.99 WHERE name = 'Netflix Premium';
UPDATE products SET price = 399.99 WHERE name = 'AutoCAD';
UPDATE products SET price = 29.99 WHERE name = 'Grammarly Premium';
UPDATE products SET price = 199.99 WHERE name = 'Slack Pro';