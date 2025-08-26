import React, { useState } from 'react';
import { Building } from 'lucide-react';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-6xl flex bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex items-center justify-center">
          {isLogin ? (
            <LoginForm onToggleMode={() => setIsLogin(false)} />
          ) : (
            <SignUpForm onToggleMode={() => setIsLogin(true)} />
          )}
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 p-12 items-center justify-center text-white">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Building className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-6">نظام إدارة الاشتراكات</h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              إدارة شاملة لعملائك واشتراكاتهم وفواتيرهم في مكان واحد
            </p>
            <div className="space-y-4 text-right">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full ml-3"></div>
                <span className="text-blue-100">إدارة العملاء والاشتراكات</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full ml-3"></div>
                <span className="text-blue-100">تتبع الفواتير والمدفوعات</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full ml-3"></div>
                <span className="text-blue-100">إدارة المنتجات والمشتريات</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full ml-3"></div>
                <span className="text-blue-100">تقارير وإحصائيات شاملة</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;