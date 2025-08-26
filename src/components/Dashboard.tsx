import React from 'react';
import { Users, CreditCard, DollarSign, AlertTriangle, Loader2, TrendingUp, Calendar, Package } from 'lucide-react';
import { useDashboardStats, useSubscriptions, useInvoices } from '../hooks/useSupabase';

const Dashboard: React.FC = () => {
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats();
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions();
  const { invoices, loading: invoicesLoading } = useInvoices();

  const recentSubscriptions = subscriptions.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  if (statsLoading || subscriptionsLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{statsError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">مرحباً بك في نظام إدارة الاشتراكات</h1>
            <p className="text-blue-100 text-lg">تابع أداء أعمالك وإدارة اشتراكاتك بكل سهولة</p>
          </div>
          <div className="hidden md:block">
            <Package className="w-24 h-24 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_customers}</p>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 ml-1" />
                +12% من الشهر الماضي
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">الاشتراكات النشطة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_subscriptions}</p>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 ml-1" />
                +8% من الشهر الماضي
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-gray-900">ر.س {stats.total_revenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 ml-1" />
                +15% من الشهر الماضي
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">الفواتير المعلقة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_invoices}</p>
              <p className="text-xs text-red-600 flex items-center mt-1">
                <AlertTriangle className="w-3 h-3 ml-1" />
                تحتاج متابعة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Subscriptions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 ml-2 text-blue-600" />
              الاشتراكات الحديثة
            </h3>
            <span className="text-sm text-gray-500">آخر 5 اشتراكات</span>
          </div>
          <div className="space-y-4">
            {recentSubscriptions.length > 0 ? (
              recentSubscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center ml-3">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{subscription.customer?.name || 'غير محدد'}</p>
                      <p className="text-sm text-gray-500">{subscription.pricing_tier?.product?.name || 'غير محدد'}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">ر.س {Number(subscription.pricing_tier?.price || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Calendar className="w-3 h-3 ml-1" />
                      {new Date(subscription.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد اشتراكات حديثة</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 ml-2 text-green-600" />
              الفواتير الحديثة
            </h3>
            <span className="text-sm text-gray-500">آخر 5 فواتير</span>
          </div>
          <div className="space-y-4">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 ${
                      invoice.status === 'paid' ? 'bg-green-100' : 
                      invoice.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <DollarSign className={`w-5 h-5 ${
                        invoice.status === 'paid' ? 'text-green-600' : 
                        invoice.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{invoice.customer?.name || 'غير محدد'}</p>
                      <p className="text-sm text-gray-500">
                        فاتورة #{invoice.id.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">ر.س {Number(invoice.amount).toFixed(2)}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status === 'paid' ? 'مدفوع' :
                       invoice.status === 'pending' ? 'معلق' : 'متأخر'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد فواتير حديثة</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 ml-2" />
            إضافة عميل جديد
          </button>
          <button className="bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center shadow-lg">
            <CreditCard className="w-5 h-5 ml-2" />
            إنشاء اشتراك جديد
          </button>
          <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center shadow-lg">
            <DollarSign className="w-5 h-5 ml-2" />
            إصدار فاتورة
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;