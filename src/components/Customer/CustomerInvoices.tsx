import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  CreditCard,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generatePaymentMessage } from '../../lib/paypal';

interface CustomerInvoice {
  id: string;
  amount: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  subscription?: {
    pricing_tier?: {
      product?: {
        name: string;
      };
    };
  };
}

const CustomerInvoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [generatingPayment, setGeneratingPayment] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const fetchInvoices = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError(null);

      // البحث عن العميل
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('email', user.email)
        .single();

      if (customerError) {
        setError('لم يتم العثور على بيانات العميل');
        return;
      }

      // جلب الفواتير
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subscription:subscriptions(
            pricing_tier:pricing_tiers(
              name,
              product:products(name)
            )
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('حدث خطأ في تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'pending': return 'معلق';
      case 'overdue': return 'متأخر';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleShowDetails = (invoice: CustomerInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  const handleGeneratePaymentLink = async (invoice: CustomerInvoice) => {
    setGeneratingPayment(invoice.id);
    
    try {
      // البحث عن اسم العميل
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('email', user?.email || '')
        .single();

      const customerName = customer?.name || 'عميل كريم';
      const invoiceNumber = invoice.id.slice(-8);
      const amount = Number(invoice.total_amount || invoice.amount);

      const paymentMessage = await generatePaymentMessage(
        customerName,
        invoiceNumber,
        amount,
        invoice.id
      );

      // نسخ رسالة الدفع إلى الحافظة
      await navigator.clipboard.writeText(paymentMessage);
      
      alert('✅ تم إنشاء رابط الدفع ونسخ الرسالة إلى الحافظة!\n\nيمكنك الآن لصقها في الواتساب أو أي تطبيق آخر.');
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert('❌ حدث خطأ في إنشاء رابط الدفع. يرجى المحاولة مرة أخرى.');
    } finally {
      setGeneratingPayment(null);
    }
  };

  // Statistics
  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => isOverdue(i.due_date) && i.status !== 'paid').length,
    totalPaid: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount), 0),
    totalPending: invoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + Number(inv.total_amount || inv.amount), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل فواتيرك...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchInvoices}
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">فواتيري</h1>
          <p className="text-gray-600">عرض وإدارة جميع فواتيرك</p>
        </div>
        <button
          onClick={fetchInvoices}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الفواتير</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">المدفوعة</p>
              <p className="text-xl font-bold text-green-600">{stats.paid}</p>
              <p className="text-xs text-green-600">ر.س {stats.totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg ml-3">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">المعلقة</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-yellow-600">ر.س {stats.totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">المتأخرة</p>
              <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد فواتير</h3>
          <p className="text-gray-600">لم يتم إصدار أي فواتير لك بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الفاتورة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الإصدار</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الاستحقاق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => {
                  const overdueStatus = isOverdue(invoice.due_date) && invoice.status !== 'paid';
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 ml-3" />
                          <span className="text-sm font-medium text-gray-900">
                            #{invoice.id.slice(-8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.subscription?.pricing_tier?.product?.name || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <span className="text-green-600 font-medium">ر.س</span>
                          <span className="mr-1">{Number(invoice.total_amount || invoice.amount).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 ml-2" />
                          {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center text-sm ${overdueStatus ? 'text-red-600' : 'text-gray-900'}`}>
                          <Calendar className="w-4 h-4 ml-2" />
                          <span>{new Date(invoice.due_date).toLocaleDateString('ar-SA')}</span>
                          {overdueStatus && (
                            <span className="mr-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              متأخر {getDaysOverdue(invoice.due_date)} يوم
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(invoice.status)}
                          <span className={`mr-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleShowDetails(invoice)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {invoice.status !== 'paid' && (
                            <button
                              onClick={() => handlePayInvoice(invoice)}
                              className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded disabled:opacity-50"
                              title="دفع الفاتورة"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 ml-3" />
            <div>
              <h4 className="font-medium text-red-900">انتباه: فواتير متأخرة!</h4>
              <p className="text-red-800 text-sm mt-1">
                لديك {stats.overdue} فاتورة متأخرة عن موعد الاستحقاق. يرجى دفعها لتجنب إيقاف الخدمة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">فاتورة #{selectedInvoice.id.slice(-8)}</h2>
                  <p className="opacity-90">{selectedInvoice.subscription?.pricing_tier?.product?.name || 'غير محدد'}</p>
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
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(selectedInvoice.status)}
                  <span className="mr-3 font-medium text-gray-900">حالة الفاتورة:</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedInvoice.status)}`}>
                  {getStatusText(selectedInvoice.status)}
                </span>
              </div>

              {/* Amount */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 font-medium">إجمالي المبلغ:</span>
                  <span className="text-2xl font-bold text-green-900">
                    ر.س {Number(selectedInvoice.total_amount || selectedInvoice.amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-5 h-5 text-blue-600 ml-2" />
                    <span className="font-medium text-blue-900">تاريخ الإصدار</span>
                  </div>
                  <p className="text-blue-800">
                    {new Date(selectedInvoice.issue_date).toLocaleDateString('ar-SA')}
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${
                  isOverdue(selectedInvoice.due_date) && selectedInvoice.status !== 'paid' 
                    ? 'bg-red-50' : 'bg-purple-50'
                }`}>
                  <div className="flex items-center mb-2">
                    <Calendar className={`w-5 h-5 ml-2 ${
                      isOverdue(selectedInvoice.due_date) && selectedInvoice.status !== 'paid' 
                        ? 'text-red-600' : 'text-purple-600'
                    }`} />
                    <span className={`font-medium ${
                      isOverdue(selectedInvoice.due_date) && selectedInvoice.status !== 'paid' 
                        ? 'text-red-900' : 'text-purple-900'
                    }`}>تاريخ الاستحقاق</span>
                  </div>
                  <p className={
                    isOverdue(selectedInvoice.due_date) && selectedInvoice.status !== 'paid' 
                      ? 'text-red-800' : 'text-purple-800'
                  }>
                    {new Date(selectedInvoice.due_date).toLocaleDateString('ar-SA')}
                  </p>
                  {isOverdue(selectedInvoice.due_date) && selectedInvoice.status !== 'paid' && (
                    <p className="text-xs text-red-600 mt-1">
                      متأخر {getDaysOverdue(selectedInvoice.due_date)} يوم
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Date (if paid) */}
              {selectedInvoice.status === 'paid' && selectedInvoice.paid_date && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                    <span className="font-medium text-green-900">تاريخ الدفع</span>
                  </div>
                  <p className="text-green-800">
                    {new Date(selectedInvoice.paid_date).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              )}

              {/* Payment Action */}
              {selectedInvoice.status !== 'paid' && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-yellow-900">الدفع الإلكتروني</h4>
                      <p className="text-yellow-800 text-sm">
                        ادفع بالفيزا أو الماستركارد مباشرة - آمن وسريع
                      </p>
                    </div>
                    <button
                      onClick={() => handleGeneratePaymentLink(selectedInvoice)}
                      disabled={generatingPayment === selectedInvoice.id}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                      {generatingPayment === selectedInvoice.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 ml-2" />
                      )}
                      إنشاء رابط دفع
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerInvoices;