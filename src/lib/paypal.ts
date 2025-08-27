// PayPal API Integration
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AV3FKMldjC6Yce3b-L3aajkZV6PA1LgnhddWs8X_plO0YTmwUy8nf6zgb82Ejf5p81UBwbMJgpZGExBQ';
const PAYPAL_CLIENT_SECRET = import.meta.env.VITE_PAYPAL_CLIENT_SECRET || 'EJnEh8mWtlPuweQsOaQNlTW3i0VulGghdR6RNRl2CldUN3s694N9YjttrS9ZQ6nsyv9m6q8wv_QEzZgC';
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
    console.log('Getting PayPal access token...');
    console.log('Client ID:', PAYPAL_CLIENT_ID ? 'Present' : 'Missing');
    console.log('Client Secret:', PAYPAL_CLIENT_SECRET ? 'Present' : 'Missing');
    
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    console.log('PayPal Auth Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal Auth Error Response:', errorText);
      throw new Error(`PayPal Auth Error: ${response.status}`);
    }

    const data: PayPalAccessToken = await response.json();
    console.log('Access token obtained successfully');
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
    console.log('Creating PayPal payment link for amount:', amount, currency);
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
        payment_method: 'paypal',
        shipping_preference: 'NO_SHIPPING',
        return_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`
      }
    };

    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    console.log('PayPal Order Response Status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal Order Error Response:', errorText);
      throw new Error(`PayPal Payment Error: ${response.status}`);
    }

    const data: PayPalPaymentLink = await response.json();
    console.log('PayPal Order Response:', data);
    
    const approvalLink = data.links.find(link => link.rel === 'approve');
    
    if (!approvalLink) {
      console.error('No approval link found in response:', data);
      throw new Error('No approval link found in PayPal response');
    }

    console.log('Payment link created successfully:', approvalLink.href);
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
    console.log('Generating payment message for:', customerName, invoiceNumber, amountSAR);
    const amountUSD = convertSARToUSD(amountSAR);
    console.log('Converted amount:', amountSAR, 'SAR to', amountUSD, 'USD');
    
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
    
    // في حالة فشل PayPal API، استخدم رابط بديل مع معلومات الدفع
    const amountUSD = convertSARToUSD(amountSAR);
    const fallbackLink = `https://www.paypal.com/paypalme/wafarle/${amountUSD.toFixed(2)}USD`;
    
    return `مرحباً ${customerName}،

نأمل أن تكون بخير. نود تذكيرك بفاتورة رقم #${invoiceNumber} بمبلغ ${amountSAR.toFixed(2)} ريال سعودي.

يمكنك الدفع بالفيزا أو PayPal عبر الرابط التالي:
${fallbackLink}

💳 دفع مباشر بالفيزا/ماستركارد
🔒 آمن ومحمي

شكراً لك على ثقتك بنا.

مع أطيب التحيات،
فريق wafarle`;
  }
};