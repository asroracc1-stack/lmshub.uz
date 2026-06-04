import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send, Headset, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Manager {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url?: string | null;
}

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  subject: string;
  created_at: string;
}

export default function UserChat() {
  const { user } = useAuth();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [active, setActive] = useState<Manager | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load all users with payment_manager role and join profile data
  useEffect(() => {
    (async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "payment_manager");
      if (error) {
        toast.error("Pack managerlar yuklanmadi");
        setLoading(false);
        return;
      }
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      if (!ids.length) {
        setManagers([]);
        setLoading(false);
        return;
      }
      // Optional payment_managers row for display name override
      const { data: pms } = await supabase
        .from("payment_managers")
        .select("user_id, display_name, is_active")
        .in("user_id", ids);
      const pmMap: Record<string, { display_name: string | null; is_active: boolean }> = {};
      (pms ?? []).forEach((p: any) => {
        pmMap[p.user_id] = { display_name: p.display_name, is_active: p.is_active };
      });
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      const list: Manager[] = (profs ?? [])
        .filter((p: any) => pmMap[p.id]?.is_active !== false)
        .map((p: any) => ({
          id: p.id,
          user_id: p.id,
          display_name:
            pmMap[p.id]?.display_name || p.full_name || p.username || "Pack manager",
          avatar_url: p.avatar_url,
        }));
      setManagers(list);
      setActive(list[0] ?? null);
      setLoading(false);
    })();
  }, []);

  // Load messages between user and active manager
  useEffect(() => {
    if (!user || !active) return;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, subject, created_at")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${active.user_id}),and(sender_id.eq.${active.user_id},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (!error) setMessages((data as Msg[]) ?? []);
    })();

    // Realtime
    const ch = supabase
      .channel(`user-chat-${active.user_id}`)
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

  // Auto-scroll on new messages
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

  if (!managers.length) {
    return (
      <Card className="p-12 text-center">
        <Headset className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Pack managerlar mavjud emas</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Hozircha hech qanday pack manager faollashtirilmagan. Iltimos keyinroq qayta urinib ko'ring.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-160px)]">
      {/* Manager list */}
      <Card className="overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Pack managerlar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Yordam uchun yozing</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {managers.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/60 transition-colors border-b last:border-b-0",
                active?.id === m.id && "bg-muted",
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={m.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {(m.display_name ?? "PM").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.display_name}</p>
                <p className="text-[11px] text-muted-foreground">Onlayn yordam</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Chat panel */}
      <Card className="flex flex-col overflow-hidden">
        {active && (
          <>
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={active.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {(active.display_name ?? "PM").slice(0, 2).toUpperCase()}
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
                  Birinchi xabaringizni yozing 👋
                </div>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
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
                placeholder="Xabar yozing..."
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

