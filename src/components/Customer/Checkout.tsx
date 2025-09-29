import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShoppingCart, 
  Check, 
  CheckCircle,
  Loader2, 
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Lock,
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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
  const [{ isPending }] = usePayPalScriptReducer();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [step, setStep] = useState<'review' | 'customer' | 'payment'>('review');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
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
    if (!user?.email && !user?.phone) return;

    try {
      let data = null;
      let error = null;
      
      // البحث بمعرف المصادقة أولاً
      if (user.id) {
        const result = await supabase
          .from('customers')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      }
      
      // البحث بالبريد الإلكتروني إذا لم يوجد
      if (user.email) {
        const result = await supabase
          .from('customers')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      }
      
      // إذا لم يتم العثور على العميل بالبريد، ابحث برقم الهاتف
      if (!data && user.phone) {
        const result = await supabase
          .from('customers')
          .select('*')
          .eq('phone_auth', user.phone)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      }

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCustomerInfo(data);
        setCustomerForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      } else {
        // إنشاء عميل جديد إذا لم يوجد
        const newCustomerData = {
          name: user?.user_metadata?.customer_name || user?.email?.split('@')[0] || 'عميل جديد',
          email: user?.email || '',
          phone: user?.phone || user?.user_metadata?.phone || '',
          phone_auth: user?.phone || user?.user_metadata?.phone || null,
          address: '',
          auth_user_id: user.id
        };
        
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([newCustomerData])
          .select('*')
          .single();
        
        if (createError) {
          console.error('Error creating customer:', createError);
        } else {
          setCustomerInfo(newCustomer);
          setCustomerForm({
            name: newCustomer.name || '',
            email: newCustomer.email || '',
            phone: newCustomer.phone || '',
            address: newCustomer.address || ''
          });
        }
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

  const convertSARToUSD = (sarAmount: number): number => {
    const exchangeRate = 0.2667; // سعر الصرف الحالي
    return Math.round(sarAmount * exchangeRate * 100) / 100;
  };

  const validateCustomerInfo = () => {
    if (!customerForm.name.trim()) {
      setError('الاسم مطلوب');
      return false;
    }
    if (!customerForm.email.trim()) {
      setError('البريد الإلكتروني مطلوب');
      return false;
    }
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerForm.email.trim())) {
      setError('البريد الإلكتروني غير صحيح');
      return false;
    }
    
    if (!customerForm.phone.trim()) {
      setError('رقم الهاتف مطلوب');
      return false;
    }
    
    setError(null);
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
            email: customerForm.email.trim(),
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
            email: customerForm.email.trim(),
            phone: customerForm.phone.trim(),
            address: customerForm.address.trim(),
            auth_user_id: user?.id || null
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

  // معالجة نجاح الدفع
  const handlePaymentSuccess = async (details: any, data: any) => {
    setProcessing(true);
    
    try {
      console.log('Payment successful:', details);
      
      if (!customerInfo) {
        throw new Error('بيانات العميل غير متوفرة');
      }

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
              customer_id: customerInfo.id,
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

          // إنشاء فاتورة مدفوعة
          await supabase
            .from('invoices')
            .insert([{
              customer_id: customerInfo.id,
              subscription_id: subscription.id,
              amount: cartItem.price,
              total_amount: cartItem.price,
              status: 'paid',
              issue_date: new Date().toISOString().split('T')[0],
              due_date: new Date().toISOString().split('T')[0],
              paid_date: new Date().toISOString().split('T')[0]
            }]);
        }
      }

      // حفظ تفاصيل الطلب
      const orderDetails = {
        orderId: data.orderID,
        paypalTransactionId: details.id,
        customerId: customerInfo.id,
        cart: cart,
        totalSAR: getCartTotal(),
        totalUSD: convertSARToUSD(getCartTotal()),
        created_at: new Date().toISOString(),
        paymentDetails: details
      };

      localStorage.setItem('completed_order', JSON.stringify(orderDetails));
      
      // مسح السلة
      localStorage.removeItem('subscription_cart');
      
      // الانتقال لصفحة النجاح
      onPageChange('payment-success');
      
    } catch (error) {
      console.error('Error processing successful payment:', error);
      setError('حدث خطأ في معالجة الدفع. يرجى التواصل مع الدعم الفني.');
    } finally {
      setProcessing(false);
    }
  };

  // معالجة فشل الدفع
  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    setError('فشل في عملية الدفع. يرجى المحاولة مرة أخرى.');
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
            <span className="font-medium">الدفع الآمن</span>
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
          
          {/* Cart Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">منتجاتك المختارة</h3>
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.product_name}</h4>
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
            
            <div className="bg-green-50 p-4 rounded-lg mt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>الإجمالي:</span>
                <span className="text-green-600">ر.س {getCartTotal().toFixed(2)}</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                (${convertSARToUSD(getCartTotal()).toFixed(2)} دولار أمريكي)
              </p>
            </div>
          </div>

          {/* عرض بيانات العميل المحفوظة إذا كانت متوفرة */}
          {customerInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                <h3 className="font-semibold text-green-800">بياناتك المحفوظة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-700">الاسم:</span>
                  <span className="text-green-800 mr-2">{customerInfo.name}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">البريد الإلكتروني:</span>
                  <span className="text-green-800 mr-2">{customerInfo.email}</span>
                </div>
                {customerInfo.phone && (
                  <div>
                    <span className="font-medium text-green-700">رقم الهاتف:</span>
                    <span className="text-green-800 mr-2">{customerInfo.phone}</span>
                  </div>
                )}
                {customerInfo.address && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-green-700">العنوان:</span>
                    <span className="text-green-800 mr-2">{customerInfo.address}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-green-600 mt-2">
                ✓ سيتم استخدام هذه البيانات في الطلب
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => onPageChange('store')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 ml-2" />
              العودة للمتجر
            </button>
            <button
              onClick={() => {
                setStep('customer');
              }}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              التالي: بيانات العميل
              <ArrowRight className="w-5 h-5 mr-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Customer Information */}
      {step === 'customer' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">بيانات العميل</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <User className="w-5 h-5 text-blue-600 ml-2" />
              <span className="text-blue-800 text-sm">
                يرجى تأكيد أو تحديث بياناتك للمتابعة
              </span>
            </div>
          </div>
          
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
                  required
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="example@domain.com"
                />
              </div>
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
              disabled={processing}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 ml-2" />
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
                <>
                  التالي: الدفع الآمن
                  <ArrowRight className="w-5 h-5 mr-2" />
                </>
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
            <p className="text-sm text-gray-600 mt-2">
              المبلغ بالدولار: ${convertSARToUSD(getCartTotal()).toFixed(2)} USD
            </p>
          </div>

          {/* Payment Security Notice */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <Lock className="w-5 h-5 text-blue-600 ml-2" />
              <h3 className="font-semibold text-blue-900">الدفع الآمن بالفيزا/ماستركارد</h3>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ دفع آمن ومحمي 100%</li>
              <li>✓ دفع مباشر بالفيزا أو الماستركارد</li>
              <li>✓ لا تحتاج حساب PayPal، أدخل بيانات البطاقة مباشرة</li>
              <li>✓ حماية البيانات وتشفير عالي المستوى</li>
              <li>✓ معالجة فورية وتفعيل تلقائي للخدمات</li>
            </ul>
          </div>

          {/* PayPal Payment */}
          <div className="mb-6">
            {isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="mr-2 text-gray-600">جاري تحميل خيارات الدفع...</span>
              </div>
            )}
            
            {!isPending && (
              <PayPalButtons
                forceReRender={[getCartTotal().toFixed(2)]}
                style={{
                  layout: "vertical",
                  color: "blue",
                  shape: "rect",
                  label: "pay",
                  height: 45
                }}
                createOrder={(data, actions) => {
                  console.log('Creating PayPal order with amount:', convertSARToUSD(getCartTotal()).toFixed(2));
                  return actions.order.create({
                    intent: "CAPTURE",
                    payment_source: {
                      paypal: {
                        experience_context: {
                          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
                          brand_name: "wafarle",
                          locale: "ar_EG",
                          landing_page: "LOGIN",
                          shipping_preference: "NO_SHIPPING",
                          user_action: "PAY_NOW"
                        }
                      }
                    },
                    purchase_units: [
                      {
                        amount: {
                          currency_code: "USD",
                          value: convertSARToUSD(getCartTotal()).toFixed(2),
                        },
                        description: `طلب اشتراكات - ${getCartItemsCount()} منتج - ${customerInfo?.name || 'عميل'}`
                      },
                    ],
                  });
                }}
                onApprove={async (data, actions) => {
                  if (!actions.order) return;
                  
                  setProcessing(true);
                  try {
                    console.log('PayPal payment approved:', data);
                    const details = await actions.order.capture();
                    console.log('PayPal payment captured:', details);
                    await handlePaymentSuccess(details, data);
                  } catch (error) {
                    console.error('Error in onApprove:', error);
                    handlePaymentError(error);
                  } finally {
                    setProcessing(false);
                  }
                }}
                onError={(error) => {
                  console.error('PayPal error:', error);
                  handlePaymentError(error);
                }}
                onCancel={() => {
                  console.log('Payment cancelled by user');
                  setError('تم إلغاء عملية الدفع. يمكنك المحاولة مرة أخرى.');
                }}
                disabled={processing}
              />
            )}
          </div>

          {processing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-green-600 ml-2" />
                <span className="text-green-800 font-medium">جاري معالجة الدفع وتفعيل الاشتراكات...</span>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => {
                setError(null);
                setError(null);
                setStep('customer');
              }}
              disabled={processing}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5 ml-2" />
              السابق
            </button>
            <button
              onClick={() => {
                if (validateCustomerInfo()) {
                  setStep('payment');
                }
              }}
              disabled={processing}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              التالي: الدفع الآمن
              <ArrowRight className="w-5 h-5 mr-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;