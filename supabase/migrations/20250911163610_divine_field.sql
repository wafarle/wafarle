/*
  # نظام طلبات الاشتراكات

  1. جدول طلبات الاشتراكات
    - `subscription_requests` - طلبات العملاء
    - الحالات: pending, approved, activated, rejected

  2. تدفق العمل
    - العميل يطلب اشتراك (pending)
    - الإدارة توافق (approved) 
    - الإدارة تفعل ويصدر فاتورة (activated)
    - أو ترفض (rejected)

  3. الأمان
    - سياسات RLS للحماية
    - العملاء يرون طلباتهم فقط
    - الإدارة ترى كل شيء
*/

-- إنشاء enum لحالات الطلبات
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'approved', 'activated', 'rejected');
    END IF;
END $$;

-- جدول طلبات الاشتراكات
CREATE TABLE IF NOT EXISTS subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  pricing_tier_id uuid REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  status request_status DEFAULT 'pending',
  preferred_start_date date DEFAULT CURRENT_DATE,
  notes text,
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تمكين RLS
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

-- سياسات للعملاء - يمكنهم إنشاء طلبات ورؤية طلباتهم فقط
CREATE POLICY "Customers can create requests" ON subscription_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_id 
      AND customers.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Customers can view own requests" ON subscription_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_id 
      AND customers.email = auth.jwt() ->> 'email'
    )
  );

-- سياسات للإدارة - وصول كامل
CREATE POLICY "Admins can manage all requests" ON subscription_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_subscription_requests_customer_id ON subscription_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_created_at ON subscription_requests(created_at DESC);

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION update_subscription_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_subscription_requests_updated_at ON subscription_requests;
CREATE TRIGGER update_subscription_requests_updated_at
  BEFORE UPDATE ON subscription_requests
  FOR EACH ROW EXECUTE FUNCTION update_subscription_requests_updated_at();

-- إدراج بيانات تجريبية
INSERT INTO subscription_requests (
  customer_id, 
  pricing_tier_id, 
  status, 
  preferred_start_date, 
  notes
) 
SELECT 
  customers.id,
  pricing_tiers.id,
  'pending'::request_status,
  CURRENT_DATE,
  'طلب تجريبي للاختبار'
FROM customers 
CROSS JOIN pricing_tiers 
WHERE customers.id IS NOT NULL 
AND pricing_tiers.id IS NOT NULL
LIMIT 3
ON CONFLICT DO NOTHING;