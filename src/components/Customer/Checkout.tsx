import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShoppingCart, 
  Check, 
  Loader2, 
  AlertTriangle,
  ArrowLeft,
  Lock,
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { createPayPalPaymentLink, convertSARToUSD } from '../../lib/paypal';

interface CartItem {
  product_id: string;
  pricing_tier_id: string;
  product_name: string;
  tier_name: string;
  price: number;
  duration_months: number;
  quantity: number;
}

interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface CheckoutProps {
  onPageChange: (page: string) => void;
}

const Checkout: React.FC<CheckoutProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [step, setStep] = useState<'review' | 'customer' | 'payment' | 'success'>('review');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    loadCart();
    fetchCustomerInfo();
  }, [user]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('subscription_cart');
    if (savedCart) {
      const cartData = JSON.parse(savedCart);
      setCart(cartData);
      
      if (cartData.length === 0) {
        onPageChange('store');
        return;
      }
    } else {
      onPageChange('store');
      return;
    }
    setLoading(false);
  };

  const fetchCustomerInfo = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCustomerInfo(data);
        setCustomerForm({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      }
    } catch (err) {
      console.error('Error fetching customer info:', err);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const validateCustomerInfo = () => {
    if (!customerForm.name.trim()) {
      setError('الاسم مطلوب');
      return false;
    }
    if (!customerForm.phone.trim()) {
      setError('رقم الهاتف مطلوب');
      return false;
    }
    return true;
  };

  const handleCustomerInfoSubmit = async () => {
    if (!validateCustomerInfo()) return;

    setProcessing(true);
    try {
      let customerId = customerInfo?.id;

      if (customerInfo) {
        // تحديث بيانات العميل الموجود
        const { data, error } = await supabase
          .from('customers')
          .update({
            name: customerForm.name.trim(),
            phone: customerForm.phone.trim(),
            address: customerForm.address.trim()
          })
          .eq('id', customerInfo.id)
          .select()
          .single();

        if (error) throw error;
        setCustomerInfo(data);
      } else {
        // إنشاء عميل جديد
        const { data, error } = await supabase
          .from('customers')
          .insert([{
            name: customerForm.name.trim(),
            email: user?.email || '',
            phone: customerForm.phone.trim(),
            address: customerForm.address.trim()
          }])
          .select()
          .single();

        if (error) throw error;
        setCustomerInfo(data);
        customerId = data.id;
      }

      setStep('payment');
    } catch (err) {
      console.error('Error saving customer info:', err);
      setError('حدث خطأ في حفظ البيانات');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!customerInfo) {
      setError('بيانات العميل غير مكتملة');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // تحويل المبلغ إلى دولار أمريكي
      const totalSAR = getCartTotal();
      const totalUSD = convertSARToUSD(totalSAR);

      // إنشاء وصف للطلب
      const orderDescription = `طلب اشتراكات - ${getCartItemsCount()} منتج - ${customerInfo.name}`;
      const tempOrderId = `ORDER_${Date.now()}`;

      // إنشاء رابط الدفع
      const paymentLink = await createPayPalPaymentLink(
        totalUSD,
        'USD',
        orderDescription,
        tempOrderId
      );

      // حفظ بيانات الطلب في localStorage للمتابعة بعد الدفع
      localStorage.setItem('pending_order', JSON.stringify({
        orderId: tempOrderId,
        customerId: customerInfo.id,
        cart: cart,
        totalSAR: totalSAR,
        totalUSD: totalUSD,
        created_at: new Date().toISOString()
      }));

      // توجيه المستخدم لصفحة الدفع
      window.open(paymentLink, '_blank');
      setPaymentUrl(paymentLink);
      setOrderId(tempOrderId);
      setStep('success');
      
    } catch (err) {
      console.error('Error creating payment:', err);
      setError('حدث خطأ في إنشاء رابط الدفع. يرجى المحاولة مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  };

  const clearCart = () => {
    localStorage.removeItem('subscription_cart');
    setCart([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="mr-2 text-gray-600">جاري تحميل بيانات الشراء...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step === 'review' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              step === 'review' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              1
            </div>
            <span className="font-medium">مراجعة الطلب</span>
          </div>
          
          <div className={`flex items-center ${step === 'customer' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              step === 'customer' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              2
            </div>
            <span className="font-medium">بيانات العميل</span>
          </div>
          
          <div className={`flex items-center ${step === 'payment' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              step === 'payment' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              3
            </div>
            <span className="font-medium">الدفع</span>
          </div>
          
          <div className={`flex items-center ${step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              step === 'success' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              ✓
            </div>
            <span className="font-medium">تأكيد</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 ml-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Review Order */}
      {step === 'review' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">مراجعة طلبك</h2>
          
          <div className="space-y-4 mb-6">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">{item.tier_name} - {item.duration_months} شهر</p>
                  <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">ر.س {(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">ر.س {item.price} × {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>الإجمالي:</span>
              <span className="text-green-600">ر.س {getCartTotal().toFixed(2)}</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              (تقريباً ${convertSARToUSD(getCartTotal()).toFixed(2)} دولار أمريكي)
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => onPageChange('store')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 ml-2" />
              العودة للمتجر
            </button>
            <button
              onClick={() => setStep('customer')}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              متابعة إلى بيانات العميل
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Customer Information */}
      {step === 'customer' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">بيانات العميل</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="أحمد محمد"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={user?.email || ''}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">لا يمكن تعديل البريد الإلكتروني</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  required
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="+966501234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان (اختياري)
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  rows={3}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="الرياض، المملكة العربية السعودية"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('review')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              السابق
            </button>
            <button
              onClick={handleCustomerInfoSubmit}
              disabled={processing}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'متابعة للدفع'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 'payment' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">الدفع الآمن</h2>
          
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">ملخص الطلب</h3>
            <div className="space-y-2 text-sm">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>{item.product_name} - {item.tier_name} × {item.quantity}</span>
                  <span>ر.س {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold">
              <span>الإجمالي:</span>
              <span className="text-green-600">ر.س {getCartTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <Lock className="w-5 h-5 text-blue-600 ml-2" />
              <h3 className="font-semibold text-blue-900">الدفع الآمن بالفيزا/ماستركارد</h3>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ دفع آمن ومحمي 100%</li>
              <li>✓ دفع مباشر بالفيزا أو الماستركارد</li>
              <li>✓ لا تحتاج إنشاء حساب، أدخل بيانات البطاقة مباشرة</li>
              <li>✓ حماية البيانات وتشفير عالي المستوى</li>
              <li>✓ معالجة فورية ومؤكدة</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('customer')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              السابق
            </button>
            <button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
              ) : (
                <CreditCard className="w-5 h-5 ml-2" />
              )}
              {processing ? 'جاري توجيهك للدفع...' : `ادفع بالفيزا ر.س ${getCartTotal().toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">تم إنشاء الطلب بنجاح!</h2>
          <p className="text-gray-600 mb-6">
            تم توجيهك لصفحة الدفع. أكمل عملية الدفع لتفعيل اشتراكاتك.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 ml-2" />
              <h3 className="font-semibold text-yellow-900">تعليمات مهمة</h3>
            </div>
            <ul className="text-sm text-yellow-800 space-y-1 text-right">
              <li>• أكمل عملية الدفع في النافذة الجديدة</li>
              <li>• رقم الطلب: {orderId}</li>
              <li>• بعد إتمام الدفع، سيتم تفعيل اشتراكاتك تلقائياً</li>
              <li>• ستتلقى رسالة تأكيد على بريدك الإلكتروني</li>
            </ul>
          </div>

          {paymentUrl && (
            <div className="mb-6">
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <CreditCard className="w-5 h-5 ml-2" />
                إعادة فتح صفحة الدفع
              </a>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                clearCart();
                onPageChange('store');
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              العودة للمتجر
            </button>
            <button
              onClick={() => onPageChange('subscriptions')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              عرض اشتراكاتي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;