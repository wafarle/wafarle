// دوال التحقق من صحة البيانات
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
  return phoneRegex.test(phone.trim());
};

export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return { isValid: false, message: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم' };
  }
  
  return { isValid: true, message: '' };
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const validatePrice = (price: number): boolean => {
  return !isNaN(price) && price >= 0;
};

export const validatePositiveInteger = (num: number): boolean => {
  return Number.isInteger(num) && num > 0;
};

export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date >= new Date('2020-01-01');
};

export const validatePercentage = (percentage: number): boolean => {
  return !isNaN(percentage) && percentage >= 0 && percentage <= 100;
};