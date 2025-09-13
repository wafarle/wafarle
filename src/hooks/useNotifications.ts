import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Notification, NotificationSettings, NotificationTemplate } from '../types';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب الإشعارات
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // التحقق من إعدادات Supabase أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('إعدادات Supabase غير مكتملة. يرجى التحقق من ملف .env');
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') {
          // جدول غير موجود - إدراج بيانات تجريبية
          const mockNotifications = [
            {
              id: '1',
              user_id: 'system',
              title: 'مرحباً بك في النظام',
              message: 'تم تسجيل دخولك بنجاح إلى نظام إدارة الاشتراكات',
              type: 'success' as const,
              category: 'system' as const,
              is_read: false,
              is_important: false,
              action_url: undefined,
              action_text: undefined,
              expires_at: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '2',
              user_id: 'system',
              title: 'تحديث النظام',
              message: 'تم تحديث النظام إلى الإصدار الجديد',
              type: 'info' as const,
              category: 'system' as const,
              is_read: false,
              is_important: false,
              action_url: undefined,
              action_text: undefined,
              expires_at: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          setNotifications(mockNotifications);
          setUnreadCount(2);
          return;
        }
        throw error;
      }
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      let errorMessage = 'حدث خطأ في تحميل الإشعارات';
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'لا يمكن الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت أو إعدادات Supabase';
        } else if (err.message.includes('Supabase')) {
          errorMessage = 'خطأ في إعدادات قاعدة البيانات. يرجى التحقق من ملف .env';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
      // إدراج بيانات تجريبية في حالة الخطأ
      const mockNotifications = [
        {
          id: '1',
          user_id: 'system',
          title: 'نظام الإشعارات غير متصل',
          message: 'لا يمكن تحميل الإشعارات من قاعدة البيانات. يرجى التحقق من الاتصال.',
          type: 'warning' as const,
          category: 'system' as const,
          is_read: false,
          is_important: true,
          action_url: undefined,
          action_text: undefined,
          expires_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setNotifications(mockNotifications);
      setUnreadCount(1);
    } finally {
      setLoading(false);
    }
  };

  // تحديث حالة القراءة
  const markAsRead = async (id: string) => {
    try {
      // التحقق من الاتصال أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, updating locally only');
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error('Supabase error in markAsRead:', error);
        // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      }

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('خطأ في تحديث حالة القراءة:', err);
      // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // تحديث جميع الإشعارات كمقروءة
  const markAllAsRead = async () => {
    try {
      // التحقق من الاتصال أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, updating locally only');
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('Supabase error in markAllAsRead:', error);
        // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('خطأ في تحديث جميع الإشعارات:', err);
      // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  // حذف إشعار
  const deleteNotification = async (id: string) => {
    try {
      // التحقق من الاتصال أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, deleting locally only');
        const deletedNotification = notifications.find(n => n.id === id);
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(n => n.id !== id));
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error in deleteNotification:', error);
        // في حالة الخطأ، نقوم بالحذف محلياً فقط
      }

      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('خطأ في حذف الإشعار:', err);
      // في حالة الخطأ، نقوم بالحذف محلياً فقط
      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // إنشاء إشعار جديد
  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // التحقق من الاتصال أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, creating notification locally only');
        const mockNotification: Notification = {
          id: Date.now().toString(),
          ...notification,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setNotifications(prev => [mockNotification, ...prev]);
        if (!mockNotification.is_read) {
          setUnreadCount(prev => prev + 1);
        }
        
        return { success: false, error: 'تم إنشاء الإشعار محلياً فقط - Supabase غير متصل' };
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) {
        console.error('Supabase error in createNotification:', error);
        // في حالة الخطأ، نقوم بإنشاء الإشعار محلياً فقط
        const mockNotification: Notification = {
          id: Date.now().toString(),
          ...notification,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setNotifications(prev => [mockNotification, ...prev]);
        if (!mockNotification.is_read) {
          setUnreadCount(prev => prev + 1);
        }
        
        return { success: false, error: 'تم إنشاء الإشعار محلياً فقط' };
      }

      setNotifications(prev => [data, ...prev]);
      if (!data.is_read) {
        setUnreadCount(prev => prev + 1);
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error in createNotification:', err);
      const message = err instanceof Error ? err.message : 'حدث خطأ في إنشاء الإشعار';
      setError(message);
      
      // في حالة الخطأ، نقوم بإنشاء الإشعار محلياً فقط
      const mockNotification: Notification = {
        id: Date.now().toString(),
        ...notification,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setNotifications(prev => [mockNotification, ...prev]);
      if (!mockNotification.is_read) {
        setUnreadCount(prev => prev + 1);
      }
      
      return { success: false, error: message };
    }
  };

  // جلب إعدادات الإشعارات
  const fetchNotificationSettings = async (userId: string) => {
    try {
      // التحقق من الاتصال أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return { success: false, error: 'Supabase غير متصل' };
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'حدث خطأ في جلب الإعدادات' };
    }
  };

  // تحديث إعدادات الإشعارات
  const updateNotificationSettings = async (userId: string, settings: Partial<NotificationSettings>) => {
    try {
      // التحقق من الاتصال أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return { success: false, error: 'Supabase غير متصل' };
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert([{ user_id: userId, ...settings }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث الإعدادات';
      return { success: false, error: message };
    }
  };

  // إنشاء إشعارات تلقائية
  const createAutomaticNotifications = async () => {
    try {
      // التحقق من الاتصال أولاً
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, skipping automatic notifications');
        return;
      }

          type: 'success' as const,
          category: 'system' as const,
          is_read: false,
          is_important: false,
          action_url: undefined,
          action_text: undefined,
          expires_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setNotifications(mockNotifications);
      setUnreadCount(1);
    } finally {
      setLoading(false);
    }
  };

  // تحديث حالة القراءة
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error('Supabase error in markAsRead:', error);
        // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      }

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('خطأ في تحديث حالة القراءة:', err);
      // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // تحديث جميع الإشعارات كمقروءة
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('Supabase error in markAllAsRead:', error);
        // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('خطأ في تحديث جميع الإشعارات:', err);
      // في حالة الخطأ، نقوم بالتحديث محلياً فقط
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  // حذف إشعار
  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error in deleteNotification:', error);
        // في حالة الخطأ، نقوم بالحذف محلياً فقط
      }

      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('خطأ في حذف الإشعار:', err);
      // في حالة الخطأ، نقوم بالحذف محلياً فقط
      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // إنشاء إشعار جديد
  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) {
        console.error('Supabase error in createNotification:', error);
        // في حالة الخطأ، نقوم بإنشاء الإشعار محلياً فقط
        const mockNotification: Notification = {
          id: Date.now().toString(),
          ...notification,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setNotifications(prev => [mockNotification, ...prev]);
        if (!mockNotification.is_read) {
          setUnreadCount(prev => prev + 1);
        }
        
        return { success: false, error: 'تم إنشاء الإشعار محلياً فقط' };
      }

      setNotifications(prev => [data, ...prev]);
      if (!data.is_read) {
        setUnreadCount(prev => prev + 1);
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error in createNotification:', err);
      const message = err instanceof Error ? err.message : 'حدث خطأ في إنشاء الإشعار';
      setError(message);
      
      // في حالة الخطأ، نقوم بإنشاء الإشعار محلياً فقط
      const mockNotification: Notification = {
        id: Date.now().toString(),
        ...notification,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setNotifications(prev => [mockNotification, ...prev]);
      if (!mockNotification.is_read) {
        setUnreadCount(prev => prev + 1);
      }
      
      return { success: false, error: message };
    }
  };

  // جلب إعدادات الإشعارات
  const fetchNotificationSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'حدث خطأ في جلب الإعدادات' };
    }
  };

  // تحديث إعدادات الإشعارات
  const updateNotificationSettings = async (userId: string, settings: Partial<NotificationSettings>) => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .upsert([{ user_id: userId, ...settings }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تحديث الإعدادات';
      return { success: false, error: message };
    }
  };

  // إنشاء إشعارات تلقائية
  const createAutomaticNotifications = async () => {
    try {
      // إشعارات الفواتير المتأخرة
      const { data: overdueInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, customer:customers(name, email)')
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString().split('T')[0]);

      if (invoiceError) {
        console.error('Error fetching overdue invoices:', invoiceError);
      } else if (overdueInvoices && overdueInvoices.length > 0) {
        for (const invoice of overdueInvoices) {
          await createNotification({
            user_id: 'system',
            title: 'فاتورة متأخرة',
            message: `الفاتورة رقم ${invoice.id} للعميل ${invoice.customer?.name} متأخرة عن موعد الاستحقاق`,
            type: 'warning',
            category: 'invoice',
            is_read: false,
            is_important: true,
            action_url: `/invoices/${invoice.id}`,
            action_text: 'عرض الفاتورة'
          });
        }
      }

      // إشعارات انتهاء الاشتراكات
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiringSubscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*, customer:customers(name, email), pricing_tier:pricing_tiers(name)')
        .eq('status', 'active')
        .lt('end_date', thirtyDaysFromNow.toISOString().split('T')[0]);

      if (subscriptionError) {
        console.error('Error fetching expiring subscriptions:', subscriptionError);
      } else if (expiringSubscriptions && expiringSubscriptions.length > 0) {
        for (const subscription of expiringSubscriptions) {
          const daysUntilExpiry = Math.ceil(
            (new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          await createNotification({
            user_id: 'system',
            title: 'اشتراك منتهي قريباً',
            message: `اشتراك العميل ${subscription.customer?.name} في ${subscription.pricing_tier?.name} سينتهي خلال ${daysUntilExpiry} يوم`,
            type: 'warning',
            category: 'subscription',
            is_read: false,
            is_important: true,
            action_url: `/subscriptions/${subscription.id}`,
            action_text: 'عرض الاشتراك'
          });
        }
      }
    } catch (err) {
      console.error('خطأ في إنشاء الإشعارات التلقائية:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // إنشاء الإشعارات التلقائية كل ساعة (فقط إذا كان Supabase متصل)
    const interval = setInterval(() => {
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        createAutomaticNotifications();
      }
    }, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    fetchNotificationSettings,
    updateNotificationSettings,
    createAutomaticNotifications
  };
};
    } catch (err) {
      console.error('خطأ في إنشاء الإشعارات التلقائية:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // إنشاء الإشعارات التلقائية كل ساعة
    const interval = setInterval(createAutomaticNotifications, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    fetchNotificationSettings,
    updateNotificationSettings,
    createAutomaticNotifications
  };
};
