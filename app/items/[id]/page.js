"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, MapPin, Clock, User, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemPostModal from "@/components/ItemPostModal";

export default function ItemDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [owner, setOwner] = useState(null);
    const [user, setUser] = useState(null);
    const [showPostModal, setShowPostModal] = useState(false);

    useEffect(() => {
        fetchItemDetail();
    }, [params.id]);

    useEffect(() => {
        const getUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const fetchItemDetail = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("items")
                .select("*")
                .eq("id", params.id)
                .single();

            if (error) throw error;
            setItem(data);

            // Fetch owner profile
            if (data.user_id) {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", data.user_id)
                    .single();
                setOwner(profileData);
            }
        } catch (error) {
            console.error("Error fetching item:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233]">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-medium opacity-50">Loading item...</p>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233]">
                <p className="text-lg font-semibold text-orange-400">Item not found</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-6 py-2 bg-orange-500 rounded-2xl font-bold hover:bg-orange-600 transition"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const statusMap = { "Active": "Unclaimed", "Resolved": "Claimed" };
    const displayStatus = statusMap[item.status] || item.status;

    const handleContactOwner = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
            console.error('Unable to get session for chat creation:', sessionError);
            alert('Please log in to message the poster.');
            return;
        }

        if (!item) return;

        if (user?.id === item.user_id) {
            alert('This is your own item.');
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

    const handleFileSelected = (file) => {
        const previewUrl = URL.createObjectURL(file);
        setShowPostModal(false);
        router.push(`/post?preview=${encodeURIComponent(previewUrl)}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233] text-white pb-32 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-orange-500/20 p-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-white/5 rounded-xl text-orange-500 border border-white/10 hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <h1 className="text-2xl font-bold text-orange-400">Item Details</h1>
                    <div className="w-10" />
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 pt-6 pb-6 space-y-6">
                {/* Item Image */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout="position"
                    className="rounded-[2.5rem] overflow-hidden border border-orange-500/30 shadow-2xl"
                >
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-96 object-cover"
                    />
                </motion.div>

                {/* Item Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-[2.5rem] bg-black/40 border border-orange-500/30 p-8"
                >
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-white">{item.title}</h2>
                                <p className="text-orange-300/70 text-sm mt-2">{item.category}</p>
                            </div>
                            <span className="text-[10px] font-black uppercase text-orange-500 bg-orange-500/10 px-4 py-2 rounded-full border border-orange-500/20 whitespace-nowrap">
                                {displayStatus}
                            </span>
                        </div>

                        <div className="border-t border-orange-500/20 pt-4">
                            <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-2">Description</h3>
                            <p className="text-white/80 text-base leading-relaxed">{item.description}</p>
                        </div>

                        {item.location_tag && (
                            <div className="flex items-center gap-3 text-white/80">
                                <MapPin size={18} className="text-orange-500" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-orange-400">Location</p>
                                    <p className="text-sm font-medium">{item.location_tag}</p>
                                </div>
                            </div>
                        )}

                        {item.created_at && (
                            <div className="flex items-center gap-3 text-white/80">
                                <Clock size={18} className="text-orange-500" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-orange-400">Posted</p>
                                    <p className="text-sm font-medium">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Owner Info */}
                {owner && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-[2.5rem] bg-black/40 border border-orange-500/30 p-8"
                    >
                        <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-widest mb-4">Posted by</h3>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black border-2 border-orange-500/50 flex items-center justify-center overflow-hidden">
                                {owner.avatar_url ? (
                                    <img src={owner.avatar_url} alt={owner.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={32} className="text-orange-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">{owner.full_name}</p>
                                <p className="text-sm text-orange-300/60">{owner.email}</p>
                            </div>
                            <button onClick={handleContactOwner} type="button" className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-full hover:bg-orange-500/20 transition">
                                <MessageCircle size={20} className="text-orange-500" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Item Post Modal */}
            <ItemPostModal
                open={showPostModal}
                onClose={() => setShowPostModal(false)}
                onFileSelect={handleFileSelected}
            />

            {/* Navigation Bar */}
            <NavBar activePage="items" onPlusClick={() => setShowPostModal(true)} />
        </div>
    );
}
