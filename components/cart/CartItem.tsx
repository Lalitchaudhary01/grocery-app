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

export function CartItem({ item, onIncrease, onDecrease, onRemove }: CartItemProps) {
  const lineTotal = item.product.price * item.quantity;

  return (
    <article className="flex gap-4 border-b border-neutral-200 p-4 last:border-b-0 sm:gap-5 sm:p-6">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#edf3e6] sm:h-24 sm:w-24">
        <Image
          src={item.product.imageUrl || FALLBACK_IMAGE}
          alt={item.product.name}
          fill
          sizes="(max-width: 640px) 80px, 96px"
          className="object-cover p-2"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 text-lg font-extrabold text-neutral-900">
            {item.product.name}
          </h2>
          <p className="shrink-0 text-2xl font-extrabold text-green-700">
            ₹{lineTotal}
          </p>
        </div>
        <p className="mt-1 text-xl font-semibold text-neutral-400">
          ₹{item.product.price}/pack
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="inline-flex items-center gap-3 rounded-xl">
            <button
              type="button"
              onClick={() => onDecrease(item.product.id)}
              className="h-11 w-11 rounded-xl border border-neutral-300 bg-white text-2xl font-bold leading-none text-neutral-700 transition hover:bg-neutral-100"
            >
              -
            </button>
            <span className="min-w-7 text-center text-2xl font-extrabold text-neutral-900">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onIncrease(item.product.id)}
              className="h-11 w-11 rounded-xl border-2 border-green-600 bg-white text-2xl font-bold leading-none text-green-700 transition hover:bg-green-50"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.product.id)}
            className="ml-auto text-2xl text-neutral-500 transition hover:text-red-600"
            aria-label={`Remove ${item.product.name}`}
            title="Remove item"
          >
            🗑
          </button>
        </div>
      </div>
    </article>
  );
}
