// PayPal API Integration
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AUfS4VYq_LdTbHZvGmCtRumhpzRjsmkMX760IKrHoISf87UhgLND-UAA7aswSDXCDwXxFv0KqisHEpXc';
const PAYPAL_CLIENT_SECRET = import.meta.env.VITE_PAYPAL_CLIENT_SECRET || 'EFHZVuSn8Wy457NdjmqsaaDSMujhgsMekdFnQ_g2p-BwdOAEgov_DCebCJ9pD5K6GgcY1mrQUFOH6Gdb';
// استخدام production environment بدلاً من sandbox
const PAYPAL_BASE_URL = 'https://api-m.paypal.com'; // للإنتاج
// const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'; // للاختبار

export interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PayPalPaymentLink {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

// الحصول على Access Token
export const getPayPalAccessToken = async (): Promise<string> => {
  try {
    console.log('Getting PayPal access token from:', PAYPAL_BASE_URL);
    
    // التحقق من وجود بيانات الاعتماد
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials are missing');
    }
    
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    console.log('Auth header created, length:', auth.length);
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
      },
      body: 'grant_type=client_credentials'
    });

    console.log('PayPal Auth Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal Auth Error Response:', errorText);
      
      // معالجة أخطاء محددة
      if (response.status === 401) {
        throw new Error('بيانات PayPal غير صحيحة. يرجى التحقق من Client ID و Client Secret');
      } else if (response.status === 403) {
        throw new Error('حسابك PayPal غير مخول لهذه العملية');
      } else {
        throw new Error(`خطأ في PayPal: ${response.status} - ${errorText}`);
      }
    }

    const data: PayPalAccessToken = await response.json();
    console.log('Access token obtained successfully');
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw new Error(`فشل في الاتصال بـ PayPal: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
};

// إنشاء رابط دفع PayPal
export const createPayPalPaymentLink = async (
  amount: number,
  currency: string = 'USD',
  description: string = 'Invoice Payment',
  invoiceId: string
): Promise<string> => {
  try {
    console.log('Creating PayPal payment link for amount:', amount, currency);
    
    // التحقق من صحة المبلغ
    if (amount <= 0) {
      throw new Error('مبلغ الدفع يجب أن يكون أكبر من صفر');
    }
    
    const accessToken = await getPayPalAccessToken();
    
    const paymentData = {
      intent: 'CAPTURE',
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            brand_name: 'wafarle',
            locale: 'ar-SA',
            landing_page: 'LOGIN',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${window.location.origin}/#/payment-success`,
            cancel_url: `${window.location.origin}/#/store`
          }
        }
      },
      purchase_units: [{
        reference_id: invoiceId,
        description: description,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        }
      }]
    };

    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${invoiceId}-${Date.now()}`,
      },
      body: JSON.stringify(paymentData)
    });

    console.log('PayPal Order Response Status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal Order Error Response:', errorText);
      throw new Error(`فشل في إنشاء رابط الدفع: ${response.status} - ${errorText}`);
    }

    const data: PayPalPaymentLink = await response.json();
    console.log('PayPal Order Response:', JSON.stringify(data, null, 2));
    console.log('Available links:', data.links?.map(link => ({ rel: link.rel, href: link.href })));
    
    // البحث عن رابط الموافقة بطرق مختلفة
    const approvalLink = data.links?.find(link => 
      link.rel === 'approve' || 
      link.rel === 'payer-action' || 
      link.rel === 'checkout'
    );
    
    if (!approvalLink) {
      console.error('No approval link found in response. Available links:', data.links?.map(l => l.rel));
      
      // إنشاء رابط بديل باستخدام order ID
      if (data.id) {
        const fallbackLink = `https://www.paypal.com/checkoutnow?token=${data.id}`;
        console.log('Using fallback payment link:', fallbackLink);
        return fallbackLink;
      }
      
      throw new Error(`لم يتم العثور على رابط الدفع في استجابة PayPal. الروابط المتاحة: ${data.links?.map(l => l.rel).join(', ') || 'لا توجد روابط'}`);
    }

    console.log('Payment link created successfully:', approvalLink.href);
    return approvalLink.href;
  } catch (error) {
    console.error('Error creating PayPal payment link:', error);
    throw new Error(`فشل في إنشاء رابط الدفع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
};

// تحويل من ريال سعودي إلى دولار أمريكي
export const convertSARToUSD = (sarAmount: number): number => {
  const exchangeRate = 0.2667; // سعر الصرف الحالي (1 SAR = 0.2667 USD)
  return Math.round(sarAmount * exchangeRate * 100) / 100;
};
