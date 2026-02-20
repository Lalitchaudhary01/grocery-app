"use client";

import { useEffect, useState } from "react";

import { DEFAULT_ADDRESS_ID_STORAGE_KEY } from "@/lib/customer-storage";

type Address = {
  id: string;
  street: string;
  phone: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt: string;
};

type AddressResponse = {
  addresses?: Address[];
  error?: string;
};

export default function CustomerProfilePage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultAddressId, setDefaultAddressId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedDefault = localStorage.getItem(DEFAULT_ADDRESS_ID_STORAGE_KEY);
    if (savedDefault) setDefaultAddressId(savedDefault);

    async function loadAddresses() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/profile/addresses", { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as AddressResponse | null;
        if (!response.ok) {
          throw new Error(body?.error || "Failed to load profile.");
        }
        setAddresses(Array.isArray(body?.addresses) ? body.addresses : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadAddresses();
  }, []);

  function setDefault(id: string) {
    setDefaultAddressId(id);
    localStorage.setItem(DEFAULT_ADDRESS_ID_STORAGE_KEY, id);
  }

  return (
    <div className="bg-neutral-100 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-extrabold text-neutral-900">My Profile</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Saved addresses checkout me auto-fill ke liye use honge.
          </p>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900">Saved Addresses</h2>
          {loading ? (
            <p className="mt-3 text-sm text-neutral-600">Loading...</p>
          ) : addresses.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-600">
              Koi saved address nahi hai. Pehla order place karoge to address save ho jayega.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-900">
                      {address.street}, {address.city}, {address.state}, {address.postalCode},{" "}
                      {address.country}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDefault(address.id)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        defaultAddressId === address.id
                          ? "bg-green-700 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {defaultAddressId === address.id ? "Default" : "Set Default"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Phone: {address.phone || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

