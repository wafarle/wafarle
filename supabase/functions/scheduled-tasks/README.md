# 🕐 Edge Function للمهام المجدولة

## 📋 الوصف

هذا Edge Function يقوم بتشغيل المهام المجدولة في نظام الإشعارات، مثل:
- تنظيف الإشعارات المنتهية الصلاحية
- إنشاء الإشعارات التلقائية

## 🚀 التطبيق

### 1. **نشر Edge Function:**
```bash
supabase functions deploy scheduled-tasks
```

### 2. **تعيين المتغيرات البيئية:**
```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. **اختبار Function:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/scheduled-tasks
```

## ⏰ جدولة التشغيل

### **الخيار 1: استخدام خدمة خارجية**
- **GitHub Actions** (مجاني)
- **Vercel Cron Jobs** (مجاني)
- **Netlify Functions** (مجاني)

### **الخيار 2: GitHub Actions مثال:**

```yaml
# .github/workflows/scheduled-tasks.yml
name: Scheduled Tasks

on:
  schedule:
    - cron: '0 * * * *'  # كل ساعة

jobs:
  run-tasks:
    runs-on: ubuntu-latest
    steps:
      - name: Run scheduled tasks
        run: |
          curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }} \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### **الخيار 3: تشغيل يدوي**
```sql
-- في Supabase SQL Editor
SELECT run_scheduled_tasks();
```

## 🔧 التخصيص

### **تعديل الفترات الزمنية:**
```sql
UPDATE scheduled_tasks 
SET interval_minutes = 30  -- كل 30 دقيقة
WHERE task_name = 'create_automatic_notifications';
```

### **إضافة مهام جديدة:**
```sql
INSERT INTO scheduled_tasks (task_name, interval_minutes, next_run) VALUES
('new_task_name', 120, NOW() + INTERVAL '2 hours');
```

## 📊 مراقبة الأداء

### **عرض المهام المجدولة:**
```sql
SELECT * FROM scheduled_tasks ORDER BY next_run;
```

### **عرض سجل التشغيل:**
```sql
SELECT 
    task_name,
    last_run,
    next_run,
    is_active
FROM scheduled_tasks;
```

## 🚨 استكشاف الأخطاء

### **1. إذا فشل Edge Function:**
- تحقق من المتغيرات البيئية
- تأكد من وجود `run_scheduled_tasks` function
- تحقق من logs Supabase

### **2. إذا لم تعمل المهام:**
- تحقق من جدول `scheduled_tasks`
- تأكد من أن `is_active = true`
- تحقق من `next_run <= NOW()`

## 💡 نصائح

1. **استخدم GitHub Actions** للتشغيل المجاني
2. **اضبط الفترات** حسب احتياجاتك
3. **راقب الأداء** بانتظام
4. **اختبر يدوياً** قبل النشر

---

**ملاحظة:** هذا الحل يعمل بدون cron extension ويوفر جدولة مرنة للمهام.


