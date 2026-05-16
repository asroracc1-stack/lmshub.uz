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
  
  // Aspect ratio for full logo with text is 460/160 = 2.875
  // For icon only it's square (160/160)
  
  const width = showText ? finalSize * 2.875 : finalSize;
  const height = finalSize;

  const primaryColor = variant === "light" ? "#34d399" : "#10b981"; // Brighter emerald for dark mode
  const secondaryColor = variant === "light" ? "#10b981" : "#059669";
  const textColor = variant === "light" ? "#ffffff" : "#10b981"; // Keep text white in dark mode for contrast
  const hubColor = variant === "light" ? "#34d399" : "#059669";
  const glowColor = variant === "light" ? "rgba(52,211,153,0.5)" : "rgba(16,185,129,0.4)";

  return (
    <div className={cn("inline-flex items-center transition-all duration-300", className)}>
      <svg 
        width={width} 
        height={height} 
        viewBox={showText ? "0 0 460 160" : "0 0 160 160"} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]"
      >
        <defs>
          <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color={variant === "light" ? "#6ee7b7" : "#34d399"}/>
            <stop offset="100%" stop-color={variant === "light" ? "#10b981" : "#059669"}/>
          </linearGradient>
          <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={showText ? "" : "translate(2, 0)"}>
          {/* Outer orbit ring, tilted */}
          <ellipse cx="78" cy="80" rx="60" ry="20"
            fill="none" stroke={primaryColor} strokeWidth="2"
            transform="rotate(-35 78 80)" opacity={variant === "light" ? 0.8 : 1}/>

          {/* Orbit dot top-left */}
          <circle cx="43" cy="33" r="4.5" fill={primaryColor}/>
          <circle cx="43" cy="33" r="2.5" fill={variant === "light" ? "#2DC78A" : "white"}/>

          {/* Orbit dot bottom-right */}
          <circle cx="118" cy="118" r="3" fill={primaryColor} opacity="0.7"/>

          {/* Outer circle */}
          <circle cx="78" cy="80" r="44" fill="none" stroke={primaryColor} strokeWidth="3.5"/>

          {/* Mid circle */}
          <circle cx="78" cy="80" r="30" fill="none" stroke={primaryColor} strokeWidth="2.5" opacity="0.5"/>

          {/* LMS text inside icon - Now without background for cleaner look */}
          <text x="78" y="86"
            fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
            fontSize="16" fontWeight="900" 
            fill={variant === "light" ? "white" : secondaryColor}
            textAnchor="middle" letterSpacing="0.5">LMS</text>
        </g>

        {showText && (
          <>
            {/* Divider line */}
            <line x1="152" y1="36" x2="152" y2="124"
              stroke={primaryColor} strokeWidth="1.5" opacity="0.3"/>

            {/* LMS text */}
            <text x="172" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={textColor} letterSpacing="-1" filter="url(#glow)">LMS</text>

            {/* H */}
            <text x="318" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={hubColor} letterSpacing="-1">H</text>

            {/* u */}
            <text x="364" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={hubColor} letterSpacing="-1">u</text>

            {/* b */}
            <text x="401" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={textColor} letterSpacing="-1">b</text>

            {/* Underline accent under Hub */}
            <rect x="318" y="113" width="128" height="2.5" rx="1.2" fill={primaryColor} opacity="0.5"/>

            {/* Accent dot */}
            <circle cx="452" cy="114.5" r="3.5" fill={primaryColor}/>
          </>
        )}
      </svg>
    </div>
  );
}
