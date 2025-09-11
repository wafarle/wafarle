import React, { useState } from 'react';
import { 
  User, 
  Package, 
  FileText, 
  CreditCard, 
  Menu,
  X,
  LogOut,
  Home,
  ShoppingCart,
  Bell,
  Settings,
  Phone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
    { id: 'subscriptions', label: 'اشتراكاتي', icon: Package },
    { id: 'request-subscription', label: 'طلب اشتراك جديد', icon: ShoppingCart },
    { id: 'invoices', label: 'فواتيري', icon: FileText },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 right-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex items-center space-x-2 space-x-reverse">
            <User className="w-8 h-8 text-white" />
            <span className="text-xl font-bold text-white">بوابة العملاء</span>
          </div>
          <button
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-8">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onPageChange(item.id);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center px-6 py-3 text-right hover:bg-gray-50 transition-colors
                ${currentPage === item.id ? 'bg-green-50 text-green-600 border-l-4 border-green-600' : 'text-gray-700'}
              `}
            >
              <item.icon className="w-5 h-5 ml-3" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Support Section */}
        <div className="absolute bottom-20 left-0 right-0 p-6 border-t border-gray-200 bg-gray-50">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <Phone className="w-5 h-5 text-blue-600 ml-2" />
              <span className="text-sm font-medium text-blue-900">الدعم الفني</span>
            </div>
            <p className="text-xs text-blue-700 mb-2">
              هل تحتاج مساعدة؟ نحن هنا لخدمتك
            </p>
            <div className="space-y-1 text-xs text-blue-600">
              <p>📞 +966123456789</p>
              <p>📧 support@wafarle.com</p>
            </div>
          </div>
        </div>

        {/* User Info and Sign Out */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'ع'}
                </span>
              </div>
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                  {user?.email || 'عميل'}
                </p>
                <p className="text-xs text-gray-500">عميل</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">
              {menuItems.find(item => item.id === currentPage)?.label || 'لوحة التحكم'}
            </h1>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button className="relative p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <span className="text-sm text-gray-600">مرحباً، {user?.email || 'عميل'}</span>
              <button
                onClick={handleSignOut}
                className="lg:hidden p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;