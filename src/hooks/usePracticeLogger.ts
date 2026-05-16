import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Mounts on a practice page and reports total active minutes spent
 * to the `practice_sessions` table on unmount or every `flushEveryMs`.
 * Pauses while the tab is hidden.
 */
export function usePracticeLogger(activity: string, opts?: { flushEveryMs?: number }) {
  const { user, role } = useAuth();
  const startRef = useRef<number>(Date.now());
  const accumMs = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const flushMs = opts?.flushEveryMs ?? 60_000;

  useEffect(() => {
    if (!user) return;

    const tick = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        accumMs.current += now - lastTickRef.current;
        lastTickRef.current = now;
      } else {
        lastTickRef.current = Date.now();
      }
    };
    const onVis = () => {
      lastTickRef.current = Date.now();
    };
    const interval = window.setInterval(tick, 5_000);
    document.addEventListener("visibilitychange", onVis);

    const flush = async () => {
      tick();
      const minutes = +(accumMs.current / 60000).toFixed(2);
      if (minutes >= 0.1) {
        accumMs.current = 0;
        await (supabase.rpc as any)("log_practice", {
          _minutes: minutes,
          _activity: activity,
          _meta: {},
        });
      }
    };
    const flushTimer = window.setInterval(flush, flushMs);

    const handleUnload = () => {
      // best-effort sync flush
      tick();
      const minutes = +(accumMs.current / 60000).toFixed(2);
      if (minutes >= 0.1) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/practice_sessions`,
          new Blob(
            [JSON.stringify({ user_id: user.id, minutes, activity })],
            { type: "application/json" },
          ),
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(flushTimer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", handleUnload);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activity, role]);
}
