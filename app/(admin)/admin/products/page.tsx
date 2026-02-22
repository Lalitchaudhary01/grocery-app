"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/ui/ToastProvider";
import { parseCategoryName } from "@/lib/category-name";

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  mrp?: number;
  stock: number;
  unit?: string | null;
  variantGroup?: string | null;
  discountPercent?: number;
  isActive?: boolean;
  imageUrl: string | null;
  categoryId: string;
  category?: { id: string; name: string };
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  mrp: string;
  stock: string;
  unit: string;
  variantGroup: string;
  discountPercent: string;
  isActive: "true" | "false";
  imageUrl: string;
  categoryId: string;
};

type UploadImageResponse = {
  url?: string;
  error?: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  mrp: "",
  stock: "",
  unit: "",
  variantGroup: "",
  discountPercent: "",
  isActive: "true",
  imageUrl: "",
  categoryId: "",
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (filterCategoryId) params.set("categoryId", filterCategoryId);

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
      setForm((previous) => ({
        ...previous,
        categoryId: previous.categoryId || nextCategories[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [filterCategoryId, query]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleProducts = useMemo(() => {
    if (statusFilter === "all") return products;
    if (statusFilter === "active") return products.filter((product) => product.isActive !== false);
    return products.filter((product) => product.isActive === false);
  }, [products, statusFilter]);

  function startCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id || "",
    });
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(Math.round(product.price)),
      mrp: String(Math.round(product.mrp ?? product.price)),
      stock: String(product.stock),
      unit: product.unit || "",
      variantGroup: product.variantGroup || "",
      discountPercent: String(product.discountPercent ?? 0),
      isActive: product.isActive === false ? "false" : "true",
      imageUrl: product.imageUrl || "",
      categoryId: product.categoryId,
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        mrp: form.mrp ? Number(form.mrp) : Number(form.price),
        stock: Number(form.stock),
        unit: form.unit.trim() || null,
        variantGroup: form.variantGroup.trim() || null,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : 0,
        isActive: form.isActive === "true",
        imageUrl: form.imageUrl.trim() || null,
        categoryId: form.categoryId,
      };

      const endpoint = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to save product.");
      }

      startCreate();
      await loadData();
      showSuccessToast(editingId ? "Product updated." : "Product created.");
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save product.";
      setError(message);
      showErrorToast(message);
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

      if (editingId === productId) {
        startCreate();
      }
      await loadData();
      showSuccessToast("Product deleted.");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete product.";
      setError(message);
      showErrorToast(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function changeStock(product: Product, delta: number) {
    const nextStock = Math.max(0, product.stock + delta);
    if (nextStock === product.stock) return;
    try {
      setError(null);
      let stockReasonTag: "DAMAGED" | "EXPIRED" | "MANUAL" = "MANUAL";
      let stockReason = "";
      if (delta < 0) {
        const reasonInput = window
          .prompt("Reason tag likho: DAMAGED / EXPIRED / MANUAL", "MANUAL")
          ?.trim()
          .toUpperCase();
        if (reasonInput === "DAMAGED" || reasonInput === "EXPIRED" || reasonInput === "MANUAL") {
          stockReasonTag = reasonInput;
        }
        stockReason =
          window.prompt("Optional note (e.g. 2 packets torn)", `${stockReasonTag} stock reduce`)?.trim() ||
          "";
      }
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: nextStock,
          stockReasonTag,
          stockReason,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error || "Failed to update stock.");
      }
      await loadData();
      showSuccessToast("Stock updated.");
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Failed to update stock.";
      setError(message);
      showErrorToast(message);
    }
  }

  async function uploadProductImage(file: File) {
    try {
      setUploadingImage(true);
      setError(null);

      const body = new FormData();
      body.append("file", file);
      body.append("folder", "grocery-app/products");

      const response = await fetch("/api/uploads/image", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as UploadImageResponse | null;
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Image upload failed.");
      }

      setForm((previous) => ({ ...previous, imageUrl: payload.url ?? "" }));
      showSuccessToast("Product image uploaded.");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Image upload failed.";
      setError(message);
      showErrorToast(message);
    } finally {
      setUploadingImage(false);
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
        <section className="space-y-3">
          <div className="grid gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:grid-cols-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Product search karein..."
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium focus:border-green-600 focus:outline-none"
            />
            <select
              value={filterCategoryId}
              onChange={(event) => setFilterCategoryId(event.target.value)}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold focus:border-green-600 focus:outline-none"
            >
              <option value="">Sab Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {parseCategoryName(category.name).label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "inactive")
              }
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold focus:border-green-600 focus:outline-none"
            >
              <option value="all">Sab</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
            <table className="min-w-[760px]">
              <thead className="bg-[#eaf1e3] text-left text-xs font-bold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-600">
                      Loading products...
                    </td>
                  </tr>
                ) : visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-600">
                      Koi product nahi mila.
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((product) => {
                    const isOut = product.stock <= 0;
                    const isActive = product.isActive !== false;
                    return (
                      <tr
                        key={product.id}
                        className={!isActive || isOut ? "bg-red-50/40" : "bg-white"}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-[#edf3e6]">
                              <Image
                                src={product.imageUrl || FALLBACK_IMAGE}
                                alt={product.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-neutral-900">{product.name}</p>
                              <p className="text-sm text-neutral-500">
                                {product.unit ||
                                  (product.category
                                    ? parseCategoryName(product.category.name).label
                                    : "-")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xl font-extrabold text-neutral-900">
                            {formatINR(product.price)}
                          </p>
                          {product.mrp && product.mrp > product.price ? (
                            <p className="text-sm text-neutral-400 line-through">
                              {formatINR(product.mrp)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void changeStock(product, -1)}
                              className="h-8 w-8 rounded-lg border border-neutral-300 text-lg font-bold text-neutral-700 hover:bg-neutral-100"
                            >
                              -
                            </button>
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-bold ${
                              isOut
                                ? "bg-red-100 text-red-600"
                                : product.stock <= 5
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {product.stock} units
                            </span>
                            <button
                              type="button"
                              onClick={() => void changeStock(product, 1)}
                              className="h-8 w-8 rounded-lg border border-neutral-300 text-lg font-bold text-neutral-700 hover:bg-neutral-100"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${
                              isActive ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(product)}
                              className="rounded-xl border-2 border-green-700 px-3 py-1.5 text-sm font-bold text-green-700 hover:bg-green-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteProduct(product.id)}
                              disabled={deletingId === product.id}
                              className="rounded-xl bg-red-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
                            >
                              {deletingId === product.id ? "..." : "Del"}
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
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-extrabold text-green-700">✏️ Product Edit/Add Karein</h2>
          <form onSubmit={saveProduct} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                disabled={saving}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryId: event.target.value }))
                }
                required
                disabled={saving}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {parseCategoryName(category.name).label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">MRP (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={form.mrp}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, mrp: event.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stock: event.target.value }))
                  }
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">Unit / Weight</label>
                <input
                  value={form.unit}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, unit: event.target.value }))
                  }
                  placeholder="5 Kg Pack"
                  disabled={saving}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Variant Group
              </label>
              <input
                value={form.variantGroup}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, variantGroup: event.target.value }))
                }
                placeholder="e.g. aashirvaad-atta"
                disabled={saving}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Same group wale products user ko variants me dikhenge.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={4}
                disabled={saving}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">Status</label>
                <select
                  value={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: event.target.value as "true" | "false",
                    }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                >
                  <option value="true">Active (Dikh raha)</option>
                  <option value="false">Inactive (Hide)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700">
                  Offer / Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={form.discountPercent}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      discountPercent: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">Product Image</label>
              <input
                type="file"
                accept="image/*"
                disabled={saving || uploadingImage}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadProductImage(file);
                  event.currentTarget.value = "";
                }}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-green-800 focus:border-green-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {uploadingImage
                  ? "Uploading image..."
                  : "Image direct Cloudinary pe upload hogi."}
              </p>
              {form.imageUrl ? (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white">
                    <Image
                      src={form.imageUrl}
                      alt="Preview"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((previous) => ({ ...previous, imageUrl: "" }))}
                    className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || categories.length === 0}
                className="rounded-xl bg-green-700 px-6 py-2 text-base font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
              >
                {saving ? "Saving..." : editingId ? "💾 Save Karein" : "➕ Add Product"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={startCreate}
                  className="text-sm font-bold text-neutral-600 hover:text-neutral-900"
                >
                  ✕ Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
