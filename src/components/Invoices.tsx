import React, { useState } from 'react';
import { Plus, Search, Download, Eye, DollarSign, Calendar, AlertTriangle, Loader2, Edit, Trash2, Link, Copy, Check } from 'lucide-react';
import { useInvoices, useSubscriptions, useCustomers } from '../hooks/useSupabase';
import { generatePaymentMessage } from '../lib/paypal';
import { Invoice, Subscription } from '../types';

const Invoices: React.FC = () => {
  const { invoices, loading, error, addInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { subscriptions, refetch: refetchSubscriptions } = useSubscriptions();
  const { customers } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    selected_subscriptions: [] as string[],
    total_amount: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  });

  // Get customer's active subscriptions
  const customerSubscriptions = subscriptions.filter(sub => 
    sub.customer_id === formData.customer_id && 
    sub.status === 'active' &&
    !invoices.some(invoice => {
      // Check if subscription is in main invoice (old system)
      const isInMainInvoice = invoice.subscription_id === sub.id && 
        (!editingInvoice || invoice.id !== editingInvoice.id);
      
      // Check if subscription is in invoice items (new system)
      const isInInvoiceItems = invoice.invoice_items?.some(item => 
        item.subscription_id === sub.id
      ) && (!editingInvoice || invoice.id !== editingInvoice.id);
      
      return isInMainInvoice || isInInvoiceItems;
    })
  );

  // Get all customer subscriptions (including those with invoices) for editing
  const allCustomerSubscriptions = subscriptions.filter(
    sub => sub.customer_id === formData.customer_id && sub.status === 'active'
  );

  // Calculate total amount based on selected subscriptions
  const calculateTotalAmount = () => {
    return formData.selected_subscriptions.reduce((total, subId) => {
      const subscription = subscriptions.find(s => s.id === subId);
      const price = subscription?.final_price || subscription?.pricing_tier?.price || 0;
      return total + Number(price);
    }, 0);
  };

  // Update amount when subscriptions change
  React.useEffect(() => {
    const totalAmount = calculateTotalAmount();
    setFormData(prev => ({ ...prev, total_amount: totalAmount }));
  }, [formData.selected_subscriptions, subscriptions]);

  const filteredInvoices = invoices.filter(invoice => {
    const customerName = invoice.customer?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات قبل الإرسال
    if (!formData.customer_id) {
      alert('يرجى اختيار العميل');
      return;
    }

    if (formData.selected_subscriptions.length === 0) {
      alert('يرجى اختيار اشتراك واحد على الأقل');
      return;
    }

    if (formData.total_amount <= 0) {
      alert('مبلغ الفاتورة يجب أن يكون أكبر من صفر');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (formData.due_date < today) {
      alert('تاريخ الاستحقاق لا يمكن أن يكون في الماضي');
      return;
    }

    // Prepare invoice items
    const invoiceItems = formData.selected_subscriptions.map(subscriptionId => {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      const amount = subscription?.final_price || subscription?.pricing_tier?.price || 0;
      const productName = subscription?.pricing_tier?.product?.name || 'منتج غير محدد';
      
      return {
        subscription_id: subscriptionId,
        amount: Number(amount),
        description: `${productName} - ${subscription?.pricing_tier?.name || ''}`
      };
    });

    const invoiceData = {
      customer_id: formData.customer_id,
      total_amount: formData.total_amount,
      due_date: formData.due_date,
      invoice_items: invoiceItems
    };

    let result;
    if (editingInvoice) {
      // For editing, we'll update the main invoice and recreate items
      result = await updateInvoice(editingInvoice.id, {
        amount: formData.total_amount,
        total_amount: formData.total_amount,
        due_date: formData.due_date
      });
    } else {
      // Create new invoice with items
      result = await addInvoice(invoiceData);
    }
    
    if (result.success) {
      // تحديث البيانات تلقائياً
      await refetchSubscriptions();
      
      setShowAddModal(false);
      setEditingInvoice(null);
      setFormData({
        customer_id: '',
        selected_subscriptions: [],
        total_amount: 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  };

  // Copy payment link to clipboard
  const copyPaymentLink = async (invoice: Invoice) => {
    setGeneratingPaymentLink(invoice.id);

    try {
      const customerName = invoice.customer?.name || 'العميل';
      const invoiceNumber = invoice.id.slice(-8);
      const amount = Number(invoice.total_amount || invoice.amount);
      
      const message = await generatePaymentMessage(
        customerName,
        invoiceNumber,
        amount,
        invoice.id
      );

      await navigator.clipboard.writeText(message);
      setCopiedInvoiceId(invoice.id);
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    } catch (err) {
      console.error('Error generating payment link:', err);
      alert('حدث خطأ في إنشاء رابط الدفع. يرجى المحاولة مرة أخرى.');
    } finally {
      setGeneratingPaymentLink(null);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.customer_id,
      selected_subscriptions: [invoice.subscription_id],
      total_amount: Number(invoice.total_amount || invoice.amount),
      due_date: invoice.due_date
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      await deleteInvoice(id);
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    await updateInvoice(invoice.id, {
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubscriptionToggle = (subscriptionId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_subscriptions: prev.selected_subscriptions.includes(subscriptionId)
        ? prev.selected_subscriptions.filter(id => id !== subscriptionId)
        : [...prev.selected_subscriptions, subscriptionId]
    }));
  };

  const getStatusBadge = (status: string) => {
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
      case 'pending': return 'في الانتظار';
      case 'overdue': return 'متأخر';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Calendar className="w-4 h-4 text-yellow-600" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل الفواتير...</span>
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
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث في الفواتير..."
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
            <option value="paid">مدفوع</option>
            <option value="pending">في الانتظار</option>
            <option value="overdue">متأخر</option>
          </select>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 ml-2" />
          إنشاء فاتورة جديدة
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">الفواتير المدفوعة</p>
              <p className="text-xl font-bold text-gray-900">
                {invoices.filter(inv => inv.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg ml-3">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">في الانتظار</p>
              <p className="text-xl font-bold text-gray-900">
                {invoices.filter(inv => inv.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">متأخرة</p>
              <p className="text-xl font-bold text-gray-900">
                {invoices.filter(inv => inv.status === 'overdue').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الفاتورة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتجات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الإصدار</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الاستحقاق</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{invoice.id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.customer?.name || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
                      <div className="space-y-1">
                        {invoice.invoice_items.map((item, index) => (
                          <div key={index} className="text-xs">
                            {item.subscription?.pricing_tier?.product?.name || 'غير محدد'}
                          </div>
                        ))}
                        {invoice.invoice_items.length > 1 && (
                          <div className="text-xs text-gray-500 font-medium">
                            ({invoice.invoice_items.length} منتجات)
                          </div>
                        )}
                      </div>
                    ) : (
                      invoice.subscription?.pricing_tier?.product?.name || 'غير محدد'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <span className="text-green-600 font-medium">ر.س</span>
                      <span className="mr-1">{Number(invoice.total_amount || invoice.amount).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.issue_date).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.due_date).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(invoice.status)}
                      <span className={`mr-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded">
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyPaymentLink(invoice)}
                        disabled={generatingPaymentLink === invoice.id}
                        className="text-purple-600 hover:text-purple-900 p-1 hover:bg-purple-50 rounded transition-colors"
                        title="نسخ رابط الدفع"
                      >
                        {generatingPaymentLink === invoice.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : copiedInvoiceId === invoice.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Link className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(invoice)}
                        className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsPaid(invoice)}
                          className="text-green-600 hover:text-green-900 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 rounded"
                        >
                          تم الدفع
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          alert(`تفاصيل الفاتورة:\n\nرقم الفاتورة: #${invoice.id.slice(-8)}\nالعميل: ${invoice.customer?.name || 'غير محدد'}\nالمبلغ: ${Number(invoice.total_amount || invoice.amount).toFixed(2)} ريال\nالحالة: ${getStatusText(invoice.status)}\nتاريخ الإصدار: ${new Date(invoice.issue_date).toLocaleDateString('ar-SA')}\nتاريخ الاستحقاق: ${new Date(invoice.due_date).toLocaleDateString('ar-SA')}`);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Link Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Link className="w-5 h-5 text-blue-600 ml-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">🔗 روابط الدفع الذكية - PayPal API:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 🔄 <strong>روابط ديناميكية:</strong> يتم إنشاء رابط دفع مخصص لكل فاتورة</li>
              <li>• 💰 <strong>تحويل تلقائي:</strong> من الريال السعودي إلى الدولار الأمريكي</li>
              <li>• 🔒 <strong>آمن ومحمي:</strong> عبر PayPal API الرسمي</li>
              <li>• أرسل الرسالة للعميل عبر WhatsApp أو البريد الإلكتروني</li>
              <li>• 📱 <strong>سهل الاستخدام:</strong> العميل يدفع بضغطة واحدة</li>
              <li>• 🎯 <strong>تتبع المدفوعات:</strong> كل فاتورة لها رابط فريد</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>ملاحظة:</strong> يتم استخدام PayPal Sandbox للاختبار حالياً. 
                للإنتاج، يجب تغيير الرابط في ملف paypal.ts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingInvoice ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    customer_id: e.target.value,
                    selected_subscriptions: [] // Reset subscriptions when customer changes
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر العميل</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Customer's Subscriptions */}
              {formData.customer_id && (editingInvoice ? allCustomerSubscriptions : customerSubscriptions).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    اشتراكات العميل ({(editingInvoice ? allCustomerSubscriptions : customerSubscriptions).length})
                  </label>
                  <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {(editingInvoice ? allCustomerSubscriptions : customerSubscriptions).map((subscription) => {
                      // التحقق من وجود فاتورة لهذا الاشتراك (في النظام القديم أو الجديد)
                      const hasInvoice = invoices.some(invoice => {
                        // Check main invoice subscription (old system)
                        const isInMainInvoice = invoice.subscription_id === subscription.id && 
                          (!editingInvoice || invoice.id !== editingInvoice.id);
                        
                        // Check invoice items (new system)
                        const isInInvoiceItems = invoice.invoice_items?.some(item => 
                          item.subscription_id === subscription.id
                        ) && (!editingInvoice || invoice.id !== editingInvoice.id);
                        
                        return isInMainInvoice || isInInvoiceItems;
                      });
                      
                      return (
                        <div key={subscription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`sub-${subscription.id}`}
                              checked={formData.selected_subscriptions.includes(subscription.id)}
                              onChange={() => handleSubscriptionToggle(subscription.id)}
                              disabled={hasInvoice}
                              className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ${
                                hasInvoice ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                            <label htmlFor={`sub-${subscription.id}`} className="mr-3 cursor-pointer">
                              <div className="font-medium text-gray-900">
                                {subscription.pricing_tier?.product?.name || 'منتج غير محدد'}
                                {hasInvoice && (
                                  <span className="text-xs text-orange-600 mr-2">(له فاتورة)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {subscription.pricing_tier?.name} - 
                                من {new Date(subscription.start_date).toLocaleDateString('ar-SA')} 
                                إلى {new Date(subscription.end_date).toLocaleDateString('ar-SA')}
                              </div>
                            </label>
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-gray-900">
                              {Number(subscription.final_price || subscription.pricing_tier?.price || 0).toFixed(2)} ريال
                            </div>
                            {subscription.discount_percentage > 0 && (
                              <div className="text-xs text-green-600">
                                خصم {subscription.discount_percentage}%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No subscriptions message */}
              {formData.customer_id && (editingInvoice ? allCustomerSubscriptions : customerSubscriptions).length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 ml-2" />
                    <span className="text-sm text-yellow-800">
                      {editingInvoice 
                        ? 'لا توجد اشتراكات نشطة لهذا العميل'
                        : 'لا توجد اشتراكات متاحة لهذا العميل (جميع الاشتراكات لها فواتير موجودة)'
                      }
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المبلغ الإجمالي (ريال)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    placeholder="0.00"
                    readOnly={formData.selected_subscriptions.length > 0}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.selected_subscriptions.length > 0 
                      ? `فاتورة واحدة تحتوي على ${formData.selected_subscriptions.length} اشتراك`
                      : 'اختر الاشتراكات لحساب المبلغ تلقائياً'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingInvoice(null);
                    setFormData({
                      customer_id: '',
                      selected_subscriptions: [],
                      total_amount: 0,
                      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
                  {editingInvoice ? 'تحديث الفاتورة' : 
                   formData.selected_subscriptions.length > 0 ? 
                   `إنشاء فاتورة (${formData.selected_subscriptions.length} اشتراك)` : 
                   'إنشاء فاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;