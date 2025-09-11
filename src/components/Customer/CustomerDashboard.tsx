import React, { useState, useEffect } from 'react';
import { 
  Package, 
  CreditCard, 
  FileText, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Star,
  Loader2,
  User,
  ShoppingCart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerStats {
  activeSubscriptions: number;
  totalPaid: number;
  pendingInvoices: number;
  expiringSubscriptions: number;
}

interface CustomerDashboardProps {
  onPageChange: (page: string) => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CustomerStats>({
    activeSubscriptions: 0,
    totalPaid: 0,
    pendingInvoices: 0,
    expiringSubscriptions: 0
  });
  const [recentSubscriptions, setRecentSubscriptions] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerData();
  }, [user]);

  const fetchCustomerData = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      // البحث عن بيانات العميل
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single();

      if (customerError) {
        console.error('Customer not found:', customerError);
        setError('لم يتم العثور على بيانات العميل');
        return;
      }

      // جلب الاشتراكات
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          pricing_tier:pricing_tiers(*,
            product:products(*)
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // جلب الفواتير
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // حساب الإحصائيات
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount), 0) || 0;
      const pendingInvoices = invoices?.filter(i => i.status === 'pending').length || 0;
      
      // حساب الاشتراكات المنتهية قريباً
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const expiringSubscriptions = subscriptions?.filter(s => {
        if (s.status !== 'active') return false;
        const endDate = new Date(s.end_date);
        return endDate <= thirtyDaysFromNow && endDate > today;
      }).length || 0;

      setStats({
        activeSubscriptions,
        totalPaid,
        pendingInvoices,
        expiringSubscriptions
      });

      setRecentSubscriptions(subscriptions?.slice(0, 5) || []);
      setRecentInvoices(invoices?.slice(0, 5) || []);

    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="mr-2 text-gray-600">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchCustomerData}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">مرحباً بك في لوحة التحكم</h1>
            <p className="text-green-100 text-lg">إدارة اشتراكاتك ومتابعة فواتيرك بكل سهولة</p>
          </div>
          <div className="hidden md:block">
            <User className="w-24 h-24 text-green-200" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">الاشتراكات النشطة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي المدفوع</p>
              <p className="text-2xl font-bold text-gray-900">ر.س {stats.totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">الفواتير المعلقة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">ستنتهي قريباً</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiringSubscriptions}</p>
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
              <Package className="w-5 h-5 ml-2 text-green-600" />
              اشتراكاتي الحديثة
            </h3>
          </div>
          <div className="space-y-4">
            {recentSubscriptions.length > 0 ? (
              recentSubscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center ml-3">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{subscription.pricing_tier?.product?.name || 'غير محدد'}</p>
                      <p className="text-sm text-gray-500">{subscription.pricing_tier?.name}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                      subscription.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {subscription.status === 'active' ? 'نشط' : 
                       subscription.status === 'expired' ? 'منتهي' : 'ملغي'}
                    </span>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Calendar className="w-3 h-3 ml-1" />
                      {new Date(subscription.end_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد اشتراكات</p>
                <button 
                  onClick={() => onPageChange('request-subscription')}
                  className="mt-2 text-green-600 hover:text-green-700 font-medium"
                >
                  طلب اشتراك جديد
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 ml-2 text-blue-600" />
              فواتيري الحديثة
            </h3>
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
                      <FileText className={`w-5 h-5 ${
                        invoice.status === 'paid' ? 'text-green-600' : 
                        invoice.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        فاتورة #{invoice.id.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">ر.س {Number(invoice.total_amount || invoice.amount).toFixed(2)}</p>
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
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد فواتير</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => onPageChange('request-subscription')}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center shadow-lg"
          >
            <ShoppingCart className="w-5 h-5 ml-2" />
            طلب اشتراك جديد
          </button>
          <button 
            onClick={() => onPageChange('subscriptions')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center shadow-lg"
          >
            <Package className="w-5 h-5 ml-2" />
            عرض اشتراكاتي
          </button>
          <button 
            onClick={() => onPageChange('invoices')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center shadow-lg"
          >
            <FileText className="w-5 h-5 ml-2" />
            عرض فواتيري
          </button>
        </div>
      </div>

      {/* Alerts */}
      {stats.expiringSubscriptions > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600 ml-3" />
            <div>
              <h4 className="font-medium text-yellow-900">تنبيه: اشتراكات تنتهي قريباً!</h4>
              <p className="text-yellow-800 text-sm mt-1">
                لديك {stats.expiringSubscriptions} اشتراك ستنتهي خلال 30 يوم. يرجى تجديدها قبل انتهاء الصلاحية.
              </p>
              <button 
                onClick={() => onPageChange('subscriptions')}
                className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                عرض التفاصيل
              </button>
            </div>
          </div>
        </div>
      )}

      {stats.pendingInvoices > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-red-600 ml-3" />
            <div>
              <h4 className="font-medium text-red-900">فواتير غير مدفوعة!</h4>
              <p className="text-red-800 text-sm mt-1">
                لديك {stats.pendingInvoices} فاتورة غير مدفوعة. يرجى دفعها لتجنب إيقاف الخدمة.
              </p>
              <button 
                onClick={() => onPageChange('invoices')}
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                عرض الفواتير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Message for New Customers */}
      {stats.activeSubscriptions === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center">
            <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h4 className="font-semibold text-blue-900 mb-2">مرحباً بك!</h4>
            <p className="text-blue-800 text-sm mb-4">
              نحن سعداء بانضمامك إلينا. ابدأ رحلتك معنا بطلب أول اشتراك.
            </p>
            <button 
              onClick={() => onPageChange('request-subscription')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              استكشف خدماتنا
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;