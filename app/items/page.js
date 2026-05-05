"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Grid, List,
  Clock, AlertCircle, ChevronRight, SlidersHorizontal, MapPin, Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";

export default function ItemsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("found");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [viewUserPosts, setViewUserPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const locations = ['All', 'Shed', 'Activity Center', 'ER Bldg.', 'ENB Bldg.', 'Volleyball Court', 'Basketball Court', 'Admin Bldg.', 'Quadrangle'];
  const statuses = ['All', 'Unclaimed', 'Claimed'];

  const statusMap = { 'Active': 'Unclaimed', 'Resolved': 'Claimed' };
  const reverseStatusMap = { 'Unclaimed': 'Active', 'Claimed': 'Resolved' };

  useEffect(() => { fetchItems(); }, [activeTab]);

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
      setLoading(false);
    }
  };

  const applyFilters = (list) => {
    return list.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = locationFilter === 'All' || (item.location_tag && item.location_tag.includes(locationFilter));
      const dbStatusFilter = reverseStatusMap[statusFilter] || 'All';
      const matchesStatus = statusFilter === 'All' || item.status === dbStatusFilter;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  };

  const currentDisplayList = applyFilters(viewUserPosts ? userItems : items);

  return (
    /* GRADIENT BACKGROUND TO MATCH HOME AND PROFILE PAGES */
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233] text-white pb-32 font-sans">

      {/* CENTERED HEADER WITH LOGO PLACEHOLDER */}
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-xl border-b border-white/5 p-5">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          {/* LOGO AREA - CENTERED */}
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
            animate={{ x: activeTab === 'found' ? 0 : '100%' }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            style={{ width: 'calc(50% - 6px)' }}
          />
          <button onClick={() => setActiveTab('found')} className={`relative z-10 flex-1 py-3 text-xs font-black tracking-widest transition-colors ${activeTab === 'found' ? 'text-white' : 'text-white/30'}`}>FOUND</button>
          <button onClick={() => setActiveTab('lost')} className={`relative z-10 flex-1 py-3 text-xs font-black tracking-widest transition-colors ${activeTab === 'lost' ? 'text-white' : 'text-white/30'}`}>LOST</button>
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
            className={`p-4 rounded-2xl border transition-all ${viewUserPosts ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-white/5 border-white/10 text-white/40'}`}
          >
            <Clock size={22} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-2xl border transition-all ${showFilters ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/10 text-orange-500'}`}
          >
            <SlidersHorizontal size={22} />
          </button>

          {/* OVERLAPPING FILTER DROPDOWN */}
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

        {/* FEED */}
        <motion.div layout className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
          {currentDisplayList.map((item) => (
            <motion.div
              layout
              key={item.id}
              onClick={() => router.push(`/items/${item.id}`)}
              className={`group bg-white/[0.04] border border-white/10 rounded-[2rem] overflow-hidden hover:border-orange-500/40 transition-all duration-300 backdrop-blur-sm shadow-xl ${viewMode === "list" ? "flex p-3 gap-5 items-center" : "flex flex-col"}`}
            >
              <div className={`relative flex-shrink-0 overflow-hidden ${viewMode === "list" ? "w-24 h-24 rounded-2xl" : "aspect-square w-full"}`}>
                <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>

              <div className={`flex-1 ${viewMode === "list" ? "py-1" : "p-5"}`}>
                <div className="flex items-center gap-2 mb-2">
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
              {viewMode === "list" && <ChevronRight size={16} className="text-white/10 mr-2" />}
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Navigation Bar */}
      <NavBar activePage="items" />
    </div>
  );
}