import React, { useState } from 'react';
import { User, Package } from 'lucide-react';
import CustomerLoginForm from './CustomerLoginForm';
import CustomerSignUpForm from './CustomerSignUpForm';

const CustomerAuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-6xl flex bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex items-center justify-center">
          {isLogin ? (
            <CustomerLoginForm onToggleMode={() => setIsLogin(false)} />
          ) : (
            <CustomerSignUpForm onToggleMode={() => setIsLogin(true)} />
          )}
        </div>

        {/* Right Side - Customer Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 p-12 items-center justify-center text-white">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-6">بوابة العملاء</h1>
            <p className="text-xl text-green-100 mb-8 leading-relaxed">
              إدارة اشتراكاتك ومتابعة فواتيرك بكل سهولة
            </p>
            <div className="space-y-4 text-right">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-300 rounded-full ml-3"></div>
                <span className="text-green-100">عرض اشتراكاتك الحالية</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-300 rounded-full ml-3"></div>
                <span className="text-green-100">طلب اشتراكات جديدة</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-300 rounded-full ml-3"></div>
                <span className="text-green-100">متابعة الفواتير والمدفوعات</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-300 rounded-full ml-3"></div>
                <span className="text-green-100">دعم فني مباشر</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAuthPage;