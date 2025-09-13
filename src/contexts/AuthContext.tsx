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
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    signUp,
    signIn,
    signOut,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};