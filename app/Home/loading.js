export default function HomeLoading() {
  return (
    <div className="min-h-full pb-40 font-sans selection:bg-orange-500/30 flex flex-col items-center pt-12 relative overflow-hidden">
      {/* ─── Ambient Glow Orb (Skeleton) ─── */}
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.10)_0%,rgba(251,146,60,0.04)_40%,transparent_70%)] pointer-events-none animate-pulse [animation-duration:5s]" />
      
      <div className="w-full max-w-md md:max-w-5xl px-6 text-center relative z-[1]">
        {/* Logo skeleton */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-white/5 rounded-3xl animate-pulse" />
        </div>

        {/* Greeting skeleton */}
        <div className="flex flex-col items-center justify-center">
          <div className="h-3 w-32 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse mb-6" />
          <div className="h-3 w-64 bg-white/5 rounded animate-pulse" />
        </div>

        {/* Search Bar skeleton */}
        <div className="relative my-8 max-w-sm mx-auto">
          <div className="w-full h-[66px] bg-white/[0.03] border border-white/5 rounded-[2rem] animate-pulse" />
        </div>

        {/* Categories skeleton */}
        <div className="w-full max-w-sm md:max-w-5xl mx-auto mt-6">
          <div className="h-2 w-24 bg-white/10 rounded mx-auto mb-5 animate-pulse" />
          <div className="flex gap-3 pb-2 overflow-hidden justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[44px] w-24 bg-white/[0.03] border border-white/5 rounded-2xl animate-pulse shrink-0" />
            ))}
          </div>
        </div>

        {/* Recent Items skeleton */}
        <div className="w-full mt-10">
          <div className="h-2 w-32 bg-white/10 rounded mx-auto mb-6 animate-pulse" />
          
          <div className="flex gap-4 overflow-hidden mt-1 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-6 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="shrink-0 w-44 md:w-auto h-40 bg-white/[0.03] border border-white/5 rounded-3xl p-4 animate-pulse flex flex-col justify-center">
                <div className="w-full flex justify-center mb-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl" />
                </div>
                <div className="h-4 w-3/4 bg-white/10 rounded mx-auto mb-2" />
                <div className="h-2 w-1/2 bg-white/5 rounded mx-auto mb-4" />
                <div className="flex justify-between items-center mt-auto">
                  <div className="h-2 w-1/3 bg-white/5 rounded" />
                  <div className="h-3 w-10 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
