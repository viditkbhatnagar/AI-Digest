"use client";

import { useState, useEffect } from "react";
import { Bookmark, ExternalLink } from "lucide-react";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import { getImportanceDotColor } from "@/lib/utils";
import type { Article } from "@/lib/types";
import { CategoryBadge } from "./category-badge";

interface ArticleCardProps {
  article: Article;
  className?: string;
  onBookmarkChange?: (articleId: string, newState: boolean) => void;
}

export function ArticleCard({
  article,
  className,
  onBookmarkChange,
}: ArticleCardProps) {
  const [bookmarked, setBookmarked] = useState(article.is_bookmarked);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setBookmarked(article.is_bookmarked);
  }, [article.is_bookmarked]);

  async function handleBookmarkToggle() {
    if (isToggling) return;

    const previousState = bookmarked;
    const newState = !bookmarked;

    // Optimistic update
    setBookmarked(newState);
    setIsToggling(true);

    try {
      const res = await fetch(`/api/articles/${article.id}/bookmark`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!data.success) {
        setBookmarked(previousState);
      } else {
        onBookmarkChange?.(article.id, data.is_bookmarked);
      }
    } catch {
      setBookmarked(previousState);
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <article
      className={cn(
        "bg-surface rounded-xl p-4 border border-border hover:border-accent/30 hover:bg-surface-hover transition-colors group",
        className
      )}
    >
      {/* Row 1: importance dot + title */}
      <div className="flex items-start gap-2 mb-2">
        <span
          className={cn(
            "w-2 h-2 rounded-full mt-1.5 shrink-0",
            getImportanceDotColor(article.importance_score)
          )}
        />
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-foreground hover:text-accent transition-colors flex-1 line-clamp-2"
        >
          {article.title}
          <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      {/* Row 2: AI summary (2 lines) */}
      {article.ai_summary && (
        <p className="text-xs text-muted mb-3 line-clamp-2 pl-4">
          {truncate(article.ai_summary, 180)}
        </p>
      )}

      {/* Row 3: source + time + category badge + bookmark */}
      <div className="flex items-center justify-between pl-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted">{article.source_name}</span>
          <span className="text-[10px] text-muted">&middot;</span>
          <span className="text-[10px] text-muted">
            {formatRelativeTime(article.published_at || article.fetched_at)}
          </span>
          <CategoryBadge category={article.category} size="sm" />
        </div>
        <button
          onClick={handleBookmarkToggle}
          disabled={isToggling}
          className={cn(
            "p-1 rounded-md transition-colors",
            bookmarked ? "text-accent" : "text-muted hover:text-foreground",
            isToggling && "opacity-50"
          )}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark article"}
        >
          <Bookmark
            className={cn("w-4 h-4", bookmarked && "fill-current")}
          />
        </button>
      </div>
    </article>
  );
}
