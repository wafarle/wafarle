import React, { useState } from 'react';
import { 
  Clock, 
  Check, 
  X, 
  Eye, 
  User, 
  Package, 
  Calendar, 
  Phone, 
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useSubscriptionRequests, usePurchases, useSubscriptions, useInvoices } from '../hooks/useSupabase';

const SubscriptionRequests: React.FC = () => {
  const { 
    requests, 
    loading, 
    error, 
    updateRequestStatus, 
    activateRequest 
  } = useSubscriptionRequests();
  const { purchases } = usePurchases();
  const { addSubscription } = useSubscriptions();
  const { addInvoice } = useInvoices();
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<string>('');
  const [accessDetails, setAccessDetails] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'activated':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في انتظار الموافقة';
      case 'approved': return 'موافق عليه';
      case 'activated': return 'مفعل';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'activated':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  // فلترة المشتريات المتاحة للمنتج المحدد
  const getAvailablePurchasesForProduct = (productId: string) => {
    return purchases.filter(purchase => 
      purchase.product_id === productId && 
      purchase.status === 'active' && 
      purchase.current_users < purchase.max_users
    );
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const result = await updateRequestStatus(id, 'approved');
      if (result.success) {
        alert('تم قبول الطلب بنجاح! يمكنك الآن تفعيله.');
      } else {
        alert(result.error || 'حدث خطأ في قبول الطلب');
      }
    } catch (error) {
      console.error('Error in handleApprove:', error);
      alert('حدث خطأ في قبول الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('سبب الرفض (اختياري):');
    setProcessingId(id);
    try {
      const result = await updateRequestStatus(id, 'rejected', reason || undefined);
      if (result.success) {
        alert('تم رفض الطلب');
      } else {
        alert(result.error || 'حدث خطأ في رفض الطلب');
      }
    } catch (error) {
      console.error('Error in handleReject:', error);
      alert('حدث خطأ في رفض الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = (request: any) => {
    setSelectedRequest(request);
    setShowActivateModal(true);
  };

  const handleConfirmActivation = async () => {
    if (!selectedRequest || !selectedPurchase || !accessDetails.trim()) {
      alert('يرجى اختيار المشتريات وإدخال تفاصيل الوصول');
      return;
    }

    setProcessingId(selectedRequest.id);

    try {
      // تفعيل الطلب وإنشاء الاشتراك والفاتورة
      const result = await activateRequest(selectedRequest.id, selectedPurchase);
      
      if (result.success) {
        // تحديث تفاصيل الوصول في المبيعات
        const { error: updateError } = await supabase
          .from('sales')
          .update({ access_details: accessDetails })
          .eq('customer_id', selectedRequest.customer_id)
          .eq('purchase_id', selectedPurchase);

        if (updateError) {
          console.error('Error updating access details:', updateError);
        }

        alert('تم تفعيل الاشتراك وإصدار الفاتورة بنجاح!');
        setShowActivateModal(false);
        setSelectedRequest(null);
        setSelectedPurchase('');
        setAccessDetails('');
      } else {
        alert(result.error || 'حدث خطأ في التفعيل');
      }
    } catch (error) {
      console.error('Error in handleConfirmActivation:', error);
      alert('حدث خطأ في التفعيل. يرجى المحاولة مرة أخرى.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleShowDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Statistics
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    activated: requests.filter(r => r.status === 'activated').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل طلبات الاشتراكات...</span>
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">طلبات الاشتراكات</h1>
          <p className="text-gray-600">إدارة ومتابعة طلبات العملاء</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الطلبات</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg ml-3">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">في الانتظار</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">موافق عليها</p>
              <p className="text-xl font-bold text-blue-600">{stats.approved}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">مفعلة</p>
              <p className="text-xl font-bold text-green-600">{stats.activated}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">مرفوضة</p>
              <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج والباقة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ البداية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الطلب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 ml-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.customer?.name}</div>
                        <div className="text-sm text-gray-500">{request.customer?.email}</div>
                        <div className="text-sm text-gray-500">{request.customer?.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {request.pricing_tier?.product?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.pricing_tier?.name} - {request.pricing_tier?.duration_months} شهر
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <span className="text-green-600 font-medium">ر.س</span>
                      <span className="mr-1">{Number(request.pricing_tier?.price || 0).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 ml-2" />
                      {new Date(request.preferred_start_date).toLocaleDateString('ar-SA')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 ml-2" />
                      {new Date(request.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(request.status)}
                      <span className={`mr-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleShowDetails(request)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={processingId === request.id}
                            className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded disabled:opacity-50"
                            title="الموافقة على الطلب"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={processingId === request.id}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded disabled:opacity-50"
                            title="رفض الطلب"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {request.status === 'approved' && (
                        <button
                          onClick={() => handleActivate(request)}
                          className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                          title="تفعيل الاشتراك"
                        >
                          <CreditCard className="w-4 h-4" />
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

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات اشتراك</h3>
          <p className="text-gray-500">عندما يقوم العملاء بطلب اشتراكات، ستظهر هنا</p>
        </div>
      )}

      {/* Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">تفاصيل طلب الاشتراك</h2>
                  <p className="opacity-90">طلب رقم: {selectedRequest.id.slice(-8)}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(selectedRequest.status)}
                  <span className="mr-3 font-medium text-gray-900">حالة الطلب:</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRequest.status)}`}>
                  {getStatusText(selectedRequest.status)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">معلومات العميل</h3>
                <div className="space-y-2">
                  <p><strong>الاسم:</strong> {selectedRequest.customer?.name}</p>
                  <p><strong>البريد:</strong> {selectedRequest.customer?.email}</p>
                  <p><strong>الهاتف:</strong> {selectedRequest.customer?.phone}</p>
                  <p><strong>العنوان:</strong> {selectedRequest.customer?.address || 'غير محدد'}</p>
                </div>
              </div>

              {/* Product Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">تفاصيل المنتج والباقة</h3>
                <div className="space-y-2">
                  <p><strong>المنتج:</strong> {selectedRequest.pricing_tier?.product?.name}</p>
                  <p><strong>الباقة:</strong> {selectedRequest.pricing_tier?.name}</p>
                  <p><strong>المدة:</strong> {selectedRequest.pricing_tier?.duration_months} شهر</p>
                  <p><strong>السعر:</strong> ر.س {Number(selectedRequest.pricing_tier?.price || 0).toFixed(2)}</p>
                  <p><strong>تاريخ البداية المفضل:</strong> {new Date(selectedRequest.preferred_start_date).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">ملاحظات العميل</h3>
                  <p className="text-blue-700">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedRequest.admin_notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3">ملاحظات الإدارة</h3>
                  <p className="text-yellow-700">{selectedRequest.admin_notes}</p>
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

      {/* Activation Modal */}
      {showActivateModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">تفعيل الاشتراك</h2>
              <p className="text-gray-600 mt-1">
                {selectedRequest.customer?.name} - {selectedRequest.pricing_tier?.product?.name}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اختر المشتريات المتاحة
                </label>
                <select
                  value={selectedPurchase}
                  onChange={(e) => setSelectedPurchase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">اختر الحساب للتفعيل</option>
                  {getAvailablePurchasesForProduct(selectedRequest.pricing_tier?.product?.id).map(purchase => (
                    <option key={purchase.id} value={purchase.id}>
                      {purchase.service_name} - متاح ({purchase.max_users - purchase.current_users} مستخدم) - 
                      تكلفة: {(Number(purchase.purchase_price) / purchase.max_users).toFixed(2)} ريال
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تفاصيل الوصول للعميل
                </label>
                <textarea
                  value={accessDetails}
                  onChange={(e) => setAccessDetails(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="البريد الإلكتروني وكلمة المرور أو رابط الدعوة..."
                  required
                />
              </div>

              {selectedPurchase && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">معلومات الربح:</h4>
                  {(() => {
                    const purchase = purchases.find(p => p.id === selectedPurchase);
                    if (!purchase) return null;
                    
                    const costPerUser = Number(purchase.purchase_price) / purchase.max_users;
                    const salePrice = Number(selectedRequest.pricing_tier?.price || 0);
                    const profit = salePrice - costPerUser;
                    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                    
                    return (
                      <div className="text-sm space-y-1">
                        <p>التكلفة لكل مستخدم: {costPerUser.toFixed(2)} ريال</p>
                        <p>سعر البيع: {salePrice.toFixed(2)} ريال</p>
                        <p className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          الربح: {profit.toFixed(2)} ريال ({margin.toFixed(1)}%)
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => {
                    setShowActivateModal(false);
                    setSelectedPurchase('');
                    setAccessDetails('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmActivation}
                  disabled={!selectedPurchase || !accessDetails.trim() || processingId === selectedRequest.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {processingId === selectedRequest.id ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                  تفعيل الاشتراك
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionRequests;