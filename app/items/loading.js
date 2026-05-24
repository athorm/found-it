export default function ItemsLoading({ viewMode = "grid" }) {
  return (
    <div className="min-h-full font-sans">
      {/* SKELETON HEADER */}
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-xl border-b border-white/5">
        {/* Topbar */}
        <div className="py-3 px-5">
          <div className="max-w-6xl mx-auto flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/5 rounded-xl animate-shimmer" />
              <div className="h-4 w-20 bg-white/5 rounded animate-shimmer hidden sm:block" />
            </div>
            <div className="ml-auto">
              <div className="w-10 h-10 bg-white/5 rounded-xl animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Controls area */}
        <div className="max-w-6xl mx-auto px-6 pt-1 pb-4 space-y-4">
          {/* Tab switcher skeleton */}
          <div className="flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10">
            <div className="flex-1 py-2.5 flex justify-center">
              <div className="h-3 w-10 bg-white/10 rounded animate-shimmer" />
            </div>
            <div className="flex-1 py-2.5 flex justify-center">
              <div className="h-3 w-12 bg-white/5 rounded animate-shimmer" />
            </div>
          </div>

          {/* Search + buttons skeleton */}
          <div className="flex gap-3">
            <div className="flex-1 h-[52px] bg-white/[0.04] border border-white/10 rounded-2xl animate-shimmer" />
            <div className="w-[52px] h-[52px] bg-white/5 border border-white/10 rounded-2xl animate-shimmer" />
            <div className="w-[52px] h-[52px] bg-white/5 border border-white/10 rounded-2xl animate-shimmer" />
          </div>
        </div>
      </header>

      {/* SKELETON CONTENT — adapts to viewMode */}
      <main className="max-w-6xl mx-auto px-6 pb-40">
        <div className="relative min-h-[400px] pt-6">
          {viewMode === "list" ? (
            /* List view skeleton */
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex p-3 gap-5 items-center bg-white/[0.04] border border-white/10 rounded-[2.2rem] animate-shimmer"
                >
                  <div className="w-24 h-24 rounded-[1.5rem] bg-white/[0.04] shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-3/4 bg-white/10 rounded" />
                    <div className="h-2 w-1/2 bg-white/5 rounded" />
                    <div className="h-2 w-1/3 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Grid view skeleton */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-white/[0.04] border border-white/10 rounded-[2.2rem] overflow-hidden animate-shimmer flex flex-col"
                >
                  {/* Image placeholder */}
                  <div className="aspect-square w-full bg-white/[0.04]" />
                  {/* Text area */}
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-3/4 bg-white/10 rounded" />
                    <div className="h-2 w-1/2 bg-white/5 rounded" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-white/5 rounded-full" />
                      <div className="h-2 w-1/3 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
