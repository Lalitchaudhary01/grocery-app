import Link from "next/link";

import { parseCategoryName } from "@/lib/category-name";

type CategoryItem = {
  id: string;
  name: string;
};

type CategoryGridProps = {
  categories: CategoryItem[];
};

export function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) {
    return (
      <div className="mt-3 rounded-xl bg-white p-4 text-sm text-neutral-600 shadow-sm ring-1 ring-neutral-200">
        Categories are not available yet.
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((category) => {
        const parsed = parseCategoryName(category.name);
        const imageUrl = parsed.imageUrl;
        return (
        <Link
          key={category.id}
          href={`/products?categoryId=${category.id}`}
          className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200 transition duration-200 hover:-translate-y-0.5 hover:bg-green-50 hover:ring-green-200"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={parsed.label}
              className="mx-auto h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-sm font-bold text-neutral-600">
              {parsed.label.slice(0, 1).toUpperCase() || "C"}
            </div>
          )}
          <p className="text-sm font-semibold text-neutral-800">{parsed.label}</p>
          <p className="mt-1 text-xs font-medium text-green-700">View Products</p>
        </Link>
        );
      })}
    </div>
  );
}
