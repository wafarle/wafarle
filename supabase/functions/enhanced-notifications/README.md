# 🚀 Edge Function للإشعارات المحسنة

## 📋 الوصف

هذا Edge Function متقدم يدعم جميع أنواع الإشعارات الجديدة:
- ✅ إشعارات العملاء الجدد
- ✅ إشعارات المدفوعات الفاشلة
- ✅ إشعارات تجديد الاشتراكات
- ✅ إشعارات خارجية (بريد، SMS، Push)
- ✅ قوالب قابلة للتخصيص
- ✅ جدولة الإشعارات
- ✅ أرشفة وتنظيف تلقائي

## 🚀 التطبيق

### 1. **نشر Edge Function:**
```bash
supabase functions deploy enhanced-notifications
```

### 2. **تعيين المتغيرات البيئية:**
```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📡 API Endpoints

### **إنشاء إشعار جديد**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/enhanced-notifications \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "type": "customer",
    "data": {
      "user_id": "user123",
      "customer_id": "cust456",
      "customer_name": "أحمد محمد",
      "customer_email": "ahmed@example.com",
      "subscription_type": "premium",
      "subscription_value": 99.99
    },
    "template_name": "new_customer_welcome",
    "variables": {
      "company_name": "شركتي",
      "customer_name": "أحمد محمد"
    }
  }'
```

### **إرسال إشعار خارجي**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/enhanced-notifications \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_external",
    "data": {
      "notification_id": "notif123",
      "channel": "email",
      "recipient": "user@example.com",
      "external_provider": "Mailgun"
    }
  }'
```

### **جدولة إشعار**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/enhanced-notifications \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule",
    "template_name": "subscription_expiring_soon",
    "variables": {
      "expiry_date": "2024-12-31",
      "auto_renewal": "نعم"
    },
    "schedule_config": {
      "schedule_type": "recurring",
      "interval_minutes": 1440,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    }
  }'
```

### **أرشفة الإشعارات القديمة**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/enhanced-notifications \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "archive"
  }'
```

### **تنظيف الأرشيف**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/enhanced-notifications \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cleanup"
  }'
```

## 🎯 أنواع الإشعارات المدعومة

### **1. إشعارات العملاء (`customer`)**
- ترحيب بالعملاء الجدد
- تفاصيل الاشتراك
- معلومات الاتصال

### **2. إشعارات المدفوعات (`payment`)**
- فشل في الدفع
- تفاصيل المعاملة
- أسباب الفشل وإعادة المحاولة

### **3. إشعارات الاشتراكات (`subscription`)**
- انتهاء الاشتراك قريباً
- تجديد تلقائي
- خطط الاشتراك

### **4. إشعارات النظام (`system`)**
- صيانة النظام
- تحديثات الأمان
- إشعارات عامة

## 📧 القنوات الخارجية المدعومة

### **البريد الإلكتروني (`email`)**
- Mailgun
- SendGrid
- Amazon SES

### **الرسائل النصية (`sms`)**
- Twilio
- Vonage
- AWS SNS

### **إشعارات Push (`push`)**
- Firebase Cloud Messaging
- Apple Push Notifications
- Web Push

### **Webhooks (`webhook`)**
- إرسال إلى APIs خارجية
- تكامل مع أنظمة أخرى

## 🔧 التخصيص

### **متغيرات القوالب**
```json
{
  "company_name": "اسم الشركة",
  "customer_name": "اسم العميل",
  "amount": "المبلغ",
  "currency": "العملة",
  "expiry_date": "تاريخ الانتهاء"
}
```

### **أنواع الجدولة**
- **`once`**: مرة واحدة
- **`recurring`**: تكرار بسيط
- **`cron`**: تكرار معقد (cron expression)

## 📊 مراقبة الأداء

### **عرض الإشعارات**
```sql
-- الإشعارات الأساسية
SELECT * FROM enhanced_notifications ORDER BY created_at DESC;

-- إشعارات العملاء
SELECT n.*, cn.customer_name, cn.subscription_type 
FROM enhanced_notifications n
JOIN customer_notifications cn ON n.id = cn.notification_id;

-- الإشعارات الخارجية
SELECT n.*, en.channel, en.status, en.recipient
FROM enhanced_notifications n
JOIN external_notifications en ON n.id = en.notification_id;
```

### **عرض الجداول**
```sql
-- الجداول المجدولة
SELECT * FROM notification_schedules WHERE is_active = true;

-- القوالب النشطة
SELECT * FROM notification_templates WHERE is_active = true;

-- تفضيلات المستخدمين
SELECT * FROM user_notification_preferences;
```

## 🚨 استكشاف الأخطاء

### **1. إذا فشل إنشاء الإشعار:**
- تحقق من وجود القالب
- تأكد من صحة البيانات
- تحقق من صلاحيات المستخدم

### **2. إذا فشل الإرسال الخارجي:**
- تحقق من إعدادات المزود
- تأكد من صحة المستلم
- تحقق من حالة الشبكة

### **3. إذا فشلت الجدولة:**
- تحقق من صحة تاريخ البداية
- تأكد من نوع الجدولة
- تحقق من الفترات الزمنية

## 💡 أمثلة عملية

### **إشعار عميل جديد**
```typescript
const response = await fetch('/functions/v1/enhanced-notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    type: 'customer',
    data: {
      user_id: 'system',
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email
    },
    template_name: 'new_customer_welcome',
    variables: {
      company_name: 'شركتي',
      customer_name: customer.name
    }
  })
})
```

### **إشعار فشل دفع**
```typescript
const response = await fetch('/functions/v1/enhanced-notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    type: 'payment',
    data: {
      user_id: 'system',
      payment_id: payment.id,
      amount: payment.amount,
      currency: 'SAR',
      failure_reason: 'رصيد غير كافي'
    }
  })
})
```

## 🔄 التكامل مع الأنظمة

### **GitHub Actions**
```yaml
- name: Send Notification
  run: |
    curl -X POST "${{ secrets.NOTIFICATION_URL }}" \
      -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"action": "create", "type": "system", "data": {"title": "Deployment", "message": "تم النشر بنجاح"}}'
```

### **Webhook Triggers**
```typescript
// عند إضافة عميل جديد
if (newCustomer) {
  await sendNotification({
    action: 'create',
    type: 'customer',
    data: newCustomer,
    template_name: 'new_customer_welcome'
  })
}
```

## 📈 الميزات المتقدمة

- ✅ **قوالب ديناميكية** مع متغيرات
- ✅ **جدولة مرنة** للإشعارات
- ✅ **أرشفة تلقائية** للبيانات القديمة
- ✅ **إعادة المحاولة** للإرسال الفاشل
- ✅ **مراقبة الحالة** للإشعارات الخارجية
- ✅ **تخصيص الأولويات** والأنواع
- ✅ **دعم متعدد اللغات** والمناطق الزمنية

---

**ملاحظة:** هذا النظام يوفر أساساً قوياً لإشعارات متقدمة وقابلة للتوسع.


