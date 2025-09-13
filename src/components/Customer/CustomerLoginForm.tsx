import React, { useState } from 'react';
import { Phone, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useAuth, normalizePhone } from '../../contexts/AuthContext';

interface CustomerLoginFormProps {
  onToggleMode: () => void;
}

const CustomerLoginForm: React.FC<CustomerLoginFormProps> = ({ onToggleMode }) => {
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const formatPhoneForDisplay = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    // تنسيق عرض الرقم
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

    // تطبيق نفس تنسيق الهاتف المستخدم في التسجيل
    const phone = normalizePhone(formData.phone.trim());
    const password = formData.password;

    // التحقق من صحة رقم الهاتف الأصلي
    if (!validatePhone(formData.phone.trim())) {
      setError('رقم الهاتف غير صحيح. يرجى إدخال رقم سعودي صحيح (مثال: 0501234567)');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    const { error } = await signIn(phone, password, true);
    
    if (error) {
      setError(error.message === 'Invalid login credentials' 
        ? 'رقم الهاتف أو كلمة المرور غير صحيحة' 
        : 'حدث خطأ في تسجيل الدخول');
    }
    
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">دخول العميل</h2>
        <p className="text-gray-600">ادخل برقم هاتفك وكلمة المرور</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

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
              placeholder="0501234567 أو +966501234567"
              dir="ltr"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            أدخل رقم هاتفك السعودي (مثال: 0501234567)
          </p>
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
              <LogIn className="w-5 h-5 ml-2" />
              تسجيل الدخول
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          عميل جديد؟{' '}
          <button
            onClick={onToggleMode}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            إنشاء حساب جديد
          </button>
        </p>
      </div>
    </div>
  );
};

export default CustomerLoginForm;