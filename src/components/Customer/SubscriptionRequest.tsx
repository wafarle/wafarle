import React, { useState, useEffect } from 'react';
import { Calendar, Package, User, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PricingTier {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  features: string[];
  is_recommended?: boolean;
  product_id: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  icon: string;
  color: string;
  is_popular?: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phone_auth?: string;
}

interface SubscriptionRequestProps {
  onPageChange: (page: string) => void;
}

export default function SubscriptionRequest({ onPageChange }: SubscriptionRequestProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [preferredStartDate, setPreferredStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  // Load customer data
  useEffect(() => {
    const loadCustomer = async () => {
      if (!user) return;

      try {
        let customerData = null;
        
        console.log('Loading customer data for user:', user);

        // Search by auth_user_id first (most reliable)
        if (user.id) {
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          
          if (data) customerData = data;
          console.log('Found customer by auth_user_id:', customerData);
        }

        // Search by email if not found
        if (!customerData && user.email) {
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
          
          if (data) customerData = data;
          console.log('Found customer by email:', customerData);
        }

        // Search by phone if not found
        if (!customerData) {
          const phoneToSearch = user.phone || user.user_metadata?.phone;
          if (phoneToSearch) {
            const { data } = await supabase
              .from('customers')
              .select('*')
              .or(`phone_auth.eq.${phoneToSearch},phone.eq.${phoneToSearch}`)
              .maybeSingle();
            
            if (data) customerData = data;
            console.log('Found customer by phone:', customerData);
          }
        }

        // Create customer if not found
        if (!customerData) {
          const newCustomerData = {
            auth_user_id: user.id,
            name: user.user_metadata?.name || user.user_metadata?.full_name || 'عميل جديد',
            email: user.email || `${user.phone}@phone.auth`,
            phone: user.user_metadata?.phone || user.phone,
            phone_auth: user.phone || user.user_metadata?.phone,
          };

          const { data: createdCustomer, error } = await supabase
            .from('customers')
            .insert([newCustomerData])
            .select()
            .single();

          if (error) {
            console.error('Error creating customer:', error);
          } else {
            customerData = createdCustomer;
            console.log('Created new customer:', customerData);
          }
        }

        setCustomer(customerData);
      } catch (error) {
        console.error('Error loading customer:', error);
      } finally {
        setLoadingCustomer(false);
      }
    };

    loadCustomer();
  }, [user]);

  // Load products and pricing tiers
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsResult, tiersResult] = await Promise.all([
          supabase.from('products').select('*').order('name'),
          supabase
            .from('pricing_tiers')
            .select(`
              *,
              products!inner(*)
            `)
            .order('price')
        ]);

        if (productsResult.error) {
          console.error('Error loading products:', productsResult.error);
        } else {
          setProducts(productsResult.data || []);
        }

        if (tiersResult.error) {
          console.error('Error loading pricing tiers:', tiersResult.error);
        } else {
          setPricingTiers(tiersResult.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !selectedTier) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('subscription_requests').insert([
        {
          customer_id: customer.id,
          pricing_tier_id: selectedTier,
          preferred_start_date: preferredStartDate,
          notes: notes.trim() || null,
        },
      ]);

      if (error) {
        console.error('Error submitting request:', error);
        alert('حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          onPageChange('dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال طلبك بنجاح!</h2>
          <p className="text-gray-600 mb-4">
            شكراً لك {customer?.name}، سيتم مراجعة طلبك والرد عليك قريباً
          </p>
          <div className="text-sm text-gray-500">
            جاري التحويل إلى لوحة التحكم...
          </div>
        </div>
      </div>
    );
  }

  if (loadingCustomer || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const selectedTierData = pricingTiers.find(tier => tier.id === selectedTier);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">طلب اشتراك جديد</h1>
          <p className="text-gray-600">اختر الباقة المناسبة لك وأرسل طلبك</p>
        </div>

        {/* Customer Data Display */}
        {customer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center mb-2">
              <User className="w-5 h-5 text-green-600 ml-2" />
              <h3 className="font-semibold text-green-800">بياناتك المحفوظة</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-700">الاسم:</span>
                <span className="text-green-800 mr-2">{customer.name}</span>
              </div>
              <div>
                <span className="font-medium text-green-700">البريد الإلكتروني:</span>
                <span className="text-green-800 mr-2">{customer.email}</span>
              </div>
              {(customer.phone || customer.phone_auth) && (
                <div>
                  <span className="font-medium text-green-700">رقم الهاتف:</span>
                  <span className="text-green-800 mr-2">{customer.phone || customer.phone_auth}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-green-600 mt-2">
              ✓ سيتم استخدام هذه البيانات تلقائياً في طلبك
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Pricing Tiers Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Package className="w-5 h-5 ml-2" />
              اختر الباقة المناسبة
            </h2>
            
            {pricingTiers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد باقات متاحة حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pricingTiers.map((tier) => {
                  const product = products.find(p => p.id === tier.product_id);
                  return (
                    <div
                      key={tier.id}
                      className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                        selectedTier === tier.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${tier.is_recommended ? 'ring-2 ring-orange-200' : ''}`}
                      onClick={() => setSelectedTier(tier.id)}
                    >
                      {tier.is_recommended && (
                        <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold mb-3 inline-block">
                          مُوصى به
                        </div>
                      )}
                      
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        {tier.name}
                      </h3>
                      
                      {product && (
                        <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                      )}
                      
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          {tier.original_price && tier.original_price > tier.price && (
                            <span className="text-sm text-gray-400 line-through ml-2">
                              {tier.original_price} ر.س
                            </span>
                          )}
                          <span className="text-2xl font-bold text-gray-900">
                            {tier.price} ر.س
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          لمدة {tier.duration_months} شهر
                        </p>
                        {tier.discount_percentage && (
                          <p className="text-sm text-green-600 font-medium">
                            وفر {tier.discount_percentage}%
                          </p>
                        )}
                      </div>
                      
                      {tier.features && tier.features.length > 0 && (
                        <ul className="space-y-2">
                          {tier.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preferred Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 ml-2" />
              تاريخ بداية الاشتراك المفضل
            </label>
            <input
              type="date"
              value={preferredStartDate}
              onChange={(e) => setPreferredStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="أضف أي ملاحظات أو طلبات خاصة..."
            />
          </div>

          {/* Summary */}
          {selectedTierData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">ملخص الطلب:</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>الباقة:</strong> {selectedTierData.name}</p>
                <p><strong>المدة:</strong> {selectedTierData.duration_months} شهر</p>
                <p><strong>السعر:</strong> {selectedTierData.price} ر.س</p>
                <p><strong>تاريخ البداية:</strong> {preferredStartDate}</p>
                <p><strong>العميل:</strong> {customer?.name}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => onPageChange('dashboard')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!selectedTier || submitting || !customer}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}