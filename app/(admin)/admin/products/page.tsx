"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
  category?: { id: string; name: string };
};

type ProductPayload = {
  name: string;
  price: string;
  stock: string;
  imageUrl: string;
  categoryId: string;
};

const EMPTY_FORM: ProductPayload = {
  name: "",
  price: "",
  stock: "",
  imageUrl: "",
  categoryId: "",
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductPayload>(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "in" | "out">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (stockFilter) params.set("stock", stockFilter);

      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/products?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error("Failed to load products.");
      }

      const productsData = (await productsRes.json()) as { products?: Product[] };
      const categoriesData = (await categoriesRes.json()) as { categories?: Category[] };

      const nextProducts = Array.isArray(productsData.products) ? productsData.products : [];
      const nextCategories = Array.isArray(categoriesData.categories)
        ? categoriesData.categories
        : [];

      setProducts(nextProducts);
      setCategories(nextCategories);
      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || nextCategories[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [filterCategoryId, query, stockFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          stock: Number(form.stock),
          imageUrl: form.imageUrl.trim() || null,
          categoryId: form.categoryId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to create product.");
      }

      setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || "" });
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create product.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(productId: string) {
    try {
      setDeletingId(productId);
      setError(null);

      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to delete product.");
      }

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete product.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">Products</h1>
        <p className="mt-1 text-sm text-neutral-600">Manage grocery products and stock.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
          />
          <select
            value={filterCategoryId}
            onChange={(event) => setFilterCategoryId(event.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as "" | "in" | "out")}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
          >
            <option value="">All stock</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery("");
              setFilterCategoryId("");
              setStockFilter("");
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <form onSubmit={createProduct} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-neutral-900">Add Product</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Product name"
            disabled={saving}
            required
          />
          <Input
            type="number"
            min="1"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            placeholder="Price"
            disabled={saving}
            required
          />
          <Input
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
            placeholder="Stock"
            disabled={saving}
            required
          />
          <Input
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            placeholder="Image URL"
            disabled={saving}
          />
          <select
            value={form.categoryId}
            onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-green-600 focus:outline-none"
            disabled={saving}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="mt-3" disabled={saving || categories.length === 0}>
          {saving ? "Saving..." : "Add Product"}
        </Button>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-green-50 text-left text-xs font-semibold uppercase tracking-wide text-green-900">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-600">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-600">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <a
                        href={`/admin/products/${product.id}`}
                        className="rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        {product.id.slice(0, 8).toUpperCase()}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{product.name}</td>
                    <td className="px-4 py-3 text-neutral-700">{product.category?.name || "-"}</td>
                    <td className="px-4 py-3 text-green-700">{formatINR(product.price)}</td>
                    <td className="px-4 py-3 text-neutral-700">{product.stock}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void deleteProduct(product.id)}
                        disabled={deletingId === product.id}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
