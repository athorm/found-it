"use client";
import { Search, Tag, Plus, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";


export default function NavBar({ activePage, onPlusClick }) {
    const handlePlusClick = () => {
        if (onPlusClick) {
            onPlusClick();
        } else {
            window.location.href = '/post';
        }
    };

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
            <NavIcon icon={<MessageCircle size={22} />} label="Chat" active={activePage === 'chat'} onClick={() => window.location.href = '/chat'} />
            <NavIcon icon={<User size={22} />} label="Profile" active={activePage === 'profile'} onClick={() => window.location.href = '/Profile'} />
        </nav>
    );
}

function NavIcon({ icon, label, active = false, onClick }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-orange-400' : 'text-orange-300/50'}`}>
            <div className={`${active ? 'bg-orange-500/10 p-2 rounded-xl' : ''}`}>{icon}</div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
        </button>
    );
}