import type { Category } from "@/types";
import { CategoryIcon } from "@/components/CategoryIcon";

interface Props {
  category: Category;
}

export function CategoryPill({ category }: Props) {
  return (
    <a
      href={`/categories/${category.slug}`}
      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:border-navy-600 hover:bg-cream-50 hover:text-navy-800"
    >
      <CategoryIcon slug={category.slug} />
      {category.name}
    </a>
  );
}
