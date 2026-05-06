// components/ItemDetailModal.js
"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, User, MessageCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


export default function ItemDetailModal({ item, isOpen, onClose }) {
    const router = useRouter();
    const [poster, setPoster] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkUser = async () => {
            // Try to get the session from memory first to avoid unnecessary locks
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            }
        };

        if (isOpen) {
            checkUser();
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchPosterProfile = async () => {
            if (!item?.user_id) {
                setPoster(null);
                return;
            }

            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('full_name, email, avatar_url')
                .eq('id', item.user_id)
                .single();

            if (error) {
                console.error('Unable to load poster profile:', error.message || error);
                setPoster(null);
                return;
            }

            setPoster(profileData);
        };

        if (isOpen) {
            fetchPosterProfile();
        }
    }, [isOpen, item?.user_id]);

    const handleContactOwner = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
            console.error('Unable to get session for chat creation:', sessionError);
            alert('Please log in to message the poster.');
            return;
        }

        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ itemId: item.id }),
        });

        let result = null;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('Chat API JSON parse error:', parseError);
        }

        if (!response.ok) {
            console.error('Chat API error:', response.status, result);
            alert(result?.error || `Unable to start chat (${response.status}).`);
            return;
        }

        if (result.chatId) {
            router.push(`/chat?id=${result.chatId}`);
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
                                    {poster?.avatar_url ? <img src={poster.avatar_url} /> : <User className="text-orange-500" />}
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Posted By</p>
                                    <p className="font-bold text-white">{poster?.full_name || "Loading..."}</p>
                                </div>
                            </div>
                            <button onClick={handleContactOwner} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                                <MessageCircle size={20} strokeWidth={3} />
                                MESSAGE POSTER
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}