import { ArticleCardSkeleton } from "@/components/skeleton-loader";

export default function SearchLoading() {
  return (
    <>
      <div className="h-8 w-24 bg-surface-hover animate-pulse rounded mb-2" />
      <div className="h-4 w-64 bg-surface-hover animate-pulse rounded mb-6" />
      <div className="h-11 w-full bg-surface-hover animate-pulse rounded-xl mb-4" />
      <div className="flex gap-2 mb-6">
        <div className="h-8 w-28 bg-surface-hover animate-pulse rounded-full" />
        <div className="h-8 w-28 bg-surface-hover animate-pulse rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
