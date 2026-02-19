import { cn } from "@/lib/utils";

interface TimelineItemProps {
  date: string;
  title: string;
  description: string;
  articleCount: number;
  isLast?: boolean;
  className?: string;
}

export function TimelineItem({
  date,
  title,
  description,
  articleCount,
  isLast = false,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn("relative pl-8", className)}>
      {/* Vertical connecting line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
      )}
      {/* Dot */}
      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-background" />
      {/* Content */}
      <div className="pb-6">
        <p className="text-xs text-muted mb-1">{date}</p>
        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted line-clamp-2">{description}</p>
        <span className="text-xs text-muted mt-1 inline-block">
          {articleCount} articles
        </span>
      </div>
    </div>
  );
}
