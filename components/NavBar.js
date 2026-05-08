"use client";
import { Search, Tag, Plus, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NavBar({ activePage, onPlusClick }) {
    const [unreadCount, setUnreadCount] = useState(0);

    const handlePlusClick = () => {
        if (onPlusClick) {
            onPlusClick();
        } else {
            window.location.href = '/post';
        }
    };

    useEffect(() => {
        const fetchUnreadCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            if (!error) setUnreadCount(count || 0);
        };

        fetchUnreadCount();

        // Subscribe to new messages
        const channel = supabase
            .channel('unread-messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages' 
            }, () => fetchUnreadCount())
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'messages' 
            }, () => fetchUnreadCount())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <nav className="fixed bottom-6 left-6 right-6 h-18 bg-black/50 backdrop-blur-2xl rounded-[2.5rem] border border-orange-500/20 shadow-2xl flex items-center justify-around px-4 z-50">
            <NavIcon icon={<Search size={22} />} label="Explore" active={activePage === 'home'} onClick={() => window.location.href = '/Home'} />
            <NavIcon icon={<Tag size={22} />} label="Items" active={activePage === 'items'} onClick={() => window.location.href = '/items'} />
            <motion.button
                whileTap={{ scale: 0.92 }}
                className="p-4 rounded-full -translate-y-6 border-4 border-black shadow-xl shadow-orange-500/40 bg-gradient-to-br from-orange-500 to-orange-700 active:scale-90 transition-transform"
                onClick={handlePlusClick}
            >
                <Plus size={24} color="white" strokeWidth={3} />
            </motion.button>
            <NavIcon icon={<MessageCircle size={22} />} label="Chat" active={activePage === 'chat'} onClick={() => window.location.href = '/chat'} badgeCount={unreadCount} />
            <NavIcon icon={<User size={22} />} label="Profile" active={activePage === 'profile'} onClick={() => window.location.href = '/Profile'} />
        </nav>
    );
}

function NavIcon({ icon, label, active = false, onClick, badgeCount = 0 }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 relative ${active ? 'text-orange-400' : 'text-orange-300/50'}`}>
            <div className={`${active ? 'bg-orange-500/10 p-2 rounded-xl' : ''}`}>
                {icon}
                {badgeCount > 0 && (
                    <span className="absolute top-0 right-0 -translate-y-1 translate-x-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-black shadow-lg">
                        {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
        </button>
    );
}