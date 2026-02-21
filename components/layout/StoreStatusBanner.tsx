"use client";

import { useEffect, useState } from "react";

type StoreSettings = {
  isOpen: boolean;
  nextOpenAt: string | null;
  message: string | null;
};

export function StoreStatusBanner() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

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

  if (!settings || settings.isOpen) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:px-6">
      <p className="font-semibold">
        Store abhi closed hai.
        {settings.nextOpenAt
          ? ` Next delivery slot: ${new Date(settings.nextOpenAt).toLocaleString("en-IN")}`
          : ""}
      </p>
      {settings.message ? <p className="text-xs">{settings.message}</p> : null}
    </div>
  );
}

