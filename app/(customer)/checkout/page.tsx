"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type CartProduct = {
  id: string;
  name: string;
  price: number;
};

type CartItem = {
  product: CartProduct;
  quantity: number;
};
type CreateOrderResponse = {
  order?: {
    id: string;
  };
  error?: string;
};

const CART_STORAGE_KEY = "customer_cart";
const ORDER_IDS_STORAGE_KEY = "customer_order_ids";
const DELIVERY_ADDRESS_STORAGE_KEY = "customer_delivery_address_v2";
const SHOP_UPI_ID = "8445646300@ybl";

type DeliveryAddressForm = {
  street: string;
  phone: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressForm>({
    street: "",
    phone: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState(false);

  useEffect(() => {
    setItems(readCart());
    const savedAddress = localStorage.getItem(DELIVERY_ADDRESS_STORAGE_KEY);
    if (savedAddress) {
      try {
        const parsed = JSON.parse(savedAddress) as Partial<DeliveryAddressForm>;
        setDeliveryAddress((previous) => ({
          street: parsed.street ?? previous.street,
          phone: parsed.phone ?? previous.phone,
          city: parsed.city ?? previous.city,
          state: parsed.state ?? previous.state,
          postalCode: parsed.postalCode ?? previous.postalCode,
          country: parsed.country ?? previous.country,
        }));
      } catch {
        // no-op
      }
    }
    setLoading(false);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );

  function validateAddress(): {
    street: string;
    phone: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null {
    const street = deliveryAddress.street.trim();
    const phone = deliveryAddress.phone.trim();
    const city = deliveryAddress.city.trim();
    const state = deliveryAddress.state.trim();
    const postalCode = deliveryAddress.postalCode.trim();
    const country = (deliveryAddress.country.trim() || "India").slice(0, 80);

    if (street.length < 5) {
      setError("Please enter house/street details.");
      return null;
    }
    if (city.length < 2 || state.length < 2) {
      setError("Please enter valid city and state.");
      return null;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10 digit phone number.");
      return null;
    }
    if (!/^\d{6}$/.test(postalCode)) {
      setError("Please enter a valid 6 digit pincode.");
      return null;
    }

    return { street, phone, city, state, postalCode, country };
  }

  function proceedToPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Cart is empty.");
      return;
    }
    const valid = validateAddress();
    if (!valid) return;
    localStorage.setItem(DELIVERY_ADDRESS_STORAGE_KEY, JSON.stringify(valid));
    setPaymentStep(true);
  }

  async function submitOrderAfterPayment() {
    setError(null);
    if (items.length === 0) {
      setError("Cart is empty.");
      return;
    }

    const valid = validateAddress();
    if (!valid) return;

    try {
      setSubmitting(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryAddress: {
            ...valid,
          },
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Order failed.");
      }

      const body = (await response.json()) as CreateOrderResponse;
      const orderId = body.order?.id;
      if (!orderId) {
        throw new Error("Order created but id missing.");
      }

      const existingRaw = localStorage.getItem(ORDER_IDS_STORAGE_KEY);
      let existingIds: string[] = [];
      if (existingRaw) {
        try {
          const parsed: unknown = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) {
            existingIds = parsed.filter((id): id is string => typeof id === "string");
          }
        } catch {
          existingIds = [];
        }
      }
      const nextIds = [orderId, ...existingIds.filter((id) => id !== orderId)].slice(0, 10);
      localStorage.setItem(ORDER_IDS_STORAGE_KEY, JSON.stringify(nextIds));
      localStorage.setItem(DELIVERY_ADDRESS_STORAGE_KEY, JSON.stringify(valid));

      localStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new Event("storage"));
      router.push(`/success?orderId=${orderId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Order failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <h1 className="mb-5 text-xl font-bold text-neutral-900 sm:text-2xl">Checkout</h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={proceedToPayment}
          className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
            You are logged in. Order will be placed using your account.
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">House / Street</label>
            <input
              value={deliveryAddress.street}
              onChange={(event) =>
                setDeliveryAddress((previous) => ({
                  ...previous,
                  street: event.target.value,
                }))
              }
              placeholder="House no., street, area, landmark..."
              disabled={submitting || loading}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-green-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Phone</label>
              <input
                value={deliveryAddress.phone}
                onChange={(event) =>
                  setDeliveryAddress((previous) => ({
                    ...previous,
                    phone: event.target.value.replace(/[^\d]/g, "").slice(0, 10),
                  }))
                }
                inputMode="numeric"
                maxLength={10}
                disabled={submitting || loading}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">City</label>
              <input
                value={deliveryAddress.city}
                onChange={(event) =>
                  setDeliveryAddress((previous) => ({
                    ...previous,
                    city: event.target.value,
                  }))
                }
                disabled={submitting || loading}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">State</label>
              <input
                value={deliveryAddress.state}
                onChange={(event) =>
                  setDeliveryAddress((previous) => ({
                    ...previous,
                    state: event.target.value,
                  }))
                }
                disabled={submitting || loading}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Pincode</label>
              <input
                value={deliveryAddress.postalCode}
                onChange={(event) =>
                  setDeliveryAddress((previous) => ({
                    ...previous,
                    postalCode: event.target.value.replace(/[^\d]/g, "").slice(0, 6),
                  }))
                }
                inputMode="numeric"
                maxLength={6}
                disabled={submitting || loading}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">Country</label>
              <input
                value={deliveryAddress.country}
                onChange={(event) =>
                  setDeliveryAddress((previous) => ({
                    ...previous,
                    country: event.target.value,
                  }))
                }
                disabled={submitting || loading}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!paymentStep ? (
            <Button
              type="submit"
              className="w-full"
              disabled={loading || submitting || items.length === 0}
            >
              Proceed to Payment
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-semibold text-green-900">Pay using PhonePe / UPI QR</p>
              <p className="text-sm text-neutral-700">
                UPI ID: <span className="font-bold text-green-800">{SHOP_UPI_ID}</span>
              </p>
              <p className="text-sm text-neutral-700">
                Amount to pay: <span className="font-bold text-green-800">{formatINR(total)}</span>
              </p>
              <div className="rounded-lg border border-dashed border-green-400 bg-white p-3 text-center text-sm text-neutral-600">
                QR image abhi add karni hai. फिलहाल UPI ID pe payment karein.
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => void submitOrderAfterPayment()}
                  disabled={submitting}
                >
                  {submitting ? "Confirming..." : "Payment Ho Gaya"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentStep(false)}
                  disabled={submitting}
                >
                  Address Edit
                </Button>
              </div>
              <p className="text-xs text-neutral-600">
                Order payment admin verification ke baad confirm hoga.
              </p>
            </div>
          )}
        </form>

        <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Order Summary</h2>
          {loading ? (
            <p className="mt-3 text-sm text-neutral-600">Loading...</p>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-600">No items in cart.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{items.reduce((count, item) => count + item.quantity, 0)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-neutral-900">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
