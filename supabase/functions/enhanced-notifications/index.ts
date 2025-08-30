import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  action: 'create' | 'send_external' | 'schedule' | 'archive' | 'cleanup';
  type?: 'customer' | 'payment' | 'subscription' | 'system';
  data?: any;
  template_name?: string;
  variables?: Record<string, any>;
  schedule_config?: {
    schedule_type: 'once' | 'recurring' | 'cron';
    interval_minutes?: number;
    cron_expression?: string;
    start_date: string;
    end_date?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { action, type, data, template_name, variables, schedule_config }: NotificationRequest = await req.json()

    let result: any

    switch (action) {
      case 'create':
        result = await createNotification(supabase, type!, data!, template_name, variables)
        break
      
      case 'send_external':
        result = await sendExternalNotification(supabase, data!)
        break
      
      case 'schedule':
        result = await scheduleNotification(supabase, template_name!, variables!, schedule_config!)
        break
      
      case 'archive':
        result = await archiveOldNotifications(supabase)
        break
      
      case 'cleanup':
        result = await cleanupArchivedNotifications(supabase)
        break
      
      default:
        throw new Error(`إجراء غير معروف: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in enhanced notifications:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        action: 'unknown',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// إنشاء إشعار جديد
async function createNotification(
  supabase: any, 
  type: string, 
  data: any, 
  template_name?: string, 
  variables?: Record<string, any>
) {
  let notificationData: any = {}
  
  if (template_name) {
    // استخدام قالب موجود
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('name', template_name)
      .eq('is_active', true)
      .single()
    
    if (templateError) throw new Error(`خطأ في العثور على القالب: ${templateError.message}`)
    
    // تطبيق المتغيرات على القالب
    let title = template.title_template
    let message = template.message_template
    
    if (variables) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g')
        title = title.replace(regex, variables[key])
        message = message.replace(regex, variables[key])
      })
    }
    
    notificationData = {
      user_id: data.user_id || 'system',
      title,
      message,
      type: template.type,
      category: template.category,
      priority: template.priority,
      is_important: template.priority === 'urgent' || template.priority === 'high',
      action_url: data.action_url,
      action_text: data.action_text,
      scheduled_at: data.scheduled_at,
      expires_at: data.expires_at,
      metadata: data.metadata || {}
    }
  } else {
    // إنشاء إشعار مباشر
    notificationData = {
      user_id: data.user_id || 'system',
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      category: data.category || 'system',
      priority: data.priority || 'normal',
      is_important: data.is_important || false,
      action_url: data.action_url,
      action_text: data.action_text,
      scheduled_at: data.scheduled_at,
      expires_at: data.expires_at,
      metadata: data.metadata || {}
    }
  }
  
  // إنشاء الإشعار الأساسي
  const { data: notification, error: notificationError } = await supabase
    .from('enhanced_notifications')
    .insert(notificationData)
    .select()
    .single()
  
  if (notificationError) throw new Error(`خطأ في إنشاء الإشعار: ${notificationError.message}`)
  
  // إنشاء الإشعارات المتخصصة حسب النوع
  switch (type) {
    case 'customer':
      await createCustomerNotification(supabase, notification.id, data)
      break
    case 'payment':
      await createPaymentNotification(supabase, notification.id, data)
      break
    case 'subscription':
      await createSubscriptionNotification(supabase, notification.id, data)
      break
  }
  
  return { notification_id: notification.id, type }
}

// إنشاء إشعار العميل
async function createCustomerNotification(supabase: any, notificationId: string, data: any) {
  const customerData = {
    notification_id: notificationId,
    customer_id: data.customer_id,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone,
    subscription_type: data.subscription_type,
    subscription_value: data.subscription_value
  }
  
  const { error } = await supabase
    .from('customer_notifications')
    .insert(customerData)
  
  if (error) throw new Error(`خطأ في إنشاء إشعار العميل: ${error.message}`)
}

// إنشاء إشعار الدفع
async function createPaymentNotification(supabase: any, notificationId: string, data: any) {
  const paymentData = {
    notification_id: notificationId,
    payment_id: data.payment_id,
    amount: data.amount,
    currency: data.currency || 'SAR',
    payment_method: data.payment_method,
    failure_reason: data.failure_reason,
    retry_count: data.retry_count || 0,
    next_retry_at: data.next_retry_at
  }
  
  const { error } = await supabase
    .from('payment_notifications')
    .insert(paymentData)
  
  if (error) throw new Error(`خطأ في إنشاء إشعار الدفع: ${error.message}`)
}

// إنشاء إشعار الاشتراك
async function createSubscriptionNotification(supabase: any, notificationId: string, data: any) {
  const subscriptionData = {
    notification_id: notificationId,
    subscription_id: data.subscription_id,
    customer_id: data.customer_id,
    current_expiry_date: data.current_expiry_date,
    renewal_date: data.renewal_date,
    subscription_plan: data.subscription_plan,
    auto_renewal: data.auto_renewal || false
  }
  
  const { error } = await supabase
    .from('subscription_notifications')
    .insert(subscriptionData)
  
  if (error) throw new Error(`خطأ في إنشاء إشعار الاشتراك: ${error.message}`)
}

// إرسال إشعار خارجي
async function sendExternalNotification(supabase: any, data: any) {
  const externalData = {
    notification_id: data.notification_id,
    channel: data.channel,
    recipient: data.recipient,
    status: 'pending',
    external_provider: data.external_provider,
    metadata: data.metadata || {}
  }
  
  const { data: external, error } = await supabase
    .from('external_notifications')
    .insert(externalData)
    .select()
    .single()
  
  if (error) throw new Error(`خطأ في إنشاء الإشعار الخارجي: ${error.message}`)
  
  // هنا يمكن إضافة منطق إرسال الإشعار الفعلي
  // مثال: إرسال بريد إلكتروني، رسالة SMS، إشعار Push
  
  // تحديث الحالة إلى 'sent'
  await supabase
    .from('external_notifications')
    .update({ 
      status: 'sent', 
      sent_at: new Date().toISOString() 
    })
    .eq('id', external.id)
  
  return { external_id: external.id, channel: data.channel }
}

// جدولة إشعار
async function scheduleNotification(
  supabase: any, 
  template_name: string, 
  variables: Record<string, any>, 
  schedule_config: any
) {
  // إنشاء الإشعار المجدول
  const { data: notification, error: notificationError } = await supabase
    .from('enhanced_notifications')
    .insert({
      user_id: 'system',
      title: `إشعار مجدول: ${template_name}`,
      message: 'إشعار مجدول سيتم إرساله في الوقت المحدد',
      type: 'info',
      category: 'system',
      priority: 'normal',
      scheduled_at: schedule_config.start_date,
      metadata: { template_name, variables, schedule_config }
    })
    .select()
    .single()
  
  if (notificationError) throw new Error(`خطأ في إنشاء الإشعار المجدول: ${notificationError.message}`)
  
  // إنشاء الجدولة
  const scheduleData = {
    template_id: null, // سيتم تحديثه لاحقاً
    schedule_type: schedule_config.schedule_type,
    cron_expression: schedule_config.cron_expression,
    interval_minutes: schedule_config.interval_minutes,
    start_date: schedule_config.start_date,
    end_date: schedule_config.end_date,
    is_active: true,
    next_run: schedule_config.start_date
  }
  
  const { data: schedule, error: scheduleError } = await supabase
    .from('notification_schedules')
    .insert(scheduleData)
    .select()
    .single()
  
  if (scheduleError) throw new Error(`خطأ في إنشاء الجدولة: ${scheduleError.message}`)
  
  return { 
    notification_id: notification.id, 
    schedule_id: schedule.id,
    next_run: schedule.next_run 
  }
}

// أرشفة الإشعارات القديمة
async function archiveOldNotifications(supabase: any) {
  const { data, error } = await supabase.rpc('archive_old_notifications', { p_days_old: 90 })
  
  if (error) throw new Error(`خطأ في أرشفة الإشعارات: ${error.message}`)
  
  return { archived_count: data }
}

// تنظيف الأرشيف القديم
async function cleanupArchivedNotifications(supabase: any) {
  const { data, error } = await supabase.rpc('cleanup_old_archived_notifications', { p_retention_days: 365 })
  
  if (error) throw new Error(`خطأ في تنظيف الأرشيف: ${error.message}`)
  
  return { deleted_count: data }
}


