import { cn, formatDate } from "@/lib/utils";
import type { Digest } from "@/lib/types";

interface DigestHeaderProps {
  digest: Digest;
  className?: string;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Split on **bold** and `code` patterns, preserve delimiters
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-accent/10 text-accent text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function DigestHeader({ digest, className }: DigestHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-semibold text-foreground">
          {formatDate(digest.date)}
        </h2>
        <span className="text-xs text-muted bg-surface-hover px-2 py-0.5 rounded-full">
          {digest.article_count} articles
        </span>
      </div>
      {digest.editorial_intro && (
        <p className="text-sm text-muted leading-relaxed bg-surface rounded-xl p-4 border border-border">
          {renderInlineMarkdown(digest.editorial_intro)}
        </p>
      )}
    </div>
  );
}
