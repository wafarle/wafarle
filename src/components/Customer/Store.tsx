import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Star, 
  Check, 
  Plus,
  Minus,
  Eye,
  Filter,
  Search,
  Loader2,
  CreditCard,
  Users,
  Calendar,
  Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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

interface CartItem {
  product_id: string;
  pricing_tier_id: string;
  product_name: string;
  tier_name: string;
  price: number;
  duration_months: number;
  quantity: number;
}

interface StoreProps {
  onPageChange: (page: string) => void;
}

const Store: React.FC<StoreProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    loadCart();
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

  const loadCart = () => {
    const savedCart = localStorage.getItem('subscription_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('subscription_cart', JSON.stringify(newCart));
  };

  const addToCart = (product: Product, tier: PricingTier, quantity: number = 1) => {
    const cartItem: CartItem = {
      product_id: product.id,
      pricing_tier_id: tier.id,
      product_name: product.name,
      tier_name: tier.name,
      price: tier.price,
      duration_months: tier.duration_months,
      quantity
    };

    const existingItem = cart.find(item => 
      item.product_id === product.id && item.pricing_tier_id === tier.id
    );

    let newCart;
    if (existingItem) {
      newCart = cart.map(item => 
        item.product_id === product.id && item.pricing_tier_id === tier.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newCart = [...cart, cartItem];
    }

    saveCart(newCart);
  };

  const removeFromCart = (productId: string, tierId: string) => {
    const newCart = cart.filter(item => 
      !(item.product_id === productId && item.pricing_tier_id === tierId)
    );
    saveCart(newCart);
  };

  const updateCartQuantity = (productId: string, tierId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, tierId);
      return;
    }

    const newCart = cart.map(item => 
      item.product_id === productId && item.pricing_tier_id === tierId
        ? { ...item, quantity }
        : item
    );
    saveCart(newCart);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const categories = [
    { id: 'all', name: 'جميع المنتجات' },
    { id: 'productivity', name: 'الإنتاجية' },
    { id: 'design', name: 'التصميم' },
    { id: 'ai', name: 'الذكاء الاصطناعي' },
    { id: 'entertainment', name: 'الترفيه' }
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

  const handleProductView = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('السلة فارغة! يرجى إضافة منتجات أولاً');
      return;
    }
    onPageChange('checkout');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="mr-2 text-gray-600">جاري تحميل المتجر...</span>
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
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">متجر الاشتراكات</h1>
            <p className="text-green-100 text-lg">اكتشف وابدأ اشتراكك الجديد</p>
          </div>
          <div className="hidden md:block">
            <ShoppingCart className="w-24 h-24 text-green-200" />
          </div>
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
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setCategoryFilter(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === category.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Shopping Cart Button */}
        <button
          onClick={() => setShowCartModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center relative"
        >
          <ShoppingCart className="w-5 h-5 ml-2" />
          السلة
          {getCartItemsCount() > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {getCartItemsCount()}
            </span>
          )}
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
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
                <Package className="w-16 h-16 mx-auto mb-3" />
                <h3 className="text-xl font-bold">{product.name}</h3>
                <p className="text-sm opacity-90 mt-1">{getCategoryName(product.category)}</p>
              </div>
            </div>

            {/* Product Details */}
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
              
              {/* Features Preview */}
              <div className="mb-4">
                <ul className="space-y-1">
                  {product.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="text-xs text-gray-500 flex items-center">
                      <Check className="w-3 h-3 text-green-500 ml-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Availability */}
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-gray-500">المتاح:</span>
                <span className="font-medium text-green-600">
                  {product.available_slots} من {product.max_users}
                </span>
              </div>

              {/* Pricing Tiers */}
              {product.pricing_tiers && product.pricing_tiers.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">الباقات المتاحة:</p>
                  <div className="space-y-2">
                    {product.pricing_tiers.slice(0, 2).map((tier) => (
                      <div key={tier.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{tier.name}</span>
                        <span className="font-bold text-green-600">ر.س {tier.price}</span>
                      </div>
                    ))}
                    {product.pricing_tiers.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{product.pricing_tiers.length - 2} باقات أخرى
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleProductView(product)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 ml-2" />
                  عرض التفاصيل
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
          <p className="text-gray-500">
            {searchTerm 
              ? `لم يتم العثور على منتجات تطابق "${searchTerm}"`
              : 'لا توجد منتجات متاحة في هذه الفئة'
            }
          </p>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`bg-gradient-to-r ${selectedProduct.color} text-white p-6 rounded-t-xl`}>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedProduct.name}</h2>
                  <p className="opacity-90">{getCategoryName(selectedProduct.category)}</p>
                </div>
                <button
                  onClick={() => setShowProductModal(false)}
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">وصف المنتج</h3>
                <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">الميزات</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedProduct.features.filter(f => f.trim()).map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 ml-2" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Tiers */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">اختر الباقة المناسبة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedProduct.pricing_tiers?.map((tier) => (
                    <div
                      key={tier.id}
                      className={`border-2 rounded-lg p-4 transition-colors ${
                        tier.is_recommended 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      {tier.is_recommended && (
                        <div className="bg-green-500 text-white text-center py-1 px-2 rounded text-xs font-medium mb-3">
                          الأكثر اختياراً
                        </div>
                      )}
                      
                      <h4 className="font-bold text-gray-900 mb-2">{tier.name}</h4>
                      
                      {/* Price */}
                      <div className="mb-3">
                        {tier.original_price && tier.original_price > tier.price && (
                          <span className="text-gray-500 line-through text-sm">
                            ر.س {tier.original_price}
                          </span>
                        )}
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-gray-900">ر.س {tier.price}</span>
                          <span className="text-gray-600 text-sm mr-1">/ {tier.duration_months} شهر</span>
                        </div>
                        {tier.discount_percentage && tier.discount_percentage > 0 && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                            خصم {tier.discount_percentage}%
                          </span>
                        )}
                      </div>

                      {/* Features */}
                      <div className="mb-4">
                        <ul className="space-y-1">
                          {tier.features.filter((f: string) => f.trim()).map((feature: string, index: number) => (
                            <li key={index} className="text-xs text-gray-600 flex items-center">
                              <Check className="w-3 h-3 text-green-500 ml-1" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => {
                          addToCart(selectedProduct, tier);
                          setShowProductModal(false);
                        }}
                        className={`w-full py-2 px-4 rounded-lg transition-colors ${
                          tier.is_recommended
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">سلة التسوق</h2>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="p-6">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">السلة فارغة</h3>
                  <p className="text-gray-600">أضف منتجات للسلة لبدء عملية الشراء</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                        <p className="text-sm text-gray-600">{item.tier_name} - {item.duration_months} شهر</p>
                        <p className="text-sm font-bold text-green-600">ر.س {item.price}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateCartQuantity(item.product_id, item.pricing_tier_id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-200 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 py-2 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.product_id, item.pricing_tier_id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => removeFromCart(item.product_id, item.pricing_tier_id)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Cart Total */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>الإجمالي:</span>
                      <span className="text-green-600">ر.س {getCartTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <CreditCard className="w-5 h-5 ml-2" />
                    إتمام الشراء ({getCartItemsCount()} منتج)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;