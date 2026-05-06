"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Tag, Plus, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemPostModal from "@/components/ItemPostModal";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const router = useRouter();

  const handleFileSelected = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setShowPostModal(false);
    router.push(`/post?preview=${encodeURIComponent(previewUrl)}`);
  };

  return (
    <div className="min-h-screen text-white pb-60 font-sans selection:bg-orange-500/30 flex flex-col items-center justify-center bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233]">

      <div className="w-full max-w-md px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-orange-400 via-orange-500 to-orange-600 drop-shadow-2xl"
        >
          FoundIt
        </motion.h1>
        <motion.p className="text-orange-300/70 mt-4 text-lg font-medium">Reuniting items with owners</motion.p>

        <div className="relative group my-12">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400" size={20} />
          <input
            type="text"
            placeholder="Search items..."
            className="w-full bg-white/10 backdrop-blur-xl border border-orange-500/30 rounded-3xl py-5 pl-16 pr-6 outline-none focus:ring-4 focus:ring-orange-500/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

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