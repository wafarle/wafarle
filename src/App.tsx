import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import AuthPage from './components/Auth/AuthPage';
import CustomerAuthPage from './components/Customer/CustomerAuthPage';
import CustomerLayout from './components/Customer/CustomerLayout';
import CustomerDashboard from './components/Customer/CustomerDashboard';
import CustomerSubscriptions from './components/Customer/CustomerSubscriptions';
import CustomerInvoices from './components/Customer/CustomerInvoices';
import SubscriptionRequest from './components/Customer/SubscriptionRequest';
import Store from './components/Customer/Store';
import Checkout from './components/Customer/Checkout';
import PaymentSuccess from './components/Customer/PaymentSuccess';
import CustomerProfile from './components/Customer/CustomerProfile';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Subscriptions from './components/Subscriptions';
import Invoices from './components/Invoices';
import PurchasesSales from './components/PurchasesSales';
import ProfitLoss from './components/ProfitLoss';
import ExpiringSubscriptions from './components/ExpiringSubscriptions';
import ApiPage from './components/ApiPage';
import NotificationsPage from './components/NotificationsPage';
import DailySalesCosts from './components/DailySalesCosts';
import SubscriptionRequests from './components/SubscriptionRequests';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [userType, setUserType] = useState<'admin' | 'customer'>('admin');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return userType === 'admin' ? (
      <div>
        <AuthPage />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setUserType('customer')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            بوابة العملاء
          </button>
        </div>
      </div>
    ) : (
      <div>
        <CustomerAuthPage />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setUserType('admin')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            دخول الإدارة
          </button>
        </div>
      </div>
    );
  }

  // التحقق من نوع المستخدم (يمكن تحسين هذا لاحقاً)
  const isAdmin = userType === 'admin';

  const renderCustomerPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <CustomerDashboard onPageChange={setCurrentPage} />;
      case 'store':
        return <Store onPageChange={setCurrentPage} />;
      case 'subscriptions':
        return <CustomerSubscriptions onPageChange={setCurrentPage} />;
      case 'request-subscription':
        return <SubscriptionRequest onPageChange={setCurrentPage} />;
      case 'checkout':
        return <Checkout onPageChange={setCurrentPage} />;
      case 'payment-success':
        return <PaymentSuccess onPageChange={setCurrentPage} />;
      case 'invoices':
        return <CustomerInvoices />;
      case 'profile':
        return <CustomerProfile />;
      default:
        return <CustomerDashboard onPageChange={setCurrentPage} />;
    }
  };
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'subscription-requests':
        return <SubscriptionRequests />;
      case 'invoices':
        return <Invoices />;
      case 'purchases-sales':
        return <PurchasesSales />;
      case 'profit-loss':
        return <ProfitLoss />;
      case 'expiring-subscriptions':
        return <ExpiringSubscriptions />;
      case 'notifications':
        return <NotificationsPage />;
      case 'daily-sales-costs':
        return <DailySalesCosts />;
      case 'api':
        return <ApiPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      {isAdmin ? (
        <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
          <div className="relative">
            {renderCurrentPage()}
            <div className="fixed bottom-4 left-4">
              <button
                onClick={() => setUserType('customer')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center"
              >
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                بوابة العملاء
              </button>
            </div>
          </div>
        </Layout>
      ) : (
        <CustomerLayout currentPage={currentPage} onPageChange={setCurrentPage}>
          <div className="relative">
            {renderCustomerPage()}
            <div className="fixed bottom-4 left-4">
              <button
                onClick={() => setUserType('admin')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center"
              >
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                لوحة الإدارة
              </button>
            </div>
          </div>
        </CustomerLayout>
      )}
    </ErrorBoundary>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;