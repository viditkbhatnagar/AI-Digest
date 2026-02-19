import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { cn, truncate } from "@/lib/utils";
import type { KnowledgeBaseEntry } from "@/lib/types";
import { ENTITY_TYPE_LABELS } from "@/lib/types";

interface KnowledgeCardProps {
  entry: KnowledgeBaseEntry;
  className?: string;
}

export function KnowledgeCard({ entry, className }: KnowledgeCardProps) {
  return (
    <Link
      href={`/knowledge/${entry.slug}`}
      className={cn(
        "block bg-surface rounded-xl p-4 border border-border hover:border-accent/30 hover:bg-surface-hover transition-colors",
        className
      )}
    >
      {/* Type badge + trending indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider">
          {ENTITY_TYPE_LABELS[entry.type]}
        </span>
        {entry.trending_score >= 70 && (
          <span className="flex items-center gap-1 text-[10px] text-importance-medium">
            <TrendingUp className="w-3 h-3" />
            Trending
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-foreground mb-1">
        {entry.name}
      </h3>

      {/* Description preview (2 lines) */}
      {entry.description && (
        <p className="text-xs text-muted mb-2 line-clamp-2">
          {truncate(entry.description, 120)}
        </p>
      )}

      {/* Mention count */}
      <p className="text-[10px] text-muted">{entry.mention_count} mentions</p>
    </Link>
  );
}
