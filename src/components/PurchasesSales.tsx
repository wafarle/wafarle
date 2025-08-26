import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  UserPlus
} from 'lucide-react';
import { usePurchases, useSales, useCustomers } from '../hooks/useSupabase';
import { useProducts, useInvoices } from '../hooks/useSupabase';
import { Purchase, Sale } from '../types';

const PurchasesSales: React.FC = () => {
  const { purchases, loading: purchasesLoading, error: purchasesError, addPurchase, updatePurchase, deletePurchase } = usePurchases();
  const { sales, loading: salesLoading, error: salesError, addSale, updateSale, deleteSale } = useSales();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const { invoices } = useInvoices();
  
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  
  const [purchaseFormData, setPurchaseFormData] = useState({
    product_id: '',
    service_name: '',
    account_details: '',
    purchase_price: 0,
    sale_price_per_user: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    max_users: 1,
    notes: ''
  });

  const [saleFormData, setSaleFormData] = useState({
    purchase_id: '',
    customer_id: '',
    sale_price: 0,
    sale_date: new Date().toISOString().split('T')[0],
    access_details: ''
  });

  // Filter purchases
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.account_details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const customerName = sale.customer?.name || '';
    const serviceName = sale.purchase?.service_name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Available purchases for sale (not full)
  const availablePurchases = purchases.filter(p => p.status === 'active' && p.current_users < p.max_users);

  // Statistics - حساب المبيعات من الفواتير المدفوعة
  const totalPurchases = purchases.length;
  
  // حساب المبيعات من الفواتير المدفوعة
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  let totalSalesFromInvoices = 0;
  let totalRevenueFromInvoices = 0;
  let totalCostFromInvoices = 0;
  
  paidInvoices.forEach(invoice => {
    const revenue = Number(invoice.total_amount || invoice.amount);
    totalRevenueFromInvoices += revenue;
    
    // حساب عدد المبيعات من invoice_items أو subscription واحد
    if (invoice.invoice_items && invoice.invoice_items.length > 0) {
      totalSalesFromInvoices += invoice.invoice_items.length;
      
      // حساب التكلفة من المشتريات المرتبطة
      invoice.invoice_items.forEach(item => {
        const subscription = item.subscription;
        if (subscription?.purchase && subscription.purchase.purchase_price && subscription.purchase.max_users) {
          const costPerUser = Number(subscription.purchase.purchase_price) / subscription.purchase.max_users;
          if (!isNaN(costPerUser) && costPerUser > 0) {
            totalCostFromInvoices += costPerUser;
          }
        }
      });
    } else if (invoice.subscription) {
      totalSalesFromInvoices += 1;
      
      // حساب التكلفة من المشتريات المرتبطة
      if (invoice.subscription.purchase && invoice.subscription.purchase.purchase_price && invoice.subscription.purchase.max_users) {
        const costPerUser = Number(invoice.subscription.purchase.purchase_price) / invoice.subscription.purchase.max_users;
        if (!isNaN(costPerUser) && costPerUser > 0) {
          totalCostFromInvoices += costPerUser;
        }
      }
    }
  });
  
  // إضافة المبيعات المباشرة (من جدول sales)
  const directSales = sales.filter(s => s.status === 'active');
  const totalDirectSales = directSales.length;
  const totalDirectRevenue = directSales.reduce((sum, s) => sum + Number(s.sale_price), 0);
  const totalDirectCost = directSales.reduce((sum, s) => {
    const purchase = purchases.find(p => p.id === s.purchase_id);
    if (purchase && purchase.purchase_price && purchase.max_users) {
      const costPerUser = Number(purchase.purchase_price) / purchase.max_users;
      if (!isNaN(costPerUser) && costPerUser > 0) {
        return sum + costPerUser;
      }
    }
    return sum;
  }, 0);
  
  // الإجماليات
  const totalSales = totalSalesFromInvoices + totalDirectSales;
  const totalPurchasesCost = purchases.reduce((sum, p) => sum + Number(p.purchase_price), 0);
  const totalSalesRevenue = totalRevenueFromInvoices + totalDirectRevenue;
  const actualSalesCost = totalCostFromInvoices + totalDirectCost;
  
  const totalProfit = totalSalesRevenue - actualSalesCost;

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert empty product_id to null to avoid UUID validation error
    const formDataToSubmit = {
      ...purchaseFormData,
      product_id: purchaseFormData.product_id === '' ? null : purchaseFormData.product_id
    };
    
    let result;
    if (editingPurchase) {
      result = await updatePurchase(editingPurchase.id, formDataToSubmit);
    } else {
      result = await addPurchase(formDataToSubmit);
    }

    if (result.success) {
      setShowAddModal(false);
      setEditingPurchase(null);
      setPurchaseFormData({
        service_name: '',
        account_details: '',
        purchase_price: 0,
        purchase_date: new Date().toISOString().split('T')[0],
        max_users: 1,
        notes: ''
      });
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let result;
    if (editingSale) {
      result = await updateSale(editingSale.id, saleFormData);
    } else {
      result = await addSale(saleFormData);
    }

    if (result.success) {
      setShowSaleModal(false);
      setEditingSale(null);
      setSelectedPurchase(null);
      setSaleFormData({
        purchase_id: '',
        customer_id: '',
        sale_price: 0,
        sale_date: new Date().toISOString().split('T')[0],
        access_details: ''
      });
    }
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setPurchaseFormData({
      product_id: purchase.product_id || '',
      service_name: purchase.service_name,
      account_details: purchase.account_details,
      purchase_price: Number(purchase.purchase_price),
      purchase_date: purchase.purchase_date,
      max_users: purchase.max_users,
      notes: purchase.notes
    });
    setShowAddModal(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setSaleFormData({
      purchase_id: sale.purchase_id,
      customer_id: sale.customer_id,
      sale_price: Number(sale.sale_price),
      sale_date: sale.sale_date,
      access_details: sale.access_details
    });
    setShowSaleModal(true);
  };

  const handleSellPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setSaleFormData(prev => ({
      ...prev,
      purchase_id: purchase.id,
      sale_price: Number(purchase.sale_price_per_user) || Math.round(Number(purchase.purchase_price) / purchase.max_users)
    }));
    setShowSaleModal(true);
  };

  const handleDeletePurchase = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المشتريات؟ سيتم حذف جميع المبيعات المرتبطة بها.')) {
      await deletePurchase(id);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المبيعات؟')) {
      await deleteSale(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'full':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'full': return 'مكتمل';
      case 'expired': return 'منتهي';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'full':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  if (purchasesLoading || salesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (purchasesError || salesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{purchasesError || salesError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">المشتريات والمبيعات</h1>
          <p className="text-gray-600">إدارة الحسابات المشتراة وبيعها للعملاء</p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة مشتريات
          </button>
          <button
            onClick={() => setShowSaleModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <TrendingUp className="w-4 h-4 ml-2" />
            إضافة مبيعات
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المشتريات</p>
              <p className="text-xl font-bold text-gray-900">{totalPurchases}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المبيعات</p>
              <p className="text-xl font-bold text-gray-900">{totalSales}</p>
              <p className="text-xs text-green-600">
                {totalSalesFromInvoices} من الفواتير + {totalDirectSales} مباشرة
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">تكلفة المبيعات</p>
              <p className="text-lg font-bold text-gray-900">ر.س {actualSalesCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {totalCostFromInvoices.toFixed(2)} فواتير + {totalDirectCost.toFixed(2)} مباشرة
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إيرادات المبيعات</p>
              <p className="text-lg font-bold text-gray-900">ر.س {totalSalesRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                {totalRevenueFromInvoices.toFixed(2)} فواتير + {totalDirectRevenue.toFixed(2)} مباشرة
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ml-3 ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <TrendingUp className={`w-5 h-5 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">صافي الربح</p>
              <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ر.س {totalProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 space-x-reverse">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'purchases'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            المشتريات ({totalPurchases})
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sales'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            المبيعات المباشرة ({totalDirectSales})
          </button>
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={activeTab === 'purchases' ? 'البحث في المشتريات...' : 'البحث في المبيعات...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">جميع الحالات</option>
          <option value="active">نشط</option>
          {activeTab === 'purchases' && <option value="full">مكتمل</option>}
          <option value="expired">منتهي</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {/* Content */}
      {activeTab === 'purchases' ? (
        /* Purchases Table */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الخدمة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تفاصيل الحساب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سعر الشراء</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الشراء</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المستخدمين</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 ml-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{purchase.service_name}</div>
                          {purchase.notes && (
                            <div className="text-sm text-gray-500">{purchase.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.account_details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <span className="text-green-600 font-medium">ر.س</span>
                        <span className="mr-1">{Number(purchase.purchase_price).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 ml-2" />
                        {new Date(purchase.purchase_date).toLocaleDateString('en-US')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Users className="w-4 h-4 ml-2" />
                        {purchase.current_users}/{purchase.max_users}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(purchase.status)}
                        <span className={`mr-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(purchase.status)}`}>
                          {getStatusText(purchase.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        {purchase.status === 'active' && purchase.current_users < purchase.max_users && (
                          <button
                            onClick={() => handleSellPurchase(purchase)}
                            className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                            title="بيع للعميل"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        <button className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditPurchase(purchase)}
                          className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePurchase(purchase.id)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Sales Table */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الخدمة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سعر البيع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ البيع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تفاصيل الوصول</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-gray-400 ml-3" />
                        <span className="text-sm font-medium text-gray-900">
                          {sale.customer?.name || 'غير محدد'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.purchase?.service_name || 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <span className="text-green-600 font-medium">ر.س</span>
                        <span className="mr-1">{Number(sale.sale_price).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 ml-2" />
                        {new Date(sale.sale_date).toLocaleDateString('en-US')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.access_details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(sale.status)}
                        <span className={`mr-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(sale.status)}`}>
                          {getStatusText(sale.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEditSale(sale)}
                          className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingPurchase ? 'تعديل المشتريات' : 'إضافة مشتريات جديدة'}
            </h2>
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنتج (اختياري)</label>
                <select
                  value={purchaseFormData.product_id}
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p.id === e.target.value);
                    setPurchaseFormData(prev => ({ 
                      ...prev, 
                      product_id: e.target.value,
                      service_name: selectedProduct ? selectedProduct.name : prev.service_name,
                      max_users: selectedProduct ? selectedProduct.max_users : prev.max_users
                    }));
                  }}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الخدمة</label>
                <input
                  type="text"
                  required
                  value={purchaseFormData.service_name}
                  onChange={(e) => setPurchaseFormData(prev => ({ ...prev, service_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="مثل: ChatGPT Plus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تفاصيل الحساب</label>
                <textarea
                  required
                  value={purchaseFormData.account_details}
                  onChange={(e) => setPurchaseFormData(prev => ({ ...prev, account_details: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="البريد الإلكتروني وكلمة المرور أو تفاصيل الوصول"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء (ريال)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={purchaseFormData.purchase_price}
                    onChange={(e) => setPurchaseFormData(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="54.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع لكل مستخدم (ريال)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={purchaseFormData.sale_price_per_user}
                    onChange={(e) => setPurchaseFormData(prev => ({ ...prev, sale_price_per_user: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="25.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عدد المستخدمين المسموح</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={purchaseFormData.max_users}
                    onChange={(e) => setPurchaseFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الربح المتوقع لكل مستخدم</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                    {purchaseFormData.max_users > 0 && purchaseFormData.purchase_price > 0 ? (
                      <span className={`font-medium ${
                        (purchaseFormData.sale_price_per_user - (purchaseFormData.purchase_price / purchaseFormData.max_users)) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {(purchaseFormData.sale_price_per_user - (purchaseFormData.purchase_price / purchaseFormData.max_users)).toFixed(2)} ريال
                      </span>
                    ) : (
                      <span className="text-gray-500">0.00 ريال</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الشراء</label>
                <input
                  type="date"
                  required
                  value={purchaseFormData.purchase_date}
                  onChange={(e) => setPurchaseFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={purchaseFormData.notes}
                  onChange={(e) => setPurchaseFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="أي ملاحظات إضافية"
                />
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPurchase(null);
                    setPurchaseFormData({
                      product_id: '',
                      service_name: '',
                      account_details: '',
                      purchase_price: 0,
                      sale_price_per_user: 0,
                      purchase_date: new Date().toISOString().split('T')[0],
                      max_users: 1,
                      notes: ''
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
                  {editingPurchase ? 'تحديث المشتريات' : 'إضافة المشتريات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingSale ? 'تعديل المبيعات' : 'إضافة مبيعات جديدة'}
            </h2>
            <form onSubmit={handleSaleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المشتريات</label>
                <select
                  required
                  value={saleFormData.purchase_id}
                  onChange={(e) => {
                    const selectedPurchase = purchases.find(p => p.id === e.target.value);
                    setSaleFormData(prev => ({ 
                      ...prev, 
                      purchase_id: e.target.value,
                      sale_price: selectedPurchase ? Math.round(Number(selectedPurchase.purchase_price) / selectedPurchase.max_users) : 0
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر المشتريات</option>
                  {availablePurchases.map(purchase => (
                    <option key={purchase.id} value={purchase.id}>
                      {purchase.service_name} - متاح ({purchase.max_users - purchase.current_users} مستخدم)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                <select
                  required
                  value={saleFormData.customer_id}
                  onChange={(e) => setSaleFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر العميل</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع (ريال)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={saleFormData.sale_price}
                    onChange={(e) => setSaleFormData(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البيع</label>
                  <input
                    type="date"
                    required
                    value={saleFormData.sale_date}
                    onChange={(e) => setSaleFormData(prev => ({ ...prev, sale_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تفاصيل الوصول للعميل</label>
                <textarea
                  required
                  value={saleFormData.access_details}
                  onChange={(e) => setSaleFormData(prev => ({ ...prev, access_details: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="البريد الإلكتروني وكلمة المرور أو رابط الدعوة"
                />
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaleModal(false);
                    setEditingSale(null);
                    setSelectedPurchase(null);
                    setSaleFormData({
                      purchase_id: '',
                      customer_id: '',
                      sale_price: 0,
                      sale_date: new Date().toISOString().split('T')[0],
                      access_details: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingSale ? 'تحديث المبيعات' : 'إضافة المبيعات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesSales;