"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Send, Loader2, User, Trash2, X, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemPostModal from "@/components/ItemPostModal";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function ChatPage() {
  const router = useRouter();
  const { user: authUser, authLoading } = useAuthGuard();
  const [user, setUser] = useState(null);
  const [view, setView] = useState('list');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const channelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChannelRef = useRef(null);
  const [resolving, setResolving] = useState(false);
  const [visibleTimes, setVisibleTimes] = useState({});

  const toggleTime = (msgId) => {
    setVisibleTimes(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  useEffect(() => { getUser(); }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      const listChannel = supabase
        .channel("global-updates")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchConversations())
        .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => fetchConversations())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "items" }, () => fetchConversations())
        .subscribe();
      return () => {
        supabase.removeChannel(listChannel);
        if (activeChannelRef.current) supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      };
    }
  }, [user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('id');
    if (chatId && conversations.length > 0) {
      const targetConv = conversations.find(c => c.id === chatId);
      if (targetConv) selectConversation(targetConv);
    }
  }, [conversations]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const fetchConversations = async () => {
    if (!user) return;
    const { data: chatsData, error } = await supabase
      .from("chats")
      .select(`id, item_id, finder_id, claimer_id, created_at, finder_confirmed_resolved, claimer_confirmed_resolved, messages(content, created_at, sender_id)`)
      .or(`finder_id.eq.${user.id},claimer_id.eq.${user.id}`);
    if (error) { console.error("fetchConversations error:", error); return; }

    const itemIds = [...new Set(chatsData.map(c => c.item_id).filter(Boolean))];
    const profileIds = [...new Set(chatsData.flatMap(c => [c.finder_id, c.claimer_id]).filter(Boolean))];

    const [{ data: itemsData }, { data: profilesData }] = await Promise.all([
      supabase.from('items').select('id, title, status').in('id', itemIds),
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', profileIds)
    ]);

    const itemMap = itemsData?.reduce((acc, i) => ({ ...acc, [i.id]: i }), {}) || {};
    const profileMap = profilesData?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}) || {};

    const mapped = chatsData.map(chat => {
      const isFinder = chat.finder_id === user.id;
      const otherUser = isFinder ? profileMap[chat.claimer_id] : profileMap[chat.finder_id];
      const sortedMsgs = (chat.messages || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestMsg = sortedMsgs[0];
      return {
        id: chat.id,
        itemId: chat.item_id,
        itemTitle: itemMap[chat.item_id]?.title || "Item",
        otherUserId: otherUser?.id,
        otherUser: otherUser || { full_name: "Unknown", avatar_url: null },
        lastMessage: latestMsg
          ? (latestMsg.sender_id === user.id ? `You: ${latestMsg.content}` : latestMsg.content)
          : "New conversation",
        lastMessageTime: new Date(latestMsg?.created_at || chat.created_at),
        // Track if current user is the item finder (poster) so we can show delete button
        isFinder,
        finderConfirmed: chat.finder_confirmed_resolved,
        claimerConfirmed: chat.claimer_confirmed_resolved,
        isResolved: (chat.finder_confirmed_resolved && chat.claimer_confirmed_resolved) || itemMap[chat.item_id]?.status === 'Resolved'
      };
    }).sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    setConversations(mapped);
    setSelectedConversation(prev => {
      if (!prev) return prev;
      const updated = mapped.find(c => c.id === prev.id);
      return updated ? updated : prev;
    });
  };

  const selectConversation = async (conv) => {
    setSelectedConversation(conv);
    setView('chat');
    const { data: history, error } = await supabase
      .from('messages').select('*').eq('chat_id', conv.id).order('created_at', { ascending: true });
    if (!error) setMessages(history);

    // Mark all unread messages in this chat as read (where current user is receiver).
    // This decrements the NavBar unread badge via its realtime UPDATE subscription.
    if (user) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', conv.id)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    }

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase.channel(`room-${conv.id}`);
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${conv.id}` },
      (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        // If this incoming message is for the current user, mark it read immediately
        if (payload.new.receiver_id === user?.id) {
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', payload.new.id)
            .then(() => { }); // fire-and-forget
        }
      }
    ).subscribe();
    channelRef.current = channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    const content = newMessage.trim();
    setNewMessage("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedConversation.otherUserId,
      chat_id: selectedConversation.id,
      item_id: selectedConversation.itemId,
      content,
      is_read: false
    }).select().single();
    if (error) console.error("Supabase Insert Error:", error.message, error.details);
  };

  const handleDeleteChat = async () => {
    if (!selectedConversation) return;
    try {
      setDeletingChat(true);
      // Delete messages first (no cascade FK), then the chat
      await supabase.from('messages').delete().eq('chat_id', selectedConversation.id);
      const { error } = await supabase.from('chats').delete().eq('id', selectedConversation.id);
      if (error) throw error;
      setShowDeleteConfirm(false);
      backToList();
    } catch (err) {
      console.error("Delete chat error:", err);
      alert("Could not delete chat: " + err.message);
    } finally {
      setDeletingChat(false);
    }
  };

  const handleResolve = async (confirm = true) => {
    if (!selectedConversation || !user) return;
    try {
      setResolving(true);
      const isFinder = selectedConversation.isFinder;
      const updateData = isFinder
        ? { finder_confirmed_resolved: confirm }
        : { claimer_confirmed_resolved: confirm };

      const { data: updatedChat, error } = await supabase
        .from('chats')
        .update(updateData)
        .eq('id', selectedConversation.id)
        .select()
        .single();

      if (error) throw error;
      if (!updatedChat) throw new Error("Could not update chat. RLS might be blocking this action.");

      // If this confirmation makes it fully resolved, update the item status
      const otherConfirmed = isFinder
        ? selectedConversation.claimerConfirmed
        : selectedConversation.finderConfirmed;

      if (confirm && otherConfirmed) {
        const { error: rpcError } = await supabase.rpc('mark_item_resolved', {
          target_item_id: selectedConversation.itemId
        });
        if (rpcError) {
          console.error("Error marking item resolved details:", rpcError);
          throw new Error("RPC Error: " + (rpcError.message || JSON.stringify(rpcError)));
        }

        // Send a system message
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: selectedConversation.otherUserId,
          chat_id: selectedConversation.id,
          item_id: selectedConversation.itemId,
          content: "✅ Both users have confirmed. This item is now marked as Resolved.",
          is_read: false
        });
      }

      await fetchConversations();
    } catch (err) {
      console.error("Resolution error:", err);
      alert("Failed to update resolution status: " + err.message);
    } finally {
      setResolving(false);
    }
  };

  // Fix: forward file selection to /post page (was missing onFileSelect before)
  const handleFileSelected = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setShowPostModal(false);
    router.push(`/post?preview=${encodeURIComponent(previewUrl)}`);
  };

  const backToList = () => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setView('list');
    setSelectedConversation(null);
    setMessages([]);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233] text-white flex flex-col font-sans overflow-hidden">

      {view === 'list' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto pb-24">
          <div className="p-6 flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-xl mix-blend-screen drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Messages</h1>
          </div>
          <div className="px-6 space-y-4">
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">No conversations yet</p>
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className="w-full bg-black/30 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-orange-500/10 transition-all text-left"
              >
                <div className="w-12 h-12 bg-orange-500/20 rounded-full border border-orange-500/30 overflow-hidden shrink-0">
                  {conv.otherUser?.avatar_url
                    ? <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-orange-400" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{conv.otherUser?.full_name}</p>
                  <p className="text-sm text-orange-300/60 truncate">{conv.lastMessage}</p>
                </div>
                <div className="text-[10px] text-orange-400/40 shrink-0 uppercase">
                  {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center p-4 border-b border-orange-500/10 bg-black/40 backdrop-blur-md">
            <button onClick={backToList} className="p-2 mr-2"><ArrowLeft size={22} className="text-orange-400" /></button>
            <div className="flex-1">
              <h2 className="font-bold text-base leading-tight">{selectedConversation?.otherUser?.full_name}</h2>
              <p className="text-[10px] text-orange-400/60 uppercase tracking-wider">{selectedConversation?.itemTitle}</p>
            </div>
            {/* Delete chat button — only visible to the finder (item poster) */}
            {selectedConversation?.isFinder && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 mr-2 text-red-400/60 hover:text-red-400 transition-colors"
                title="Delete this conversation"
              >
                <Trash2 size={20} />
              </button>
            )}
            <div className="w-9 h-9 rounded-full border border-orange-500/30 overflow-hidden bg-orange-500/10">
              {selectedConversation?.otherUser?.avatar_url
                ? <img src={selectedConversation.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-orange-400" /></div>}
            </div>
          </div>

          {/* RESOLUTION BAR */}
          <div className="px-4 py-2 bg-black/20 border-b border-orange-500/5">
            {selectedConversation?.isResolved ? (
              <div className="flex items-center justify-center gap-2 py-2 text-green-400">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Transaction Resolved</span>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-orange-500/40" />
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-tight">
                    {selectedConversation?.isFinder
                      ? (selectedConversation?.finderConfirmed ? "Waiting for claimer..." : "Is this item resolved?")
                      : (selectedConversation?.claimerConfirmed ? "Waiting for finder..." : "Is this item resolved?")
                    }
                  </span>
                </div>

                {((selectedConversation?.isFinder && !selectedConversation?.finderConfirmed) ||
                  (!selectedConversation?.isFinder && !selectedConversation?.claimerConfirmed)) ? (
                  <button
                    onClick={() => handleResolve(true)}
                    disabled={resolving}
                    className="px-4 py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-full text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {resolving ? "Updating..." : "Mark as Resolved"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleResolve(false)}
                    disabled={resolving}
                    className="text-[9px] text-orange-500/40 hover:text-orange-500 font-bold uppercase tracking-widest transition-all underline underline-offset-4"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-transparent">
            {messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-orange-500/10 overflow-hidden shrink-0 border border-white/5">
                      {selectedConversation?.otherUser?.avatar_url
                        ? <img src={selectedConversation.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center"><User size={12} className="text-orange-400" /></div>}
                    </div>
                  )}
                  <div className="flex flex-col max-w-[75%]">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={() => toggleTime(msg.id)}
                      className={`px-4 py-2 rounded-2xl text-[15px] ${isMe ? 'bg-orange-600 rounded-br-none' : 'bg-white/10 rounded-bl-none shadow-lg'}`}
                    >
                      {msg.content}
                    </motion.div>
                    {visibleTimes[msg.id] && (
                      <span className="text-[9px] text-white/30 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-lg">
            {selectedConversation?.isResolved ? (
              <div className="flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-full text-white/30">
                <Lock size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Messaging Disabled</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1 border border-white/10 focus-within:border-orange-500/40 transition-all">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message"
                  className="flex-1 bg-transparent py-3 focus:outline-none text-sm"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage} className="text-orange-500 p-2"><Send size={20} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-[#111] border border-red-500/20 rounded-[2.5rem] p-8 text-center"
            >
              <Trash2 size={40} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Delete Conversation?</h3>
              <p className="text-white/40 text-sm mb-8">This will permanently remove the chat and all messages for both users.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteChat}
                  disabled={deletingChat}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-bold disabled:opacity-50 transition-all"
                >
                  {deletingChat ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white/50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {view === 'list' && (
        <>
          {/* Fixed: onFileSelect now properly navigates to /post page */}
          <ItemPostModal
            open={showPostModal}
            onClose={() => setShowPostModal(false)}
            onFileSelect={handleFileSelected}
          />
          <NavBar activePage="chat" onPlusClick={() => setShowPostModal(true)} />
        </>
      )}
    </div>
  );
}