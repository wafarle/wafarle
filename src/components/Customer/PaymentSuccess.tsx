import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Package, 
  Calendar, 
  DollarSign, 
  FileText,
  Home,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PaymentSuccessProps {
  onPageChange: (page: string) => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    processSuccessfulPayment();
  }, []);

  const processSuccessfulPayment = async () => {
    try {
      setLoading(true);
      
      // استرجاع بيانات الطلب من localStorage
      const pendingOrder = localStorage.getItem('pending_order');
      if (!pendingOrder) {
        setError('لم يتم العثور على بيانات الطلب');
        return;
      }

      const orderData = JSON.parse(pendingOrder);
      setOrderDetails(orderData);
      
      // معالجة الطلب وإنشاء الاشتراكات والفواتير
      await createSubscriptionsFromOrder(orderData);
      
      // مسح بيانات الطلب والسلة
      localStorage.removeItem('pending_order');
      localStorage.removeItem('subscription_cart');
      
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('حدث خطأ في معالجة الدفع');
    } finally {
      setLoading(false);
    }
  };

  const createSubscriptionsFromOrder = async (orderData: any) => {
    setProcessing(true);
    
    try {
      const { customerId, cart, totalSAR } = orderData;

      // إنشاء الاشتراكات لكل منتج في السلة
      for (const cartItem of cart) {
        for (let i = 0; i < cartItem.quantity; i++) {
          // حساب تواريخ الاشتراك
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + cartItem.duration_months);

          // إنشاء الاشتراك
          const { data: subscription, error: subscriptionError } = await supabase
            .from('subscriptions')
            .insert([{
              customer_id: customerId,
              pricing_tier_id: cartItem.pricing_tier_id,
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              status: 'active',
              final_price: cartItem.price
            }])
            .select()
            .single();

          if (subscriptionError) {
            console.error('Error creating subscription:', subscriptionError);
            continue;
          }

          // إنشاء فاتورة للاشتراك
          const { error: invoiceError } = await supabase
            .from('invoices')
            .insert([{
              customer_id: customerId,
              subscription_id: subscription.id,
              amount: cartItem.price,
              total_amount: cartItem.price,
              status: 'paid',
              issue_date: new Date().toISOString().split('T')[0],
              due_date: new Date().toISOString().split('T')[0],
              paid_date: new Date().toISOString().split('T')[0]
            }]);

          if (invoiceError) {
            console.error('Error creating invoice:', invoiceError);
          }
        }
      }
    } catch (err) {
      console.error('Error creating subscriptions:', err);
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="mr-2 text-gray-600">جاري معالجة الدفع...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-4">حدث خطأ!</h2>
          <p className="text-red-800 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => onPageChange('store')}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              العودة للمتجر
            </button>
            <button
              onClick={() => onPageChange('dashboard')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-green-900 mb-4">🎉 تم الدفع بنجاح!</h1>
        <p className="text-green-800 text-lg mb-8">
          تم تفعيل اشتراكاتك بنجاح. مرحباً بك في عائلة عملائنا!
        </p>

        {/* Order Summary */}
        {orderDetails && (
          <div className="bg-white p-6 rounded-lg border border-green-200 mb-8 text-right">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">تفاصيل الطلب</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">رقم الطلب:</span>
                  <p className="font-bold text-gray-900">{orderDetails.orderId}</p>
                </div>
                <div>
                  <span className="text-gray-600">تاريخ الطلب:</span>
                  <p className="font-bold text-gray-900">
                    {new Date(orderDetails.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">المبلغ المدفوع:</span>
                  <p className="font-bold text-green-600">
                    ر.س {orderDetails.totalSAR?.toFixed(2)} (${orderDetails.totalUSD?.toFixed(2)})
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">عدد الاشتراكات:</span>
                  <p className="font-bold text-gray-900">
                    {orderDetails.cart?.reduce((sum: number, item: any) => sum + item.quantity, 0)} اشتراك
                  </p>
                </div>
              </div>

              {/* Cart Items */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">الاشتراكات المفعلة:</h3>
                <div className="space-y-2">
                  {orderDetails.cart?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">{item.tier_name} - {item.duration_months} شهر</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">ر.س {(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Message */}
        {processing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 ml-2" />
              <span className="text-blue-800">جاري تفعيل اشتراكاتك...</span>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">الخطوات التالية</h3>
          <ul className="text-blue-800 space-y-2 text-right">
            <li className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
              تم تفعيل جميع اشتراكاتك تلقائياً
            </li>
            <li className="flex items-center">
              <FileText className="w-5 h-5 text-blue-600 ml-2" />
              ستتلقى فواتير مدفوعة على بريدك الإلكتروني
            </li>
            <li className="flex items-center">
              <Package className="w-5 h-5 text-purple-600 ml-2" />
              يمكنك إدارة اشتراكاتك من لوحة التحكم
            </li>
            <li className="flex items-center">
              <Calendar className="w-5 h-5 text-orange-600 ml-2" />
              ستتلقى تنبيهات قبل انتهاء الاشتراكات
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => onPageChange('subscriptions')}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <Package className="w-5 h-5 ml-2" />
            عرض اشتراكاتي
          </button>
          <button
            onClick={() => onPageChange('invoices')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <FileText className="w-5 h-5 ml-2" />
            عرض الفواتير
          </button>
          <button
            onClick={() => onPageChange('dashboard')}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <Home className="w-5 h-5 ml-2" />
            لوحة التحكم
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;