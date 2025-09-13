import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// دالة توحيد رقم الهاتف
const normalizePhone = (phone: string): string => {
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // إنشاء عميل Supabase بصلاحيات إدارية
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // قراءة البيانات من الطلب
    const requestData = await req.json();
    const { customers } = requestData;

    if (!customers || !Array.isArray(customers)) {
      return new Response(
        JSON.stringify({ error: 'Invalid customers data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // معالجة كل عميل
    for (const customer of customers) {
      try {
        // التحقق من وجود رقم الهاتف
        if (!customer.phone) {
          results.push({
            customerId: customer.id,
            success: false,
            error: 'لا يوجد رقم هاتف'
          });
          continue;
        }

        // توحيد رقم الهاتف
        const normalizedPhone = normalizePhone(customer.phone);
        const phoneEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.auth`;

        console.log(`Creating account for customer ${customer.name} with phone ${normalizedPhone}`);

        // إنشاء حساب المصادقة
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: phoneEmail,
          password: '123456',
          email_confirm: true,
          user_metadata: {
            phone: normalizedPhone,
            auth_type: 'phone',
            customer_name: customer.name
          }
        });

        if (authError) {
          console.error('Auth error for customer', customer.name, authError);
          
          if (authError.message.includes('already registered')) {
            results.push({
              customerId: customer.id,
              success: false,
              error: 'رقم الهاتف مسجل مسبقاً'
            });
          } else {
            results.push({
              customerId: customer.id,
              success: false,
              error: authError.message
            });
          }
          continue;
        }

        // ربط العميل بحساب المصادقة
        const { error: linkError } = await supabaseAdmin
          .from('customers')
          .update({ 
            auth_user_id: authData.user.id,
            phone_auth: normalizedPhone
          })
          .eq('id', customer.id);

        if (linkError) {
          console.error('Link error for customer', customer.name, linkError);
          throw linkError;
        }

        console.log(`Successfully created account for customer ${customer.name}`);

        results.push({
          customerId: customer.id,
          success: true,
          phone: normalizedPhone,
          password: '123456'
        });

      } catch (customerError) {
        console.error('Error processing customer', customer.name, customerError);
        results.push({
          customerId: customer.id,
          success: false,
          error: customerError instanceof Error ? customerError.message : 'خطأ غير معروف'
        });
      }
    }

    console.log('Final results:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: results,
        summary: {
          total: customers.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('General error in create-customer-accounts:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'خطأ في الخادم',
        details: 'تحقق من logs Supabase للمزيد من التفاصيل'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});