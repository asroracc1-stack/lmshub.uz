import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TgLink {
  id: string;
  kind: "bot" | "channel";
  name: string;
  username: string;
  description: string | null;
}

export default function TelegramTile() {
  const [links, setLinks] = useState<TgLink[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("telegram_links")
        .select("id,kind,name,username,description")
        .eq("is_active", true)
        .order("created_at");
      setLinks((data ?? []) as TgLink[]);
    })();
  }, []);

  if (!links.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((l) => {
        const handle = l.username.replace(/^@/, "");
        const url = `https://t.me/${handle}`;
        return (
          <a
            key={l.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block group"
          >
            <Card className="p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-smooth border-sky-200/60 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/10">
              <div className="h-12 w-12 rounded-xl grid place-items-center bg-sky-500 text-white shadow-md">
                <Send className="h-6 w-6 -rotate-12" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight">{l.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  @{handle} · {l.kind === "channel" ? "Kanal" : "Bot"}
                </p>
              </div>
            </Card>
          </a>
        );
      })}
    </div>
  );
}
