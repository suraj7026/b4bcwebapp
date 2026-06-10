function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-container-high ${className}`}
    />
  );
}

export default function AppLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-margin-mobile lg:p-margin-desktop">
      <div>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-3 h-9 w-72 max-w-full" />
        <SkeletonBlock className="mt-3 h-5 w-[420px] max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-56" />
      </div>
    </main>
  );
}
