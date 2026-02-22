"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/ToastProvider";

type StoreSettings = {
  isOpen: boolean;
  nextOpenAt: string | null;
  message: string | null;
};

export function StoreToggleCard() {
  const [settings, setSettings] = useState<StoreSettings>({
    isOpen: true,
    nextOpenAt: null,
    message: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/store/settings", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { settings?: StoreSettings };
        if (body.settings) setSettings(body.settings);
      } catch {
        // no-op
      }
    }
    void load();
  }, []);

  async function toggleStoreMode() {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch("/api/store/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          isOpen: !settings.isOpen,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; settings?: StoreSettings }
        | null;
      if (!response.ok) {
        throw new Error(body?.error || "Failed to toggle store mode.");
      }
      if (body?.settings) setSettings(body.settings);
      else setSettings((prev) => ({ ...prev, isOpen: !prev.isOpen }));
      showSuccessToast("Store mode updated.");
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to toggle store mode.";
      setError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">Store Mode</h3>
          <p
            className={`mt-1 text-sm font-semibold ${
              settings.isOpen ? "text-green-700" : "text-red-600"
            }`}
          >
            {settings.isOpen ? "Store Open" : "Store Closed"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleStoreMode()}
          disabled={saving}
          className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            settings.isOpen
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-700 hover:bg-green-800"
          }`}
        >
          {saving
            ? "Updating..."
            : settings.isOpen
              ? "Toggle: Close Store"
              : "Toggle: Open Store"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </section>
  );
}
