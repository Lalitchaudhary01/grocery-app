"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  title?: string;
  variant: ToastVariant;
};

type ShowToastInput = {
  message: string;
  title?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function variantClasses(variant: ToastVariant): string {
  if (variant === "success") {
    return "border-green-200 bg-green-50 text-green-800";
  }
  if (variant === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((input: ShowToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const nextToast: Toast = {
      id,
      message: input.message,
      title: input.title,
      variant: input.variant ?? "info",
    };

    setToasts((previous) => [...previous, nextToast].slice(-5));

    const durationMs = input.durationMs ?? 2500;
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, durationMs);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message: string, title?: string) =>
        showToast({ message, title, variant: "success" }),
      error: (message: string, title?: string) =>
        showToast({ message, title, variant: "error" }),
      info: (message: string, title?: string) =>
        showToast({ message, title, variant: "info" }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:top-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-3 py-2 shadow-sm ${variantClasses(toast.variant)}`}
          >
            {toast.title ? (
              <p className="text-xs font-semibold uppercase tracking-wide">{toast.title}</p>
            ) : null}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}
