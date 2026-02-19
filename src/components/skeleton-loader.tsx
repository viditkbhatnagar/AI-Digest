import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-surface-hover", className)}
    />
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function KnowledgeCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function DigestHeaderSkeleton() {
  return (
    <div className="space-y-3 mb-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

export function StatsWidgetSkeleton() {
  return (
    <div className="bg-surface rounded-xl p-4 border border-border space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-7 w-12" />
    </div>
  );
}
