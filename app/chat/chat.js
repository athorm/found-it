"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Send, Loader2, MessageCircle, User, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavBar from "@/components/NavBar";
import ItemPostModal from "@/components/ItemPostModal";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [view, setView] = useState('list');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    getUser();
  }, []);

  // Combined Fetch and Subscription Logic
  useEffect(() => {
    let channel;

    if (user) {
      fetchConversations();

      // Initialize real-time subscription for both chats and messages
      channel = supabase
        .channel("conversations-subscription")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages"
          },
          () => {
            fetchConversations();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chats"
          },
          () => {
            fetchConversations();
          }
        )
        .subscribe();
    }

    // Cleanup: This prevents the "cannot add callbacks after subscribe" error[cite: 4]
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const chatIdFromUrl = searchParams.get('id');

    if (!chatIdFromUrl || !user) return;

    const targetConv = conversations.find(c => String(c.id) === chatIdFromUrl);
    if (targetConv) {
      selectConversation(targetConv);
      return;
    }

    fetchChatById(chatIdFromUrl).then((chat) => {
      if (chat) {
        setConversations((prev) => {
          const already = prev.some((c) => String(c.id) === String(chat.id));
          return already ? prev : [...prev, chat];
        });
        selectConversation(chat);
      }
    });
  }, [conversations, user]);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const fetchConversations = async () => {
    if (!user) return;

    const { data: chatsData, error } = await supabase
      .from("chats")
      .select('id, item_id, finder_id, claimer_id, status, created_at')
      .or(`finder_id.eq.${user.id},claimer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchConversations error:", error?.message || error);
      setConversations([]);
      return;
    }

    if (!chatsData || chatsData.length === 0) {
      setConversations([]);
      return;
    }

    const itemIds = [...new Set(chatsData.map((chat) => chat.item_id).filter(Boolean))];
    const profileIds = [...new Set(chatsData.flatMap((chat) => [chat.finder_id, chat.claimer_id]).filter(Boolean))];

    const [{ data: itemsData }, { data: profilesData, error: profileError }] = await Promise.all([
      supabase.from('items').select('id, title, image_url').in('id', itemIds),
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', profileIds)
    ]);

    if (profileError) {
      console.error('fetchConversations profiles error:', profileError?.message || profileError);
    }

    const itemMap = (itemsData || []).reduce((map, item) => {
      map[item.id] = item;
      return map;
    }, {});

    const profileMap = (profilesData || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {});

    const mappedConversations = chatsData.map((chat) => {
      const isCurrentUserFinder = chat.finder_id === user.id;
      const otherUser = isCurrentUserFinder ? profileMap[chat.claimer_id] : profileMap[chat.finder_id];
      const item = itemMap[chat.item_id];

      return {
        id: chat.id,
        itemId: chat.item_id,
        itemTitle: item?.title || "Item",
        itemImageUrl: item?.image_url || null,
        otherUserId: otherUser?.id,
        otherUser: otherUser || { full_name: "Unknown User", avatar_url: null },
        lastMessage: "New conversation",
        lastMessageTime: new Date(chat.created_at || Date.now()),
        allMessages: []
      };
    });

    setConversations(mappedConversations);
  };

  const fetchChatById = async (chatId) => {
    if (!user) return null;

    const { data: chatData, error } = await supabase
      .from("chats")
      .select('id, item_id, finder_id, claimer_id, status, created_at')
      .eq("id", chatId)
      .single();

    if (error) {
      console.error("fetchChatById error:", error?.message || error);
      return null;
    }

    if (!chatData) return null;

    const [itemResult, profilesResult] = await Promise.all([
      supabase.from('items').select('id, title, image_url').eq('id', chatData.item_id).single(),
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', [chatData.finder_id, chatData.claimer_id])
    ]);

    if (itemResult.error) {
      console.error('fetchChatById item error:', itemResult.error?.message || itemResult.error);
    }
    if (profilesResult.error) {
      console.error('fetchChatById profiles error:', profilesResult.error?.message || profilesResult.error);
    }

    const item = itemResult.data;
    const profileMap = (profilesResult.data || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {});

    const isCurrentUserFinder = chatData.finder_id === user.id;
    const otherUser = isCurrentUserFinder ? profileMap[chatData.claimer_id] : profileMap[chatData.finder_id];

    return {
      id: chatData.id,
      itemId: chatData.item_id,
      itemTitle: item?.title || "Item",
      itemImageUrl: item?.image_url || null,
      otherUserId: otherUser?.id,
      otherUser: otherUser || { full_name: "Unknown User", avatar_url: null },
      lastMessage: "New conversation",
      lastMessageTime: new Date(chatData.created_at || Date.now()),
      allMessages: []
    };
  };

  const fetchMessagesForChat = async (chatId) => {
    const { data: messageData, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchMessagesForChat error:', error?.message || error);
      return [];
    }

    return messageData || [];
  };

  const selectConversation = async (conv) => {
    const messagesForConv = conv.allMessages.length > 0
      ? conv.allMessages
      : await fetchMessagesForChat(conv.id);

    const sortedMessages = [...messagesForConv].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    setSelectedConversation(conv);
    setMessages(sortedMessages);
    setView('chat');

    // Mark as read logic
    if (user) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', conv.id)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    }
  };

  const backToList = () => {
    setView('list');
    setSelectedConversation(null);
    setMessages([]);
    setNewMessage("");
  };

  const handleFileSelected = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setShowPostModal(false);
    router.push(`/post?preview=${encodeURIComponent(previewUrl)}`);
  };

  const sendMessage = async () => {
    // Guard clauses to prevent empty messages or errors
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: selectedConversation.otherUserId,
          item_id: selectedConversation.itemId,
          chat_id: selectedConversation.id, // This links the message to the "Folder"
          content: newMessage.trim(),
          is_read: false // Explicitly set for your future notification system
        });

      if (error) throw error;

      setNewMessage("");
      // Note: You don't need to call fetchConversations() here because 
      // your real-time subscription handles the refresh!
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Temporary sample messages for preview when no real messages exist.
  // Remove this block once real chat messages are being stored and displayed.
  const displayMessages = (() => {
    if (messages.length > 0 || !selectedConversation || !user) return messages;

    const now = new Date();
    const otherUserId = selectedConversation.otherUserId;

    return [
      {
        id: 'dummy-other',
        sender_id: otherUserId,
        receiver_id: user.id,
        content: 'Hello! This is a preview of the chat bubble style from the other person.',
        created_at: new Date(now.getTime() - 60000).toISOString(),
      },
      {
        id: 'dummy-you',
        sender_id: user.id,
        receiver_id: otherUserId,
        content: 'Great! This is how your sent messages will appear.',
        created_at: now.toISOString(),
      },
    ];
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center p-8">
        <div className="text-center">
          <MessageCircle size={64} className="mx-auto mb-4 text-orange-400/50" />
          <p className="text-white text-lg">Please log in to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#7c2d1233] text-white pb-24 font-sans">
      {view === 'list' ? (
        <>
          <div className="flex items-center mb-6 p-6">
            <h1 className="text-2xl font-bold bg-linear-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Messages</h1>
          </div>

          <div className="px-6 space-y-4">
            <AnimatePresence>
              {conversations.map((conv) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onClick={() => selectConversation(conv)}
                  className="w-full bg-black/30 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-orange-500/10 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-linear-to-br from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center border border-orange-500/30 shrink-0">
                    {conv.otherUser?.avatar_url ? (
                      <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User size={20} className="text-orange-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-left">{conv.otherUser?.full_name || "User"}</p>
                    <p className="text-sm text-orange-300/80 truncate">{conv.lastMessage}</p>
                  </div>
                  <div className="text-xs text-orange-400/60 shrink-0">
                    {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {conversations.length === 0 && (
              <div className="text-center py-12 text-orange-400/60">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-40" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm opacity-75 mt-1">Messages appear here when someone contacts you about found items</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between p-6 border-b border-orange-500/20 bg-black/40 backdrop-blur-sm">
            <button onClick={backToList} className="p-2 hover:bg-orange-500/20 rounded-full transition">
              <ArrowLeft size={20} className="text-orange-400" />
            </button>
            <div className="flex-1 text-center mx-4">
              <h2 className="font-bold text-lg">{selectedConversation?.otherUser?.full_name || "Chat"}</h2>
              <p className="text-sm text-orange-300/60">{selectedConversation?.itemTitle}</p>
            </div>
            <button className="p-2 hover:bg-orange-500/20 rounded-full transition">
              <User size={20} className="text-orange-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[calc(100vh-300px)]">
            <AnimatePresence>
              {displayMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender_id !== user.id ? (
                    <div className="max-w-[75%] flex gap-3">
                      <div className="w-8 h-8 bg-linear-to-br from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center border border-orange-500/30 shrink-0">
                        {selectedConversation?.otherUser?.avatar_url ? (
                          <img src={selectedConversation.otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User size={16} className="text-orange-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-orange-400">{selectedConversation?.otherUser?.full_name || "User"}</span>
                          <span className="text-xs text-orange-300/60 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-white">
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[75%] flex gap-3 flex-row-reverse">
                      <div className="w-8 h-8 bg-linear-to-br from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center border border-orange-500/30 shrink-0">
                        <User size={16} className="text-orange-400" />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1 flex-row-reverse">
                          <span className="text-sm font-bold text-orange-400">You</span>
                          <span className="text-xs text-orange-300/60 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-3 text-white">
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {displayMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-orange-400/60">
                <MessageCircle size={64} className="mb-4 opacity-30" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm opacity-75 mt-1">Be the first to say hi!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 border-t border-orange-500/20 bg-black/40 backdrop-blur-sm">
            <div className="flex items-end gap-3">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-3xl text-white placeholder:text-orange-400/60 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-4 bg-linear-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-400 disabled:to-orange-500 disabled:cursor-not-allowed rounded-3xl shadow-xl shadow-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/60 transition-all flex items-center justify-center min-w-13 h-13 border border-orange-500/50 disabled:opacity-50"
              >
                <Send size={20} className="text-white" />
              </motion.button>
            </div>
          </div>
        </>
      )}

      <ItemPostModal
        open={showPostModal}
        onClose={() => setShowPostModal(false)}
        onFileSelect={handleFileSelected}
      />
      <NavBar activePage="chat" onPlusClick={() => setShowPostModal(true)} />
    </div>
  );
}