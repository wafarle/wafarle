import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Calendar,
  Package,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useProfitLoss } from '../hooks/useSupabase';

const ProfitLoss: React.FC = () => {
  const { profitLossData, loading, error, refetch } = useProfitLoss();

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

  const { totalRevenue, totalCosts, netProfit, profitMargin, revenueByMonth, topProducts } = profitLossData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">تقرير المكاسب والخسائر</h1>
          <p className="text-gray-600">تحليل شامل للأرباح والتكاليف بناءً على الفواتير المدفوعة</p>
        </div>
        <button
          onClick={refetch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <BarChart3 className="w-4 h-4 ml-2" />
          تحديث التقرير
        </button>
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
              <p className="text-xs text-green-600">من الفواتير المدفوعة</p>
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
              <p className="text-2xl font-bold text-gray-900">ر.س {totalCosts.toFixed(2)}</p>
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
                ر.س {netProfit.toFixed(2)}
              </p>
              <p className={`text-xs ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? 'ربح' : 'خسارة'}
              </p>
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
                {profitMargin.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">من الإيرادات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      {revenueByMonth.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 ml-2 text-blue-600" />
              الأرباح الشهرية
            </h3>
          </div>
          <div className="space-y-4">
            {revenueByMonth.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{month.month}</h4>
                  <div className="flex items-center space-x-4 space-x-reverse mt-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full ml-2"></div>
                      <span className="text-sm text-gray-600">إيرادات: ر.س {month.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full ml-2"></div>
                      <span className="text-sm text-gray-600">تكاليف: ر.س {month.costs.toFixed(2)}</span>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 ml-2 text-green-600" />
              أفضل المنتجات ربحاً
            </h3>
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
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => {
                  const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 ml-2" />
          ملخص الحسابات
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-blue-800">
              <strong>عدد الفواتير المدفوعة:</strong> {revenueByMonth.length > 0 ? 'متوفر' : 'غير متوفر'}
            </p>
            <p className="text-blue-800">
              <strong>متوسط الربح الشهري:</strong> ر.س {revenueByMonth.length > 0 ? (netProfit / revenueByMonth.length).toFixed(2) : '0.00'}
            </p>
            <p className="text-blue-800">
              <strong>معدل هامش الربح:</strong> {profitMargin.toFixed(1)}%
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
              <strong>إجمالي المنتجات:</strong> {topProducts.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;