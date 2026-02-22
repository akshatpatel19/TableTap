'use client';

import React, { createContext, useContext, useState } from 'react';

export interface SelectedAddOn {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  selectedAddOns?: SelectedAddOn[];
}

export interface OrderContextType {
  cafeId: string;
  tableId: number | null;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (menuItemId: string) => void;
  updateCartItemQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{
  children: React.ReactNode;
  cafeId: string;
  tableId: number;
}> = ({ children, cafeId, tableId }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCart((prevCart) => {
      // For items with add-ons, always add as a new item (don't combine)
      if (item.selectedAddOns && item.selectedAddOns.length > 0) {
        return [...prevCart, item];
      }
      
      // For items without add-ons, combine with existing items
      const existingItem = prevCart.find((i) => i.menuItemId === item.menuItemId && (!i.selectedAddOns || i.selectedAddOns.length === 0));
      if (existingItem) {
        return prevCart.map((i) =>
          i.menuItemId === item.menuItemId && (!i.selectedAddOns || i.selectedAddOns.length === 0)
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prevCart, item];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prevCart) => prevCart.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateCartItemQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <OrderContext.Provider
      value={{
        cafeId,
        tableId,
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within OrderProvider');
  }
  return context;
};
