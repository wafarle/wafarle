# 🔧 إصلاحات ملف Migration للإشعارات

## ❌ المشكلة التي تم حلها

```
ERROR: 42703: column "user_id" does not exist
```

كانت المشكلة في سياسة RLS لجدول `notification_templates` التي تحاول الوصول إلى عمود `user_id` غير موجود.

## ✅ الإصلاحات المطبقة

### 1. **إصلاح سياسة قوالب الإشعارات**

**قبل الإصلاح:**
```sql
CREATE POLICY "Only system can modify notification templates" ON notification_templates
    FOR ALL USING (user_id = 'system'); -- خطأ: user_id غير موجود
```

**بعد الإصلاح:**
```sql
CREATE POLICY "Only system can modify notification templates" ON notification_templates
    FOR ALL USING (false); -- منع التعديل للجميع
```

### 2. **إصلاح دوال المصادقة**

**المشكلة الثانية:**
```
ERROR: 42883: function auth.id() does not exist
```

**الحل:** استخدام `auth.uid()` بدلاً من `auth.id()` في Supabase.

**قبل الإصلاح:**
```sql
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = 'system' OR user_id = auth.id()::text);
```

**بعد الإصلاح:**
```sql
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = 'system' OR user_id = auth.uid()::text);
```

### 3. **تحسين سياسات الأمان**

تم تحديث جميع السياسات لتستخدم `auth.uid()::text` بدلاً من `auth.jwt() ->> 'email'`:

```sql
-- الإشعارات
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = 'system' OR user_id = auth.uid()::text);

-- إعدادات الإشعارات  
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (user_id = 'system' OR user_id = auth.uid()::text);
```

### 3. **إضافة سياسة إضافية للنظام**

```sql
CREATE POLICY "System can create notifications for all users" ON notifications
    FOR INSERT WITH CHECK (user_id = 'system');
```

### 4. **إصلاح مشكلة cron extension**

**المشكلة الثالثة:**
```
ERROR: 0A000: extension "cron" is not available
```

**الحل:** إنشاء نظام جدولة بديل يعمل بدون cron extension.

**الملفات:**
- `20250826200000_notifications_system.sql` - Migration الأساسي
- `20250826200100_add_cron_extension.sql` - نظام الجدولة البديل
- `supabase/functions/scheduled-tasks/` - Edge Function للتشغيل
- `.github/workflows/scheduled-tasks.yml` - GitHub Actions للتشغيل التلقائي

## 📋 الملف المُحدث

ملف Migration الصحيح: `supabase/migrations/20250826200000_notifications_system.sql`

## 🚀 كيفية التطبيق

### 1. **تشغيل Migration الأساسي:**
انسخ محتوى الملف `20250826200000_notifications_system.sql` إلى Supabase SQL Editor وقم بتنفيذه.

### 2. **إضافة نظام الجدولة البديل:**
إذا كنت تريد الإشعارات التلقائية، قم بتشغيل:
```sql
-- في Supabase SQL Editor
-- استخدم الملف: 20250826200100_add_cron_extension.sql
```

### 3. **تفعيل المهام المجدولة:**
بعد إضافة نظام الجدولة، يمكنك:

**الخيار 1: تشغيل يدوي**
```sql
SELECT run_scheduled_tasks();
```

**الخيار 2: Edge Function**
```bash
supabase functions deploy scheduled-tasks
```

**الخيار 3: GitHub Actions (مجاني)**
- أضف secrets في GitHub repository
- سيتم التشغيل تلقائياً كل ساعة

## ✅ التحقق من النجاح

بعد تشغيل Migration، تحقق من:

### 1. **وجود الجداول:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%notification%';
```

**النتيجة المتوقعة:**
- `notifications`
- `notification_settings` 
- `notification_templates`

### 2. **وجود السياسات:**
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('notifications', 'notification_settings', 'notification_templates');
```

### 3. **وجود الدوال:**
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%';
```

**النتيجة المتوقعة:**
- `cleanup_expired_notifications`
- `create_automatic_notifications`

### 4. **وجود المهام المجدولة:**
```sql
SELECT * FROM scheduled_tasks ORDER BY next_run;
```

### 5. **وجود Edge Function:**
```bash
supabase functions list
# يجب أن يظهر: scheduled-tasks
```

## 🎯 الميزات المفعلة

بعد تطبيق Migration بنجاح:

✅ **جداول قاعدة البيانات:**
- الإشعارات الرئيسية
- إعدادات المستخدم
- قوالب الإشعارات

✅ **سياسات الأمان:**
- حماية بيانات المستخدمين
- السماح للنظام بإنشاء الإشعارات

✅ **الإشعارات التلقائية:**
- فواتير متأخرة (كل ساعة)
- اشتراكات منتهية (قبل 30 يوم)

✅ **تنظيف البيانات:**
- حذف الإشعارات المنتهية (يومياً)

✅ **بيانات تجريبية:**
- إشعارات نموذجية للاختبار
- إعدادات افتراضية
- قوالب جاهزة

## 🔍 استكشاف الأخطاء

### 1. **إذا فشل تشغيل Migration:**
- تحقق من أن Supabase متصل
- تأكد من وجود صلاحيات كافية
- تحقق من syntax الـ SQL

### 2. **إذا لم تظهر الإشعارات:**
- تحقق من console المتصفح
- تأكد من تطبيق Migration بنجاح
- تحقق من إعدادات RLS

### 3. **إذا لم تعمل الإشعارات التلقائية:**
- تحقق من جدول `scheduled_tasks`
- تأكد من تشغيل `run_scheduled_tasks()`
- تحقق من وجود Edge Function
- تحقق من GitHub Actions (إذا كنت تستخدمه)

## 📞 الدعم

إذا واجهت مشاكل:

1. تحقق من logs Supabase
2. تأكد من تطبيق جميع التحديثات
3. تحقق من صحة البيانات
4. راجع إعدادات المشروع

## ⚠️ ملاحظات مهمة

### **دوال المصادقة في Supabase:**
- ✅ **الصحيح:** `auth.uid()` - يعطي معرف المستخدم
- ❌ **الخطأ:** `auth.id()` - غير موجود
- ❌ **الخطأ:** `auth.jwt() ->> 'email'` - قد لا يعمل مع جميع أنواع الحسابات

### **استخدام السياسات:**
```sql
-- ✅ صحيح
user_id = auth.uid()::text

-- ❌ خطأ
user_id = auth.id()::text
user_id = auth.jwt() ->> 'email'
```

---

**ملاحظة:** هذا الإصلاح يجعل النظام متوافقاً مع Supabase ويحل جميع مشاكل السياسات والأعمدة.
