/*
  # ربط المنتجات بالمشتريات والاشتراكات

  1. تحديث الجداول
    - إضافة `product_id` إلى جدول `purchases`
    - إضافة `purchase_id` إلى جدول `subscriptions`
    - إضافة `max_users` و `current_users` إلى جدول `products`

  2. العلاقات
    - ربط المشتريات بالمنتجات
    - ربط الاشتراكات بالمشتريات
    - تتبع عدد المستخدمين لكل منتج

  3. الفهارس والقيود
    - إضافة foreign keys للعلاقات
    - إضافة فهارس للأداء
*/

-- إضافة product_id إلى جدول purchases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE purchases ADD COLUMN product_id uuid REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- إضافة purchase_id إلى جدول subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'purchase_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- إضافة max_users و current_users إلى جدول products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'max_users'
  ) THEN
    ALTER TABLE products ADD COLUMN max_users integer DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'current_users'
  ) THEN
    ALTER TABLE products ADD COLUMN current_users integer DEFAULT 0;
  END IF;
END $$;

-- إضافة available_slots إلى جدول products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'available_slots'
  ) THEN
    ALTER TABLE products ADD COLUMN available_slots integer DEFAULT 0;
  END IF;
END $$;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_purchase_id ON subscriptions(purchase_id);

-- دالة لتحديث عدد المستخدمين في المنتجات
CREATE OR REPLACE FUNCTION update_product_users_count()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث available_slots للمنتج
  UPDATE products 
  SET available_slots = (
    SELECT COALESCE(SUM(max_users - current_users), 0)
    FROM purchases 
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    AND status = 'active'
  ),
  current_users = (
    SELECT COALESCE(SUM(current_users), 0)
    FROM purchases 
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث عدد المستخدمين عند تغيير المشتريات
DROP TRIGGER IF EXISTS update_product_users_count_trigger ON purchases;
CREATE TRIGGER update_product_users_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_product_users_count();

-- دالة لتحديث عدد المستخدمين عند إضافة/حذف اشتراك
CREATE OR REPLACE FUNCTION update_subscription_users_count()
RETURNS TRIGGER AS $$
BEGIN
  -- عند إضافة اشتراك جديد
  IF TG_OP = 'INSERT' AND NEW.purchase_id IS NOT NULL THEN
    -- تحديث current_users في المشتريات
    UPDATE purchases 
    SET current_users = current_users + 1
    WHERE id = NEW.purchase_id;
    
    -- تحديث حالة المشتريات إذا امتلأت
    UPDATE purchases 
    SET status = CASE 
      WHEN current_users >= max_users THEN 'full'
      ELSE status
    END
    WHERE id = NEW.purchase_id;
    
  -- عند حذف اشتراك
  ELSIF TG_OP = 'DELETE' AND OLD.purchase_id IS NOT NULL THEN
    -- تحديث current_users في المشتريات
    UPDATE purchases 
    SET current_users = GREATEST(current_users - 1, 0)
    WHERE id = OLD.purchase_id;
    
    -- تحديث حالة المشتريات
    UPDATE purchases 
    SET status = CASE 
      WHEN current_users < max_users AND status = 'full' THEN 'active'
      ELSE status
    END
    WHERE id = OLD.purchase_id;
    
  -- عند تحديث اشتراك
  ELSIF TG_OP = 'UPDATE' THEN
    -- إذا تغير purchase_id
    IF OLD.purchase_id IS DISTINCT FROM NEW.purchase_id THEN
      -- تقليل العدد من المشتريات القديمة
      IF OLD.purchase_id IS NOT NULL THEN
        UPDATE purchases 
        SET current_users = GREATEST(current_users - 1, 0)
        WHERE id = OLD.purchase_id;
      END IF;
      
      -- زيادة العدد في المشتريات الجديدة
      IF NEW.purchase_id IS NOT NULL THEN
        UPDATE purchases 
        SET current_users = current_users + 1
        WHERE id = NEW.purchase_id;
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للاشتراكات
DROP TRIGGER IF EXISTS update_subscription_users_count_trigger ON subscriptions;
CREATE TRIGGER update_subscription_users_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_users_count();