"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemPostModal from "@/components/ItemPostModal";

// Info modal content
const INFO_SECTIONS = [
  {
    icon: "🔍",
    title: "Search & Browse",
    body: "Browse Found or Lost items posted by LSPU students. Filter by location or status to narrow your search."
  },
  {
    icon: "📸",
    title: "Post an Item",
    body: "Found something? Tap the + button, snap or upload a photo, fill in the details, and post it instantly."
  },
  {
    icon: "💬",
    title: "Message the Poster",
    body: "See an item that's yours? Open the item card and tap MESSAGE POSTER to start a private conversation."
  },
  {
    icon: "✅",
    title: "Mark as Claimed",
    body: "Once your item is claimed, open it from the Items page and tap MARK AS CLAIMED to resolve it."
  }
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const router = useRouter();

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

  return (
    <div className="min-h-screen text-white pb-60 font-sans selection:bg-orange-500/30 flex flex-col items-center justify-center bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233]">

      {/* (i) Info button — top right */}
      <button
        onClick={() => setShowInfoModal(true)}
        className="absolute top-6 right-6 p-3 bg-white/5 border border-white/10 rounded-2xl text-orange-400/70 hover:text-orange-400 hover:bg-white/10 transition-all backdrop-blur-md"
        aria-label="About FoundIt"
      >
        <Info size={20} />
      </button>

      <div className="w-full max-w-md px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-orange-400 via-orange-500 to-orange-600 drop-shadow-2xl"
        >
          FoundIt
        </motion.h1>
        <motion.p className="text-orange-300/70 mt-4 text-lg font-medium">Reuniting items with owners</motion.p>

        {/* Search bar: navigates to /items?search= on Enter or button click */}
        <div className="relative group my-12">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400" size={20} />
          <input
            type="text"
            placeholder="Search items..."
            className="w-full bg-white/10 backdrop-blur-xl border border-orange-500/30 rounded-3xl py-5 pl-16 pr-16 outline-none focus:ring-4 focus:ring-orange-500/30 text-white placeholder:text-white/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-3 py-1.5 text-xs font-black tracking-widest transition-all active:scale-95"
          >
            GO
          </button>
        </div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#111] border border-orange-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-orange-900/20"
            >
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-5 right-5 p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-8">
                <div className="text-4xl mb-3">🎒</div>
                <h2 className="text-2xl font-black text-white">About FoundIt</h2>
                <p className="text-orange-300/60 text-xs mt-1 font-semibold uppercase tracking-widest">LSPU Lost &amp; Found System</p>
              </div>

              <div className="space-y-5">
                {INFO_SECTIONS.map((s) => (
                  <div key={s.title} className="flex gap-4 items-start p-4 bg-white/[0.04] rounded-2xl border border-white/5">
                    <span className="text-2xl shrink-0">{s.icon}</span>
                    <div>
                      <p className="font-black text-sm text-white mb-0.5">{s.title}</p>
                      <p className="text-white/50 text-xs leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowInfoModal(false)}
                className="mt-8 w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black tracking-widest text-sm transition-all active:scale-95"
              >
                GOT IT
              </button>
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