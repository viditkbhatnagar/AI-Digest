import {
  StatsWidgetSkeleton,
  ArticleCardSkeleton,
  DigestHeaderSkeleton,
} from "@/components/skeleton-loader";

export default function HomeLoading() {
  return (
    <>
      <div className="h-8 w-48 bg-surface-hover animate-pulse rounded mb-2" />
      <div className="h-4 w-32 bg-surface-hover animate-pulse rounded mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsWidgetSkeleton key={i} />
        ))}
      </div>
      <DigestHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
