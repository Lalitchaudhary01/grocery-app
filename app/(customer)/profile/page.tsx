"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/ToastProvider";
import {
  CUSTOMER_PROFILE_EMAIL_STORAGE_KEY,
  DEFAULT_ADDRESS_ID_STORAGE_KEY,
} from "@/lib/customer-storage";

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

type CustomerMeResponse = {
  user?: {
    id: string;
    name: string | null;
    mobile: string | null;
    email?: string | null;
  };
  error?: string;
};

export default function CustomerProfilePage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultAddressId, setDefaultAddressId] = useState<string>("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccessToast, info: showInfoToast } = useToast();

  useEffect(() => {
    const savedDefault = localStorage.getItem(DEFAULT_ADDRESS_ID_STORAGE_KEY);
    if (savedDefault) setDefaultAddressId(savedDefault);
    const savedEmail = localStorage.getItem(CUSTOMER_PROFILE_EMAIL_STORAGE_KEY);
    if (savedEmail) setEmail(savedEmail);

    async function loadProfileData() {
      try {
        setLoading(true);
        setError(null);

        const [addressesRes, meRes] = await Promise.all([
          fetch("/api/profile/addresses", { cache: "no-store" }),
          fetch("/api/auth/customer-me", { cache: "no-store" }),
        ]);

        const addressesBody = (await addressesRes.json().catch(() => null)) as AddressResponse | null;
        const meBody = (await meRes.json().catch(() => null)) as CustomerMeResponse | null;

        if (!addressesRes.ok) {
          throw new Error(addressesBody?.error || "Failed to load profile.");
        }
        if (!meRes.ok) {
          throw new Error(meBody?.error || "Failed to load profile.");
        }

        setAddresses(Array.isArray(addressesBody?.addresses) ? addressesBody.addresses : []);
        setName(meBody?.user?.name?.trim() || "Customer");
        setMobile(meBody?.user?.mobile || "N/A");
        if (meBody?.user?.email) {
          setEmail(meBody.user.email);
          localStorage.setItem(CUSTOMER_PROFILE_EMAIL_STORAGE_KEY, meBody.user.email);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfileData();
  }, []);

  function setDefault(id: string) {
    setDefaultAddressId(id);
    localStorage.setItem(DEFAULT_ADDRESS_ID_STORAGE_KEY, id);
    showSuccessToast("Default address updated.");
  }

  function saveEmail() {
    try {
      setSavingEmail(true);
      setSavedMessage(null);
      const clean = email.trim();
      if (clean.length === 0) {
        localStorage.removeItem(CUSTOMER_PROFILE_EMAIL_STORAGE_KEY);
        setSavedMessage("Email removed.");
        showInfoToast("Email removed.");
        return;
      }
      localStorage.setItem(CUSTOMER_PROFILE_EMAIL_STORAGE_KEY, clean);
      setSavedMessage("Email saved.");
      showSuccessToast("Email saved.");
    } finally {
      setSavingEmail(false);
    }
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

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900">Account Details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Name</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">{name}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Phone</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">{mobile}</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold text-neutral-700">Email (optional)</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={saveEmail}
                disabled={savingEmail}
                className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {savingEmail ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Ye email optional hai. Abhi local profile preference me save hoti hai.
            </p>
            {savedMessage ? (
              <p className="mt-2 text-xs font-semibold text-green-700">{savedMessage}</p>
            ) : null}
          </div>
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
