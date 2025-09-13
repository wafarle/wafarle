import { useState, useEffect } from 'react';

export interface CartItem {
  product_id: string;
  pricing_tier_id: string;
  product_name: string;
  tier_name: string;
  price: number;
  duration_months: number;
  quantity: number;
}

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // تحميل السلة من localStorage عند تحميل الصفحة
  useEffect(() => {
    const savedCart = localStorage.getItem('subscription_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('خطأ في تحميل السلة:', error);
        localStorage.removeItem('subscription_cart');
      }
    }
  }, []);

  // حفظ السلة في localStorage عند التغيير
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('subscription_cart', JSON.stringify(newCart));
  };

  // إضافة منتج للسلة
  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    const existingItem = cart.find(cartItem => 
      cartItem.product_id === item.product_id && cartItem.pricing_tier_id === item.pricing_tier_id
    );

    let newCart;
    if (existingItem) {
      newCart = cart.map(cartItem => 
        cartItem.product_id === item.product_id && cartItem.pricing_tier_id === item.pricing_tier_id
          ? { ...cartItem, quantity: cartItem.quantity + quantity }
          : cartItem
      );
    } else {
      newCart = [...cart, { ...item, quantity }];
    }

    saveCart(newCart);
  };

  // إزالة منتج من السلة
  const removeFromCart = (productId: string, tierId: string) => {
    const newCart = cart.filter(item => 
      !(item.product_id === productId && item.pricing_tier_id === tierId)
    );
    saveCart(newCart);
  };

  // تحديث كمية المنتج
  const updateQuantity = (productId: string, tierId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, tierId);
      return;
    }

    const newCart = cart.map(item => 
      item.product_id === productId && item.pricing_tier_id === tierId
        ? { ...item, quantity }
        : item
    );
    saveCart(newCart);
  };

  // مسح السلة
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('subscription_cart');
  };

  // حساب الإجمالي
  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // حساب عدد المنتجات
  const getItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // التحقق من وجود منتج في السلة
  const isInCart = (productId: string, tierId: string) => {
    return cart.some(item => 
      item.product_id === productId && item.pricing_tier_id === tierId
    );
  };

  // الحصول على كمية منتج معين
  const getItemQuantity = (productId: string, tierId: string) => {
    const item = cart.find(cartItem => 
      cartItem.product_id === productId && cartItem.pricing_tier_id === tierId
    );
    return item ? item.quantity : 0;
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemsCount,
    isInCart,
    getItemQuantity
  };
};