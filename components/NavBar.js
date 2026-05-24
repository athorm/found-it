"use client";
import { Search, Tag, Plus, MessageCircle, User, Shield, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function NavBar({ activePage, onPlusClick }) {
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifUnreadCount, setNotifUnreadCount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [userId, setUserId] = useState(null);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);

    const handlePlusClick = () => {
        if (onPlusClick) {
            onPlusClick();
        } else {
            router.push('/post');
        }
    };

    // Detect desktop viewport
    useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    // Fetch user data (Admin status & Unread messages & Notification count)
    useEffect(() => {
        let isMounted = true;
        let msgChannel;
        let notifChannel;

        const initializeUserData = async () => {
            try {
                // Fetch user once to prevent concurrent lock acquisitions
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) return;

                if (!isMounted) return;

                setUserId(user.id);

                // 1. Check if admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile?.role === 'admin' && isMounted) {
                    setIsAdmin(true);
                }

                // 2. Fetch unread message count
                const fetchUnreadCount = async () => {
                    const { count, error } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('receiver_id', user.id)
                        .eq('is_read', false);

                    if (!error && isMounted) setUnreadCount(count || 0);
                };

                await fetchUnreadCount();

                // 3. Fetch unread notification count
                const fetchNotifCount = async () => {
                    const { count, error } = await supabase
                        .from('notifications')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .eq('is_read', false);

                    if (!error && isMounted) setNotifUnreadCount(count || 0);
                };

                await fetchNotifCount();
                
                if (!isMounted) return;

                // 4. Subscribe to new messages (scoped to this user)
                msgChannel = supabase
                    .channel(`unread-messages-navbar-${Date.now()}`)
                    .on('postgres_changes', { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'messages',
                        filter: `receiver_id=eq.${user.id}`
                    }, () => fetchUnreadCount())
                    .on('postgres_changes', { 
                        event: 'UPDATE', 
                        schema: 'public', 
                        table: 'messages',
                        filter: `receiver_id=eq.${user.id}`
                    }, () => fetchUnreadCount())
                    .subscribe();

                // 5. Subscribe to new notifications (realtime)
                notifChannel = supabase
                    .channel(`notifications-badge-${user.id}-${Date.now()}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    }, () => {
                        // Increment badge count immediately for instant feedback
                        if (isMounted) setNotifUnreadCount(prev => prev + 1);
                    })
                    .subscribe();
            } catch (error) {
                console.error("Error initializing user data in NavBar:", error);
            }
        };

        initializeUserData();

        return () => { 
            isMounted = false;
            if (msgChannel) supabase.removeChannel(msgChannel);
            if (notifChannel) supabase.removeChannel(notifChannel);
        };
    }, []);

    // When dropdown closes, refresh the unread count (some may have been marked as read)
    const handleNotifClose = () => {
        setShowNotifDropdown(false);
        // Re-fetch accurate unread count after user interacts with the dropdown
        if (userId) {
            supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false)
                .then(({ count }) => setNotifUnreadCount(count || 0));
        }
    };

    return (
        <>
            {/* Floating Alert Icon Button (Bottom Right above NavBar) */}
            <div className="fixed bottom-[112px] right-10 z-50 flex flex-col items-end">
                <button
                    id="notif-bell-button"
                    onClick={() => setShowNotifDropdown(prev => !prev)}
                    className="p-3 bg-white/5 border border-white/10 rounded-2xl text-orange-400/70 hover:text-orange-400 hover:bg-white/10 transition-all duration-200 active:scale-95 backdrop-blur-md relative shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
                    aria-label="Alerts"
                >
                    <Bell size={20} />
                    {notifUnreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[#0a0a0a] shadow-lg">
                            {notifUnreadCount > 9 ? '9+' : notifUnreadCount}
                        </span>
                    )}
                </button>
                <NotificationDropdown
                    isOpen={showNotifDropdown}
                    onClose={handleNotifClose}
                    userId={userId}
                />
            </div>

            <nav className="fixed bottom-6 left-6 right-6 h-18 bg-black/50 backdrop-blur-2xl rounded-[2.5rem] border border-orange-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex items-center justify-around px-4 z-50">
                <NavIcon icon={<Search size={22} />} label="Explore" active={activePage === 'home'} href="/Home" />
                <NavIcon icon={<Tag size={22} />} label="Items" active={activePage === 'items'} href="/items" />
                {/* Plus button border options:
                    OPTION A (current): border-orange-900/70 — warm dark-orange, blends with the design
                    OPTION B: border-[#1a0a00] — near-black with a warm tint
                */}
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    className="p-4 rounded-full -translate-y-6 border-4 border-orange-800/70 shadow-[0_0_20px_rgba(249,115,22,0.4)] bg-linear-to-br from-orange-500 to-orange-700 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] active:scale-90 transition-all duration-300"
                    onClick={handlePlusClick}
                >
                    <Plus size={24} color="white" strokeWidth={3} />
                </motion.button>
                <NavIcon icon={<MessageCircle size={22} />} label="Chat" active={activePage === 'chat'} href="/chat" badgeCount={unreadCount} />
                <NavIcon icon={<User size={22} />} label="Profile" active={activePage === 'profile'} href="/Profile" />

                {/* Admin View button — only visible on desktop for admin users */}
                {isAdmin && isDesktop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => router.push('/admin')}
                        className="absolute -top-14 left-4 flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-orange-500/30 transition-all border-2 border-orange-400/50"
                    >
                        <Shield size={14} strokeWidth={3} />
                        Admin View
                    </motion.button>
                )}
            </nav>
        </>
    );
}

function NavIcon({ icon, label, active = false, onClick, href, badgeCount = 0 }) {
    const Component = href ? Link : 'button';
    return (
        <Component 
            href={href} 
            onClick={onClick} 
            className={`flex flex-col items-center gap-1 relative transition-colors duration-200 group active:scale-95 ${active ? 'text-orange-400' : 'text-orange-300/70 hover:text-orange-300/90'}`}
        >
            <div className={`transition-all duration-300 ${active ? 'bg-orange-500/15 p-2 rounded-xl shadow-[inset_0_0_12px_rgba(249,115,22,0.15)]' : 'p-2 group-hover:bg-white/5 rounded-xl'}`}>
                {icon}
                {badgeCount > 0 && (
                    <span className="absolute top-0 right-0 -translate-y-1 translate-x-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[#0a0a0a] shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
        </Component>
    );
}