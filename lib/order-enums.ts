export const ORDER_STATUS_VALUES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export const PAYMENT_STATUS_VALUES = [
  "PENDING_VERIFICATION",
  "VERIFIED",
  "FAILED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value);
}
