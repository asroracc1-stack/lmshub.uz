import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole, roleHomePath } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  allow: AppRole[];
}

export default function ProtectedRoute({ children, allow }: Props) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 dark:bg-[#030712]/90 backdrop-blur-md">
        {/* Soft ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-400/10 dark:bg-purple-800/15 blur-[100px] pointer-events-none" />

        <div className="relative flex flex-col items-center gap-6 z-10">
          {/* Dual-ring spinner */}
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-purple-200/40 dark:border-purple-900/40" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-purple-500/10 animate-ping" />
            <div className="absolute inset-3 rounded-full bg-purple-500/20" />
          </div>

          {/* Loading dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-purple-400"
                style={{
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
            Yuklanmoqda...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (!role) return <Navigate to="/auth" replace />;
  if (!allow.includes(role)) {
    // Strict RBAC: silently redirect to /unauthorized when roles don't match
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
