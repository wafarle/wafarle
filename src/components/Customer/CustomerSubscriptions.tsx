import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerSubscription {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  final_price: number;
  discount_percentage: number;
  pricing_tier: {
    name: string;
    duration_months: number;
    product: {
      name: string;
      description: string;
      features: string[];
      icon: string;
      color: string;
    };
  };
}

interface CustomerSubscriptionsProps {
  onPageChange: (page: string) => void;
}

const CustomerSubscriptions: React.FC<CustomerSubscriptionsProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user?.email && !user?.phone && !user?.user_metadata?.phone) {
      console.log('No user identification available for subscriptions');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching subscriptions for user:', { email: user?.email, phone: user?.phone, metadata: user?.user_metadata });
      
      // البحث عن العميل بطرق متعددة
      let customer = null;
      
      // البحث بمعرف المصادقة أولاً
      if (user.id) {
        const { data } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        if (data) {
          customer = data;
        }
      }
      
      // البحث بالبريد الإلكتروني
      if (!customer && user.email) {
        const { data } = await supabase
          .from('customers')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (data) {
          customer = data;
        }
      }

      // البحث برقم الهاتف
      if (!customer) {
        const phoneNumbers = [
          user.phone,
          user.user_metadata?.phone
        ].filter(Boolean);
        
        for (const phoneNumber of phoneNumbers) {
          if (customer) break;
          
          // البحث في phone_auth
          const { data: phoneAuthData } = await supabase
            .from('customers')
            .select('id')
            .eq('phone_auth', phoneNumber)
            .maybeSingle();
          
          if (phoneAuthData) {
            customer = phoneAuthData;
            break;
          }
          
          // البحث في phone العادي
          const { data: phoneData } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', phoneNumber)
            .maybeSingle();
          
          if (phoneData) {
            customer = phoneData;
            break;
          }
        }
      }
      
      console.log('Customer found for subscriptions:', customer);
      
      if (!customer) {
        setError('لم يتم العثور على بيانات العميل في النظام');
        return;
      }

      // جلب الاشتراكات
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          pricing_tier:pricing_tiers(*,
            product:products(*)
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('حدث خطأ في تحميل الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <Clock className="w-5 h-5 text-gray-600" />;
      default:
        return null;
    }
  };

  const getDaysLeft = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleShowDetails = (subscription: CustomerSubscription) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="mr-2 text-gray-600">جاري تحميل اشتراكاتك...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchSubscriptions}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">اشتراكاتي</h1>
          <p className="text-gray-600">عرض وإدارة جميع اشتراكاتك</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onPageChange('request-subscription')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <CreditCard className="w-4 h-4 ml-2" />
            طلب اشتراك جديد
          </button>
          <button
            onClick={fetchSubscriptions}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">النشطة</p>
              <p className="text-xl font-bold text-green-600">
                {subscriptions.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">المنتهية</p>
              <p className="text-xl font-bold text-red-600">
                {subscriptions.filter(s => s.status === 'expired').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الاشتراكات</p>
              <p className="text-xl font-bold text-gray-900">{subscriptions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Grid */}
      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد اشتراكات</h3>
          <p className="text-gray-600 mb-6">لم تقم بطلب أي اشتراكات بعد</p>
          <button 
            onClick={() => onPageChange('request-subscription')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            طلب اشتراك جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((subscription) => {
            const daysLeft = getDaysLeft(subscription.end_date);
            const isExpiringSoon = subscription.status === 'active' && daysLeft <= 30;
            
            return (
              <div 
                key={subscription.id} 
                className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden ${
                  subscription.status === 'active' 
                    ? isExpiringSoon ? 'border-yellow-300' : 'border-green-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Product Header */}
                <div className={`bg-gradient-to-r ${subscription.pricing_tier.product.color} p-4 text-white`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{subscription.pricing_tier.product.name}</h3>
                      <p className="text-sm opacity-90">{subscription.pricing_tier.name}</p>
                    </div>
                    {getStatusIcon(subscription.status)}
                  </div>
                </div>

                {/* Subscription Details */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                      {getStatusText(subscription.status)}
                    </span>
                    {isExpiringSoon && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        ينتهي قريباً
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">تاريخ البداية:</span>
                      <span className="font-medium">{new Date(subscription.start_date).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">تاريخ الانتهاء:</span>
                      <span className="font-medium">{new Date(subscription.end_date).toLocaleDateString('ar-SA')}</span>
                    </div>
                    {subscription.status === 'active' && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">الأيام المتبقية:</span>
                        <span className={`font-bold ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {daysLeft} يوم
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">القيمة:</span>
                      <span className="font-bold text-green-600">ر.س {Number(subscription.final_price || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleShowDetails(subscription)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription Details Modal */}
      {showDetailsModal && selectedSubscription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`bg-gradient-to-r ${selectedSubscription.pricing_tier.product.color} text-white p-6 rounded-t-xl`}>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedSubscription.pricing_tier.product.name}</h2>
                  <p className="opacity-90">{selectedSubscription.pricing_tier.name}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(selectedSubscription.status)}
                  <span className="mr-3 font-medium text-gray-900">حالة الاشتراك:</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedSubscription.status)}`}>
                  {getStatusText(selectedSubscription.status)}
                </span>
              </div>

              {/* Dates and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-5 h-5 text-blue-600 ml-2" />
                    <span className="font-medium text-blue-900">تاريخ البداية</span>
                  </div>
                  <p className="text-lg text-blue-800">
                    {new Date(selectedSubscription.start_date).toLocaleDateString('ar-SA', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-5 h-5 text-purple-600 ml-2" />
                    <span className="font-medium text-purple-900">تاريخ الانتهاء</span>
                  </div>
                  <p className="text-lg text-purple-800">
                    {new Date(selectedSubscription.end_date).toLocaleDateString('ar-SA', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {selectedSubscription.status === 'active' && (
                    <p className="text-sm text-purple-600 mt-1">
                      {getDaysLeft(selectedSubscription.end_date)} يوم متبقي
                    </p>
                  )}
                </div>
              </div>

              {/* Product Description */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">وصف المنتج</h3>
                <p className="text-gray-700">{selectedSubscription.pricing_tier.product.description}</p>
              </div>

              {/* Features */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">الميزات المتاحة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedSubscription.pricing_tier.product.features.filter(f => f.trim()).map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 ml-2" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">معلومات الدفع</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-700">قيمة الاشتراك:</span>
                    <span className="text-xl font-bold text-green-900">
                      ر.س {Number(selectedSubscription.final_price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">مدة الاشتراك:</span>
                    <span className="font-medium text-green-900">
                      {selectedSubscription.pricing_tier.duration_months} شهر
                    </span>
                  </div>
                  {selectedSubscription.discount_percentage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-700">الخصم:</span>
                      <span className="font-medium text-red-600">
                        {selectedSubscription.discount_percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Support Contact */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">الدعم الفني</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-blue-600 ml-2" />
                    <span className="text-blue-800">support@wafarle.com</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-blue-600 ml-2" />
                    <span className="text-blue-800">+966123456789</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSubscriptions;