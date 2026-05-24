export default function ProfileLoading() {
  return (
    <div className="min-h-screen pb-20 font-sans text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-white/5 px-6 pt-4 pb-6 flex items-center justify-between">
        <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse shrink-0" />
        <div className="h-8 w-28 bg-white/10 rounded animate-pulse" />
        <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse shrink-0" />
      </div>

      <main className="px-6 mt-8 max-w-lg mx-auto space-y-6">
        {/* Profile Card Skeleton */}
        <div className="rounded-[2.5rem] bg-orange-500/[0.03] backdrop-blur-xl border border-orange-500/20 p-8 flex flex-col items-center animate-pulse">
          {/* Avatar */}
          <div className="w-36 h-36 rounded-full bg-white/5 mb-6" />
          
          {/* Text Info */}
          <div className="space-y-4 w-full flex flex-col items-center">
            <div className="h-8 w-48 bg-white/10 rounded-xl" />
            <div className="h-6 w-40 bg-white/5 rounded-full" />
            <div className="space-y-2 mt-4 flex flex-col items-center w-full">
              <div className="h-4 w-32 bg-white/10 rounded" />
              <div className="h-3 w-48 bg-white/5 rounded" />
            </div>
          </div>
        </div>

        {/* Menu Sections Skeletons */}
        <div className="rounded-3xl bg-white/[0.02] backdrop-blur-md border border-white/5 overflow-hidden animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="w-full flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl shrink-0" />
                <div className="h-4 w-32 bg-white/10 rounded" />
              </div>
              <div className="w-5 h-5 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* Danger Zone Skeleton */}
        <div className="rounded-3xl bg-red-500/[0.02] backdrop-blur-md border border-red-500/10 overflow-hidden animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="w-full flex items-center justify-between px-6 py-5 border-b border-red-500/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl shrink-0" />
                <div className="h-4 w-32 bg-white/10 rounded" />
              </div>
              <div className="w-5 h-5 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
