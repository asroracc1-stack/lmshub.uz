import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/axios";

const BotLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    let redirect = searchParams.get("redirect") || "/";

    if (!token) {
      toast.error("Yaroqsiz token");
      navigate("/auth");
      return;
    }

    const authenticate = async () => {
      try {
        localStorage.setItem("access_token", token);
        const res = await api.get('/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const userData = {
            id: res.data.id,
            email: res.data.email,
            role: res.data.role,
            username: res.data.username,
            firstName: res.data.firstName || res.data.full_name?.split(' ')[0],
            lastName: res.data.lastName || res.data.full_name?.split(' ').slice(1).join(' '),
            avatarUrl: res.data.avatarUrl || res.data.avatar_url,
            phone: res.data.phone || res.data.phoneNumber
        };

        // Fix old bot links that had /exam/:id
        if (redirect.startsWith("/exam/")) {
            const testId = redirect.split("/exam/")[1];
            const roleLower = (res.data.role || "user").toLowerCase();
            let rolePath = "user";
            if (roleLower === "student") rolePath = "student";
            else if (roleLower === "teacher") rolePath = "teacher";
            else if (roleLower === "admin") rolePath = "admin";
            else if (roleLower === "administrator") rolePath = "administrator";
            else if (roleLower === "super_admin") rolePath = "super-admin";
            else if (roleLower === "payment_manager" || roleLower === "pack_manager" || roleLower === "manager") rolePath = "pack-manager";
            
            redirect = `/${rolePath}/mocks/take/${testId}`;
        } else if (redirect === "/admin/dashboard" || redirect === "/super-admin/dashboard" || redirect === "/administrator/dashboard" || redirect === "/teacher/dashboard" || redirect === "/pack-manager/dashboard") {
            // Automatically map dashboard redirects to the user's actual role dashboard
            const roleLower = (res.data.role || "user").toLowerCase();
            let rolePath = "user";
            if (roleLower === "student") rolePath = "student";
            else if (roleLower === "teacher") rolePath = "teacher";
            else if (roleLower === "admin") rolePath = "admin";
            else if (roleLower === "administrator") rolePath = "administrator";
            else if (roleLower === "super_admin") rolePath = "super-admin";
            else if (roleLower === "payment_manager" || roleLower === "pack_manager" || roleLower === "manager") rolePath = "pack-manager";
            
            redirect = `/${rolePath}/dashboard`;
        }

        setAuth(token, userData as any);
        toast.success("Muvaffaqiyatli kirdingiz!");
        window.location.href = redirect;
      } catch (err) {
        console.error("Bot login error:", err);
        toast.error("Token eskirgan yoki xatolik yuz berdi");
        navigate("/auth");
      }
    };

    authenticate();

  }, [searchParams, navigate, setAuth]);

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
