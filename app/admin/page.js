'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Shield, CheckCircle, XCircle, Trash2, Clock,
    Package, Search, RefreshCw, AlertTriangle, Loader2,
    Eye, ChevronDown, MapPin, User, Filter, Users, Calendar, X,
    Flag, Ban, MessageSquare, ShieldAlert
} from 'lucide-react';
import AdminUsersSection from '@/components/AdminUsersSection';
import CustomDateRangePicker from '@/components/CustomDateRangePicker';
import { ITEM_CATEGORIES, CAMPUS_LOCATIONS } from '@/lib/constants';
import AdminLoading from './loading';

/* ─────────────────────────── STATUS TABS ─────────────────────────── */
const TABS = [
    { key: 'pending', label: 'Pending', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500' },
    { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-orange-400', bg: 'bg-orange-500' },
    { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-500' },
    { key: 'all', label: 'All Items', icon: Package, color: 'text-orange-400', bg: 'bg-orange-500' },
];

// LOCATIONS now imported from @/lib/constants — edit that file to add/remove locations

/* ─────────────────────────── ITEM CARD ─────────────────────────── */
function AdminItemCard({ item, onApprove, onReject, onDelete, onPreview, processing, selected, onToggleSelect }) {
    const poster = item.profiles;
    const isPending = item.moderation_status === 'pending';
    const isRejected = item.moderation_status === 'rejected';
    const isApproved = item.moderation_status === 'approved';

    const statusColors = {
        pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        approved: 'bg-green-500/15 text-green-400 border-green-500/30',
        rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`bg-white/[0.02] backdrop-blur-md border rounded-[1.5rem] overflow-hidden hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all duration-300 group flex flex-col h-full ${selected ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'border-white/5'}`}
        >
            {/* Image + Status Badge + Checkbox */}
            <div className="relative h-28 w-full cursor-pointer overflow-hidden" onClick={() => onPreview(item)}>
                {/* Selection checkbox */}
                <button onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
                    className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selected ? 'bg-orange-500 border-orange-400' : 'bg-black/40 border-white/30 backdrop-blur-md hover:border-orange-500/60'}`}>
                    {selected && <CheckCircle size={12} className="text-white" />}
                </button>
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye size={20} className="text-white" />
                </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div>
                    <div className="overflow-hidden mb-2">
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: -200, right: 0 }}
                            className="flex items-center gap-1.5 pb-1 cursor-grab active:cursor-grabbing w-max"
                        >
                            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${statusColors[item.moderation_status]}`}>
                                {item.moderation_status}
                            </span>
                            <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                {item.category}
                            </span>
                            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${item.status === 'Resolved' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                {item.status === 'Resolved' ? 'RESOLVED' : 'UNRESOLVED'}
                            </span>
                            {item.ai_flagged && (
                                <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                    <ShieldAlert size={10} /> AI FLAGGED
                                </span>
                            )}
                        </motion.div>
                    </div>
                    <h3 className="font-bold text-white text-base tracking-tight line-clamp-1">{item.title}</h3>
                    <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{item.description || 'No description'}</p>
                </div>

                {/* Item type + Location */}
                <div className="flex items-center gap-3 text-white/30">
                    {item.item_category && item.item_category !== 'Other' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/60">{item.item_category}</span>
                    )}
                    <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.location_tag}</span>
                    </div>
                </div>

                {/* ─── FOOTER SECTION ─── */}
                <div className="mt-auto space-y-3 pt-3 border-t border-white/5">
                    {/* Poster info */}
                    <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg border border-white/5">
                        <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center overflow-hidden shrink-0">
                            {poster?.avatar_url ? (
                                <img src={poster.avatar_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <User size={12} className="text-orange-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="text-sm leading-tight font-bold text-white truncate">{poster?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] leading-tight text-white/40 font-mono">{poster?.student_number || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        {isPending && (
                            <>
                                <button
                                    onClick={() => onApprove(item.id)}
                                    disabled={processing}
                                    className="flex-1 py-2 bg-white/[0.03] hover:bg-green-500/10 text-white border border-white/10 hover:border-green-500/50 rounded-lg font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    <CheckCircle size={10} className="text-green-500" /> APPROVE
                                </button>
                                <button
                                    onClick={() => onReject(item.id)}
                                    disabled={processing}
                                    className="flex-1 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white/70 hover:text-white border border-white/10 hover:border-red-500/50 rounded-lg font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    <XCircle size={10} className="text-red-500" /> REJECT
                                </button>
                            </>
                        )}
                        {isRejected && (
                            <button
                                onClick={() => onApprove(item.id)}
                                disabled={processing}
                                className="flex-1 py-2 bg-white/[0.03] hover:bg-green-500/10 text-white border border-white/10 hover:border-green-500/50 rounded-lg font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                <CheckCircle size={10} className="text-green-500" /> RE-APPROVE
                            </button>
                        )}
                        {isApproved && (
                            <button
                                onClick={() => onReject(item.id)}
                                disabled={processing}
                                className="flex-1 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white/70 hover:text-white border border-white/10 hover:border-red-500/50 rounded-lg font-black text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                <XCircle size={10} className="text-red-500" /> REVOKE
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(item.id)}
                            disabled={processing}
                            className="p-2 bg-white/[0.03] hover:bg-red-500/10 text-white/50 hover:text-white border border-white/10 hover:border-red-500/50 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                            title="Delete permanently"
                        >
                            <Trash2 size={12} className="text-red-500" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────── PREVIEW MODAL ─────────────────────── */
function PreviewModal({ item, onClose }) {
    if (!item) return null;
    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-[#111]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
            >
                <img src={item.image_url} alt={item.title} className="w-full aspect-video object-cover" />
                <div className="p-8 space-y-4 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <h2 className="text-2xl font-black text-white relative z-10">{item.title}</h2>
                    <div className="flex items-center gap-2 text-orange-500 relative z-10">
                        <MapPin size={14} />
                        <span className="text-xs font-bold uppercase tracking-widest">{item.location_tag}</span>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed relative z-10">{item.description || 'No description provided.'}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs relative z-10 mt-6">
                        <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                            <p className="text-white/30 uppercase tracking-widest font-black mb-2 text-[10px]">Category</p>
                            <p className="text-white font-bold">{item.category}</p>
                        </div>
                        <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                            <p className="text-white/30 uppercase tracking-widest font-black mb-2 text-[10px]">Status</p>
                            <p className="text-white font-bold">{item.status}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs tracking-widest transition-all mt-6 relative z-10"
                    >
                        CLOSE PREVIEW
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/* ─────────────────────────── STAT CARD ────────────────────────── */
function StatCard({ label, count, icon: Icon, color, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`p-5 rounded-[1.5rem] border transition-all duration-300 text-left backdrop-blur-md relative overflow-hidden group ${active ? 'bg-orange-500/15 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                }`}
        >
            <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full pointer-events-none opacity-20 transition-opacity duration-300 ${active ? 'opacity-40' : 'group-hover:opacity-30'} ${color === 'text-yellow-400' ? 'bg-yellow-500' : color === 'text-green-400' ? 'bg-green-500' : color === 'text-red-500' || color === 'text-red-400' ? 'bg-red-500' : 'bg-orange-500'}`} />
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className={`p-2 rounded-xl bg-white/5 border border-white/5 ${active ? 'scale-110 shadow-lg' : ''} transition-transform`}>
                    <Icon size={20} className={color} />
                </div>
                <span className="text-3xl font-black text-white">{count}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 relative z-10">{label}</p>
        </button>
    );
}

/* ─────────────────────────── DELETE CONFIRMATION ────────────────── */
function DeleteConfirmModal({ onConfirm, onCancel, processing, message }) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                onClick={onCancel}
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <AlertTriangle size={36} className="text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 relative z-10">Confirm Delete</h3>
                <p className="text-white/40 text-sm mb-8 leading-relaxed relative z-10">{message || 'This will permanently remove the item and all associated data.'}</p>
                <div className="space-y-3 relative z-10">
                    <button
                        onClick={onConfirm}
                        disabled={processing}
                        className="w-full py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black tracking-widest uppercase text-xs transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} className="text-red-500" /> YES, DELETE</>}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs tracking-widest transition-all"
                    >
                        CANCEL
                    </button>
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

function BanReasonModal({ onConfirm, onCancel, processing }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onCancel} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                    <Ban size={30} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 text-center relative z-10">Ban User</h3>
                <p className="text-white/40 text-xs mb-6 text-center relative z-10">Select a reason or type a custom one. The user will be notified via email.</p>
                {/* Premade reason chips */}
                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                    {BAN_PREMADE_REASONS.map((r) => (
                        <button key={r} onClick={() => setReason(r)} type="button"
                            className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wide border transition-all ${reason === r
                                    ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)]'
                                    : 'bg-white/[0.03] border-white/10 text-white/40 hover:border-red-500/30 hover:text-white/80'
                                }`}>
                            {r}
                        </button>
                    ))}
                </div>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Or type a custom reason..."
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/50 focus:bg-white/[0.04] transition-all resize-none h-24 mb-6 relative z-10 shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]"
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

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════ */
export default function AdminPage() {
    const router = useRouter();
    const { user, isAdmin, guardLoading } = useAdminGuard();

    const [adminSection, setAdminSection] = useState('posts'); // 'posts' | 'users' | 'reports' | 'ai-logs'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [previewItem, setPreviewItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState(null);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [itemTypeFilter, setItemTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Resolved'
    const [locationFilter, setLocationFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Batch selection
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
    const [userRefreshTrigger, setUserRefreshTrigger] = useState(0);

    // Stats
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

    // Reports
    const [reports, setReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [reportProcessing, setReportProcessing] = useState(null); // report id being processed
    const [reportFilter, setReportFilter] = useState('pending'); // 'all' | 'pending' | 'dismissed' | 'valid' | 'valid_ban'
    const [selectedReport, setSelectedReport] = useState(null); // full report for detail modal
    const [reportBanReasonTarget, setReportBanReasonTarget] = useState(null);
    const [selectedReports, setSelectedReports] = useState(new Set()); // multi-select for batch delete
    const [batchReportDeleteConfirm, setBatchReportDeleteConfirm] = useState(false);

    // AI Moderation Logs
    const [aiLogs, setAiLogs] = useState([]);
    const [aiLogsLoading, setAiLogsLoading] = useState(false);
    const [aiLogFilter, setAiLogFilter] = useState('flagged'); // 'all' | 'flagged' | 'unreviewed' | 'confirmed' | 'dismissed'
    const [selectedAiLogs, setSelectedAiLogs] = useState(new Set());
    const [batchAiLogDeleteConfirm, setBatchAiLogDeleteConfirm] = useState(false);
    const [selectedAiLog, setSelectedAiLog] = useState(null);

    // Refs for drag constraints calculation
    const typeScrollRef = useRef(null);
    const [typeConstraints, setTypeConstraints] = useState({ left: 0, right: 0 });
    const locScrollRef = useRef(null);
    const [locConstraints, setLocConstraints] = useState({ left: 0, right: 0 });

    useEffect(() => {
        if (typeScrollRef.current) {
            const width = typeScrollRef.current.scrollWidth - typeScrollRef.current.offsetWidth;
            setTypeConstraints({ left: -Math.max(0, width), right: 0 });
        }
    }, [showFilters]);

    useEffect(() => {
        if (locScrollRef.current) {
            const width = locScrollRef.current.scrollWidth - locScrollRef.current.offsetWidth;
            setLocConstraints({ left: -Math.max(0, width), right: 0 });
        }
    }, [showFilters]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchReports = async () => {
        if (!user) return;
        setReportsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/reports', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const json = await res.json();
            if (res.ok) setReports(json.reports || []);
        } catch (err) {
            console.error('fetchReports error:', err);
        } finally {
            setReportsLoading(false);
        }
    };

    const handleReportAction = async (reportId, status, reportedUserId, banUser = false) => {
        const prevReports = reports;

        // Optimistic update
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
        setReportProcessing(null);
        showToast(status === 'valid' ? (banUser ? 'Report validated & user banned' : 'Report marked as valid') : 'Report dismissed');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    reportId,
                    status,
                    banUser,
                    banReason: 'Reported and verified by admin for community guideline violations.',
                }),
            });
            if (!res.ok) throw new Error('Failed to update report');
        } catch (err) {
            setReports(prevReports);
            showToast(err.message, 'error');
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!confirm('Are you sure you want to permanently delete this report? This cannot be undone.')) return;
        const prevReports = reports;

        // Optimistic removal
        setReports(prev => prev.filter(r => r.id !== reportId));
        showToast('Report deleted permanently');
        setSelectedReport(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/reports?id=${reportId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) throw new Error('Failed to delete report');
        } catch (err) {
            setReports(prevReports);
            showToast(err.message, 'error');
        }
    };

    const handleBatchDeleteReports = async () => {
        if (selectedReports.size === 0) return;
        const prevReports = reports;
        const count = selectedReports.size;
        const ids = [...selectedReports];

        // Optimistic removal
        setReports(prev => prev.filter(r => !selectedReports.has(r.id)));
        showToast(`${count} report(s) deleted permanently`);
        setSelectedReports(new Set());
        setBatchReportDeleteConfirm(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/reports', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) throw new Error('Failed to delete reports');
        } catch (err) {
            setReports(prevReports);
            showToast(err.message, 'error');
        }
    };

    const fetchAiLogs = async () => {
        setAiLogsLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/ai-logs', { headers });
            const json = await res.json();
            if (res.ok) setAiLogs(json.logs || []);
        } catch (err) {
            console.error('fetchAiLogs error:', err);
        } finally {
            setAiLogsLoading(false);
        }
    };

    const handleAiLogReview = async (logId, decision) => {
        const prevLogs = aiLogs;

        // Optimistic update
        setAiLogs(prev => prev.map(l => l.id === logId ? { ...l, admin_reviewed: true, admin_decision: decision } : l));
        showToast(`AI log marked as ${decision}`);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/ai-logs', {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ logId, decision }),
            });
            if (!res.ok) throw new Error('Failed to update AI log');
        } catch (err) {
            setAiLogs(prevLogs);
            showToast(err.message, 'error');
        }
    };

    const handleBatchDeleteAiLogs = async () => {
        if (selectedAiLogs.size === 0) return;
        const prevLogs = aiLogs;
        const count = selectedAiLogs.size;
        const ids = [...selectedAiLogs];

        // Optimistic removal
        setAiLogs(prev => prev.filter(l => !selectedAiLogs.has(l.id)));
        showToast(`${count} AI log(s) deleted`);
        setSelectedAiLogs(new Set());
        setBatchAiLogDeleteConfirm(false);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/ai-logs', {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) throw new Error('Failed to delete AI logs');
        } catch (err) {
            setAiLogs(prevLogs);
            showToast(err.message, 'error');
        }
    };

    const handleBatchAiLogReview = async (decision) => {
        if (selectedAiLogs.size === 0) return;
        const prevLogs = aiLogs;
        const count = selectedAiLogs.size;
        const ids = [...selectedAiLogs];

        // Optimistic batch update
        setAiLogs(prev => prev.map(l => selectedAiLogs.has(l.id) ? { ...l, admin_reviewed: true, admin_decision: decision } : l));
        showToast(`${count} log(s) marked as ${decision}`);
        setSelectedAiLogs(new Set());

        try {
            const headers = await getAuthHeaders();
            const results = await Promise.all(
                ids.map(logId =>
                    fetch('/api/admin/ai-logs', {
                        method: 'PATCH',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ logId, decision }),
                    })
                )
            );
            const failCount = results.filter(r => !r.ok).length;
            if (failCount > 0) {
                setAiLogs(prevLogs);
                showToast(`${failCount} log(s) failed to update`, 'error');
            }
        } catch (err) {
            setAiLogs(prevLogs);
            showToast(err.message, 'error');
        }
    };

    const handleRefresh = () => {
        if (adminSection === 'posts') {
            fetchItems();
            fetchStats();
        } else if (adminSection === 'users') {
            setUserRefreshTrigger(prev => prev + 1);
        } else if (adminSection === 'reports') {
            fetchReports();
        } else if (adminSection === 'ai-logs') {
            fetchAiLogs();
        }
    };

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${session?.access_token}` };
    };

    /* ───── Fetch items ───── */
    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const headers = await getAuthHeaders();

            const res = await fetch(`/api/admin/items?status=${activeTab}`, { headers });
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to fetch');
            setItems(json.items || []);
        } catch (err) {
            console.error('Fetch error:', err);
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    /* ───── Fetch stats ───── */
    const fetchStats = useCallback(async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/items?status=all', { headers });
            const json = await res.json();

            if (res.ok && json.items) {
                const all = json.items;
                setStats({
                    pending: all.filter(i => i.moderation_status === 'pending').length,
                    approved: all.filter(i => i.moderation_status === 'approved').length,
                    rejected: all.filter(i => i.moderation_status === 'rejected').length,
                    total: all.length,
                });
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!guardLoading && isAdmin) {
            fetchItems();
            fetchStats();
        }
    }, [guardLoading, isAdmin, fetchItems, fetchStats]);

    /* ───── Moderation actions (optimistic UI) ───── */
    const handleModerate = async (itemId, action) => {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        // Snapshot for rollback
        const prevItems = items;
        const prevStats = { ...stats };

        // Optimistic update — instant UI change
        // On specific tabs, remove the card (it no longer belongs); on 'all' tab, update badge in-place
        if (activeTab !== 'all') {
            setItems(prev => prev.filter(i => i.id !== itemId));
        } else {
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, moderation_status: newStatus } : i));
        }
        setStats(prev => {
            const oldItem = items.find(i => i.id === itemId);
            if (!oldItem) return prev;
            const oldStatus = oldItem.moderation_status;
            return {
                ...prev,
                [oldStatus]: Math.max(0, prev[oldStatus] - 1),
                [newStatus]: prev[newStatus] + 1,
            };
        });
        showToast(`Item ${action === 'approve' ? 'approved' : 'rejected'} successfully`);

        // Background API call
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/items', {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, action }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error);
            }
        } catch (err) {
            // Rollback on failure
            setItems(prevItems);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };

    const handleDelete = async (itemId) => {
        const prevItems = items;
        const prevStats = { ...stats };
        const deletedItem = items.find(i => i.id === itemId);

        // Optimistic removal
        setItems(prev => prev.filter(i => i.id !== itemId));
        if (deletedItem) {
            setStats(prev => ({
                ...prev,
                [deletedItem.moderation_status]: Math.max(0, prev[deletedItem.moderation_status] - 1),
                total: Math.max(0, prev.total - 1),
            }));
        }
        showToast('Item deleted permanently');
        setDeleteTarget(null);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/items', {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error);
            }
        } catch (err) {
            setItems(prevItems);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };

    /* ───── Batch actions ───── */
    const toggleSelect = (id) => setSelectedItems(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) setSelectedItems(new Set());
        else setSelectedItems(new Set(filteredItems.map(i => i.id)));
    };
    const handleBatchModerate = async (action) => {
        if (selectedItems.size === 0) return;
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const prevItems = items;
        const prevStats = { ...stats };
        const ids = [...selectedItems];

        // Optimistic batch update
        const statDelta = {};
        items.forEach(i => {
            if (selectedItems.has(i.id)) {
                statDelta[i.moderation_status] = (statDelta[i.moderation_status] || 0) - 1;
                statDelta[newStatus] = (statDelta[newStatus] || 0) + 1;
            }
        });
        // On specific tabs, remove cards (they no longer belong); on 'all' tab, update badge in-place
        if (activeTab !== 'all') {
            setItems(prev => prev.filter(i => !selectedItems.has(i.id)));
        } else {
            setItems(prev => prev.map(i => selectedItems.has(i.id) ? { ...i, moderation_status: newStatus } : i));
        }
        setStats(prev => {
            const next = { ...prev };
            Object.entries(statDelta).forEach(([k, v]) => { next[k] = Math.max(0, (next[k] || 0) + v); });
            return next;
        });
        showToast(`${ids.length} item(s) ${action === 'approve' ? 'approved' : 'rejected'}`);
        setSelectedItems(new Set());

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/items', {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids, action }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error);
            }
        } catch (err) {
            setItems(prevItems);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };
    const handleBatchDelete = async () => {
        if (selectedItems.size === 0) return;
        const prevItems = items;
        const prevStats = { ...stats };
        const ids = [...selectedItems];

        // Optimistic batch delete
        const statDelta = { total: 0 };
        items.forEach(i => {
            if (selectedItems.has(i.id)) {
                statDelta[i.moderation_status] = (statDelta[i.moderation_status] || 0) - 1;
                statDelta.total--;
            }
        });
        setItems(prev => prev.filter(i => !selectedItems.has(i.id)));
        setStats(prev => {
            const next = { ...prev };
            Object.entries(statDelta).forEach(([k, v]) => { next[k] = Math.max(0, (next[k] || 0) + v); });
            return next;
        });
        showToast(`${ids.length} item(s) deleted permanently`);
        setSelectedItems(new Set());
        setBatchDeleteConfirm(false);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/admin/items', {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: ids }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error);
            }
        } catch (err) {
            setItems(prevItems);
            setStats(prevStats);
            showToast(err.message, 'error');
        }
    };

    const hasActiveFilters = categoryFilter !== 'All' || itemTypeFilter !== 'All' || statusFilter !== 'All' || locationFilter !== 'All' || dateFrom || dateTo;

    /* ───── Filter by search + filters ───── */
    const filteredItems = items.filter(item => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || (
            item.title?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.profiles?.full_name?.toLowerCase().includes(q) ||
            item.profiles?.student_number?.toLowerCase().includes(q)
        );
        const matchesItemType = itemTypeFilter === 'All' || item.item_category === itemTypeFilter;
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        const matchesLocation = locationFilter === 'All' || item.location_tag === locationFilter;
        const itemDate = new Date(item.created_at);
        const matchesDateFrom = !dateFrom || itemDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || itemDate <= new Date(dateTo + 'T23:59:59');
        return matchesSearch && matchesCategory && matchesItemType && matchesStatus && matchesLocation && matchesDateFrom && matchesDateTo;
    });

    /* ───── Loading guard ───── */
    if (guardLoading) {
        return <AdminLoading />;
    }

    return (
        <div className="min-h-full text-white font-sans">
            {/* ─── HEADER ─── */}
            <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/Home')}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-orange-400"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                                <Shield size={20} className="text-black" strokeWidth={3} />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-black tracking-tight">Admin Dashboard</h1>
                                <p className="text-[10px] text-orange-400/50 font-bold uppercase tracking-widest">
                                    {adminSection === 'posts' ? 'Post Moderation' : adminSection === 'users' ? 'User Moderation' : adminSection === 'ai-logs' ? 'AI Moderation Logs' : 'User Reports'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Pending count badge */}
                        {stats.pending > 0 && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border border-yellow-500/30 rounded-xl">
                                <Clock size={14} className="text-yellow-400" />
                                <span className="text-xs font-black text-yellow-400">{stats.pending} pending</span>
                            </div>
                        )}
                        <button
                            onClick={handleRefresh}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-orange-400"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={loading || reportsLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="w-full max-w-[100rem] mx-auto flex flex-col md:flex-row items-start relative">
                {/* ─── DESKTOP SIDEBAR ─── */}
                <aside className="hidden md:block sticky top-[80px] w-64 shrink-0 p-6 md:pr-0 h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide z-40">
                    <div className="flex flex-col gap-2 bg-white/[0.02] p-3 rounded-[2rem] border border-white/5 backdrop-blur-md">
                        <button onClick={() => setAdminSection('posts')}
                            className={`relative flex items-center gap-3 px-5 py-4 rounded-[1.2rem] text-xs font-black tracking-widest transition-colors w-full text-left ${adminSection === 'posts' ? 'text-white' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'}`}>
                            {adminSection === 'posts' && <motion.div layoutId="adminSidebar" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[1.2rem]" />}
                            <Package size={18} className="relative z-10 shrink-0" />
                            <span className="relative z-10">Posts</span>
                        </button>
                        <button onClick={() => setAdminSection('users')}
                            className={`relative flex items-center gap-3 px-5 py-4 rounded-[1.2rem] text-xs font-black tracking-widest transition-colors w-full text-left ${adminSection === 'users' ? 'text-white' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'}`}>
                            {adminSection === 'users' && <motion.div layoutId="adminSidebar" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[1.2rem]" />}
                            <Users size={18} className="relative z-10 shrink-0" />
                            <span className="relative z-10">Users</span>
                        </button>
                        <button onClick={() => { setAdminSection('reports'); fetchReports(); }}
                            className={`relative flex items-center gap-3 px-5 py-4 rounded-[1.2rem] text-xs font-black tracking-widest transition-colors w-full text-left ${adminSection === 'reports' ? 'text-white' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'}`}>
                            {adminSection === 'reports' && <motion.div layoutId="adminSidebar" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[1.2rem]" />}
                            <Flag size={18} className="relative z-10 shrink-0" />
                            <span className="relative z-10 flex items-center justify-between flex-1">
                                Reports
                                {reports.filter(r => r.status === 'pending').length > 0 && (
                                    <span className="px-2 py-0.5 bg-red-500 rounded-md text-[9px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] ml-2">
                                        {reports.filter(r => r.status === 'pending').length}
                                    </span>
                                )}
                            </span>
                        </button>
                        <button onClick={() => { setAdminSection('ai-logs'); fetchAiLogs(); }}
                            className={`relative flex items-center gap-3 px-5 py-4 rounded-[1.2rem] text-xs font-black tracking-widest transition-colors w-full text-left ${adminSection === 'ai-logs' ? 'text-white' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'}`}>
                            {adminSection === 'ai-logs' && <motion.div layoutId="adminSidebar" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[1.2rem]" />}
                            <ShieldAlert size={18} className="relative z-10 shrink-0" />
                            <span className="relative z-10 flex items-center justify-between flex-1">
                                AI Logs
                                {aiLogs.filter(l => l.flagged && !l.admin_reviewed).length > 0 && (
                                    <span className="px-2 py-0.5 bg-red-500 rounded-md text-[9px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] ml-2">
                                        {aiLogs.filter(l => l.flagged && !l.admin_reviewed).length}
                                    </span>
                                )}
                            </span>
                        </button>
                    </div>
                </aside>

                {/* ─── MOBILE SWITCHER (FALLBACK) ─── */}
                <div className="md:hidden w-full overflow-x-auto px-6 py-4 border-b border-white/5 scrollbar-hide">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md w-max">
                        <button onClick={() => setAdminSection('posts')}
                            className={`relative flex items-center gap-2 px-6 py-3 rounded-[0.9rem] text-xs font-black tracking-widest transition-colors ${adminSection === 'posts' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>
                            {adminSection === 'posts' && <motion.div layoutId="adminMobileTab" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[0.9rem]" />}
                            <span className="relative z-10 flex items-center gap-2"><Package size={16} /> Posts</span>
                        </button>
                        <button onClick={() => setAdminSection('users')}
                            className={`relative flex items-center gap-2 px-6 py-3 rounded-[0.9rem] text-xs font-black tracking-widest transition-colors ${adminSection === 'users' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>
                            {adminSection === 'users' && <motion.div layoutId="adminMobileTab" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[0.9rem]" />}
                            <span className="relative z-10 flex items-center gap-2"><Users size={16} /> Users</span>
                        </button>
                        <button onClick={() => { setAdminSection('reports'); fetchReports(); }}
                            className={`relative flex items-center gap-2 px-6 py-3 rounded-[0.9rem] text-xs font-black tracking-widest transition-colors ${adminSection === 'reports' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>
                            {adminSection === 'reports' && <motion.div layoutId="adminMobileTab" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[0.9rem]" />}
                            <span className="relative z-10 flex items-center gap-2">
                                <Flag size={16} /> Reports
                                {reports.filter(r => r.status === 'pending').length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 rounded-md text-[9px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                        {reports.filter(r => r.status === 'pending').length}
                                    </span>
                                )}
                            </span>
                        </button>
                        <button onClick={() => { setAdminSection('ai-logs'); fetchAiLogs(); }}
                            className={`relative flex items-center gap-2 px-6 py-3 rounded-[0.9rem] text-xs font-black tracking-widest transition-colors ${adminSection === 'ai-logs' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>
                            {adminSection === 'ai-logs' && <motion.div layoutId="adminMobileTab" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.4)] rounded-[0.9rem]" />}
                            <span className="relative z-10 flex items-center gap-2">
                                <ShieldAlert size={16} /> AI Logs
                                {aiLogs.filter(l => l.flagged && !l.admin_reviewed).length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 rounded-md text-[9px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                        {aiLogs.filter(l => l.flagged && !l.admin_reviewed).length}
                                    </span>
                                )}
                            </span>
                        </button>
                    </div>
                </div>

                {/* ─── MAIN CONTENT ─── */}
                <main className="flex-1 w-full min-w-0 p-6 md:py-8 md:pr-8 md:pl-4 lg:py-8 lg:pr-10 lg:pl-4 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
                    <div className={`${adminSection === 'users' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col overflow-hidden`}>
                        <AdminUsersSection refreshTrigger={userRefreshTrigger} />
                    </div>

                {/* ─── REPORTS SECTION ─── */}
                <div className={`${adminSection === 'reports' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col overflow-hidden`}>
                    <div className="shrink-0 space-y-6 pb-4">

                        {/* Reports Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 overflow-hidden rounded-[1.5rem]">
                            {[
                                { label: 'For Review', count: reports.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-yellow-400', tab: 'pending' },
                                { label: 'Dismissed', count: reports.filter(r => r.status === 'dismissed').length, icon: XCircle, color: 'text-white/40', tab: 'dismissed' },
                                { label: 'Invalid', count: reports.filter(r => r.status === 'valid').length, icon: CheckCircle, color: 'text-gray-400', tab: 'valid' },
                                { label: 'Valid + Ban', count: reports.filter(r => r.status === 'valid_ban').length, icon: Ban, color: 'text-red-500', tab: 'valid_ban' },
                                { label: 'Total Reports', count: reports.length, icon: Flag, color: 'text-orange-400', tab: 'all' }
                            ].map(s => (
                                <button key={s.tab} onClick={() => { setReportFilter(s.tab); setSelectedReports(new Set()); }}
                                    className={`p-5 rounded-[1.5rem] border transition-all duration-300 text-left backdrop-blur-md relative overflow-hidden group ${reportFilter === s.tab ? 'bg-orange-500/15 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full pointer-events-none opacity-20 transition-opacity duration-300 ${reportFilter === s.tab ? 'opacity-40' : 'group-hover:opacity-30'} ${s.color === 'text-yellow-400' ? 'bg-yellow-500' : s.color === 'text-green-400' ? 'bg-green-500' : s.color === 'text-red-500' || s.color === 'text-red-400' ? 'bg-red-500' : 'bg-orange-500'}`} />
                                    <div className="flex items-center justify-between mb-3 relative z-10">
                                        <div className={`p-2 rounded-xl bg-white/5 border border-white/5 ${reportFilter === s.tab ? 'scale-110 shadow-lg' : ''} transition-transform`}>
                                            <s.icon size={20} className={s.color} />
                                        </div>
                                        <span className="text-3xl font-black text-white">{s.count}</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 relative z-10">{s.label}</p>
                                </button>
                            ))}
                        </div>

                        {/* Filter Tabs */}
                        <div className="overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide">
                            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md w-max gap-1">
                                {[
                                    { key: 'pending', label: 'For Review' },
                                    { key: 'dismissed', label: 'Dismissed' },
                                    { key: 'valid', label: 'Invalid' },
                                    { key: 'valid_ban', label: 'Valid + Ban' },
                                    { key: 'all', label: 'All' },
                                ].map(tab => (
                                    <button key={tab.key} onClick={() => { setReportFilter(tab.key); setSelectedReports(new Set()); }}
                                        className={`px-4 py-2 rounded-[0.9rem] text-xs font-black tracking-widest transition-all whitespace-nowrap ${reportFilter === tab.key ? 'bg-orange-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}>
                                        {tab.label}
                                        {tab.key === 'pending' && reports.filter(r => r.status === 'pending').length > 0 && (
                                            <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[8px] rounded-full font-black">
                                                {reports.filter(r => r.status === 'pending').length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                        {(() => {
                            const filteredReports = reportFilter === 'all' ? reports : reports.filter(r => r.status === reportFilter);
                            const toggleReportSelect = (id, e) => { e.stopPropagation(); setSelectedReports(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
                            const toggleReportSelectAll = () => { selectedReports.size === filteredReports.length ? setSelectedReports(new Set()) : setSelectedReports(new Set(filteredReports.map(r => r.id))); };

                            return reportsLoading ? (
                            <div className="p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/5 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                                    {[1,2,3,4,5,6].map(i => (
                                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 bg-white/5 rounded-md shrink-0" />
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="h-3 w-24 bg-white/10 rounded" />
                                                    <div className="h-2 w-32 bg-white/5 rounded" />
                                                </div>
                                                <div className="h-4 w-16 bg-yellow-500/10 rounded-full" />
                                            </div>
                                            <div className="h-2.5 w-full bg-white/5 rounded" />
                                            <div className="h-2.5 w-3/4 bg-white/5 rounded" />
                                            <div className="flex justify-between">
                                                <div className="h-2 w-12 bg-white/5 rounded" />
                                                <div className="h-2 w-16 bg-white/5 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            ) : filteredReports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-white/20 border border-white/5 rounded-3xl">
                                    <Flag size={32} className="mb-3 opacity-30" />
                                    <p className="text-sm font-black uppercase tracking-widest">
                                        {reportFilter === 'all' ? 'No reports yet' : `No ${reportFilter === 'valid_ban' ? 'valid + ban' : reportFilter} reports`}
                                    </p>
                                </div>
                            ) : (<>
                                {/* Select all + batch actions bar — pinned above scroll */}
                                <div className="shrink-0 flex items-center gap-3 flex-wrap pb-3">
                                        <button onClick={toggleReportSelectAll}
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedReports.size === filteredReports.length && filteredReports.length > 0 ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/20 hover:border-orange-500/60'}`}>
                                            {selectedReports.size === filteredReports.length && filteredReports.length > 0 && <CheckCircle size={14} className="text-white" />}
                                        </button>
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                            {selectedReports.size > 0 ? `${selectedReports.size} selected` : 'Select all'}
                                        </span>
                                        {selectedReports.size > 0 && (
                                            <button onClick={() => setBatchReportDeleteConfirm(true)}
                                                className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-black tracking-widest transition-all">
                                                <Trash2 size={14} /> Delete {selectedReports.size}
                                            </button>
                                        )}
                                </div>

                                <div className="flex-1 admin-scroll overflow-y-auto min-h-0 p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/5 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredReports.map(report => (
                                            <motion.div
                                                key={report.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`text-left bg-white/[0.02] backdrop-blur-md border rounded-2xl p-4 hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all duration-300 group cursor-pointer ${selectedReports.has(report.id) ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]' :
                                                        report.status === 'pending' ? 'border-red-500/20' :
                                                            report.status === 'valid' || report.status === 'valid_ban' ? 'border-green-500/20' : 'border-white/10'
                                                    }`}
                                            >
                                                {/* Compact header */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <button onClick={(e) => toggleReportSelect(report.id, e)}
                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedReports.has(report.id) ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/20'}`}>
                                                        {selectedReports.has(report.id) && <CheckCircle size={12} className="text-white" />}
                                                    </button>
                                                    <div className="flex-1 min-w-0" onClick={() => setSelectedReport(report)}>
                                                        <p className="text-xs font-bold text-white truncate">{report.reported_user?.full_name || 'Unknown'}</p>
                                                        <p className="text-[10px] text-white/30 truncate">Reported by {report.reporter?.full_name || 'Unknown'}</p>
                                                    </div>
                                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                                            report.status === 'valid_ban' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                                                report.status === 'valid' ? 'bg-gray-500/10 text-gray-400 border-gray-500/30' :
                                                                    'bg-white/5 text-white/30 border-white/10'
                                                        }`}>
                                                        {report.status === 'pending' ? 'For Review' : report.status === 'valid_ban' ? 'Valid + Ban' : report.status === 'valid' ? 'Invalid' : report.status}
                                                    </span>
                                                </div>
                                                {/* Reason preview — clicks open detail */}
                                                <div onClick={() => setSelectedReport(report)}>
                                                    <p className="text-[11px] text-white/40 line-clamp-2 mb-2">{report.reason}</p>
                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between text-[9px] text-white/20">
                                                        <span>{new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                        {report.chatMessages?.length > 0 && (
                                                            <span className="flex items-center gap-1 text-orange-400/40">
                                                                <MessageSquare size={10} /> {report.chatMessages.length} msgs
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </>);
                        })()}
                </div>

                {/* ─── REPORT DETAIL MODAL ─── */}
                <AnimatePresence>
                    {selectedReport && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setSelectedReport(null)}
                                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative w-full max-w-lg bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none" />
                                <div className="p-6 space-y-5">
                                    {/* Modal header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-black text-white">Report Details</h3>
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                                                {new Date(selectedReport.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteReport(selectedReport.id)}
                                                disabled={reportProcessing === selectedReport.id}
                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all disabled:opacity-50"
                                                title="Delete Report Permanently"
                                            >
                                                {reportProcessing === selectedReport.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                            <button onClick={() => setSelectedReport(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 transition-all">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reported user */}
                                    <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-red-400/60 mb-2">Reported User</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                {selectedReport.reported_user?.avatar_url
                                                    ? <img src={selectedReport.reported_user.avatar_url} className="w-full h-full object-cover" alt="" />
                                                    : <User size={16} className="text-red-400" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{selectedReport.reported_user?.full_name || 'Unknown'}</p>
                                                <p className="text-[10px] text-white/30">{selectedReport.reported_user?.student_number}</p>
                                            </div>
                                            {selectedReport.reported_user?.is_banned && (
                                                <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[8px] font-black uppercase">Banned</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reporter */}
                                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Reported By</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                {selectedReport.reporter?.avatar_url
                                                    ? <img src={selectedReport.reporter.avatar_url} className="w-full h-full object-cover" alt="" />
                                                    : <User size={14} className="text-orange-400" />}
                                            </div>
                                            <p className="text-xs font-bold text-white/60">{selectedReport.reporter?.full_name || 'Unknown'}</p>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Report Reason</p>
                                        <p className="text-white/70 text-sm leading-relaxed">{selectedReport.reason}</p>
                                    </div>

                                    {/* Chat context with profiles */}
                                    {selectedReport.chatMessages?.length > 0 && (
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/80 mb-3 flex items-center gap-2">
                                                <MessageSquare size={14} /> Chat Context ({selectedReport.chatMessages.length} messages)
                                            </p>
                                            <div className="bg-black/40 border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] rounded-3xl p-5 max-h-80 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                {selectedReport.chatMessages.map(msg => {
                                                    const isReported = msg.sender_id === selectedReport.reported_user?.id;
                                                    const senderName = isReported
                                                        ? selectedReport.reported_user?.full_name
                                                        : selectedReport.reporter?.full_name;
                                                    return (
                                                        <div key={msg.id} className={`flex ${isReported ? 'justify-end' : 'justify-start'}`}>
                                                            <div className="max-w-[85%]">
                                                                <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isReported ? 'text-right text-red-400/80' : 'text-white/40'}`}>
                                                                    {senderName || 'Unknown'} {isReported && '⚠️'}
                                                                </p>
                                                                <div className={`px-4 py-3 rounded-[1.5rem] text-sm ${isReported
                                                                        ? 'bg-red-500/20 text-red-100 border border-red-500/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)] rounded-tr-[4px]'
                                                                        : 'bg-white/[0.04] text-white/90 border border-white/10 backdrop-blur-md rounded-tl-[4px] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]'
                                                                    }`}>
                                                                    {msg.image_url ? (
                                                                        <img src={msg.image_url} alt="Shared" className="max-w-[200px] rounded-xl border border-white/10 shadow-lg" />
                                                                    ) : msg.content}
                                                                </div>
                                                                <p className={`text-[9px] font-bold text-white/20 mt-1.5 px-2 ${isReported ? 'text-right' : 'text-left'}`}>
                                                                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reviewer info */}
                                    {selectedReport.status !== 'pending' && selectedReport.reviewer && (
                                        <div className="flex items-center gap-2 text-[10px] text-white/30">
                                            <CheckCircle size={12} className="text-green-400/40" />
                                            <span>Reviewed by <span className="text-white/50 font-bold">{selectedReport.reviewer.full_name}</span></span>
                                        </div>
                                    )}

                                    {/* Actions — only for pending */}
                                    {selectedReport.status === 'pending' && (
                                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                                            <button
                                                onClick={() => { handleReportAction(selectedReport.id, 'dismissed', selectedReport.reported_user?.id); setSelectedReport(null); }}
                                                disabled={reportProcessing === selectedReport.id}
                                                className="w-full py-4 bg-white/[0.03] hover:bg-orange-500/10 text-white border border-white/10 hover:border-orange-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {reportProcessing === selectedReport.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} className="text-orange-500" />}
                                                Dismiss Report
                                            </button>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { handleReportAction(selectedReport.id, 'valid', selectedReport.reported_user?.id, false); setSelectedReport(null); }}
                                                    disabled={reportProcessing === selectedReport.id}
                                                    className="flex-1 py-4 bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <Flag size={14} /> Invalid
                                                </button>
                                                <button
                                                    onClick={() => setReportBanReasonTarget(selectedReport)}
                                                    disabled={reportProcessing === selectedReport.id || selectedReport.reported_user?.is_banned}
                                                    className="flex-1 py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <Ban size={14} className="text-red-500" /> {selectedReport.reported_user?.is_banned ? 'Banned' : 'Valid + Ban'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Close button for non-pending */}
                                    {selectedReport.status !== 'pending' && (
                                        <button onClick={() => setSelectedReport(null)}
                                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                                            CLOSE
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ─── BATCH REPORT DELETE CONFIRMATION ─── */}
                <AnimatePresence>
                    {batchReportDeleteConfirm && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setBatchReportDeleteConfirm(false)} />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                                <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                                    <Trash2 size={36} className="text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 relative z-10">Delete {selectedReports.size} Report{selectedReports.size > 1 ? 's' : ''}?</h3>
                                <p className="text-white/40 text-sm mb-6 leading-relaxed relative z-10">This action is permanent and cannot be undone.</p>
                                <div className="space-y-3 relative z-10">
                                    <button onClick={handleBatchDeleteReports} disabled={processing}
                                        className="w-full py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                        {processing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} className="text-red-500" />} DELETE PERMANENTLY
                                    </button>
                                    <button onClick={() => setBatchReportDeleteConfirm(false)}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">CANCEL</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ─── BAN REASON MODAL (REPORTS) ─── */}
                <AnimatePresence>
                    {reportBanReasonTarget && (
                        <BanReasonModal
                            processing={reportProcessing === reportBanReasonTarget.id}
                            onCancel={() => setReportBanReasonTarget(null)}
                            onConfirm={(reason) => {
                                handleReportAction(reportBanReasonTarget.id, 'valid', reportBanReasonTarget.reported_user?.id, true, reason);
                                setReportBanReasonTarget(null);
                                setSelectedReport(null);
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* ─── AI LOGS SECTION ─── */}
                <div className={`${adminSection === 'ai-logs' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col overflow-hidden`}>
                    <div className="shrink-0 space-y-6 pb-4">

                        {/* AI Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 overflow-hidden rounded-[1.5rem]">
                            {[
                                { label: 'Flagged', count: aiLogs.filter(l => l.flagged).length, icon: ShieldAlert, color: 'text-orange-400', tab: 'flagged' },
                                { label: 'Unreviewed', count: aiLogs.filter(l => l.flagged && !l.admin_reviewed).length, icon: Clock, color: 'text-yellow-400', tab: 'unreviewed' },
                                { label: 'Confirmed', count: aiLogs.filter(l => l.admin_decision === 'confirmed').length, icon: CheckCircle, color: 'text-red-400', tab: 'confirmed' },
                                { label: 'Dismissed', count: aiLogs.filter(l => l.admin_decision === 'dismissed').length, icon: XCircle, color: 'text-green-400', tab: 'dismissed' },
                                { label: 'Total Logs', count: aiLogs.length, icon: Shield, color: 'text-orange-400', tab: 'all' },
                            ].map(s => (
                                <button key={s.tab} onClick={() => { setAiLogFilter(s.tab); setSelectedAiLogs(new Set()); }}
                                    className={`p-5 rounded-[1.5rem] border transition-all duration-300 text-left backdrop-blur-md relative overflow-hidden group ${aiLogFilter === s.tab ? 'bg-orange-500/15 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full pointer-events-none opacity-20 transition-opacity duration-300 ${aiLogFilter === s.tab ? 'opacity-40' : 'group-hover:opacity-30'} ${s.color === 'text-yellow-400' ? 'bg-yellow-500' : s.color === 'text-green-400' ? 'bg-green-500' : s.color === 'text-red-500' || s.color === 'text-red-400' ? 'bg-red-500' : 'bg-orange-500'}`} />
                                    <div className="flex items-center justify-between mb-3 relative z-10">
                                        <div className={`p-2 rounded-xl bg-white/5 border border-white/5 ${aiLogFilter === s.tab ? 'scale-110 shadow-lg' : ''} transition-transform`}>
                                            <s.icon size={20} className={s.color} />
                                        </div>
                                        <span className="text-3xl font-black text-white">{s.count}</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 relative z-10">{s.label}</p>
                                </button>
                            ))}
                        </div>

                        {/* Filter Tabs */}
                        <div className="overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide">
                            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md w-max gap-1">
                                {[
                                    { key: 'flagged', label: 'Flagged' },
                                    { key: 'unreviewed', label: 'Unreviewed' },
                                    { key: 'confirmed', label: 'Confirmed' },
                                    { key: 'dismissed', label: 'Dismissed' },
                                    { key: 'all', label: 'All' },
                                ].map(tab => (
                                    <button key={tab.key} onClick={() => { setAiLogFilter(tab.key); setSelectedAiLogs(new Set()); }}
                                        className={`px-4 py-2 rounded-[0.9rem] text-xs font-black tracking-widest transition-all whitespace-nowrap ${aiLogFilter === tab.key ? 'bg-orange-500 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}>
                                        {tab.label}
                                        {tab.key === 'unreviewed' && aiLogs.filter(l => l.flagged && !l.admin_reviewed).length > 0 && (
                                            <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[8px] rounded-full font-black">
                                                {aiLogs.filter(l => l.flagged && !l.admin_reviewed).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                        {(() => {
                            const filteredAiLogs = aiLogs.filter(l => {
                                switch (aiLogFilter) {
                                    case 'flagged': return l.flagged;
                                    case 'unreviewed': return l.flagged && !l.admin_reviewed;
                                    case 'confirmed': return l.admin_decision === 'confirmed';
                                    case 'dismissed': return l.admin_decision === 'dismissed';
                                    default: return true;
                                }
                            }).sort((a, b) => {
                                if (a.admin_reviewed !== b.admin_reviewed) return a.admin_reviewed ? 1 : -1;
                                return new Date(b.created_at) - new Date(a.created_at);
                            });

                            const toggleAiLogSelect = (id, e) => { e.stopPropagation(); setSelectedAiLogs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
                            const toggleAiLogSelectAll = () => { selectedAiLogs.size === filteredAiLogs.length ? setSelectedAiLogs(new Set()) : setSelectedAiLogs(new Set(filteredAiLogs.map(l => l.id))); };

                            return aiLogsLoading ? (
                            <div className="p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/5 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                                    {[1,2,3,4,5,6].map(i => (
                                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 bg-white/5 rounded-md shrink-0" />
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="h-3 w-28 bg-white/10 rounded" />
                                                    <div className="h-2 w-20 bg-white/5 rounded" />
                                                </div>
                                                <div className="h-4 w-20 bg-yellow-500/10 rounded-full" />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="h-4 w-16 bg-orange-500/10 rounded-md" />
                                                <div className="h-4 w-20 bg-white/5 rounded-md" />
                                            </div>
                                            <div className="h-2.5 w-full bg-white/5 rounded" />
                                            <div className="h-2.5 w-2/3 bg-white/5 rounded" />
                                            <div className="flex justify-between">
                                                <div className="h-2 w-16 bg-white/5 rounded" />
                                                <div className="h-2 w-14 bg-white/5 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            ) : filteredAiLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-white/20 border border-white/5 rounded-3xl">
                                    <ShieldAlert size={32} className="mb-3 opacity-30" />
                                    <p className="text-sm font-black uppercase tracking-widest">
                                        {aiLogFilter === 'all' ? 'No AI moderation logs yet' : `No ${aiLogFilter} logs`}
                                    </p>
                                    <p className="text-xs text-white/15 mt-1">Logs appear when AI scans text or images</p>
                                </div>
                            ) : (<>
                                {/* Select all + batch actions — pinned above scroll */}
                                <div className="shrink-0 flex items-center gap-3 flex-wrap pb-3">
                                        <button onClick={toggleAiLogSelectAll}
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedAiLogs.size === filteredAiLogs.length && filteredAiLogs.length > 0 ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/20 hover:border-orange-500/60'}`}>
                                            {selectedAiLogs.size === filteredAiLogs.length && filteredAiLogs.length > 0 && <CheckCircle size={14} className="text-white" />}
                                        </button>
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                            {selectedAiLogs.size > 0 ? `${selectedAiLogs.size} selected` : 'Select all'}
                                        </span>
                                        {selectedAiLogs.size > 0 && (
                                            <div className="ml-auto flex items-center gap-2 flex-wrap">
                                                {/* Show Confirm only when viewing flagged/unreviewed/all logs */}
                                                {(aiLogFilter === 'flagged' || aiLogFilter === 'unreviewed' || aiLogFilter === 'all') && (
                                                    <button onClick={() => handleBatchAiLogReview('confirmed')} disabled={processing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-xl text-xs font-black tracking-widest transition-all disabled:opacity-50">
                                                        <CheckCircle size={14} className="text-red-500" /> Confirm {selectedAiLogs.size}
                                                    </button>
                                                )}
                                                {/* Show Dismiss only when viewing flagged/unreviewed/all logs */}
                                                {(aiLogFilter === 'flagged' || aiLogFilter === 'unreviewed' || aiLogFilter === 'all') && (
                                                    <button onClick={() => handleBatchAiLogReview('dismissed')} disabled={processing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-orange-500/10 text-white border border-white/10 hover:border-orange-500/50 rounded-xl text-xs font-black tracking-widest transition-all disabled:opacity-50">
                                                        <XCircle size={14} className="text-orange-500" /> Dismiss {selectedAiLogs.size}
                                                    </button>
                                                )}
                                                <button onClick={() => setBatchAiLogDeleteConfirm(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-xl text-xs font-black tracking-widest transition-all">
                                                    <Trash2 size={14} className="text-red-500" /> Delete {selectedAiLogs.size}
                                                </button>
                                            </div>
                                        )}
                                </div>

                                <div className="flex-1 admin-scroll overflow-y-auto min-h-0 p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/5 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredAiLogs.map(log => (
                                            <motion.div key={log.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className={`flex flex-col h-full bg-white/[0.02] backdrop-blur-md border rounded-2xl p-4 transition-all duration-300 hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] cursor-pointer ${selectedAiLogs.has(log.id) ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]' :
                                                        !log.admin_reviewed && log.flagged ? 'border-orange-500/30' :
                                                            log.admin_decision === 'confirmed' ? 'border-red-500/20' :
                                                                'border-white/10'
                                                    }`}>
                                                {/* Compact header — mirrors Report card: checkbox | user info | status */}
                                                <div className="flex items-center gap-3 mb-3 shrink-0">
                                                    <button onClick={(e) => toggleAiLogSelect(log.id, e)}
                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedAiLogs.has(log.id) ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/20'}`}>
                                                        {selectedAiLogs.has(log.id) && <CheckCircle size={12} className="text-white" />}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{log.user?.full_name || 'Unknown User'}</p>
                                                        <p className="text-[10px] text-white/30 truncate">{log.content_type} • {log.ai_model}</p>
                                                    </div>
                                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                        log.admin_reviewed && log.admin_decision === 'confirmed' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                                        log.admin_reviewed && log.admin_decision === 'dismissed' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                                        log.flagged ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                                        'bg-white/5 text-white/30 border-white/10'
                                                    }`}>
                                                        {log.admin_reviewed ? log.admin_decision : log.flagged ? 'Needs Review' : 'Clean'}
                                                    </span>
                                                </div>
                                                {/* Body — clickable to open detail */}
                                                <div className="flex-1 flex flex-col justify-between cursor-pointer space-y-3" onClick={() => setSelectedAiLog(log)}>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                                                                log.flagged
                                                                    ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                                                    : 'bg-white/5 text-white/30 border-white/10'
                                                            }`}>
                                                                {log.flagged ? '⚠ Flagged' : 'Clean'}
                                                            </span>
                                                            <span className="text-[9px] text-purple-400/60 ml-auto flex items-center gap-1"><Eye size={10} /> View Context</span>
                                                        </div>
                                                        {log.input_content && <p className="text-[11px] text-white/50 line-clamp-2 italic">"{log.input_content}"</p>}
                                                        <p className="text-[11px] text-white/40 line-clamp-2">Action: {log.action_taken}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[9px] text-white/20 pt-1">
                                                        <span>{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                        {log.user?.student_number && (
                                                            <span className="text-orange-400/40">{log.user.student_number}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Admin actions — only for flagged + unreviewed */}
                                                {log.flagged && !log.admin_reviewed && (
                                                    <div className="flex gap-2 pt-3 mt-3 border-t border-white/5 shrink-0">
                                                        <button onClick={() => handleAiLogReview(log.id, 'confirmed')}
                                                            title="Confirm — the AI was right, content is harmful"
                                                            className="flex-1 py-2 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-1 active:scale-95">
                                                            <CheckCircle size={12} className="text-red-500" /> Confirm
                                                        </button>
                                                        <button onClick={() => handleAiLogReview(log.id, 'dismissed')}
                                                            title="Dismiss — false positive, content is actually fine"
                                                            className="flex-1 py-2 bg-white/[0.03] hover:bg-orange-500/10 text-white border border-white/10 hover:border-orange-500/50 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-1 active:scale-95">
                                                            <XCircle size={12} className="text-orange-500" /> Dismiss
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </>);
                        })()}
                </div>

                {/* ─── BATCH AI LOG DELETE CONFIRMATION ─── */}
                <AnimatePresence>
                    {batchAiLogDeleteConfirm && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setBatchAiLogDeleteConfirm(false)} />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-[#111] border border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[50px] bg-red-500/30 blur-[40px] rounded-full pointer-events-none" />
                                <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                                    <Trash2 size={36} className="text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 relative z-10">Delete {selectedAiLogs.size} AI Log{selectedAiLogs.size > 1 ? 's' : ''}?</h3>
                                <p className="text-white/40 text-sm mb-6 leading-relaxed relative z-10">This action is permanent and cannot be undone.</p>
                                <div className="space-y-3 relative z-10">
                                    <button onClick={handleBatchDeleteAiLogs} disabled={processing}
                                        className="w-full py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                        {processing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} className="text-red-500" />} DELETE PERMANENTLY
                                    </button>
                                    <button onClick={() => setBatchAiLogDeleteConfirm(false)}
                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">CANCEL</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ─── AI LOG DETAIL MODAL ─── */}
                <AnimatePresence>
                    {selectedAiLog && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setSelectedAiLog(null)}
                                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
                            >
                                <div className="p-6 space-y-5">
                                    {/* Modal header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-black text-white">AI Log Context</h3>
                                            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                                                {new Date(selectedAiLog.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <button onClick={() => setSelectedAiLog(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 transition-all">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* User info */}
                                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Flagged User</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                {selectedAiLog.user?.avatar_url
                                                    ? <img src={selectedAiLog.user.avatar_url} className="w-full h-full object-cover" alt="" />
                                                    : <User size={16} className="text-orange-400" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{selectedAiLog.user?.full_name || 'Unknown User'}</p>
                                                <p className="text-[10px] text-white/30">{selectedAiLog.user?.student_number || 'No student number'}</p>
                                            </div>
                                            {selectedAiLog.user?.is_banned && (
                                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[8px] font-black uppercase">Banned</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content type + Model */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Content Type</p>
                                            <p className="text-sm font-bold text-white capitalize">{selectedAiLog.content_type}</p>
                                        </div>
                                        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">AI Model</p>
                                            <p className="text-[11px] font-bold text-white break-all">{selectedAiLog.ai_model}</p>
                                        </div>
                                    </div>

                                    {/* Flagged content preview */}
                                    {selectedAiLog.input_content && (
                                        <div className={`border rounded-2xl p-4 ${selectedAiLog.flagged ? 'bg-red-500/5 border-red-500/15' : 'bg-white/[0.04] border-white/10'}`}>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-red-400/60 mb-2 flex items-center gap-1.5">
                                                <MessageSquare size={10} /> {selectedAiLog.content_type === 'message' ? 'Flagged Message' : 'Content Info'}
                                            </p>
                                            <p className="text-white/70 text-sm leading-relaxed break-words">{selectedAiLog.input_content}</p>
                                        </div>
                                    )}

                                    {/* AI Analysis — WHY it was flagged */}
                                    <div className="bg-purple-500/5 border border-purple-500/15 rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-400/60 mb-3 flex items-center gap-1.5">
                                            <ShieldAlert size={10} /> AI Analysis — Why It Was Flagged
                                        </p>
                                        <div className="space-y-2">
                                            {/* Flag status */}
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${selectedAiLog.flagged ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-green-500/15 text-green-400 border-green-500/30'}`}>
                                                    {selectedAiLog.flagged ? '⚠ FLAGGED' : '✓ CLEAN'}
                                                </span>
                                                <span className="text-[10px] text-white/30">Action: {selectedAiLog.action_taken}</span>
                                            </div>
                                            {/* Parse ai_result for human-readable display */}
                                            {(() => {
                                                const result = selectedAiLog.ai_result;
                                                if (!result || Object.keys(result).length === 0) return <p className="text-[11px] text-white/30 italic">No detailed AI result data available</p>;

                                                // Emergency blocklist hit
                                                if (result.blocklist_phrase) {
                                                    return (
                                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mt-2">
                                                            <p className="text-[10px] font-black text-red-400 mb-1">🚨 Emergency Blocklist Match</p>
                                                            <p className="text-sm text-red-300 font-mono">"{result.blocklist_phrase}"</p>
                                                            <p className="text-[10px] text-white/30 mt-1">Instantly blocked — matched a known harmful phrase</p>
                                                        </div>
                                                    );
                                                }

                                                // Text model (english scores)
                                                if (result.english) {
                                                    const scores = Array.isArray(result.english?.[0]) ? result.english[0] : (Array.isArray(result.english) ? result.english : null);
                                                    return (
                                                        <div className="space-y-2 mt-2">
                                                            <p className="text-[10px] font-black text-purple-400/80">Toxicity Scores</p>
                                                            {scores ? scores.map((s, i) => (
                                                                <div key={i} className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-bold text-white/50 w-24 uppercase">{s.label}</span>
                                                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                                        <div className={`h-full rounded-full transition-all ${s.label === 'TOXIC' || s.label === 'toxic' ? 'bg-red-500' : 'bg-green-500'}`}
                                                                            style={{ width: `${(s.score * 100).toFixed(0)}%` }} />
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-white/40 w-12 text-right">{(s.score * 100).toFixed(1)}%</span>
                                                                </div>
                                                            )) : <p className="text-[11px] text-white/30">Raw: {JSON.stringify(result.english)}</p>}
                                                        </div>
                                                    );
                                                }

                                                // Image model (nsfw scores array)
                                                if (Array.isArray(result)) {
                                                    const scores = Array.isArray(result[0]) ? result[0] : result;
                                                    return (
                                                        <div className="space-y-2 mt-2">
                                                            <p className="text-[10px] font-black text-purple-400/80">NSFW Detection Scores</p>
                                                            {scores.map((s, i) => (
                                                                <div key={i} className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-bold text-white/50 w-24 uppercase">{s.label}</span>
                                                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                                        <div className={`h-full rounded-full transition-all ${s.label === 'nsfw' || s.label === 'NSFW' ? 'bg-red-500' : 'bg-green-500'}`}
                                                                            style={{ width: `${(s.score * 100).toFixed(0)}%` }} />
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-white/40 w-12 text-right">{(s.score * 100).toFixed(1)}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }

                                                // Fallback: raw JSON display
                                                return (
                                                    <div className="bg-black/30 rounded-xl p-3 mt-2">
                                                        <p className="text-[10px] font-black text-white/30 mb-1">Raw AI Result</p>
                                                        <pre className="text-[10px] text-white/40 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">{JSON.stringify(result, null, 2)}</pre>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Reviewer info */}
                                    {selectedAiLog.admin_reviewed && selectedAiLog.reviewer && (
                                        <div className="flex items-center gap-2 text-[10px] text-white/30">
                                            <CheckCircle size={12} className="text-green-400/40" />
                                            <span>Reviewed by <span className="text-white/50 font-bold">{selectedAiLog.reviewer.full_name}</span> — <span className={selectedAiLog.admin_decision === 'confirmed' ? 'text-red-400' : 'text-green-400'}>{selectedAiLog.admin_decision}</span></span>
                                        </div>
                                    )}

                                    {/* Actions — only for flagged + unreviewed */}
                                    {selectedAiLog.flagged && !selectedAiLog.admin_reviewed && (
                                        <div className="flex gap-2 pt-2 border-t border-white/5">
                                            <button
                                                onClick={() => { handleAiLogReview(selectedAiLog.id, 'confirmed'); setSelectedAiLog(null); }}
                                                className="flex-1 py-4 bg-white/[0.03] hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/50 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 active:scale-95">
                                                <CheckCircle size={14} className="text-red-500" /> Confirm Flag
                                            </button>
                                            <button
                                                onClick={() => { handleAiLogReview(selectedAiLog.id, 'dismissed'); setSelectedAiLog(null); }}
                                                className="flex-1 py-4 bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 active:scale-95">
                                                <XCircle size={14} className="text-white" /> Dismiss
                                            </button>
                                        </div>
                                    )}

                                    {/* Close for reviewed logs */}
                                    {(selectedAiLog.admin_reviewed || !selectedAiLog.flagged) && (
                                        <button onClick={() => setSelectedAiLog(null)}
                                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                                            CLOSE
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <div className={`${adminSection === 'posts' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col overflow-hidden`}>
                    <div className="shrink-0 space-y-6 pb-4">
                        {/* ─── STAT CARDS ─── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden rounded-[1.5rem]">
                        <StatCard label="Pending Review" count={stats.pending} icon={Clock} color="text-yellow-400" active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} />
                        <StatCard label="Approved" count={stats.approved} icon={CheckCircle} color="text-green-400" active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} />
                        <StatCard label="Rejected" count={stats.rejected} icon={XCircle} color="text-red-400" active={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')} />
                        <StatCard label="Total Items" count={stats.total} icon={Package} color="text-orange-400" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
                    </div>

                    {/* ─── TABS + SEARCH + FILTERS ─── */}
                    <div className="relative w-full z-60">
                        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                            <div className="overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
                                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md w-max lg:w-auto">
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-[0.9rem] text-xs font-black tracking-widest transition-all whitespace-nowrap ${activeTab === tab.key
                                                ? `${tab.bg} text-white shadow-lg`
                                                : 'text-white/30 hover:text-white/50'
                                                }`}
                                        >
                                            <tab.icon size={14} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 lg:ml-auto w-full lg:w-auto flex-1 lg:justify-end">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/50" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by title, poster, student ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/4 border border-white/10 py-3 pl-11 pr-4 rounded-xl outline-none text-sm focus:border-orange-500/50 transition-all placeholder:text-white/20"
                                    />
                                </div>

                                {/* Filter toggle */}
                                <button onClick={() => setShowFilters(!showFilters)}
                                    className={`relative p-3 rounded-xl border transition-all shrink-0 ${showFilters ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/10 text-orange-500'}`}>
                                    <Filter size={18} />
                                    {hasActiveFilters && !showFilters && <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-[#0a0a0a]" />}
                                </button>
                            </div>
                        </div>

                        {/* ─── FILTER OVERLAY ─── */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full right-0 mt-2 z-50 w-full max-w-md md:max-w-lg bg-[#121212]/95 border border-white/10 rounded-4xl backdrop-blur-2xl shadow-2xl p-6 space-y-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-black">Filters</span>
                                        {hasActiveFilters && <button onClick={() => { setCategoryFilter('All'); setItemTypeFilter('All'); setStatusFilter('All'); setLocationFilter('All'); setDateFrom(''); setDateTo(''); }}
                                            className="flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-400 font-bold transition-colors"><X size={12} /> Clear all</button>}
                                    </div>
                                    {/* Category */}
                                    <div>
                                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black mb-2 block">Category</label>
                                        <div className="flex gap-2">
                                            {['All', 'Lost', 'Found'].map(c => (
                                                <button key={c} onClick={() => setCategoryFilter(c)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${categoryFilter === c ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>{c}</button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Resolution Status */}
                                    <div>
                                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black mb-2 block">Resolution</label>
                                        <div className="flex gap-2">
                                            {['All', 'Active', 'Resolved'].map(s => (
                                                <button key={s} onClick={() => setStatusFilter(s)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${statusFilter === s ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>
                                                    {s === 'Active' ? 'Unresolved' : s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Item Type */}
                                    <div>
                                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black mb-2 block">Item Type</label>
                                        <div className="relative overflow-hidden rounded-xl -mx-1">
                                            {/* Mobile: horizontal drag scroll */}
                                            <div className="md:hidden" ref={typeScrollRef}>
                                                <motion.div
                                                    drag="x"
                                                    dragConstraints={typeConstraints}
                                                    className="flex gap-2 px-1 pb-1 cursor-grab active:cursor-grabbing w-max"
                                                >
                                                    <button onClick={() => setItemTypeFilter('All')}
                                                        className={`shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${itemTypeFilter === 'All' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>
                                                        All
                                                    </button>
                                                    {ITEM_CATEGORIES.map(cat => (
                                                        <button key={cat.value} onClick={() => setItemTypeFilter(cat.value)}
                                                            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${itemTypeFilter === cat.value ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>
                                                            <span>{cat.emoji}</span> {cat.label}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </div>
                                            {/* Desktop: wrapping grid */}
                                            <div className="hidden md:flex flex-wrap gap-2 px-1 pb-1">
                                                <button onClick={() => setItemTypeFilter('All')}
                                                    className={`px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${itemTypeFilter === 'All' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>
                                                    All
                                                </button>
                                                {ITEM_CATEGORIES.map(cat => (
                                                    <button key={cat.value} onClick={() => setItemTypeFilter(cat.value)}
                                                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${itemTypeFilter === cat.value ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>
                                                        <span>{cat.emoji}</span> {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Location */}
                                    <div>
                                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black mb-2 block">Location</label>
                                        <div className="relative overflow-hidden rounded-xl -mx-1">
                                            {/* Mobile: horizontal drag scroll */}
                                            <div className="md:hidden" ref={locScrollRef}>
                                                <motion.div
                                                    drag="x"
                                                    dragConstraints={locConstraints}
                                                    className="flex gap-2 px-1 pb-1 cursor-grab active:cursor-grabbing w-max"
                                                >
                                                    <button onClick={() => setLocationFilter('All')}
                                                        className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${locationFilter === 'All' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>All</button>
                                                    {CAMPUS_LOCATIONS.map(loc => (
                                                        <button key={loc} onClick={() => setLocationFilter(loc)}
                                                            className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${locationFilter === loc ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>{loc}</button>
                                                    ))}
                                                </motion.div>
                                            </div>
                                            {/* Desktop: wrapping grid */}
                                            <div className="hidden md:flex flex-wrap gap-2 px-1 pb-1">
                                                <button onClick={() => setLocationFilter('All')}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${locationFilter === 'All' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>All</button>
                                                {CAMPUS_LOCATIONS.map(loc => (
                                                    <button key={loc} onClick={() => setLocationFilter(loc)}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${locationFilter === loc ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>{loc}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Date Range */}
                                    <div>
                                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black mb-2 block">Date Range</label>
                                        <CustomDateRangePicker
                                            dateFrom={dateFrom} setDateFrom={setDateFrom}
                                            dateTo={dateTo} setDateTo={setDateTo}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ─── ACTIVE FILTER CHIPS ─── */}
                    <AnimatePresence>
                        {hasActiveFilters && !showFilters && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="flex flex-wrap gap-2">
                                {categoryFilter !== 'All' && (
                                    <button onClick={() => setCategoryFilter('All')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all">
                                        {categoryFilter} <X size={10} className="opacity-60" />
                                    </button>
                                )}
                                {statusFilter !== 'All' && (
                                    <button onClick={() => setStatusFilter('All')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all">
                                        {statusFilter === 'Active' ? 'Unresolved' : 'Resolved'} <X size={10} className="opacity-60" />
                                    </button>
                                )}
                                {itemTypeFilter !== 'All' && (
                                    <button onClick={() => setItemTypeFilter('All')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all">
                                        {ITEM_CATEGORIES.find(c => c.value === itemTypeFilter)?.emoji} {itemTypeFilter} <X size={10} className="opacity-60" />
                                    </button>
                                )}
                                {locationFilter !== 'All' && (
                                    <button onClick={() => setLocationFilter('All')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all">
                                        <MapPin size={10} /> {locationFilter} <X size={10} className="opacity-60" />
                                    </button>
                                )}
                                {(dateFrom || dateTo) && (
                                    <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-orange-500/25 transition-all">
                                        <Calendar size={10} /> {dateFrom || '...'} — {dateTo || '...'} <X size={10} className="opacity-60" />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </div>

                    {/* ─── SELECT ALL / COUNT ─── */}
                    {filteredItems.length > 0 && (
                        <div className="shrink-0 flex items-center gap-3 pb-3">
                            <button onClick={toggleSelectAll}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedItems.size === filteredItems.length && filteredItems.length > 0 ? 'bg-orange-500 border-orange-400' : 'bg-white/5 border-white/20 hover:border-orange-500/60'}`}>
                                {selectedItems.size === filteredItems.length && filteredItems.length > 0 && <CheckCircle size={14} className="text-white" />}
                            </button>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select all'}
                            </span>
                        </div>
                    )}

                    <div className="flex-1 admin-scroll overflow-y-auto min-h-0 p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/5 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)]">
                    {/* ─── ITEMS GRID ─── */}
                    <div className="relative min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse"
                                >
                                    {[1,2,3,4,5,6,7,8].map(i => (
                                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] overflow-hidden flex flex-col">
                                            <div className="h-28 w-full bg-white/[0.04]" />
                                            <div className="p-4 space-y-3 flex-1">
                                                <div className="flex gap-1.5">
                                                    <div className="h-4 w-14 bg-yellow-500/10 rounded-md" />
                                                    <div className="h-4 w-12 bg-orange-500/10 rounded-md" />
                                                </div>
                                                <div className="h-4 w-3/4 bg-white/10 rounded" />
                                                <div className="h-2 w-1/2 bg-white/5 rounded" />
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 bg-orange-500/10 rounded-full" />
                                                    <div className="h-2 w-20 bg-white/5 rounded" />
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg border border-white/5 mt-auto">
                                                    <div className="w-7 h-7 rounded-full bg-orange-500/10 shrink-0" />
                                                    <div className="space-y-1.5 flex-1">
                                                        <div className="h-2.5 w-20 bg-white/10 rounded" />
                                                        <div className="h-2 w-14 bg-white/5 rounded" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                                    <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-lg" />
                                                    <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-lg" />
                                                    <div className="w-8 h-8 bg-white/[0.03] border border-white/5 rounded-lg" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : filteredItems.length > 0 ? (
                                <motion.div
                                    key="grid"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                >
                                    <AnimatePresence>
                                        {filteredItems.map(item => (
                                            <AdminItemCard
                                                key={item.id}
                                                item={item}
                                                selected={selectedItems.has(item.id)}
                                                onToggleSelect={toggleSelect}
                                                onApprove={(id) => handleModerate(id, 'approve')}
                                                onReject={(id) => handleModerate(id, 'reject')}
                                                onDelete={(id) => setDeleteTarget(id)}
                                                onPreview={setPreviewItem}
                                                processing={processing}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-white/20"
                                >
                                    <Package size={48} strokeWidth={1} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                                        {searchQuery ? 'No items match your search' : `No ${activeTab === 'all' ? '' : activeTab} items`}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    </div>
                </div>
                </main>
            </div>

            {/* ─── TOAST ─── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[120] px-6 py-4 rounded-2xl font-bold text-sm shadow-2xl border ${toast.type === 'error'
                            ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : 'bg-green-500/20 border-green-500/40 text-green-300'
                            }`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── PREVIEW MODAL ─── */}
            <AnimatePresence>
                {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
            </AnimatePresence>

            {/* ─── DELETE CONFIRM ─── */}
            <AnimatePresence>
                {deleteTarget && (
                    <DeleteConfirmModal
                        onConfirm={() => handleDelete(deleteTarget)}
                        onCancel={() => setDeleteTarget(null)}
                        processing={processing}
                    />
                )}
            </AnimatePresence>

            {/* ─── BATCH DELETE CONFIRM ─── */}
            <AnimatePresence>
                {batchDeleteConfirm && (
                    <DeleteConfirmModal
                        onConfirm={handleBatchDelete}
                        onCancel={() => setBatchDeleteConfirm(false)}
                        processing={processing}
                        message={`Delete ${selectedItems.size} item(s)? This cannot be undone.`}
                    />
                )}
            </AnimatePresence>

            {/* ─── BATCH ACTION BAR ─── */}
            <AnimatePresence>
                {selectedItems.size > 0 && adminSection === 'posts' && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 bg-[#1a1a1a]/95 border border-white/10 rounded-2xl backdrop-blur-2xl shadow-2xl">
                        <span className="text-xs font-black text-white/60 uppercase tracking-widest mr-2">{selectedItems.size} selected</span>
                        {/* Approve: show on pending, rejected, all */}
                        {(activeTab === 'pending' || activeTab === 'rejected' || activeTab === 'all') && (
                            <button onClick={() => handleBatchModerate('approve')} disabled={processing}
                                className="px-4 py-2.5 bg-green-600/30 hover:bg-green-600/40 text-green-400 border border-green-500/30 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
                                <CheckCircle size={12} /> Approve
                            </button>
                        )}
                        {/* Reject: show on pending, approved, all */}
                        {(activeTab === 'pending' || activeTab === 'approved' || activeTab === 'all') && (
                            <button onClick={() => handleBatchModerate('reject')} disabled={processing}
                                className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
                                <XCircle size={12} /> Reject
                            </button>
                        )}
                        <button onClick={() => setBatchDeleteConfirm(true)} disabled={processing}
                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50">
                            <Trash2 size={12} /> Delete
                        </button>
                        <button onClick={() => setSelectedItems(new Set())}
                            className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/40 rounded-xl text-[10px] font-black tracking-widest transition-all">
                            Cancel
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
