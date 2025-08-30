import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailyData {
  date: string;
  sales: number;
  costs: number;
  profit: number;
  salesCount: number;
  costCount: number;
}

interface ComparisonData {
  current: DailyData;
  previous: DailyData;
  change: {
    sales: number;
    costs: number;
    profit: number;
    salesCount: number;
    costCount: number;
  };
  percentage: {
    sales: number;
    costs: number;
    profit: number;
    salesCount: number;
    costCount: number;
  };
}

const DailySalesCosts: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current day data
      const currentDate = new Date(selectedDate);
      const currentDayStart = new Date(currentDate);
      currentDayStart.setHours(0, 0, 0, 0);
      const currentDayEnd = new Date(currentDate);
      currentDayEnd.setHours(23, 59, 59, 999);

      // Get previous day data
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDayStart = new Date(previousDate);
      previousDayStart.setHours(0, 0, 0, 0);
      const previousDayEnd = new Date(previousDate);
      previousDayEnd.setHours(23, 59, 59, 999);

      console.log('Fetching data for:', {
        currentDay: selectedDate,
        previousDay: previousDate.toISOString().split('T')[0],
        currentDayStart: currentDayStart.toISOString(),
        currentDayEnd: currentDayEnd.toISOString()
      });

      // Fetch sales data for current day
      const { data: currentSales, error: salesError } = await supabase
        .from('invoices')
        .select('amount, created_at')
        .gte('created_at', currentDayStart.toISOString())
        .lte('created_at', currentDayEnd.toISOString())
        .eq('status', 'paid');

      if (salesError) {
        console.error('Sales error:', salesError);
        throw new Error(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
      }

      // Fetch cost data for current day
      const { data: currentCosts, error: costsError } = await supabase
        .from('purchases')
        .select('purchase_price, created_at')
        .gte('created_at', currentDayStart.toISOString())
        .lte('created_at', currentDayEnd.toISOString());

      if (costsError) {
        console.error('Costs error:', costsError);
        throw new Error(`خطأ في جلب بيانات التكاليف: ${costsError.message}`);
      }

      // Fetch sales data for previous day
      const { data: previousSales, error: prevSalesError } = await supabase
        .from('invoices')
        .select('amount, created_at')
        .gte('created_at', previousDayStart.toISOString())
        .lte('created_at', previousDayEnd.toISOString())
        .eq('status', 'paid');

      if (prevSalesError) {
        console.error('Previous sales error:', prevSalesError);
        throw new Error(`خطأ في جلب بيانات مبيعات الأمس: ${prevSalesError.message}`);
      }

      // Fetch cost data for previous day
      const { data: previousCosts, error: prevCostsError } = await supabase
        .from('purchases')
        .select('purchase_price, created_at')
        .gte('created_at', previousDayStart.toISOString())
        .lte('created_at', previousDayEnd.toISOString());

      if (prevCostsError) {
        console.error('Previous costs error:', prevCostsError);
        throw new Error(`خطأ في جلب بيانات تكاليف الأمس: ${prevCostsError.message}`);
      }

      console.log('Data fetched successfully:', {
        currentSales: currentSales?.length || 0,
        currentCosts: currentCosts?.length || 0,
        previousSales: previousSales?.length || 0,
        previousCosts: previousCosts?.length || 0
      });

      // Calculate current day totals
      const currentSalesTotal = currentSales?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const currentCostsTotal = currentCosts?.reduce((sum, item) => sum + (item.purchase_price || 0), 0) || 0;
      const currentProfit = currentSalesTotal - currentCostsTotal;

      // Calculate previous day totals
      const previousSalesTotal = previousSales?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const previousCostsTotal = previousCosts?.reduce((sum, item) => sum + (item.purchase_price || 0), 0) || 0;
      const previousProfit = previousSalesTotal - previousCostsTotal;

      const currentData: DailyData = {
        date: selectedDate,
        sales: currentSalesTotal,
        costs: currentCostsTotal,
        profit: currentProfit,
        salesCount: currentSales?.length || 0,
        costCount: currentCosts?.length || 0,
      };

      const previousData: DailyData = {
        date: previousDate.toISOString().split('T')[0],
        sales: previousSalesTotal,
        costs: previousCostsTotal,
        profit: previousProfit,
        salesCount: previousSales?.length || 0,
        costCount: previousCosts?.length || 0,
      };

      // Calculate changes and percentages
      const change = {
        sales: currentSalesTotal - previousSalesTotal,
        costs: currentCostsTotal - previousCostsTotal,
        profit: currentProfit - previousProfit,
        salesCount: (currentSales?.length || 0) - (previousSales?.length || 0),
        costCount: (currentCosts?.length || 0) - (previousCosts?.length || 0),
      };

      const percentage = {
        sales: previousSalesTotal > 0 ? ((change.sales / previousSalesTotal) * 100) : 0,
        costs: previousCostsTotal > 0 ? ((change.costs / previousCostsTotal) * 100) : 0,
        profit: previousProfit !== 0 ? ((change.profit / Math.abs(previousProfit)) * 100) : 0,
        salesCount: (previousSales?.length || 0) > 0 ? ((change.salesCount / (previousSales?.length || 0)) * 100) : 0,
        costCount: (previousCosts?.length || 0) > 0 ? ((change.costCount / (previousCosts?.length || 0)) * 100) : 0,
      };

      setComparisonData({
        current: currentData,
        previous: previousData,
        change,
        percentage,
      });
    } catch (err) {
      console.error('Error in fetchDailyData:', err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء جلب البيانات';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  const getChangeColor = (value: number, isPositive: boolean = true) => {
    if (value > 0) return isPositive ? 'text-green-600' : 'text-red-600';
    if (value < 0) return isPositive ? 'text-red-600' : 'text-green-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchDailyData}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المبيعات والتكاليف اليومية</h1>
            <p className="text-gray-600">مقارنة شاملة مع اليوم السابق</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {comparisonData && (
        <>
          {/* Current Day Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sales */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">المبيعات</span>
                </div>
                {getChangeIcon(comparisonData.change.sales)}
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(comparisonData.current.sales)}
                </p>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className={`text-sm font-medium ${getChangeColor(comparisonData.change.sales)}`}>
                    {formatPercentage(comparisonData.percentage.sales)}
                  </span>
                  <span className="text-sm text-gray-500">
                    مقارنة بالأمس
                  </span>
                </div>
              </div>
            </div>

            {/* Costs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <ShoppingCart className="w-6 h-6 text-red-600" />
                  <span className="text-sm font-medium text-gray-600">التكاليف</span>
                </div>
                {getChangeIcon(comparisonData.change.costs)}
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(comparisonData.current.costs)}
                </p>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className={`text-sm font-medium ${getChangeColor(comparisonData.change.costs, false)}`}>
                    {formatPercentage(comparisonData.percentage.costs)}
                  </span>
                  <span className="text-sm text-gray-500">
                    مقارنة بالأمس
                  </span>
                </div>
              </div>
            </div>

            {/* Profit */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">الربح</span>
                </div>
                {getChangeIcon(comparisonData.change.profit)}
              </div>
              <div className="space-y-2">
                <p className={`text-2xl font-bold ${getChangeColor(comparisonData.current.profit)}`}>
                  {formatCurrency(comparisonData.current.profit)}
                </p>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className={`text-sm font-medium ${getChangeColor(comparisonData.change.profit)}`}>
                    {formatPercentage(comparisonData.percentage.profit)}
                  </span>
                  <span className="text-sm text-gray-500">
                    مقارنة بالأمس
                  </span>
                </div>
              </div>
            </div>

            {/* Transactions Count */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">عدد المعاملات</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-900">
                  {comparisonData.current.salesCount + comparisonData.current.costCount}
                </p>
                <div className="text-sm text-gray-500">
                  {comparisonData.current.salesCount} مبيعات، {comparisonData.current.costCount} مشتريات
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">مقارنة مفصلة مع اليوم السابق</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Current Day */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-4 text-center">
                  {new Date(comparisonData.current.date).toLocaleDateString('ar-SA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">المبيعات:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(comparisonData.current.sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">التكاليف:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(comparisonData.current.costs)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">الربح:</span>
                    <span className={`font-semibold ${getChangeColor(comparisonData.current.profit)}`}>
                      {formatCurrency(comparisonData.current.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">عدد المبيعات:</span>
                    <span className="font-semibold text-gray-900">
                      {comparisonData.current.salesCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">عدد المشتريات:</span>
                    <span className="font-semibold text-gray-900">
                      {comparisonData.current.costCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Previous Day */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-4 text-center">
                  {new Date(comparisonData.previous.date).toLocaleDateString('ar-SA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">المبيعات:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(comparisonData.previous.sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">التكاليف:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(comparisonData.previous.costs)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">الربح:</span>
                    <span className={`font-semibold ${getChangeColor(comparisonData.previous.profit)}`}>
                      {formatCurrency(comparisonData.previous.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">عدد المبيعات:</span>
                    <span className="font-semibold text-gray-900">
                      {comparisonData.previous.salesCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">عدد المشتريات:</span>
                    <span className="font-semibold text-gray-900">
                      {comparisonData.previous.costCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Summary */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-md font-medium text-gray-700 mb-4 text-center">ملخص التغييرات</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 space-x-reverse mb-2">
                    {getChangeIcon(comparisonData.change.sales)}
                    <span className="text-sm font-medium text-gray-600">تغيير المبيعات</span>
                  </div>
                  <p className={`text-lg font-bold ${getChangeColor(comparisonData.change.sales)}`}>
                    {formatCurrency(comparisonData.change.sales)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPercentage(comparisonData.percentage.sales)}
                  </p>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 space-x-reverse mb-2">
                    {getChangeIcon(comparisonData.change.costs)}
                    <span className="text-sm font-medium text-gray-600">تغيير التكاليف</span>
                  </div>
                  <p className={`text-lg font-bold ${getChangeColor(comparisonData.change.costs, false)}`}>
                    {formatCurrency(comparisonData.change.costs)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPercentage(comparisonData.percentage.costs)}
                  </p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 space-x-reverse mb-2">
                    {getChangeIcon(comparisonData.change.profit)}
                    <span className="text-sm font-medium text-gray-600">تغيير الربح</span>
                  </div>
                  <p className={`text-lg font-bold ${getChangeColor(comparisonData.change.profit)}`}>
                    {formatCurrency(comparisonData.change.profit)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPercentage(comparisonData.percentage.profit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DailySalesCosts;
