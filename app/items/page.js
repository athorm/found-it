"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Grid, List,
  Clock, AlertCircle, ChevronRight, SlidersHorizontal, MapPin, Package, Bookmark, UserCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemDetailModal from "@/components/ItemDetailModal";
import ItemPostModal from "@/components/ItemPostModal";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ItemsPage() {
  const router = useRouter();
  const { user, authLoading } = useAuthGuard();
  const [activeTab, setActiveTab] = useState("lost");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [viewUserPosts, setViewUserPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const handleFileSelected = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setShowPostModal(false);
    router.push(`/post?preview=${encodeURIComponent(previewUrl)}`);
  };

  const locations = ['All', 'Shed', 'Activity Center', 'ER Bldg.', 'ENB Bldg.', 'Volleyball Court', 'Basketball Court', 'Admin Bldg.', 'Quadrangle'];
  const statuses = ['All', 'Unclaimed', 'Claimed'];

  const statusMap = { 'Active': 'Unclaimed', 'Resolved': 'Claimed' };
  const reverseStatusMap = { 'Unclaimed': 'Active', 'Claimed': 'Resolved' };

  // Read ?search= from URL on mount (e.g. navigating from Home page search bar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search');
    if (q) setSearchQuery(q);
  }, []);

  useEffect(() => { fetchItems(); }, [activeTab]);

  // Called by ItemDetailModal after a status toggle — keeps list in sync without refetch
  const handleStatusUpdate = (itemId, newStatus) => {
    const patch = (list) => list.map(i => i.id === itemId ? { ...i, status: newStatus } : i);
    setItems(patch);
    setUserItems(patch);
    if (selectedItem?.id === itemId) setSelectedItem(prev => ({ ...prev, status: newStatus }));
  };

  const handleItemDeleted = (itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    setUserItems(prev => prev.filter(i => i.id !== itemId));
    setSelectedItem(null);
  };

  useEffect(() => {
    window.onItemDeleted = handleItemDeleted;

    // Real-time subscription for item updates (status changes, etc.)
    const channel = supabase
      .channel('items-realtime-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items' }, (payload) => {
        const updateList = (prev) => prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item);
        setItems(updateList);
        setUserItems(updateList);
        setSelectedItem(prev => (prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, (payload) => {
        handleItemDeleted(payload.old.id);
      })
      .subscribe();

    return () => {
      delete window.onItemDeleted;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const formattedCategory = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("category", formattedCategory)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
      if (user) setUserItems(data?.filter(item => item.user_id === user.id) || []);
    } finally {
      // Small delay ensures the grid doesn't flicker during rapid state updates[cite: 3]
      setTimeout(() => setLoading(false), 100);
    }
  };

  const applyFilters = (list) => {
    return list.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      if (query === 'claimed' || query === 'unclaimed') return false;
      // Only search via title. If query is "claimed" or "unclaimed", it won't match status.
      const matchesSearch = !query || (item.title && item.title.toLowerCase().includes(query));
      const matchesLocation = locationFilter === 'All' || (item.location_tag && item.location_tag.includes(locationFilter));
      const dbStatusFilter = reverseStatusMap[statusFilter] || 'All';
      const matchesStatus = statusFilter === 'All' || item.status === dbStatusFilter;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  };

  const currentDisplayList = applyFilters(viewUserPosts ? userItems : items);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233] text-white pb-32 font-sans">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-xl border-b border-white/5 p-5">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]">
              <Package size={18} className="text-black" strokeWidth={3} />
            </div>
            <span className="text-lg font-black tracking-widest text-orange-500 hidden sm:block">FOUNDIT</span>
          </div>

          <div className="ml-auto flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]" : "text-white/30"}`}><Grid size={18} /></button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]" : "text-white/30"}`}><List size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-6 space-y-6">

        {/* TAB SWITCHER */}
        <div className="relative flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 shadow-2xl backdrop-blur-md">
          <motion.div
            className="absolute inset-y-1.5 bg-orange-500 rounded-[1.1rem] shadow-[0_0_30px_rgba(249,115,22,0.4)]"
            animate={{ x: activeTab === 'lost' ? 0 : '100%' }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{ width: 'calc(50% - 6px)' }}
          />
          <button onClick={() => setActiveTab('lost')} className={`relative z-10 flex-1 py-3 text-xs font-black tracking-widest transition-colors ${activeTab === 'lost' ? 'text-white' : 'text-white/30'}`}>LOST</button>
          <button onClick={() => setActiveTab('found')} className={`relative z-10 flex-1 py-3 text-xs font-black tracking-widest transition-colors ${activeTab === 'found' ? 'text-white' : 'text-white/30'}`}>FOUND</button>
        </div>

        {/* CONTROLS */}
        <div className="relative flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={20} />
            <input
              type="text"
              placeholder={`Search ${activeTab} items...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 py-4 pl-12 pr-4 rounded-2xl outline-none text-sm focus:border-orange-500/50 transition-all placeholder:text-white/20"
            />
          </div>
          <button
            onClick={() => setViewUserPosts(!viewUserPosts)}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-2 ${viewUserPosts ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-white/5 border-white/10 text-white/40'}`}
            title="My Posts"
          >
            <Bookmark size={22} fill={viewUserPosts ? "currentColor" : "none"} />
            {viewUserPosts && <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">My Posts</span>}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-2xl border transition-all ${showFilters ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/10 text-orange-500'}`}
          >
            <SlidersHorizontal size={22} />
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full right-0 mt-2 z-50 w-80 bg-[#121212]/95 border border-white/10 rounded-[2rem] backdrop-blur-2xl shadow-2xl"
              >
                <div className="p-6 space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black mb-4 block">Location</label>
                    <div className="flex flex-wrap gap-2">
                      {locations.map(loc => (
                        <button key={loc} onClick={() => setLocationFilter(loc)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${locationFilter === loc ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/5 text-white/40'}`}>{loc}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black mb-4 block">Status</label>
                    <div className="flex gap-2">
                      {statuses.map(stat => (
                        <button key={stat} onClick={() => setStatusFilter(stat)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${statusFilter === stat ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/5 text-white/40'}`}>{stat}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONTENT AREA WITH LOADING & ANIMATION[cite: 3] */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center pt-20 space-y-4"
              >
                <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black tracking-widest text-orange-500/40 uppercase">Fetching items...</p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                layout
                className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}
              >
                <AnimatePresence mode="popLayout">
                  {currentDisplayList.length > 0 ? (
                    currentDisplayList.map((item, index) => (
                      <motion.div
                        layout
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: {
                            delay: index * 0.05,
                            duration: 0.4,
                            ease: [0.23, 1, 0.32, 1]
                          }
                        }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}

                        // iOS-STYLE TACTILE INTERACTION
                        whileTap={{ scale: 0.96 }} // Subtle shrink on tap
                        whileHover={{ y: -4 }} // Gentle lift-up instead of scaling out

                        onClick={() => handleItemClick(item)}
                        className={`group bg-white/[0.04] border border-white/10 rounded-[2.2rem] overflow-hidden hover:border-orange-500/40 transition-colors duration-300 backdrop-blur-sm shadow-xl cursor-pointer active:bg-white/[0.08] ${viewMode === "list" ? "flex p-3 gap-5 items-center" : "flex flex-col"
                          }`}
                      >
                        <div className={`relative flex-shrink-0 overflow-hidden ${viewMode === "list" ? "w-24 h-24 rounded-[1.5rem]" : "aspect-square w-full"
                          }`}>
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />

                          {/* iOS-STYLE OVERLAY SHIMMER ON HOVER */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        <div className={`flex-1 ${viewMode === "list" ? "py-1" : "p-5"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-sm tracking-tight line-clamp-1">{item.title}</h3>
                            <span className="text-[7px] font-black uppercase text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                              {statusMap[item.status] || item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/30">
                            <MapPin size={10} className="text-orange-500" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{item.location_tag}</span>
                          </div>
                        </div>

                        {viewMode === "list" && (
                          <ChevronRight size={16} className="text-white/10 mr-2 group-hover:text-orange-500 transition-colors" />
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      key="empty-state"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="col-span-2 flex flex-col items-center justify-center py-20 text-white/20"
                    >
                      <Package size={48} strokeWidth={1} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        {viewUserPosts ? "You haven't posted any items yet" : `No ${activeTab} items found`}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ItemDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdate={handleStatusUpdate}
      />

      <ItemPostModal
        open={showPostModal}
        onClose={() => setShowPostModal(false)}
        onFileSelect={handleFileSelected}
      />

      <NavBar activePage="items" onPlusClick={() => setShowPostModal(true)} />
    </div>
  );
}
