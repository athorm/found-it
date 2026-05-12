"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Package, X, XCircle, CheckCircle, Trash2, CheckSquare } from "lucide-react";

const NOTIFICATION_ICONS = {
  item_approved: <CheckCircle size={16} className="text-green-400" />,
  item_rejected: <XCircle size={16} className="text-red-400" />,
  item_resolved: <Package size={16} className="text-orange-400" />,
};

export default function NotificationDropdown({ isOpen, onClose, userId }) {
  const router = useRouter();
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  // Long-press detection
  const longPressTimer = useRef(null);
  const LONG_PRESS_MS = 500;

  // ─── Reset select mode when dropdown closes ───
  useEffect(() => {
    if (!isOpen) {
      setSelectMode(false);
      setSelected(new Set());
    }
  }, [isOpen]);

  // ─── Fetch notifications on open ───
  useEffect(() => {
    if (!isOpen || !userId) return;
    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) setNotifications(data);
      setLoading(false);
    };
    fetchNotifications();
  }, [isOpen, userId]);

  // ─── Close on outside click ───
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (e.target.closest("#notif-bell-button")) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  // ─── Long press handlers ───
  const startLongPress = useCallback((id) => {
    longPressTimer.current = setTimeout(() => {
      setSelectMode(true);
      setSelected(new Set([id]));
    }, LONG_PRESS_MS);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ─── Select toggle ───
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Delete helpers ───
  const handleDelete = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    await supabase.from("notifications").delete().eq("id", id);
  };

  const handleDeleteSelected = async () => {
    const ids = [...selected];
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setSelected(new Set());
    setSelectMode(false);
    await supabase.from("notifications").delete().in("id", ids);
  };

  // ─── Mark as read ───
  const markAsRead = async (id) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notification) => {
    if (selectMode) { toggleSelect(notification.id); return; }
    markAsRead(notification.id);
    if (notification.related_item_id) router.push(`/items/${notification.related_item_id}`);
    onClose();
  };

  const formatTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="fixed sm:absolute bottom-[165px] sm:bottom-full mb-3 left-4 right-4 sm:left-auto sm:right-0 w-auto sm:w-[320px] max-h-[60vh] sm:max-h-[420px] flex flex-col bg-[#111]/95 backdrop-blur-2xl border border-orange-500/20 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden z-[999]"
        >
          {/* ─── Header ─── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-orange-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                {selectMode ? `${selected.size} Selected` : "Notifications"}
              </h3>
              {!selectMode && unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] bg-orange-500 text-white text-[9px] font-black flex items-center justify-center rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {selectMode ? (
                <>
                  {selected.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                    className="p-1 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-orange-400/70 hover:text-orange-400 transition-colors rounded-lg hover:bg-white/5"
                      title="Mark all as read"
                    >
                      <CheckCheck size={12} />
                      <span className="hidden sm:inline">Read all</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ─── Select all bar (shown in select mode) ─── */}
          <AnimatePresence>
            {selectMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden shrink-0"
              >
                <button
                  onClick={() =>
                    setSelected(
                      selected.size === notifications.length
                        ? new Set()
                        : new Set(notifications.map((n) => n.id))
                    )
                  }
                  className="w-full px-5 py-2 text-left text-[10px] font-bold text-orange-400/60 hover:text-orange-400 hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <CheckSquare size={12} />
                  {selected.size === notifications.length ? "Deselect all" : "Select all"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── List ─── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/20">
                <Bell size={32} strokeWidth={1} className="mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest">No notifications yet</p>
              </div>
            ) : (
              <motion.div layout className="py-1 overflow-x-hidden">
                <AnimatePresence initial={false}>
                  {notifications.map((notification, index) => {
                    const isSelected = selected.has(notification.id);
                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        className="relative overflow-hidden border-b border-white/5 last:border-0"
                      >
                        {/* Delete background revealed on swipe-right */}
                        <div className="absolute inset-0 bg-red-500/10 border-l-[3px] border-red-500/30 flex items-center justify-start px-6 z-0">
                          <Trash2 size={20} className="text-red-500 drop-shadow-md" />
                        </div>

                        {/* Swipeable foreground */}
                        <motion.div
                          drag={selectMode ? false : "x"}
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.4}
                          onDragEnd={(e, info) => {
                            if (info.offset.x > 80) handleDelete(notification.id);
                          }}
                          onPointerDown={() => !selectMode && startLongPress(notification.id)}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                          onClick={() => handleNotificationClick(notification)}
                          className={`relative z-10 w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors duration-200 cursor-pointer select-none ${
                            isSelected
                              ? "bg-orange-500/15 border-l-2 border-orange-500"
                              : !notification.is_read
                              ? "bg-[#181818] border-l-2 border-orange-500 hover:bg-[#202020]"
                              : "bg-[#111] border-l-2 border-transparent hover:bg-white/5"
                          }`}
                        >
                          {/* Checkbox in select mode */}
                          {selectMode && (
                            <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected ? "bg-orange-500 border-orange-400" : "border-white/20"
                            }`}>
                              {isSelected && <CheckCircle size={10} className="text-white" />}
                            </div>
                          )}

                          {/* Icon */}
                          {!selectMode && (
                            <div className="shrink-0 mt-0.5 rounded-xl bg-white/5 p-2 pointer-events-none">
                              {NOTIFICATION_ICONS[notification.type] || (
                                <Bell size={16} className="text-white/40" />
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0 pointer-events-none">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`text-[11px] font-black truncate ${
                                !notification.is_read ? "text-white" : "text-white/60"
                              }`}>
                                {notification.title}
                              </p>
                              {!notification.is_read && !selectMode && (
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2">
                              {notification.body}
                            </p>
                            <p className="text-[9px] text-white/20 mt-1 font-bold">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* ─── Hint bar ─── */}
          {!selectMode && notifications.length > 0 && (
            <div className="shrink-0 px-5 py-2.5 border-t border-white/5 text-center">
              <p className="text-[9px] text-white/15 font-bold uppercase tracking-widest">
                Long press to select • Swipe right to delete
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
