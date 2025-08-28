import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Calendar,
  Package,
  Loader2,
  AlertCircle,
  Target,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useProfitLoss } from '../hooks/useSupabase';

const ProfitLoss: React.FC = () => {
  const { profitLossData, loading, error, refetch } = useProfitLoss();
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري حساب المكاسب والخسائر...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 ml-2" />
          <p className="text-red-800">{error}</p>
        </div>
        <button
          onClick={refetch}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { totalRevenue, totalCosts, netProfit, profitMargin, revenueByMonth, topProducts, totalInvoices } = profitLossData;

  // حساب المؤشرات الإضافية
  const averageRevenuePerInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
  const averageProfitPerInvoice = totalInvoices > 0 ? netProfit / totalInvoices : 0;
  
  // تحليل الاتجاهات
  const revenueGrowth = revenueByMonth.length >= 2 ? 
    ((revenueByMonth[revenueByMonth.length - 1].revenue - revenueByMonth[revenueByMonth.length - 2].revenue) / revenueByMonth[revenueByMonth.length - 2].revenue) * 100 : 0;
  
  const profitGrowth = revenueByMonth.length >= 2 ? 
    ((revenueByMonth[revenueByMonth.length - 1].profit - revenueByMonth[revenueByMonth.length - 2].profit) / Math.abs(revenueByMonth[revenueByMonth.length - 2].profit)) * 100 : 0;

  // تحليل الأداء
  const performanceScore = Math.min(100, Math.max(0, 
    (profitMargin * 0.4) + 
    (revenueGrowth * 0.3) + 
    (Math.min(profitGrowth, 100) * 0.3)
  ));

  // نصائح التحسين
  const getImprovementTips = () => {
    const tips = [];
    
    if (profitMargin < 20) {
      tips.push({
        type: 'warning',
        title: 'هامش الربح منخفض',
        description: 'هامش الربح الحالي أقل من 20%. فكر في رفع الأسعار أو تقليل التكاليف.',
        action: 'راجع استراتيجية التسعير'
      });
    }
    
    if (revenueGrowth < 0) {
      tips.push({
        type: 'danger',
        title: 'انخفاض في الإيرادات',
        description: 'الإيرادات في انخفاض. ركز على استراتيجيات التسويق والمبيعات.',
        action: 'طور استراتيجية المبيعات'
      });
    }
    
    if (averageRevenuePerInvoice < 100) {
      tips.push({
        type: 'info',
        title: 'متوسط الفاتورة منخفض',
        description: 'متوسط قيمة الفاتورة منخفض. فكر في باقات أكبر أو خدمات إضافية.',
        action: 'طور عروض الخدمات'
      });
    }
    
    if (topProducts.length > 0 && topProducts[0].profit < 0) {
      tips.push({
        type: 'danger',
        title: 'منتجات خاسرة',
        description: 'أفضل منتجاتك تحقق خسائر. راجع التكاليف أو توقف عن بيعها.',
        action: 'راجع استراتيجية المنتجات'
      });
    }
    
    if (tips.length === 0) {
      tips.push({
        type: 'success',
        title: 'أداء ممتاز',
        description: 'أداؤك ممتاز! استمر في نفس الاستراتيجية.',
        action: 'حافظ على الأداء'
      });
    }
    
    return tips;
  };

  const improvementTips = getImprovementTips();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">تقرير المكاسب والخسائر</h1>
          <p className="text-gray-600">تحليل شامل للأرباح والتكاليف مع نصائح للتحسين</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الفترات</option>
            <option value="3months">آخر 3 أشهر</option>
            <option value="6months">آخر 6 أشهر</option>
            <option value="12months">آخر 12 شهر</option>
          </select>
          <button
            onClick={refetch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <BarChart3 className="w-4 h-4 ml-2" />
            تحديث التقرير
          </button>
        </div>
      </div>

      {/* Performance Score */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">مؤشر الأداء العام</h3>
            <p className="text-purple-700 text-sm">بناءً على الربحية والنمو والاستقرار</p>
          </div>
          <div className="text-center">
            <div className="relative">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-purple-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(performanceScore / 100) * 226.2} 226.2`}
                  className="text-purple-600"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-900">{performanceScore.toFixed(0)}</span>
              </div>
            </div>
            <p className="text-sm text-purple-600 mt-2">من 100</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-gray-900">ر.س {totalRevenue.toFixed(2)}</p>
              <div className="flex items-center mt-1">
                {revenueGrowth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600 ml-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600 ml-1" />
                )}
                <span className={`text-xs ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(revenueGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي التكاليف</p>
              <p className="text-2xl font-bold text-gray-900">ر.س {(totalCosts || 0).toFixed(2)}</p>
              <p className="text-xs text-red-600">تكلفة المشتريات</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-6 h-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">صافي الربح</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ر.س {(netProfit || 0).toFixed(2)}
              </p>
              <div className="flex items-center mt-1">
                {profitGrowth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600 ml-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600 ml-1" />
                )}
                <span className={`text-xs ${profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(profitGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${profitMargin >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
              <PieChart className={`w-6 h-6 ${profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">هامش الربح</p>
              <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {(profitMargin || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">من الإيرادات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">إجمالي الفواتير</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalInvoices > 0 ? totalInvoices : 'غير متوفر'}
              </p>
              <p className="text-xs text-blue-600">
                {totalInvoices > 0 ? 'فاتورة مدفوعة' : 'لا توجد بيانات'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">متوسط الفاتورة</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalInvoices > 0 ? `ر.س ${averageRevenuePerInvoice.toFixed(2)}` : 'غير متوفر'}
              </p>
              <p className="text-xs text-green-600">
                {totalInvoices > 0 ? 'إيرادات لكل فاتورة' : 'لا توجد بيانات'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${totalInvoices > 0 ? (averageProfitPerInvoice >= 0 ? 'bg-green-100' : 'bg-red-100') : 'bg-gray-100'}`}>
              <DollarSign className={`w-6 h-6 ${totalInvoices > 0 ? (averageProfitPerInvoice >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`} />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">متوسط الربح</p>
              <p className={`text-2xl font-bold ${totalInvoices > 0 ? (averageProfitPerInvoice >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
                {totalInvoices > 0 ? `ر.س ${averageProfitPerInvoice.toFixed(2)}` : 'غير متوفر'}
              </p>
              <p className="text-xs text-gray-500">
                {totalInvoices > 0 ? 'ربح لكل فاتورة' : 'لا توجد بيانات'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Tips */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 ml-2" />
          نصائح لتحسين الأداء
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {improvementTips.map((tip, index) => (
            <div key={index} className={`p-4 rounded-lg border ${
              tip.type === 'success' ? 'bg-green-50 border-green-200' :
              tip.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              tip.type === 'danger' ? 'bg-red-50 border-red-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start">
                {tip.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 ml-2 mt-0.5" />
                ) : tip.type === 'danger' ? (
                  <XCircle className="w-5 h-5 text-red-600 ml-2 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 ml-2 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-semibold mb-2 ${
                    tip.type === 'success' ? 'text-green-800' :
                    tip.type === 'warning' ? 'text-yellow-800' :
                    tip.type === 'danger' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {tip.title}
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">{tip.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">الإجراء المقترح:</span>
                    <span className={`text-sm font-semibold ${
                      tip.type === 'success' ? 'text-green-700' :
                      tip.type === 'warning' ? 'text-yellow-700' :
                      tip.type === 'danger' ? 'text-red-700' :
                      'text-blue-700'
                    }`}>
                      {tip.action}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      {revenueByMonth.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 ml-2 text-blue-600" />
              تحليل الأرباح الشهرية
            </h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">النمو الشهري:</span> {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </div>
          </div>
          <div className="space-y-4">
            {revenueByMonth.map((month, index) => {
              const previousMonth = index > 0 ? revenueByMonth[index - 1] : null;
              const monthGrowth = previousMonth ? 
                ((month.revenue - previousMonth.revenue) / previousMonth.revenue) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{month.month}</h4>
                      {previousMonth && (
                        <div className="flex items-center">
                          {monthGrowth >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600 ml-1" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-600 ml-1" />
                          )}
                          <span className={`text-xs font-medium ${monthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.abs(monthGrowth).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full ml-2"></div>
                        <span className="text-gray-600">إيرادات: ر.س {month.revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full ml-2"></div>
                        <span className="text-gray-600">تكاليف: ر.س {month.costs.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full ml-2"></div>
                        <span className="text-gray-600">فواتير: {month.invoiceCount || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-lg font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ر.س {month.profit.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {month.profit >= 0 ? 'ربح' : 'خسارة'}
                    </p>
                    <p className="text-xs text-gray-400">
                      هامش: {month.revenue > 0 ? ((month.profit / month.revenue) * 100).toFixed(1) : '0'}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 ml-2 text-green-600" />
              تحليل المنتجات
            </h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">إجمالي المنتجات:</span> {topProducts.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-700">المنتج</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">المبيعات</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">الإيرادات</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">الربح</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">هامش الربح</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">التقييم</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => {
                  const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                  const rating = margin >= 30 ? 'ممتاز' : margin >= 20 ? 'جيد' : margin >= 10 ? 'مقبول' : 'ضعيف';
                  const ratingColor = margin >= 30 ? 'text-green-600' : margin >= 20 ? 'text-blue-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600';
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center ml-3">
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{product.product}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{product.sales}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">ر.س {product.revenue.toFixed(2)}</td>
                      <td className={`py-3 px-4 font-bold ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ر.س {product.profit.toFixed(2)}
                      </td>
                      <td className={`py-3 px-4 font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 font-medium ${ratingColor}`}>
                        {rating}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strategic Recommendations */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
          <Target className="w-5 h-5 ml-2" />
          توصيات استراتيجية
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-indigo-800 text-lg">لزيادة المبيعات:</h4>
            <ul className="space-y-2 text-sm text-indigo-700">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 ml-2"></div>
                ركز على المنتجات عالية الربحية (هامش ربح أعلى من 25%)
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 ml-2"></div>
                ارفع متوسط قيمة الفاتورة عبر الباقات المتقدمة
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 ml-2"></div>
                طور استراتيجية التسويق للمنتجات الأقل مبيعاً
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 ml-2"></div>
                اعرض عروض خاصة للعملاء الحاليين
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-indigo-800 text-lg">لتقليل الخسائر:</h4>
            <ul className="space-y-2 text-sm text-indigo-700">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 ml-2"></div>
                راجع تكاليف المنتجات الخاسرة
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 ml-2"></div>
                حسّن إدارة المخزون لتقليل التكاليف
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 ml-2"></div>
                ابحث عن موردين بأسعار أفضل
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 ml-2"></div>
                طور عمليات الإنتاج لتقليل الهدر
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 ml-2" />
          ملخص التحليل
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-blue-800">
              <strong>عدد الفواتير المدفوعة:</strong> {totalInvoices}
            </p>
            <p className="text-blue-800">
              <strong>متوسط الربح الشهري:</strong> {revenueByMonth.length > 0 ? `ر.س ${(netProfit / revenueByMonth.length).toFixed(2)}` : 'غير متوفر'}
            </p>
            <p className="text-blue-800">
              <strong>معدل هامش الربح:</strong> {profitMargin.toFixed(1)}%
            </p>
            <p className="text-blue-800">
              <strong>نمو الإيرادات:</strong> {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-blue-800">
              <strong>أفضل منتج:</strong> {topProducts.length > 0 ? topProducts[0].product : 'لا يوجد'}
            </p>
            <p className="text-blue-800">
              <strong>الحالة المالية:</strong> 
              <span className={`font-bold mr-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? 'مربح' : 'خاسر'}
              </span>
            </p>
            <p className="text-blue-800">
              <strong>مؤشر الأداء:</strong> {performanceScore.toFixed(0)}/100
            </p>
            <p className="text-blue-800">
              <strong>متوسط الفاتورة:</strong> {totalInvoices > 0 ? `ر.س ${averageRevenuePerInvoice.toFixed(2)}` : 'غير متوفر'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;