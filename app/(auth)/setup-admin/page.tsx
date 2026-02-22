"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

export default function SetupAdminPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [seedKey, setSeedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          seedKey: seedKey.trim(),
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Setup failed.");
      }

      const message = body?.message || "Initial admin created successfully.";
      setSuccess(message);
      showSuccessToast(message);
      router.replace("/login");
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Setup failed.";
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-neutral-900">Initial Admin Setup</h1>
        <p className="mt-1 text-sm text-neutral-600">
          One-time admin registration using seed key.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Admin Name"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">Seed Key</label>
            <Input
              value={seedKey}
              onChange={(event) => setSeedKey(event.target.value)}
              placeholder="ADMIN_SEED_KEY"
              disabled={loading}
              required
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Initial Admin"}
          </Button>
        </form>

        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-green-700 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
