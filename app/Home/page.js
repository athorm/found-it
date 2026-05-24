"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Info, X, MapPin, Package, Camera, MessageCircle, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemPostModal from "@/components/ItemPostModal";
import MarqueeTitle from "@/components/MarqueeTitle";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { supabase } from "@/lib/supabase";
import { ITEM_CATEGORIES, CATEGORY_EMOJI } from "@/lib/constants";
import HomeLoading from "./loading";

// ─── Dynamic Greeting Engine ───
// Returns a context-aware greeting based on the current hour and day of week.
function getGreeting() {
  const hour = new Date().getHours();
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    if (hour >= 5 && hour < 12) return "Happy weekend morning ☀️";
    if (hour >= 12 && hour < 17) return "Enjoying the weekend? 🎉";
    if (hour >= 17 && hour < 21) return "Weekend evening 🌇";
    return "Late-night weekend? 🌙";
  }

  if (hour >= 5 && hour < 12) return "Good morning ☀️";
  if (hour >= 12 && hour < 17) return "Good afternoon 👋";
  if (hour >= 17 && hour < 21) return "Good evening 🌅";
  return "Burning the midnight oil? 🌙";
}

// Returns an engaging subtitle that rotates based on time/day.
function getSubtitle() {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;

  const pool = isWeekend
    ? [
        "Check if your item has been found this week!",
        "Browse what students have reported recently.",
        "Help someone get their belongings back 🤝",
      ]
    : hour >= 5 && hour < 12
      ? [
          "Start the day by helping someone find their item!",
          "Lost something yesterday? Let's check.",
          "New items are posted every morning 📬",
        ]
      : hour >= 12 && hour < 17
        ? [
            "Lost something on campus? Let's find it.",
            "Someone might have found what you're looking for!",
            "Reuniting items with their owners 🔍",
          ]
        : [
            "Check if your lost item was reported today.",
            "Evening check — any new found items?",
            "Don't forget to check before heading home 🏠",
          ];

  // Pick one based on the day-of-year so it changes daily but stays consistent within a day
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
}

// Time Ago Helper — shared utility (DRY)
import { getTimeAgo } from "@/utils/timeAgo";

// Item categories and emojis now imported from @/lib/constants

// Info modal content — using Lucide icon names for professional SVG rendering
const INFO_SECTIONS = [
  {
    iconComponent: Search,
    title: "Search & Browse",
    body: "Browse Found or Lost items posted by LSPU students. Filter by location or status to narrow your search."
  },
  {
    iconComponent: Camera,
    title: "Post an Item",
    body: "Found something? Tap the + button, snap or upload a photo, fill in the details, and post it instantly."
  },
  {
    iconComponent: MessageCircle,
    title: "Message the Poster",
    body: "See an item that's yours? Open the item card and tap MESSAGE POSTER to start a private conversation."
  },
  {
    iconComponent: CheckCircle,
    title: "Item Retrieved",
    body: "Once you've coordinated with the poster and retrieved the item, press 'Mark as Resolved' inside the chat to confirm the handover. Both users must confirm before the item is marked as retrieved."
  }
];

// ─── Animation Variants ───
// Skeleton-friendly: no y-movement, just a soft fade so content
// appears exactly where the skeleton placeholders were.
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 }
  }
};

const fadeUp = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

const cardVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [recentItems, setRecentItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  
  // Refs for drag constraints calculation
  const categoryScrollRef = useRef(null);
  const [categoryConstraints, setCategoryConstraints] = useState({ left: 0, right: 0 });
  const recentScrollRef = useRef(null);
  const [recentConstraints, setRecentConstraints] = useState({ left: 0, right: 0 });

  // Updated constraints calculation with resize listener and stability delay
  useEffect(() => {
    const updateConstraints = () => {
      if (categoryScrollRef.current) {
        const width = categoryScrollRef.current.scrollWidth - categoryScrollRef.current.offsetWidth;
        setCategoryConstraints({ left: -Math.max(0, width), right: 0 });
      }
      if (recentScrollRef.current) {
        const width = recentScrollRef.current.scrollWidth - recentScrollRef.current.offsetWidth;
        setRecentConstraints({ left: -Math.max(0, width), right: 0 });
      }
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    
    // Multiple checks to handle images loading or layout shifts
    const timers = [
      setTimeout(updateConstraints, 100),
      setTimeout(updateConstraints, 500),
      setTimeout(updateConstraints, 1000)
    ];

    return () => {
      window.removeEventListener('resize', updateConstraints);
      timers.forEach(clearTimeout);
    };
  }, [recentItems]); // Re-run when items change, resize handles the rest
  const router = useRouter();
  const { user, authLoading } = useAuthGuard();

  // Fetch user's name for greeting
  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.full_name) {
        // Handle "LastName, FirstName" or "FirstName LastName" formats
        const name = data.full_name;
        let firstName;
        if (name.includes(',')) {
          // "Tolentino, Juan" → "Juan"
          firstName = name.split(',')[1]?.trim().split(' ')[0];
        }
        if (!firstName) {
          // "Juan Tolentino" → "Juan"  or just "Juan" → "Juan"
          firstName = name.split(' ')[0].replace(/,/g, '');
        }
        setUserName(firstName);
      }
    };
    fetchName();
  }, [user]);

  // Fetch recently reported items (approved only)
  useEffect(() => {
    const fetchRecent = async () => {
      setIsLoadingItems(true);
      const { data } = await supabase
        .from("items")
        .select("id, title, category, location_tag, item_category, status, created_at")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setRecentItems(data);
      setIsLoadingItems(false);
    };
    fetchRecent();
  }, []);

  const handleFileSelected = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setShowPostModal(false);
    router.push(`/post?preview=${encodeURIComponent(previewUrl)}`);
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q) {
      router.push(`/items?search=${encodeURIComponent(q)}`);
    } else {
      router.push("/items");
    }
  };

  // Tapping a category chip navigates to items page with that category pre-selected
  const handleCategoryClick = (categoryValue) => {
    router.push(`/items?item_category=${encodeURIComponent(categoryValue)}`);
  };

  if (authLoading) {
    return <HomeLoading />;
  }

  return (
    <div className="min-h-full pb-40 font-sans selection:bg-orange-500/30 flex flex-col items-center pt-12 relative overflow-hidden">

      {/* ─── Ambient Glow Orb ─── */}
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.10)_0%,rgba(251,146,60,0.04)_40%,transparent_70%)] pointer-events-none animate-pulse [animation-duration:5s]" />
      <div className="absolute top-[60px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(249,115,22,0.08)_0%,transparent_60%)] pointer-events-none blur-2xl" />

      {/* (i) Info button — top right */}
      <button
        onClick={() => setShowInfoModal(true)}
        className="absolute top-6 right-6 p-3 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-orange-400/70 hover:text-orange-400 hover:bg-white/10 transition-all duration-200 backdrop-blur-md cursor-pointer z-10"
        aria-label="About FoundIt"
      >
        <Info size={20} />
      </button>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md md:max-w-5xl px-6 text-center relative z-[1]"
      >
        {/* ─── Logo ─── */}
        <motion.div variants={fadeUp} className="flex justify-center mb-6">
          <img src="/logo2.svg" alt="FoundIt Logo" className="w-24 h-24 mix-blend-screen drop-shadow-[0_0_30px_rgba(249,115,22,0.5)] object-contain" />
        </motion.div>

        {/* ─── User Greeting ─── */}
        {userName ? (
          <motion.div variants={fadeUp} className="flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight drop-shadow-2xl flex flex-wrap justify-center items-center gap-2">
              <span className="text-white/80 font-semibold tracking-wide">{getGreeting()},</span>
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-300 via-orange-400 to-orange-600 whitespace-nowrap">
                {userName}! 👋
              </span>
            </h1>
          </motion.div>
        ) : (
          <motion.h1
            variants={fadeUp}
            className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-amber-300 via-orange-400 to-orange-600 drop-shadow-2xl"
          >
            FoundIt
          </motion.h1>
        )}
        <motion.p variants={fadeUp} className="text-white/60 mt-4 text-sm font-medium">{getSubtitle()}</motion.p>

        {/* ─── Search Bar ─── */}
        <motion.div variants={fadeUp} className="relative group my-8 max-w-sm mx-auto">
          <input
            type="text"
            placeholder="Search items..."
            className="w-full bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-[2rem] py-5 pl-6 pr-16 outline-none focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/10 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-white text-left placeholder:text-white/20 transition-all duration-300 shadow-2xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-600 text-white rounded-[1.2rem] p-3 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200 active:scale-90 shadow-lg shadow-orange-500/30 cursor-pointer"
            aria-label="Search"
          >
            <Search size={18} strokeWidth={3} />
          </button>
        </motion.div>

        {/* ─── Quick Category Chips ─── */}
        <motion.div variants={fadeUp} className="w-full max-w-sm md:max-w-5xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50 mb-3 text-center">Quick Search</p>
          {/* Mobile: horizontal drag scroll */}
          <div className="md:hidden relative -mx-6 px-6 overflow-hidden" ref={categoryScrollRef}>
            <motion.div 
              drag="x"
              dragConstraints={categoryConstraints}
              className="flex gap-3 pb-2 cursor-grab active:cursor-grabbing w-max"
            >
              {ITEM_CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.value}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleCategoryClick(cat.value)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-3 min-h-[44px] bg-white/[0.05] hover:bg-orange-500/15 border border-white/10 hover:border-orange-500/30 rounded-2xl text-[11px] font-bold text-white/50 hover:text-orange-300 transition-all duration-200 whitespace-nowrap cursor-pointer"
                >
                  <span className="text-sm">{cat.emoji}</span>
                  {cat.label}
                </motion.button>
              ))}
            </motion.div>
          </div>
          {/* Desktop: wrapping grid */}
          <div className="hidden md:flex flex-wrap justify-center gap-3 pb-2">
            {ITEM_CATEGORIES.map((cat) => (
              <motion.button
                key={cat.value}
                whileTap={{ scale: 0.92 }}
                whileHover={{ y: -2 }}
                onClick={() => handleCategoryClick(cat.value)}
                className="flex items-center gap-1.5 px-4 py-3 min-h-[44px] bg-white/[0.05] hover:bg-orange-500/15 border border-white/10 hover:border-orange-500/30 rounded-2xl text-xs font-bold text-white/50 hover:text-orange-300 transition-all duration-200 whitespace-nowrap cursor-pointer"
              >
                <span className="text-sm">{cat.emoji}</span>
                {cat.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ─── Recently Reported Feed ─── */}
        {(isLoadingItems || recentItems.length > 0) && (
          <motion.div variants={fadeUp} className="w-full mt-10">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50 mb-4 text-center">
              Recently Reported
            </p>
          </motion.div>
        )}

        {/* Horizontal scroll on mobile, grid on desktop */}
        {isLoadingItems ? (
          <div className="flex gap-4 mt-1 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-6 w-full overflow-hidden">
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
        ) : recentItems.length > 0 && (
          <>
            {/* Mobile: drag scroll */}
            <div className="md:hidden overflow-hidden mt-1 -mx-6 px-6" ref={recentScrollRef}>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                drag="x"
                dragConstraints={recentConstraints}
                className="flex gap-4 pb-4 cursor-grab active:cursor-grabbing w-max"
              >
                {recentItems.map((item) => {
                  const emoji = CATEGORY_EMOJI[item.item_category] || "📦";
                  const isResolved = item.status === "Resolved";
                  const tagLabel = isResolved ? 'Claimed' : 'Unclaimed';
                  const tagColor = isResolved
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-orange-500/10 text-orange-500 border-orange-500/20";
                  const dotColor = isResolved ? "bg-emerald-400" : "bg-orange-500";
                  return (
                    <motion.button
                      key={item.id}
                      variants={cardVariants}
                      onClick={() => router.push(`/items/${item.id}`)}
                      className="shrink-0 w-44 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-4 text-left hover:border-orange-500/40 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer relative overflow-hidden group flex flex-col justify-center"
                    >
                      <div className="w-full flex justify-center mb-3">
                        <div className="bg-orange-500/10 rounded-2xl p-3"><span className="text-3xl">{emoji}</span></div>
                      </div>
                      <div className="mb-2 w-full max-w-[calc(100%-8px)]">
                        <MarqueeTitle text={item.title} className="font-bold text-sm text-white" />
                          <span className="flex items-center gap-1 text-[8px] text-white/50 font-bold tracking-wider mt-1.5 whitespace-nowrap">
                            <Clock size={10} className="opacity-60 shrink-0" />
                            <span>{getTimeAgo(item.created_at)}</span>
                          </span>
                      </div>
                      <div className="flex items-center justify-between w-full mt-1">
                        <div className="flex items-center gap-1 min-w-0 pr-2">
                          <MapPin size={10} className="text-orange-500/50 shrink-0" />
                          <p className="text-[10px] text-white/60 truncate">{item.location_tag}</p>
                        </div>
                        <div className="shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${tagColor}`}>
                            <span className={`w-1 h-1 rounded-full shadow-[0_0_5px_currentColor] ${dotColor}`} />
                            {tagLabel}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            {/* Desktop: responsive grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-4 mt-1 w-full"
            >
              {recentItems.map((item) => {
                const emoji = CATEGORY_EMOJI[item.item_category] || "📦";
                const isResolved = item.status === "Resolved";
                const tagLabel = isResolved ? 'Claimed' : 'Unclaimed';
                const tagColor = isResolved
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-orange-500/10 text-orange-500 border-orange-500/20";
                const dotColor = isResolved ? "bg-emerald-400" : "bg-orange-500";
                return (
                  <motion.button
                    key={item.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(`/items/${item.id}`)}
                    className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-4 text-left hover:border-orange-500/40 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer relative overflow-hidden group flex flex-col justify-center"
                  >
                    <div className="w-full flex justify-center mb-3">
                      <div className="bg-orange-500/10 rounded-2xl p-3"><span className="text-3xl">{emoji}</span></div>
                    </div>
                    <div className="mb-2 w-full max-w-[calc(100%-8px)]">
                      <MarqueeTitle text={item.title} className="font-bold text-sm text-white" />
                        <span className="flex items-center gap-1 text-[8px] text-white/50 font-bold tracking-wider mt-1.5 whitespace-nowrap">
                          <Clock size={10} className="opacity-60 shrink-0" />
                          <span>{getTimeAgo(item.created_at)}</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between w-full mt-1">
                      <div className="flex items-center gap-1 min-w-0 pr-2">
                        <MapPin size={10} className="text-orange-500/50 shrink-0" />
                        <p className="text-[10px] text-white/60 truncate">{item.location_tag}</p>
                      </div>
                      <div className="shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${tagColor}`}>
                          <span className={`w-1 h-1 rounded-full shadow-[0_0_5px_currentColor] ${dotColor}`} />
                          {tagLabel}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}

      </motion.div>

      {/* ─── Info Modal ─── */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-sm max-h-[85vh] flex flex-col bg-[#111] border border-orange-500/20 rounded-[2.5rem] shadow-2xl shadow-orange-900/20 overflow-hidden"
            >
              {/* Gradient header accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600" />

              <div className="p-6 pb-0">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="absolute top-5 right-5 p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors duration-200 z-10 cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="text-center mb-6 shrink-0 flex flex-col items-center">
                  <img src="/logo2.svg" alt="FoundIt Logo" className="w-16 h-16 mix-blend-screen drop-shadow-[0_0_24px_rgba(249,115,22,0.6)] object-contain mb-4" />
                  <h2 className="text-xl font-black text-white tracking-wide">About FoundIt</h2>
                  <p className="text-orange-300/60 text-[10px] mt-1.5 font-black uppercase tracking-widest">LSPU Lost & Found System</p>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto px-6 pb-2 flex-1 min-h-0 relative">
                {INFO_SECTIONS.map((s) => {
                  const IconComp = s.iconComponent;
                  return (
                    <div key={s.title} className="flex gap-3 items-start p-3.5 bg-white/[0.04] rounded-2xl border border-white/5 hover:border-white/10 transition-colors duration-200">
                      <div className="shrink-0 mt-0.5 p-2 bg-orange-500/10 rounded-xl">
                        <IconComp size={16} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="font-black text-xs text-white mb-0.5">{s.title}</p>
                        <p className="text-white/50 text-[11px] leading-relaxed">{s.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 pt-4 shrink-0">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black tracking-widest text-sm transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ItemPostModal
        open={showPostModal}
        onClose={() => setShowPostModal(false)}
        onFileSelect={handleFileSelected}
      />
      {/* Navigation */}
      <NavBar activePage="home" onPlusClick={() => setShowPostModal(true)} />
    </div>
  );
}