import React, { useState } from 'react';
import { Phone, Lock, Eye, EyeOff, UserPlus, Loader2, User, Mail, MapPin } from 'lucide-react';
import { useAuth, normalizePhone } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface CustomerSignUpFormProps {
  onToggleMode: () => void;
}

const CustomerSignUpForm: React.FC<CustomerSignUpFormProps> = ({ onToggleMode }) => {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    // أنماط صحيحة للرقم السعودي
    const patterns = [
      /^05[0-9]{8}$/,        // 0501234567
      /^5[0-9]{8}$/,         // 501234567
      /^9665[0-9]{8}$/,      // 9665xxxxxxxx
      /^\+9665[0-9]{8}$/     // +9665xxxxxxxx
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
  };

  const normalizePhone = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    if (cleanPhone.startsWith('05')) {
      return '+966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('5')) {
      return '+966' + cleanPhone;
    } else if (cleanPhone.startsWith('966') && !cleanPhone.startsWith('+')) {
      return '+' + cleanPhone;
    } else if (cleanPhone.startsWith('+966')) {
      return cleanPhone;
    }
    
    return cleanPhone;
  };

  const formatPhoneForDisplay = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    if (cleanPhone.startsWith('+9665')) {
      return cleanPhone.replace(/(\+966)(\d)(\d{4})(\d{4})/, '$1 $2 $3 $4');
    } else if (cleanPhone.startsWith('9665')) {
      return cleanPhone.replace(/(\d{3})(\d)(\d{4})(\d{4})/, '+$1 $2 $3 $4');
    } else if (cleanPhone.startsWith('05')) {
      return cleanPhone.replace(/(\d{2})(\d)(\d{4})(\d{4})/, '$1 $2 $3 $4');
    } else if (cleanPhone.startsWith('5')) {
      return cleanPhone.replace(/(\d)(\d{4})(\d{4})/, '05$1 $2 $3');
    }
    
    return phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // تنظيف البيانات
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim().toLowerCase();
    const address = formData.address.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    // التحقق من الحقول المطلوبة
    if (!name) {
      setError('الاسم مطلوب');
      setLoading(false);
      return;
    }

    if (!phone) {
      setError('رقم الهاتف مطلوب');
      setLoading(false);
      return;
    }

    // التحقق من صحة رقم الهاتف
    if (!validatePhone(phone)) {
      setError('رقم الهاتف غير صحيح. يرجى إدخال رقم سعودي صحيح (مثال: 0501234567)');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    try {
      const normalizedPhone = normalizePhone(phone);
      
      // إنشاء سجل العميل في قاعدة البيانات بعد نجاح المصادقة
      const { data: existingCustomers, error: checkError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('phone_auth', normalizedPhone);

      if (checkError) throw checkError;

      if (existingCustomers && existingCustomers.length > 0) {
        const duplicate = existingCustomers[0];
        setError(`رقم الهاتف "${phone}" مستخدم بالفعل من قبل العميل "${duplicate.name}"`);
        setLoading(false);
        return;
      }

      // إنشاء حساب المصادقة برقم الهاتف
      const { error: authError, data: authData } = await signUp(phone, password, true);
      
      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('رقم الهاتف مسجل مسبقاً');
        } else {
          setError('حدث خطأ في إنشاء الحساب');
        }
        setLoading(false);
        return;
      }

      // إضافة العميل إلى جدول العملاء
      if (authData?.user?.id) {
        const { error: customerError } = await supabase
          .from('customers')
          .insert([{
            name,
            phone,
            phone_auth: normalizedPhone,
            email: email || '',
            address: address || '',
            auth_user_id: authData.user.id
          }]);

        if (customerError) {
          console.error('Error creating customer record:', customerError);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error in sign up:', err);
      setError('حدث خطأ في إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">تم إنشاء الحساب بنجاح!</h3>
          <p className="text-green-700 text-sm">
            يمكنك الآن تسجيل الدخول برقم هاتفك وكلمة المرور
          </p>
        </div>
        <button
          onClick={onToggleMode}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">انضم إلينا</h2>
        <p className="text-gray-600">أنشئ حسابك برقم هاتفك</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الاسم الكامل
          </label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="أحمد محمد"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رقم الهاتف
          </label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              onBlur={(e) => {
                // تنسيق الرقم عند فقدان التركيز
                const formatted = formatPhoneForDisplay(e.target.value);
                setFormData(prev => ({ ...prev, phone: formatted }));
              }}
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0501234567"
              dir="ltr"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            رقم هاتفك السعودي (مطلوب للدخول)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            البريد الإلكتروني (اختياري)
          </label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="example@domain.com (اختياري)"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            العنوان (اختياري)
          </label>
          <div className="relative">
            <MapPin className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="الرياض، المملكة العربية السعودية"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            كلمة المرور
          </label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">6 أحرف على الأقل</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تأكيد كلمة المرور
          </label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5 ml-2" />
              إنشاء الحساب
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          لديك حساب بالفعل؟{' '}
          <button
            onClick={onToggleMode}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            تسجيل الدخول
          </button>
        </p>
      </div>
    </div>
  );
};

export default CustomerSignUpForm;