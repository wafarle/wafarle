import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  Database, 
  Users, 
  Package, 
  CreditCard, 
  FileText,
  Lock,
  Key,
  Globe,
  Download,
  Play
} from 'lucide-react';
import ApiService from '../lib/api';

const ApiPage: React.FC = () => {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('customers');
  const [apiKey, setApiKey] = useState<string>('demo_key_123456');
  const [responseData, setResponseData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const baseUrl = 'https://your-domain.com/api/v1';

  const endpoints = {
    customers: {
      name: 'العملاء',
      description: 'جلب قائمة العملاء مع تفاصيلهم',
      method: 'GET',
      path: '/customers',
      params: [
        { name: 'limit', type: 'number', description: 'عدد النتائج (الافتراضي: 50)' },
        { name: 'offset', type: 'number', description: 'عدد النتائج للتخطي (الافتراضي: 0)' },
        { name: 'search', type: 'string', description: 'البحث في الاسم أو الهاتف' },
        { name: 'status', type: 'string', description: 'فلتر حسب حالة الاشتراك (subscribed, not_subscribed)' }
      ],
      example: `${baseUrl}/customers?limit=10&search=أحمد&status=subscribed`
    },
    subscriptions: {
      name: 'الاشتراكات',
      description: 'جلب قائمة الاشتراكات مع تفاصيلها',
      method: 'GET',
      path: '/subscriptions',
      params: [
        { name: 'limit', type: 'number', description: 'عدد النتائج (الافتراضي: 50)' },
        { name: 'offset', type: 'number', description: 'عدد النتائج للتخطي (الافتراضي: 0)' },
        { name: 'status', type: 'string', description: 'فلتر حسب الحالة (active, expired, cancelled)' },
        { name: 'customer_id', type: 'string', description: 'فلتر حسب العميل' },
        { name: 'product_id', type: 'string', description: 'فلتر حسب المنتج' }
      ],
      example: `${baseUrl}/subscriptions?status=active&limit=20`
    },
    invoices: {
      name: 'الفواتير',
      description: 'جلب قائمة الفواتير مع تفاصيلها',
      method: 'GET',
      path: '/invoices',
      params: [
        { name: 'limit', type: 'number', description: 'عدد النتائج (الافتراضي: 50)' },
        { name: 'offset', type: 'number', description: 'عدد النتائج للتخطي (الافتراضي: 0)' },
        { name: 'status', type: 'string', description: 'فلتر حسب الحالة (paid, pending, overdue)' },
        { name: 'customer_id', type: 'string', description: 'فلتر حسب العميل' },
        { name: 'date_from', type: 'string', description: 'تاريخ البداية (YYYY-MM-DD)' },
        { name: 'date_to', type: 'string', description: 'تاريخ النهاية (YYYY-MM-DD)' }
      ],
      example: `${baseUrl}/invoices?status=paid&date_from=2024-01-01&date_to=2024-12-31`
    },
    products: {
      name: 'المنتجات',
      description: 'جلب قائمة المنتجات مع تفاصيلها',
      method: 'GET',
      path: '/products',
      params: [
        { name: 'limit', type: 'number', description: 'عدد النتائج (الافتراضي: 50)' },
        { name: 'offset', type: 'number', description: 'عدد النتائج للتخطي (الافتراضي: 0)' },
        { name: 'category', type: 'string', description: 'فلتر حسب الفئة' },
        { name: 'available', type: 'boolean', description: 'فلتر حسب التوفر (true/false)' }
      ],
      example: `${baseUrl}/products?category=productivity&available=true`
    },
    analytics: {
      name: 'التحليلات',
      description: 'جلب إحصائيات وتحليلات الأعمال',
      method: 'GET',
      path: '/analytics',
      params: [
        { name: 'period', type: 'string', description: 'الفترة (daily, weekly, monthly, yearly)' },
        { name: 'date_from', type: 'string', description: 'تاريخ البداية (YYYY-MM-DD)' },
        { name: 'date_to', type: 'string', description: 'تاريخ النهاية (YYYY-MM-DD)' }
      ],
      example: `${baseUrl}/analytics?period=monthly&date_from=2024-01-01&date_to=2024-12-31`
    }
  };

  const copyToClipboard = async (text: string, endpoint: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEndpoint(endpoint);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch (err) {
      console.error('فشل في نسخ النص:', err);
    }
  };

  const testEndpoint = async () => {
    setLoading(true);
    try {
      let response;
      
      switch (selectedEndpoint) {
        case 'customers':
          response = await ApiService.getCustomers(apiKey, { limit: 5 });
          break;
        case 'subscriptions':
          response = await ApiService.getSubscriptions(apiKey, { limit: 5 });
          break;
        case 'invoices':
          response = await ApiService.getInvoices(apiKey, { limit: 5 });
          break;
        case 'products':
          response = await ApiService.getProducts(apiKey, { limit: 5 });
          break;
        case 'analytics':
          response = await ApiService.getAnalytics(apiKey);
          break;
        default:
          response = await ApiService.getCustomers(apiKey, { limit: 5 });
      }

      if (response.success) {
        setResponseData(response.data);
      } else {
        setResponseData({ error: response.error, message: response.message });
      }
    } catch (error) {
      setResponseData({ error: 'حدث خطأ في الاتصال', message: 'فشل في الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  const generateCodeExample = (endpoint: string) => {
    const selected = endpoints[endpoint as keyof typeof endpoints];
    const params = selected.params.map(p => `  ${p.name}: "${p.type === 'number' ? '10' : p.type === 'boolean' ? 'true' : 'example'}"`).join(',\n');
    
    return `// JavaScript/Node.js
const response = await fetch('${selected.example}', {
  method: '${selected.method}',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();

// PHP
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, '${selected.example}');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ${apiKey}',
  'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);

// Python
import requests

response = requests.get('${selected.example}', headers={
  'Authorization': f'Bearer {apiKey}',
  'Content-Type': 'application/json'
})
data = response.json()`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <div className="flex items-center mb-4">
          <Code className="w-8 h-8 text-blue-600 ml-3" />
          <div>
            <h1 className="text-3xl font-bold text-blue-900">API Documentation</h1>
            <p className="text-blue-700">استخدم بياناتك في مواقع أخرى عبر نقاط النهاية API</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-blue-200">
          <div className="flex items-center mb-3">
            <Key className="w-5 h-5 text-blue-600 ml-2" />
            <span className="font-semibold text-blue-900">API Key:</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل مفتاح API الخاص بك"
            />
            <button
              onClick={() => copyToClipboard(apiKey, 'api_key')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              {copiedEndpoint === 'api_key' ? <Check className="w-4 h-4 ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
              {copiedEndpoint === 'api_key' ? 'تم النسخ' : 'نسخ'}
            </button>
          </div>
        </div>
      </div>

      {/* Endpoints Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(endpoints).map(([key, endpoint]) => (
          <button
            key={key}
            onClick={() => setSelectedEndpoint(key)}
            className={`p-4 rounded-lg border transition-all ${
              selectedEndpoint === key
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center mb-2">
              {key === 'customers' && <Users className="w-5 h-5 text-blue-600 ml-2" />}
              {key === 'subscriptions' && <Package className="w-5 h-5 text-green-600 ml-2" />}
              {key === 'invoices' && <CreditCard className="w-5 h-5 text-purple-600 ml-2" />}
              {key === 'products' && <Package className="w-5 h-5 text-orange-600 ml-2" />}
              {key === 'analytics' && <Database className="w-5 h-5 text-indigo-600 ml-2" />}
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {endpoint.method}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{endpoint.name}</h3>
            <p className="text-sm text-gray-600 text-right">{endpoint.description}</p>
          </button>
        ))}
      </div>

      {/* Selected Endpoint Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{endpoints[selectedEndpoint as keyof typeof endpoints].name}</h2>
              <p className="text-gray-600">{endpoints[selectedEndpoint as keyof typeof endpoints].description}</p>
            </div>
            <button
              onClick={testEndpoint}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
            >
              {loading ? <Play className="w-4 h-4 ml-2 animate-spin" /> : <Play className="w-4 h-4 ml-2" />}
              {loading ? 'جاري الاختبار...' : 'اختبار API'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Endpoint Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Globe className="w-5 h-5 text-blue-600 ml-2" />
                معلومات نقطة النهاية
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">المسار:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono">
                      {endpoints[selectedEndpoint as keyof typeof endpoints].path}
                    </code>
                    <button
                      onClick={() => copyToClipboard(endpoints[selectedEndpoint as keyof typeof endpoints].path, 'path')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {copiedEndpoint === 'path' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">الطريقة:</span>
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                    {endpoints[selectedEndpoint as keyof typeof endpoints].method}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">المثال:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono flex-1">
                      {endpoints[selectedEndpoint as keyof typeof endpoints].example}
                    </code>
                    <button
                      onClick={() => copyToClipboard(endpoints[selectedEndpoint as keyof typeof endpoints].example, 'example')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {copiedEndpoint === 'example' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Database className="w-5 h-5 text-green-600 ml-2" />
                المعاملات
              </h3>
              <div className="space-y-2">
                {endpoints[selectedEndpoint as keyof typeof endpoints].params.map((param, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {param.name}
                    </span>
                    <span className="text-sm text-gray-600">({param.type})</span>
                    <span className="text-sm text-gray-700 flex-1">{param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Code className="w-5 h-5 text-purple-600 ml-2" />
              أمثلة الكود
            </h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-gray-100 text-sm">
                <code>{generateCodeExample(selectedEndpoint)}</code>
              </pre>
            </div>
            <button
              onClick={() => copyToClipboard(generateCodeExample(selectedEndpoint), 'code')}
              className="mt-3 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              {copiedEndpoint === 'code' ? <Check className="w-4 h-4 ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
              {copiedEndpoint === 'code' ? 'تم نسخ الكود' : 'نسخ الكود'}
            </button>
          </div>

          {/* Response Preview */}
          {responseData && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Download className="w-5 h-5 text-green-600 ml-2" />
                معاينة الاستجابة
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <pre className="text-gray-800 text-sm">
                  <code>{JSON.stringify(responseData, null, 2)}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security & Rate Limiting */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
          <Lock className="w-5 h-5 text-yellow-600 ml-2" />
          الأمان والحدود
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">الأمان</h4>
            <ul className="space-y-1 text-sm text-yellow-700">
              <li>• استخدم HTTPS دائماً</li>
              <li>• احتفظ بمفتاح API آمناً</li>
              <li>• لا تشارك مفتاح API مع أي شخص</li>
              <li>• استخدم رؤوس HTTP آمنة</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">حدود الاستخدام</h4>
            <ul className="space-y-1 text-sm text-yellow-700">
              <li>• 1000 طلب في الساعة</li>
              <li>• 10000 طلب في اليوم</li>
              <li>• حد أقصى 100 نتيجة لكل طلب</li>
              <li>• مهلة استجابة: 30 ثانية</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
          <ExternalLink className="w-5 h-5 text-green-600 ml-2" />
          الدعم والمساعدة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <h4 className="font-semibold text-green-800 mb-2">التوثيق الكامل</h4>
            <p className="text-sm text-green-700 mb-3">دليل شامل لجميع نقاط النهاية</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              عرض التوثيق
            </button>
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-green-800 mb-2">أمثلة الكود</h4>
            <p className="text-sm text-green-700 mb-3">أمثلة عملية بلغات مختلفة</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              عرض الأمثلة
            </button>
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-green-800 mb-2">الدعم الفني</h4>
            <p className="text-sm text-green-700 mb-3">مساعدة فورية عند الحاجة</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              تواصل معنا
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPage;
