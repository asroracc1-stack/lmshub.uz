import React, { useEffect, useRef, useState, useMemo } from "react";
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
import { 
  Send, MessageSquare, Search, UserPlus, Loader2, Sparkles, 
  Paperclip, CheckCheck, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface ChatUser {
  id: string;
  fullName: string;
  role: string;
  email: string;
  organizationId?: string | null;
}

interface ConversationParticipant {
  id: string;
  userId: string;
  user: ChatUser;
}

interface Message {
  id: string;
  body: string;
  attachmentUrl?: string | null;
  senderId: string;
  conversationId: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
}

interface Conversation {
  id: string;
  title?: string | null;
  isGroup: boolean;
  organizationId?: string | null;
  createdAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
}

export default function ChatWindow() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState<ChatUser[]>([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [eligibleSearch, setEligibleSearch] = useState("");
  
  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const stompClientRef = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Active conversation ref to prevent closure traps in socket events
  const activeConversationRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Connect to STOMP WebSockets
  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    console.log("Connecting to STOMP WebSocket backend...");
    
    const client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws-chat`),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log("STOMP connected successfully");
      setIsConnected(true);
      
      // Subscribe to user's private message queue
      client.subscribe('/user/queue/messages', (message) => {
        if (message.body) {
          const newMsg = JSON.parse(message.body) as Message;
          
          // If message is in the active thread, append it
          if (activeConversationRef.current?.id === newMsg.conversationId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          // Update the conversations preview list
          setConversations((prev) => {
            return prev.map((conv) => {
              if (conv.id === newMsg.conversationId) {
                return { ...conv, messages: [newMsg] };
              }
              return conv;
            });
          });
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
      toast.error("WebSocket xatosi: " + frame.headers['message']);
    };
    
    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [user?.id]);

  // Fetch Conversations history
  const loadConversations = async () => {
    if (!user?.id) return;
    setLoadingConversations(true);
    try {
      const res = await api.get("/chat/conversations");
      const mappedConversations = res.data.map((c: any) => ({
        ...c,
        isGroup: c.is_group ?? c.isGroup,
        participants: (c.participants || []).map((p: any) => ({
          ...p,
          userId: p.user_id || p.userId,
          user: p.user ? {
            ...p.user,
            fullName: p.user.full_name || p.user.fullName,
            organizationId: p.user.organization_id || p.user.organizationId
          } : null
        }))
      }));
      setConversations(mappedConversations);
    } catch (err: any) {
      console.error("Error fetching conversations:", err);
      toast.error("Suhbatlar tarixini yuklashda xatolik");
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history when selecting a conversation thread
  const selectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setLoadingMessages(true);
    setMessages([]);

    try {
      const res = await api.get(`/chat/conversations/${conversation.id}/messages`);
      setMessages(res.data);
    } catch (err: any) {
      console.error("Error loading messages:", err);
      toast.error("Xabarlarni yuklashda xatolik");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load users that the current user is allowed to message (under RBAC rules)
  const openNewChatDialog = async () => {
    setIsNewChatOpen(true);
    setLoadingUsers(true);
    try {
      const res = await api.get("/chat/eligible-users");
      const mappedUsers = res.data.map((u: any) => ({
        ...u,
        fullName: u.full_name || u.fullName,
        organizationId: u.organization_id || u.organizationId
      }));
      setEligibleUsers(mappedUsers);
    } catch (err: any) {
      console.error("Error fetching messageable users:", err);
      toast.error("Muloqot qilish mumkin bo'lgan foydalanuvchilarni yuklashda xatolik");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Start chat with an eligible user
  const startChatWithUser = async (targetUser: ChatUser) => {
    try {
      const res = await api.post("/chat/conversations", {
        targetUserId: targetUser.id
      });
      const rawConv = res.data;
      const conv: Conversation = {
        ...rawConv,
        isGroup: rawConv.is_group ?? rawConv.isGroup,
        participants: (rawConv.participants || []).map((p: any) => ({
          ...p,
          userId: p.user_id || p.userId,
          user: p.user ? {
            ...p.user,
            fullName: p.user.full_name || p.user.fullName,
            organizationId: p.user.organization_id || p.user.organizationId
          } : null
        }))
      };
      
      // Add conversation to list if not present
      setConversations((prev) => {
        if (prev.some((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });

      setIsNewChatOpen(false);
      selectConversation(conv);
      toast.success(`${targetUser.fullName} bilan suhbat boshlandi`);
    } catch (err: any) {
      console.error("Error starting conversation:", err);
      toast.error(err.response?.data?.error || "Suhbatni boshlashda xatolik");
    }
  };

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !attachmentUrl) return;
    if (!activeConversation) return;

    try {
      const res = await api.post(`/chat/conversations/${activeConversation.id}/messages`, {
        body: messageInput.trim(),
        attachmentUrl: attachmentUrl || null
      });
      
      const newMsg = res.data;
      setMessages((prev) => [...prev, newMsg]);
      
      // Update conversations list with the new message
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === activeConversation.id) {
            return { ...conv, messages: [newMsg] };
          }
          return conv;
        });
      });

      setMessageInput("");
      setAttachmentUrl("");
      setShowAttachmentInput(false);
    } catch (err: any) {
      console.error("Error sending message:", err);
      toast.error("Xabarni yuborishda xatolik");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    if (!role) return null;
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-[10px] font-medium rounded-full px-2">Super Admin</Badge>;
      case "PACK_MANAGER":
      case "PAYMENT_MANAGER":
        return <Badge className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 text-[10px] font-medium rounded-full px-2">Pack Manager</Badge>;
      case "TEACHER":
        return <Badge className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-[10px] font-medium rounded-full px-2">O'qituvchi</Badge>;
      case "STUDENT":
        return <Badge className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-[10px] font-medium rounded-full px-2">O'quvchi</Badge>;
      case "PARENT":
        return <Badge className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 text-[10px] font-medium rounded-full px-2">Ota-ona</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px] font-medium rounded-full px-2">{role}</Badge>;
    }
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const otherParticipant = c.participants.find(p => p.userId !== user?.id)?.user;
      const name = c.title || otherParticipant?.fullName || "Chat Thread";
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [conversations, searchTerm, user?.id]);

  // Filter eligible users based on search
  const filteredEligibleUsers = useMemo(() => {
    return eligibleUsers.filter((u) => {
      const nameMatch = (u.fullName || "").toLowerCase().includes(eligibleSearch.toLowerCase());
      const emailMatch = (u.email || "").toLowerCase().includes(eligibleSearch.toLowerCase());
      const roleMatch = (u.role || "").toLowerCase().includes(eligibleSearch.toLowerCase());
      return nameMatch || emailMatch || roleMatch;
    });
  }, [eligibleUsers, eligibleSearch]);

  // Identify name and role of other participant in active chat
  const chatPartner = useMemo(() => {
    if (!activeConversation) return null;
    return activeConversation.participants.find(p => p.userId !== user?.id)?.user || null;
  }, [activeConversation, user?.id]);

  return (
    <div className="flex gap-5 h-[calc(100vh-160px)] min-h-[500px]">
      
      {/* 1. Conversations Sidebar */}
      <Card className="w-full md:w-[320px] flex flex-col rounded-2xl border border-border/40 bg-card/75 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Chat muloqot
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={loadConversations}
                className="h-8 w-8 rounded-full hover:bg-muted"
                title="Yangilash"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={openNewChatDialog}
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs border-primary/30 hover:border-primary text-primary"
              >
                <UserPlus className="h-3.5 w-3.5" /> Yangi
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Muloqot qidirish..."
              className="pl-9 bg-background/50 border-border/60 text-xs h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loadingConversations ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-3/4 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p>Muloqotlar topilmadi</p>
              <p className="text-[10px]">Tepadagi "Yangi" tugmasi orqali suhbat boshlang.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const active = activeConversation?.id === conv.id;
              const partner = conv.participants.find(p => p.userId !== user?.id)?.user;
              const title = conv.title || partner?.fullName || "Noma'lum foydalanuvchi";
              const partnerRole = partner?.role || "";
              const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[0] : null;

              return (
                <motion.button
                  key={conv.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left border ${
                    active 
                      ? "bg-primary/10 border-primary/30 shadow-md text-foreground" 
                      : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border/30"
                  }`}
                >
                  <Avatar className="h-10 w-10 border border-border shadow-sm">
                    <AvatarFallback className={active ? "bg-primary text-white font-bold text-xs" : "bg-muted text-foreground font-bold text-xs"}>
                      {getInitials(title)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold truncate ${active ? "text-primary font-bold" : "text-foreground"}`}>
                        {title}
                      </p>
                      <span className="text-[9px] text-muted-foreground">Real-time</span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {lastMsg ? lastMsg.body : "Suhbatni boshlang..."}
                      </p>
                      {partnerRole && getRoleBadge(partnerRole)}
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Socket Status footer */}
        <div className="p-3 bg-muted/30 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Roli: {user?.role ? user.role.toUpperCase() : "STUDENT"}</span>
          <div className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-rose-500"} animate-pulse`} />
            <span>{isConnected ? "Server faol (STOMP)" : "Ulanish xatosi"}</span>
          </div>
        </div>
      </Card>

      {/* 2. Main Chat Area */}
      <Card className="flex-1 flex flex-col rounded-2xl border border-border/40 bg-card/75 backdrop-blur-sm overflow-hidden shadow-xl">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border shadow-sm">
                  <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                    {chatPartner ? getInitials(chatPartner.fullName) : "G"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">
                      {chatPartner ? chatPartner.fullName : "Guruh suhbati"}
                    </h3>
                    {chatPartner && getRoleBadge(chatPartner.role)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground">
                      onlayn
                    </span>
                  </div>
                </div>
              </div>
              
              <Badge variant="outline" className="gap-1 border-primary/20 text-primary bg-primary/5 text-[10px]">
                <Sparkles className="h-3 w-3" /> STOMP Websocket
              </Badge>
            </div>

            {/* Message History list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/20">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground mt-2">Xabarlar yuklanmoqda...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-xs font-semibold">Hech qanday xabar yo'q</p>
                  <p className="text-[10px]">Birinchi xabarni yuboring!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const senderName = msg.sender?.fullName || "Foydalanuvchi";
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm space-y-1 ${
                        isMine 
                          ? "bg-primary text-primary-foreground rounded-br-sm" 
                          : "bg-muted text-foreground rounded-bl-sm border border-border/30"
                      }`}>
                        
                        {!isMine && !activeConversation.isGroup && (
                          <span className="text-[10px] font-bold text-primary block">
                            {senderName}
                          </span>
                        )}

                        {/* Attachment Url support */}
                        {msg.attachmentUrl && (
                          <div className="mb-2 p-2 rounded-lg border border-white/20 bg-black/10 flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            <a 
                              href={msg.attachmentUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs underline font-medium truncate max-w-[180px]"
                            >
                              Fayl biriktirmasi
                            </a>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                          {msg.body}
                        </p>

                        <div className={`flex items-center justify-end gap-1 text-[8px] opacity-70`}>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMine && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview bar */}
            {attachmentUrl && (
              <div className="px-4 py-2 bg-muted/40 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-primary truncate max-w-[80%]">
                  <Paperclip className="h-3.5 w-3.5" /> Fayl: <span className="underline">{attachmentUrl}</span>
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setAttachmentUrl("")}
                  className="h-6 text-destructive hover:bg-destructive/10 text-[10px]"
                >
                  O'chirish
                </Button>
              </div>
            )}

            {/* Attachment input bar */}
            {showAttachmentInput && !attachmentUrl && (
              <div className="px-4 py-2 bg-muted/40 border-t border-border/40 flex items-center gap-2">
                <Input
                  placeholder="Fayl yoki rasm URL manzilini kiriting..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="text-xs h-8 bg-background/50 border-border/60"
                />
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAttachmentInput(false)}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Yopish
                </Button>
              </div>
            )}

            {/* Message Send Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border/40 bg-muted/10 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </Button>
              
              <Input
                placeholder="Xabar yozing..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 bg-background/50 border-border/60 h-9 rounded-xl text-xs pl-3 pr-3"
              />

              <Button
                type="submit"
                size="icon"
                disabled={!messageInput.trim() && !attachmentUrl}
                className="h-9 w-9 rounded-xl bg-primary text-white hover:bg-primary/95 transition-all shadow-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8 space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-foreground">Suhbat tanlanmagan</h3>
              <p className="text-xs">
                Muloqot qilishni boshlash uchun chap tarafdagi ro'yxatdan suhbatni tanlang yoki "Yangi" tugmasini bosing.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* 3. New Chat Dialog (RBAC Safe list of users) */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-[360px] rounded-2xl p-4 border border-border bg-card/95 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Yangi suhbat boshlash
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Foydalanuvchi qidirish..."
                className="pl-8 bg-background/50 text-xs h-8"
                value={eligibleSearch}
                onChange={(e) => setEligibleSearch(e.target.value)}
              />
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
              {loadingUsers ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filteredEligibleUsers.length === 0 ? (
                <p className="text-center text-muted-foreground text-[10px] py-6">
                  Siz yozishingiz mumkin bo'lgan foydalanuvchilar topilmadi (RBAC).
                </p>
              ) : (
                filteredEligibleUsers.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => startChatWithUser(target)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/40 rounded-xl text-left"
                  >
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="text-[10px] bg-muted font-bold">
                        {getInitials(target.fullName || target.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{target.fullName || target.email || "Foydalanuvchi"}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{target.email}</p>
                    </div>

                    {getRoleBadge(target.role)}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
