import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (emailOrPhone: string, password: string, isPhone?: boolean) => Promise<{ error: any }>;
  signIn: (emailOrPhone: string, password: string, isPhone?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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
      // تنظيف رقم الهاتف
      const cleanPhone = emailOrPhone.replace(/[^0-9+]/g, '');
      let normalizedPhone = cleanPhone;
      
      // تحويل إلى التنسيق الموحد
      if (cleanPhone.startsWith('05')) {
        normalizedPhone = '+966' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('5')) {
        normalizedPhone = '+966' + cleanPhone;
      } else if (cleanPhone.startsWith('966') && !cleanPhone.startsWith('+')) {
        normalizedPhone = '+' + cleanPhone;
      }
      
      // استخدام رقم الهاتف كـ email مؤقت للمصادقة
      const { error } = await supabase.auth.signUp({
        email: `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.auth`,
        password,
        options: {
          data: {
            phone: normalizedPhone,
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
      // تنظيف رقم الهاتف
      const cleanPhone = emailOrPhone.replace(/[^0-9+]/g, '');
      let normalizedPhone = cleanPhone;
      
      // تحويل إلى التنسيق الموحد
      if (cleanPhone.startsWith('05')) {
        normalizedPhone = '+966' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('5')) {
        normalizedPhone = '+966' + cleanPhone;
      } else if (cleanPhone.startsWith('966') && !cleanPhone.startsWith('+')) {
        normalizedPhone = '+' + cleanPhone;
      }
      
      // استخدام الإيميل المؤقت للمصادقة
      const { error } = await supabase.auth.signInWithPassword({
        email: `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.auth`,
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

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};