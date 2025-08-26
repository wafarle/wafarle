export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_name: string;
  duration_months: number;
  monthly_price: number;
  total_price: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface Invoice {
  id: string;
  subscription_id: string;
  customer_id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  issue_date: string;
  due_date: string;
  paid_date?: string;
  created_at: string;
  updated_at: string;
  subscription?: Subscription;
  customer?: Customer;
}

export interface DashboardStats {
  total_customers: number;
  active_subscriptions: number;
  total_revenue: number;
  pending_invoices: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  pricing_tiers: PricingTier[];
  is_popular?: boolean;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface PricingTier {
  id: string;
  product_id: string;
  name: string;
  duration_months: number;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  features: string[];
  is_recommended?: boolean;
}