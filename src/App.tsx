import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import AuthPage from './components/Auth/AuthPage';
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

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

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
    return <AuthPage />;
  }

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
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderCurrentPage()}
      </Layout>
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