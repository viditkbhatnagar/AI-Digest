import { cn, getCategoryColor } from "@/lib/utils";
import type { ArticleCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

interface CategoryBadgeProps {
  category: ArticleCategory;
  size?: "sm" | "md";
  className?: string;
}

export function CategoryBadge({
  category,
  size = "md",
  className,
}: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        getCategoryColor(category),
        className
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
