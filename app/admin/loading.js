export default function AdminLoading() {
  return (
    <div className="min-h-full text-white font-sans">
      {/* HEADER SKELETON */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-36 bg-white/10 rounded animate-pulse" />
                <div className="h-2 w-24 bg-orange-500/10 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block h-9 w-28 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-pulse" />
            <div className="w-10 h-10 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>

      <div className="w-full max-w-[100rem] mx-auto flex flex-col md:flex-row items-start relative">
        {/* SIDEBAR SKELETON (desktop) */}
        <aside className="hidden md:block sticky top-[80px] w-64 shrink-0 p-6 md:pr-0 h-[calc(100vh-80px)]">
          <div className="flex flex-col gap-2 bg-white/[0.02] p-3 rounded-[2rem] border border-white/5 backdrop-blur-md animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-4 rounded-[1.2rem] ${i === 1 ? 'bg-orange-500/20' : ''}`}>
                <div className="w-[18px] h-[18px] bg-white/10 rounded shrink-0" />
                <div className="h-3 w-16 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </aside>

        {/* MOBILE TAB BAR SKELETON */}
        <div className="md:hidden w-full px-4 pt-4 animate-pulse">
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex items-center gap-2 px-5 py-3 rounded-2xl border ${i === 1 ? 'bg-orange-500/20 border-orange-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="w-4 h-4 bg-white/10 rounded" />
                <div className="h-2 w-10 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT SKELETON */}
        <main className="flex-1 p-6 space-y-6 w-full min-w-0">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`p-5 rounded-[1.5rem] border backdrop-blur-md ${i === 1 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-white/5 rounded-xl" />
                  <div className="h-8 w-8 bg-white/10 rounded" />
                </div>
                <div className="h-2 w-16 bg-white/5 rounded" />
              </div>
            ))}
          </div>

          {/* Search + filter bar */}
          <div className="flex gap-3 animate-pulse">
            <div className="flex-1 h-[52px] bg-white/[0.02] border border-white/5 rounded-2xl" />
            <div className="w-[52px] h-[52px] bg-white/[0.02] border border-white/5 rounded-2xl" />
          </div>

          {/* Status tabs */}
          <div className="flex gap-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`px-4 py-2.5 rounded-xl border ${i === 1 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="h-2 w-14 bg-white/10 rounded" />
              </div>
            ))}
          </div>

          {/* Item Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] overflow-hidden flex flex-col">
                {/* Image placeholder */}
                <div className="h-28 w-full bg-white/[0.04]" />
                {/* Content */}
                <div className="p-4 space-y-3 flex-1">
                  {/* Status badges */}
                  <div className="flex gap-1.5">
                    <div className="h-4 w-14 bg-yellow-500/10 rounded-md" />
                    <div className="h-4 w-12 bg-orange-500/10 rounded-md" />
                  </div>
                  {/* Title */}
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                  <div className="h-2 w-1/2 bg-white/5 rounded" />
                  {/* Location */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-orange-500/10 rounded-full" />
                    <div className="h-2 w-20 bg-white/5 rounded" />
                  </div>
                  {/* Poster info */}
                  <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg border border-white/5 mt-auto">
                    <div className="w-7 h-7 rounded-full bg-orange-500/10 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-2.5 w-20 bg-white/10 rounded" />
                      <div className="h-2 w-14 bg-white/5 rounded" />
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-lg" />
                    <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-lg" />
                    <div className="w-8 h-8 bg-white/[0.03] border border-white/5 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
