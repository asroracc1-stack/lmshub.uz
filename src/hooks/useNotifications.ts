import { useEffect, useState, useCallback } from "react";
// import { supabase } from "@/integrations/supabase/client"; // DEPRECATED
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: "info" | "success" | "warning" | "error";
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
    
    // MOCK DATA
    const mockNotifications: Notification[] = [
      {
        id: "1",
        user_id: user.id,
        title: "Tizimga xush kelibsiz!",
        body: "Java Backend tizimiga muvaffaqiyatli o'tildi.",
        type: "success",
        link: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        user_id: user.id,
        title: "Yangi yangilanish",
        body: "Dashboard UI qismi optimallashtirildi.",
        type: "info",
        link: null,
        is_read: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      }
    ];

    setItems(mockNotifications);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription - DISABLED
  useEffect(() => {
    if (!user) return;
    console.log("📡 Real-time notifications disabled (Supabase removed)");
    
    // Polling mock (optional)
    const interval = setInterval(() => {
      // Mock new notification every 5 minutes
    }, 300000);
    
    return () => clearInterval(interval);
  }, [user]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = async () => {
    if (!user) return;
    setItems([]);
  };

  return { items, unread, loading, markAsRead, markAllAsRead, remove, clearAll, reload: load };
}
