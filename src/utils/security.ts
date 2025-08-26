// دوال الأمان والحماية
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // إزالة HTML tags الأساسية
    .replace(/javascript:/gi, '') // إزالة JavaScript URLs
    .replace(/on\w+=/gi, ''); // إزالة event handlers
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

export const generateSecureId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const rateLimitCheck = (key: string, limit: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // الحصول على المحاولات السابقة من localStorage
  const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
  
  // تصفية المحاولات القديمة
  const recentAttempts = attempts.filter((timestamp: number) => timestamp > windowStart);
  
  if (recentAttempts.length >= limit) {
    return false; // تم تجاوز الحد المسموح
  }
  
  // إضافة المحاولة الحالية
  recentAttempts.push(now);
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(recentAttempts));
  
  return true; // مسموح
};

export const logSecurityEvent = (event: string, details: any = {}): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // في بيئة الإنتاج، يجب إرسال هذا إلى خدمة logging آمنة
  console.warn('Security Event:', logEntry);
};