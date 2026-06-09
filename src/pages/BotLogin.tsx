import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const BotLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth(); // Assuming this or similar exists, or we just set token directly.

  useEffect(() => {
    const token = searchParams.get("token");
    let redirect = searchParams.get("redirect") || "/";

    if (!token) {
      toast.error("Yaroqsiz token");
      navigate("/auth");
      return;
    }

    // Save token to localStorage
    localStorage.setItem("token", token);
    
    // Check if the auth context has a method to refresh the user from token
    // If we just reload the page to the redirect URL, AuthContext will pick up the token from localStorage
    
    toast.success("Muvaffaqiyatli kirdingiz!");
    
    // Quick redirect via window.location to force AuthContext to re-read the token from localStorage on mount
    window.location.href = redirect;

  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Tizimga ulanmoqda...</h2>
        <p className="text-muted-foreground">Iltimos, kuting, sizni tizimga kiritmoqdamiz.</p>
      </div>
    </div>
  );
};

export default BotLogin;
