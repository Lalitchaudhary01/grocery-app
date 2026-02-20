"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Category = {
  id: string;
  name: string;
};

type CategoriesResponse = {
  categories?: Category[];
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCategories() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/categories", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load categories.");

      const data = (await response.json()) as CategoriesResponse;
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to create category.");
      }

      setName("");
      await loadCategories();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">Categories</h1>
        <p className="mt-1 text-sm text-neutral-600">Create and view product categories.</p>
      </div>

      <form onSubmit={createCategory} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-neutral-900">Add Category</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            disabled={saving}
          />
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-neutral-900">Category List</p>
        {loading ? (
          <p className="text-sm text-neutral-600">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-neutral-600">No categories found.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                {category.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
