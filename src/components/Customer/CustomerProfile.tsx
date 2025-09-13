import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Save, 
  X,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.email && !user?.phone && !user?.user_metadata?.phone) {
      console.log('No user identification available for profile');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching profile for user:', { email: user?.email, phone: user?.phone, metadata: user?.user_metadata });
      
      let data = null;
      
      // البحث بمعرف المصادقة أولاً
      if (user.id) {
        const { data: authData } = await supabase
          .from('customers')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        if (authData) {
          data = authData;
        }
      }
      
      // البحث بالبريد الإلكتروني
      if (!data && user.email) {
        const { data: emailData } = await supabase
          .from('customers')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (emailData) {
          data = emailData;
        }
      }

      // البحث برقم الهاتف
      if (!data) {
        const phoneNumbers = [
          user.phone,
          user.user_metadata?.phone
        ].filter(Boolean);
        
        for (const phoneNumber of phoneNumbers) {
          if (data) break;
          
          // البحث في phone_auth
          const { data: phoneAuthData } = await supabase
            .from('customers')
            .select('*')
            .eq('phone_auth', phoneNumber)
            .maybeSingle();
          
          if (phoneAuthData) {
            data = phoneAuthData;
            break;
          }
          
          // البحث في phone العادي
          const { data: phoneData } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', phoneNumber)
            .maybeSingle();
          
          if (phoneData) {
            data = phoneData;
            break;
          }
        }
      }
      
      console.log('Profile data found:', data);

      if (!data) {
        // العميل غير موجود، إنشاء ملف تعريفي جديد
        const newCustomerData = {
          name: user?.user_metadata?.customer_name || user?.email?.split('@')[0] || 'عميل جديد',
          email: user?.email || '',
          phone: user?.phone || user?.user_metadata?.phone || '',
          phone_auth: user?.phone || user?.user_metadata?.phone || null,
          address: '',
          auth_user_id: user.id
        };
        
        console.log('Creating new customer:', newCustomerData);
        
        const { data: newProfile, error: createError } = await supabase
          .from('customers')
          .insert([newCustomerData])
          .select()
          .single();

        if (createError) {
          console.error('Error creating customer profile:', createError);
          throw createError;
        }
        
        setProfile(newProfile);
        data = newProfile;
      } else {
        setProfile(data);
      }

      if (data || profile) {
        const profileData = data || profile;
        setFormData({
          name: profileData?.name || '',
          phone: profileData?.phone || '',
          address: profileData?.address || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);

      const { data, error } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim()
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('حدث خطأ في حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setFormData({
      name: profile?.name || '',
      phone: profile?.phone || '',
      address: profile?.address || ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري تحميل الملف الشخصي...</span>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchProfile}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">الملف الشخصي</h1>
          <p className="text-gray-600">إدارة معلوماتك الشخصية</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Edit className="w-4 h-4 ml-2" />
            تعديل المعلومات
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
            <span className="text-green-800">تم حفظ التغييرات بنجاح!</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <X className="w-5 h-5 text-red-600 ml-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center ml-4">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{editing ? formData.name || 'اسم العميل' : profile?.name}</h2>
              <p className="opacity-90">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الشخصية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل
                  </label>
                  {editing ? (
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="أحمد محمد"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400 ml-3" />
                      <span className="text-gray-900">{profile?.name || 'غير محدد'}</span>
                    </div>
                  )}
                </div>

                {/* Email (Read Only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني / رقم الهاتف
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    {profile?.phone_auth ? (
                      <Phone className="w-5 h-5 text-gray-400 ml-3" />
                    ) : (
                      <Mail className="w-5 h-5 text-gray-400 ml-3" />
                    )}
                    <span className="text-gray-900">
                      {profile?.phone_auth || profile?.email || 'غير محدد'}
                    </span>
                    <span className="mr-2 text-xs text-gray-500">(لا يمكن تعديله)</span>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف
                  </label>
                  {editing ? (
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="+966501234567"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-400 ml-3" />
                      <span className="text-gray-900">{profile?.phone || 'غير محدد'}</span>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العنوان
                  </label>
                  {editing ? (
                    <div className="relative">
                      <MapPin className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        rows={3}
                        className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="الرياض، المملكة العربية السعودية"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-400 ml-3 mt-0.5" />
                      <span className="text-gray-900">{profile?.address || 'غير محدد'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات الحساب</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ إنشاء الحساب
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400 ml-3" />
                    <span className="text-gray-900">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'غير محدد'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    آخر تحديث
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Edit className="w-5 h-5 text-gray-400 ml-3" />
                    <span className="text-gray-900">
                      {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'غير محدد'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {editing && (
              <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t border-gray-200">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 ml-2 inline" />
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">الدعم الفني</h3>
        <p className="text-blue-800 mb-4">
          هل تحتاج مساعدة في إدارة حسابك أو اشتراكاتك؟ نحن هنا لمساعدتك!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <Mail className="w-5 h-5 text-blue-600 ml-2" />
            <div>
              <p className="font-medium text-blue-900">البريد الإلكتروني</p>
              <p className="text-blue-700">support@wafarle.com</p>
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="w-5 h-5 text-blue-600 ml-2" />
            <div>
              <p className="font-medium text-blue-900">الهاتف</p>
              <p className="text-blue-700">+966123456789</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;