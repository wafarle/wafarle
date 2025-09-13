import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Check, 
  Star, 
  Send, 
  Loader2, 
  CreditCard,
  Users,
  Calendar,
  AlertCircle,
  ShoppingCart,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscriptionRequests } from '../../hooks/useSupabase';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  icon: string;
  color: string;
  is_popular: boolean;
  max_users: number;
  available_slots: number;
  price: number;
  pricing_tiers: any[];
}

interface SubscriptionRequestProps {
  onPageChange: (page: string) => void;
}

const SubscriptionRequest: React.FC<SubscriptionRequestProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const { addRequest } = useSubscriptionRequests();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requestData, setRequestData] = useState({
    phone: '',
    preferred_start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          pricing_tiers (*)
        `)
        .gt('available_slots', 0)
        .order('is_popular', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('حدث خطأ في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSelectedTier(null);
  };

  const handleTierSelect = (tier: any) => {
    setSelectedTier(tier);
  };

  const handleSubmitRequest = async () => {
    if (!selectedProduct || !selectedTier) {
      setError('يرجى اختيار المنتج والباقة');
      return;
    }

    if (!requestData.phone) {
      setError('رقم الهاتف مطلوب للتواصل');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // البحث عن العميل أو إنشاء عميل جديد
      let customerId;
      
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .or(`email.eq.${user?.email || ''},phone_auth.eq.${user?.user_metadata?.phone || ''}`)
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        throw customerError;
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        
        // تحديث رقم الهاتف إذا لم يكن موجوداً
        await supabase
          .from('customers')
          .update({ phone: requestData.phone })
          .eq('id', customerId);
      } else {
        // إنشاء عميل جديد
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([{
            name: user?.email?.split('@')[0] || 'عميل جديد',
            email: user?.email || '',
            phone: requestData.phone,
            address: ''
          }])
          .select()
          .single();

        if (createError) throw createError;
        customerId = newCustomer.id;
      }

      // إنشاء طلب الاشتراك (ليس اشتراك فعلي)
      const { data: request, error: requestError } = await supabase
        .from('subscription_requests')
        .insert([{
          customer_id: customerId,
          pricing_tier_id: selectedTier.id,
          preferred_start_date: requestData.preferred_start_date,
          notes: requestData.notes || '',
          status: 'pending'
        }])
        .select()
        .single();

      if (requestError) throw requestError;

      setSuccess(true);
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const getIcon = (iconName: string) => {
    return Package; // استخدام أيقونة افتراضية
  };

  const getCategoryName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      productivity: 'الإنتاجية',
      design: 'التصميم',
      ai: 'الذكاء الاصطناعي',
      entertainment: 'الترفيه'
    };
    return categoryMap[category] || category;
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-900 mb-4">تم إرسال طلبك بنجاح!</h2>
          <p className="text-green-800 mb-6">
            تم إرسال طلبك للاشتراك في {selectedProduct?.name} بنجاح. سيتم التواصل معك قريباً لتأكيد الطلب وتفعيل الخدمة.
          </p>
          <div className="bg-white p-4 rounded-lg border border-green-200 mb-6">
            <h3 className="font-semibold text-green-900 mb-2">تفاصيل الطلب:</h3>
            <div className="space-y-2 text-sm text-green-800">
              <p><strong>المنتج:</strong> {selectedProduct?.name}</p>
              <p><strong>الباقة:</strong> {selectedTier?.name}</p>
              <p><strong>السعر:</strong> ر.س {selectedTier?.price}</p>
              <p><strong>المدة:</strong> {selectedTier?.duration_months} شهر</p>
              <p><strong>تاريخ البداية:</strong> {new Date(requestData.preferred_start_date).toLocaleDateString('ar-SA')}</p>
              <p><strong>حالة الطلب:</strong> في انتظار الموافقة</p>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">الخطوات التالية:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• سيتم مراجعة طلبك خلال 24 ساعة</li>
              <li>• ستتلقى اتصال أو رسالة للتأكيد</li>
              <li>• بعد الموافقة سيتم تفعيل الخدمة</li>
              <li>• ستحصل على فاتورة للدفع</li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false);
                setSelectedProduct(null);
                setSelectedTier(null);
                setRequestData({
                  phone: '',
                  preferred_start_date: new Date().toISOString().split('T')[0],
                  notes: ''
                });
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              طلب اشتراك آخر
            </button>
            <button
              onClick={() => onPageChange('subscriptions')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              عرض اشتراكاتي
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="mr-2 text-gray-600">جاري تحميل المنتجات...</span>
      </div>
    );
  }

  if (error && !selectedProduct) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">طلب اشتراك جديد</h1>
        <p className="text-gray-600 text-lg">اختر المنتج والباقة التي تناسب احتياجاتك</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 ml-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Product Selection */}
      {!selectedProduct && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">الخطوة 1: اختر المنتج</h2>
          {products.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <Package className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-900 mb-2">لا توجد منتجات متاحة</h3>
              <p className="text-yellow-800">جميع المنتجات مكتملة حالياً. يرجى المحاولة مرة أخرى لاحقاً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const IconComponent = getIcon(product.icon);
                
                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer overflow-hidden group"
                  >
                    {/* Product Header */}
                    <div className={`bg-gradient-to-r ${product.color} p-6 text-white relative`}>
                      {product.is_popular && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <Star className="w-3 h-3 ml-1" />
                            الأكثر طلباً
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <IconComponent className="w-16 h-16 mx-auto mb-3" />
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <p className="text-sm opacity-90 mt-1">{getCategoryName(product.category)}</p>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-6">
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                      
                      {/* Features */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">الميزات:</h4>
                        <ul className="space-y-1">
                          {product.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-center">
                              <Check className="w-3 h-3 text-green-500 ml-2" />
                              {feature}
                            </li>
                          ))}
                          {product.features.length > 3 && (
                            <li className="text-xs text-gray-500">
                              +{product.features.length - 3} ميزات أخرى
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Availability */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-4 h-4 ml-1" />
                          <span>متاح: {product.available_slots} من {product.max_users}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-green-600 font-bold text-lg">ر.س</span>
                          <span className="text-2xl font-bold text-gray-900 mr-1">
                            {Number(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors group-hover:bg-green-700">
                        اختيار هذا المنتج
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Pricing Tier Selection */}
      {selectedProduct && !selectedTier && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              الخطوة 2: اختر الباقة - {selectedProduct.name}
            </h2>
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              تغيير المنتج
            </button>
          </div>

          {selectedProduct.pricing_tiers && selectedProduct.pricing_tiers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedProduct.pricing_tiers.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => handleTierSelect(tier)}
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all cursor-pointer ${
                    tier.is_recommended 
                      ? 'border-green-500 ring-2 ring-green-200' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  {tier.is_recommended && (
                    <div className="bg-green-500 text-white text-center py-2 text-sm font-medium">
                      الأكثر اختياراً
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{tier.name}</h3>
                    
                    {/* Price */}
                    <div className="mb-4">
                      {tier.original_price && tier.original_price > tier.price && (
                        <span className="text-gray-500 line-through text-sm">
                          ر.س {Number(tier.original_price).toFixed(2)}
                        </span>
                      )}
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">ر.س {Number(tier.price).toFixed(2)}</span>
                        <span className="text-gray-600 text-sm mr-1">/ {tier.duration_months} شهر</span>
                      </div>
                      {tier.discount_percentage && tier.discount_percentage > 0 && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          خصم {tier.discount_percentage}%
                        </span>
                      )}
                    </div>

                    {/* Features */}
                    <div className="mb-6">
                      <ul className="space-y-2">
                        {tier.features.filter((f: string) => f.trim()).map((feature: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center">
                            <Check className="w-4 h-4 text-green-500 ml-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button className={`w-full py-3 px-4 rounded-lg transition-colors ${
                      tier.is_recommended
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}>
                      اختيار هذه الباقة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-900 mb-2">لا توجد باقات متاحة</h3>
              <p className="text-yellow-800">هذا المنتج لا يحتوي على باقات متاحة حالياً</p>
              <button
                onClick={() => setSelectedProduct(null)}
                className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                اختيار منتج آخر
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Request Details */}
      {selectedProduct && selectedTier && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              الخطوة 3: تفاصيل الطلب
            </h2>
            <button
              onClick={() => setSelectedTier(null)}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              تغيير الباقة
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Request Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات التواصل</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف للتواصل
                  </label>
                  <input
                    type="tel"
                    required
                    value={requestData.phone}
                    onChange={(e) => setRequestData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+966501234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ البداية المفضل
                  </label>
                  <input
                    type="date"
                    value={requestData.preferred_start_date}
                    onChange={(e) => setRequestData(prev => ({ ...prev, preferred_start_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات إضافية (اختياري)
                  </label>
                  <textarea
                    value={requestData.notes}
                    onChange={(e) => setRequestData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="أي ملاحظات أو طلبات خاصة..."
                  />
                </div>

                <button
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 ml-2" />
                      تأكيد الطلب
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ملخص الطلب</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${selectedProduct.color} rounded-lg flex items-center justify-center mr-3`}>
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedProduct.name}</h4>
                    <p className="text-sm text-gray-600">{getCategoryName(selectedProduct.category)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الباقة:</span>
                    <span className="font-medium text-gray-900">{selectedTier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المدة:</span>
                    <span className="font-medium text-gray-900">{selectedTier.duration_months} شهر</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">السعر:</span>
                    <span className="font-bold text-green-600 text-lg">ر.س {Number(selectedTier.price).toFixed(2)}</span>
                  </div>
                  {selectedTier.discount_percentage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">الخصم:</span>
                      <span className="font-medium text-red-600">{selectedTier.discount_percentage}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ البداية:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(requestData.preferred_start_date).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ الانتهاء:</span>
                    <span className="font-medium text-gray-900">
                      {(() => {
                        const endDate = new Date(requestData.preferred_start_date);
                        endDate.setMonth(endDate.getMonth() + selectedTier.duration_months);
                        return endDate.toLocaleDateString('ar-SA');
                      })()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                      <span className="text-green-800 font-medium text-sm">
                        سيتم التواصل معك خلال 24 ساعة لتأكيد التفعيل
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionRequest;