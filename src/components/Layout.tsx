import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  FileText, 
  BarChart3, 
  Menu,
  X,
  Building,
  Package,
  ShoppingBag,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'لوحة المراقبة', icon: BarChart3 },
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCard },
    { id: 'invoices', label: 'الفواتير', icon: FileText },
    { id: 'purchases-sales', label: 'المشتريات والمبيعات', icon: ShoppingBag },
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
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Building className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">إدارة الاشتراكات</span>
          </div>
          <button
            className="lg:hidden"
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
                ${currentPage === item.id ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-700'}
              `}
            >
              <item.icon className="w-5 h-5 ml-3" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Info and Sign Out */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="mr-3">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">مدير النظام</p>
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
              {menuItems.find(item => item.id === currentPage)?.label || 'لوحة المراقبة'}
            </h1>
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-sm text-gray-600">مرحباً، {user?.email}</span>
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

export default Layout;