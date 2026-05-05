"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Image, X } from "lucide-react";

export default function ItemPostModal({ open, onClose, onFileSelect }) {
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onFileSelect(file);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-[2.5rem] bg-black/70 border border-orange-500/30 p-8 relative"
            >
                <button onClick={onClose} className="absolute right-6 top-6 text-orange-400 hover:text-orange-200">
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold mb-8">Report Found Item</h2>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center gap-3 rounded-2xl border border-orange-500/20 bg-white/5 p-6 text-left transition hover:bg-orange-500/10"
                    >
                        <Camera size={32} className="text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Camera</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex flex-col items-center gap-3 rounded-2xl border border-orange-500/20 bg-white/5 p-6 text-left transition hover:bg-orange-500/10"
                    >
                        <Image size={32} className="text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Gallery</span>
                    </button>
                </div>

                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </motion.div>
        </div>
    );
}
