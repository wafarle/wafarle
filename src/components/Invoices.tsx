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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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
      
      console.log('Generating payment link for invoice:', invoiceNumber, 'Amount:', amount);
      
      const message = await generatePaymentMessage(
        customerName,
        invoiceNumber,
        amount,
        invoice.id
      );

      await navigator.clipboard.writeText(message);
      setCopiedInvoiceId(invoice.id);
      console.log('Payment message copied to clipboard');
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    } catch (err) {
      console.error('Error generating payment link:', err);
      
      // في حالة الخطأ، أنشئ رسالة بسيطة مع معلومات الدفع
      const customerName = invoice.customer?.name || 'العميل';
      const invoiceNumber = invoice.id.slice(-8);
      const amount = Number(invoice.total_amount || invoice.amount);
      
             const fallbackMessage = `مرحباً ${customerName}،

 نود تذكيرك بفاتورة رقم #${invoiceNumber} بمبلغ ${amount.toFixed(2)} ريال سعودي.

 للدفع، يرجى التواصل معنا:
 📧 team@wafarle.com
 📱 +966542130017
 💬 واتساب: +966542130017

 شكراً لك على ثقتك بنا.

 مع أطيب التحيات،
 فريق wafarle`;

      try {
        await navigator.clipboard.writeText(fallbackMessage);
        setCopiedInvoiceId(invoice.id);
        setTimeout(() => setCopiedInvoiceId(null), 2000);
        alert('تم نسخ رسالة الدفع (رابط بديل)');
      } catch (clipboardErr) {
        alert('حدث خطأ في إنشاء رابط الدفع. يرجى المحاولة مرة أخرى.');
      }
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

  const handleShowInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const exportInvoicesToExcel = () => {
    import('xlsx').then((XLSX) => {
      const invoicesData = invoices.map(invoice => ({
        'رقم الفاتورة': `#${invoice.id.slice(-8)}`,
        'اسم العميل': invoice.customer?.name || 'غير محدد',
        'رقم الهاتف': invoice.customer?.phone || 'غير محدد',
        'المبلغ الإجمالي': Number(invoice.total_amount || invoice.amount).toFixed(2),
        'تاريخ الإصدار': new Date(invoice.issue_date).toLocaleDateString('ar-SA'),
        'تاريخ الاستحقاق': new Date(invoice.due_date).toLocaleDateString('ar-SA'),
        'تاريخ الدفع': invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString('ar-SA') : 'غير مدفوع',
        'الحالة': invoice.status === 'paid' ? 'مدفوع' : invoice.status === 'pending' ? 'معلق' : 'متأخر',
        'عدد الاشتراكات': invoice.invoice_items?.length || (invoice.subscription_id ? 1 : 0),
        'تاريخ الإنشاء': new Date(invoice.created_at).toLocaleDateString('ar-SA')
      }));

      const ws = XLSX.utils.json_to_sheet(invoicesData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
      
      // تنسيق الأعمدة
      const colWidths = [
        { wch: 15 }, // رقم الفاتورة
        { wch: 20 }, // اسم العميل
        { wch: 15 }, // رقم الهاتف
        { wch: 15 }, // المبلغ الإجمالي
        { wch: 15 }, // تاريخ الإصدار
        { wch: 15 }, // تاريخ الاستحقاق
        { wch: 15 }, // تاريخ الدفع
        { wch: 12 }, // الحالة
        { wch: 15 }, // عدد الاشتراكات
        { wch: 15 }  // تاريخ الإنشاء
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `الفواتير_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
    });
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // إنشاء PDF للفاتورة
    const invoiceContent = generateInvoiceHTML(invoice);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    // طباعة الفاتورة مباشرة
    const invoiceContent = generateInvoiceHTML(invoice);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const generateInvoiceHTML = (invoice: Invoice) => {
    const invoiceNumber = `#${invoice.id.slice(-8)}`;
    const issueDate = new Date(invoice.issue_date).toLocaleDateString('en-US');
    const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US');
    const totalAmount = Number(invoice.total_amount || invoice.amount).toFixed(2);
    
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة ${invoiceNumber}</title>
                 <style>
           @media print {
             body { 
               margin: 0; 
               padding: 10px;
               font-size: 12px;
             }
             .no-print { display: none !important; }
             .invoice-container {
               max-width: 100%;
               margin: 0;
               box-shadow: none;
               border-radius: 0;
             }
             .invoice-header {
               padding: 15px;
             }
             .company-logo { font-size: 18px; margin-bottom: 5px; }
             .invoice-title { font-size: 24px; margin-bottom: 3px; }
             .invoice-number { font-size: 14px; }
             .invoice-info {
               gap: 15px;
               padding: 15px;
             }
             .customer-info, .invoice-details {
               padding: 12px;
             }
             .section-title {
               font-size: 14px;
               margin-bottom: 8px;
               padding-bottom: 5px;
             }
             .info-row {
               margin-bottom: 5px;
               padding: 3px 0;
               font-size: 11px;
             }
             .invoice-items { padding: 15px; }
             .items-table { margin-top: 10px; }
             .items-table th {
               padding: 8px;
               font-size: 11px;
             }
             .items-table td {
               padding: 8px;
               font-size: 11px;
             }
             .total-section {
               padding: 12px;
               margin-top: 10px;
             }
             .total-row {
               margin-bottom: 5px;
               font-size: 12px;
             }
             .total-amount {
               font-size: 18px;
               padding-top: 8px;
               margin-top: 8px;
             }
             .footer { padding: 12px; font-size: 11px; }
           }
           
           body {
             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
             margin: 0;
             padding: 20px;
             background: #f8fafc;
             direction: rtl;
           }
           .invoice-container {
             max-width: 800px;
             margin: 0 auto;
             background: white;
             border-radius: 12px;
             box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
             overflow: hidden;
           }
           .invoice-header {
             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
             color: white;
             padding: 30px;
             text-align: center;
           }
           .company-logo {
             font-size: 24px;
             font-weight: bold;
             margin-bottom: 10px;
           }
           .invoice-title {
             font-size: 32px;
             font-weight: bold;
             margin-bottom: 5px;
           }
           .invoice-number {
             font-size: 18px;
             opacity: 0.9;
           }
           .invoice-info {
             display: grid;
             grid-template-columns: 1fr 1fr;
             gap: 30px;
             padding: 30px;
             border-bottom: 2px solid #e2e8f0;
           }
           .customer-info, .invoice-details {
             background: #f8fafc;
             padding: 20px;
             border-radius: 8px;
           }
           .section-title {
             font-size: 18px;
             font-weight: bold;
             color: #1e293b;
             margin-bottom: 15px;
             border-bottom: 2px solid #e2e8f0;
             padding-bottom: 8px;
           }
           .info-row {
             display: flex;
             justify-content: space-between;
             margin-bottom: 10px;
             padding: 8px 0;
           }
           .info-label {
             font-weight: 600;
             color: #64748b;
           }
           .info-value {
             font-weight: 500;
             color: #1e293b;
           }
           .invoice-items {
             padding: 30px;
           }
           .items-table {
             width: 100%;
             border-collapse: collapse;
             margin-top: 20px;
           }
           .items-table th {
             background: #f1f5f9;
             padding: 15px;
             text-align: right;
             font-weight: 600;
             color: #475569;
             border-bottom: 2px solid #e2e8f0;
           }
           .items-table td {
             padding: 15px;
             text-align: right;
             border-bottom: 1px solid #e2e8f0;
           }
           .total-section {
             background: #f8fafc;
             padding: 20px;
             margin-top: 20px;
             border-radius: 8px;
             text-align: left;
           }
           .total-row {
             display: flex;
             justify-content: space-between;
             margin-bottom: 10px;
             font-size: 16px;
           }
           .total-amount {
             font-size: 24px;
             font-weight: bold;
             color: #059669;
             border-top: 2px solid #e2e8f0;
             padding-top: 15px;
             margin-top: 15px;
           }
           .footer {
             background: #f1f5f9;
             padding: 20px;
             text-align: center;
             color: #64748b;
             font-size: 14px;
           }
           .status-badge {
             display: inline-block;
             padding: 6px 12px;
             border-radius: 20px;
             font-size: 14px;
             font-weight: 600;
             text-transform: uppercase;
           }
           .status-paid { background: #dcfce7; color: #166534; }
           .status-pending { background: #fef3c7; color: #92400e; }
           .status-overdue { background: #fee2e2; color: #991b1b; }
           .actions {
             text-align: center;
             padding: 20px;
             background: #f8fafc;
             border-top: 1px solid #e2e8f0;
           }
           .btn {
             display: inline-block;
             padding: 12px 24px;
             margin: 0 10px;
             border: none;
             border-radius: 8px;
             font-size: 16px;
             font-weight: 600;
             cursor: pointer;
             text-decoration: none;
             transition: all 0.3s ease;
           }
           .btn-primary {
             background: #3b82f6;
             color: white;
           }
           .btn-primary:hover { background: #2563eb; }
           .btn-success {
             background: #10b981;
             color: white;
           }
           .btn-success:hover { background: #059669; }
         </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="company-logo">شركة وفرلي</div>
            <div class="invoice-title">فاتورة</div>
            <div class="invoice-number">${invoiceNumber}</div>
          </div>
          
          <div class="invoice-info">
            <div class="customer-info">
              <div class="section-title">معلومات العميل</div>
              <div class="info-row">
                <span class="info-label">الاسم:</span>
                <span class="info-value">${invoice.customer?.name || 'غير محدد'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">رقم الهاتف:</span>
                <span class="info-value">${invoice.customer?.phone || 'غير محدد'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">البريد الإلكتروني:</span>
                <span class="info-value">${invoice.customer?.email || 'غير محدد'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">العنوان:</span>
                <span class="info-value">${invoice.customer?.address || 'غير محدد'}</span>
              </div>
            </div>
            
            <div class="invoice-details">
              <div class="section-title">تفاصيل الفاتورة</div>
              <div class="info-row">
                <span class="info-label">رقم الفاتورة:</span>
                <span class="info-value">${invoiceNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ الإصدار:</span>
                <span class="info-value">${issueDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ الاستحقاق:</span>
                <span class="info-value">${dueDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">الحالة:</span>
                <span class="info-value">
                  <span class="status-badge status-${invoice.status}">
                    ${getStatusText(invoice.status)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          
                     <div class="invoice-items">
             <div class="section-title">تفاصيل الخدمات</div>
             <table class="items-table">
               <thead>
                 <tr>
                   <th>الخدمة</th>
                   <th>الوصف</th>
                   <th>تاريخ البداية</th>
                   <th>تاريخ الانتهاء</th>
                   <th>المبلغ</th>
                 </tr>
               </thead>
               <tbody>
                 ${(() => {
                   if (invoice.invoice_items && invoice.invoice_items.length > 0) {
                     return invoice.invoice_items.map(item => {
                       const subscription = item.subscription;
                       const startDate = subscription?.start_date ? new Date(subscription.start_date).toLocaleDateString('en-US') : 'غير محدد';
                       const endDate = subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('en-US') : 'غير محدد';
                       
                       return `
                         <tr>
                           <td>${item.description || 'خدمة غير محددة'}</td>
                           <td>اشتراك في الخدمة</td>
                           <td>${startDate}</td>
                           <td>${endDate}</td>
                           <td>${Number(item.amount).toFixed(2)} ريال</td>
                         </tr>
                       `;
                     }).join('');
                   } else if (invoice.subscription) {
                     const productName = invoice.subscription.pricing_tier?.product?.name || 'منتج غير محدد';
                     const startDate = invoice.subscription.start_date ? new Date(invoice.subscription.start_date).toLocaleDateString('en-US') : 'غير محدد';
                     const endDate = invoice.subscription.end_date ? new Date(invoice.subscription.end_date).toLocaleDateString('en-US') : 'غير محدد';
                     
                     return `
                       <tr>
                         <td>${productName}</td>
                         <td>اشتراك في الخدمة</td>
                         <td>${startDate}</td>
                         <td>${endDate}</td>
                         <td>${totalAmount} ريال</td>
                       </tr>
                     `;
                   }
                   return '';
                 })()}
               </tbody>
             </table>
            
            <div class="total-section">
              <div class="total-row">
                <span>المجموع:</span>
                <span>${totalAmount} ريال</span>
              </div>
              <div class="total-amount">
                <span>المجموع النهائي: ${totalAmount} ريال</span>
              </div>
            </div>
          </div>
          
                     <div class="footer">
             <p>شكراً لثقتكم في خدماتنا</p>
             <p>للاستفسارات: info@wafarle.com | هاتف: +966542130017</p>
           </div>
          
          <div class="actions no-print">
            <button class="btn btn-primary" onclick="window.print()">طباعة الفاتورة</button>
            <button class="btn btn-success" onclick="window.close()">إغلاق</button>
          </div>
        </div>
      </body>
      </html>
    `;
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
        <div className="flex gap-3">
          <button
            onClick={exportInvoicesToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 ml-2" />
            إنشاء فاتورة جديدة
          </button>
        </div>
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
                      <button 
                        onClick={() => handleShowInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                        title="عرض الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                        title="تنزيل الفاتورة"
                      >
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
            <h4 className="font-medium text-blue-900 mb-2">💳 روابط الدفع بالفيزا - PayPal API:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 💳 <strong>دفع مباشر بالفيزا:</strong> لا يحتاج حساب PayPal</li>
              <li>• 🔄 <strong>روابط مخصصة:</strong> رابط فريد لكل فاتورة</li>
              <li>• 💰 <strong>تحويل تلقائي:</strong> من الريال السعودي إلى الدولار الأمريكي</li>
              <li>• 🔒 <strong>آمن 100%:</strong> عبر PayPal الرسمي</li>
              <li>• 🌍 <strong>يقبل جميع البطاقات:</strong> فيزا، ماستركارد، أمريكان إكسبريس</li>
              <li>• 📱 <strong>سهل جداً:</strong> العميل يدخل بيانات البطاقة مباشرة</li>
              <li>• 🎯 <strong>تتبع المدفوعات:</strong> كل فاتورة لها رابط فريد</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>مميز:</strong> العميل لا يحتاج إنشاء حساب PayPal، يدفع مباشرة بالفيزا!
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

      {/* Invoice Preview Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="p-3 bg-white bg-opacity-20 rounded-lg ml-4">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">معاينة الفاتورة</h2>
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                        #{selectedInvoice.id.slice(-8)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedInvoice.status === 'paid' ? 'bg-green-400 text-green-900' :
                        selectedInvoice.status === 'pending' ? 'bg-yellow-400 text-yellow-900' :
                        'bg-red-400 text-red-900'
                      }`}>
                        {getStatusText(selectedInvoice.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full ml-3"></span>
                      معلومات العميل
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">الاسم:</span>
                        <span className="font-medium">{selectedInvoice.customer?.name || 'غير محدد'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">رقم الهاتف:</span>
                        <span className="font-medium">{selectedInvoice.customer?.phone || 'غير محدد'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">البريد الإلكتروني:</span>
                        <span className="font-medium">{selectedInvoice.customer?.email || 'غير محدد'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">العنوان:</span>
                        <span className="font-medium">{selectedInvoice.customer?.address || 'غير محدد'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full ml-3"></span>
                      تفاصيل الفاتورة
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">رقم الفاتورة:</span>
                        <span className="font-medium">#{selectedInvoice.id.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">تاريخ الإصدار:</span>
                        <span className="font-medium">
                          {new Date(selectedInvoice.issue_date).toLocaleDateString('en-US')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">تاريخ الاستحقاق:</span>
                        <span className="font-medium">
                          {new Date(selectedInvoice.due_date).toLocaleDateString('en-US')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">الحالة:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          selectedInvoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getStatusText(selectedInvoice.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">تفاصيل الخدمات</h3>
                </div>
                <div className="overflow-x-auto">
                                       <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                         <tr>
                           <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الخدمة</th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوصف</th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ البداية</th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الانتهاء</th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {(() => {
                           if (selectedInvoice.invoice_items && selectedInvoice.invoice_items.length > 0) {
                             return selectedInvoice.invoice_items.map((item, index) => {
                               const subscription = item.subscription;
                               const startDate = subscription?.start_date ? new Date(subscription.start_date).toLocaleDateString('en-US') : 'غير محدد';
                               const endDate = subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('en-US') : 'غير محدد';
                               
                               return (
                                 <tr key={index} className="hover:bg-gray-50">
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                     {item.description || 'خدمة غير محددة'}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     اشتراك في الخدمة
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     {startDate}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     {endDate}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                     {Number(item.amount).toFixed(2)} ريال
                                   </td>
                                 </tr>
                               );
                             });
                           } else if (selectedInvoice.subscription) {
                             const productName = selectedInvoice.subscription.pricing_tier?.product?.name || 'منتج غير محدد';
                             const startDate = selectedInvoice.subscription.start_date ? new Date(selectedInvoice.subscription.start_date).toLocaleDateString('en-US') : 'غير محدد';
                             const endDate = selectedInvoice.subscription.end_date ? new Date(selectedInvoice.subscription.end_date).toLocaleDateString('en-US') : 'غير محدد';
                             
                             return (
                               <tr className="hover:bg-gray-50">
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                   {productName}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                   اشتراك في الخدمة
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                   {startDate}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                   {endDate}
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                   {Number(selectedInvoice.total_amount || selectedInvoice.amount).toFixed(2)} ريال
                               </td>
                               </tr>
                             );
                           }
                           return null;
                         })()}
                       </tbody>
                     </table>
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">المجموع النهائي:</span>
                  <span className="text-3xl font-bold text-green-600">
                    {Number(selectedInvoice.total_amount || selectedInvoice.amount).toFixed(2)} ريال
                  </span>
                </div>
              </div>

                             {/* Footer */}
               <div className="bg-gray-50 rounded-lg p-6 text-center">
                 <p className="text-gray-600 mb-2">شكراً لثقتكم في خدماتنا</p>
                 <p className="text-sm text-gray-500">
                   للاستفسارات: info@wafarle.com | هاتف: +966542130017
                 </p>
               </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  معرف الفاتورة: {selectedInvoice.id}
                </div>
                <div className="flex space-x-3 space-x-reverse">
                  <button
                    onClick={() => handlePrintInvoice(selectedInvoice)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    طباعة الفاتورة
                  </button>
                  <button
                    onClick={() => handleDownloadInvoice(selectedInvoice)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    تنزيل الفاتورة
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;