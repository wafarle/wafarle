import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Star, 
  Check, 
  Crown,
  Sparkles,
  FileText,
  Palette,
  MessageSquare,
  Music,
  Tv,
  Paintbrush2,
  Loader2
} from 'lucide-react';
import { useProducts } from '../hooks/useSupabase';
import { Product, PricingTier } from '../types';

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
    features: ['', '', '', '', ''],
    icon: 'Package',
    color: 'from-blue-500 to-purple-500',
    is_popular: false
  });

  const iconOptions = [
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
    
    const productData = {
      ...formData,
      features: formData.features.filter(f => f.trim() !== '')
    };

    let result;
    if (editingProduct) {
      result = await updateProduct(editingProduct.id, productData);
    } else {
      result = await addProduct(productData);
    }

    if (result.success) {
      setShowAddModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: 'productivity',
        features: ['', '', '', '', ''],
        icon: 'Package',
        color: 'from-blue-500 to-purple-500',
        is_popular: false
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      features: [...product.features, ...Array(Math.max(0, 5 - product.features.length)).fill('')],
      icon: product.icon,
      color: product.color,
      is_popular: product.is_popular
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
      FileText, Palette, MessageSquare, Music, Tv, Paintbrush2
    };
    return iconMap[iconName] || FileText;
  };

  const PricingCard: React.FC<{ tier: PricingTier; productColor: string }> = ({ tier, productColor }) => (
    <div className={`relative bg-white rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
      tier.is_recommended ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {tier.is_recommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
            <Crown className="w-4 h-4 ml-1" />
            الأكثر شعبية
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h4>
        <div className="flex items-center justify-center mb-2">
          {tier.original_price && (
            <span className="text-lg text-gray-400 line-through ml-2">{tier.original_price} ريال</span>
          )}
          <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
          <span className="text-gray-600 mr-1">ريال/شهر</span>
        </div>
        {tier.discount_percentage && (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
            وفر {tier.discount_percentage}%
          </span>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-center text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <button className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
        tier.is_recommended
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg'
          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
      }`}>
        اختر هذه الخطة
      </button>
    </div>
  );

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">منتجاتنا</h1>
          <p className="text-gray-600">اكتشف مجموعة منتجاتنا المتميزة مع خطط اشتراك مرنة</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center shadow-lg"
        >
          <Plus className="w-5 h-5 ml-2" />
          إضافة منتج جديد
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="البحث في المنتجات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setCategoryFilter(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                categoryFilter === category.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-12">
        {filteredProducts.map((product) => {
          const IconComponent = getIcon(product.icon);
          
          return (
            <div key={product.id} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Product Header */}
              <div className={`bg-gradient-to-r ${product.color} p-8 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <IconComponent className="w-full h-full" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-3 bg-white bg-opacity-20 rounded-lg ml-4">
                        <IconComponent className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
                        {product.is_popular && (
                          <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium flex items-center w-fit">
                            <Star className="w-4 h-4 ml-1" />
                            الأكثر شعبية
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-lg opacity-90 mb-6">{product.description}</p>
                  
                  {/* Features */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {product.features.map((feature, index) => (
                      <div key={index} className="flex items-center bg-white bg-opacity-10 rounded-lg p-3">
                        <Sparkles className="w-4 h-4 ml-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing Tiers */}
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">اختر الخطة المناسبة لك</h3>
                {product.pricing_tiers && product.pricing_tiers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {product.pricing_tiers.map((tier) => (
                      <PricingCard key={tier.id} tier={tier} productColor={product.color} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد خطط تسعير متاحة لهذا المنتج
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم المنتج</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="اسم المنتج"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفئة</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="productivity">الإنتاجية</option>
                    <option value="design">التصميم</option>
                    <option value="ai">الذكاء الاصطناعي</option>
                    <option value="entertainment">الترفيه</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">وصف المنتج</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف تفصيلي للمنتج"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الأيقونة</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {iconOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اللون</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {colorOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الميزات الرئيسية</label>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div className="flex justify-end space-x-4 space-x-reverse pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      description: '',
                      category: 'productivity',
                      features: ['', '', '', '', ''],
                      icon: 'Package',
                      color: 'from-blue-500 to-purple-500',
                      is_popular: false
                    });
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
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