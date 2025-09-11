-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    category TEXT NOT NULL CHECK (category IN ('invoice', 'subscription', 'customer', 'system', 'payment')),
    is_read BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    action_text TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول إعدادات الإشعارات
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    invoice_overdue_days INTEGER DEFAULT 1,
    subscription_expiry_days INTEGER DEFAULT 30,
    payment_failed BOOLEAN DEFAULT TRUE,
    new_customer BOOLEAN DEFAULT TRUE,
    subscription_renewal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول قوالب الإشعارات
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('invoice', 'subscription', 'customer', 'system', 'payment')),
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_important ON notifications(is_important);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- إنشاء فهارس لإعدادات الإشعارات
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- إنشاء فهارس لقوالب الإشعارات
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON notification_templates(is_active);

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء triggers لتحديث updated_at
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إدراج بيانات تجريبية للإشعارات
INSERT INTO notifications (user_id, title, message, type, category, is_read, is_important) VALUES
('system', 'مرحباً بك في النظام', 'تم تسجيل دخولك بنجاح إلى نظام إدارة الاشتراكات', 'success', 'system', false, false),
('system', 'تحديث النظام', 'تم تحديث النظام إلى الإصدار الجديد', 'info', 'system', false, false),
('system', 'نسخة احتياطية', 'تم إنشاء نسخة احتياطية من قاعدة البيانات', 'success', 'system', false, false);

-- إدراج بيانات تجريبية لإعدادات الإشعارات
INSERT INTO notification_settings (user_id, email_notifications, sms_notifications, push_notifications) VALUES
('system', true, false, true);

-- إدراج بيانات تجريبية لقوالب الإشعارات
INSERT INTO notification_templates (name, title_template, message_template, type, variables) VALUES
('فاتورة متأخرة', 'فاتورة متأخرة', 'الفاتورة رقم {invoice_id} للعميل {customer_name} متأخرة عن موعد الاستحقاق', 'invoice', ARRAY['invoice_id', 'customer_name']),
('اشتراك منتهي', 'اشتراك منتهي قريباً', 'اشتراك العميل {customer_name} في {plan_name} سينتهي خلال {days_left} يوم', 'subscription', ARRAY['customer_name', 'plan_name', 'days_left']),
('عميل جديد', 'عميل جديد', 'تم إضافة عميل جديد: {customer_name}', 'customer', ARRAY['customer_name']),
('دفعة فاشلة', 'دفعة فاشلة', 'فشلت عملية الدفع للفاتورة رقم {invoice_id}', 'payment', ARRAY['invoice_id']);

-- إنشاء سياسات الأمان (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- سياسات الإشعارات
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = 'system' OR user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (user_id = 'system' OR user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = 'system' OR user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (user_id = 'system' OR user_id = auth.uid()::text);

-- سياسة إضافية للسماح للنظام بإنشاء إشعارات للجميع
CREATE POLICY "System can create notifications for all users" ON notifications
    FOR INSERT WITH CHECK (user_id = 'system');

-- سياسات إعدادات الإشعارات
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (user_id = 'system' OR user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (user_id = 'system' OR user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (user_id = 'system' OR user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own notification settings" ON notification_settings
    FOR DELETE USING (user_id = 'system' OR user_id = auth.uid()::text);

-- سياسات قوالب الإشعارات (يمكن للجميع قراءتها)
CREATE POLICY "Anyone can view notification templates" ON notification_templates
    FOR SELECT USING (true);

CREATE POLICY "Only system can modify notification templates" ON notification_templates
    FOR ALL USING (false); -- منع التعديل للجميع

-- إنشاء دالة لتنظيف الإشعارات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_read = true;
END;
$$ LANGUAGE plpgsql;

-- ملاحظة: cron extension غير مثبت في Supabase افتراضياً
-- يمكنك تفعيله لاحقاً باستخدام: CREATE EXTENSION IF NOT EXISTS cron;

-- إنشاء دالة لتنظيف الإشعارات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_read = true;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لإنشاء إشعارات تلقائية
CREATE OR REPLACE FUNCTION create_automatic_notifications()
RETURNS void AS $$
DECLARE
    overdue_invoice RECORD;
    expiring_subscription RECORD;
    days_until_expiry INTEGER;
BEGIN
    -- إشعارات الفواتير المتأخرة
    FOR overdue_invoice IN 
        SELECT i.id, i.customer_id, c.name as customer_name
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.status = 'pending' 
        AND i.due_date < CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.category = 'invoice' 
            AND n.action_url = '/invoices/' || i.id
            AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
        )
    LOOP
        INSERT INTO notifications (
            user_id, title, message, type, category, 
            is_read, is_important, action_url, action_text
        ) VALUES (
            'system',
            'فاتورة متأخرة',
            'الفاتورة رقم ' || overdue_invoice.id || ' للعميل ' || overdue_invoice.customer_name || ' متأخرة عن موعد الاستحقاق',
            'warning',
            'invoice',
            false,
            true,
            '/invoices/' || overdue_invoice.id,
            'عرض الفاتورة'
        );
    END LOOP;

    -- إشعارات انتهاء الاشتراكات
    FOR expiring_subscription IN 
        SELECT s.id, s.customer_id, c.name as customer_name, pt.name as plan_name, s.end_date
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        JOIN pricing_tiers pt ON s.pricing_tier_id = pt.id
        WHERE s.status = 'active' 
        AND s.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.category = 'subscription' 
            AND n.action_url = '/subscriptions/' || s.id
            AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
        )
    LOOP
        days_until_expiry := EXTRACT(DAY FROM (expiring_subscription.end_date - CURRENT_DATE));
        
        INSERT INTO notifications (
            user_id, title, message, type, category, 
            is_read, is_important, action_url, action_text
        ) VALUES (
            'system',
            'اشتراك منتهي قريباً',
            'اشتراك العميل ' || expiring_subscription.customer_name || ' في ' || expiring_subscription.plan_name || ' سينتهي خلال ' || days_until_expiry || ' يوم',
            'warning',
            'subscription',
            false,
            true,
            '/subscriptions/' || expiring_subscription.id,
            'عرض الاشتراك'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ملاحظة: cron jobs تحتاج إلى cron extension
-- يمكن تفعيلها لاحقاً بعد إضافة cron extension
