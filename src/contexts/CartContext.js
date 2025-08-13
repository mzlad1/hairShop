import React, { createContext, useContext, useState, useEffect } from "react";

// سياق لإدارة عربة التسوق عبر صفحات الموقع
const CartContext = createContext();

// مزود السياق
export function CartProvider({ children }) {
  // Load cart from localStorage on initialization
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem("beautyCart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Save to localStorage whenever cartItems changes
  useEffect(() => {
    localStorage.setItem("beautyCart", JSON.stringify(cartItems));
  }, [cartItems]);

  // إضافة عنصر إلى العربة
  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);

      if (existingItem) {
        // If item exists, increment quantity
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // If item doesn't exist, add new item with quantity 1
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  // إزالة عنصر من العربة
  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  // تحديث كمية عنصر
  const updateQuantity = (productId, quantity) => {
    setCartItems((prev) => {
      const updated = prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      return updated;
    });
  };

  // إفراغ العربة
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("beautyCart");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// خطاف لاستخدام سياق العربة بسهولة
export function useCart() {
  return useContext(CartContext);
}
