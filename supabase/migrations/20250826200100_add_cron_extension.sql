-- ملاحظة: cron extension غير متاح في Supabase المجاني
-- هذا الملف يحتوي على بدائل للإشعارات التلقائية

-- إنشاء جدول للجدولة اليدوية
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_name TEXT NOT NULL,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    interval_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج المهام المجدولة
INSERT INTO scheduled_tasks (task_name, interval_minutes, next_run) VALUES
('cleanup_expired_notifications', 1440, NOW() + INTERVAL '1 day'), -- كل يوم
('create_automatic_notifications', 60, NOW() + INTERVAL '1 hour'); -- كل ساعة

-- إنشاء دالة لتشغيل المهام المجدولة
CREATE OR REPLACE FUNCTION run_scheduled_tasks()
RETURNS void AS $$
DECLARE
    task RECORD;
BEGIN
    FOR task IN
        SELECT * FROM scheduled_tasks 
        WHERE is_active = true 
        AND next_run <= NOW()
    LOOP
        -- تشغيل المهمة
        CASE task.task_name
            WHEN 'cleanup_expired_notifications' THEN
                PERFORM cleanup_expired_notifications();
            WHEN 'create_automatic_notifications' THEN
                PERFORM create_automatic_notifications();
        END CASE;
        
        -- تحديث وقت التشغيل التالي
        UPDATE scheduled_tasks 
        SET last_run = NOW(),
            next_run = NOW() + (task.interval_minutes || ' minutes')::INTERVAL,
            updated_at = NOW()
        WHERE id = task.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ملاحظة: يمكن تشغيل هذه الدالة يدوياً أو من خلال Edge Functions
-- مثال: SELECT run_scheduled_tasks();
