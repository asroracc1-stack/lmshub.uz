import { useEffect, useState, useCallback } from "react";
// import { supabase } from "@/integrations/supabase/client"; // DEPRECATED
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/axios";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
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
      const { data } = await api.get<Notification[]>('/communication/notifications');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Bildirishnomalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
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
