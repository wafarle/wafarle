import React, { useState } from 'react';
import { Plus, Search, Calendar, DollarSign, User, AlertCircle, Loader2, Edit, Trash2, Percent, Package } from 'lucide-react';
import { useSubscriptions, useCustomers, useProducts, usePurchases } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';

const Subscriptions: React.FC = () => {
  const { subscriptions, loading, error, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { customers } = useCustomers();
  const { products, fetchProducts } = useProducts();
  const { purchases, refetch: refetchPurchases } = usePurchases();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    purchase_id: '',
    duration_months: 1,
    start_date: new Date().toISOString().split('T')[0],
    discount_percentage: 0,
    custom_price: 0
  });

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const customerName = subscription.customer?.name || '';
    const productName = subscription.pricing_tier?.product?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculatePrice = () => {
    let basePrice = 0;
    
    if (formData.purchase_id) {
      // إذا تم اختيار مشتريات محددة
      const selectedPurchase = purchases.find(p => p.id === formData.purchase_id);
      if (selectedPurchase) {
        basePrice = Number(selectedPurchase.purchase_price) / selectedPurchase.max_users;
      }
    } else if (formData.product_id) {
      // إذا تم اختيار منتج فقط
      const selectedProduct = products.find(p => p.id === formData.product_id);
      if (selectedProduct) {
        basePrice = Number(selectedProduct.price) || 0;
      }
    }
    
    const totalPrice = basePrice * formData.duration_months;
    const discountAmount = (totalPrice * formData.discount_percentage) / 100;
    return totalPrice - discountAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProduct = products.find(p => p.id === formData.product_id);
    if (!selectedProduct) return;
    
    // Create or find pricing tier for this duration
    let pricingTierId = null;
    
    // Check if there's an existing pricing tier for this product and duration
    const existingTier = selectedProduct.pricing_tiers?.find(
      tier => tier.duration_months === formData.duration_months
    );
    
    if (existingTier) {
      pricingTierId = existingTier.id;
    } else {
      // Create new pricing tier for this product and duration
      try {
        const { data: newTier, error } = await supabase
          .from('pricing_tiers')
          .insert([{
            product_id: formData.product_id,
            name: `${selectedProduct.name} - ${formData.duration_months} شهر`,
            duration_months: formData.duration_months,
            price: Number(selectedProduct.price) * formData.duration_months,
            discount_percentage: formData.discount_percentage,
            features: selectedProduct.features || [],
            is_recommended: false
          }])
          .select()
          .single();

        if (error) throw error;
        pricingTierId = newTier.id;
      } catch (error) {
        console.error('Error creating pricing tier:', error);
        alert('حدث خطأ في إنشاء خطة التسعير');
        return;
      }
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + formData.duration_months);

    const finalPrice = formData.custom_price > 0 ? formData.custom_price : calculatePrice();

    const subscriptionData = {
      customer_id: formData.customer_id,
      pricing_tier_id: pricingTierId,
      purchase_id: formData.purchase_id || null,
      start_date: formData.start_date,
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      discount_percentage: formData.discount_percentage,
      final_price: finalPrice,
      custom_price: formData.custom_price > 0 ? formData.custom_price : null
    };

    let result;
    if (editingSubscription) {
      result = await updateSubscription(editingSubscription.id, subscriptionData);
    } else {
      result = await addSubscription(subscriptionData);
    }

    if (result.success) {
      // تحديث البيانات في الواجهة
      await fetchProducts();
      await refetchPurchases();
      
      setShowAddModal(false);
      setEditingSubscription(null);
      setFormData({
        customer_id: '',
        product_id: '',
        purchase_id: '',
        duration_months: 1,
        start_date: new Date().toISOString().split('T')[0],
        discount_percentage: 0,
        custom_price: 0
      });
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);
    const durationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth());
    
    // Get product_id from pricing_tier
    const productId = subscription.pricing_tier?.product?.id || 
                     subscription.pricing_tier?.product_id || 
                     '';
    
    setFormData({
      customer_id: subscription.customer_id,
      product_id: productId,
      purchase_id: subscription.purchase_id || '',
      duration_months: durationMonths,
      start_date: subscription.start_date,
      discount_percentage: 0,
      custom_price: 0
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) {
      await deleteSubscription(id);
    }
  };

  const getStatusBadge = (status: string) => {
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
      case 'expired': return 'منتهي الصلاحية';
      case 'cancelled': return 'ملغي';
      default: return status;
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
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث في الاشتراكات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي الصلاحية</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة اشتراك جديد
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المدة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ البداية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الانتهاء</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 ml-3" />
                      <span className="text-sm font-medium text-gray-900">
                        {subscription.customer?.name || 'غير محدد'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-gray-400 ml-3" />
                      <span className="text-sm text-gray-900">
                        {subscription.pricing_tier?.product?.name || 'غير محدد'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subscription.pricing_tier?.duration_months || 1} شهر
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <span className="text-green-600 font-medium">ر.س</span>
                      <span className="mr-1">{Number(subscription.final_price || subscription.custom_price || subscription.pricing_tier?.price || 0).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 ml-2" />
                      {new Date(subscription.start_date).toLocaleDateString('en-US')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 ml-2" />
                      {new Date(subscription.end_date).toLocaleDateString('en-US')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(subscription.status)}`}>
                      {getStatusText(subscription.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleEdit(subscription)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(subscription.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingSubscription ? 'تعديل الاشتراك' : 'إضافة اشتراك جديد'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر العميل</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنتج</label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value, purchase_id: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر المنتج</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {Number(product.price || 0).toFixed(2)} ريال/شهر 
                      ({product.available_slots || 0} متاح)
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Purchase Selection (if product has available purchases) */}
              {formData.product_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المشتريات المتاحة (اختياري)
                  </label>
                  <select
                    value={formData.purchase_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">استخدام السعر العادي</option>
                    {purchases
                      .filter(p => p.product_id === formData.product_id && p.status === 'active' && p.current_users < p.max_users)
                      .map(purchase => (
                        <option key={purchase.id} value={purchase.id}>
                          {purchase.service_name} - {(Number(purchase.purchase_price) / purchase.max_users).toFixed(2)} ريال/مستخدم
                          ({purchase.max_users - purchase.current_users} متاح)
                        </option>
                      ))}
                  </select>
                  {formData.purchase_id && (
                    <p className="text-xs text-blue-600 mt-1">
                      سيتم خصم مستخدم من المشتريات المحددة
                    </p>
                  )}
                </div>
              )}

              {/* Duration and Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المدة</label>
                  <select
                    value={formData.duration_months}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_months: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">شهر واحد</option>
                    <option value="2">شهران</option>
                    <option value="3">3 شهور</option>
                    <option value="4">4 شهور</option>
                    <option value="6">6 شهور</option>
                    <option value="12">سنة كاملة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Discount and Custom Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم (%)</label>
                  <div className="relative">
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر مخصص (اختياري)</label>
                  <div className="relative">
                    <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.custom_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_price: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Price Calculation Display */}
              {(formData.product_id || formData.purchase_id) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">ملخص التسعير:</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>السعر الأساسي:</span>
                      <span>
                        {formData.purchase_id 
                          ? (Number(purchases.find(p => p.id === formData.purchase_id)?.purchase_price || 0) / 
                             (purchases.find(p => p.id === formData.purchase_id)?.max_users || 1)).toFixed(2)
                          : Number(products.find(p => p.id === formData.product_id)?.price || 0).toFixed(2)
                        } ريال/شهر
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>المدة:</span>
                      <span>{formData.duration_months} شهر</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المجموع قبل الخصم:</span>
                      <span>
                        {formData.purchase_id 
                          ? ((Number(purchases.find(p => p.id === formData.purchase_id)?.purchase_price || 0) / 
                              (purchases.find(p => p.id === formData.purchase_id)?.max_users || 1)) * formData.duration_months).toFixed(2)
                          : (Number(products.find(p => p.id === formData.product_id)?.price || 0) * formData.duration_months).toFixed(2)
                        } ريال
                      </span>
                    </div>
                    {formData.discount_percentage > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>الخصم ({formData.discount_percentage}%):</span>
                        <span>-{(calculatePrice() * formData.discount_percentage / (100 - formData.discount_percentage)).toFixed(2)} ريال</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-blue-200 pt-2">
                      <span>المجموع النهائي:</span>
                      <span>{formData.custom_price > 0 ? formData.custom_price.toFixed(2) : calculatePrice().toFixed(2)} ريال</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 ml-2" />
                  <span className="text-sm text-yellow-800">
                    {formData.custom_price > 0 
                      ? 'سيتم استخدام السعر المخصص بدلاً من السعر المحسوب'
                      : 'سيتم حساب تاريخ الانتهاء تلقائياً بناءً على المدة المحددة'
                    }
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSubscription(null);
                    setFormData({
                      customer_id: '',
                      product_id: '',
                      purchase_id: '',
                      duration_months: 1,
                      start_date: new Date().toISOString().split('T')[0],
                      discount_percentage: 0,
                      custom_price: 0
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSubscription ? 'تحديث الاشتراك' : 'إضافة الاشتراك'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;