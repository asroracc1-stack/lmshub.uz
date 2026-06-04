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
