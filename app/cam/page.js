'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Loader2, AlertCircle, ChevronDown, Check } from 'lucide-react';

// --- CUSTOM DROPDOWN COMPONENT ---
function CustomSelect({ label, value, options, onChange, placeholder = "Select" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1 relative">
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400/80 ml-1">{label}</label>

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between text-white focus:border-orange-500/50 transition-all active:scale-[0.98]"
      >
        <span className={value ? "text-white" : "text-white/20"}>
          {value ? options.find(opt => opt.value === value)?.label || value : placeholder}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={16} className="text-orange-400" />
        </motion.div>
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click outside to close */}
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 5, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute left-0 right-0 z-20 overflow-hidden rounded-2xl border border-white/20 bg-[#1a1a1a]/90 backdrop-blur-xl shadow-2xl"
            >
              <div className="p-1">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-white hover:bg-orange-500/20 transition-colors group"
                  >
                    {opt.label}
                    {value === opt.value && <Check size={14} className="text-orange-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PostItemContent() {
  const searchParams = useSearchParams();
  const preview = searchParams.get('preview');
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('found');
  const [locationTag, setLocationTag] = useState('');
  const [specificLocation, setSpecificLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const locationOptions = [
    { label: 'Shed', value: 'Shed' },
    { label: 'Activity Center', value: 'Activity Center' },
    { label: 'ER Bldg.', value: 'ER Bldg.' },
    { label: 'ENB Bldg.', value: 'ENB Bldg.' },
    { label: 'Volleyball Court', value: 'Volleyball Court' },
    { label: 'Basketball Court', value: 'Basketball Court' },
    { label: 'Admin Bldg.', value: 'Admin Bldg.' },
    { label: 'Quadrangle', value: 'Quadrangle' }
  ];

  const categoryOptions = [
    { label: 'Found', value: 'Found' },
    { label: 'Lost', value: 'Lost' }
  ];

  const handlePost = async () => {
    if (!title || !description || !preview || !locationTag) {
      return alert("Please fill in all fields");
    }

    try {
      setLoading(true);

      // 1. Get current user[cite: 5]
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to post.");

      // 2. Convert preview blob URL to a File object[cite: 5]
      const fetchResponse = await fetch(preview);
      const blob = await fetchResponse.blob();
      const fileExt = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 3. Upload to 'items' bucket[cite: 5]
      const { error: uploadError } = await supabase.storage
        .from('items')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 4. Get Public URL[cite: 5]
      const { data: { publicUrl } } = supabase.storage
        .from('items')
        .getPublicUrl(fileName);

      // 5. Insert into Database[cite: 5]
      const { error: dbError } = await supabase.from('items').insert([{
        title,
        description,
        image_url: publicUrl,
        user_id: user.id,
        category, // Ensure this is 'Found' or 'Lost' [source: 4]
        location_tag: specificLocation ? `${locationTag} - ${specificLocation}` : locationTag,
        status: 'Active'
      }]);

      if (dbError) throw dbError;

      router.push('/Home');
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (error) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <button onClick={() => router.back()} className="text-orange-400 underline">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen text-white p-6 bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233]">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-orange-400 p-2 bg-white/5 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Post Report</h1>
      </header>

      <div className="w-full h-56 rounded-[2.5rem] overflow-hidden border border-white/10 mb-8 shadow-2xl">
        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
      </div>

      <div className="space-y-6 max-w-md mx-auto pb-10">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400/80 ml-1">Item Title</label>
          <input
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-orange-500/30 transition-all"
            placeholder="What did you find?" value={title} onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CustomSelect
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={setCategory}
          />
          <CustomSelect
            label="General Area"
            value={locationTag}
            options={locationOptions}
            onChange={setLocationTag}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400/80 ml-1">Specific Details</label>
          <textarea
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl h-28 outline-none resize-none focus:border-orange-500/30 transition-all text-sm"
            placeholder="Color, brand, unique features..." value={description} onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          onClick={handlePost}
          disabled={loading}
          className="w-full py-5 rounded-[2rem] font-bold flex items-center justify-center gap-3 bg-linear-to-r from-orange-600 to-orange-400 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-orange-900/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Submit Report</>}
        </button>
      </div>
    </div>
  );
}

export default function PostItem() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen" />}>
      <PostItemContent />
    </Suspense>
  );
}