-- 🚀 نظام الإشعارات المحسن والشامل
-- يتضمن: إشعارات إضافية، إشعارات خارجية، قوالب قابلة للتخصيص، جدولة، أرشفة

-- ========================================
-- 10. أنواع البيانات المخصصة (يجب إنشاؤها أولاً)
-- ========================================

-- أنواع الإشعارات
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- فئات الإشعارات
DO $$ BEGIN
    CREATE TYPE notification_category AS ENUM (
        'system', 'customer', 'invoice', 'subscription', 'payment', 
        'new_customer', 'payment_failed', 'subscription_renewal',
        'marketing', 'maintenance', 'security'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- أولويات الإشعارات
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- قنوات الإشعارات الخارجية
DO $$ BEGIN
    CREATE TYPE external_channel AS ENUM ('email', 'sms', 'push', 'webhook');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- حالات الإشعارات الخارجية
DO $$ BEGIN
    CREATE TYPE external_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- أنواع الجدولة
DO $$ BEGIN
    CREATE TYPE schedule_type AS ENUM ('once', 'recurring', 'cron');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 1. جداول الإشعارات الأساسية المحسنة
-- ========================================

-- جدول الإشعارات الرئيسي
CREATE TABLE IF NOT EXISTS enhanced_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    category notification_category NOT NULL DEFAULT 'system',
    priority notification_priority NOT NULL DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    action_text TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    external_id TEXT, -- للربط مع الأنظمة الخارجية
    metadata JSONB DEFAULT '{}', -- بيانات إضافية مرنة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. إشعارات العملاء الجدد
-- ========================================

-- جدول إشعارات العملاء
CREATE TABLE IF NOT EXISTS customer_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES enhanced_notifications(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    subscription_type TEXT,
    subscription_value DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. إشعارات المدفوعات
-- ========================================

-- جدول إشعارات المدفوعات
CREATE TABLE IF NOT EXISTS payment_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES enhanced_notifications(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'SAR',
    payment_method TEXT,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. إشعارات تجديد الاشتراكات
-- ========================================

-- جدول إشعارات الاشتراكات
CREATE TABLE IF NOT EXISTS subscription_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES enhanced_notifications(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    current_expiry_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    subscription_plan TEXT,
    auto_renewal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. إشعارات خارجية (البريد، الرسائل، Push)
-- ========================================

-- جدول الإشعارات الخارجية
CREATE TABLE IF NOT EXISTS external_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES enhanced_notifications(id) ON DELETE CASCADE,
    channel external_channel NOT NULL,
    recipient TEXT NOT NULL, -- البريد الإلكتروني أو رقم الهاتف
    status external_status DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    external_provider TEXT, -- Mailgun, Twilio, Firebase, etc.
    external_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 6. قوالب الإشعارات القابلة للتخصيص
-- ========================================

-- جدول قوالب الإشعارات
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    category notification_category NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    priority notification_priority NOT NULL DEFAULT 'normal',
    is_active BOOLEAN DEFAULT TRUE,
    variables JSONB DEFAULT '[]', -- متغيرات القالب
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 7. جدولة الإشعارات
-- ========================================

-- جدول جدولة الإشعارات
CREATE TABLE IF NOT EXISTS notification_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
    schedule_type schedule_type NOT NULL,
    cron_expression TEXT, -- للتكرار المعقد
    interval_minutes INTEGER, -- للتكرار البسيط
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 8. أرشفة الإشعارات
-- ========================================

-- جدول الإشعارات المؤرشفة
CREATE TABLE IF NOT EXISTS archived_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_notification_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    category notification_category NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archive_reason TEXT DEFAULT 'automatic',
    retention_days INTEGER DEFAULT 365 -- مدة الاحتفاظ بالأرشيف
);

-- ========================================
-- 9. إعدادات المستخدمين المحسنة
-- ========================================

-- جدول إعدادات الإشعارات
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone TEXT DEFAULT 'Asia/Riyadh',
    language TEXT DEFAULT 'ar',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- ========================================
-- 11. الفهارس للأداء
-- ========================================

-- فهارس الإشعارات الأساسية
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_user_id ON enhanced_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_type ON enhanced_notifications(type);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_category ON enhanced_notifications(category);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_created_at ON enhanced_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_scheduled_at ON enhanced_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_expires_at ON enhanced_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_is_read ON enhanced_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_is_important ON enhanced_notifications(is_important);
CREATE INDEX IF NOT EXISTS idx_enhanced_notifications_is_archived ON enhanced_notifications(is_archived);

-- فهارس الإشعارات الخارجية
CREATE INDEX IF NOT EXISTS idx_external_notifications_channel ON external_notifications(channel);
CREATE INDEX IF NOT EXISTS idx_external_notifications_status ON external_notifications(status);
CREATE INDEX IF NOT EXISTS idx_external_notifications_next_retry ON external_notifications(next_retry_at);

-- فهارس الجدولة
CREATE INDEX IF NOT EXISTS idx_notification_schedules_next_run ON notification_schedules(next_run);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_is_active ON notification_schedules(is_active);

-- ========================================
-- 12. Triggers للتحديث التلقائي
-- ========================================

-- تحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق trigger على جميع الجداول
CREATE TRIGGER IF NOT EXISTS update_enhanced_notifications_updated_at 
    BEFORE UPDATE ON enhanced_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_external_notifications_updated_at 
    BEFORE UPDATE ON external_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_notification_schedules_updated_at 
    BEFORE UPDATE ON notification_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 13. دوال الإشعارات المحسنة
-- ========================================

-- دالة إنشاء إشعارات العملاء الجدد
CREATE OR REPLACE FUNCTION create_new_customer_notification(
    p_customer_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_subscription_type TEXT DEFAULT NULL,
    p_subscription_value DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_user_id TEXT := 'system';
BEGIN
    -- إنشاء الإشعار الأساسي
    INSERT INTO enhanced_notifications (
        user_id, title, message, type, category, priority, is_important
    ) VALUES (
        v_user_id,
        'عميل جديد',
        'تم إضافة عميل جديد: ' || p_customer_name,
        'success',
        'new_customer',
        'high'
    ) RETURNING id INTO v_notification_id;
    
    -- إنشاء إشعار العميل
    INSERT INTO customer_notifications (
        notification_id, customer_id, customer_name, customer_email, 
        customer_phone, subscription_type, subscription_value
    ) VALUES (
        v_notification_id, p_customer_id, p_customer_name, p_customer_email,
        p_customer_phone, p_subscription_type, p_subscription_value
    );
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- دالة إنشاء إشعارات المدفوعات الفاشلة
CREATE OR REPLACE FUNCTION create_payment_failed_notification(
    p_payment_id UUID,
    p_amount DECIMAL,
    p_currency TEXT DEFAULT 'SAR',
    p_payment_method TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_user_id TEXT := 'system';
BEGIN
    -- إنشاء الإشعار الأساسي
    INSERT INTO enhanced_notifications (
        user_id, title, message, type, category, priority, is_important
    ) VALUES (
        v_user_id,
        'فشل في الدفع',
        'فشل في معالجة الدفع بقيمة ' || p_amount || ' ' || p_currency,
        'error',
        'payment',
        'urgent'
    ) RETURNING id INTO v_notification_id;
    
    -- إنشاء إشعار الدفع
    INSERT INTO payment_notifications (
        notification_id, payment_id, amount, currency, payment_method, failure_reason
    ) VALUES (
        v_notification_id, p_payment_id, p_amount, p_currency, p_payment_method, p_failure_reason
    );
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- دالة إنشاء إشعارات تجديد الاشتراكات
CREATE OR REPLACE FUNCTION create_subscription_renewal_notification(
    p_subscription_id UUID,
    p_customer_id UUID,
    p_current_expiry_date DATE,
    p_renewal_date DATE,
    p_subscription_plan TEXT DEFAULT NULL,
    p_auto_renewal BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_user_id TEXT := 'system';
    v_days_until_expiry INTEGER;
BEGIN
    v_days_until_expiry := p_current_expiry_date - CURRENT_DATE;
    
    -- إنشاء الإشعار الأساسي
    INSERT INTO enhanced_notifications (
        user_id, title, message, type, category, priority, is_important
    ) VALUES (
        v_user_id,
        'تجديد الاشتراك',
        'الاشتراك سينتهي خلال ' || v_days_until_expiry || ' يوم',
        CASE 
            WHEN v_days_until_expiry <= 7 THEN 'error'
            WHEN v_days_until_expiry <= 30 THEN 'warning'
            ELSE 'info'
        END,
        'subscription_renewal',
        CASE 
            WHEN v_days_until_expiry <= 7 THEN 'urgent'
            WHEN v_days_until_expiry <= 30 THEN 'high'
            ELSE 'normal'
        END,
        v_days_until_expiry <= 30
    ) RETURNING id INTO v_notification_id;
    
    -- إنشاء إشعار الاشتراك
    INSERT INTO subscription_notifications (
        notification_id, subscription_id, customer_id, current_expiry_date,
        renewal_date, subscription_plan, auto_renewal
    ) VALUES (
        v_notification_id, p_subscription_id, p_customer_id, p_current_expiry_date,
        p_renewal_date, p_subscription_plan, p_auto_renewal
    );
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- دالة أرشفة الإشعارات القديمة
CREATE OR REPLACE FUNCTION archive_old_notifications(
    p_days_old INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    -- نقل الإشعارات القديمة إلى الأرشيف
    INSERT INTO archived_notifications (
        original_notification_id, user_id, title, message, type, category
    )
    SELECT 
        id, user_id, title, message, type, category
    FROM enhanced_notifications
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND is_archived = FALSE;
    
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
    
    -- تحديث حالة الإشعارات الأصلية
    UPDATE enhanced_notifications 
    SET is_archived = TRUE
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND is_archived = FALSE;
    
    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- دالة تنظيف الإشعارات المؤرشفة القديمة
CREATE OR REPLACE FUNCTION cleanup_old_archived_notifications(
    p_retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM archived_notifications
    WHERE archived_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 14. سياسات الأمان (RLS)
-- ========================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE enhanced_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- سياسات الإشعارات الأساسية
CREATE POLICY "Users can view their own notifications" ON enhanced_notifications
    FOR SELECT USING (user_id = 'system' OR user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notifications" ON enhanced_notifications
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "System can create notifications for all users" ON enhanced_notifications
    FOR INSERT WITH CHECK (user_id = 'system');

-- سياسات الإشعارات الخارجية
CREATE POLICY "Users can view their own external notifications" ON external_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enhanced_notifications 
            WHERE id = external_notifications.notification_id 
            AND (user_id = 'system' OR user_id = auth.uid()::text)
        )
    );

-- سياسات قوالب الإشعارات
CREATE POLICY "Everyone can view active notification templates" ON notification_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only system can modify notification templates" ON notification_templates
    FOR ALL USING (false);

-- سياسات إعدادات المستخدم
CREATE POLICY "Users can view their own notification preferences" ON user_notification_preferences
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notification preferences" ON user_notification_preferences
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own notification preferences" ON user_notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- ========================================
-- 15. بيانات تجريبية
-- ========================================

-- إدراج قوالب إشعارات جاهزة
INSERT INTO notification_templates (name, title_template, message_template, category, type, priority, variables) VALUES
('new_customer_welcome', 'مرحباً بك في {company_name}', 'أهلاً وسهلاً بك {customer_name}! نحن سعداء بانضمامك إلينا.', 'new_customer', 'success', 'normal', '["company_name", "customer_name"]'),
('payment_failed_alert', 'فشل في معالجة الدفع', 'فشل في معالجة الدفع بقيمة {amount} {currency}. السبب: {reason}', 'payment', 'error', 'urgent', '["amount", "currency", "reason"]'),
('subscription_expiring_soon', 'اشتراكك سينتهي قريباً', 'اشتراكك سينتهي في {expiry_date}. تجدد تلقائياً: {auto_renewal}', 'subscription_renewal', 'warning', 'high', '["expiry_date", "auto_renewal"]'),
('system_maintenance', 'صيانة النظام', 'سيتم إجراء صيانة للنظام في {maintenance_time}. مدة التوقف المتوقعة: {duration}', 'system', 'info', 'normal', '["maintenance_time", "duration"]');

-- إدراج جدولة إشعارات
INSERT INTO notification_schedules (template_id, schedule_type, interval_minutes, start_date, end_date, next_run) VALUES
((SELECT id FROM notification_templates WHERE name = 'subscription_expiring_soon'), 'recurring', 1440, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', NOW() + INTERVAL '1 day'),
((SELECT id FROM notification_templates WHERE name = 'system_maintenance'), 'once', NULL, CURRENT_DATE, NULL, NOW() + INTERVAL '1 week');

-- ========================================
-- 16. تعليقات وملاحظات
-- ========================================

COMMENT ON TABLE enhanced_notifications IS 'جدول الإشعارات الرئيسي المحسن مع دعم الجدولة والأرشفة';
COMMENT ON TABLE customer_notifications IS 'إشعارات العملاء الجدد والتفاعلات';
COMMENT ON TABLE payment_notifications IS 'إشعارات المدفوعات الفاشلة والناجحة';
COMMENT ON TABLE subscription_notifications IS 'إشعارات تجديد وانتهاء الاشتراكات';
COMMENT ON TABLE external_notifications IS 'الإشعارات المرسلة عبر القنوات الخارجية';
COMMENT ON TABLE notification_templates IS 'قوالب الإشعارات القابلة للتخصيص';
COMMENT ON TABLE notification_schedules IS 'جدولة الإشعارات التلقائية';
COMMENT ON TABLE archived_notifications IS 'أرشيف الإشعارات القديمة';
COMMENT ON TABLE user_notification_preferences IS 'تفضيلات المستخدمين للإشعارات';

COMMENT ON FUNCTION create_new_customer_notification IS 'إنشاء إشعار ترحيب للعملاء الجدد';
COMMENT ON FUNCTION create_payment_failed_notification IS 'إنشاء إشعار فشل الدفع';
COMMENT ON FUNCTION create_subscription_renewal_notification IS 'إنشاء إشعار تجديد الاشتراك';
COMMENT ON FUNCTION archive_old_notifications IS 'أرشفة الإشعارات القديمة';
COMMENT ON FUNCTION cleanup_old_archived_notifications IS 'تنظيف الأرشيف القديم';

-- ========================================
-- ✅ تم إنشاء نظام الإشعارات المحسن بنجاح!
-- ========================================
