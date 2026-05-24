"use client";
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Grid, List,
  Clock, AlertCircle, ChevronRight, SlidersHorizontal, MapPin, Package, Bookmark, UserCircle, XCircle, X, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemDetailModal from "@/components/ItemDetailModal";
import ItemPostModal from "@/components/ItemPostModal";
import MarqueeTitle from "@/components/MarqueeTitle";
import CustomDateRangePicker from "@/components/CustomDateRangePicker";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { CAMPUS_LOCATIONS_WITH_ALL, ITEM_CATEGORIES } from "@/lib/constants";
import ItemsLoading from "./loading";
import { useDataCache } from "@/lib/dataCache";

// Time Ago Helper — shared utility (DRY)
import { getTimeAgo } from "@/utils/timeAgo";

export default function ItemsPage() {
  const router = useRouter();
  const { user, authLoading } = useAuthGuard();
  const cache = useDataCache();
  const [activeTab, setActiveTab] = useState("lost");
  // SSR-safe default. The correct preference is applied in a useLayoutEffect
  // (see below) which runs before the browser paints — zero flash.
  const [viewMode, setViewMode] = useState("grid");

  // useLayoutEffect fires synchronously during React's commit phase, BEFORE
  // the browser paints. This means viewMode is corrected to the saved
  // preference before any pixel is drawn, eliminating the grid flash entirely.
  // We use a server-safe guard so it silently skips during SSR.
  useLayoutEffect(() => {
    const saved = localStorage.getItem("itemsViewMode");
    if (saved === "list" || saved === "grid") {
      setViewMode(saved);
    }
  }, []);
  const [showFilters, setShowFilters] = useState(false);
  const [viewUserPosts, setViewUserPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // ─── Cache-aware initial state for items ───
  // On mount, synchronously read cache so returning users see data instantly.
  const [items, setItems] = useState(() => {
    const entry = cache.get('items-lost');
    return entry ? entry.data : [];
  });
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(() => {
    const entry = cache.get('items-lost');
    return !entry;
  });

  // ─── Cursor-Based Pagination State ───
  const PAGE_SIZE = 12;
  const [cursor, setCursor] = useState(null);       // created_at of last loaded item
  const [hasMore, setHasMore] = useState(true);      // false when no more pages
  const [loadingMore, setLoadingMore] = useState(false); // true while fetching next page
  const sentinelRef = useRef(null);                  // IntersectionObserver target

  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for drag constraints calculation
  const categoryScrollRef = useRef(null);
  const [categoryConstraints, setCategoryConstraints] = useState({ left: 0, right: 0 });
  const locationScrollRef = useRef(null);
  const [locationConstraints, setLocationConstraints] = useState({ left: 0, right: 0 });

  // Updated constraints calculation with resize listener and stability delay
  useEffect(() => {
    const updateConstraints = () => {
      if (categoryScrollRef.current) {
        const width = categoryScrollRef.current.scrollWidth - categoryScrollRef.current.offsetWidth;
        setCategoryConstraints({ left: -Math.max(0, width), right: 0 });
      }
      if (locationScrollRef.current) {
        const width = locationScrollRef.current.scrollWidth - locationScrollRef.current.offsetWidth;
        setLocationConstraints({ left: -Math.max(0, width), right: 0 });
      }
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    const timers = [setTimeout(updateConstraints, 100), setTimeout(updateConstraints, 500)];

    return () => {
      window.removeEventListener('resize', updateConstraints);
      timers.forEach(clearTimeout);
    };
  }, [showFilters]); // Recalculate when filter panel opens or window resizes

  const handleFileSelected = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setShowPostModal(false);
    router.push(`/post?preview=${encodeURIComponent(previewUrl)}`);
  };

  const locations = CAMPUS_LOCATIONS_WITH_ALL;
  const statuses = ['All', 'Unclaimed', 'Claimed'];

  const statusMap = { 'Active': 'Unclaimed', 'Resolved': 'Claimed' };
  const reverseStatusMap = { 'Unclaimed': 'Active', 'Claimed': 'Resolved' };

  // Read URL params after mount and mark the page as initialized
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search');
    const cat = params.get('item_category');
    if (q) setSearchQuery(q);
    if (cat) {
      setCategoryFilter(cat);
      setShowFilters(true); // auto-open filters when navigating with a category
    }

    // viewMode is already handled by useLayoutEffect above — no read needed here.

    setIsInitialized(true);
  }, []);

  // ─── Debounce search input to prevent rapid re-filtering ───
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state back to URL when filters change
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (categoryFilter === 'All' && params.has('item_category')) {
      params.delete('item_category');
      changed = true;
    } else if (categoryFilter !== 'All' && params.get('item_category') !== categoryFilter) {
      params.set('item_category', categoryFilter);
      changed = true;
    }

    if (!searchQuery && params.has('search')) {
      params.delete('search');
      changed = true;
    } else if (searchQuery && params.get('search') !== searchQuery) {
      params.set('search', searchQuery);
      changed = true;
    }

    if (changed) {
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [categoryFilter, searchQuery, isInitialized, router]);

  // Save view mode preference whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("itemsViewMode", viewMode);
    }
  }, [viewMode, isInitialized]);

  useEffect(() => { fetchItems(false); }, [activeTab]);

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

    // Real-time subscription for item updates (status changes, new inserts, etc.)
    const channel = supabase
      .channel('items-realtime-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items' }, (payload) => {
        const updateList = (prev) => prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item);
        setItems(updateList);
        setUserItems(updateList);
        setSelectedItem(prev => (prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items' }, (payload) => {
        // Prepend newly approved items so the list stays fresh without a full refetch
        if (payload.new?.moderation_status === 'approved') {
          setItems(prev => prev.some(i => i.id === payload.new.id) ? prev : [payload.new, ...prev]);
        }
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

  const fetchItems = async (isLoadMore = false) => {
    let hadCache = false;
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        // Check cache before showing loading state
        const cacheKey = `items-${activeTab}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          // Serve cached data instantly — no skeleton, no loading flash
          hadCache = true;
          setItems(cached.data);
          setLoading(false);
        } else {
          setLoading(true);
        }
        setCursor(null);
        setHasMore(true);
      }

      const formattedCategory = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from("items")
        .select("*")
        .eq("category", formattedCategory)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      // If loading more, apply cursor to get the next batch
      if (isLoadMore && cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error } = await query;
      if (error) throw error;

      const fetched = data || [];

      // Determine if more pages exist
      if (fetched.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Update cursor to the created_at of the last item in this batch
      if (fetched.length > 0) {
        setCursor(fetched[fetched.length - 1].created_at);
      }

      if (isLoadMore) {
        // Append new items, deduplicating by id
        setItems(prev => {
          const ids = new Set(prev.map(i => i.id));
          return [...prev, ...fetched.filter(i => !ids.has(i.id))];
        });
      } else {
        setItems(fetched);
        // Write to cache for instant display on next visit
        cache.set(`items-${activeTab}`, fetched);
      }

      // User items: always filtered from full items array (no separate pagination)
      if (user) {
        if (isLoadMore) {
          setUserItems(prev => {
            const ids = new Set(prev.map(i => i.id));
            const newUserItems = fetched.filter(i => i.user_id === user.id && !ids.has(i.id));
            return [...prev, ...newUserItems];
          });
        } else {
          setUserItems(fetched.filter(item => item.user_id === user.id));
        }
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else if (!hadCache) {
        // Only use the delay when there was NO cache (genuine first load).
        // When cache was used, loading is already false — no need to touch it.
        setTimeout(() => setLoading(false), 100);
      }
    }
  };

  // ─── IntersectionObserver: trigger loadMore when sentinel enters viewport ───
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !viewUserPosts) {
      fetchItems(true);
    }
  }, [loadingMore, hasMore, cursor, activeTab, viewUserPosts]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px' } // Start loading 200px before the user reaches the bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const applyFilters = useCallback((list) => {
    return list.filter(item => {
      const query = debouncedSearchQuery.toLowerCase().trim();
      if (query === 'claimed' || query === 'unclaimed') return false;
      // Search title, description, and item_category
      const matchesSearch = !query || (
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.item_category && item.item_category.toLowerCase().includes(query))
      );
      const matchesLocation = locationFilter === 'All' || (item.location_tag && item.location_tag.includes(locationFilter));
      const dbStatusFilter = reverseStatusMap[statusFilter] || 'All';
      const matchesStatus = statusFilter === 'All' || item.status === dbStatusFilter;
      const matchesCategory = categoryFilter === 'All' || item.item_category === categoryFilter;
      const itemDate = new Date(item.created_at);
      const matchesDateFrom = !dateFrom || itemDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || itemDate <= new Date(dateTo + 'T23:59:59');
      return matchesSearch && matchesLocation && matchesStatus && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [debouncedSearchQuery, locationFilter, statusFilter, categoryFilter, dateFrom, dateTo]);

  const currentDisplayList = useMemo(() => applyFilters(viewUserPosts ? userItems : items), [applyFilters, viewUserPosts, userItems, items]);

  // Check if any filter is active (to show a badge on the filter button)
  const hasActiveFilters = locationFilter !== 'All' || statusFilter !== 'All' || categoryFilter !== 'All' || dateFrom || dateTo;

  const clearAllFilters = () => {
    setLocationFilter('All');
    setStatusFilter('All');
    setCategoryFilter('All');
    setDateFrom('');
    setDateTo('');
  };

  if (authLoading) {
    // viewMode is corrected by useLayoutEffect before the browser paints,
    // so passing it here is safe — no hydration mismatch, no flash.
    return <ItemsLoading viewMode={viewMode} />;
  }

  return (
    <div className="min-h-full font-sans">

      {/* HEADER */}
      {/* SEAMLESS STICKY HEADER AREA */}
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-xl border-b border-white/5 transform-gpu will-change-transform [backface-visibility:hidden]">
        {/* TOPBAR */}
        <div className="py-3 px-5">
          <div className="max-w-6xl mx-auto flex items-center justify-center">
            <div className="flex items-center gap-2">
              <img src="/logo2.svg" alt="FoundIt Logo" className="w-9 h-9 mix-blend-screen drop-shadow-[0_0_15px_rgba(249,115,22,0.6)] object-contain" />
              <span className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-orange-400 via-orange-500 to-orange-600 drop-shadow-[0_0_10px_rgba(249,115,22,0.2)] hidden sm:block">FOUNDIT</span>
            </div>

            <div className="ml-auto">
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                title={`Switch to ${viewMode === "grid" ? "List" : "Grid"} View`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={viewMode}
                    initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                  >
                    {viewMode === "grid" ? <Grid size={18} /> : <List size={18} />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS AREA */}
        <div className="max-w-6xl mx-auto px-6 pt-1 pb-4 space-y-4 relative">
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.15)_0%,transparent_70%)] pointer-events-none blur-xl" />

          {/* TAB SWITCHER */}
          <div className="relative flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 shadow-2xl backdrop-blur-md">
            <motion.div
              className="absolute inset-y-1.5 bg-orange-500 rounded-[1.1rem] shadow-[0_0_30px_rgba(249,115,22,0.4)]"
              animate={{ x: activeTab === 'lost' ? 0 : '100%' }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              style={{ width: 'calc(50% - 6px)' }}
            />
            <button onClick={() => setActiveTab('lost')} className={`relative z-10 flex-1 py-2.5 text-xs font-black tracking-widest transition-colors ${activeTab === 'lost' ? 'text-white' : 'text-white/30'}`}>LOST</button>
            <button onClick={() => setActiveTab('found')} className={`relative z-10 flex-1 py-2.5 text-xs font-black tracking-widest transition-colors ${activeTab === 'found' ? 'text-white' : 'text-white/30'}`}>FOUND</button>
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
                className="w-full bg-white/[0.04] border border-white/10 py-3.5 pl-12 pr-4 min-h-[44px] rounded-2xl outline-none text-sm focus:border-orange-500/50 transition-all placeholder:text-white/40"
              />
            </div>
            <button
              onClick={() => setViewUserPosts(!viewUserPosts)}
              className={`p-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border transition-all gap-2 ${viewUserPosts ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
              title="My Posts"
            >
              <Bookmark size={22} fill={viewUserPosts ? "currentColor" : "none"} />
              {viewUserPosts && <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">My Posts</span>}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl border transition-all ${showFilters ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/10 text-orange-500 hover:bg-white/10'}`}
            >
              <SlidersHorizontal size={22} />
              {/* Active filter indicator dot */}
              {hasActiveFilters && !showFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-[#0a0a0a] shadow-lg" />
              )}
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 z-[100] w-[calc(100vw-3rem)] max-w-[450px] bg-[#121212]/95 border border-white/10 rounded-[2rem] backdrop-blur-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
                >
                  <div className="p-6 space-y-5">
                    {/* Header with clear button */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black">Filters</span>
                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
                          className="flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-400 font-bold transition-colors"
                        >
                          <X size={12} /> Clear all
                        </button>
                      )}
                    </div>

                    {/* Item Category — Horizontal scroll */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black mb-3 block">Item Type</label>
                      <div className="relative overflow-hidden rounded-xl -mx-1">
                        {/* Mobile: horizontal drag scroll */}
                        <div className="md:hidden" ref={categoryScrollRef}>
                          <motion.div
                            drag="x"
                            dragConstraints={categoryConstraints}
                            className="flex gap-2 px-1 pb-2 cursor-grab active:cursor-grabbing w-max"
                          >
                            <button
                              onClick={() => setCategoryFilter('All')}
                              className={`shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${categoryFilter === 'All' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}
                            >
                              All
                            </button>
                            {ITEM_CATEGORIES.map(cat => (
                              <button
                                key={cat.value}
                                onClick={() => setCategoryFilter(cat.value)}
                                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${categoryFilter === cat.value ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}
                              >
                                <span className="text-xs">{cat.emoji}</span>
                                {cat.label}
                              </button>
                            ))}
                          </motion.div>
                        </div>
                        {/* Desktop: wrapping grid */}
                        <div className="hidden md:flex flex-wrap gap-2 px-1 pb-2">
                          <button
                            onClick={() => setCategoryFilter('All')}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${categoryFilter === 'All' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}
                          >
                            All
                          </button>
                          {ITEM_CATEGORIES.map(cat => (
                            <button
                              key={cat.value}
                              onClick={() => setCategoryFilter(cat.value)}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${categoryFilter === cat.value ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}
                            >
                              <span className="text-xs">{cat.emoji}</span>
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black mb-3 block">Location</label>
                      <div className="relative overflow-hidden rounded-xl -mx-1">
                        {/* Mobile: horizontal drag scroll */}
                        <div className="md:hidden" ref={locationScrollRef}>
                          <motion.div
                            drag="x"
                            dragConstraints={locationConstraints}
                            className="flex gap-2 px-1 pb-2 cursor-grab active:cursor-grabbing w-max"
                          >
                            {locations.map(loc => (
                              <button key={loc} onClick={() => setLocationFilter(loc)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${locationFilter === loc ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}>{loc}</button>
                            ))}
                          </motion.div>
                        </div>
                        {/* Desktop: wrapping grid */}
                        <div className="hidden md:flex flex-wrap gap-2 px-1 pb-2">
                          {locations.map(loc => (
                            <button key={loc} onClick={() => setLocationFilter(loc)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${locationFilter === loc ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/60'}`}>{loc}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black mb-3 block">Status</label>
                      <div className="flex gap-2">
                        {statuses.map(stat => (
                          <button key={stat} onClick={() => setStatusFilter(stat)} className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${statusFilter === stat ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/5 text-white/60'}`}>{stat}</button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black mb-3 block">Date Posted</label>
                      <CustomDateRangePicker
                        dateFrom={dateFrom} setDateFrom={setDateFrom}
                        dateTo={dateTo} setDateTo={setDateTo}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active filter chips — shown below controls */}
          <AnimatePresence>
            {hasActiveFilters && !showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2"
              >
                {categoryFilter !== 'All' && (
                  <button
                    onClick={() => setCategoryFilter('All')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all"
                  >
                    {ITEM_CATEGORIES.find(c => c.value === categoryFilter)?.emoji} {categoryFilter}
                    <X size={10} className="opacity-60" />
                  </button>
                )}
                {locationFilter !== 'All' && (
                  <button
                    onClick={() => setLocationFilter('All')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all"
                  >
                    <MapPin size={10} /> {locationFilter}
                    <X size={10} className="opacity-60" />
                  </button>
                )}
                {statusFilter !== 'All' && (
                  <button
                    onClick={() => setStatusFilter('All')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all"
                  >
                    {statusFilter}
                    <X size={10} className="opacity-60" />
                  </button>
                )}
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all"
                  >
                    <Calendar size={10} /> {dateFrom || '...'} — {dateTo || '...'}
                    <X size={10} className="opacity-60" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-40">

        {/* CONTENT AREA WITH LOADING & ANIMATION[cite: 3] */}
        <div className="relative min-h-[400px] pt-6">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-4"}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  viewMode === "grid" ? (
                    <div key={i} className="bg-white/[0.04] border border-white/10 rounded-[2.2rem] overflow-hidden animate-pulse flex flex-col">
                      <div className="aspect-square w-full bg-white/[0.04]" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 w-3/4 bg-white/10 rounded" />
                        <div className="h-2 w-1/2 bg-white/5 rounded" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-white/5 rounded-full" />
                          <div className="h-2 w-1/3 bg-white/5 rounded" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex p-3 gap-5 items-center bg-white/[0.04] border border-white/10 rounded-[2.2rem] animate-pulse">
                      <div className="w-24 h-24 rounded-[1.5rem] bg-white/[0.04] shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-3/4 bg-white/10 rounded" />
                        <div className="h-2 w-1/2 bg-white/5 rounded" />
                        <div className="h-2 w-1/3 bg-white/5 rounded" />
                      </div>
                    </div>
                  )
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`list-${viewMode}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-4"}
              >
                <AnimatePresence mode="popLayout">
                  {currentDisplayList.length > 0 ? (
                    currentDisplayList.map((item, index) => (
                      <motion.div
                        layout="position"
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}

                        // iOS-STYLE TACTILE INTERACTION
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ y: -4 }}

                        onClick={() => handleItemClick(item)}
                        className={`group relative bg-white/[0.04] border border-white/10 rounded-[2.2rem] overflow-hidden hover:border-orange-500/40 transition-colors duration-300 backdrop-blur-sm shadow-xl cursor-pointer active:bg-white/[0.08] ${viewMode === "list" ? "flex p-3 gap-5 items-center" : "flex flex-col"
                          }`}
                      >
                        <div className={`relative shrink-0 overflow-hidden ${viewMode === "list" ? "w-24 h-24 rounded-[1.5rem]" : "aspect-square w-full"
                          }`}>
                          <img
                            src={item.image_url}
                            alt={item.title || "Item image"}
                            loading={index < 4 ? "eager" : "lazy"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />

                          {/* iOS-STYLE OVERLAY SHIMMER ON HOVER */}
                          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {/* Item category badge on image (grid only) */}
                          {viewMode === "grid" && item.item_category && item.item_category !== 'Other' && (
                            <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/70">
                              {ITEM_CATEGORIES.find(c => c.value === item.item_category)?.emoji} {item.item_category}
                            </span>
                          )}

                          {/* Status badge on image (grid only) */}
                          {viewMode === "grid" && (
                            <div className="absolute bottom-3 left-3">
                              {(() => {
                                const isResolved = item.status === 'Resolved';
                                const tagLabel = isResolved ? 'Claimed' : 'Unclaimed';
                                const tagColor = isResolved
                                  ? 'bg-black/60 text-emerald-400 border-white/10 backdrop-blur-md'
                                  : 'bg-black/60 text-orange-400 border-white/10 backdrop-blur-md';
                                const dotColor = isResolved ? 'bg-emerald-400' : 'bg-orange-500';
                                return (
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[7px] font-black uppercase tracking-widest ${tagColor}`}>
                                    <span className={`w-1 h-1 rounded-full shadow-[0_0_5px_currentColor] ${dotColor}`} />
                                    {tagLabel}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        <div className={`flex-1 min-w-0 flex flex-col justify-center ${viewMode === "list" ? "py-1 pr-2" : "p-5"}`}>
                          <div className="flex items-start justify-between mb-1 w-full">
                            <div className="flex-1 min-w-0 mr-2 mt-0.5">
                              <MarqueeTitle text={item.title} className="font-bold text-sm tracking-tight text-white/90" />
                              <span className="flex items-center gap-1 text-[8px] text-white/50 font-bold tracking-wider mt-1.5 whitespace-nowrap">
                                <Clock size={10} className="opacity-60 shrink-0" />
                                <span>{getTimeAgo(item.created_at)}</span>
                              </span>
                            </div>

                            {/* Status Tag (List view only) */}
                            {viewMode === "list" && (
                              <div className="shrink-0">
                                {(() => {
                                  const isResolved = item.status === 'Resolved';
                                  const tagLabel = isResolved ? 'Claimed' : 'Unclaimed';
                                  const tagColor = isResolved
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                                  const dotColor = isResolved ? 'bg-emerald-400' : 'bg-orange-500';
                                  return (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[7px] font-black uppercase tracking-widest ${tagColor}`}>
                                      <span className={`w-1 h-1 rounded-full shadow-[0_0_5px_currentColor] ${dotColor}`} />
                                      {tagLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Moderation badge — only shown for the user's own pending/rejected posts */}
                          {viewUserPosts && item.moderation_status && item.moderation_status !== 'approved' && (
                            <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit ${item.moderation_status === 'pending'
                                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                              }`}>
                              {item.moderation_status === 'pending'
                                ? <><Clock size={10} /> Pending Review</>
                                : <><XCircle size={10} /> Rejected</>
                              }
                            </div>
                          )}

                          {/* Category tag (list view) */}
                          {viewMode === "list" && item.item_category && item.item_category !== 'Other' && (
                            <span className="text-[8px] font-bold text-orange-400/60 uppercase tracking-widest mb-1 block">
                              {ITEM_CATEGORIES.find(c => c.value === item.item_category)?.emoji} {item.item_category}
                            </span>
                          )}

                          <div className="flex items-center gap-1.5 text-white/50">
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

          {/* ─── Infinite Scroll Sentinel & Loading Indicator ─── */}
          {!loading && !viewUserPosts && hasMore && currentDisplayList.length > 0 && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                  <p className="text-[9px] font-black tracking-widest text-orange-500/30 uppercase">Loading more...</p>
                </div>
              )}
            </div>
          )}

          {/* End-of-list indicator */}
          {!loading && !viewUserPosts && !hasMore && currentDisplayList.length > PAGE_SIZE && (
            <div className="flex justify-center py-6">
              <p className="text-[9px] font-black tracking-widest text-white/15 uppercase">All items loaded</p>
            </div>
          )}
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
