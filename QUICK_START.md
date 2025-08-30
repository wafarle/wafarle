# 🚀 دليل التطبيق السريع لنظام الإشعارات

## 📋 المتطلبات
- حساب Supabase
- قاعدة بيانات PostgreSQL
- صلاحيات إدارة قاعدة البيانات

## ⚡ التطبيق السريع

### **الخطوة 1: تشغيل Migration الأساسي**

1. **افتح Supabase Dashboard**
2. **اذهب إلى SQL Editor**
3. **انسخ محتوى الملف:** `supabase/migrations/20250826200000_notifications_system.sql`
4. **الصق المحتوى في SQL Editor**
5. **اضغط Run**

### **الخطوة 2: التحقق من النجاح**

```sql
-- تحقق من وجود الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%notification%';

-- تحقق من وجود السياسات
SELECT * FROM pg_policies 
WHERE tablename IN ('notifications', 'notification_settings', 'notification_templates');

-- تحقق من وجود الدوال
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%';
```

### **الخطوة 3: إضافة cron extension (اختياري)**

إذا كنت تريد الإشعارات التلقائية:

```sql
-- إضافة cron extension
CREATE EXTENSION IF NOT EXISTS cron;

-- إنشاء cron jobs
SELECT cron.schedule('cleanup-expired-notifications', '0 2 * * *', 'SELECT cleanup_expired_notifications();');
SELECT cron.schedule('create-automatic-notifications', '0 * * * *', 'SELECT create_automatic_notifications();');
```

**أو استخدم الملف:** `supabase/migrations/20250826200100_add_cron_extension.sql`

## ✅ النتيجة المتوقعة

بعد التطبيق الناجح:

- ✅ **3 جداول جديدة** للإشعارات
- ✅ **سياسات أمان** محمية
- ✅ **دوال تلقائية** للإشعارات
- ✅ **بيانات تجريبية** للاختبار
- ✅ **فهارس محسنة** للأداء

## 🔍 اختبار النظام

### **1. في الواجهة:**
- زر الإشعارات في شريط التنقل العلوي
- صفحة الإشعارات من القائمة الجانبية
- عداد الإشعارات غير المقروءة

### **2. في قاعدة البيانات:**
```sql
-- عرض الإشعارات
SELECT * FROM notifications ORDER BY created_at DESC;

-- عرض الإعدادات
SELECT * FROM notification_settings;

-- عرض القوالب
SELECT * FROM notification_templates;
```

## 🚨 استكشاف الأخطاء

### **إذا فشل Migration:**
- تحقق من اتصال Supabase
- تأكد من الصلاحيات
- تحقق من syntax SQL

### **إذا لم تظهر الإشعارات:**
- تحقق من console المتصفح
- تأكد من تطبيق Migration
- تحقق من إعدادات RLS

## 📞 الدعم

- **ملف الإصلاحات:** `MIGRATION_FIX.md`
- **دليل الإعداد:** `NOTIFICATIONS_SETUP.md`
- **ملف cron:** `20250826200100_add_cron_extension.sql`

---

**ملاحظة:** هذا النظام يعمل بدون cron extension، لكن cron يجعل الإشعارات تلقائية.


