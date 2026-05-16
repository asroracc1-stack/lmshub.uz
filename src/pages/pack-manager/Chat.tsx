import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Partner {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  last_at: string;
  last_body: string;
}

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  subject: string;
  created_at: string;
}

export default function PackManagerChat() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [active, setActive] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load all unique chat partners (anyone the manager messaged with)
  const loadPartners = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq("is_broadcast", false)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Suhbatlar yuklanmadi");
      setLoading(false);
      return;
    }
    const map = new Map<string, { last_at: string; last_body: string }>();
    (data ?? []).forEach((m: any) => {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!other) return;
      if (!map.has(other)) map.set(other, { last_at: m.created_at, last_body: m.body });
    });
    const ids = Array.from(map.keys());
    if (!ids.length) {
      setPartners([]);
      setLoading(false);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", ids);
    const list: Partner[] = (profs ?? []).map((p: any) => ({
      user_id: p.id,
      display_name: p.full_name || p.username || "User",
      avatar_url: p.avatar_url,
      last_at: map.get(p.id)!.last_at,
      last_body: map.get(p.id)!.last_body,
    }));
    list.sort((a, b) => +new Date(b.last_at) - +new Date(a.last_at));
    setPartners(list);
    setActive((prev) => prev ?? list[0] ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadPartners();
    // realtime — refresh partner list when new messages arrive
    if (!user) return;
    const ch = supabase
      .channel(`pm-chat-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (m.sender_id === user.id || m.recipient_id === user.id) {
            loadPartners();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load messages for active partner
  useEffect(() => {
    if (!user || !active) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, subject, created_at")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${active.user_id}),and(sender_id.eq.${active.user_id},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as Msg[]) ?? []);
    })();
    const ch = supabase
      .channel(`pm-thread-${active.user_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          const matches =
            (m.sender_id === user.id && m.recipient_id === active.user_id) ||
            (m.sender_id === active.user_id && m.recipient_id === user.id);
          if (matches) setMessages((prev) => [...prev, m]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!user || !active || !text.trim()) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: active.user_id,
      subject: "Chat",
      body,
      is_broadcast: false,
    });
    setSending(false);
    if (error) toast.error("Xabar yuborilmadi");
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!partners.length) {
    return (
      <Card className="p-12 text-center">
        <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Hozircha xabarlar yo'q</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Foydalanuvchilar sizga xabar yozsa, shu yerda paydo bo'ladi.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-160px)]">
      <Card className="overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Foydalanuvchilar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{partners.length} ta suhbat</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {partners.map((p) => (
            <button
              key={p.user_id}
              onClick={() => setActive(p)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/60 transition-colors border-b last:border-b-0 text-left",
                active?.user_id === p.user_id && "bg-muted",
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {p.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.display_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.last_body}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        {active && (
          <>
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={active.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {active.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{active.display_name}</p>
                <p className="text-[11px] text-emerald-500">● faol</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Suhbat hali boshlanmagan
                </div>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words",
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border rounded-bl-sm",
                      )}
                    >
                      {m.body}
                      <div
                        className={cn(
                          "text-[10px] mt-1 opacity-70",
                          mine ? "text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t flex items-center gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Javob yozing..."
                disabled={sending}
                maxLength={2000}
              />
              <Button onClick={send} disabled={sending || !text.trim()} size="icon">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
