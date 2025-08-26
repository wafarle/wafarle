import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Customer, Product, PricingTier, Subscription, Invoice, Purchase, Sale } from '../types';

// Hook للعملاء
export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل العملاء');
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في إضافة العميل';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === id ? data : c));
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث العميل';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في حذف العميل';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: fetchCustomers
  };
};

// Hook للمنتجات
export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          category,
          features,
          icon,
          color,
          is_popular,
          price,
          max_users,
          current_users,
          available_slots,
          created_at,
          updated_at,
          pricing_tiers (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'pricing_tiers'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [{ ...data, pricing_tiers: [] }, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في إضافة المنتج';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث المنتج';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في حذف المنتج';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
    fetchProducts
  };
};

// Hook للاشتراكات
export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchProducts } = useProducts();

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          customer:customers(*),
          purchase:purchases!left(*,
            product:products(*)
          ),
          pricing_tier:pricing_tiers(*,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async (subscription: {
    customer_id: string;
    pricing_tier_id: string;
    purchase_id?: string | null;
    start_date: string;
    end_date: string;
    discount_percentage?: number;
    final_price?: number;
    custom_price?: number | null;
  }) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscription])
        .select(`
          *,
          customer:customers(*),
          purchase:purchases!left(*,
            product:products(*)
          ),
          pricing_tier:pricing_tiers(*,
            product:products(*)
          )
        `)
        .single();

      if (error) throw error;
      
      // تحديث عدد المستخدمين في المنتج إذا كان مربوط بمشتريات
      if (subscription.purchase_id) {
        // جلب بيانات المشتريات
        const { data: purchaseData } = await supabase
          .from('purchases')
          .select('product_id, current_users, max_users')
          .eq('id', subscription.purchase_id)
          .single();

        if (purchaseData?.product_id) {
          // تحديث عدد المستخدمين في المنتج
          const newCurrentUsers = (purchaseData.current_users || 0) + 1;
          const availableSlots = purchaseData.max_users - newCurrentUsers;
          
          await supabase
            .from('products')
            .update({
              current_users: newCurrentUsers,
              available_slots: Math.max(0, availableSlots)
            })
            .eq('id', purchaseData.product_id);
        }
      }
      // إعادة تحميل المنتجات لتحديث عدد المستخدمين المتاحين
      await fetchProducts();
      
      setSubscriptions(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في إضافة الاشتراك';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          customer:customers(*),
          purchase:purchases!left(*,
            product:products(*)
          ),
          pricing_tier:pricing_tiers!left(*,
            product:products(*)
          )
        `)
        .single();

      if (error) throw error;
      setSubscriptions(prev => prev.map(s => s.id === id ? data : s));
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث الاشتراك';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في حذف الاشتراك';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return {
    subscriptions,
    loading,
    error,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    refetch: fetchSubscriptions
  };
};

// Hook للفواتير
export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          subscription:subscriptions(*,
            pricing_tier:pricing_tiers(*,
              product:products(*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  const addInvoice = async (invoice: {
    subscription_id: string;
    customer_id: string;
    amount: number;
    due_date: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoice])
        .select(`
          *,
          customer:customers(*),
          subscription:subscriptions(*,
            pricing_tier:pricing_tiers(*,
              product:products(*)
            )
          )
        `)
        .single();

      if (error) throw error;
      setInvoices(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في إضافة الفاتورة';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          customer:customers(*),
          subscription:subscriptions(*,
            pricing_tier:pricing_tiers(*,
              product:products(*)
            )
          )
        `)
        .single();

      if (error) throw error;
      setInvoices(prev => prev.map(i => i.id === id ? data : i));
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث الفاتورة';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في حذف الفاتورة';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    loading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    refetch: fetchInvoices
  };
};

// Hook للإحصائيات
export const useDashboardStats = () => {
  const [stats, setStats] = useState({
    total_customers: 0,
    active_subscriptions: 0,
    total_revenue: 0,
    pending_invoices: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // جلب إحصائيات العملاء
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // جلب الاشتراكات النشطة
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // جلب إجمالي الإيرادات
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid');

      const totalRevenue = paidInvoices?.reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;

      // جلب الفواتير المعلقة
      const { count: pendingInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        total_customers: customersCount || 0,
        active_subscriptions: activeSubscriptions || 0,
        total_revenue: totalRevenue,
        pending_invoices: pendingInvoices || 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};

// Hook للمشتريات
export const usePurchases = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          product:products(*),
          sales (
            *,
            customer:customers(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل المشتريات');
    } finally {
      setLoading(false);
    }
  };

  const addPurchase = async (purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'current_users' | 'sales' | 'product'>) => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .insert([purchase])
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (error) throw error;
      setPurchases(prev => [{ ...data, sales: [] }, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في إضافة المشتريات';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updatePurchase = async (id: string, updates: Partial<Purchase>) => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setPurchases(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث المشتريات';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPurchases(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في حذف المشتريات';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  return {
    purchases,
    loading,
    error,
    addPurchase,
    updatePurchase,
    deletePurchase,
    refetch: fetchPurchases
  };
};

// Hook للمبيعات
export const useSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          purchase:purchases(*),
          customer:customers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل المبيعات');
    } finally {
      setLoading(false);
    }
  };

  const addSale = async (sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([sale])
        .select(`
          *,
          purchase:purchases(*),
          customer:customers(*)
        `)
        .single();

      if (error) throw error;
      setSales(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في إضافة المبيعات';
      setError(message);
      return { success: false, error: message };
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          purchase:purchases(*),
          customer:customers(*)
        `)
        .single();

      if (error) throw error;
      setSales(prev => prev.map(s => s.id === id ? data : s));
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث المبيعات';
      setError(message);
      return { success: false, error: message };
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSales(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في حذف المبيعات';
      setError(message);
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return {
    sales,
    loading,
    error,
    addSale,
    updateSale,
    deleteSale,
    refetch: fetchSales
  };
};