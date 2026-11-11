"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image?: string;
  variant?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, variant?: string) => void;
  updateQuantity: (productId: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  tax: number;
  itemCount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.08;
const CART_KEY = "wallv-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }, [items, isLoading]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const key = `${item.productId}-${item.variant || ""}`;
      const existing = prev.find((i) => `${i.productId}-${i.variant || ""}` === key);
      if (existing) {
        return prev.map((i) =>
          `${i.productId}-${i.variant || ""}` === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string, variant?: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && (i.variant || "") === (variant || ""))));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variant?: string) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => !(i.productId === productId && (i.variant || "") === (variant || ""))));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && (i.variant || "") === (variant || "")
          ? { ...i, quantity }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((sum, i) => sum + (i.salePrice || i.price) * i.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, tax, total, itemCount, isLoading }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
