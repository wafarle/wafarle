/*
  # إصلاح سياسات الصلاحيات المتكررة

  1. إزالة السياسات المسببة للتكرار اللانهائي
  2. إعادة إنشاء سياسات بسيطة وآمنة
  3. إصلاح المراجع الدائرية في جدول المستخدمين
*/

-- إزالة جميع السياسات الحالية من جدول المستخدمين
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- إزالة السياسات المسببة للمشاكل من الجداول الأخرى
DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
DROP POLICY IF EXISTS "Users can view own customer data" ON customers;
DROP POLICY IF EXISTS "Users can update own customer data" ON customers;

-- إعادة إنشاء سياسات بسيطة للمستخدمين
CREATE POLICY "Enable read access for authenticated users" ON users
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON users
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on auth_user_id" ON users
FOR UPDATE USING (auth.uid() = auth_user_id);

-- إعادة إنشاء سياسات بسيطة للعملاء
CREATE POLICY "Enable read access for all users" ON customers
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON customers
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON customers
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON customers
FOR DELETE USING (auth.role() = 'authenticated');

-- تبسيط سياسات الإشعارات
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications for all users" ON notifications;

CREATE POLICY "Enable all operations for authenticated users" ON notifications
FOR ALL USING (auth.role() = 'authenticated');

-- تبسيط سياسات إعدادات الإشعارات
DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can delete their own notification settings" ON notification_settings;

CREATE POLICY "Enable all operations for authenticated users" ON notification_settings
FOR ALL USING (auth.role() = 'authenticated');

-- تبسيط سياسات الشركاء التابعين
DROP POLICY IF EXISTS "Users can view their own affiliate profile" ON affiliates;
DROP POLICY IF EXISTS "Users can update their own affiliate profile" ON affiliates;
DROP POLICY IF EXISTS "Users can insert their own affiliate profile" ON affiliates;
DROP POLICY IF EXISTS "Users can view all affiliates" ON affiliates;
DROP POLICY IF EXISTS "Users can insert affiliate profiles" ON affiliates;

CREATE POLICY "Enable all operations for authenticated users" ON affiliates
FOR ALL USING (auth.role() = 'authenticated');

-- تبسيط سياسات المراجع التابعة
DROP POLICY IF EXISTS "Affiliates can view their own referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Users can insert referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Users can view all referrals" ON affiliate_referrals;

CREATE POLICY "Enable all operations for authenticated users" ON affiliate_referrals
FOR ALL USING (auth.role() = 'authenticated');

-- تبسيط سياسات العمولات التابعة
DROP POLICY IF EXISTS "Affiliates can view their own commissions" ON affiliate_commissions;
DROP POLICY IF EXISTS "Users can insert commissions" ON affiliate_commissions;
DROP POLICY IF EXISTS "Users can view all commissions" ON affiliate_commissions;

CREATE POLICY "Enable all operations for authenticated users" ON affiliate_commissions
FOR ALL USING (auth.role() = 'authenticated');