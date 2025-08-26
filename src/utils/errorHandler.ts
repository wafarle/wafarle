// معالج الأخطاء المركزي
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export const createError = (code: string, message: string, details?: any): AppError => {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  };
};

export const handleDatabaseError = (error: any): AppError => {
  // معالجة أخطاء Supabase المختلفة
  if (error.code === '23505') {
    return createError('DUPLICATE_ENTRY', 'البيانات موجودة مسبقاً', error);
  }
  
  if (error.code === '23503') {
    return createError('FOREIGN_KEY_VIOLATION', 'لا يمكن حذف هذا العنصر لأنه مرتبط ببيانات أخرى', error);
  }
  
  if (error.code === '42501') {
    return createError('PERMISSION_DENIED', 'ليس لديك صلاحية لتنفيذ هذا الإجراء', error);
  }
  
  if (error.message?.includes('JWT')) {
    return createError('AUTH_ERROR', 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى', error);
  }
  
  return createError('DATABASE_ERROR', 'حدث خطأ في قاعدة البيانات', error);
};

export const handleNetworkError = (error: any): AppError => {
  if (!navigator.onLine) {
    return createError('NETWORK_OFFLINE', 'لا يوجد اتصال بالإنترنت', error);
  }
  
  if (error.name === 'TimeoutError') {
    return createError('NETWORK_TIMEOUT', 'انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى', error);
  }
  
  return createError('NETWORK_ERROR', 'خطأ في الاتصال بالخادم', error);
};

export const logError = (error: AppError): void => {
  // في بيئة الإنتاج، يجب إرسال الأخطاء إلى خدمة monitoring
  console.error('Application Error:', error);
  
  // يمكن إضافة إرسال إلى خدمات مثل Sentry أو LogRocket
};

export const showUserFriendlyError = (error: AppError): void => {
  // عرض رسالة خطأ مناسبة للمستخدم
  alert(error.message);
  logError(error);
};