import type { Category } from "@/types";

interface Props {
  category: Category;
}

export function CategoryPill({ category }: Props) {
  return (
    <a
      href={`/categories/${category.slug}`}
      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      {category.icon && <span>{category.icon}</span>}
      {category.name}
    </a>
  );
}
