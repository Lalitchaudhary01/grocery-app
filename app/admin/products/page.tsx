"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
  category: Category;
}

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  stock: string;
  imageUrl: string;
  categoryId: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  description: "",
  price: "",
  stock: "",
  imageUrl: "",
  categoryId: "",
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isBusy = saving || Boolean(deletingId);

  const canCreate = useMemo(
    () =>
      form.name.trim().length >= 2 &&
      Number(form.price) > 0 &&
      Number.isInteger(Number(form.stock)) &&
      Number(form.stock) >= 0 &&
      form.categoryId.length > 0,
    [form],
  );
  const canSaveEdit = useMemo(
    () =>
      editForm.name.trim().length >= 2 &&
      Number(editForm.price) > 0 &&
      Number.isInteger(Number(editForm.stock)) &&
      Number(editForm.stock) >= 0 &&
      editForm.categoryId.length > 0,
    [editForm],
  );

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      if (!productsResponse.ok || !categoriesResponse.ok) {
        throw new Error("Failed to load admin product data.");
      }

      const productsData = (await productsResponse.json()) as {
        products?: Product[];
      };
      const categoriesData = (await categoriesResponse.json()) as {
        categories?: Category[];
      };

      const nextCategories = Array.isArray(categoriesData.categories)
        ? categoriesData.categories
        : [];
      const nextProducts = Array.isArray(productsData.products)
        ? productsData.products
        : [];

      setCategories(nextCategories);
      setProducts(nextProducts);
      setForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || nextCategories[0]?.id || "",
      }));
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load admin product data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
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

      setForm({
        ...EMPTY_FORM,
        categoryId: categories[0]?.id || "",
      });
      await loadData();
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Failed to create product.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: product.imageUrl || "",
      categoryId: product.categoryId,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  async function saveEdit(productId: string) {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          price: Number(editForm.price),
          stock: Number(editForm.stock),
          imageUrl: editForm.imageUrl.trim() || null,
          categoryId: editForm.categoryId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to update product.");
      }

      cancelEdit();
      await loadData();
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Failed to update product.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(productId: string) {
    const confirmed = window.confirm("Delete this product?");
    if (!confirmed) return;

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
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete product.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Admin Product Management
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create, edit, and remove products.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Add Product</h2>

          <form
            onSubmit={createProduct}
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Name"
              disabled={isBusy || loading}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Price"
              disabled={isBusy || loading}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={form.stock}
              onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
              type="number"
              min="0"
              step="1"
              placeholder="Stock"
              disabled={isBusy || loading}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={form.imageUrl}
              onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
              placeholder="Image URL (optional)"
              disabled={isBusy || loading}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
              disabled={isBusy || loading || categories.length === 0}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Description (optional)"
              disabled={isBusy || loading}
              className="min-h-24 rounded-xl border border-neutral-300 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3"
            />
            {categories.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2 lg:col-span-3">
                No categories available. Create a category first before adding
                products.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isBusy || loading || !canCreate || categories.length === 0}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400 sm:w-fit"
            >
              {isBusy ? "Saving..." : "Add Product"}
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isBusy || loading}
              className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-neutral-500"
                    >
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-neutral-500"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const isEditing = editingId === product.id;

                    return (
                      <tr key={product.id} className="align-top">
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm((p) => ({ ...p, name: e.target.value }))
                                }
                                disabled={isBusy}
                                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                              />
                              <textarea
                                value={editForm.description}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    description: e.target.value,
                                  }))
                                }
                                disabled={isBusy}
                                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                                rows={2}
                              />
                              <input
                                value={editForm.imageUrl}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    imageUrl: e.target.value,
                                  }))
                                }
                                disabled={isBusy}
                                placeholder="Image URL"
                                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                                {product.description || "No description"}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {isEditing ? (
                            <select
                              value={editForm.categoryId}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  categoryId: e.target.value,
                                }))
                              }
                              disabled={isBusy}
                              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                            >
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            product.category?.name || "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {isEditing ? (
                            <input
                              value={editForm.price}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, price: e.target.value }))
                              }
                              type="number"
                              min="0.01"
                              step="0.01"
                              disabled={isBusy}
                              className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            formatPrice(product.price)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {isEditing ? (
                            <input
                              value={editForm.stock}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, stock: e.target.value }))
                              }
                              type="number"
                              min="0"
                              step="1"
                              disabled={isBusy}
                              className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            product.stock
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void saveEdit(product.id)}
                                  disabled={isBusy || !canSaveEdit}
                                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
                                >
                                  {isBusy ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={isBusy}
                                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(product)}
                                  disabled={isBusy}
                                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteProduct(product.id)}
                                  disabled={deletingId === product.id}
                                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                                >
                                  {deletingId === product.id ? "Deleting..." : "Delete"}
                                </button>
                              </>
                            )}
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
      </div>
    </div>
  );
}
