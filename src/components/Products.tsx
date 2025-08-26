import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Star, 
  Check, 
  Zap,
  Crown,
  Shield,
  Sparkles,
  Palette,
  MessageSquare,
  Code,
  Database,
  Globe,
  Smartphone
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<any>;
  features: string[];
  pricingTiers: PricingTier[];
  isPopular?: boolean;
  color: string;
}

interface PricingTier {
  id: number;
  name: string;
  duration: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  features: string[];
  isRecommended?: boolean;
}

const Products: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Mock data - منتجات مشابهة لـ Adobe, ChatGPT, Packdora
  const products: Product[] = [
    {
      id: 1,
      name: 'AI Assistant Pro',
      description: 'مساعد ذكي متقدم للمحادثات والكتابة الإبداعية مع قدرات تحليل متطورة',
      category: 'ai',
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-500',
      isPopular: true,
      features: [
        'محادثات ذكية غير محدودة',
        'كتابة إبداعية متقدمة',
        'تحليل البيانات والمستندات',
        'دعم 50+ لغة',
        'API متقدم للمطورين'
      ],
      pricingTiers: [
        {
          id: 1,
          name: 'أساسي',
          duration: 1,
          price: 99,
          features: ['100 استعلام يومياً', 'دعم أساسي', 'نماذج AI أساسية']
        },
        {
          id: 2,
          name: 'احترافي',
          duration: 1,
          price: 199,
          originalPrice: 249,
          discount: 20,
          isRecommended: true,
          features: ['استعلامات غير محدودة', 'دعم أولوية', 'جميع نماذج AI', 'تخصيص متقدم']
        },
        {
          id: 3,
          name: 'مؤسسي',
          duration: 1,
          price: 399,
          features: ['كل ميزات الاحترافي', 'API مخصص', 'دعم مخصص', 'تدريب فريق']
        }
      ]
    },
    {
      id: 2,
      name: 'Creative Suite',
      description: 'مجموعة أدوات التصميم الإبداعي الشاملة للمصممين والمبدعين',
      category: 'design',
      icon: Palette,
      color: 'from-blue-500 to-cyan-500',
      features: [
        'تحرير الصور المتقدم',
        'تصميم الجرافيك',
        'تحرير الفيديو',
        'الرسوم المتحركة',
        'التعاون الجماعي'
      ],
      pricingTiers: [
        {
          id: 4,
          name: 'فردي',
          duration: 1,
          price: 149,
          features: ['تطبيق واحد', 'تخزين 20GB', 'دعم أساسي']
        },
        {
          id: 5,
          name: 'كامل',
          duration: 1,
          price: 299,
          originalPrice: 399,
          discount: 25,
          isRecommended: true,
          features: ['جميع التطبيقات', 'تخزين 100GB', 'خطوط مميزة', 'قوالب احترافية']
        },
        {
          id: 6,
          name: 'فريق',
          duration: 1,
          price: 599,
          features: ['كل ميزات الكامل', 'إدارة المستخدمين', 'تخزين 1TB', 'دعم مخصص']
        }
      ]
    },
    {
      id: 3,
      name: 'Dev Tools Pro',
      description: 'أدوات التطوير المتقدمة للمبرمجين ومطوري التطبيقات',
      category: 'development',
      icon: Code,
      color: 'from-green-500 to-emerald-500',
      features: [
        'IDE متقدم',
        'أدوات debugging',
        'إدارة قواعد البيانات',
        'CI/CD Pipeline',
        'مراقبة الأداء'
      ],
      pricingTiers: [
        {
          id: 7,
          name: 'مطور',
          duration: 1,
          price: 79,
          features: ['مشروع واحد', 'دعم أساسي', 'أدوات أساسية']
        },
        {
          id: 8,
          name: 'فريق',
          duration: 1,
          price: 159,
          isRecommended: true,
          features: ['مشاريع غير محدودة', 'تعاون الفريق', 'جميع الأدوات', 'تحليلات متقدمة']
        },
        {
          id: 9,
          name: 'مؤسسة',
          duration: 1,
          price: 299,
          features: ['كل ميزات الفريق', 'أمان متقدم', 'دعم مخصص', 'SLA مضمون']
        }
      ]
    },
    {
      id: 4,
      name: 'Cloud Storage Plus',
      description: 'حلول التخزين السحابي الآمنة مع مزامنة متقدمة ومشاركة ذكية',
      category: 'storage',
      icon: Database,
      color: 'from-orange-500 to-red-500',
      features: [
        'تخزين آمن ومشفر',
        'مزامنة تلقائية',
        'مشاركة ذكية',
        'نسخ احتياطية',
        'وصول من أي مكان'
      ],
      pricingTiers: [
        {
          id: 10,
          name: 'شخصي',
          duration: 1,
          price: 49,
          features: ['100GB تخزين', 'مزامنة أساسية', 'دعم أساسي']
        },
        {
          id: 11,
          name: 'عائلي',
          duration: 1,
          price: 99,
          originalPrice: 129,
          discount: 23,
          isRecommended: true,
          features: ['1TB تخزين', '6 حسابات', 'مشاركة متقدمة', 'نسخ احتياطي تلقائي']
        },
        {
          id: 12,
          name: 'أعمال',
          duration: 1,
          price: 199,
          features: ['تخزين غير محدود', 'إدارة المستخدمين', 'أمان متقدم', 'دعم أولوية']
        }
      ]
    }
  ];

  const categories = [
    { id: 'all', name: 'جميع المنتجات', count: products.length },
    { id: 'ai', name: 'الذكاء الاصطناعي', count: products.filter(p => p.category === 'ai').length },
    { id: 'design', name: 'التصميم', count: products.filter(p => p.category === 'design').length },
    { id: 'development', name: 'التطوير', count: products.filter(p => p.category === 'development').length },
    { id: 'storage', name: 'التخزين', count: products.filter(p => p.category === 'storage').length }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const PricingCard: React.FC<{ tier: PricingTier; productColor: string }> = ({ tier, productColor }) => (
    <div className={`relative bg-white rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
      tier.isRecommended ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {tier.isRecommended && (
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
          {tier.originalPrice && (
            <span className="text-lg text-gray-400 line-through ml-2">{tier.originalPrice} ريال</span>
          )}
          <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
          <span className="text-gray-600 mr-1">ريال/شهر</span>
        </div>
        {tier.discount && (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
            وفر {tier.discount}%
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
        tier.isRecommended
          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg'
          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
      }`}>
        اختر هذه الخطة
      </button>
    </div>
  );

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
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Product Header */}
            <div className={`bg-gradient-to-r ${product.color} p-8 text-white relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <product.icon className="w-full h-full" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-white bg-opacity-20 rounded-lg ml-4">
                      <product.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
                      {product.isPopular && (
                        <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium flex items-center w-fit">
                          <Star className="w-4 h-4 ml-1" />
                          الأكثر شعبية
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <button className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {product.pricingTiers.map((tier) => (
                  <PricingCard key={tier.id} tier={tier} productColor={product.color} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">إضافة منتج جديد</h2>
            </div>
            <form className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم المنتج</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="اسم المنتج"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفئة</label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ai">الذكاء الاصطناعي</option>
                    <option value="design">التصميم</option>
                    <option value="development">التطوير</option>
                    <option value="storage">التخزين</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">وصف المنتج</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف تفصيلي للمنتج"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الميزات الرئيسية</label>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`الميزة ${i}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4 space-x-reverse pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
                >
                  إضافة المنتج
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