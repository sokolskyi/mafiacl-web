/**
 * Режим онлайн-оплаты заказов магазина.
 *  - "gopay" — настоящая оплата картой через GoPay (подключим после оформления договора);
 *  - "demo"  — тестовая «оплата» одной кнопкой, чтобы проверить весь путь заказа без денег;
 *  - иначе   — онлайн-оплаты нет: заказ оплачивается на месте, сотрудник отмечает оплату.
 */
export type PaymentMode = "gopay" | "demo" | "none";

export function paymentMode(): PaymentMode {
  const v = process.env.SHOP_PAYMENT_MODE;
  return v === "gopay" || v === "demo" ? v : "none";
}
