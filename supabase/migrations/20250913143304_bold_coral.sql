/*
  # Remove automatic user creation trigger

  This migration removes any automatic triggers that create customer records
  when new users sign up, to prevent conflicts with client-side customer creation.
*/

-- إزالة أي trigger تلقائي ينشئ سجلات العملاء
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- التأكد من عدم وجود triggers أخرى قد تتسبب في الخطأ
DO $$
BEGIN
  -- إزالة أي triggers متعلقة بـ auth.users
  IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
  
  -- إزالة أي functions متعلقة
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') THEN
    DROP FUNCTION handle_new_user();
  END IF;
END $$;