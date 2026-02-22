import Image from "next/image";
import Link from "next/link";

import { optimizeImageUrl } from "@/lib/image";
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
        const imageUrl = optimizeImageUrl(parsed.imageUrl, { width: 480, height: 240 });
        return (
          <Link
            key={category.id}
            href={`/products?categoryId=${category.id}`}
            className="overflow-hidden rounded-2xl bg-white text-center shadow-sm ring-1 ring-neutral-200 transition duration-200 hover:-translate-y-0.5 hover:bg-green-50 hover:ring-green-200"
          >
            <div className="relative h-24 w-full bg-[#edf3e6] sm:h-28">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={parsed.label}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-neutral-600">
                  {parsed.label.slice(0, 1).toUpperCase() || "C"}
                </div>
              )}
            </div>
            <div className="space-y-1 px-2 py-2.5 sm:px-3">
              <p className="line-clamp-1 text-sm font-semibold text-neutral-800 sm:text-base">
                {parsed.label}
              </p>
              <p className="text-xs font-medium text-green-700">View Products</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
