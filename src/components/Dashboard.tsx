import React from 'react';
import { Users, CreditCard, DollarSign, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  // Mock data - will be replaced with real Supabase data
  const stats = {
    total_customers: 156,
    active_subscriptions: 134,
    total_revenue: 45000,
    pending_invoices: 12
  };

  const recentSubscriptions = [
    { id: 1, customer: 'أحمد محمد', plan: 'خطة أساسية', amount: 200, date: '2024-01-15' },
    { id: 2, customer: 'فاطمة علي', plan: 'خطة متقدمة', amount: 400, date: '2024-01-14' },
    { id: 3, customer: 'محمد حسن', plan: 'خطة مميزة', amount: 600, date: '2024-01-13' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_customers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">الاشتراكات النشطة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_subscriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_revenue.toLocaleString()} ريال</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">الفواتير المعلقة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_invoices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Subscriptions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الاشتراكات الحديثة</h3>
          <div className="space-y-4">
            {recentSubscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{subscription.customer}</p>
                  <p className="text-sm text-gray-500">{subscription.plan}</p>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{subscription.amount} ريال</p>
                  <p className="text-sm text-gray-500">{subscription.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              إضافة عميل جديد
            </button>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
              إنشاء اشتراك جديد
            </button>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
              إصدار فاتورة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;