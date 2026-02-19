import { ArticleCardSkeleton } from "@/components/skeleton-loader";

export default function KnowledgeDetailLoading() {
  return (
    <>
      <div className="h-4 w-40 bg-surface-hover animate-pulse rounded mb-4" />
      <div className="h-8 w-64 bg-surface-hover animate-pulse rounded mb-2" />
      <div className="h-4 w-24 bg-surface-hover animate-pulse rounded mb-6" />
      <div className="bg-surface rounded-xl p-5 border border-border mb-6 space-y-3">
        <div className="h-5 w-16 bg-surface-hover animate-pulse rounded-full" />
        <div className="h-4 w-full bg-surface-hover animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-surface-hover animate-pulse rounded" />
              <div className="h-5 w-12 bg-surface-hover animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-4 w-40 bg-surface-hover animate-pulse rounded mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
