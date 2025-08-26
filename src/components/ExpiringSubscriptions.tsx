import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  User, 
  Package, 
  DollarSign, 
  RefreshCw, 
  Mail, 
  Phone,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  Bell
} from 'lucide-react';
import { useSubscriptions, useInvoices } from '../hooks/useSupabase';
import { Subscription } from '../types';

const ExpiringSubscriptions: React.FC = () => {
  const { subscriptions, loading, error, updateSubscription } = useSubscriptions();
  const { addInvoice } = useInvoices();
  const [renewingIds, setRenewingIds] = useState<Set<string>>(new Set());
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [notificationResult, setNotificationResult] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');

  // حساب الاشتراكات المنتهية قريباً
  const expiringSubscriptions = useMemo(() => {
    const today = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(today.getDate() + 5);

    return subscriptions
      .filter(subscription => {
        if (subscription.status !== 'active') return false;
        
        const endDate = new Date(subscription.end_date);
        return endDate <= fiveDaysFromNow && endDate >= today;
      })
      .map(subscription => {
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...subscription,
          daysLeft,
          isExpiredToday: daysLeft === 0,
          isExpiredTomorrow: daysLeft === 1
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subscriptions]);

  // تصفية الاشتراكات حسب الفلتر
  const filteredSubscriptions = useMemo(() => {
    switch (filter) {
      case 'today':
        return expiringSubscriptions.filter(sub => sub.daysLeft === 0);
      case 'tomorrow':
        return expiringSubscriptions.filter(sub => sub.daysLeft === 1);
      case 'week':
        return expiringSubscriptions.filter(sub => sub.daysLeft <= 7);
      default:
        return expiringSubscriptions;
    }
  }, [expiringSubscriptions, filter]);

  // إحصائيات
  const stats = useMemo(() => {
    return {
      total: expiringSubscriptions.length,
      today: expiringSubscriptions.filter(sub => sub.daysLeft === 0).length,
      tomorrow: expiringSubscriptions.filter(sub => sub.daysLeft === 1).length,
      thisWeek: expiringSubscriptions.filter(sub => sub.daysLeft <= 7).length,
      totalRevenue: expiringSubscriptions.reduce((sum, sub) => {
        const price = sub.final_price || sub.custom_price || sub.pricing_tier?.price || 0;
        return sum + Number(price);
      }, 0)
    };
  }, [expiringSubscriptions]);

  const handleRenewSubscription = async (subscription: Subscription) => {
    setRenewingIds(prev => new Set(prev).add(subscription.id));
    
    try {
      // تمديد الاشتراك لنفس المدة
      const currentEndDate = new Date(subscription.end_date);
      const newEndDate = new Date(currentEndDate);
      const duration = subscription.pricing_tier?.duration_months || 1;
      newEndDate.setMonth(newEndDate.getMonth() + duration);

      // تحديث الاشتراك
      const result = await updateSubscription(subscription.id, {
        end_date: newEndDate.toISOString().split('T')[0],
        status: 'active'
      });

      if (result.success) {
        // إنشاء فاتورة للتجديد
        const finalPrice = subscription.final_price || subscription.custom_price || subscription.pricing_tier?.price || 0;
        const productName = subscription.pricing_tier?.product?.name || 'غير محدد';
        
        await addInvoice({
          customer_id: subscription.customer_id,
          total_amount: Number(finalPrice),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          invoice_items: [{
            subscription_id: subscription.id,
            amount: Number(finalPrice),
            description: `تجديد ${productName} - ${duration} شهر`
          }]
        });
      }
    } catch (error) {
      console.error('Error renewing subscription:', error);
    } finally {
      setRenewingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(subscription.id);
        return newSet;
      });
    }
  };

  // إرسال التنبيهات التلقائية
  const sendExpiryNotifications = async () => {
    setSendingNotifications(true);
    setNotificationResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-expiry-notifications`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });

      const result = await response.json();

      if (result.success) {
        setNotificationResult(`✅ تم الإرسال بنجاح! ${result.message}`);
      } else {
        setNotificationResult(`❌ خطأ: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      setNotificationResult('❌ حدث خطأ في الاتصال بخدمة البريد الإلكتروني');
    } finally {
      setSendingNotifications(false);
    }
  };

  const getDaysLeftBadge = (daysLeft: number) => {
    if (daysLeft === 0) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (daysLeft === 1) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else if (daysLeft <= 3) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getDaysLeftText = (daysLeft: number) => {
    if (daysLeft === 0) return 'ينتهي اليوم';
    if (daysLeft === 1) return 'ينتهي غداً';
    return `${daysLeft} أيام متبقية`;
  };

  const getDaysLeftIcon = (daysLeft: number) => {
    if (daysLeft === 0) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else if (daysLeft === 1) {
      return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    } else {
      return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل الاشتراكات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 ml-2" />
            الاشتراكات المنتهية قريباً
          </h1>
          <p className="text-gray-600">الاشتراكات التي ستنتهي خلال 5 أيام أو أقل</p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <button
            onClick={sendExpiryNotifications}
            disabled={sendingNotifications}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingNotifications ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Send className="w-4 h-4 ml-2" />
            )}
            إرسال تنبيهات البريد الإلكتروني
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المنتهية</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">تنتهي اليوم</p>
              <p className="text-xl font-bold text-red-600">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg ml-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">تنتهي غداً</p>
              <p className="text-xl font-bold text-orange-600">{stats.tomorrow}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg ml-3">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">هذا الأسبوع</p>
              <p className="text-xl font-bold text-yellow-600">{stats.thisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي القيمة</p>
              <p className="text-lg font-bold text-green-600">ر.س {stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* نتيجة إرسال التنبيهات */}
      {notificationResult && (
        <div className={`p-4 rounded-lg border ${
          notificationResult.startsWith('✅') 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            <Bell className="w-5 h-5 ml-2" />
            <span>{notificationResult}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          الكل ({stats.total})
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'today'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          اليوم ({stats.today})
        </button>
        <button
          onClick={() => setFilter('tomorrow')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'tomorrow'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          غداً ({stats.tomorrow})
        </button>
        <button
          onClick={() => setFilter('week')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'week'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          هذا الأسبوع ({stats.thisWeek})
        </button>
      </div>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد اشتراكات منتهية</h3>
          <p className="text-gray-500">جميع الاشتراكات نشطة ولا تحتاج لتجديد في الوقت الحالي</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الانتهاء</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الأيام المتبقية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القيمة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">معلومات التواصل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 ml-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.customer?.name || 'غير محدد'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {subscription.customer?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 ml-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.pricing_tier?.product?.name || 'غير محدد'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {subscription.pricing_tier?.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 ml-2" />
                        {new Date(subscription.end_date).toLocaleDateString('ar-SA')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getDaysLeftIcon(subscription.daysLeft)}
                        <span className={`mr-2 inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getDaysLeftBadge(subscription.daysLeft)}`}>
                          {getDaysLeftText(subscription.daysLeft)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <span className="text-green-600 font-medium">ر.س</span>
                        <span className="mr-1">
                          {Number(subscription.final_price || subscription.custom_price || subscription.pricing_tier?.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2 space-x-reverse">
                        {subscription.customer?.email && (
                          <a
                            href={`mailto:${subscription.customer.email}`}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                            title="إرسال بريد إلكتروني"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {subscription.customer?.phone && (
                          <a
                            href={`tel:${subscription.customer.phone}`}
                            className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRenewSubscription(subscription)}
                        disabled={renewingIds.has(subscription.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {renewingIds.has(subscription.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-1" />
                        ) : (
                          <RefreshCw className="w-4 h-4 ml-1" />
                        )}
                        تجديد
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alert Message */}
      {stats.today > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 ml-3" />
            <div>
              <h4 className="font-medium text-red-900">تنبيه عاجل!</h4>
              <p className="text-red-800 text-sm mt-1">
                يوجد {stats.today} اشتراك ينتهي اليوم. يرجى التواصل مع العملاء فوراً لتجديد اشتراكاتهم.
              </p>
              <button
                onClick={sendExpiryNotifications}
                disabled={sendingNotifications}
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                إرسال تنبيهات فورية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* معلومات إعداد البريد الإلكتروني */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Mail className="w-5 h-5 text-blue-600 ml-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">إعداد خدمة البريد الإلكتروني:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ✅ تم ربط قاعدة البيانات بـ Resend بنجاح</li>
              <li>• البريد المرسل من: <code className="bg-blue-100 px-1 rounded">onboarding@resend.dev</code></li>
              <li>• سيتم إرسال تنبيهات للاشتراكات التي تنتهي خلال 5 أيام</li>
              <li>• الرسائل تحتوي على تفاصيل الاشتراك وتاريخ الانتهاء</li>
              <li>• ✅ النظام جاهز لإرسال التنبيهات التلقائية</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpiringSubscriptions;