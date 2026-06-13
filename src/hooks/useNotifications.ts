import i18next from "i18next";
import { useEffect, useState, useCallback } from "react";
// import { supabase } from "@/integrations/supabase/client"; // DEPRECATED
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/axios";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;  // backend 'message' field
  body: string | null;     // alias for compatibility
  type: "info" | "success" | "warning" | "error" | "INFO" | "ALERT" | "NEW_MESSAGE" | "ACADEMIC" | "FINANCE" | string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * 🚨 DIQQAT: SUPABASE O'CHIRILDI. 
 * HOZIRCHA MOCK DATA ISHLATILADI.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch only unread notifications so that confirmed ones do not show up anymore
      const { data } = await api.get<Notification[]>('/communication/notifications?unreadOnly=true');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(i18next.t("dynamic.usenotifications.bildirishnomalarni_yuklashda_xatolik"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription and Polling
  useEffect(() => {
    if (!user) return;
    
    // 1. Polling for DB notifications (Payments, System)
    const interval = setInterval(() => {
      load();
    }, 15000); // 15 seconds
    
    // 2. Real-time Socket connection for Chat messages
    let socket: any = null;
    import("socket.io-client").then(({ io }) => {
      const socketUrl = import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:5000";
      socket = io(socketUrl, { query: { userId: user.id } });
      
      socket.on("global_notification", (msg: any) => {
        // Create an in-memory notification for the new chat message
        const newNotif: Notification = {
          id: msg.id || Date.now().toString(),
          user_id: user.id,
          title: `Yangi xabar`,
          message: `${msg.sender?.fullName || "Foydalanuvchi"}: ${msg.body}`,
          body: msg.body,
          type: "NEW_MESSAGE",
          link: "/admin/messages",
          is_read: false,
          created_at: msg.createdAt || new Date().toISOString()
        };
        
        setItems(prev => {
          // Prevent duplicates
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        
        toast.success(`Yangi xabar: ${msg.sender?.fullName || ""}`, {
          description: msg.body?.length > 30 ? msg.body.substring(0, 30) + "..." : msg.body,
        });
      });
    });
    
    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [user, load]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/communication/notifications/${id}/read`);
      setItems((prev) => prev.filter((n) => n.id !== id)); // Remove from list completely
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await api.put('/communication/notifications/read-all');
      setItems([]); // Clear all since we only show unread
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/communication/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      await api.delete('/communication/notifications');
      setItems([]);
    } catch (err) {
      console.error(err);
    }
  };

  return { items, unread, loading, markAsRead, markAllAsRead, remove, clearAll, reload: load };
}
