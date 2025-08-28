import { supabase } from './supabase';

// أنواع البيانات للاستجابة
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// نقاط النهاية API
export class ApiService {
  private static async validateApiKey(apiKey: string): Promise<boolean> {
    // في الإنتاج، تحقق من مفتاح API في قاعدة البيانات
    // هنا نستخدم مفتاح تجريبي للعرض
    return apiKey === 'demo_key_123456' || apiKey.startsWith('live_key_');
  }

  private static async handleRequest<T>(
    apiKey: string,
    requestFn: () => Promise<T>
  ): Promise<ApiResponse<T>> {
    try {
      // التحقق من مفتاح API
      if (!await this.validateApiKey(apiKey)) {
        return {
          success: false,
          error: 'مفتاح API غير صحيح',
          message: 'يرجى التأكد من مفتاح API الخاص بك'
        };
      }

      const data = await requestFn();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: 'حدث خطأ في الخادم',
        message: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  // جلب العملاء
  static async getCustomers(
    apiKey: string,
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: 'subscribed' | 'not_subscribed';
    } = {}
  ): Promise<ApiResponse<any[]>> {
    return this.handleRequest(apiKey, async () => {
      const { limit = 50, offset = 0, search, status } = options;
      
      let query = supabase
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
          )
        `)
        .range(offset, offset + limit - 1);

      // تطبيق الفلاتر
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (status === 'subscribed') {
        query = query.not('subscriptions', 'is', null);
      } else if (status === 'not_subscribed') {
        query = query.is('subscriptions', null);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // تنسيق البيانات للاستجابة
      const formattedData = data?.map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        subscriptions_count: customer.subscriptions?.length || 0,
        total_paid: customer.invoices?.reduce((sum, inv) => 
          sum + Number(inv.total_amount || inv.amount), 0) || 0,
        status: customer.subscriptions && customer.subscriptions.length > 0 ? 'subscribed' : 'not_subscribed',
        subscriptions: customer.subscriptions?.map(sub => ({
          id: sub.id,
          product_name: sub.pricing_tier?.product?.name,
          status: sub.status,
          start_date: sub.start_date,
          end_date: sub.end_date,
          amount: sub.final_price || sub.pricing_tier?.price
        })) || []
      })) || [];

      return formattedData;
    });
  }

  // جلب الاشتراكات
  static async getSubscriptions(
    apiKey: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'active' | 'expired' | 'cancelled';
      customer_id?: string;
      product_id?: string;
    } = {}
  ): Promise<ApiResponse<any[]>> {
    return this.handleRequest(apiKey, async () => {
      const { limit = 50, offset = 0, status, customer_id, product_id } = options;
      
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          customer:customers (
            id,
            name,
            email,
            phone
          ),
          pricing_tier:pricing_tiers (
            *,
            product:products (
              id,
              name,
              category,
              icon,
              color
            )
          ),
          purchase:purchases (
            service_name,
            purchase_price,
            max_users
          )
        `)
        .range(offset, offset + limit - 1);

      // تطبيق الفلاتر
      if (status) {
        query = query.eq('status', status);
      }
      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }
      if (product_id) {
        query = query.eq('product_id', product_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // تنسيق البيانات للاستجابة
      const formattedData = data?.map(subscription => ({
        id: subscription.id,
        customer: {
          id: subscription.customer?.id,
          name: subscription.customer?.name,
          email: subscription.customer?.email,
          phone: subscription.customer?.phone
        },
        product: {
          id: subscription.pricing_tier?.product?.id,
          name: subscription.pricing_tier?.product?.name,
          category: subscription.pricing_tier?.product?.category
        },
        pricing_tier: {
          id: subscription.pricing_tier?.id,
          name: subscription.pricing_tier?.name,
          price: subscription.pricing_tier?.price,
          duration_months: subscription.pricing_tier?.duration_months
        },
        duration_months: subscription.duration_months,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        status: subscription.status,
        custom_price: subscription.custom_price,
        discount_percentage: subscription.discount_percentage,
        final_price: subscription.final_price,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at
      })) || [];

      return formattedData;
    });
  }

  // جلب الفواتير
  static async getInvoices(
    apiKey: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'paid' | 'pending' | 'overdue';
      customer_id?: string;
      date_from?: string;
      date_to?: string;
    } = {}
  ): Promise<ApiResponse<any[]>> {
    return this.handleRequest(apiKey, async () => {
      const { limit = 50, offset = 0, status, customer_id, date_from, date_to } = options;
      
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers (
            id,
            name,
            email,
            phone
          ),
          subscription:subscriptions (
            *,
            pricing_tier:pricing_tiers (
              *,
              product:products (
                name,
                category
              )
            )
          ),
          invoice_items (
            *,
            subscription:subscriptions (
              *,
              pricing_tier:pricing_tiers (
                *,
                product:products (
                  name,
                  category
                )
              )
            )
          )
        `)
        .range(offset, offset + limit - 1);

      // تطبيق الفلاتر
      if (status) {
        query = query.eq('status', status);
      }
      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }
      if (date_from) {
        query = query.gte('issue_date', date_from);
      }
      if (date_to) {
        query = query.lte('issue_date', date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // تنسيق البيانات للاستجابة
      const formattedData = data?.map(invoice => ({
        id: invoice.id,
        invoice_number: `#${invoice.id.slice(-8)}`,
        customer: {
          id: invoice.customer?.id,
          name: invoice.customer?.name,
          email: invoice.customer?.email,
          phone: invoice.customer?.phone
        },
        amount: Number(invoice.total_amount || invoice.amount),
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        paid_date: invoice.paid_date,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at,
        items: invoice.invoice_items?.map(item => ({
          id: item.id,
          subscription: {
            id: item.subscription?.id,
            product_name: item.subscription?.pricing_tier?.product?.name,
            category: item.subscription?.pricing_tier?.product?.category
          },
          amount: Number(item.amount),
          description: item.description
        })) || [],
        subscription: invoice.subscription ? {
          id: invoice.subscription.id,
          product_name: invoice.subscription.pricing_tier?.product?.name,
          category: invoice.subscription.pricing_tier?.product?.category
        } : null
      })) || [];

      return formattedData;
    });
  }

  // جلب المنتجات
  static async getProducts(
    apiKey: string,
    options: {
      limit?: number;
      offset?: number;
      category?: string;
      available?: boolean;
    } = {}
  ): Promise<ApiResponse<any[]>> {
    return this.handleRequest(apiKey, async () => {
      const { limit = 50, offset = 0, category, available } = options;
      
      let query = supabase
        .from('products')
        .select('*')
        .range(offset, offset + limit - 1);

      // تطبيق الفلاتر
      if (category) {
        query = query.eq('category', category);
      }
      if (available !== undefined) {
        if (available) {
          query = query.gt('available_slots', 0);
        } else {
          query = query.eq('available_slots', 0);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // تنسيق البيانات للاستجابة
      const formattedData = data?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        features: product.features?.filter((f: string) => f.trim()) || [],
        icon: product.icon,
        color: product.color,
        is_popular: product.is_popular,
        max_users: product.max_users,
        available_slots: product.available_slots,
        created_at: product.created_at,
        updated_at: product.updated_at
      })) || [];

      return formattedData;
    });
  }

  // جلب التحليلات
  static async getAnalytics(
    apiKey: string,
    options: {
      period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
      date_from?: string;
      date_to?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    return this.handleRequest(apiKey, async () => {
      const { period = 'monthly', date_from, date_to } = options;
      
      // حساب الإحصائيات الأساسية
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const { count: totalSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: totalInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      // حساب الإيرادات
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, amount, status')
        .eq('status', 'paid');

      const totalRevenue = invoices?.reduce((sum, inv) => 
        sum + Number(inv.total_amount || inv.amount), 0) || 0;

      // حساب الاشتراكات النشطة
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // حساب النمو الشهري (محاكاة)
      const monthlyGrowth = Math.random() * 20 - 5; // نمو عشوائي بين -5% و +15%

      return {
        total_customers: totalCustomers || 0,
        total_subscriptions: totalSubscriptions || 0,
        total_invoices: totalInvoices || 0,
        total_revenue: totalRevenue,
        active_subscriptions: activeSubscriptions || 0,
        monthly_growth: parseFloat(monthlyGrowth.toFixed(1)),
        period,
        date_range: {
          from: date_from || new Date().toISOString().split('T')[0],
          to: date_to || new Date().toISOString().split('T')[0]
        }
      };
    });
  }
}

// تصدير الخدمة
export default ApiService;
