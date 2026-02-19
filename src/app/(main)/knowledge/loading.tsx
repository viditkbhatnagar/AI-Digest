import {
  StatsWidgetSkeleton,
  KnowledgeCardSkeleton,
} from "@/components/skeleton-loader";

export default function KnowledgeLoading() {
  return (
    <>
      <div className="h-8 w-40 bg-surface-hover animate-pulse rounded mb-2" />
      <div className="h-4 w-72 bg-surface-hover animate-pulse rounded mb-6" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatsWidgetSkeleton key={i} />
        ))}
      </div>
      <div className="flex gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 bg-surface-hover animate-pulse rounded-full shrink-0"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KnowledgeCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
