import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Star, 
  ShoppingCart,
  FileText,
  Palette,
  MessageSquare,
  Music,
  Tv,
  Paintbrush2,
  Loader2,
  Package,
  Eye,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useProducts, usePurchases } from '../hooks/useSupabase';
import { Product } from '../types';

const Products: React.FC = () => {
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const { purchases, updatePurchase, loading: purchasesLoading } = usePurchases();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'productivity',
    price: 0,
    features: ['', '', ''],
    icon: 'Package',
    color: 'from-blue-500 to-purple-500',
    is_popular: false,
    max_users: 1,
    available_slots: 0,
    selected_purchase_id: ''
  });

  const iconOptions = [
    { value: 'Package', label: 'حزمة', icon: Package },
    { value: 'FileText', label: 'مستندات', icon: FileText },
    { value: 'Palette', label: 'تصميم', icon: Palette },
    { value: 'MessageSquare', label: 'محادثة', icon: MessageSquare },
    { value: 'Music', label: 'موسيقى', icon: Music },
    { value: 'Tv', label: 'فيديو', icon: Tv },
    { value: 'Paintbrush2', label: 'رسم', icon: Paintbrush2 }
  ];

  const colorOptions = [
    { value: 'from-blue-600 to-blue-800', label: 'أزرق' },
    { value: 'from-purple-600 to-pink-600', label: 'بنفسجي' },
    { value: 'from-green-500 to-emerald-600', label: 'أخضر' },
    { value: 'from-red-600 to-red-800', label: 'أحمر' },
    { value: 'from-cyan-400 to-blue-500', label: 'سماوي' },
    { value: 'from-orange-500 to-red-500', label: 'برتقالي' }
  ];

  const categories = [
    { id: 'all', name: 'جميع المنتجات', count: products.length },
    { id: 'productivity', name: 'الإنتاجية', count: products.filter(p => p.category === 'productivity').length },
    { id: 'design', name: 'التصميم', count: products.filter(p => p.category === 'design').length },
    { id: 'ai', name: 'الذكاء الاصطناعي', count: products.filter(p => p.category === 'ai').length },
    { id: 'entertainment', name: 'الترفيه', count: products.filter(p => p.category === 'entertainment').length }
  ];

  // Get available purchases (active and not linked to any product)
  const availablePurchases = purchases.filter(purchase => 
    purchase.status === 'active' && (!purchase.product_id || purchase.product_id === null)
  );

  console.log('Available purchases:', availablePurchases); // للتشخيص
  console.log('All purchases:', purchases); // للتشخيص

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // المنتجات المتاحة (available_slots > 0) في الأعلى
      const aAvailable = (a.available_slots || 0) > 0;
      const bAvailable = (b.available_slots || 0) > 0;
      
      if (aAvailable && !bAvailable) return -1; // a متاح، b مكتمل
      if (!aAvailable && bAvailable) return 1;  // a مكتمل، b متاح
      
      // إذا كان كلاهما متاح أو كلاهما مكتمل، رتب حسب الاسم
      return a.name.localeCompare(b.name, 'ar');
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات قبل الإرسال
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      alert('اسم المنتج يجب أن يكون على الأقل حرفين');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      alert('وصف المنتج يجب أن يكون على الأقل 10 أحرف');
      return;
    }

    if (formData.price < 0) {
      alert('السعر لا يمكن أن يكون سالباً');
      return;
    }

    if (formData.max_users < 1) {
      alert('عدد المستخدمين يجب أن يكون على الأقل 1');
      return;
    }

    // Remove selected_purchase_id from form data before submitting
    const { selected_purchase_id, ...productData } = formData;
    
    let result;
    if (editingProduct) {
      result = await updateProduct(editingProduct.id, productData);
    } else {
      result = await addProduct(productData);
    }

    if (result.success && selected_purchase_id && !editingProduct) {
      // Link the purchase to the newly created product
      await updatePurchase(selected_purchase_id, { 
        product_id: result.data.id 
      });
    }

    if (result.success) {
      setShowAddModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: 'productivity',
        price: 0,
        features: ['', '', ''],
        icon: 'Package',
        color: 'from-blue-500 to-purple-500',
        is_popular: false,
        max_users: 1,
        available_slots: 0,
        selected_purchase_id: ''
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price || 0,
      features: [...product.features, ...Array(Math.max(0, 3 - product.features.length)).fill('')],
      icon: product.icon,
      color: product.color,
      is_popular: product.is_popular,
      max_users: product.max_users || 1,
      available_slots: product.available_slots || 0,
      selected_purchase_id: ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      await deleteProduct(id);
    }
  };

  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const exportProductsToExcel = () => {
    import('xlsx').then((XLSX) => {
      const productsData = products.map(product => ({
        'اسم المنتج': product.name,
        'الوصف': product.description,
        'الفئة': product.category === 'productivity' ? 'الإنتاجية' : 
                 product.category === 'design' ? 'التصميم' : 
                 product.category === 'ai' ? 'الذكاء الاصطناعي' : 
                 product.category === 'entertainment' ? 'الترفيه' : 'أخرى',
        'السعر': product.price,
        'السمات': product.features?.filter(f => f.trim()).join('، ') || 'لا توجد سمات',
        'الحد الأقصى للمستخدمين': product.max_users,
        'المواقع المتاحة': product.available_slots,
        'شعبي': product.is_popular ? 'نعم' : 'لا',
        'تاريخ الإنشاء': new Date(product.created_at).toLocaleDateString('ar-SA'),
        'آخر تحديث': new Date(product.updated_at).toLocaleDateString('ar-SA')
      }));

      const ws = XLSX.utils.json_to_sheet(productsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
      
      // تنسيق الأعمدة
      const colWidths = [
        { wch: 25 }, // اسم المنتج
        { wch: 40 }, // الوصف
        { wch: 15 }, // الفئة
        { wch: 12 }, // السعر
        { wch: 50 }, // السمات
        { wch: 20 }, // الحد الأقصى للمستخدمين
        { wch: 18 }, // المواقع المتاحة
        { wch: 10 }, // شعبي
        { wch: 15 }, // تاريخ الإنشاء
        { wch: 15 }  // آخر تحديث
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `المنتجات_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
    });
  };

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      Package, FileText, Palette, MessageSquare, Music, Tv, Paintbrush2
    };
    return iconMap[iconName] || Package;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل المنتجات...</span>
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">المنتجات</h1>
          <p className="text-gray-600">إدارة منتجاتك وأسعارها</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportProductsToExcel}
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
            إضافة منتج جديد
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="البحث في المنتجات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setCategoryFilter(category.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المنتجات</p>
              <p className="text-lg font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <div className="w-5 h-5 bg-green-600 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">المنتجات المتاحة</p>
              <p className="text-lg font-bold text-green-600">
                {products.filter(p => (p.available_slots || 0) > 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <div className="w-5 h-5 bg-red-600 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">المنتجات المكتملة</p>
              <p className="text-lg font-bold text-red-600">
                {products.filter(p => (p.available_slots || 0) === 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const IconComponent = getIcon(product.icon);
          
          return (
            <div key={product.id} className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden ${
              (product.available_slots || 0) > 0 
                ? 'border-green-200' 
                : 'border-red-200'
            }`}>
              {/* Product Image/Icon */}
              <div className={`bg-gradient-to-r ${product.color} p-6 text-white relative`}>
                {/* شارة الحالة */}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                    (product.available_slots || 0) > 0
                      ? 'bg-green-400 text-green-900'
                      : 'bg-red-400 text-red-900'
                  }`}>
                    {(product.available_slots || 0) > 0 ? (
                      <>
                        <div className="w-2 h-2 bg-green-600 rounded-full ml-1"></div>
                        متاح
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-600 rounded-full ml-1"></div>
                        مكتمل
                      </>
                    )}
                  </span>
                </div>
                
                {product.is_popular && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <Star className="w-3 h-3 ml-1" />
                      شعبي
                    </span>
                  </div>
                )}
                <div className="flex justify-center">
                  <IconComponent className="w-16 h-16" />
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                
                {/* Features */}
                <div className="mb-4">
                  <ul className="space-y-1">
                    {product.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="text-xs text-gray-500 flex items-center">
                        <div className="w-1 h-1 bg-gray-400 rounded-full ml-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {/* عرض المستخدمين المتاحين */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-500">المستخدمين المتاحين:</span>
                    <span className={`font-medium ${product.available_slots > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {product.available_slots || 0}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-green-600 font-bold text-lg">ر.س</span>
                    <span className="text-2xl font-bold text-gray-900 mr-1">
                      {/* عرض سعر البيع من المشتريات المرتبطة أو السعر العادي */}
                      {(() => {
                        const linkedPurchase = purchases.find(p => p.product_id === product.id);
                        const displayPrice = linkedPurchase?.sale_price_per_user || product.price || 0;
                        return Number(displayPrice).toFixed(2);
                      })()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {product.category === 'productivity' ? 'إنتاجية' :
                     product.category === 'design' ? 'تصميم' :
                     product.category === 'ai' ? 'ذكاء اصطناعي' : 'ترفيه'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 space-x-reverse">
                  <button 
                    onClick={() => handleShowDetails(product)}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    عرض التفاصيل
                  </button>
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة منتجك الأول</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            إضافة منتج جديد
          </button>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Link to existing purchase - only when adding new product */}
              {!editingProduct && availablePurchases.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    ربط بمشتريات موجودة (اختياري)
                  </label>
                  <select
                    value={formData.selected_purchase_id}
                    onChange={(e) => {
                      const selectedPurchase = purchases.find(p => p.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        selected_purchase_id: e.target.value,
                        name: selectedPurchase ? selectedPurchase.service_name : prev.name,
                        max_users: selectedPurchase ? selectedPurchase.max_users : prev.max_users,
                        price: selectedPurchase ? (Number(selectedPurchase.sale_price_per_user) || (Number(selectedPurchase.purchase_price) / selectedPurchase.max_users)) : prev.price
                      }));
                    }}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">اختر مشتريات لربطها بالمنتج</option>
                    {availablePurchases.map(purchase => (
                      <option key={purchase.id} value={purchase.id}>
                        {purchase.service_name} - {purchase.max_users} مستخدم - {Number(purchase.purchase_price).toFixed(2)} ريال
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-600 mt-2">
                    سيتم ملء بيانات المنتج تلقائياً من المشتريات المحددة
                  </p>
                </div>
              )}

              {/* رسالة في حالة عدم وجود مشتريات متاحة */}
              {!editingProduct && !purchasesLoading && availablePurchases.length === 0 && purchases.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 ml-2" />
                    <span className="text-sm text-yellow-800">
                      جميع المشتريات مربوطة بمنتجات أخرى أو غير نشطة
                    </span>
                  </div>
                </div>
              )}

              {/* رسالة في حالة عدم وجود مشتريات على الإطلاق */}
              {!editingProduct && !purchasesLoading && purchases.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Package className="w-5 h-5 text-blue-600 ml-2" />
                    <span className="text-sm text-blue-800">
                      لا توجد مشتريات متاحة. يمكنك إضافة مشتريات من صفحة "المشتريات والمبيعات"
                    </span>
                  </div>
                </div>
              )}

              {/* رسالة التحميل */}
              {!editingProduct && purchasesLoading && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600 ml-2" />
                    <span className="text-sm text-gray-600">
                      جاري تحميل المشتريات...
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="اسم المنتج"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف المنتج</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف المنتج"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعر (ريال)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للمستخدمين</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_users}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 1 }))}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.selected_purchase_id ? 'bg-gray-100' : ''
                    }`}
                    placeholder="1"
                    readOnly={!!formData.selected_purchase_id}
                  />
                  {formData.selected_purchase_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      العدد مأخوذ من المشتريات المحددة
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="productivity">الإنتاجية</option>
                  <option value="design">التصميم</option>
                  <option value="ai">الذكاء الاصطناعي</option>
                  <option value="entertainment">الترفيه</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الأيقونة</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {iconOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللون</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {colorOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الميزات</label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <input
                      key={index}
                      type="text"
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...formData.features];
                        newFeatures[index] = e.target.value;
                        setFormData(prev => ({ ...prev, features: newFeatures }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`الميزة ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_popular"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_popular: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_popular" className="mr-2 text-sm font-medium text-gray-700">
                  منتج شعبي
                </label>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      description: '',
                      category: 'productivity',
                      price: 0,
                      features: ['', '', ''],
                      icon: 'Package',
                      color: 'from-blue-500 to-purple-500',
                      is_popular: false,
                      max_users: 1,
                      available_slots: 0,
                      selected_purchase_id: ''
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
                  {editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
                 </div>
       )}

       {/* Product Details Modal */}
       {showDetailsModal && selectedProduct && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
             {/* Header */}
             <div className={`bg-gradient-to-r ${selectedProduct.color} text-white p-6 rounded-t-xl relative`}>
               <div className="flex justify-between items-start">
                 <div className="flex items-center">
                   <div className="p-3 bg-white bg-opacity-20 rounded-lg ml-4">
                     {(() => {
                       const IconComponent = getIcon(selectedProduct.icon);
                       return <IconComponent className="w-8 h-8" />;
                     })()}
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold mb-2">{selectedProduct.name}</h2>
                     <div className="flex items-center space-x-4 space-x-reverse">
                       <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                         {selectedProduct.category === 'productivity' ? 'الإنتاجية' :
                          selectedProduct.category === 'design' ? 'التصميم' :
                          selectedProduct.category === 'ai' ? 'الذكاء الاصطناعي' : 'الترفيه'}
                       </span>
                       {selectedProduct.is_popular && (
                         <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                           <Star className="w-4 h-4 ml-1" />
                           شعبي
                         </span>
                       )}
                       <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                         (selectedProduct.available_slots || 0) > 0
                           ? 'bg-green-400 text-green-900'
                           : 'bg-red-400 text-red-900'
                       }`}>
                         {(selectedProduct.available_slots || 0) > 0 ? 'متاح' : 'مكتمل'}
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
               {/* Description */}
               <div className="bg-gray-50 rounded-lg p-4">
                 <h3 className="text-lg font-semibold text-gray-800 mb-3">وصف المنتج</h3>
                 <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
               </div>

               {/* Features */}
               <div className="bg-gray-50 rounded-lg p-4">
                 <h3 className="text-lg font-semibold text-gray-800 mb-3">الميزات</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {selectedProduct.features.filter(f => f).map((feature, index) => (
                     <div key={index} className="flex items-center">
                       <div className="w-2 h-2 bg-blue-500 rounded-full ml-3"></div>
                       <span className="text-gray-700">{feature}</span>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Pricing and Capacity */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Pricing Information */}
                 <div className="bg-gray-50 rounded-lg p-4">
                   <h3 className="text-lg font-semibold text-gray-800 mb-3">معلومات التسعير</h3>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center">
                       <span className="text-gray-600">السعر الأساسي:</span>
                       <span className="text-2xl font-bold text-green-600">
                         {(() => {
                           const linkedPurchase = purchases.find(p => p.product_id === selectedProduct.id);
                           const displayPrice = linkedPurchase?.sale_price_per_user || selectedProduct.price || 0;
                           return Number(displayPrice).toFixed(2);
                         })()} ريال
                       </span>
                     </div>
                     {(() => {
                       const linkedPurchase = purchases.find(p => p.product_id === selectedProduct.id);
                       if (linkedPurchase) {
                         return (
                           <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                             <div className="text-sm text-blue-800">
                               <div className="font-medium mb-1">مربوط بمشتريات:</div>
                               <div className="text-xs space-y-1">
                                 <div>الخدمة: {linkedPurchase.service_name}</div>
                                 <div>سعر البيع: {Number(linkedPurchase.sale_price_per_user || 0).toFixed(2)} ريال/مستخدم</div>
                                 <div>التكلفة الأصلية: {Number(linkedPurchase.purchase_price).toFixed(2)} ريال</div>
                               </div>
                             </div>
                           </div>
                         );
                       }
                       return null;
                     })()}
                   </div>
                 </div>

                 {/* Capacity Information */}
                 <div className="bg-gray-50 rounded-lg p-4">
                   <h3 className="text-lg font-semibold text-gray-800 mb-3">معلومات السعة</h3>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center">
                       <span className="text-gray-600">الحد الأقصى للمستخدمين:</span>
                       <span className="text-lg font-semibold text-gray-900">{selectedProduct.max_users}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-gray-600">المستخدمين المتاحين:</span>
                       <span className={`text-lg font-semibold ${
                         (selectedProduct.available_slots || 0) > 0 ? 'text-green-600' : 'text-red-600'
                       }`}>
                         {selectedProduct.available_slots || 0}
                       </span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-gray-600">المستخدمين المستخدمين:</span>
                       <span className="text-lg font-semibold text-gray-900">
                         {(selectedProduct.max_users || 0) - (selectedProduct.available_slots || 0)}
                       </span>
                     </div>
                     
                     {/* Progress Bar */}
                     <div className="mt-3">
                       <div className="flex justify-between text-xs text-gray-600 mb-1">
                         <span>معدل الاستخدام</span>
                         <span>{Math.round(((selectedProduct.max_users || 0) - (selectedProduct.available_slots || 0)) / (selectedProduct.max_users || 1) * 100)}%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-2">
                         <div 
                           className={`h-2 rounded-full transition-all duration-300 ${
                             (selectedProduct.available_slots || 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                           }`}
                           style={{
                             width: `${Math.min(((selectedProduct.max_users || 0) - (selectedProduct.available_slots || 0)) / (selectedProduct.max_users || 1) * 100, 100)}%`
                           }}
                         ></div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Additional Information */}
               <div className="bg-gray-50 rounded-lg p-4">
                 <h3 className="text-lg font-semibold text-gray-800 mb-3">معلومات إضافية</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div className="flex items-center">
                     <span className="text-gray-600 ml-2">الأيقونة:</span>
                     <span className="font-medium">{(() => {
                       const iconOption = iconOptions.find(opt => opt.value === selectedProduct.icon);
                       return iconOption ? iconOption.label : selectedProduct.icon;
                     })()}</span>
                   </div>
                   <div className="flex items-center">
                     <span className="text-gray-600 ml-2">اللون:</span>
                     <div className="w-4 h-4 rounded-full ml-2" style={{
                       background: `linear-gradient(to right, ${selectedProduct.color.split(' ')[1]}, ${selectedProduct.color.split(' ')[3]})`
                     }}></div>
                   </div>
                 </div>
               </div>
             </div>

             {/* Footer */}
             <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
               <div className="flex justify-between items-center">
                 <div className="text-sm text-gray-600">
                   آخر تحديث: {new Date(selectedProduct.updated_at || selectedProduct.created_at).toLocaleDateString('ar-SA')}
                 </div>
                 <div className="flex space-x-3 space-x-reverse">
                   <button
                     onClick={() => {
                       setShowDetailsModal(false);
                       handleEdit(selectedProduct);
                     }}
                     className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                   >
                     تعديل المنتج
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

export default Products;