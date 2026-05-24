export default function ChatLoading() {
  return (
    <div className="min-h-screen text-white flex flex-col font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse shrink-0" />
          <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        
        {/* Chat List Skeletons */}
        <div className="px-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-full bg-orange-500/[0.03] backdrop-blur-md border border-orange-500/20 rounded-3xl p-4 flex items-center gap-4 animate-pulse">
              {/* Avatar */}
              <div className="w-14 h-14 bg-white/5 rounded-full shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                {/* Name and time */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-white/10 rounded" />
                  <div className="h-2 w-8 bg-white/5 rounded shrink-0" />
                </div>
                {/* Last message */}
                <div className="h-3 w-48 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
