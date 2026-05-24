'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, Tag, Plus, MessageCircle, User, ChevronRight, LogOut, Trash2, Camera, Image, X, Send, Loader2, ArrowLeft, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import ProfileLoading from './loading';

import NavBar from '@/components/NavBar';

export default function ProfilePage() {
  const { user: authUser, authLoading } = useAuthGuard();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posting, setPosting] = useState(false);

  const [profile, setProfile] = useState({
    full_name: "",
    student_number: "",
    email: "",
    avatar_url: ""
  });

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const router = useRouter();

  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, student_number, email, avatar_url, role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile({
            full_name: data.full_name || "LSPU Student",
            student_number: data.student_number || "No ID Set",
            email: data.email || user.email,
            avatar_url: data.avatar_url || ""
          });
          setIsAdmin(data.role === 'admin');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) {
      getProfile();
    }
  }, [authUser, getProfile]);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      // ─── AI Image Moderation ───
      // Screen avatar before uploading
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const aiForm = new FormData();
          aiForm.append('image', file);
          aiForm.append('content_type', 'avatar');
          const aiRes = await fetch('/api/ai/moderate-image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: aiForm,
          });
          const aiResult = await aiRes.json();
          if (aiResult.flagged) {
            toast.error('This image was detected as inappropriate by our AI. Please choose a different photo.');
            setUploading(false);
            return;
          }
        }
      } catch (aiErr) {
        console.warn('AI moderation unavailable, proceeding:', aiErr.message);
      }

      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    router.push('/login');
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    if (newPassword.length < 6) { setPasswordMsg('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg('Passwords do not match.'); return; }
    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg('✅ Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setShowPasswordModal(false); setPasswordMsg(''); }, 1500);
    } catch (err) {
      setPasswordMsg(`❌ ${err.message}`);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('You must be logged in.'); return; }

      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete account');

      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      toast.error("Error deleting account: " + error.message);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!title || !description || !selectedImage) return toast.error("Please fill in all fields");
    try {
      setPosting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to post.");

      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const fileExt = blob.type.split('/')[1];
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('items')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('items')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('items')
        .insert([{ title, description, image_url: publicUrl, finder_id: user.id }]);

      if (dbError) throw dbError;

      toast.success("Item successfully posted to FoundIt!");
      setShowPostModal(false);
      setSelectedImage(null);
      setTitle('');
      setDescription('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPosting(false);
    }
  };

  if (authLoading || loading) return <ProfileLoading />;

  return (
    <div className="min-h-screen pb-20 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-white/5 px-6 pt-4 pb-6 flex items-center justify-between">
        <button onClick={() => router.push('/Home')} className="p-2 hover:bg-white/5 rounded-full transition text-orange-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Profile</h1>
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
          <img src="/logo2.svg" alt="Logo" className="w-6 h-6 mix-blend-screen drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] object-contain" />
        </div>
      </div>

      <main className="px-6 mt-8 max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-[2.5rem] bg-orange-500/[0.03] backdrop-blur-xl border border-orange-500/20 p-8 flex flex-col items-center shadow-[0_0_40px_rgba(249,115,22,0.05)] relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-orange-500/20 blur-[60px] rounded-full pointer-events-none" />

          <div className="relative mb-6 group">
            <div className="w-36 h-36 rounded-full bg-[#111] p-1 border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
              <div className="w-full h-full rounded-full overflow-hidden relative">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-500/10">
                    <User size={64} className="text-orange-400/50" />
                  </div>
                )}
              </div>
            </div>
            
            <label className="absolute bottom-1 right-1 bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 cursor-pointer hover:bg-orange-500 hover:border-orange-400 transition-all z-10 shadow-xl group-hover:scale-110 active:scale-95">
              {uploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>

          <div className="text-center space-y-3 z-10">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 tracking-tight">{profile.full_name}</h2>
            
            <div className="inline-flex items-center gap-1.5 text-orange-400 text-[10px] uppercase tracking-widest font-black bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <Shield size={12} className="text-orange-500" /> Verified LSPU Account
            </div>
            
            <div className="pt-4 space-y-1">
              <p className="text-orange-400 font-mono text-[15px] tracking-[0.3em] font-bold">
                {profile.student_number}
              </p>
              <p className="text-white/40 text-sm font-medium tracking-wide">
                {profile.email}
              </p>
              {isAdmin && (
                <div className="mt-3 inline-flex items-center gap-1.5 text-yellow-400 text-[10px] uppercase tracking-widest font-black bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/30">
                  <Shield size={12} /> System Admin
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Menu Sections - Account Settings */}
        <div className="rounded-3xl bg-white/[0.02] backdrop-blur-md border border-white/5 overflow-hidden shadow-xl">
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="w-full flex items-center justify-between px-6 py-5 border-b border-white/5 hover:bg-white/[0.05] transition-all group text-white/90"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
                  <Shield size={20} />
                </div>
                <span className="font-bold text-base tracking-wide">Admin Dashboard</span>
              </div>
              <ChevronRight size={20} className="text-white/20 group-hover:text-orange-400 transition-colors" />
            </button>
          )}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/[0.05] transition-all group text-white/90"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
                <Lock size={20} />
              </div>
              <span className="font-bold text-base tracking-wide">Change Password</span>
            </div>
            <ChevronRight size={20} className="text-white/20 group-hover:text-orange-400 transition-colors" />
          </button>
        </div>

        {/* Menu Sections - Danger Zone */}
        <div className="rounded-3xl bg-red-500/[0.02] backdrop-blur-md border border-red-500/10 overflow-hidden shadow-xl">
          <button onClick={handleLogout} className="w-full flex items-center justify-between px-6 py-5 border-b border-red-500/10 hover:bg-red-500/10 transition-all group text-white/90">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:scale-110 transition-transform">
                <LogOut size={20} />
              </div>
              <span className="font-bold text-base tracking-wide text-red-100">Log Out</span>
            </div>
            <ChevronRight size={20} className="text-red-400/30 group-hover:text-red-400 transition-colors" />
          </button>

          <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-red-500/10 transition-all group text-white/90">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:scale-110 transition-transform">
                <Trash2 size={20} />
              </div>
              <span className="font-bold text-base tracking-wide text-red-100">Delete Account</span>
            </div>
            <ChevronRight size={20} className="text-red-400/30 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </main>

      <NavBar currentRoute="/profile" />

      {/* Modals */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-xl p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-[#111] border border-orange-500/30 p-8 rounded-[2.5rem] w-full max-w-sm shadow-[0_0_50px_rgba(249,115,22,0.1)] relative">
              <button onClick={() => { setShowPasswordModal(false); setPasswordMsg(''); setNewPassword(''); setConfirmPassword(''); setShowNewPw(false); setShowConfirmPw(false); }} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
              
              <div className="w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mb-4">
                <Lock size={28} className="text-orange-400" />
              </div>
              <h3 className="text-2xl font-black mb-1">Change Password</h3>
              <p className="text-white/40 text-sm mb-8">Must be at least 6 characters.</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-white outline-none placeholder:text-white/30 focus:border-orange-500/50 focus:bg-white/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-orange-400 transition-colors"
                  >
                    {showNewPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-white outline-none placeholder:text-white/30 focus:border-orange-500/50 focus:bg-white/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-orange-400 transition-colors"
                  >
                    {showConfirmPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {passwordMsg && <p className={`text-xs text-center font-bold tracking-wide px-2 ${passwordMsg.includes('✅') ? 'text-emerald-400' : 'text-orange-400'}`}>{passwordMsg}</p>}
                
                <button onClick={handleChangePassword} disabled={changingPassword} className="w-full py-4 mt-2 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_25px_rgba(249,115,22,0.5)] rounded-2xl font-black tracking-widest uppercase text-sm disabled:opacity-50 transition-all active:scale-95">
                  {changingPassword ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Update Password'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-xl p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-[#111] border border-red-500/30 p-8 rounded-[2.5rem] w-full max-w-xs text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black mb-2">Delete Account?</h3>
              <p className="text-sm text-white/40 mb-8 leading-relaxed">This action is permanent and cannot be undone.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteAccount} disabled={loading} className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-black tracking-widest uppercase text-sm shadow-[0_4px_15px_rgba(239,68,68,0.3)] transition-all active:scale-95 flex items-center justify-center">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Yes, Delete"}
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl font-bold transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showPostModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black border border-orange-500/30 rounded-[2.5rem] w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-orange-500/20">
                <h2 className="text-xl font-bold">Report Found Item</h2>
                <button onClick={() => setShowPostModal(false)} className="text-orange-400"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                {!selectedImage ? (
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col items-center gap-3 p-6 bg-white/5 border border-orange-500/20 rounded-2xl cursor-pointer">
                      <Camera size={32} className="text-orange-400" />
                      <span className="text-xs font-bold uppercase tracking-widest">Camera</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                    </label>
                    <label className="flex flex-col items-center gap-3 p-6 bg-white/5 border border-orange-500/20 rounded-2xl cursor-pointer">
                      <Image size={32} className="text-orange-400" />
                      <span className="text-xs font-bold uppercase tracking-widest">Gallery</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <img src={selectedImage} alt="Preview" className="w-full h-40 object-cover rounded-2xl border border-orange-500/30" />
                    <input className="w-full bg-white/5 border border-orange-500/20 p-4 rounded-2xl text-white outline-none" placeholder="Item Name" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <textarea className="w-full bg-white/5 border border-orange-500/20 p-4 rounded-2xl h-24 text-white outline-none resize-none" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <button onClick={handlePost} disabled={posting} className="w-full py-4 bg-orange-500 rounded-2xl font-bold active:scale-95 transition-all">
                      {posting ? <Loader2 className="animate-spin mx-auto" /> : "Post to FoundIt"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}