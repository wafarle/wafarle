/*
  # إنشاء نظام المستخدمين والصلاحيات

  1. جدول المستخدمين
    - ربط مع auth.users
    - معلومات إضافية للمستخدمين
    - roles وصلاحيات

  2. أنواع الصلاحيات
    - admin: مدير النظام (وصول كامل)
    - user: مستخدم عادي (بوابة العملاء فقط)

  3. الأمان
    - RLS policies
    - حماية البيانات حسب الصلاحية
*/

-- إنشاء enum للصلاحيات
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    name text NOT NULL DEFAULT '',
    role user_role NOT NULL DEFAULT 'user',
    is_active boolean DEFAULT true,
    last_login timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- تفعيل RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
-- المستخدمون يمكنهم رؤية بياناتهم فقط
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

-- المدراء يمكنهم رؤية جميع المستخدمين
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- المستخدمون يمكنهم تحديث بياناتهم (ما عدا الصلاحية)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id)
    WITH CHECK (
        auth.uid() = auth_user_id 
        AND role = (SELECT role FROM users WHERE auth_user_id = auth.uid())
    );

-- المدراء يمكنهم تحديث جميع المستخدمين
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- المدراء فقط يمكنهم إنشاء مستخدمين جدد
CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        ) OR (
            -- السماح بإنشاء أول مستخدم (admin) إذا لم يوجد مستخدمين
            NOT EXISTS (SELECT 1 FROM users)
        )
    );

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- دالة للتحقق من صلاحية المستخدم
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS user_role AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result 
    FROM users 
    WHERE auth_user_id = user_id 
    AND is_active = true;
    
    RETURN COALESCE(user_role_result, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من كون المستخدم مدير
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE auth_user_id = user_id AND is_active = true) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء أول مدير (يجب تحديث البريد الإلكتروني)
INSERT INTO users (auth_user_id, email, name, role) 
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', email),
    'admin'
FROM auth.users 
WHERE email = 'admin@example.com' -- غيّر هذا إلى بريدك الإلكتروني
ON CONFLICT (auth_user_id) DO NOTHING;

-- تحديث سياسات جدول العملاء للمدراء فقط
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert for all users" ON customers;
DROP POLICY IF EXISTS "Enable update for all users" ON customers;
DROP POLICY IF EXISTS "Enable delete for all users" ON customers;

-- سياسات جديدة للعملاء (مدراء فقط)
CREATE POLICY "Admins can manage customers" ON customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- المستخدمون العاديون يمكنهم رؤية بياناتهم الشخصية فقط
CREATE POLICY "Users can view own customer data" ON customers
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- المستخدمون العاديون يمكنهم تحديث بياناتهم الشخصية
CREATE POLICY "Users can update own customer data" ON customers
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- trigger لإنشاء مستخدم تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (auth_user_id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        'user' -- المستخدمون الجدد يكونون users عاديين بشكل افتراضي
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تطبيق trigger على auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();