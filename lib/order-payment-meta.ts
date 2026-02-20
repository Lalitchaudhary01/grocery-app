export type OrderPaymentMeta = {
  subtotalAmount: number;
  deliveryCharge: number;
  finalAmount: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function parseOrderPaymentMeta(paymentNote: string | null | undefined): OrderPaymentMeta | null {
  if (!paymentNote) return null;
  try {
    const parsed: unknown = JSON.parse(paymentNote);
    if (!parsed || typeof parsed !== "object") return null;

    const payload = parsed as Record<string, unknown>;
    const subtotalAmount = toNumber(payload.subtotalAmount);
    const deliveryCharge = toNumber(payload.deliveryCharge);
    const finalAmount = toNumber(payload.finalAmount);

    if (subtotalAmount === null || deliveryCharge === null || finalAmount === null) {
      return null;
    }

    return {
      subtotalAmount,
      deliveryCharge,
      finalAmount,
    };
  } catch {
    return null;
  }
}

