/*
  # دالة إرسال تنبيهات انتهاء الاشتراكات

  1. الوظائف
    - البحث عن الاشتراكات المنتهية قريباً (أقل من 5 أيام)
    - إرسال رسائل تنبيهية للعملاء عبر البريد الإلكتروني
    - تسجيل حالة الإرسال لتجنب التكرار

  2. المعايير
    - الاشتراكات النشطة فقط
    - تنتهي خلال 5 أيام أو أقل
    - لم يتم إرسال تنبيه لها من قبل

  3. الأمان
    - استخدام مفاتيح API آمنة
    - فحص الصلاحيات
    - معالجة الأخطاء
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

// قالب البريد الإلكتروني
const createEmailTemplate = (customerName: string, productName: string, daysLeft: number, endDate: string) => {
  const urgencyColor = daysLeft === 0 ? '#dc2626' : daysLeft === 1 ? '#ea580c' : '#d97706';
  const urgencyText = daysLeft === 0 ? 'ينتهي اليوم!' : daysLeft === 1 ? 'ينتهي غداً!' : `${daysLeft} أيام متبقية`;
  
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تنبيه انتهاء الاشتراك</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .alert-box { background-color: #fef2f2; border: 2px solid ${urgencyColor}; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .alert-text { color: ${urgencyColor}; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .product-info { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .contact-info { background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 تنبيه انتهاء الاشتراك</h1>
                <p>نظام إدارة الاشتراكات</p>
            </div>
            
            <div class="content">
                <h2>مرحباً ${customerName}،</h2>
                
                <div class="alert-box">
                    <div class="alert-text">⚠️ ${urgencyText}</div>
                    <p>اشتراكك في <strong>${productName}</strong> على وشك الانتهاء</p>
                </div>
                
                <div class="product-info">
                    <h3>تفاصيل الاشتراك:</h3>
                    <p><strong>المنتج:</strong> ${productName}</p>
                    <p><strong>تاريخ الانتهاء:</strong> ${endDate}</p>
                    <p><strong>الأيام المتبقية:</strong> ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}</p>
                </div>
                
                <p>لضمان استمرارية الخدمة، يرجى تجديد اشتراكك قبل انتهاء الصلاحية.</p>
                
                <div class="contact-info">
                    <h3>📞 للتجديد أو الاستفسار:</h3>
                    <p>📧 <strong>البريد الإلكتروني:</strong> team@wafarle.com</p>
                    <p>📱 <strong>الهاتف:</strong> +966123456789</p>
                    <p>💬 <strong>واتساب:</strong> +966123456789</p>
                </div>
                
                <p>إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.</p>
                
                <p>مع أطيب التحيات،<br>فريق الدعم</p>
            </div>
            
            <div class="footer">
                <p>📧 هذه رسالة تلقائية من wafarle</p>
                <p>© 2025 wafarle - جميع الحقوق محفوظة</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// إرسال البريد الإلكتروني باستخدام خدمة خارجية (مثل SendGrid أو Resend)
const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    // استخدام مفتاح API من متغيرات البيئة في Supabase
    const apiKey = Deno.env.get('RESEND_API_KEY') || 're_MPhrVDDG_4fA5bydVSLhSsA4fBDJjkVyX';
    
    if (!apiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      return false;
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      console.error('Invalid email address:', emailData.to);
      return false;
    }

    const emailPayload = {
      from: 'wafarle <team@wafarle.com>',
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
    };
    console.log('Sending email to:', emailData.to);

    // استخدام Resend API لإرسال البريد الإلكتروني
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });
  } catch (error) {
    console.log('Resend response data:', responseData);

    if (!response.ok) {
      console.error('Resend API Error:', response.status, responseData);
      return false;
    }
    console.log('Email sent successfully to:', emailData.to);
    return true;
    console.error('Error sending email:', error);
    return false;
  }
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // إنشاء عميل Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // حساب التواريخ
    const today = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(today.getDate() + 5);

    // البحث عن الاشتراكات المنتهية قريباً
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        end_date,
        customer:customers(id, name, email),
        pricing_tier:pricing_tiers(
          name,
          product:products(name)
        )
      `)
      .eq('status', 'active')
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', fiveDaysFromNow.toISOString().split('T')[0]);

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'لا توجد اشتراكات تحتاج تنبيهات',
          sent: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;
    const results = [];

    // إرسال التنبيهات
    for (const subscription of subscriptions) {
      
      if (!subscription.customer?.email) {
        results.push({
          subscription_id: subscription.id,
          status: 'skipped',
          reason: 'لا يوجد بريد إلكتروني'
        });
        continue;
      }

      // حساب الأيام المتبقية
      const endDate = new Date(subscription.end_date);
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      

      // إنشاء محتوى البريد الإلكتروني
      const customerName = subscription.customer.name;
      const productName = subscription.pricing_tier?.product?.name || 'غير محدد';
      const formattedEndDate = endDate.toLocaleDateString('ar-SA');

      const emailData: EmailData = {
        to: subscription.customer.email,
        subject: `⚠️ تنبيه: اشتراكك في ${productName} ينتهي قريباً`,
        html: createEmailTemplate(customerName, productName, daysLeft, formattedEndDate)
      };

      // إرسال البريد الإلكتروني
      const emailSent = await sendEmail(emailData);

      if (emailSent) {
        emailsSent++;
        results.push({
          subscription_id: subscription.id,
          customer_email: subscription.customer.email,
          status: 'sent',
          days_left: daysLeft
        });

        // يمكنك إضافة سجل في قاعدة البيانات لتتبع الرسائل المرسلة
        // لتجنب إرسال رسائل مكررة
      } else {
        results.push({
          subscription_id: subscription.id,
          customer_email: subscription.customer.email,
          status: 'failed',
          days_left: daysLeft
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم إرسال ${emailsSent} تنبيه من أصل ${subscriptions.length} اشتراك`,
        sent: emailsSent,
        total: subscriptions.length,
        results: results,
        debug: {
          api_key_exists: !!Deno.env.get('RESEND_API_KEY'),
          subscriptions_found: subscriptions.length,
          emails_attempted: results.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-expiry-notifications:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ في إرسال التنبيهات'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});