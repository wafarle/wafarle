import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Star, 
  Filter, 
  ShoppingCart, 
  Eye, 
  Check, 
  Loader2,
  Tag,
  Users,
  Calendar,
  CreditCard,
  Zap,
  Shield,
  Heart,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../hooks/useCart';

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
  pricing_tiers: PricingTier[];
}

interface PricingTier {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  features: string[];
  is_recommended: boolean;
}

interface ServicesPageProps {
  onPageChange: (page: string) => void;
}

const ServicesPage: React.FC<ServicesPageProps> = ({ onPageChange }) => {
  const { cart, addToCart, getCartTotal, getCartItemsCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popular'>('popular');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
    loadFavorites();
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
      setError('حدث خطأ في تحميل الخدمات');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('customer_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    
    setFavorites(newFavorites);
    localStorage.setItem('customer_favorites', JSON.stringify(newFavorites));
  };

  const categories = [
    { id: 'all', name: 'جميع الخدمات', icon: Package },
    { id: 'productivity', name: 'الإنتاجية', icon: Zap },
    { id: 'design', name: 'التصميم', icon: Package },
    { id: 'ai', name: 'الذكاء الاصطناعي', icon: Package },
    { id: 'entertainment', name: 'الترفيه', icon: Package }
  ];

  const getCategoryName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      productivity: 'الإنتاجية',
      design: 'التصميم',
      ai: 'الذكاء الاصطناعي',
      entertainment: 'الترفيه'
    };
    return categoryMap[category] || category;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'ar');
      case 'price':
        const aPrice = a.pricing_tiers?.[0]?.price || 0;
        const bPrice = b.pricing_tiers?.[0]?.price || 0;
        return aPrice - bPrice;
      case 'popular':
        if (a.is_popular && !b.is_popular) return -1;
        if (!a.is_popular && b.is_popular) return 1;
        return a.name.localeCompare(b.name, 'ar');
      default:
        return 0;
    }
  });

  const handleProductView = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleAddToCart = (product: Product, tier: PricingTier) => {
    addToCart({
      product_id: product.id,
      pricing_tier_id: tier.id,
      product_name: product.name,
      tier_name: tier.name,
      price: tier.price,
      duration_months: tier.duration_months
    });
    
    // إظهار رسالة نجاح
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
    notification.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        تم إضافة ${product.name} للسلة
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="mr-2 text-gray-600">جاري تحميل الخدمات...</span>
      </div>
    );
  }

  if (error) {
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
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-3">🌟 خدماتنا المميزة</h1>
              <p className="text-green-100 text-xl mb-4">اكتشف أفضل الخدمات التقنية لتطوير أعمالك</p>
              <div className="flex items-center space-x-6 space-x-reverse text-green-100">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 ml-2" />
                  <span>ضمان 100%</span>
                </div>
                <div className="flex items-center">
                  <Zap className="w-5 h-5 ml-2" />
                  <span>تفعيل فوري</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 ml-2" />
                  <span>دعم 24/7</span>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <Package className="w-32 h-32 text-green-200 opacity-50" />
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن الخدمة المناسبة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="popular">الأكثر شعبية</option>
              <option value="name">اسم الخدمة</option>
              <option value="price">السعر</option>
            </select>

            {/* Cart Button */}
            <button
              onClick={() => setShowCartModal(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 flex items-center relative shadow-lg hover:shadow-xl"
            >
              <ShoppingCart className="w-5 h-5 ml-2" />
              السلة
              {getCartItemsCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                  {getCartItemsCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mt-6">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setCategoryFilter(category.id)}
                className={`flex items-center px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  categoryFilter === category.id
                    ? 'bg-green-500 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                <IconComponent className="w-4 h-4 ml-2" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedProducts.map((product) => {
          const lowestPrice = Math.min(...(product.pricing_tiers?.map(t => t.price) || [0]));
          const isFavorite = favorites.includes(product.id);
          
          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group"
            >
              {/* Product Header */}
              <div className={`bg-gradient-to-br ${product.color} p-6 text-white relative`}>
                {/* Favorite Button */}
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-3 left-3 p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'text-red-400 fill-current' : 'text-white'}`} />
                </button>

                {/* Popular Badge */}
                {product.is_popular && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-md">
                      <Star className="w-3 h-3 ml-1 fill-current" />
                      الأكثر طلباً
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                  <p className="text-sm opacity-90">{getCategoryName(product.category)}</p>
                </div>
              </div>

              {/* Product Body */}
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                  {product.description}
                </p>
                
                {/* Features Preview */}
                <div className="mb-4">
                  <ul className="space-y-2">
                    {product.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <Check className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
                        <span className="truncate">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {product.features.length > 3 && (
                    <p className="text-xs text-gray-500 mt-2">+{product.features.length - 3} ميزات أخرى</p>
                  )}
                </div>

                {/* Availability */}
                <div className="flex items-center justify-between mb-4 text-sm">
                  <div className="flex items-center text-gray-500">
                    <Users className="w-4 h-4 ml-1" />
                    <span>متاح:</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    {product.available_slots} من {product.max_users}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((product.available_slots / product.max_users) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">ر.س {lowestPrice}</span>
                      <span className="text-gray-500 text-sm mr-1">/ تبدأ من</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {product.pricing_tiers?.length || 0} باقة متاحة
                      </span>
                    </div>
                  </div>
                  
                  {/* Recommended Tier Preview */}
                  {product.pricing_tiers?.find(t => t.is_recommended) && (
                    <div className="mt-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        مُوصى: {product.pricing_tiers.find(t => t.is_recommended)?.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProductView(product)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Eye className="w-4 h-4 ml-2" />
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedProducts.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">لا توجد خدمات</h3>
            <p className="text-gray-600 text-lg mb-6">
              {searchTerm 
                ? `لم يتم العثور على خدمات تطابق "${searchTerm}"`
                : 'لا توجد خدمات متاحة في هذه الفئة'
              }
            </p>
            <div className="flex justify-center gap-4">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                >
                  مسح البحث
                </button>
              )}
              <button
                onClick={() => setCategoryFilter('all')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                عرض جميع الخدمات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className={`bg-gradient-to-r ${selectedProduct.color} text-white p-8 rounded-t-2xl relative`}>
              <button
                onClick={() => setShowProductModal(false)}
                className="absolute top-4 left-4 text-white hover:text-gray-200 transition-colors p-2 bg-white bg-opacity-20 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold mb-2">{selectedProduct.name}</h2>
                <p className="text-lg opacity-90">{getCategoryName(selectedProduct.category)}</p>
                
                {/* Quick Stats */}
                <div className="flex justify-center items-center space-x-8 space-x-reverse mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedProduct.available_slots}</div>
                    <div className="text-sm opacity-75">مكان متاح</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedProduct.pricing_tiers?.length || 0}</div>
                    <div className="text-sm opacity-75">باقة مختلفة</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedProduct.features.length}</div>
                    <div className="text-sm opacity-75">ميزة مدهشة</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Description */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📋 وصف الخدمة</h3>
                <p className="text-gray-700 leading-relaxed text-lg">{selectedProduct.description}</p>
              </div>

              {/* Features */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-4">✨ الميزات المتاحة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedProduct.features.filter(f => f.trim()).map((feature, index) => (
                    <div key={index} className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                      <Check className="w-5 h-5 text-green-500 ml-3 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Tiers */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">💎 اختر الباقة المناسبة لك</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedProduct.pricing_tiers?.map((tier) => (
                    <div
                      key={tier.id}
                      className={`relative border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                        tier.is_recommended 
                          ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg' 
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                    >
                      {tier.is_recommended && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                            ⭐ الأكثر اختياراً
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center mb-6">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h4>
                        <div className="mb-3">
                          {tier.original_price && tier.original_price > tier.price && (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-gray-500 line-through text-lg">
                                ر.س {tier.original_price}
                              </span>
                              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                -{tier.discount_percentage}%
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline justify-center">
                            <span className="text-3xl font-bold text-gray-900">ر.س {tier.price}</span>
                            <span className="text-gray-600 text-sm mr-2">/ {tier.duration_months} شهر</span>
                          </div>
                        </div>
                      </div>

                      {/* Tier Features */}
                      <div className="mb-6">
                        <ul className="space-y-2">
                          {tier.features.filter((f: string) => f.trim()).map((feature: string, index: number) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center">
                              <Check className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => {
                          handleAddToCart(selectedProduct, tier);
                          setShowProductModal(false);
                        }}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center ${
                          tier.is_recommended
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl'
                            : 'bg-gray-800 text-white hover:bg-gray-900 shadow-md hover:shadow-lg'
                        }`}
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إضافة للسلة
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <ShoppingCart className="w-6 h-6 ml-3" />
                  <h2 className="text-2xl font-bold">سلة التسوق</h2>
                </div>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2 bg-white bg-opacity-20 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Cart Content */}
            <div className="p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">السلة فارغة</h3>
                  <p className="text-gray-600 mb-6">أضف خدمات رائعة للسلة لبدء رحلتك معنا</p>
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
                  >
                    تصفح الخدمات
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Items */}
                  <div className="space-y-4">
                    {cart.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">{item.tier_name}</p>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4 ml-1" />
                            <span>{item.duration_months} شهر</span>
                            <span className="mx-2">•</span>
                            <span>الكمية: {item.quantity}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">ر.س {(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-sm text-gray-500">ر.س {item.price} × {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Total */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span className="text-gray-900">الإجمالي:</span>
                      <span className="text-green-600">ر.س {getCartTotal().toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      ({getCartItemsCount()} منتج في السلة)
                    </p>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => {
                      setShowCartModal(false);
                      onPageChange('checkout');
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <CreditCard className="w-5 h-5 ml-3" />
                    إتمام الشراء الآن ({getCartItemsCount()} منتج)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {getCartItemsCount() > 0 && (
        <div className="fixed bottom-6 left-6 z-40">
          <button
            onClick={() => setShowCartModal(true)}
            className="bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-700 transition-all duration-300 transform hover:scale-110 animate-bounce"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {getCartItemsCount()}
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;