// PayPal API Integration
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = import.meta.env.VITE_PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'; // للاختبار
// const PAYPAL_BASE_URL = 'https://api-m.paypal.com'; // للإنتاج

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
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`PayPal Auth Error: ${response.status}`);
    }

    const data: PayPalAccessToken = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw error;
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
    const accessToken = await getPayPalAccessToken();
    
    const paymentData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: invoiceId,
        description: description,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        }
      }],
      application_context: {
        brand_name: 'wafarle',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        payment_method: {
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          payer_selected: 'PAYPAL'
        },
        shipping_preference: 'NO_SHIPPING',
        return_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`
      }
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error(`PayPal Payment Error: ${response.status}`);
    }

    const data: PayPalPaymentLink = await response.json();
    const approvalLink = data.links.find(link => link.rel === 'approve');
    
    if (!approvalLink) {
      throw new Error('No approval link found in PayPal response');
    }

    return approvalLink.href;
  } catch (error) {
    console.error('Error creating PayPal payment link:', error);
    throw error;
  }
};

// تحويل من ريال سعودي إلى دولار أمريكي
export const convertSARToUSD = (sarAmount: number): number => {
  const exchangeRate = 0.27; // سعر الصرف التقريبي (يجب تحديثه من API حقيقي)
  return Math.round(sarAmount * exchangeRate * 100) / 100;
};

// إنشاء رسالة دفع مع رابط PayPal
export const generatePaymentMessage = async (
  customerName: string,
  invoiceNumber: string,
  amountSAR: number,
  invoiceId: string
): Promise<string> => {
  try {
    const amountUSD = convertSARToUSD(amountSAR);
    const paypalLink = await createPayPalPaymentLink(
      amountUSD,
      'USD',
      `Invoice #${invoiceNumber} - wafarle`,
      invoiceId
    );

    return `مرحباً ${customerName}،

نأمل أن تكون بخير. نود تذكيرك بفاتورة رقم #${invoiceNumber} بمبلغ ${amountSAR.toFixed(2)} ريال سعودي (${amountUSD.toFixed(2)} دولار أمريكي).

يمكنك الدفع بالفيزا أو الماستركارد عبر الرابط التالي:
${paypalLink}

💳 الدفع المباشر بالفيزا/ماستركارد
🔒 آمن ومحمي 100% عبر PayPal
⚡ لا تحتاج إنشاء حساب PayPal
🌍 يقبل جميع البطاقات الائتمانية العالمية

شكراً لك على ثقتك بنا.

مع أطيب التحيات،
فريق wafarle
📧 team@wafarle.com
📱 +966123456789`;
  } catch (error) {
    console.error('Error generating payment message:', error);
    // في حالة فشل PayPal API، استخدم الرابط البديل
    const fallbackLink = `https://www.paypal.com/ncp/payment/PAYPAL-CHECKOUT-SANDBOX`;
    
    return `مرحباً ${customerName}،

نأمل أن تكون بخير. نود تذكيرك بفاتورة رقم #${invoiceNumber} بمبلغ ${amountSAR.toFixed(2)} ريال سعودي.

يمكنك الدفع بالفيزا عبر الرابط التالي:
${fallbackLink}

💳 دفع مباشر بالفيزا/ماستركارد
🔒 آمن ومحمي

شكراً لك على ثقتك بنا.

مع أطيب التحيات،
فريق wafarle`;
  }
};