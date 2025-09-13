import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { customers } = await req.json()

    if (!customers || !Array.isArray(customers)) {
      return new Response(
        JSON.stringify({ error: 'Invalid customers data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const customer of customers) {
      try {
        if (!customer.phone) {
          results.push({
            customerId: customer.id,
            success: false,
            error: 'لا يوجد رقم هاتف'
          })
          continue
        }

        // تنظيف وتوحيد رقم الهاتف
        const cleanPhone = customer.phone.replace(/[^0-9+]/g, '')
        let normalizedPhone = cleanPhone

        if (cleanPhone.startsWith('05')) {
          normalizedPhone = '+966' + cleanPhone.substring(1)
        } else if (cleanPhone.startsWith('5')) {
          normalizedPhone = '+966' + cleanPhone
        } else if (cleanPhone.startsWith('966') && !cleanPhone.startsWith('+')) {
          normalizedPhone = '+' + cleanPhone
        } else if (cleanPhone.startsWith('+966')) {
          normalizedPhone = cleanPhone
        }

        // إنشاء حساب المصادقة
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.auth`,
          password: '123456',
          email_confirm: true,
          user_metadata: {
            phone: normalizedPhone,
            auth_type: 'phone',
            customer_name: customer.name
          }
        })

        if (authError) {
          if (authError.message.includes('already registered')) {
            results.push({
              customerId: customer.id,
              success: false,
              error: 'رقم الهاتف مسجل مسبقاً'
            })
            continue
          }
          throw authError
        }

        // ربط العميل بحساب المصادقة
        const { error: linkError } = await supabaseAdmin
          .from('customers')
          .update({ 
            auth_user_id: authData.user.id,
            phone_auth: normalizedPhone
          })
          .eq('id', customer.id)

        if (linkError) throw linkError

        results.push({
          customerId: customer.id,
          success: true,
          phone: customer.phone,
          password: '123456'
        })

      } catch (error) {
        results.push({
          customerId: customer.id,
          success: false,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'خطأ في الخادم' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})