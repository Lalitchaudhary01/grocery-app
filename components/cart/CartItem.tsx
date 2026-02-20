"use client";

import Image from "next/image";

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

export interface CartLineItem {
  product: CartProduct;
  quantity: number;
}

interface CartItemProps {
  item: CartLineItem;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1584473457493-17c4f1f64e5d?auto=format&fit=crop&w=1200&q=80";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function CartItem({ item, onIncrease, onDecrease, onRemove }: CartItemProps) {
  const lineTotal = item.product.price * item.quantity;

  return (
    <article className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        <Image
          src={item.product.imageUrl || FALLBACK_IMAGE}
          alt={item.product.name}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-sm font-semibold text-neutral-900">
          {item.product.name}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {formatPrice(item.product.price)} each
        </p>
        <p className="mt-1 text-sm font-bold text-green-700">
          {formatPrice(lineTotal)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onDecrease(item.product.id)}
            className="h-7 w-7 rounded-lg bg-green-50 text-sm font-bold text-green-700 transition hover:bg-green-100"
          >
            -
          </button>
          <span className="min-w-8 text-center text-sm font-medium text-neutral-900">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onIncrease(item.product.id)}
            className="h-7 w-7 rounded-lg bg-green-50 text-sm font-bold text-green-700 transition hover:bg-green-100"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.product.id)}
            className="ml-auto rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
