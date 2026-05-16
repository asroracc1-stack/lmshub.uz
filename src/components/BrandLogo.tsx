import { cn } from "@/lib/utils";
import defaultLogo from "@/assets/lmshub-logo.png";
import { Building2 } from "lucide-react";
import Logo from "./Logo";

interface BrandLogoProps {
  className?: string;
  size?: number;
  src?: string | null;
  isOrganization?: boolean;
}

export default function BrandLogo({ className, size = 36, src, isOrganization = true }: BrandLogoProps) {
  // Cache busting for dynamic logos
  const logoSrc = src ? (src.startsWith("http") ? `${src}?t=${Date.now()}` : src) : null;

  if (!logoSrc) {
    if (!isOrganization) {
      return (
        <Logo 
          size={size} 
          className={className} 
          variant="dark" 
        />
      );
    }
    return (
      <div 
        className={cn("flex items-center justify-center bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-sm shrink-0 overflow-hidden", className)}
        style={{ height: size, width: size }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
        <Building2 className="text-blue-500 relative z-10" style={{ height: size * 0.6, width: size * 0.6 }} />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt="LMSHub"
      height={size}
      style={{ height: size, width: "auto" }}
      className={cn(
        "shrink-0 object-contain select-none",
        !src && "mix-blend-multiply dark:mix-blend-screen dark:invert dark:brightness-110 dark:contrast-110",
        className,
      )}
      draggable={false}
      onError={(e) => {
        // Fallback if image fails to load
        (e.target as HTMLImageElement).src = defaultLogo;
      }}
    />
  );
}
