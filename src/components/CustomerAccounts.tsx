import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Key, 
  Check, 
  X, 
  UserPlus, 
  Send,
  Copy,
  Loader2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useCustomers } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';

const CustomerAccounts: React.FC = () => {
  const { customers, loading: customersLoading, error: customersError } = useCustomers();
  const [processing, setProcessing] = useState<string | null>(null);
  const [createdAccounts, setCreatedAccounts] = useState<{[key: string]: {email: string, password: string}}>({});
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [filter, setFilter] = useState<'all' | 'with_account' | 'without_account'>('all');

  // تصفية العملاء حسب وجود حساب المصادقة
  const filteredCustomers = customers.filter(customer => {
    switch (filter) {
      case 'with_account':
        return customer.auth_user_id !== null;
      case 'without_account':
        return customer.auth_user_id === null;
      default:
        return true;
    }
  });

  // إحصائيات
  const stats = {
    total: customers.length,
    withAccount: customers.filter(c => c.auth_user_id !== null).length,
    withoutAccount: customers.filter(c => c.auth_user_id === null).length
  };

  // إنشاء حساب مصادقة للعميل
  const createCustomerAccount = async (customer: any) => {
    if (!customer.phone) {
      alert('لا يمكن إنشاء حساب بدون رقم هاتف');
      return;
    }

    setProcessing(customer.id);
    
    try {
      // تنظيف وتوحيد رقم الهاتف
      const cleanPhone = customer.phone.replace(/[^0-9+]/g, '');
      let normalizedPhone = cleanPhone;
      
      // تحويل إلى التنسيق الموحد
      if (cleanPhone.startsWith('05')) {
        normalizedPhone = '+966' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('5')) {
        normalizedPhone = '+966' + cleanPhone;
      } else if (cleanPhone.startsWith('966') && !cleanPhone.startsWith('+')) {
        normalizedPhone = '+' + cleanPhone;
      } else if (cleanPhone.startsWith('+966')) {
        normalizedPhone = cleanPhone;
      }

      // إنشاء حساب المصادقة في Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.auth`,
        password: '123456',
        email_confirm: true,
        user_metadata: {
          phone: normalizedPhone,
          auth_type: 'phone',
          customer_name: customer.name
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('رقم الهاتف مسجل مسبقاً في النظام');
        }
        throw authError;
      }

      // ربط العميل بحساب المصادقة
      const { error: linkError } = await supabase
        .from('customers')
        .update({ 
          auth_user_id: authData.user.id,
          phone_auth: normalizedPhone
        })
        .eq('id', customer.id);

      if (linkError) throw linkError;

      // حفظ بيانات الحساب المُنشأ
      setCreatedAccounts(prev => ({
        ...prev,
        [customer.id]: {
          email: customer.phone, // حفظ رقم الهاتف بدلاً من الإيميل
          password: '123456'
        }
      }));

      alert('✅ تم إنشاء حساب العميل بنجاح!');
      
    } catch (error) {
      console.error('Error creating customer account:', error);
      alert(`❌ حدث خطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setProcessing(null);
    }
  };

  // نسخ بيانات تسجيل الدخول
  const copyLoginDetails = async (customerId: string) => {
    const account = createdAccounts[customerId];
    if (!account) return;

    const customer = customers.find(c => c.id === customerId);
    const loginDetails = `
🔐 بيانات تسجيل الدخول لبوابة العملاء

👤 العميل: ${customer?.name}
📱 رقم الهاتف: ${account.email}
🔑 كلمة المرور: 123456

🌐 رابط بوابة العملاء:
${window.location.origin}

📋 التعليمات:
1. افتح الرابط أعلاه
2. اختر "تسجيل الدخول"
3. أدخل رقم الهاتف وكلمة المرور
4. كلمة المرور الموحدة: 123456

🛡️ ملاحظة:
- كلمة المرور الموحدة: 123456
- رقم الهاتف هو اسم المستخدم الخاص بك
- يمكنك تغيير كلمة المرور من الملف الشخصي

📞 للدعم: +966123456789
📧 البريد: support@wafarle.com
    `;

    try {
      await navigator.clipboard.writeText(loginDetails.trim());
      alert('✅ تم نسخ بيانات تسجيل الدخول! يمكنك الآن إرسالها للعميل.');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('❌ فشل في نسخ البيانات. يرجى النسخ يدوياً:\n\n' + loginDetails);
    }
  };

  // إنشاء حسابات لجميع العملاء بدون حسابات
  const createAllMissingAccounts = async () => {
    const customersWithoutAccounts = customers.filter(c => !c.auth_user_id && c.phone);
    
    if (customersWithoutAccounts.length === 0) {
      alert('جميع العملاء لديهم حسابات بالفعل أو لا يوجد رقم هاتف');
      return;
    }

    if (!window.confirm(`هل تريد إنشاء حسابات لـ ${customersWithoutAccounts.length} عميل؟`)) {
      return;
    }

    const createdAccountsData: {[key: string]: {email: string, password: string}} = {};
    let successCount = 0;
    let failureCount = 0;

    for (const customer of customersWithoutAccounts) {
      try {
        setProcessing(customer.id);
        
        // تنظيف وتوحيد رقم الهاتف
        const customerPhone = customer.phone.replace(/[^0-9+]/g, '');
        let normalizedPhone = customerPhone;
        
        // تحويل إلى التنسيق الموحد
        if (customerPhone.startsWith('05')) {
          normalizedPhone = '+966' + customerPhone.substring(1);
        } else if (customerPhone.startsWith('5')) {
          normalizedPhone = '+966' + customerPhone;
        } else if (customerPhone.startsWith('966') && !customerPhone.startsWith('+')) {
          normalizedPhone = '+' + customerPhone;
        } else if (customerPhone.startsWith('+966')) {
          normalizedPhone = customerPhone;
        }
        
        // إنشاء حساب المصادقة
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.auth`,
          password: '123456',
          email_confirm: true,
          user_metadata: {
            phone: normalizedPhone,
            auth_type: 'phone',
            customer_name: customer.name
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            failureCount++;
            console.log(`Customer ${customer.name} phone already registered`);
            continue;
          }
          throw authError;
        }

        // ربط العميل بحساب المصادقة
        const { error: linkError } = await supabase
          .from('customers')
          .update({ 
            auth_user_id: authData.user.id,
            phone_auth: normalizedPhone
          })
          .eq('id', customer.id);

        if (linkError) throw linkError;

        createdAccountsData[customer.id] = {
          email: customer.phone, // حفظ رقم الهاتف
          password: '123456'
        };

        successCount++;
        
      } catch (err) {
        failureCount++;
        console.error('Error creating customer account:', err);
      }
    }

    setCreatedAccounts(prev => ({ ...prev, ...createdAccountsData }));
    setProcessing(null);
    
    alert(`✅ تم إنشاء ${successCount} حساب بنجاح!\n${failureCount > 0 ? `❌ فشل في إنشاء ${failureCount} حساب` : ''}`);
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل العملاء...</span>
      </div>
    );
  }

  if (customersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{customersError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">حسابات العملاء</h1>
          <p className="text-gray-600">إنشاء وإدارة حسابات المصادقة للعملاء</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={createAllMissingAccounts}
            disabled={processing !== null}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4 ml-2" />
            إنشاء حسابات للجميع
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg ml-3">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg ml-3">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">لديهم حسابات</p>
              <p className="text-xl font-bold text-green-600">{stats.withAccount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg ml-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">بدون حسابات</p>
              <p className="text-xl font-bold text-red-600">{stats.withoutAccount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          جميع العملاء ({stats.total})
        </button>
        <button
          onClick={() => setFilter('with_account')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'with_account'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          لديهم حسابات ({stats.withAccount})
        </button>
        <button
          onClick={() => setFilter('without_account')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'without_account'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          بدون حسابات ({stats.withoutAccount})
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Shield className="w-6 h-6 text-blue-600 ml-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">كيفية عمل حسابات العملاء</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• <strong>إنشاء الحساب:</strong> ينشئ حساب مصادقة في Supabase مربوط بالعميل</p>
              <p>• <strong>كلمة المرور المؤقتة:</strong> يتم إنشاؤها تلقائياً ويجب إرسالها للعميل</p>
              <p>• <strong>الوصول للبيانات:</strong> العميل يرى اشتراكاته وفواتيره فقط</p>
              <p>• <strong>الأمان:</strong> كل عميل محمي بسياسات RLS ولا يرى بيانات العملاء الآخرين</p>
              <p>• <strong>تغيير كلمة المرور:</strong> العميل يمكنه تغييرها من ملفه الشخصي</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حالة الحساب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاشتراكات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => {
                const hasAccount = customer.auth_user_id !== null;
                const accountData = createdAccounts[customer.id];
                
                return (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 ml-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 ml-2" />
                        <span className="text-sm text-gray-900">{customer.email || 'غير محدد'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {hasAccount ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              لديه حساب
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-red-600 ml-2" />
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              بدون حساب
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <span className="font-medium">{customer.subscriptions?.length || 0}</span>
                        <span className="text-gray-500 mr-1">اشتراك</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        {!hasAccount && customer.email ? (
                          <button
                            onClick={() => createCustomerAccount(customer)}
                            disabled={processing === customer.id}
                            className="text-green-600 hover:text-green-900 hover:bg-green-50 p-2 rounded transition-colors disabled:opacity-50"
                            title="إنشاء حساب للعميل"
                          >
                            {processing === customer.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                          </button>
                        ) : !hasAccount ? (
                          <span className="text-xs text-gray-500 p-2">
                            لا يوجد بريد إلكتروني
                          </span>
                        ) : (
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600 mr-1">مُفعل</span>
                          </div>
                        )}

                        {/* إذا تم إنشاء الحساب حديثاً، إظهار بيانات تسجيل الدخول */}
                        {accountData && (
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => copyLoginDetails(customer.id)}
                              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded transition-colors"
                              title="نسخ بيانات تسجيل الدخول"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowPassword(prev => ({ ...prev, [customer.id]: !prev[customer.id] }))}
                              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-2 rounded transition-colors"
                              title="إظهار/إخفاء كلمة المرور"
                            >
                              {showPassword[customer.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
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

      {/* Created Accounts Summary */}
      {Object.keys(createdAccounts).length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <Key className="w-5 h-5 ml-2" />
            الحسابات المُنشأة حديثاً ({Object.keys(createdAccounts).length})
          </h3>
          <div className="space-y-3">
            {Object.entries(createdAccounts).map(([customerId, account]) => {
              const customer = customers.find(c => c.id === customerId);
              return (
                <div key={customerId} className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-green-600 ml-3" />
                      <div>
                        <p className="font-medium text-gray-900">{customer?.name}</p>
                        <p className="text-sm text-gray-600">{account.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="text-right">
                        <p className="text-xs text-gray-600">رقم الهاتف: {account.email}</p>
                        <p className="text-xs text-gray-600">كلمة المرور:</p>
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {showPassword[customerId] ? account.password : '••••••••'}
                        </code>
                      </div>
                      <button
                        onClick={() => setShowPassword(prev => ({ ...prev, [customerId]: !prev[customerId] }))}
                        className="text-gray-500 hover:text-gray-700 p-1"
                      >
                        {showPassword[customerId] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyLoginDetails(customerId)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors flex items-center"
                      >
                        <Copy className="w-3 h-3 ml-1" />
                        نسخ البيانات
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Send className="w-5 h-5 text-blue-600 ml-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">خطوات إرسال البيانات للعملاء:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. انقر على "نسخ البيانات" بجانب كل عميل</li>
                  <li>2. أرسل البيانات للعميل عبر الواتساب أو الإيميل</li>
                  <li>3. العميل يسجل دخول برقم هاتفه وكلمة المرور</li>
                  <li>4. العميل يمكنه الآن الوصول لبوابة العملاء على: <code className="bg-blue-100 px-1 rounded">{window.location.origin}</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500 mb-4">
            {filter === 'with_account' ? 'لا يوجد عملاء لديهم حسابات' :
             filter === 'without_account' ? 'جميع العملاء لديهم حسابات' :
             'لا يوجد عملاء'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerAccounts;