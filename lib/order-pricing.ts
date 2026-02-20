export const FREE_DELIVERY_MIN_ORDER = 200;
export const DELIVERY_CHARGE_BELOW_THRESHOLD = 25;

export type OrderPriceBreakdown = {
  subtotal: number;
  deliveryCharge: number;
  total: number;
};

export function calculateDeliveryCharge(subtotal: number): number {
  if (subtotal >= FREE_DELIVERY_MIN_ORDER) {
    return 0;
  }
  return DELIVERY_CHARGE_BELOW_THRESHOLD;
}

export function calculateOrderPriceBreakdown(subtotal: number): OrderPriceBreakdown {
  const deliveryCharge = calculateDeliveryCharge(subtotal);
  return {
    subtotal,
    deliveryCharge,
    total: subtotal + deliveryCharge,
  };
}

