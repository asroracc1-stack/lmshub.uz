import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, X, Info, AlertTriangle, CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const typeIcon: Record<Notification["type"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CircleCheck,
  warning: AlertTriangle,
  error: CircleX,
};
const typeColor: Record<Notification["type"], string> = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat`;
  const d = Math.floor(h / 24);
  return `${d} kun`;
}

export default function NotificationsPage() {
  const { items, unread, markAsRead, markAllAsRead, remove, clearAll } = useNotifications();
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">{t("nav.notifications", "Bildirishnomalar")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unread > 0 ? `${unread} ta yangi xabar` : "Hammasi o'qildi"}
          </p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" /> Hammasini o'qildi
            </Button>
          )}
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Tozalash
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="py-24 text-center text-sm text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            Hozircha bildirishnoma yo'q
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const Icon = typeIcon[n.type];
              const content = (
                <div className={cn(
                  "flex gap-3 p-4 transition-smooth hover:bg-muted/40 group",
                  !n.is_read && "bg-primary/5"
                )}>
                  <div className={cn("mt-0.5", typeColor[n.type])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAsRead(n.id); }}
                        className="p-1.5 rounded hover:bg-muted"
                        title="O'qildi"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(n.id); }}
                      className="p-1.5 rounded hover:bg-destructive/20 text-destructive"
                      title="O'chirish"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link to={n.link} onClick={() => markAsRead(n.id)} className="block">
                      {content}
                    </Link>
                  ) : (
                    <div onClick={() => markAsRead(n.id)} className="cursor-pointer">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

