import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import api from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Search, UserPlus, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Virtuoso } from "react-virtuoso";

import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface ChatUser { id: string; fullName: string; role: string; email: string; lastSeen?: string; }
interface ConversationParticipant { id: string; userId: string; user: ChatUser; }
interface Message { id: string; body: string; attachmentUrl?: string; messageType?: string; fileUrl?: string; voiceUrl?: string; stickerUrl?: string; delivered?: boolean; seen?: boolean; isPinned?: boolean; isDeleted?: boolean; replyToId?: string; senderId: string; threadId: string; createdAt: string; senderName?: string; sender?: ChatUser; }
interface Conversation { id: string; title?: string; isGroup: boolean; createdAt: string; participants: ConversationParticipant[]; messages: Message[]; }

const normalizeMessage = (m: any): Message => {
  if (!m) return m;
  return {
    ...m,
    id: m.id,
    body: m.body,
    attachmentUrl: m.attachment_url || m.attachmentUrl,
    messageType: m.message_type || m.messageType || "TEXT",
    fileUrl: m.file_url || m.fileUrl,
    voiceUrl: m.voice_url || m.voiceUrl,
    stickerUrl: m.sticker_url || m.stickerUrl,
    delivered: m.delivered ?? false,
    seen: m.seen ?? false,
    isPinned: m.is_pinned || m.isPinned || false,
    isDeleted: m.is_deleted || m.isDeleted || false,
    replyToId: m.reply_to_id || m.replyToId,
    senderId: m.sender_id || m.senderId,
    threadId: m.thread_id || m.threadId,
    createdAt: m.created_at || m.createdAt,
  };
};

export default function ChatWindow() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<ChatUser[]>([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [eligibleSearch, setEligibleSearch] = useState("");
  
  // Real-time states
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, { online: boolean; lastSeen: string }>>({});
  
  // Interactions
  const [replyToMsg, setReplyToMsg] = useState<Message | null>(null);

  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const stompClientRef = useRef<Client | null>(null);
  
  const activeConversationRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);

  // Connect to STOMP WebSockets
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws-chat`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);
      
      client.subscribe('/user/queue/messages', (message) => {
        if (message.body) {
          const rawMsg = JSON.parse(message.body);
          const newMsg = normalizeMessage(rawMsg);
          newMsg.delivered = true;
          
          if (activeConversationRef.current?.id === newMsg.threadId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            client.publish({
              destination: "/app/chat.seen",
              body: JSON.stringify({ messageId: newMsg.id, threadId: newMsg.threadId, receiverEmail: newMsg.senderName })
            });
          }

          setConversations((prev) => prev.map((conv) => conv.id === newMsg.threadId ? { ...conv, messages: [newMsg] } : conv));
        }
      });

      client.subscribe('/user/queue/typing', (message) => {
        if (message.body) {
          const payload = JSON.parse(message.body);
          setTypingUsers(prev => ({ ...prev, [payload.threadId]: payload.isTyping }));
        }
      });

      client.subscribe('/user/queue/seen', (message) => {
        if (message.body) {
          const payload = JSON.parse(message.body);
          setMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, seen: true } : m));
        }
      });

      client.subscribe('/topic/presence', (message) => {
        if (message.body) {
          const payload = JSON.parse(message.body);
          setOnlineStatus(prev => ({ ...prev, [payload.userId]: { online: payload.online, lastSeen: payload.lastSeen } }));
        }
      });
    };

    client.onDisconnect = () => setIsConnected(false);
    client.activate();
    stompClientRef.current = client;

    return () => { if (client.active) client.deactivate(); };
  }, [user?.id]);

  const loadConversations = async () => {
    if (!user?.id) return;
    setLoadingConversations(true);
    try {
      const res = await api.get("/chat/conversations");
      const mapped = res.data.map((c: any) => ({
        ...c,
        isGroup: c.is_group ?? c.isGroup,
        messages: c.messages || [],
        participants: (c.participants || []).map((p: any) => ({
          ...p,
          userId: p.user_id || p.userId,
          user: p.user ? { ...p.user, fullName: p.user.full_name || p.user.fullName } : null
        }))
      }));
      setConversations(mapped);
    } catch (err: any) {
      toast.error(t("dynamic.chatwindow.suhbatlar_tarixini_yuklashda_xatolik"));
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => { loadConversations(); }, [user?.id]);

  const selectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setLoadingMessages(true);
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    setReplyToMsg(null);

    try {
      const res = await api.get(`/chat/conversations/${conversation.id}/messages?limit=30`);
      const mappedMessages = res.data.map(normalizeMessage);
      setMessages(mappedMessages.reverse()); // Reverse because they come DESC from backend and we want oldest at top in virtual list
      if (mappedMessages.length > 0) setCursor(mappedMessages[0].createdAt);
      if (mappedMessages.length < 30) setHasMore(false);

      const partnerUser = conversation.participants.find(p => p.userId !== user?.id)?.user;
      if (stompClientRef.current?.active && partnerUser) {
        mappedMessages.forEach((msg: Message) => {
          if (msg.senderId !== user?.id && !msg.seen) {
            stompClientRef.current!.publish({
              destination: "/app/chat.seen",
              body: JSON.stringify({ messageId: msg.id, threadId: msg.threadId, receiverEmail: partnerUser.email })
            });
          }
        });
      }
    } catch (err: any) {
      toast.error(t("dynamic.chatwindow.xabarlarni_yuklashda_xatolik"));
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || !cursor || !hasMore || loadingMessages) return;
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/conversations/${activeConversation.id}/messages?cursor=${encodeURIComponent(cursor)}&limit=30`);
      const mappedMessages = res.data.map(normalizeMessage).reverse();
      
      if (mappedMessages.length > 0) {
        setMessages(prev => [...mappedMessages, ...prev]);
        setCursor(mappedMessages[0].createdAt);
      }
      if (mappedMessages.length < 30) setHasMore(false);
    } catch (err) {
    } finally {
      setLoadingMessages(false);
    }
  }, [activeConversation, cursor, hasMore, loadingMessages]);

  const handleSendMessage = async (text: string, fileUrl?: string, messageType?: string) => {
    if (!activeConversation) return;
    try {
      const res = await api.post(`/chat/conversations/${activeConversation.id}/messages`, {
        body: text,
        attachmentUrl: messageType === "FILE" || messageType === "IMAGE" || messageType === "VOICE" ? fileUrl : null,
        voiceUrl: messageType === "VOICE" ? fileUrl : null,
        fileUrl: messageType === "IMAGE" ? fileUrl : null,
        messageType: messageType || "TEXT",
        replyToId: replyToMsg?.id
      });
      const rawMsg = res.data;
      const newMsg = normalizeMessage(rawMsg);
      setMessages(prev => [...prev, newMsg]);
      setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, messages: [newMsg] } : c));
      setReplyToMsg(null);
    } catch (err) {
      toast.error(t("dynamic.chatwindow.xabarni_yuborishda_xatolik"));
    }
  };

  const handleMessageDelete = async (msgId: string, forEveryone: boolean) => {
    try {
      await api.delete(`/chat/messages/${msgId}?forEveryone=${forEveryone}`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true } : m));
      toast.success(t("dynamic.chatwindow.xabar_o_chirildi"));
    } catch (err) {
      toast.error(t("dynamic.orggroups.o_chirishda_xatolik"));
    }
  };

  const handleMessagePin = async (msgId: string) => {
    try {
      await api.post(`/chat/messages/${msgId}/pin`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m));
    } catch (err) {
      toast.error(t("dynamic.chatwindow.qadab_qo_yishda_xatolik"));
    }
  };

  const handleTyping = (isTyping: boolean) => {
    const partnerUser = activeConversation?.participants.find(p => p.userId !== user?.id)?.user;
    if (stompClientRef.current?.active && activeConversation && partnerUser) {
      stompClientRef.current.publish({
        destination: "/app/chat.typing",
        body: JSON.stringify({ threadId: activeConversation.id, receiverEmail: partnerUser.email, isTyping, senderId: user?.id })
      });
    }
  };

  const openNewChatDialog = async () => {
    setIsNewChatOpen(true);
    setLoadingUsers(true);
    try {
      const res = await api.get("/chat/eligible-users");
      setEligibleUsers(res.data);
    } catch (err) {
      toast.error(t("dynamic.chatwindow.foydalanuvchilarni_yuklashda_xatolik"));
    } finally { setLoadingUsers(false); }
  };

  const startChatWithUser = async (targetUser: ChatUser) => {
    try {
      const res = await api.post("/chat/conversations", { targetUserId: targetUser.id });
      const rawConv = res.data;
      const conv: Conversation = {
        ...rawConv,
        participants: (rawConv.participants || []).map((p: any) => ({ ...p, userId: p.user_id || p.userId }))
      };
      setConversations((prev) => prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]);
      setIsNewChatOpen(false);
      selectConversation(conv);
    } catch (err) { toast.error(t("dynamic.chatwindow.suhbatni_boshlashda_xatolik")); }
  };

  const getInitials = (name: string) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  
  const getRoleBadge = (role: string) => {
    if (!role) return null;
    return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">{role}</Badge>;
  };

  const filteredConversations = useMemo(() => conversations.filter((c) => {
    const p = c.participants.find(p => p.userId !== user?.id)?.user;
    return (c.title || p?.fullName || "").toLowerCase().includes((searchTerm || "").toLowerCase());
  }), [conversations, searchTerm, user?.id]);

  const filteredEligibleUsers = useMemo(() => eligibleUsers.filter(u => (u.fullName || "").toLowerCase().includes((eligibleSearch || "").toLowerCase())), [eligibleUsers, eligibleSearch]);

  const chatPartner = useMemo(() => activeConversation?.participants.find(p => p.userId !== user?.id)?.user || null, [activeConversation, user?.id]);

  return (
    <div className="flex flex-col md:flex-row gap-5 h-[calc(100vh-160px)] min-h-[500px] w-full max-w-full overflow-hidden">
      {/* 1. Conversations Sidebar */}
      <Card className={`w-full md:w-[320px] flex flex-col rounded-2xl border border-border/40 bg-card/75 backdrop-blur-sm overflow-hidden shadow-xl ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Muloqot
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={loadConversations} className="h-8 w-8 rounded-full"><RefreshCw className="h-3.5 w-3.5" /></Button>
              <Button onClick={openNewChatDialog} size="sm" variant="outline" className="h-8 gap-1 text-xs"><UserPlus className="h-3.5 w-3.5" />{t("dynamic.chatwindow.yangi")}</Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Qidirish..." className="pl-9 text-xs h-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loadingConversations ? <Loader2 className="animate-spin mx-auto mt-4 text-primary" /> : filteredConversations.map(conv => {
            const active = activeConversation?.id === conv.id;
            const partner = conv.participants.find(p => p.userId !== user?.id)?.user;
            const title = conv.title || partner?.fullName || "Chat";
            return (
              <motion.button key={conv.id} onClick={() => selectConversation(conv)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border ${active ? "bg-primary/10 border-primary/30" : "hover:bg-muted/40 border-transparent"}`}>
                <Avatar className="h-10 w-10 border border-border shadow-sm">
                  <AvatarFallback className="bg-muted text-xs font-bold">{getInitials(title)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{title}</p>
                  <p className="text-xs text-muted-foreground truncate">{conv.messages?.[0]?.body || "Suhbatni boshlang"}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </Card>

      {/* 2. Main Chat Area */}
      {activeConversation ? (
        <Card className="flex-1 flex flex-col rounded-2xl border border-border/40 bg-card/75 backdrop-blur-sm overflow-hidden shadow-xl relative">
          {/* Mobile Back Button */}
          <div className="md:hidden absolute top-4 left-4 z-10">
             <Button size="sm" variant="outline" onClick={() => setActiveConversation(null)}>{t("dynamic.mocktake.orqaga")}</Button>
          </div>
          
          <ChatHeader 
            chatPartner={chatPartner} 
            activeConversation={activeConversation} 
            typingUsers={typingUsers} 
            onlineStatus={onlineStatus} 
            getInitials={getInitials} 
            getRoleBadge={getRoleBadge} 
          />

          <div className="flex-1 bg-background/20 relative overflow-hidden">
            {messages.length === 0 && !loadingMessages ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                 <MessageSquare className="h-10 w-10 opacity-30" />
                 <p className="text-xs font-semibold">{t("dynamic.messages.xabarlar_yo_q")}</p>
               </div>
            ) : (
              <Virtuoso
                style={{ height: '100%', overflowY: 'auto' }}
                data={messages}
                startReached={loadMoreMessages}
                initialTopMostItemIndex={messages.length - 1}
                followOutput="smooth"
                itemContent={(index, msg) => (
                  <div className="py-[4px] px-4 md:px-6 w-full">
                    <MessageBubble 
                      msg={msg} 
                      isMine={msg.senderId === user?.id} 
                      isGroup={activeConversation.isGroup} 
                      onReply={(m) => setReplyToMsg(m)}
                      onForward={() => toast.info(t("dynamic.chatwindow.yo_naltirish_tayyorlanmoqda"))}
                      onPin={handleMessagePin}
                      onDelete={handleMessageDelete}
                    />
                  </div>
                )}
              />
            )}
          </div>

          <ChatInput 
            onSendMessage={handleSendMessage} 
            onTyping={handleTyping} 
            replyTo={replyToMsg}
            onCancelReply={() => setReplyToMsg(null)}
          />
        </Card>
      ) : (
        <Card className="hidden md:flex flex-1 flex-col items-center justify-center text-center text-muted-foreground p-8 rounded-2xl border border-border/40 bg-card/50">
          <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-foreground">{t("dynamic.chatwindow.suhbatni_tanlang")}</h3>
          <p className="text-sm">Yoki yangi suhbat boshlash uchun "Yangi" tugmasini bosing</p>
        </Card>
      )}

      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0"><DialogTitle>{t("dynamic.chatwindow.yangi_suhbat")}</DialogTitle></DialogHeader>
          <div className="p-4 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Foydalanuvchi qidirish..." className="pl-9" value={eligibleSearch} onChange={(e) => setEligibleSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {loadingUsers ? <Loader2 className="animate-spin mx-auto m-4" /> : filteredEligibleUsers.map(u => (
              <Button key={u.id} variant="ghost" className="w-full justify-start gap-3 p-3 h-auto" onClick={() => startChatWithUser(u)}>
                <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(u.fullName)}</AvatarFallback></Avatar>
                <div className="text-left flex-1"><p className="text-sm font-medium">{u.fullName}</p><p className="text-xs text-muted-foreground">{u.role}</p></div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
