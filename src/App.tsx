import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
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
  const [isAdmin, setIsAdmin] = useState(false);

  // تحديد نوع المستخدم بناءً على URL
  useEffect(() => {
    const path = window.location.pathname;
    setIsAdmin(path.startsWith('/admin'));
    
    // تحديث الصفحة الحالية بناءً على URL
    if (path.startsWith('/admin')) {
      const adminPage = path.replace('/admin', '') || '/dashboard';
      setCurrentPage(adminPage.substring(1) || 'dashboard');
    } else {
      setCurrentPage(path.substring(1) || 'dashboard');
    }
  }, []);

  // دالة تغيير الصفحة مع تحديث URL
  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    
    const newPath = isAdmin ? `/admin/${page}` : `/${page}`;
    window.history.pushState({}, '', page === 'dashboard' ? (isAdmin ? '/admin' : '/') : newPath);
  };

  // التعامل مع تغيير URL مباشرة
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const isAdminPath = path.startsWith('/admin');
      setIsAdmin(isAdminPath);
      
      if (isAdminPath) {
        const adminPage = path.replace('/admin', '') || '/dashboard';
        setCurrentPage(adminPage.substring(1) || 'dashboard');
      } else {
        setCurrentPage(path.substring(1) || 'dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    return isAdmin ? <AuthPage /> : <CustomerAuthPage />;
  }

  const renderCustomerPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <CustomerDashboard onPageChange={handlePageChange} />;
      case 'store':
        return <Store onPageChange={handlePageChange} />;
      case 'subscriptions':
        return <CustomerSubscriptions onPageChange={handlePageChange} />;
      case 'request-subscription':
        return <SubscriptionRequest onPageChange={handlePageChange} />;
      case 'checkout':
        return <Checkout onPageChange={handlePageChange} />;
      case 'payment-success':
        return <PaymentSuccess onPageChange={handlePageChange} />;
      case 'invoices':
        return <CustomerInvoices />;
      case 'profile':
        return <CustomerProfile />;
      default:
        return <CustomerDashboard onPageChange={handlePageChange} />;
    }
  };

  const renderAdminPage = () => {
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
        <Layout currentPage={currentPage} onPageChange={handlePageChange}>
          {renderAdminPage()}
        </Layout>
      ) : (
        <CustomerLayout currentPage={currentPage} onPageChange={handlePageChange}>
          {renderCustomerPage()}
        </CustomerLayout>
      )}
    </ErrorBoundary>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <PayPalScriptProvider 
        options={{
          clientId: "AUfS4VYq_LdTbHZvGmCtRumhpzRjsmkMX760IKrHoISf87UhgLND-UAA7aswSDXCDwXxFv0KqisHEpXc",
          currency: "USD",
          intent: "capture",
          locale: "ar_EG"
        }}
      >
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PayPalScriptProvider>
    </ErrorBoundary>
  );
}

export default App;