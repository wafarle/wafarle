# 📚 API Documentation - إدارة الاشتراكات

## 🚀 نظرة عامة

هذا API يتيح لك الوصول إلى بيانات نظام إدارة الاشتراكات من مواقع أخرى أو تطبيقات خارجية. يوفر نقاط نهاية آمنة لجلب العملاء، الاشتراكات، الفواتير، المنتجات، والتحليلات.

## 🔑 المصادقة

### مفتاح API
يجب تضمين مفتاح API في رأس الطلب:
```http
Authorization: Bearer YOUR_API_KEY
```

### مفاتيح API المتاحة
- **مفتاح تجريبي**: `demo_key_123456` (للتطوير والاختبار)
- **مفتاح الإنتاج**: `live_key_XXXXXXXX` (للإنتاج)

## 📡 نقاط النهاية

### 1. العملاء - `/customers`

#### جلب قائمة العملاء
```http
GET /customers
```

#### المعاملات
| المعامل | النوع | الوصف | مثال |
|---------|-------|--------|------|
| `limit` | number | عدد النتائج (الافتراضي: 50) | `?limit=10` |
| `offset` | number | عدد النتائج للتخطي (الافتراضي: 0) | `?offset=20` |
| `search` | string | البحث في الاسم أو الهاتف | `?search=أحمد` |
| `status` | string | فلتر حسب حالة الاشتراك | `?status=subscribed` |

#### مثال الطلب
```bash
curl -X GET "https://your-domain.com/api/v1/customers?limit=10&search=أحمد" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"
```

#### مثال الاستجابة
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "phone": "+966501234567",
      "address": "الرياض، المملكة العربية السعودية",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "subscriptions_count": 2,
      "total_paid": 1500.00,
      "status": "subscribed",
      "subscriptions": [
        {
          "id": "sub-uuid",
          "product_name": "حزمة الإنتاجية",
          "status": "active",
          "start_date": "2024-01-01",
          "end_date": "2024-12-31",
          "amount": 750.00
        }
      ]
    }
  ]
}
```

---

### 2. الاشتراكات - `/subscriptions`

#### جلب قائمة الاشتراكات
```http
GET /subscriptions
```

#### المعاملات
| المعامل | النوع | الوصف | مثال |
|---------|-------|--------|------|
| `limit` | number | عدد النتائج (الافتراضي: 50) | `?limit=20` |
| `offset` | number | عدد النتائج للتخطي (الافتراضي: 0) | `?offset=40` |
| `status` | string | فلتر حسب الحالة | `?status=active` |
| `customer_id` | string | فلتر حسب العميل | `?customer_id=uuid` |
| `product_id` | string | فلتر حسب المنتج | `?product_id=uuid` |

#### مثال الطلب
```bash
curl -X GET "https://your-domain.com/api/v1/subscriptions?status=active&limit=20" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"
```

#### مثال الاستجابة
```json
{
  "success": true,
  "data": [
    {
      "id": "sub-uuid",
      "customer": {
        "id": "customer-uuid",
        "name": "أحمد محمد",
        "email": "ahmed@example.com",
        "phone": "+966501234567"
      },
      "product": {
        "id": "product-uuid",
        "name": "حزمة الإنتاجية",
        "category": "productivity"
      },
      "pricing_tier": {
        "id": "tier-uuid",
        "name": "الخطة السنوية",
        "price": 750.00,
        "duration_months": 12
      },
      "duration_months": 12,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "status": "active",
      "custom_price": null,
      "discount_percentage": 0,
      "final_price": 750.00,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 3. الفواتير - `/invoices`

#### جلب قائمة الفواتير
```http
GET /invoices
```

#### المعاملات
| المعامل | النوع | الوصف | مثال |
|---------|-------|--------|------|
| `limit` | number | عدد النتائج (الافتراضي: 50) | `?limit=15` |
| `offset` | number | عدد النتائج للتخطي (الافتراضي: 0) | `?offset=30` |
| `status` | string | فلتر حسب الحالة | `?status=paid` |
| `customer_id` | string | فلتر حسب العميل | `?customer_id=uuid` |
| `date_from` | string | تاريخ البداية (YYYY-MM-DD) | `?date_from=2024-01-01` |
| `date_to` | string | تاريخ النهاية (YYYY-MM-DD) | `?date_to=2024-12-31` |

#### مثال الطلب
```bash
curl -X GET "https://your-domain.com/api/v1/invoices?status=paid&date_from=2024-01-01&date_to=2024-12-31" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"
```

#### مثال الاستجابة
```json
{
  "success": true,
  "data": [
    {
      "id": "invoice-uuid",
      "invoice_number": "#12345678",
      "customer": {
        "id": "customer-uuid",
        "name": "أحمد محمد",
        "email": "ahmed@example.com",
        "phone": "+966501234567"
      },
      "amount": 750.00,
      "status": "paid",
      "issue_date": "2024-01-01",
      "due_date": "2024-01-31",
      "paid_date": "2024-01-15",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T00:00:00Z",
      "items": [
        {
          "id": "item-uuid",
          "subscription": {
            "id": "sub-uuid",
            "product_name": "حزمة الإنتاجية",
            "category": "productivity"
          },
          "amount": 750.00,
          "description": "اشتراك سنوي - حزمة الإنتاجية"
        }
      ],
      "subscription": {
        "id": "sub-uuid",
        "product_name": "حزمة الإنتاجية",
        "category": "productivity"
      }
    }
  ]
}
```

---

### 4. المنتجات - `/products`

#### جلب قائمة المنتجات
```http
GET /products
```

#### المعاملات
| المعامل | النوع | الوصف | مثال |
|---------|-------|--------|------|
| `limit` | number | عدد النتائج (الافتراضي: 50) | `?limit=25` |
| `offset` | number | عدد النتائج للتخطي (الافتراضي: 0) | `?offset=50` |
| `category` | string | فلتر حسب الفئة | `?category=productivity` |
| `available` | boolean | فلتر حسب التوفر | `?available=true` |

#### مثال الطلب
```bash
curl -X GET "https://your-domain.com/api/v1/products?category=productivity&available=true" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"
```

#### مثال الاستجابة
```json
{
  "success": true,
  "data": [
    {
      "id": "product-uuid",
      "name": "حزمة الإنتاجية",
      "description": "حزمة شاملة لزيادة الإنتاجية",
      "category": "productivity",
      "price": 750.00,
      "features": [
        "إدارة المهام",
        "تقويم ذكي",
        "تقارير مفصلة",
        "دعم فني 24/7"
      ],
      "icon": "Package",
      "color": "from-blue-600 to-blue-800",
      "is_popular": true,
      "max_users": 50,
      "available_slots": 45,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 5. التحليلات - `/analytics`

#### جلب التحليلات والإحصائيات
```http
GET /analytics
```

#### المعاملات
| المعامل | النوع | الوصف | مثال |
|---------|-------|--------|------|
| `period` | string | الفترة (الافتراضي: monthly) | `?period=daily` |
| `date_from` | string | تاريخ البداية (YYYY-MM-DD) | `?date_from=2024-01-01` |
| `date_to` | string | تاريخ النهاية (YYYY-MM-DD) | `?date_to=2024-12-31` |

#### مثال الطلب
```bash
curl -X GET "https://your-domain.com/api/v1/analytics?period=monthly&date_from=2024-01-01&date_to=2024-12-31" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"
```

#### مثال الاستجابة
```json
{
  "success": true,
  "data": {
    "total_customers": 150,
    "total_subscriptions": 89,
    "total_invoices": 156,
    "total_revenue": 125000.00,
    "active_subscriptions": 67,
    "monthly_growth": 12.5,
    "period": "monthly",
    "date_range": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  }
}
```

---

## 🔒 الأمان والحدود

### حدود الاستخدام
- **1000 طلب في الساعة** لكل مفتاح API
- **10000 طلب في اليوم** لكل مفتاح API
- **حد أقصى 100 نتيجة** لكل طلب
- **مهلة استجابة: 30 ثانية**

### أفضل الممارسات الأمنية
1. **استخدم HTTPS دائماً** لجميع الطلبات
2. **احتفظ بمفتاح API آمناً** ولا تشاركه مع أي شخص
3. **استخدم رؤوس HTTP آمنة** في جميع الطلبات
4. **راقب استخدام API** بانتظام
5. **استخدم مفاتيح API منفصلة** للتطوير والإنتاج

---

## 💻 أمثلة الكود

### JavaScript/Node.js
```javascript
const fetchCustomers = async (apiKey) => {
  try {
    const response = await fetch('https://your-domain.com/api/v1/customers?limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('العملاء:', data.data);
    } else {
      console.error('خطأ:', data.error);
    }
  } catch (error) {
    console.error('فشل في الاتصال:', error);
  }
};

// استخدام
fetchCustomers('demo_key_123456');
```

### PHP
```php
function fetchCustomers($apiKey) {
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, 'https://your-domain.com/api/v1/customers?limit=10');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if ($data['success']) {
            return $data['data'];
        } else {
            throw new Exception($data['error']);
        }
    } else {
        throw new Exception('فشل في الاتصال: ' . $httpCode);
    }
}

// استخدام
try {
    $customers = fetchCustomers('demo_key_123456');
    print_r($customers);
} catch (Exception $e) {
    echo 'خطأ: ' . $e->getMessage();
}
```

### Python
```python
import requests
import json

def fetch_customers(api_key):
    url = 'https://your-domain.com/api/v1/customers'
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    params = {'limit': 10}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data['success']:
            return data['data']
        else:
            raise Exception(data['error'])
            
    except requests.exceptions.RequestException as e:
        raise Exception(f'فشل في الاتصال: {e}')
    except json.JSONDecodeError:
        raise Exception('استجابة غير صحيحة من الخادم')

# استخدام
try:
    customers = fetch_customers('demo_key_123456')
    print('العملاء:', customers)
except Exception as e:
    print('خطأ:', e)
```

### cURL
```bash
# جلب العملاء
curl -X GET "https://your-domain.com/api/v1/customers?limit=10" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"

# جلب الاشتراكات النشطة
curl -X GET "https://your-domain.com/api/v1/subscriptions?status=active" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"

# جلب الفواتير المدفوعة
curl -X GET "https://your-domain.com/api/v1/invoices?status=paid" \
  -H "Authorization: Bearer demo_key_123456" \
  -H "Content-Type: application/json"
```

---

## 📊 رموز الحالة HTTP

| الرمز | الوصف |
|-------|--------|
| `200` | نجح الطلب |
| `400` | طلب غير صحيح (بيانات مفقودة أو غير صحيحة) |
| `401` | غير مصرح (مفتاح API غير صحيح أو مفقود) |
| `403` | محظور (تجاوز حدود الاستخدام) |
| `404` | غير موجود (نقطة النهاية غير موجودة) |
| `429` | طلبات كثيرة (تجاوز حدود الاستخدام) |
| `500` | خطأ في الخادم |

---

## 🚨 رسائل الخطأ

### أمثلة على رسائل الخطأ
```json
{
  "success": false,
  "error": "مفتاح API غير صحيح",
  "message": "يرجى التأكد من مفتاح API الخاص بك"
}
```

```json
{
  "success": false,
  "error": "تجاوز حدود الاستخدام",
  "message": "لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة لاحقاً"
}
```

```json
{
  "success": false,
  "error": "بيانات غير صحيحة",
  "message": "المعامل 'limit' يجب أن يكون رقماً موجباً"
}
```

---

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. خطأ 401 - غير مصرح
**المشكلة**: مفتاح API غير صحيح أو مفقود
**الحل**: 
- تأكد من تضمين مفتاح API في رأس `Authorization`
- تأكد من صحة مفتاح API
- استخدم التنسيق: `Bearer YOUR_API_KEY`

#### 2. خطأ 429 - طلبات كثيرة
**المشكلة**: تجاوز حدود الاستخدام
**الحل**:
- انتظر حتى إعادة تعيين العداد
- قلل من عدد الطلبات
- استخدم التخزين المؤقت للبيانات

#### 3. خطأ 500 - خطأ في الخادم
**المشكلة**: خطأ داخلي في الخادم
**الحل**:
- حاول مرة أخرى بعد قليل
- تحقق من حالة الخادم
- تواصل مع الدعم الفني

---

## 📞 الدعم والمساعدة

### موارد الدعم
- **التوثيق الكامل**: [رابط التوثيق]
- **أمثلة الكود**: [رابط الأمثلة]
- **الدعم الفني**: [رابط الدعم]

### معلومات الاتصال
- **البريد الإلكتروني**: support@your-domain.com
- **الهاتف**: +966542130017
- **ساعات العمل**: الأحد - الخميس، 9 ص - 6 م (توقيت السعودية)

---

## 📝 ملاحظات مهمة

1. **البيانات باللغة العربية**: جميع النصوص والرسائل باللغة العربية
2. **التوقيت**: جميع التواريخ بتوقيت UTC
3. **التحديثات**: يتم تحديث API بانتظام، تحقق من التوثيق للحصول على أحدث التغييرات
4. **النسخ الاحتياطية**: احتفظ بنسخة احتياطية من البيانات المهمة
5. **الاختبار**: استخدم المفتاح التجريبي للاختبار قبل الانتقال للإنتاج

---

## 🔄 تاريخ الإصدارات

| الإصدار | التاريخ | التغييرات |
|----------|---------|------------|
| 1.0.0 | 2024-01-01 | الإصدار الأولي مع نقاط النهاية الأساسية |
| 1.1.0 | 2024-01-15 | إضافة نقطة نهاية التحليلات |
| 1.2.0 | 2024-02-01 | تحسينات الأمان والتحقق |

---

**آخر تحديث**: 2024-01-01  
**الإصدار الحالي**: 1.2.0
