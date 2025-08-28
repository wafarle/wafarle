import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Loader2, Eye, Crown, CreditCard, DollarSign, User, Download } from 'lucide-react';
import { useCustomers, useProducts } from '../hooks/useSupabase';
import { Customer } from '../types';

const Customers: React.FC = () => {
  const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { products } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    product_id: ''
  });

  // دالة لحساب إجمالي المدفوعات للعميل
  const calculateTotalPayments = (customer: Customer) => {
    let total = 0;
    
    // إضافة مبالغ الفواتير المدفوعة
    if (customer.invoices) {
      customer.invoices.forEach(invoice => {
        if (invoice.status === 'paid') {
          total += Number(invoice.total_amount || invoice.amount || 0);
        }
      });
    }
    
    // إضافة مبالغ المبيعات النشطة
    if (customer.sales) {
      customer.sales.forEach(sale => {
        if (sale.status === 'active') {
          total += Number(sale.sale_price || 0);
        }
      });
    }
    
    return total;
  };

  // دالة للتحقق من حالة الاشتراك
  const getSubscriptionStatus = (customer: Customer) => {
    if (!customer.subscriptions || customer.subscriptions.length === 0) {
      return { hasSubscription: false, status: 'غير مشترك', color: 'bg-gray-100 text-gray-800' };
    }
    
    const activeSubscriptions = customer.subscriptions.filter(sub => sub.status === 'active');
    if (activeSubscriptions.length > 0) {
      return { hasSubscription: true, status: 'مشترك نشط', color: 'bg-green-100 text-green-800' };
    }
    
    const expiredSubscriptions = customer.subscriptions.filter(sub => sub.status === 'expired');
    if (expiredSubscriptions.length > 0) {
      return { hasSubscription: true, status: 'اشتراك منتهي', color: 'bg-red-100 text-red-800' };
    }
    
    return { hasSubscription: true, status: 'اشتراك ملغي', color: 'bg-yellow-100 text-yellow-800' };
  };

  const filteredCustomers = customers.filter(customer => {
    // فلتر البحث
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm);
    
    // فلتر الاشتراك
    let matchesSubscription = true;
    if (subscriptionFilter === 'subscribed') {
      matchesSubscription = getSubscriptionStatus(customer).hasSubscription;
    } else if (subscriptionFilter === 'not_subscribed') {
      matchesSubscription = !getSubscriptionStatus(customer).hasSubscription;
    }
    
    return matchesSearch && matchesSubscription;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // تحويل product_id فارغ إلى null لتجنب خطأ UUID validation
    const formDataToSubmit = {
      ...formData,
      product_id: formData.product_id === '' ? null : formData.product_id
    };
    
    let result;
    if (editingCustomer) {
      result = await updateCustomer(editingCustomer.id, formDataToSubmit);
    } else {
      result = await addCustomer(formDataToSubmit);
    }

    if (result.success) {
      setShowAddModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', email: '', phone: '', address: '', product_id: '' });
    } else {
      alert(result.error || 'حدث خطأ في حفظ البيانات');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      product_id: customer.product_id || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      await deleteCustomer(id);
    }
  };

  const handleShowDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const exportCustomersToExcel = () => {
    import('xlsx').then((XLSX) => {
      const customersData = customers.map(customer => ({
        'اسم العميل': customer.name,
        'البريد الإلكتروني': customer.email || 'غير محدد',
        'رقم الهاتف': customer.phone,
        'العنوان': customer.address,
        'تاريخ الإنشاء': new Date(customer.created_at).toLocaleDateString('ar-SA'),
        'عدد الاشتراكات': customer.subscriptions?.length || 0,
        'إجمالي المدفوع': customer.invoices?.reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount), 0).toFixed(2) || '0',
        'حالة الاشتراك': customer.subscriptions && customer.subscriptions.length > 0 ? 'مشترك' : 'غير مشترك'
      }));

      const ws = XLSX.utils.json_to_sheet(customersData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
      
      // تنسيق الأعمدة
      const colWidths = [
        { wch: 20 }, // اسم العميل
        { wch: 25 }, // البريد الإلكتروني
        { wch: 15 }, // رقم الهاتف
        { wch: 30 }, // العنوان
        { wch: 15 }, // تاريخ الإنشاء
        { wch: 15 }, // عدد الاشتراكات
        { wch: 15 }, // إجمالي المدفوع
        { wch: 15 }  // حالة الاشتراك
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `العملاء_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل العملاء...</span>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث عن العملاء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع العملاء</option>
            <option value="subscribed">المشتركون فقط</option>
            <option value="not_subscribed">غير المشتركين</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCustomersToExcel}
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
            إضافة عميل جديد
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
              <p className="text-lg font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <Crown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">المشتركون</p>
              <p className="text-lg font-bold text-green-600">
                {customers.filter(c => getSubscriptionStatus(c).hasSubscription).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg ml-3">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">غير المشتركين</p>
              <p className="text-lg font-bold text-gray-600">
                {customers.filter(c => !getSubscriptionStatus(c).hasSubscription).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            عرض {filteredCustomers.length} من أصل {customers.length} عميل
            {subscriptionFilter !== 'all' && (
              <span className="mr-2">
                (فلتر: {subscriptionFilter === 'subscribed' ? 'المشتركون فقط' : 'غير المشتركين'})
              </span>
            )}
          </span>
          {searchTerm && (
            <span>نتائج البحث عن: "{searchTerm}"</span>
          )}
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? `لم يتم العثور على عملاء يطابقون البحث "${searchTerm}"`
                  : subscriptionFilter !== 'all'
                  ? `لا يوجد عملاء ${subscriptionFilter === 'subscribed' ? 'مشتركون' : 'غير مشتركين'}`
                  : 'لا يوجد عملاء'
                }
              </p>
              <div className="flex justify-center gap-3">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    مسح البحث
                  </button>
                )}
                {subscriptionFilter !== 'all' && (
                  <button
                    onClick={() => setSubscriptionFilter('all')}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    عرض جميع العملاء
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
          const subscriptionStatus = getSubscriptionStatus(customer);
          const totalPayments = calculateTotalPayments(customer);
          
          return (
            <div key={customer.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{customer.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${subscriptionStatus.color}`}>
                    {subscriptionStatus.status}
                  </span>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  <button
                    onClick={() => handleShowDetails(customer)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="عرض تفاصيل العميل"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 ml-3 text-gray-400" />
                  {customer.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 ml-3 text-gray-400" />
                  {customer.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 ml-3 text-gray-400" />
                  {customer.address}
                </div>
              </div>

              {/* معلومات الاشتراك والدفع */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {/* حالة الاشتراك */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Crown className="w-4 h-4 ml-2 text-gray-400" />
                    <span>الاشتراك:</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${subscriptionStatus.color}`}>
                    {subscriptionStatus.status}
                  </span>
                </div>

                {/* تفاصيل الاشتراك */}
                {customer.subscriptions && customer.subscriptions.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">تفاصيل الاشتراكات:</h4>
                    <div className="space-y-2">
                      {customer.subscriptions.slice(0, 2).map((subscription, index) => (
                        <div key={subscription.id} className="text-xs text-gray-600">
                          <div className="flex items-center justify-between">
                            <span>
                              {subscription.pricing_tier?.product?.name || 'غير محدد'}
                              {subscription.purchase?.service_name && ` (${subscription.purchase.service_name})`}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                              subscription.status === 'expired' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {subscription.status === 'active' ? 'نشط' : 
                               subscription.status === 'expired' ? 'منتهي' : 'ملغي'}
                            </span>
                          </div>
                                                     <div className="text-gray-500 mt-1">
                             {new Date(subscription.start_date).toLocaleDateString('en-US')} - {new Date(subscription.end_date).toLocaleDateString('en-US')}
                           </div>
                        </div>
                      ))}
                      {customer.subscriptions.length > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{customer.subscriptions.length - 2} اشتراكات أخرى
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* إجمالي المدفوعات */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 ml-2 text-gray-400" />
                    <span>إجمالي المدفوعات:</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {totalPayments.toFixed(2)} ريال
                  </span>
                </div>

                                 {/* تاريخ الانضمام */}
                 <div className="flex items-center justify-between text-sm text-gray-500">
                   <span>انضم في:</span>
                   <span className="font-medium">{new Date(customer.created_at).toLocaleDateString('en-US')}</span>
                 </div>
                 
                 {/* المنتج المختار */}
                 {customer.product_id && (
                   <div className="flex items-center justify-between text-sm text-gray-500">
                     <span>المنتج:</span>
                     <span className="font-medium text-blue-600">
                       {products.find(p => p.id === customer.product_id)?.name || 'غير محدد'}
                     </span>
                   </div>
                 )}
              </div>
                         </div>
           );
         })
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="اسم العميل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="البريد الإلكتروني"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+966501234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="عنوان العميل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنتج (اختياري)</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر المنتج (أو اتركه فارغ)</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.max_users} مستخدم
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                    setFormData({ name: '', email: '', phone: '', address: '', product_id: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingCustomer ? 'تحديث العميل' : 'إضافة العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedCustomer.name}</h2>
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <span className="flex items-center">
                      <Mail className="w-4 h-4 ml-2" />
                      {selectedCustomer.email || 'غير محدد'}
                    </span>
                    <span className="flex items-center">
                      <Phone className="w-4 h-4 ml-2" />
                      {selectedCustomer.phone || 'غير محدد'}
                    </span>
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
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <MapPin className="w-5 h-5 ml-2 text-blue-600" />
                  المعلومات الأساسية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">العنوان:</span>
                    <p className="text-gray-800 mt-1">{selectedCustomer.address || 'غير محدد'}</p>
                  </div>
                                     <div>
                     <span className="text-sm font-medium text-gray-600">تاريخ الانضمام:</span>
                     <p className="text-gray-800 mt-1">
                       {new Date(selectedCustomer.created_at).toLocaleDateString('en-US', {
                         year: 'numeric',
                         month: 'long',
                         day: 'numeric'
                       })}
                     </p>
                   </div>
                                     <div>
                     <span className="text-sm font-medium text-gray-600">آخر تحديث:</span>
                     <p className="text-gray-800 mt-1">
                       {new Date(selectedCustomer.updated_at).toLocaleDateString('en-US', {
                         year: 'numeric',
                         month: 'long',
                         day: 'numeric'
                       })}
                     </p>
                   </div>
                   <div>
                     <span className="text-sm font-medium text-gray-600">المنتج المختار:</span>
                     <p className="text-gray-800 mt-1">
                       {selectedCustomer.product_id ? 
                         (products.find(p => p.id === selectedCustomer.product_id)?.name || 'غير محدد') 
                         : 'لم يتم اختيار منتج'}
                     </p>
                   </div>
                </div>
              </div>

              {/* Subscription Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Crown className="w-5 h-5 ml-2 text-yellow-600" />
                  حالة الاشتراك
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">الحالة الحالية:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatus(selectedCustomer).color}`}>
                    {getSubscriptionStatus(selectedCustomer).status}
                  </span>
                </div>
              </div>

              {/* Subscriptions Details */}
              {selectedCustomer.subscriptions && selectedCustomer.subscriptions.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <CreditCard className="w-5 h-5 ml-2 text-green-600" />
                    تفاصيل الاشتراكات ({selectedCustomer.subscriptions.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedCustomer.subscriptions.map((subscription, index) => (
                      <div key={subscription.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-800">
                            {subscription.pricing_tier?.product?.name || 'غير محدد'}
                            {subscription.purchase?.service_name && (
                              <span className="text-sm text-gray-600 ml-2">
                                ({subscription.purchase.service_name})
                              </span>
                            )}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                            subscription.status === 'expired' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {subscription.status === 'active' ? 'نشط' : 
                             subscription.status === 'expired' ? 'منتهي' : 'ملغي'}
                          </span>
                        </div>
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                           <div>
                             <span className="font-medium">تاريخ البداية:</span>
                             <p>{new Date(subscription.start_date).toLocaleDateString('en-US')}</p>
                           </div>
                           <div>
                             <span className="font-medium">تاريخ الانتهاء:</span>
                             <p>{new Date(subscription.end_date).toLocaleDateString('en-US')}</p>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 ml-2 text-green-600" />
                  معلومات الدفع
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Total Payments */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">إجمالي المدفوعات</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {calculateTotalPayments(selectedCustomer).toFixed(2)} ريال
                    </div>
                  </div>

                  {/* Invoices Summary */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">ملخص الفواتير</h4>
                    <div className="space-y-2">
                      {selectedCustomer.invoices && selectedCustomer.invoices.length > 0 ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>المدفوع:</span>
                            <span className="text-green-600 font-medium">
                              {selectedCustomer.invoices.filter(inv => inv.status === 'paid').length}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>المعلق:</span>
                            <span className="text-yellow-600 font-medium">
                              {selectedCustomer.invoices.filter(inv => inv.status === 'pending').length}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>المتأخر:</span>
                            <span className="text-red-600 font-medium">
                              {selectedCustomer.invoices.filter(inv => inv.status === 'overdue').length}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">لا توجد فواتير</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Information */}
              {selectedCustomer.sales && selectedCustomer.sales.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 ml-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    المبيعات المباشرة ({selectedCustomer.sales.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedCustomer.sales.map((sale) => (
                      <div key={sale.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-800">
                            {sale.purchase?.service_name || 'خدمة غير محددة'}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sale.status === 'active' ? 'bg-green-100 text-green-700' :
                            sale.status === 'expired' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {sale.status === 'active' ? 'نشط' : 
                             sale.status === 'expired' ? 'منتهي' : 'ملغي'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">سعر البيع:</span>
                            <p className="text-green-600 font-medium">{sale.sale_price} ريال</p>
                          </div>
                          <div>
                            <span className="font-medium">تاريخ البيع:</span>
                            <p>{new Date(sale.sale_date).toLocaleDateString('en-US')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

export default Customers;