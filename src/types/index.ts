export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
  subscriptions?: Subscription[];
  invoices?: Invoice[];
  sales?: Sale[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  features: string[];
  icon: string;
  color: string;
  is_popular: boolean;
  max_users: number;
  current_users: number;
  available_slots: number;
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
  is_recommended: boolean;
  product?: Product;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  pricing_tier_id: string;
  purchase_id?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
  customer?: Customer;
  pricing_tier?: PricingTier;
  purchase?: Purchase;
}

export interface Invoice {
  id: string;
  subscription_id: string;
  customer_id: string;
  amount: number;
  total_amount?: number;
  status: 'paid' | 'pending' | 'overdue';
  issue_date: string;
  due_date: string;
  paid_date?: string;
  created_at: string;
  updated_at: string;
  subscription?: Subscription;
  customer?: Customer;
  invoice_items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  subscription_id: string;
  amount: number;
  description: string;
  created_at: string;
  subscription?: Subscription;
}

export interface DashboardStats {
  total_customers: number;
  active_subscriptions: number;
  total_revenue: number;
  pending_invoices: number;
}

export interface Purchase {
  id: string;
  product_id?: string;
  service_name: string;
  account_details: string;
  purchase_price: number;
  purchase_date: string;
  max_users: number;
  current_users: number;
  status: 'active' | 'full' | 'expired' | 'cancelled';
  notes: string;
  sale_price_per_user: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  sales?: Sale[];
}

export interface Sale {
  id: string;
  purchase_id: string;
  customer_id: string;
  sale_price: number;
  sale_date: string;
  status: 'active' | 'expired' | 'cancelled';
  access_details: string;
  created_at: string;
  updated_at: string;
  purchase?: Purchase;
  customer?: Customer;
}

// أنواع البيانات الجديدة للإشعارات
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'invoice' | 'subscription' | 'customer' | 'system' | 'payment';
  is_read: boolean;
  is_important: boolean;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  invoice_overdue_days: number;
  subscription_expiry_days: number;
  payment_failed: boolean;
  new_customer: boolean;
  subscription_renewal: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title_template: string;
  message_template: string;
  type: 'invoice' | 'subscription' | 'customer' | 'system' | 'payment';
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRequest {
  id: string;
  customer_id: string;
  pricing_tier_id: string;
  status: 'pending' | 'approved' | 'activated' | 'rejected';
  preferred_start_date: string;
  notes?: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  pricing_tier?: PricingTier;
}