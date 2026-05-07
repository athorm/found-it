// components/ItemDetailModal.js
"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, User, MessageCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ItemDetailModal({ item, isOpen, onClose, onStatusUpdate }) {
    const router = useRouter();
    const [poster, setPoster] = useState(null);
    const [user, setUser] = useState(null);
    // Local status enables optimistic UI update without needing a page refresh
    const [localStatus, setLocalStatus] = useState(item?.status);

    const isOwner = user?.id === item?.user_id;

    // Sync localStatus when a different item is opened
    useEffect(() => {
        setLocalStatus(item?.status);
    }, [item?.id, item?.status]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            }
        };
        if (isOpen) checkUser();
    }, [isOpen]);

    useEffect(() => {
        const fetchPosterProfile = async () => {
            if (!item?.user_id) { setPoster(null); return; }
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('full_name, email, avatar_url')
                .eq('id', item.user_id)
                .single();
            if (error) { console.error('Unable to load poster profile:', error.message || error); setPoster(null); return; }
            setPoster(profileData);
        };
        if (isOpen) fetchPosterProfile();
    }, [isOpen, item?.user_id]);

    const handleContactOwner = async () => {
        if (!user) { alert('Please log in to message the poster.'); return; }
        if (user.id === item.user_id) { alert('This is your own item.'); return; }
        try {
            const { data: existingChats, error: fetchError } = await supabase
                .from('chats').select('id').eq('item_id', item.id)
                .or(`claimer_id.eq.${user.id},finder_id.eq.${user.id}`);
            if (fetchError) throw fetchError;
            if (existingChats && existingChats.length > 0) {
                router.push(`/chat?id=${existingChats[0].id}`); return;
            }
            const { data: newChat, error: createError } = await supabase
                .from('chats').insert({ item_id: item.id, finder_id: item.user_id, claimer_id: user.id, status: 'open' })
                .select().single();
            if (createError) throw createError;
            const initialMessage = `Hi! I'm reaching out about your post "${item.title}" at ${item.location_tag}. Is this still available?`;
            const { error: msgError } = await supabase.from('messages').insert({
                chat_id: newChat.id, item_id: item.id,
                sender_id: user.id, receiver_id: item.user_id,
                content: initialMessage, is_read: false
            });
            if (msgError) throw msgError;
            router.push(`/chat?id=${newChat.id}`);
        } catch (error) {
            console.error("Detailed Chat Error:", error.message || error);
            alert(`Could not start conversation: ${error.message || 'Unknown error'}`);
        }
    };

    const handleToggleStatus = async () => {
        if (!isOwner) return;
        const newStatus = localStatus === 'Active' ? 'Resolved' : 'Active';
        // Optimistic update: change UI instantly
        setLocalStatus(newStatus);
        const { error } = await supabase.from('items').update({ status: newStatus }).eq('id', item.id);
        if (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
            setLocalStatus(localStatus); // revert on failure
        } else {
            if (onStatusUpdate) onStatusUpdate(item.id, newStatus);
        }
    };

    if (!item) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        {/* Header Image */}
                        <div className="relative aspect-video w-full">
                            <img src={item.image_url} className="w-full h-full object-cover" alt={item.title} />
                            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/70 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-white mb-1">{item.title}</h2>
                                    <div className="flex items-center gap-2 text-orange-500">
                                        <MapPin size={14} />
                                        <span className="text-xs font-bold uppercase tracking-widest">{item.location_tag}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(`/items/${item.id}`)}
                                    className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-orange-500 transition-colors"
                                >
                                    <ExternalLink size={20} />
                                </button>
                            </div>

                            <p className="text-white/60 text-sm leading-relaxed">{item.description || "No description provided."}</p>

                            {/* Poster Info */}
                            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center overflow-hidden">
                                    {poster?.avatar_url ? <img src={poster.avatar_url} className="w-full h-full object-cover" alt="" /> : <User className="text-orange-500" />}
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Posted By</p>
                                    <p className="font-bold text-white">{poster?.full_name || "Loading..."}</p>
                                </div>
                            </div>

                            {/* Conditional Button Logic — uses localStatus for instant UI feedback */}
                            {isOwner ? (
                                <div className="space-y-3 w-full">
                                    <div className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/50 font-black tracking-widest text-xs">
                                        <User size={16} />
                                        YOU POSTED THIS ITEM
                                    </div>
                                    <button
                                        onClick={handleToggleStatus}
                                        className={`w-full py-4 rounded-2xl font-black tracking-widest transition-all shadow-lg ${localStatus === 'Active'
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                                            }`}
                                    >
                                        MARK AS {localStatus === 'Active' ? 'CLAIMED' : 'UNCLAIMED'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleContactOwner}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)]"
                                >
                                    <MessageCircle size={20} strokeWidth={3} />
                                    MESSAGE POSTER
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}