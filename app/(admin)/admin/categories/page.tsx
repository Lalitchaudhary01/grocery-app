"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/ui/ToastProvider";
import { buildCategoryName, parseCategoryName } from "@/lib/category-name";

type Category = {
  id: string;
  name: string;
  _count?: {
    products: number;
  };
};

type CategoryForm = {
  name: string;
  imageUrl: string;
  sortOrder: string;
  status: "active" | "inactive";
};

type CategoriesResponse = {
  categories?: Category[];
  error?: string;
};

const EMPTY_FORM: CategoryForm = {
  name: "",
  imageUrl: "",
  sortOrder: "1",
  status: "active",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  async function loadCategories() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/categories", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as CategoriesResponse | null;
      if (!response.ok) throw new Error(body?.error || "Failed to load categories.");

      const list = Array.isArray(body?.categories) ? body.categories : [];
      setCategories(list);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load categories.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((first, second) =>
        parseCategoryName(first.name).label.localeCompare(parseCategoryName(second.name).label),
      ),
    [categories],
  );

  function startCreateMode() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEditMode(category: Category) {
    const parsed = parseCategoryName(category.name);
    setEditingId(category.id);
    setForm({
      name: parsed.label,
      imageUrl: parsed.imageUrl || "",
      sortOrder: "1",
      status: "active",
    });
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: buildCategoryName(form.name, form.imageUrl),
      };

      const endpoint = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to save category.");
      }

      startCreateMode();
      await loadCategories();
      showSuccessToast(editingId ? "Category updated." : "Category created.");
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save category.";
      setError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    try {
      setDeletingId(id);
      setError(null);
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error || "Failed to delete category.");
      }
      if (editingId === id) {
        startCreateMode();
      }
      await loadCategories();
      showSuccessToast("Category deleted.");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete category.";
      setError(message);
      showErrorToast(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-4 py-3">
            <h2 className="text-3xl font-extrabold text-neutral-900">Current Categories</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[720px]">
              <thead className="bg-[#eaf1e3] text-left text-xs font-bold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-3">Icon</th>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-600">
                      Loading categories...
                    </td>
                  </tr>
                ) : sortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-600">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  sortedCategories.map((category) => {
                    const parsed = parseCategoryName(category.name);
                    const label = parsed.label;
                    const imageUrl = parsed.imageUrl;
                    const productsCount = category._count?.products ?? 0;

                    return (
                      <tr key={category.id}>
                        <td className="px-4 py-4">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={label}
                              className="h-12 w-12 rounded-lg border border-neutral-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-xs font-bold text-neutral-600">
                              {label.slice(0, 1).toUpperCase() || "C"}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-lg font-bold text-neutral-900 sm:text-2xl">{label}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-bold text-neutral-600">
                            {productsCount}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditMode(category)}
                              className="rounded-xl border-2 border-green-700 px-3 py-1.5 text-sm font-bold text-green-700 hover:bg-green-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteCategory(category.id)}
                              disabled={deletingId === category.id}
                              className="rounded-xl bg-red-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
                            >
                              {deletingId === category.id ? "..." : "Del"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-green-700">➕ Naya Category Banayein</h2>

          <form onSubmit={submitCategory} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Dairy & Eggs"
                required
                disabled={saving}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Image URL
              </label>
              <input
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
                placeholder="https://..."
                disabled={saving}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Category card ke liye image link dalo (optional).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
                disabled
                className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
              />
              <p className="mt-1 text-xs text-neutral-500">Chhota number pehle dikhega (coming soon)</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">Status</label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as "active" | "inactive",
                  }))
                }
                disabled
                className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-green-700 px-6 py-2 text-base font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
              >
                {saving ? "Saving..." : "💾 Save Karein"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={startCreateMode}
                  className="text-sm font-bold text-neutral-600 hover:text-neutral-900"
                >
                  ✕ Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            💡 Category delete karne se pehle, us category ke sare products kisi aur category me
            move karo.
          </div>
        </section>
      </div>
    </div>
  );
}
