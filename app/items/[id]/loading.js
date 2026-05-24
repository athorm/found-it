export default function ItemDetailLoading() {
  return (
    <div className="min-h-screen bg-transparent text-white pb-32 font-sans">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-orange-500/20 p-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="w-10 h-10 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-6 w-28 bg-white/10 rounded animate-pulse" />
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-6 pb-6 space-y-6">
        {/* Image skeleton */}
        <div className="rounded-[2.5rem] overflow-hidden border border-orange-500/10 animate-pulse">
          <div className="w-full h-96 bg-white/[0.04]" />
        </div>

        {/* Info card skeleton */}
        <div className="rounded-[2.5rem] bg-black/40 border border-orange-500/10 p-8 animate-pulse">
          <div className="space-y-5">
            {/* Title + status */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-7 w-3/4 bg-white/10 rounded" />
                <div className="h-3 w-1/4 bg-white/5 rounded" />
              </div>
              <div className="h-8 w-24 bg-orange-500/10 rounded-full" />
            </div>

            {/* Description */}
            <div className="border-t border-orange-500/10 pt-4 space-y-2">
              <div className="h-3 w-24 bg-orange-500/10 rounded" />
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="h-3 w-5/6 bg-white/5 rounded" />
              <div className="h-3 w-2/3 bg-white/5 rounded" />
            </div>

            {/* Location */}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-orange-500/10 rounded-full" />
              <div className="space-y-1">
                <div className="h-2 w-14 bg-orange-500/10 rounded" />
                <div className="h-3 w-32 bg-white/10 rounded" />
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-orange-500/10 rounded-full" />
              <div className="space-y-1">
                <div className="h-2 w-10 bg-orange-500/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Poster card skeleton */}
        <div className="flex items-center gap-4 p-5 bg-black/40 rounded-[2rem] border border-orange-500/10 animate-pulse">
          <div className="w-14 h-14 rounded-full bg-orange-500/10" />
          <div className="space-y-2">
            <div className="h-2 w-16 bg-orange-500/10 rounded" />
            <div className="h-5 w-32 bg-white/10 rounded" />
          </div>
        </div>

        {/* Button skeleton */}
        <div className="w-full h-14 bg-white/[0.04] border border-white/5 rounded-2xl animate-pulse" />
      </main>
    </div>
  );
}
