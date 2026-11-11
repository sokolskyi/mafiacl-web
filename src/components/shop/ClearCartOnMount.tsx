"use client";

import { useEffect } from "react";
import { clearCart } from "./cart-store";

/** После оформления заказа корзину очищаем. */
export function ClearCartOnMount() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
