export default function ArchiveLoading() {
  return (
    <>
      <div className="h-8 w-24 bg-surface-hover animate-pulse rounded mb-2" />
      <div className="h-4 w-64 bg-surface-hover animate-pulse rounded mb-6" />
      <div className="bg-surface rounded-xl p-5 border border-border mb-6">
        <div className="h-4 w-16 bg-surface-hover animate-pulse rounded mb-3" />
        <div className="h-28 w-full bg-surface-hover animate-pulse rounded" />
      </div>
      <div className="h-4 w-32 bg-surface-hover animate-pulse rounded mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-20 h-4 bg-surface-hover animate-pulse rounded shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-surface-hover animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-surface-hover animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
