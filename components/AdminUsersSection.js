'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, XCircle, Clock, Search, User, Mail,
    GraduationCap, FileText, Eye, Loader2, AlertTriangle, Users, Trash2, Ban, ShieldCheck
} from 'lucide-react';

const USER_TABS = [
    { key: 'pending', label: 'Pending', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500' },
    { key: 'approved', label: 'Verified', icon: CheckCircle, color: 'text-orange-400', bg: 'bg-orange-500' },
    { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-500' },
    { key: 'banned', label: 'Banned', icon: Ban, color: 'text-orange-400', bg: 'bg-orange-500' },
    { key: 'all', label: 'All Users', icon: Users, color: 'text-orange-400', bg: 'bg-orange-500' },
];

function RejectReasonModal({ onConfirm, onCancel, processing }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onCancel} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <XCircle size={36} className="text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 text-center relative z-10">Reject Verification</h3>
                <p className="text-white/40 text-sm mb-6 text-center leading-relaxed relative z-10">Provide a reason so the student knows what to fix.</p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Document is blurry, please re-upload a clearer image..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/50 resize-none h-24 mb-4 relative z-10"
                />
                <div className="space-y-3 relative z-10">
                    <button onClick={() => onConfirm(reason || 'Document could not be verified')} disabled={processing}
                        className="w-full py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <><XCircle size={16} className="text-red-500" /> REJECT</>}
                    </button>
                    <button onClick={onCancel} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs tracking-widest uppercase transition-all">CANCEL</button>
                </div>
            </motion.div>
        </div>
    );
}

const BAN_PREMADE_REASONS = [
    'Repeated violation of community guidelines',
    'Posting inappropriate or offensive content',
    'Harassment or threatening behavior',
    'Fraudulent activity or scam attempts',
    'Impersonation or fake account',
];

const UNBAN_PREMADE_REASONS = [
    'Account reviewed — no violations found',
    'Ban period completed',
    'Successful appeal — user reinstated',
    'Admin review — false positive',
];

function BanReasonModal({ onConfirm, onCancel, processing }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onCancel} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] max-h-[90vh] overflow-y-auto overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <Ban size={36} className="text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 text-center relative z-10">Ban User</h3>
                <p className="text-white/40 text-sm mb-6 text-center leading-relaxed relative z-10">Select a reason or type a custom one. The user will be notified via email.</p>
                {/* Premade reason chips */}
                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                    {BAN_PREMADE_REASONS.map((r) => (
                        <button key={r} onClick={() => setReason(r)} type="button"
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                reason === r
                                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:border-red-500/30 hover:text-white/60'
                            }`}>
                            {r}
                        </button>
                    ))}
                </div>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Or type a custom reason..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/50 resize-none h-20 mb-4 relative z-10"
                />
                <div className="space-y-3 relative z-10">
                    <button onClick={() => onConfirm(reason || 'Violated community guidelines')} disabled={processing}
                        className="w-full py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <><Ban size={16} className="text-red-500" /> BAN USER</>}
                    </button>
                    <button onClick={onCancel} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">CANCEL</button>
                </div>
            </motion.div>
        </div>
    );
}

function UnbanReasonModal({ onConfirm, onCancel, processing }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onCancel} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-[#111] border border-orange-500/30 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_0_50px_rgba(249,115,22,0.15)] max-h-[90vh] overflow-y-auto overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-orange-500/30 blur-[40px] rounded-full pointer-events-none" />
                <div className="w-20 h-20 bg-orange-500/10 border-2 border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <ShieldCheck size={36} className="text-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 text-center relative z-10">Unban User</h3>
                <p className="text-white/40 text-sm mb-6 text-center leading-relaxed relative z-10">Select a reason or type a custom one. The user will be notified via email.</p>
                {/* Premade reason chips */}
                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                    {UNBAN_PREMADE_REASONS.map((r) => (
                        <button key={r} onClick={() => setReason(r)} type="button"
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                reason === r
                                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:border-orange-500/30 hover:text-white/60'
                            }`}>
                            {r}
                        </button>
                    ))}
                </div>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Or type a custom reason..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/50 resize-none h-20 mb-4 relative z-10"
                />
                <div className="space-y-3 relative z-10">
                    <button onClick={() => onConfirm(reason || 'Unbanned by admin')} disabled={processing}
                        className="w-full py-4 bg-white/[0.03] hover:bg-orange-500/10 text-white border border-white/10 hover:border-orange-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} className="text-orange-500" /> UNBAN USER</>}
                    </button>
                    <button onClick={onCancel} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">CANCEL</button>
                </div>
            </motion.div>
        </div>
    );
}

function DocPreviewModal({ url, onClose }) {
    if (!url) return null;
    const isPdf = url.includes('.pdf');
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh]">
                {isPdf ? (
                    <iframe src={url} className="w-full h-[80vh]" title="Verification Document" />
                ) : (
                    <img src={url} alt="Verification Document" className="w-full max-h-[80vh] object-contain bg-black/50" />
                )}
                <div className="p-4 border-t border-white/10">
                    <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs tracking-widest uppercase transition-all">CLOSE</button>
                </div>
            </motion.div>
        </div>
    );
}

export default function AdminUsersSection({ refreshTrigger }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, banned: 0, total: 0 });
    const [toast, setToast] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [banTarget, setBanTarget] = useState(null);
    const [unbanTarget, setUnbanTarget] = useState(null);
    const [previewDocUrl, setPreviewDocUrl] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

    const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
    const getAuthHeaders = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session?.access_token}` }; };

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const headers = await getAuthHeaders();
            // For 'banned' tab, fetch all and filter client-side since is_banned is a separate field
            const fetchStatus = activeTab === 'banned' ? 'all' : activeTab;
            const res = await fetch(`/api/admin/users?status=${fetchStatus}`, { headers });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            let result = json.users || [];
            if (activeTab === 'banned') {
                result = result.filter(u => u.is_banned === true);
            }
            setUsers(result);
        } catch (err) { showToast(err.message, 'error'); } finally { setLoading(false); }
    }, [activeTab]);

    const fetchStats = useCallback(async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/users?status=all', { headers });
            const json = await res.json();
            if (res.ok && json.users) {
                const all = json.users;
                setStats({ pending: all.filter(u => u.verification_status === 'pending').length, approved: all.filter(u => u.verification_status === 'approved').length, rejected: all.filter(u => u.verification_status === 'rejected').length, banned: all.filter(u => u.is_banned === true).length, total: all.length });
            }
        } catch { }
    }, []);

    useEffect(() => { fetchUsers(); fetchStats(); }, [fetchUsers, fetchStats, refreshTrigger]);

    const handleDeleteUser = async (userId) => {
        const prevUsers = users;
        const prevStats = { ...stats };
        const deletedUser = users.find(u => u.id === userId);

        // Optimistic removal
        setUsers(prev => prev.filter(u => u.id !== userId));
        if (deletedUser) {
            setStats(prev => {
                const next = { ...prev, total: Math.max(0, prev.total - 1) };
                if (deletedUser.is_banned) next.banned = Math.max(0, prev.banned - 1);
                const vs = deletedUser.verification_status;
                if (vs && next[vs] !== undefined) next[vs] = Math.max(0, next[vs] - 1);
                return next;
            });
        }
        showToast('User account deleted permanently');
        setDeleteTarget(null);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/users/delete', {
                method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
        } catch (err) {
            setUsers(prevUsers);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };

    // Batch helpers
    const toggleSelect = (id) => setSelectedUsers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleSelectAll = () => { selectedUsers.size === filtered.length ? setSelectedUsers(new Set()) : setSelectedUsers(new Set(filtered.map(u => u.id))); };
    const handleBatchModerate = async (action) => {
        if (selectedUsers.size === 0) return;
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const prevUsers = users;
        const prevStats = { ...stats };
        const ids = [...selectedUsers];

        // Optimistic: remove from non-'all' tabs, update in-place on 'all'
        if (activeTab !== 'all') {
            setUsers(prev => prev.filter(u => !selectedUsers.has(u.id)));
        } else {
            setUsers(prev => prev.map(u => selectedUsers.has(u.id) ? { ...u, verification_status: newStatus } : u));
        }
        // Update stats
        const statDelta = {};
        users.forEach(u => {
            if (selectedUsers.has(u.id)) {
                statDelta[u.verification_status] = (statDelta[u.verification_status] || 0) - 1;
                statDelta[newStatus] = (statDelta[newStatus] || 0) + 1;
            }
        });
        setStats(prev => {
            const next = { ...prev };
            Object.entries(statDelta).forEach(([k, v]) => { if (next[k] !== undefined) next[k] = Math.max(0, next[k] + v); });
            return next;
        });
        showToast(`${ids.length} user(s) ${action === 'approve' ? 'approved' : 'rejected'}`);
        setSelectedUsers(new Set());

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/users', {
                method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: ids, action }),
            });
            if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
        } catch (err) {
            setUsers(prevUsers);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };
    const handleBatchDelete = async () => {
        if (selectedUsers.size === 0) return;
        const prevUsers = users;
        const prevStats = { ...stats };
        const ids = [...selectedUsers];

        // Optimistic batch delete
        const statDelta = { total: 0 };
        users.forEach(u => {
            if (selectedUsers.has(u.id)) {
                const vs = u.verification_status;
                if (vs) statDelta[vs] = (statDelta[vs] || 0) - 1;
                if (u.is_banned) statDelta.banned = (statDelta.banned || 0) - 1;
                statDelta.total--;
            }
        });
        setUsers(prev => prev.filter(u => !selectedUsers.has(u.id)));
        setStats(prev => {
            const next = { ...prev };
            Object.entries(statDelta).forEach(([k, v]) => { if (next[k] !== undefined) next[k] = Math.max(0, next[k] + v); });
            return next;
        });
        showToast(`${ids.length} account(s) deleted permanently`);
        setSelectedUsers(new Set());
        setBatchDeleteConfirm(false);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/users/delete', {
                method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: ids }),
            });
            if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
        } catch (err) {
            setUsers(prevUsers);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };

    const handleModerate = async (userId, action, reason) => {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const prevUsers = users;
        const prevStats = { ...stats };

        // Optimistic: remove from specific tabs, update on 'all'
        if (activeTab !== 'all') {
            setUsers(prev => prev.filter(u => u.id !== userId));
        } else {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, verification_status: newStatus, verification_rejection_reason: action === 'reject' ? reason : u.verification_rejection_reason } : u));
        }
        setStats(prev => {
            const oldUser = users.find(u => u.id === userId);
            if (!oldUser) return prev;
            const oldStatus = oldUser.verification_status;
            return {
                ...prev,
                [oldStatus]: Math.max(0, prev[oldStatus] - 1),
                [newStatus]: prev[newStatus] + 1,
            };
        });
        showToast(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        setRejectTarget(null);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/users', {
                method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action, reason }),
            });
            if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
        } catch (err) {
            setUsers(prevUsers);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };

    const handleBanToggle = async (userId, currentlyBanned, customReason = '') => {
        const prevUsers = users;
        const prevStats = { ...stats };

        // Optimistic: toggle ban status, remove from tab if it no longer matches
        if (activeTab === 'banned' && currentlyBanned) {
            // Unbanning on banned tab — remove card
            setUsers(prev => prev.filter(u => u.id !== userId));
        } else if (activeTab !== 'all' && activeTab !== 'banned' && !currentlyBanned) {
            // Banning on a non-all/non-banned tab — remove card
            setUsers(prev => prev.filter(u => u.id !== userId));
        } else {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !currentlyBanned } : u));
        }
        setStats(prev => ({
            ...prev,
            banned: currentlyBanned ? Math.max(0, prev.banned - 1) : prev.banned + 1,
        }));
        showToast(`User ${currentlyBanned ? 'unbanned' : 'banned'} successfully`);
        setBanTarget(null);
        setUnbanTarget(null);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/ban-user', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: userId,
                    action: currentlyBanned ? 'unban' : 'ban',
                    reason: currentlyBanned ? (customReason || 'Unbanned by admin') : (customReason || 'Banned by admin from Users panel'),
                }),
            });
            if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
        } catch (err) {
            setUsers(prevUsers);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };

    const filtered = users.filter(u => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.student_number?.toLowerCase().includes(q);
    });

    const statusColors = { pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', approved: 'bg-green-500/15 text-green-400 border-green-500/30', rejected: 'bg-red-500/15 text-red-400 border-red-500/30' };

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 space-y-6 pb-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 overflow-hidden rounded-[1.5rem]">
                {[{ label: 'Pending', count: stats.pending, icon: Clock, color: 'text-yellow-400', tab: 'pending' },
                { label: 'Verified', count: stats.approved, icon: CheckCircle, color: 'text-green-400', tab: 'approved' },
                { label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'text-red-400', tab: 'rejected' },
                { label: 'Banned', count: stats.banned, icon: Ban, color: 'text-red-500', tab: 'banned' },
                { label: 'Total Users', count: stats.total, icon: Users, color: 'text-orange-400', tab: 'all' }
                ].map(s => (
                    <button key={s.tab} onClick={() => setActiveTab(s.tab)}
                        className={`p-5 rounded-[1.5rem] border transition-all duration-300 text-left backdrop-blur-md relative overflow-hidden group ${activeTab === s.tab ? 'bg-orange-500/15 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full pointer-events-none opacity-20 transition-opacity duration-300 ${activeTab === s.tab ? 'opacity-40' : 'group-hover:opacity-30'} ${s.color === 'text-yellow-400' ? 'bg-yellow-500' : s.color === 'text-green-400' ? 'bg-green-500' : s.color === 'text-red-500' || s.color === 'text-red-400' ? 'bg-red-500' : 'bg-orange-500'}`} />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className={`p-2 rounded-xl bg-white/5 border border-white/5 ${activeTab === s.tab ? 'scale-110 shadow-lg' : ''} transition-transform`}>
                                <s.icon size={20} className={s.color} />
                            </div>
                            <span className="text-3xl font-black text-white">{s.count}</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 relative z-10">{s.label}</p>
                    </button>
                ))}
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                <div className="overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md w-max lg:w-auto">
                        {USER_TABS.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-[0.9rem] text-xs font-black tracking-widest transition-all whitespace-nowrap ${activeTab === tab.key ? `${tab.bg} text-white shadow-lg` : 'text-white/30 hover:text-white/50'}`}>
                                <tab.icon size={14} />{tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4 lg:ml-auto w-full lg:w-auto flex-1 lg:justify-end">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/50" size={18} />
                        <input type="text" placeholder="Search by name, email, student ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/10 py-3 pl-11 pr-4 rounded-xl outline-none text-sm focus:border-orange-500/50 transition-all placeholder:text-white/20" />
                    </div>
                </div>
            </div>

            </div>

            {/* Select all — pinned above scroll */}
            {filtered.length > 0 && (
                <div className="shrink-0 flex items-center gap-3 pb-3">
                    <button onClick={toggleSelectAll}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedUsers.size === filtered.length && filtered.length > 0 ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/20 hover:border-orange-500/60'}`}>
                        {selectedUsers.size === filtered.length && filtered.length > 0 && <CheckCircle size={14} className="text-white" />}
                    </button>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        {selectedUsers.size > 0 ? `${selectedUsers.size} selected` : 'Select all'}
                    </span>
                </div>
            )}

            <div className="flex-1 admin-scroll overflow-y-auto min-h-0 p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/5 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)]">
            <div className="relative min-h-[400px]">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                            {[1,2,3,4,5,6,7,8].map(i => (
                                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-4 flex flex-col space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-white/5 rounded-md shrink-0" />
                                        <div className="w-10 h-10 rounded-full bg-orange-500/10 shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3 w-24 bg-white/10 rounded" />
                                            <div className="h-2 w-16 bg-white/5 rounded" />
                                        </div>
                                        <div className="h-4 w-16 bg-yellow-500/10 rounded-full" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-orange-500/10 rounded-full" />
                                        <div className="h-2 w-40 bg-white/5 rounded" />
                                    </div>
                                    <div className="w-full h-10 bg-white/[0.03] rounded-xl border border-white/5" />
                                    <div className="h-2 w-28 bg-white/5 rounded mt-auto" />
                                    <div className="flex gap-2 pt-2">
                                        <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-xl" />
                                        <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-xl" />
                                        <div className="w-8 h-8 bg-white/[0.03] border border-white/5 rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : filtered.length > 0 ? (
                        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map(u => (
                                <motion.div key={u.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => toggleSelect(u.id)}
                                    className={`bg-white/[0.02] backdrop-blur-md border rounded-[1.5rem] p-4 flex flex-col h-full hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all duration-300 cursor-pointer ${selectedUsers.has(u.id) ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'border-white/5'}`}>
                                    <div className="space-y-3 mb-3">
                                        {/* User header */}
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); toggleSelect(u.id); }}
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedUsers.has(u.id) ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/20'}`}>
                                                {selectedUsers.has(u.id) && <CheckCircle size={12} className="text-white" />}
                                            </button>
                                            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center overflow-hidden shrink-0">
                                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : <User size={16} className="text-orange-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-bold text-white truncate">{u.full_name || 'Unknown'}</p>
                                                <p className="text-xs text-white/40 font-mono">{u.student_number || 'N/A'}</p>
                                            </div>
                                            {!u.is_banned && (
                                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColors[u.verification_status]}`}>{u.verification_status}</span>
                                            )}
                                            {u.is_banned && (
                                                <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border bg-red-500/20 text-red-400 border-red-500/30">Banned</span>
                                            )}
                                        </div>
                                        {/* Email */}
                                        <div className="flex items-center gap-2 text-white/30">
                                            <Mail size={12} className="text-orange-500" />
                                            <span className="text-xs font-bold truncate">{u.email}</span>
                                        </div>
                                        {/* Document preview button (Hidden for banned users to save space) */}
                                        {u.verification_doc_signed_url && !u.is_banned && (
                                            <button onClick={() => setPreviewDocUrl(u.verification_doc_signed_url)}
                                                className="w-full flex items-center gap-2 p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:border-orange-500/30 transition-all text-left">
                                                <FileText size={16} className="text-orange-500 shrink-0" />
                                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">View Document</span>
                                                <Eye size={14} className="ml-auto text-white/20" />
                                            </button>
                                        )}
                                        {/* Rejection reason */}
                                        {u.verification_status === 'rejected' && u.verification_rejection_reason && (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-red-400 mb-1">Rejection Reason</p>
                                                <p className="text-white/50 text-[10px] line-clamp-2">{u.verification_rejection_reason}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-4 pt-2">
                                        {/* Timestamp */}
                                        <p className="text-[10px] text-white/20 font-bold tracking-widest uppercase">
                                            Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        {/* Actions */}
                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                            {u.verification_status === 'pending' && (<>
                                                <button onClick={() => handleModerate(u.id, 'approve')} disabled={processing}
                                                    className="flex-1 py-2 bg-white/[0.03] hover:bg-green-500/10 text-white border border-white/10 hover:border-green-500/50 rounded-xl font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                    <CheckCircle size={10} className="text-green-500" /> APPROVE
                                                </button>
                                                <button onClick={() => setRejectTarget(u.id)} disabled={processing}
                                                    className="flex-1 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white/70 hover:text-white border border-white/10 hover:border-red-500/50 rounded-xl font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                    <XCircle size={10} className="text-red-500" /> REJECT
                                                </button>
                                            </>)}
                                            {u.verification_status === 'rejected' && (
                                                <button onClick={() => handleModerate(u.id, 'approve')} disabled={processing}
                                                    className="flex-1 py-2 bg-white/[0.03] hover:bg-green-500/10 text-white border border-white/10 hover:border-green-500/50 rounded-xl font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                    <CheckCircle size={10} className="text-green-500" /> APPROVE
                                                </button>
                                            )}
                                            {u.verification_status === 'approved' && !u.is_banned && (
                                                <button onClick={() => setRejectTarget(u.id)} disabled={processing}
                                                    className="flex-1 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white/70 hover:text-white border border-white/10 hover:border-red-500/50 rounded-xl font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                    <XCircle size={10} className="text-red-500" /> REVOKE
                                                </button>
                                            )}
                                            {/* Ban / Unban toggle */}
                                            {u.is_banned ? (
                                                <button onClick={() => setUnbanTarget(u.id)} disabled={processing}
                                                    className="flex-1 py-2 bg-white/[0.03] hover:bg-orange-500/10 text-white border border-white/10 hover:border-orange-500/50 rounded-xl font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                    <ShieldCheck size={10} className="text-orange-500" /> UNBAN
                                                </button>
                                            ) : u.verification_status === 'approved' && (
                                                <button onClick={() => setBanTarget(u.id)} disabled={processing}
                                                    className="p-2 bg-white/[0.03] hover:bg-red-500/10 text-white/50 hover:text-white border border-white/10 hover:border-red-500/50 rounded-xl transition-all active:scale-95 disabled:opacity-50" title="Ban user">
                                                    <Ban size={10} className="text-red-500" />
                                                </button>
                                            )}
                                            <button onClick={() => setDeleteTarget(u.id)} disabled={processing}
                                                className="p-2 bg-white/[0.03] hover:bg-red-500/10 text-white/50 hover:text-white border border-white/10 hover:border-red-500/50 rounded-xl transition-all active:scale-95 disabled:opacity-50" title="Delete account">
                                                <Trash2 size={10} className="text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-white/20">
                            <Users size={48} strokeWidth={1} className="mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{searchQuery ? 'No users match' : `No ${activeTab === 'all' ? '' : activeTab} users`}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </div>

            {/* Toast */}
            <AnimatePresence>{toast && (
                <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[120] px-6 py-4 rounded-2xl font-bold text-sm shadow-2xl border ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-green-500/20 border-green-500/40 text-green-300'}`}>
                    {toast.message}
                </motion.div>
            )}</AnimatePresence>

            {/* Modals */}
            <AnimatePresence>{previewDocUrl && <DocPreviewModal url={previewDocUrl} onClose={() => setPreviewDocUrl(null)} />}</AnimatePresence>
            <AnimatePresence>{rejectTarget && <RejectReasonModal processing={processing} onCancel={() => setRejectTarget(null)} onConfirm={(reason) => handleModerate(rejectTarget, 'reject', reason)} />}</AnimatePresence>
            <AnimatePresence>{banTarget && <BanReasonModal processing={processing} onCancel={() => setBanTarget(null)} onConfirm={(reason) => handleBanToggle(banTarget, false, reason)} />}</AnimatePresence>
            <AnimatePresence>{unbanTarget && <UnbanReasonModal processing={processing} onCancel={() => setUnbanTarget(null)} onConfirm={(reason) => handleBanToggle(unbanTarget, true, reason)} />}</AnimatePresence>

            {/* Delete user confirm */}
            <AnimatePresence>{deleteTarget && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setDeleteTarget(null)} />
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                        <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10"><Trash2 size={36} className="text-red-500" /></div>
                        <h3 className="text-2xl font-black text-white mb-2 relative z-10">Delete Account?</h3>
                        <p className="text-white/40 text-sm mb-6 leading-relaxed relative z-10">This will permanently delete the user, their posts, chats, and messages. This cannot be undone.</p>
                        <div className="space-y-3 relative z-10">
                            <button onClick={() => handleDeleteUser(deleteTarget)} disabled={processing}
                                className="w-full py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                {processing ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} className="text-red-500" /> DELETE ACCOUNT</>}
                            </button>
                            <button onClick={() => setDeleteTarget(null)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">CANCEL</button>
                        </div>
                    </motion.div>
                </div>
            )}</AnimatePresence>

            {/* Batch delete confirm */}
            <AnimatePresence>{batchDeleteConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setBatchDeleteConfirm(false)} />
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                        <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10"><AlertTriangle size={36} className="text-red-500" /></div>
                        <h3 className="text-2xl font-black text-white mb-2 relative z-10">Delete {selectedUsers.size} account(s)?</h3>
                        <p className="text-white/40 text-sm mb-6 leading-relaxed relative z-10">All their posts, chats, and messages will be permanently deleted.</p>
                        <div className="space-y-3 relative z-10">
                            <button onClick={handleBatchDelete} disabled={processing}
                                className="w-full py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                {processing ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} className="text-red-500" /> DELETE ALL</>}
                            </button>
                            <button onClick={() => setBatchDeleteConfirm(false)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">CANCEL</button>
                        </div>
                    </motion.div>
                </div>
            )}</AnimatePresence>

            {/* Batch action bar */}
            <AnimatePresence>
                {selectedUsers.size > 0 && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 bg-white/[0.04] border border-white/10 rounded-2xl backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <span className="text-xs font-black text-white/60 uppercase tracking-widest mr-2">{selectedUsers.size} selected</span>
                        {/* Approve: show on pending, rejected, all */}
                        {(activeTab === 'pending' || activeTab === 'rejected' || activeTab === 'all') && (
                            <button onClick={() => handleBatchModerate('approve')} disabled={processing}
                                className="px-4 py-2 bg-white/[0.03] hover:bg-orange-500/10 text-white border border-white/10 hover:border-orange-500/50 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
                                <CheckCircle size={12} className="text-orange-500" /> Approve
                            </button>
                        )}
                        {/* Reject: show on pending, approved, all */}
                        {(activeTab === 'pending' || activeTab === 'approved' || activeTab === 'all') && (
                            <button onClick={() => handleBatchModerate('reject')} disabled={processing}
                                className="px-4 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
                                <XCircle size={12} className="text-red-500" /> Reject
                            </button>
                        )}
                        {/* Unban: show on banned, all */}
                        {(activeTab === 'banned' || activeTab === 'all') && (
                            <button onClick={() => handleBatchModerate('approve')} disabled={processing}
                                className="px-4 py-2 bg-white/[0.03] hover:bg-orange-500/10 text-white border border-white/10 hover:border-orange-500/50 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
                                <ShieldCheck size={12} className="text-orange-500" /> Unban
                            </button>
                        )}
                        <button onClick={() => setBatchDeleteConfirm(true)} disabled={processing}
                            className="px-4 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
                            <Trash2 size={12} className="text-red-500" /> Delete
                        </button>
                        <button onClick={() => setSelectedUsers(new Set())}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-xl text-[10px] font-black tracking-widest transition-all">Cancel</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
