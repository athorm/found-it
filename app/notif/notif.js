"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

const MAX_NOTIFICATIONS = 3;
const AUTO_DISMISS_TIME = 5000;

export default function NotificationListener() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const channelRef = useRef(null);
  const dismissTimersRef = useRef(new Map());

  useEffect(() => {
    let mounted = true;
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setUser(user);
    };
    getUser();
    return () => { mounted = false; };
  }, []);

  // Auto-dismiss: set a timer for each notification individually
  // This avoids the stale closure bug where only the last notification
  // gets a timer and earlier ones never auto-dismiss.
  const scheduleDismiss = useCallback((notifId) => {
    // Clear any existing timer for this notification
    if (dismissTimersRef.current.has(notifId)) {
      clearTimeout(dismissTimersRef.current.get(notifId));
    }
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      dismissTimersRef.current.delete(notifId);
    }, AUTO_DISMISS_TIME);
    dismissTimersRef.current.set(notifId, timer);
  }, []);

  // Cleanup all dismiss timers on unmount
  useEffect(() => {
    return () => {
      dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
      dismissTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Use unique channel name per mount to avoid Supabase reusing a
    // stale/partially-torn-down channel from a previous mount cycle.
    // This is the root cause of notifications not appearing after
    // navigating away from /chat and back.
    const channel = supabase
      .channel(`notif-popup-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          if (!payload?.new) return;
          const message = payload.new;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', message.sender_id)
            .single();
          
          const senderName = profile?.full_name || "Someone";

          const notifId = `${message.id}-${Date.now()}`;
          const nextNotification = {
            id: notifId,
            chatId: message.chat_id,
            senderName: senderName,
            body: message.content || "Sent a message",
          };

          setNotifications((prev) => [nextNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
          scheduleDismiss(notifId);
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, scheduleDismiss]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Also clear the auto-dismiss timer
    if (dismissTimersRef.current.has(id)) {
      clearTimeout(dismissTimersRef.current.get(id));
      dismissTimersRef.current.delete(id);
    }
  };

  const handleOpenChat = (chatId, notificationId) => {
    if (!chatId) return;
    dismissNotification(notificationId);
    // Directly navigate to the specific chat ID
    router.push(`/chat?id=${chatId}`);
  };

  return (
    /* POSITIONING: Moved to top center with top-6 and left-1/2 -translate-x-1/2 */
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none w-[calc(100%-32px)] max-w-[400px] items-center">
      <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            /* ANIMATION: Slides down from top (y: -50) */
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            onClick={() => handleOpenChat(notification.chatId, notification.id)}
            className="group pointer-events-auto relative w-full rounded-3xl border border-orange-500/20 bg-black/90 p-4 text-left text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:bg-white/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-2xl bg-orange-500/10 p-2 shrink-0">
                  <MessageCircle size={18} className="text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{notification.senderName}</p>
                  <p className="mt-0.5 truncate text-xs text-white/70">{notification.body}</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dismissNotification(notification.id);
                }}
                className="text-white/50 hover:text-white p-1 transition-colors shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      </MotionConfig>
    </div>
  );
}