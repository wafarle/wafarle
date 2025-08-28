import React, { useState } from 'react';
import { Plus, Search, Calendar, DollarSign, User, AlertCircle, Loader2, Edit, Trash2, Percent, Package, Eye, Download } from 'lucide-react';
import { useSubscriptions, useCustomers, useProducts, usePurchases, useInvoices } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';

const Subscriptions: React.FC = () => {
  const { subscriptions, loading, error, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { customers } = useCustomers();
  const { products, fetchProducts } = useProducts();
  const { purchases, refetch: refetchPurchases } = usePurchases();
  const { addInvoice } = useInvoices();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    purchase_id: '',
    duration_months: 1,
    start_date: new Date().toISOString().split('T')[0],
    discount_percentage: 0,
    custom_price: 0
  });
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const customerName = subscription.customer?.name || '';
    const customerPhone = subscription.customer?.phone || '';
    const productName = subscription.pricing_tier?.product?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerPhone.includes(searchTerm) ||
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
        // استخدام سعر البيع المحدد أو حساب السعر من تكلفة الشراء
        basePrice = Number(selectedPurchase.sale_price_per_user) || 
                   (Number(selectedPurchase.purchase_price) / selectedPurchase.max_users);
      }
    } else if (formData.product_id) {
      // إذا تم اختيار منتج فقط
      const selectedProduct = products.find(p => p.id === formData.product_id);
      if (selectedProduct) {
        // البحث عن مشتريات مرتبطة بالمنتج لاستخدام سعر البيع
        const linkedPurchase = purchases.find(p => p.product_id === selectedProduct.id);
        basePrice = Number(linkedPurchase?.sale_price_per_user) || Number(selectedProduct.price) || 0;
      }
    }
    
    const totalPrice = basePrice * formData.duration_months;
    const discountAmount = (totalPrice * formData.discount_percentage) / 100;
    return totalPrice - discountAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات قبل الإرسال
    if (!formData.customer_id) {
      alert('يرجى اختيار العميل');
      return;
    }

    if (!formData.product_id) {
      alert('يرجى اختيار المنتج');
      return;
    }

    if (formData.duration_months < 1) {
      alert('مدة الاشتراك يجب أن تكون على الأقل شهر واحد');
      return;
    }

    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      alert('نسبة الخصم يجب أن تكون بين 0 و 100');
      return;
    }

    if (formData.custom_price < 0) {
      alert('السعر المخصص لا يمكن أن يكون سالباً');
      return;
    }

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
      
      // إنشاء فاتورة تلقائياً إذا كان الخيار مفعل
      if (result.success && autoGenerateInvoice && result.data) {
        const invoiceData = {
          customer_id: formData.customer_id,
          total_amount: finalPrice,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 يوم من الآن
          invoice_items: [{
            subscription_id: result.data.id,
            amount: finalPrice,
            description: `${selectedProduct.name} - ${formData.duration_months} شهر`
          }]
        };
        
        await addInvoice(invoiceData);
      }
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
      setCustomerSearchTerm('');
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
    
    // تعيين اسم العميل في البحث
    const customer = customers.find(c => c.id === subscription.customer_id);
    setCustomerSearchTerm(customer?.name || '');
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) {
      await deleteSubscription(id);
    }
  };

  const handleShowDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  const exportSubscriptionsToExcel = () => {
    import('xlsx').then((XLSX) => {
      const subscriptionsData = subscriptions.map(subscription => ({
        'اسم العميل': subscription.customer?.name || 'غير محدد',
        'رقم الهاتف': subscription.customer?.phone || 'غير محدد',
        'اسم المنتج': subscription.pricing_tier?.product?.name || 'غير محدد',
        'المدة (أشهر)': subscription.duration_months,
        'السعر': subscription.custom_price || subscription.pricing_tier?.price || 0,
        'نسبة الخصم': subscription.discount_percentage || 0,
        'السعر النهائي': subscription.custom_price || 
          ((subscription.pricing_tier?.price || 0) * subscription.duration_months * (1 - (subscription.discount_percentage || 0) / 100)),
        'تاريخ البداية': new Date(subscription.start_date).toLocaleDateString('ar-SA'),
        'تاريخ الانتهاء': new Date(subscription.end_date).toLocaleDateString('ar-SA'),
        'الحالة': getStatusText(subscription.status),
        'تاريخ الإنشاء': new Date(subscription.created_at).toLocaleDateString('ar-SA')
      }));

      const ws = XLSX.utils.json_to_sheet(subscriptionsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الاشتراكات');
      
      // تنسيق الأعمدة
      const colWidths = [
        { wch: 20 }, // اسم العميل
        { wch: 15 }, // رقم الهاتف
        { wch: 20 }, // اسم المنتج
        { wch: 12 }, // المدة
        { wch: 15 }, // السعر
        { wch: 12 }, // نسبة الخصم
        { wch: 15 }, // السعر النهائي
        { wch: 15 }, // تاريخ البداية
        { wch: 15 }, // تاريخ الانتهاء
        { wch: 12 }, // الحالة
        { wch: 15 }  // تاريخ الإنشاء
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `الاشتراكات_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
    });
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
              placeholder="البحث بالاسم أو رقم الهاتف أو المنتج..."
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
        <div className="flex gap-3">
          <button
            onClick={exportSubscriptionsToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة اشتراك جديد
          </button>
        </div>
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
                      <span className="mr-1">
                        {(() => {
                          // أولوية العرض: السعر المخصص > السعر النهائي > سعر البيع من المشتريات > السعر العادي
                          const customPrice = subscription.custom_price;
                          const finalPrice = subscription.final_price;
                          const purchasePrice = subscription.purchase?.sale_price_per_user;
                          const tierPrice = subscription.pricing_tier?.price;
                          
                          const displayPrice = customPrice || finalPrice || purchasePrice || tierPrice || 0;
                          return Number(displayPrice).toFixed(2);
                        })()}
                      </span>
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
                        onClick={() => handleShowDetails(subscription)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                        title="عرض تفاصيل الاشتراك"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
                
                {/* Search Input */}
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو رقم الهاتف..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Customer Selection Dropdown */}
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر العميل</option>
                  {customers
                    .filter(customer => 
                      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      customer.phone.includes(customerSearchTerm)
                    )
                    .map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                </select>
                
                {/* Selected Customer Info */}
                {formData.customer_id && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center text-sm text-blue-800">
                      <User className="w-4 h-4 ml-2" />
                      <span>
                        العميل المختار: {customers.find(c => c.id === formData.customer_id)?.name}
                      </span>
                    </div>
                  </div>
                )}
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
                  {products
                    .filter(product => (product.available_slots || 0) > 0)
                    .map(product => {
                      const availableSlots = product.available_slots || 0;
                      
                      return (
                        <option 
                          key={product.id} 
                          value={product.id}
                        >
                          {product.name} - {Number(product.price || 0).toFixed(2)} ريال/شهر 
                          ({availableSlots} متاح)
                        </option>
                      );
                    })}
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
                      .filter(p => p.product_id === formData.product_id && p.status === 'active')
                      .map(purchase => {
                        const availableUsers = purchase.max_users - purchase.current_users;
                        const isAvailable = availableUsers > 0;
                        const statusText = isAvailable ? `${availableUsers} متاح` : 'مكتمل';
                        
                        return (
                          <option 
                            key={purchase.id} 
                            value={purchase.id}
                            disabled={!isAvailable}
                            className={isAvailable ? 'text-green-600' : 'text-red-600'}
                          >
                            {purchase.service_name} - {(Number(purchase.sale_price_per_user) || (Number(purchase.purchase_price) / purchase.max_users)).toFixed(2)} ريال/مستخدم
                            ({statusText})
                          </option>
                        );
                      })}
                  </select>
                  
                  {/* Purchase Availability Info */}
                  {formData.purchase_id && (
                    (() => {
                      const selectedPurchase = purchases.find(p => p.id === formData.purchase_id);
                      if (!selectedPurchase) return null;
                      
                      const availableUsers = selectedPurchase.max_users - selectedPurchase.current_users;
                      const isAvailable = availableUsers > 0;
                      
                      return (
                        <div className={`mt-2 p-2 rounded-lg ${
                          isAvailable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className={`flex items-center text-sm ${
                            isAvailable ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {isAvailable ? (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                                <span>متاح: {availableUsers} مستخدم</span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                                <span>مكتمل: لا يمكن إضافة مستخدمين جدد</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                  
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
                          ? (() => {
                              const purchase = purchases.find(p => p.id === formData.purchase_id);
                              return (Number(purchase?.sale_price_per_user) || 
                                     (Number(purchase?.purchase_price || 0) / (purchase?.max_users || 1))).toFixed(2);
                            })()
                          : (() => {
                              const product = products.find(p => p.id === formData.product_id);
                              const linkedPurchase = purchases.find(p => p.product_id === formData.product_id);
                              return (Number(linkedPurchase?.sale_price_per_user) || Number(product?.price || 0)).toFixed(2);
                            })()
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
                          ? (() => {
                              const purchase = purchases.find(p => p.id === formData.purchase_id);
                              const pricePerMonth = Number(purchase?.sale_price_per_user) || 
                                                  (Number(purchase?.purchase_price || 0) / (purchase?.max_users || 1));
                              return (pricePerMonth * formData.duration_months).toFixed(2);
                            })()
                          : (() => {
                              const product = products.find(p => p.id === formData.product_id);
                              const linkedPurchase = purchases.find(p => p.product_id === formData.product_id);
                              const pricePerMonth = Number(linkedPurchase?.sale_price_per_user) || Number(product?.price || 0);
                              return (pricePerMonth * formData.duration_months).toFixed(2);
                            })()
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

              {/* خيار إنشاء فاتورة تلقائياً */}
              {!editingSubscription && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="auto_generate_invoice"
                      checked={autoGenerateInvoice}
                      onChange={(e) => setAutoGenerateInvoice(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="auto_generate_invoice" className="mr-3 text-sm font-medium text-blue-900">
                      إنشاء فاتورة تلقائياً
                    </label>
                  </div>
                  <p className="text-xs text-blue-700 mt-2 mr-7">
                    سيتم إنشاء فاتورة تلقائياً بتاريخ استحقاق 30 يوم من اليوم
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSubscription(null);
                    setAutoGenerateInvoice(true);
                    setFormData({
                      customer_id: '',
                      product_id: '',
                      purchase_id: '',
                      duration_months: 1,
                      start_date: new Date().toISOString().split('T')[0],
                      discount_percentage: 0,
                      custom_price: 0
                    });
                    setCustomerSearchTerm('');
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

      {/* Subscription Details Modal */}
      {showDetailsModal && selectedSubscription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="p-3 bg-white bg-opacity-20 rounded-lg ml-4">
                    <Package className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">تفاصيل الاشتراك</h2>
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                        {selectedSubscription.pricing_tier?.product?.category === 'productivity' ? 'الإنتاجية' :
                         selectedSubscription.pricing_tier?.product?.category === 'design' ? 'التصميم' :
                         selectedSubscription.pricing_tier?.product?.category === 'ai' ? 'الذكاء الاصطناعي' : 'الترفيه'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedSubscription.status === 'active' ? 'bg-green-400 text-green-900' :
                        selectedSubscription.status === 'expired' ? 'bg-red-400 text-red-900' :
                        'bg-gray-400 text-gray-900'
                      }`}>
                        {getStatusText(selectedSubscription.status)}
                      </span>
                    </div>
                  </div>
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
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="w-5 h-5 ml-2 text-blue-600" />
                  معلومات العميل
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">الاسم:</span>
                    <p className="font-medium text-gray-900">{selectedSubscription.customer?.name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">رقم الهاتف:</span>
                    <p className="font-medium text-gray-900">{selectedSubscription.customer?.phone || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">البريد الإلكتروني:</span>
                    <p className="font-medium text-gray-900">{selectedSubscription.customer?.email || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">العنوان:</span>
                    <p className="font-medium text-gray-900">{selectedSubscription.customer?.address || 'غير محدد'}</p>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Package className="w-5 h-5 ml-2 text-green-600" />
                  معلومات المنتج
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 text-sm">اسم المنتج:</span>
                    <p className="font-medium text-gray-900">{selectedSubscription.pricing_tier?.product?.name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">الفئة:</span>
                    <p className="font-medium text-gray-900">
                      {selectedSubscription.pricing_tier?.product?.category === 'productivity' ? 'الإنتاجية' :
                       selectedSubscription.pricing_tier?.product?.category === 'design' ? 'التصميم' :
                       selectedSubscription.pricing_tier?.product?.category === 'ai' ? 'الذكاء الاصطناعي' : 'الترفيه'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">الخطة:</span>
                    <p className="font-medium text-gray-900">{selectedSubscription.pricing_tier?.name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">المدة:</span>
                    <p className="font-medium text-gray-900">
                      {(() => {
                        const startDate = new Date(selectedSubscription.start_date);
                        const endDate = new Date(selectedSubscription.end_date);
                        const durationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                              (endDate.getMonth() - startDate.getMonth());
                        return `${durationMonths} شهر`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 ml-2 text-green-600" />
                  معلومات التسعير
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">السعر الأساسي:</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {(() => {
                        const basePrice = selectedSubscription.purchase?.sale_price_per_user || 
                                         selectedSubscription.pricing_tier?.price || 0;
                        return Number(basePrice).toFixed(2);
                      })()} ريال/شهر
                    </span>
                  </div>
                  {selectedSubscription.discount_percentage > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">نسبة الخصم:</span>
                      <span className="text-lg font-semibold text-red-600">
                        {selectedSubscription.discount_percentage}%
                      </span>
                    </div>
                  )}
                  {selectedSubscription.custom_price > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">السعر المخصص:</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {Number(selectedSubscription.custom_price).toFixed(2)} ريال
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                    <span className="text-gray-600 font-medium">السعر النهائي:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {(() => {
                        const finalPrice = selectedSubscription.custom_price || 
                                          selectedSubscription.final_price || 
                                          selectedSubscription.purchase?.sale_price_per_user || 
                                          selectedSubscription.pricing_tier?.price || 0;
                        return Number(finalPrice).toFixed(2);
                      })()} ريال
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dates Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Calendar className="w-5 h-5 ml-2 text-blue-600" />
                    التواريخ
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ البداية:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedSubscription.start_date).toLocaleDateString('en-US')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ الانتهاء:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedSubscription.end_date).toLocaleDateString('en-US')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">المدة المتبقية:</span>
                      <span className={`font-medium ${
                        new Date(selectedSubscription.end_date) > new Date() ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(() => {
                          const endDate = new Date(selectedSubscription.end_date);
                          const now = new Date();
                          const diffTime = endDate.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays > 0) {
                            return `${diffDays} يوم متبقي`;
                          } else if (diffDays === 0) {
                            return 'ينتهي اليوم';
                          } else {
                            return `منتهي منذ ${Math.abs(diffDays)} يوم`;
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <AlertCircle className="w-5 h-5 ml-2 text-orange-600" />
                    حالة الاشتراك
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">الحالة:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedSubscription.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedSubscription.status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusText(selectedSubscription.status)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ الإنشاء:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedSubscription.created_at).toLocaleDateString('en-US')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">آخر تحديث:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedSubscription.updated_at).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Information (if linked) */}
              {selectedSubscription.purchase && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <Package className="w-5 h-5 ml-2" />
                    معلومات المشتريات المرتبطة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">اسم الخدمة:</span>
                      <p className="font-medium text-blue-900">{selectedSubscription.purchase.service_name}</p>
                    </div>
                    <div>
                      <span className="text-blue-700">سعر البيع/مستخدم:</span>
                      <p className="font-medium text-blue-900">
                        {Number(selectedSubscription.purchase.sale_price_per_user || 0).toFixed(2)} ريال
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-700">التكلفة الأصلية:</span>
                      <p className="font-medium text-blue-900">
                        {Number(selectedSubscription.purchase.purchase_price).toFixed(2)} ريال
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-700">الحد الأقصى للمستخدمين:</span>
                      <p className="font-medium text-blue-900">{selectedSubscription.purchase.max_users}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  معرف الاشتراك: {selectedSubscription.id}
                </div>
                <div className="flex space-x-3 space-x-reverse">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedSubscription);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    تعديل الاشتراك
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;