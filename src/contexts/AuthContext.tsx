import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// دالة مساعدة لتوحيد تنسيق رقم الهاتف - متاحة للتصدير
export const normalizePhone = (phone: string): string => {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  
  if (cleanPhone.startsWith('+966')) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('966')) {
    return '+' + cleanPhone;
  } else if (cleanPhone.startsWith('05')) {
    return '+966' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('5')) {
    return '+966' + cleanPhone;
  }
  
  return '+966' + cleanPhone;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  userType: 'admin' | 'customer' | 'unknown';
  signUp: (emailOrPhone: string, password: string, isPhone?: boolean) => Promise<{ error: any }>;
  signIn: (emailOrPhone: string, password: string, isPhone?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'admin' | 'customer' | 'unknown'>('unknown');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        determineUserType(session.user);
      } else {
        setUserType('unknown');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // تحديد نوع المستخدم بناءً على URL وبيانات المصادقة
  const determineUserType = async (user: User) => {
    const currentPath = window.location.pathname;
    
    // إذا كان في صفحة الإدارة، فهو مدير
    if (currentPath.startsWith('/admin')) {
      // التحقق من أن المستخدم مدير فعلاً
      if (user.email) {
        // البحث في جدول المستخدمين
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('email', user.email)
          .maybeSingle();
        
        if (userData?.role === 'admin') {
          setUserType('admin');
        } else {
          // ليس مدير، تسجيل خروج
          await signOut();
        }
      } else {
        // لا يوجد بريد إلكتروني، ليس مدير
        await signOut();
      }
    } else {
      // في صفحة العملاء
      if (user.phone || user.user_metadata?.phone) {
        setUserType('customer');
      } else if (user.email) {
        // التحقق إذا كان عميل مسجل بالبريد
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (customerData) {
          setUserType('customer');
        } else {
          // ليس عميل، تسجيل خروج
          await signOut();
        }
      } else {
        await signOut();
      }
    }
  };
  const signUp = async (emailOrPhone: string, password: string, isPhone: boolean = false) => {
    if (isPhone) {
      const normalizedPhone = normalizePhone(emailOrPhone);
      
      // استخدام رقم الهاتف مباشرة للمصادقة
      const { error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: {
          data: {
            auth_type: 'phone'
          }
        }
      });
      return { error };
    } else {
      // المصادقة العادية بالبريد الإلكتروني
      const { error } = await supabase.auth.signUp({
        email: emailOrPhone,
        password,
      });
      return { error };
    }
  };

  const signIn = async (emailOrPhone: string, password: string, isPhone: boolean = false) => {
    if (isPhone) {
      const normalizedPhone = normalizePhone(emailOrPhone);
      
      // استخدام رقم الهاتف مباشرة للمصادقة
      const { error } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password,
      });
      return { error };
    } else {
      // المصادقة العادية بالبريد الإلكتروني
      const { error } = await supabase.auth.signInWithPassword({
        email: emailOrPhone,
        password,
      });
      return { error };
    }
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setUserType('unknown');
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      return { error };
    } catch (err) {
      return { error: err };
    }
  };
  const value = {
    user,
    session,
    loading,
    isAdmin: userType === 'admin',
    isCustomer: userType === 'customer',
    userType,
    signUp,
    signIn,
    signOut,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};