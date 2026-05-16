import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  variant?: "dark" | "light" | "monochrome";
  showText?: boolean;
}

export default function Logo({ 
  className, 
  size = "md", 
  variant = "dark", 
  showText = false 
}: LogoProps) {
  
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };

  const finalSize = typeof size === "number" ? size : sizeMap[size];
  const strokeColor = variant === "light" ? "#ffffff" : "currentColor";

  return (
    <div className={cn("inline-flex items-center gap-2 transition-all duration-300", className)}>
      <svg 
        width={finalSize} 
        height={finalSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path 
          d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" 
          stroke={strokeColor} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M12 11V17" 
          stroke="#22c55e" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M12 17C10.5 16.5 9 16.5 7.5 16.5V10.5C9 10.5 10.5 10.5 12 11.5" 
          stroke="#22c55e" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M12 17C13.5 16.5 15 16.5 16.5 16.5V10.5C15 10.5 13.5 10.5 12 11.5" 
          stroke="#22c55e" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className={cn(
          "font-display font-bold tracking-tight",
          finalSize >= 48 ? "text-2xl" : finalSize >= 32 ? "text-xl" : "text-lg",
          variant === "light" ? "text-white" : "text-slate-900 dark:text-white"
        )}>
          LMS<span className="text-emerald-500">Hub</span>
        </span>
      )}
    </div>
  );
}
