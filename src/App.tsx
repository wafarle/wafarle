import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Subscriptions from './components/Subscriptions';
import Invoices from './components/Invoices';
import PurchasesSales from './components/PurchasesSales';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </Layout>
  );
}

export default App;