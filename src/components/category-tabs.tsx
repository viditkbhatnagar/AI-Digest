"use client";

import { cn } from "@/lib/utils";
import {
  ARTICLE_CATEGORIES,
  CATEGORY_LABELS,
  type ArticleCategory,
} from "@/lib/types";

interface CategoryTabsProps {
  activeCategory: ArticleCategory | "all";
  onCategoryChange: (category: ArticleCategory | "all") => void;
  counts?: Partial<Record<ArticleCategory | "all", number>>;
  className?: string;
}

export function CategoryTabs({
  activeCategory,
  onCategoryChange,
  counts,
  className,
}: CategoryTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 scrollbar-none",
        className
      )}
    >
      {/* "All" tab */}
      <button
        onClick={() => onCategoryChange("all")}
        className={cn(
          "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
          activeCategory === "all"
            ? "bg-accent/10 text-accent"
            : "text-muted border border-border hover:text-foreground"
        )}
      >
        All{counts?.all !== undefined ? ` (${counts.all})` : ""}
      </button>

      {ARTICLE_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
            activeCategory === cat
              ? "bg-accent/10 text-accent"
              : "text-muted border border-border hover:text-foreground"
          )}
        >
          {CATEGORY_LABELS[cat]}
          {counts?.[cat] !== undefined ? ` (${counts[cat]})` : ""}
        </button>
      ))}
    </div>
  );
}
