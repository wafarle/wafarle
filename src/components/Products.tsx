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
  Package
} from 'lucide-react';
import { useProducts, usePurchases } from '../hooks/useSupabase';
import { Product } from '../types';

const Products: React.FC = () => {
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
    available_slots: 0
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingProduct) {
      result = await updateProduct(editingProduct.id, formData);
    } else {
      result = await addProduct(formData);
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
        available_slots: 0
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
      available_slots: product.available_slots || 0
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      await deleteProduct(id);
    }
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
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة منتج جديد
        </button>
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const IconComponent = getIcon(product.icon);
          
          return (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
              {/* Product Image/Icon */}
              <div className={`bg-gradient-to-r ${product.color} p-6 text-white relative`}>
                {product.is_popular && (
                  <div className="absolute top-2 left-2">
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
                    <span className="text-2xl font-bold text-gray-900 mr-1">{Number(product.price || 0).toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {product.category === 'productivity' ? 'إنتاجية' :
                     product.category === 'design' ? 'تصميم' :
                     product.category === 'ai' ? 'ذكاء اصطناعي' : 'ترفيه'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 space-x-reverse">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm">
                    <ShoppingCart className="w-4 h-4 ml-1" />
                    إضافة للسلة
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
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
                      available_slots: 0
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
    </div>
  );
};

export default Products;