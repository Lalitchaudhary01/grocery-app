"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function UserRegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      setLoading(true);

      const response = await fetch("/api/auth/customer-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Registration failed.");
      }

      router.replace("/user-login");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Registration failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-neutral-900">User Register</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Name and mobile number se account banayein.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600">
              Mobile Number
            </label>
            <Input
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              placeholder="10-digit mobile"
              disabled={loading}
              required
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-neutral-600">
          Already registered?{" "}
          <Link href="/user-login" className="font-semibold text-green-700 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
