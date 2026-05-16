import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Remove lovable import and use supabase for Google OAuth
// Note: Keep existing props and loading state

// Inside onClick, replace lovable.auth.signInWithOAuth with supabase.auth.signInWithOAuth
// Also handle redirected state if needed.


interface Props {
  label?: string;
  className?: string;
}

export default function GoogleSignInButton({ label = "Google orqali kirish", className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/user/dashboard` },
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google kirishda xatolik");
        setLoading(false);
        return;
      }
      // If redirected, browser navigates away. Otherwise AuthContext will route on session.
    } catch (e: any) {
      toast.error(e?.message ?? "Xatolik");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        "group relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-foreground shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/[0.08] hover:shadow-[0_8px_28px_-8px_rgba(99,102,241,0.4)] disabled:opacity-60 " +
        className
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.3c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2.1 3.9-3.8 5.2l6.5 5.3C42 35 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
