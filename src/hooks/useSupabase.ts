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
        .select(`
          *,
          subscriptions (
            *,
            pricing_tier:pricing_tiers (
              *,
              product:products (
                name,
                icon,
                color
              )
            ),
            purchase:purchases (
              service_name,
              purchase_price,
              max_users
            )
          ),
          invoices (
            *,
            subscription:subscriptions (
              pricing_tier:pricing_tiers (
                product:products (
                  name
                )
              )
            )
          ),
          sales (
            *,
            purchase:purchases (
              service_name,
              purchase_price,
              max_users
            )
          )
        `)
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
      // تنظيف وتحقق من البيانات
      const sanitizedCustomer = {
        name: customer.name.trim(),
        email: customer.email ? customer.email.trim().toLowerCase() : '',
        phone: customer.phone.trim(),
        address: customer.address.trim()
      };

      // التحقق من تكرار البريد الإلكتروني أو رقم الهاتف
      if (sanitizedCustomer.email || sanitizedCustomer.phone) {
        const { data: existingCustomers, error: checkError } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .or(`email.eq.${sanitizedCustomer.email || 'null'},phone.eq.${sanitizedCustomer.phone || 'null'}`);

        if (checkError) throw checkError;

        if (existingCustomers && existingCustomers.length > 0) {
          const duplicate = existingCustomers[0];
          let message = '';
          
          if (duplicate.email === sanitizedCustomer.email && sanitizedCustomer.email) {
            message = `تمت إضافة هذا البريد الإلكتروني من قبل باسم: ${duplicate.name}`;
          } else if (duplicate.phone === sanitizedCustomer.phone && sanitizedCustomer.phone) {
            message = `تمت إضافة هذا الرقم من قبل باسم: ${duplicate.name}`;
          }
          
          throw new Error(message);
        }
      }

      // التحقق من صحة رقم الهاتف
      if (sanitizedCustomer.phone) {
        const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
        if (!phoneRegex.test(sanitizedCustomer.phone)) {
          throw new Error('رقم الهاتف غير صحيح');
        }
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([sanitizedCustomer])
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
      // تنظيف البيانات المحدثة
      const sanitizedUpdates: Partial<Customer> = {};
      
      if (updates.name) sanitizedUpdates.name = updates.name.trim();
      if (updates.email) {
        const email = updates.email.trim().toLowerCase();
        sanitizedUpdates.email = email;
      }
      if (updates.phone) {
        const phone = updates.phone.trim();
        if (phone) {
          const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
          if (!phoneRegex.test(phone)) {
            throw new Error('رقم الهاتف غير صحيح');
          }
        }
        sanitizedUpdates.phone = phone;
      }
      if (updates.address) sanitizedUpdates.address = updates.address.trim();

      // التحقق من تكرار البريد الإلكتروني أو رقم الهاتف (باستثناء العميل الحالي)
      if (sanitizedUpdates.email || sanitizedUpdates.phone) {
        const conditions = [];
        if (sanitizedUpdates.email) conditions.push(`email.eq.${sanitizedUpdates.email}`);
        if (sanitizedUpdates.phone) conditions.push(`phone.eq.${sanitizedUpdates.phone}`);
        
        const { data: existingCustomers, error: checkError } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .or(conditions.join(','))
          .neq('id', id);

        if (checkError) throw checkError;

        if (existingCustomers && existingCustomers.length > 0) {
          const duplicate = existingCustomers[0];
          let message = '';
          
          if (duplicate.email === sanitizedUpdates.email && sanitizedUpdates.email) {
            message = `تمت إضافة هذا البريد الإلكتروني من قبل باسم: ${duplicate.name}`;
          } else if (duplicate.phone === sanitizedUpdates.phone && sanitizedUpdates.phone) {
            message = `تمت إضافة هذا الرقم من قبل باسم: ${duplicate.name}`;
          }
          
          throw new Error(message);
        }
      }
      const { data, error } = await supabase
        .from('customers')
        .update(sanitizedUpdates)
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
      // تنظيف وتحقق من البيانات
      const sanitizedProduct = {
        ...product,
        name: product.name.trim(),
        description: product.description.trim(),
        price: Math.max(0, Number(product.price) || 0),
        max_users: Math.max(1, Number(product.max_users) || 1),
        features: product.features.filter(f => f && f.trim()).map(f => f.trim())
      };

      // التحقق من الحقول المطلوبة
      if (!sanitizedProduct.name || sanitizedProduct.name.length < 2) {
        throw new Error('اسم المنتج يجب أن يكون على الأقل حرفين');
      }
      if (!sanitizedProduct.description || sanitizedProduct.description.length < 10) {
        throw new Error('وصف المنتج يجب أن يكون على الأقل 10 أحرف');
      }

      const { data, error } = await supabase
        .from('products')
        .insert([sanitizedProduct])
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
        // لا نحتاج لتحديث المنتج هنا لأن قاعدة البيانات تحتوي على triggers تقوم بذلك تلقائياً
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
          subscription:subscriptions!left(*,
            pricing_tier:pricing_tiers(*,
              product:products(*)
            )
          ),
          invoice_items(*,
            subscription:subscriptions(*,
              pricing_tier:pricing_tiers(*,
                product:products(*)
              )
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
    customer_id: string;
    total_amount: number;
    due_date: string;
    invoice_items: Array<{
      subscription_id: string;
      amount: number;
      description: string;
    }>;
  }) => {
    try {
      // Create the main invoice first
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          customer_id: invoice.customer_id,
          amount: invoice.total_amount, // Keep for backward compatibility
          total_amount: invoice.total_amount,
          due_date: invoice.due_date,
          subscription_id: invoice.invoice_items[0]?.subscription_id || null // For backward compatibility
        }])
        .select(`
          *,
          customer:customers(*),
          subscription:subscriptions!left(*,
            pricing_tier:pricing_tiers(*,
              product:products(*)
            )
          )
        `)
        .single();

      if (error) throw error;

      // Create invoice items
      const invoiceItems = invoice.invoice_items.map(item => ({
        ...item,
        invoice_id: data.id
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)
        .select(`
          *,
          subscription:subscriptions(*,
            pricing_tier:pricing_tiers(*,
              product:products(*)
            )
          )
        `);

      if (itemsError) throw itemsError;

      // Add invoice items to the response
      const invoiceWithItems = {
        ...data,
        invoice_items: itemsData
      };

      setInvoices(prev => [data, ...prev]);
      return { success: true, data: invoiceWithItems };
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
      // تنظيف وتحقق من البيانات
      const sanitizedPurchase = {
        ...purchase,
        service_name: purchase.service_name.trim(),
        account_details: purchase.account_details.trim(),
        purchase_price: Math.max(0, Number(purchase.purchase_price) || 0),
        sale_price_per_user: Math.max(0, Number(purchase.sale_price_per_user) || 0),
        max_users: Math.max(1, Number(purchase.max_users) || 1),
        notes: purchase.notes ? purchase.notes.trim() : ''
      };

      // التحقق من الحقول المطلوبة
      if (!sanitizedPurchase.service_name || sanitizedPurchase.service_name.length < 2) {
        throw new Error('اسم الخدمة يجب أن يكون على الأقل حرفين');
      }
      if (!sanitizedPurchase.account_details || sanitizedPurchase.account_details.length < 5) {
        throw new Error('تفاصيل الحساب يجب أن تكون على الأقل 5 أحرف');
      }
      if (sanitizedPurchase.purchase_price <= 0) {
        throw new Error('سعر الشراء يجب أن يكون أكبر من صفر');
      }

      const { data, error } = await supabase
        .from('purchases')
        .insert([sanitizedPurchase])
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
      console.log('Sales data loaded:', data?.length || 0, 'sales');
      setSales(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل المبيعات');
      console.error('Error loading sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const addSale = async (sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // تنظيف وتحقق من البيانات
      const sanitizedSale = {
        ...sale,
        sale_price: Math.max(0, Number(sale.sale_price) || 0),
        access_details: sale.access_details.trim()
      };

      // التحقق من الحقول المطلوبة
      if (sanitizedSale.sale_price <= 0) {
        throw new Error('سعر البيع يجب أن يكون أكبر من صفر');
      }
      if (!sanitizedSale.access_details || sanitizedSale.access_details.length < 5) {
        throw new Error('تفاصيل الوصول يجب أن تكون على الأقل 5 أحرف');
      }

      const { data, error } = await supabase
        .from('sales')
        .insert([sanitizedSale])
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

// Hook للمكاسب والخسائر
export const useProfitLoss = () => {
  const [profitLossData, setProfitLossData] = useState({
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    revenueByMonth: [] as Array<{ month: string; revenue: number; costs: number; profit: number; invoiceCount: number }>,
    topProducts: [] as Array<{ product: string; revenue: number; profit: number; sales: number }>,
    totalInvoices: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateProfitLoss = async () => {
    try {
      setLoading(true);
      
      // جلب الفواتير المدفوعة
      const { data: paidInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items(*,
            subscription:subscriptions(*,
              purchase:purchases!left(*),
              pricing_tier:pricing_tiers(*,
                product:products(*)
              )
            )
          ),
          subscription:subscriptions(*,
            purchase:purchases!left(*),
            pricing_tier:pricing_tiers(*,
              product:products(*)
            )
          )
        `)
        .eq('status', 'paid');

      if (invoicesError) throw invoicesError;


      // جلب جميع المبيعات النشطة
      const { data: activeSales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          purchase:purchases(*)
        `)
        .eq('status', 'active');

      if (salesError) throw salesError;
      let totalRevenue = 0;
      let totalCosts = 0;
      const monthlyData: { [key: string]: { revenue: number; costs: number } } = {};
      const productData: { [key: string]: { revenue: number; costs: number; sales: number; name: string } } = {};

      // حساب الإيرادات من الفواتير المدفوعة
      paidInvoices?.forEach(invoice => {
        const revenue = Number(invoice.total_amount || invoice.amount);
        if (isNaN(revenue) || revenue <= 0) return; // تجاهل الفواتير بدون مبلغ صحيح
        
        totalRevenue += revenue;

        // تجميع البيانات حسب الشهر
        const month = new Date(invoice.paid_date || invoice.issue_date).toLocaleDateString('ar-SA', { 
          year: 'numeric', 
          month: 'long' 
        });
        
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, costs: 0 };
        }
        monthlyData[month].revenue += revenue;

        // معالجة الفواتير الجديدة (مع invoice_items)
        if (invoice.invoice_items && invoice.invoice_items.length > 0) {
          invoice.invoice_items.forEach(item => {
            const subscription = item.subscription;
            const productName = subscription?.pricing_tier?.product?.name || 'غير محدد';
            
            if (!productData[productName]) {
              productData[productName] = { revenue: 0, costs: 0, sales: 0, name: productName };
            }
            productData[productName].revenue += Number(item.amount);
            productData[productName].sales += 1;

            // حساب التكلفة من المشتريات المرتبطة
            if (subscription?.purchase) {
              const purchase = subscription.purchase;
              if (purchase && purchase.purchase_price && purchase.max_users && purchase.max_users > 0) {
                const costPerUser = Number(purchase.purchase_price) / purchase.max_users;
                if (!isNaN(costPerUser) && costPerUser > 0) {
                  totalCosts += costPerUser;
                  monthlyData[month].costs += costPerUser;
                  productData[productName].costs += costPerUser;
                }
              }
            }
          });
        } 
        // معالجة الفواتير القديمة (بدون invoice_items)
        else if (invoice.subscription) {
          const productName = invoice.subscription?.pricing_tier?.product?.name || 'غير محدد';
          if (!productData[productName]) {
            productData[productName] = { revenue: 0, costs: 0, sales: 0, name: productName };
          }
          productData[productName].revenue += revenue;
          productData[productName].sales += 1;

          // حساب التكلفة من المشتريات المرتبطة
          if (invoice.subscription?.purchase) {
            const purchase = invoice.subscription.purchase;
            if (purchase && purchase.purchase_price && purchase.max_users && purchase.max_users > 0) {
              const costPerUser = Number(purchase.purchase_price) / purchase.max_users;
              if (!isNaN(costPerUser) && costPerUser > 0) {
                totalCosts += costPerUser;
                monthlyData[month].costs += costPerUser;
                productData[productName].costs += costPerUser;
              }
            }
          }
        }
      });

      // إضافة إيرادات وتكاليف المبيعات المباشرة
      activeSales?.forEach(sale => {
        const saleRevenue = Number(sale.sale_price);
        if (isNaN(saleRevenue) || saleRevenue <= 0) return; // تجاهل المبيعات بدون مبلغ صحيح
        
        const purchase = sale.purchase;
        
        if (purchase && purchase.purchase_price && purchase.max_users && purchase.max_users > 0) {
          const costPerUser = Number(purchase.purchase_price) / purchase.max_users;
          if (isNaN(costPerUser) || costPerUser <= 0) return; // تجاهل التكاليف غير الصحيحة
          
          const serviceName = purchase.service_name || 'خدمة غير محددة';
          
          // إضافة للإيرادات والتكاليف الإجمالية
          totalRevenue += saleRevenue;
          totalCosts += costPerUser;
          
          // تجميع البيانات حسب الشهر
          const month = new Date(sale.sale_date).toLocaleDateString('ar-SA', { 
            year: 'numeric', 
            month: 'long' 
          });
          
          if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, costs: 0 };
          }
          monthlyData[month].revenue += saleRevenue;
          monthlyData[month].costs += costPerUser;
          
          // تجميع البيانات حسب المنتج/الخدمة
          if (!productData[serviceName]) {
            productData[serviceName] = { revenue: 0, costs: 0, sales: 0, name: serviceName };
          }
          productData[serviceName].revenue += saleRevenue;
          productData[serviceName].costs += costPerUser;
          productData[serviceName].sales += 1;
        }
      });
      // حساب عدد الفواتير لكل شهر
      const monthlyInvoiceCount: { [key: string]: number } = {};
      
      // حساب عدد الفواتير من الفواتير المدفوعة
      paidInvoices?.forEach(invoice => {
        const month = new Date(invoice.paid_date || invoice.issue_date).toLocaleDateString('ar-SA', { 
          year: 'numeric', 
          month: 'long' 
        });
        
        if (!monthlyInvoiceCount[month]) {
          monthlyInvoiceCount[month] = 0;
        }
        monthlyInvoiceCount[month] += 1;
      });

      // حساب عدد المبيعات من المبيعات النشطة
      activeSales?.forEach(sale => {
        const month = new Date(sale.sale_date).toLocaleDateString('ar-SA', { 
          year: 'numeric', 
          month: 'long' 
        });
        
        if (!monthlyInvoiceCount[month]) {
          monthlyInvoiceCount[month] = 0;
        }
        monthlyInvoiceCount[month] += 1;
      });

      // تحويل البيانات الشهرية إلى مصفوفة
      const revenueByMonth = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        costs: data.costs,
        profit: data.revenue - data.costs,
        invoiceCount: monthlyInvoiceCount[month] || 0
      })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // تحويل بيانات المنتجات إلى مصفوفة وترتيبها
      const topProducts = Object.values(productData)
        .map(product => ({
          product: product.name,
          revenue: product.revenue,
          profit: product.revenue - product.costs,
          sales: product.sales
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);

      const netProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // حساب إجمالي عدد الفواتير والمبيعات
      const totalInvoices = (paidInvoices?.length || 0) + (activeSales?.length || 0);

      setProfitLossData({
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        revenueByMonth,
        topProducts,
        totalInvoices
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في حساب المكاسب والخسائر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateProfitLoss();
  }, []);

  return {
    profitLossData,
    loading,
    error,
    refetch: calculateProfitLoss
  };
};