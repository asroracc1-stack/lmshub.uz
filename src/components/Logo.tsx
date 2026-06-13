import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  /**
   * "light"  → logo is placed on a LIGHT background  → text is DARK (#1A102A)
   * "dark"   → logo is placed on a DARK background   → text is WHITE (#FFFFFF)
   */
  variant?: "dark" | "light" | "monochrome";
  showText?: boolean;
}

export default function Logo({ 
  className, 
  size = "md", 
  variant = "light",   // default to light background logo (dark text)
  showText = false 
}: LogoProps) {
  
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };

  const finalSize = typeof size === "number" ? size : sizeMap[size];
  
  const width = showText ? finalSize * 2.875 : finalSize;
  const height = finalSize;

  const primaryColor = "#9F86C0"; 

  // light background → dark text, dark background → white text
  const textColor   = variant === "light" ? "#1A102A" : "#FFFFFF";
  const dotFill     = variant === "light" ? "#240046"  : "#E7C6FF";
  const hubColor    = "#9F86C0";

  return (
    <div className={cn("inline-flex items-center transition-all duration-300", className)}>
      <svg 
        width={width} 
        height={height} 
        viewBox={showText ? "0 0 460 160" : "0 0 160 160"} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_15px_rgba(159,134,192,0.2)]"
      >
        <defs>
          <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={showText ? "" : "translate(2, 0)"}>
          {/* Main Orbit Ellipse - original size/rotation */}
          <ellipse cx="78" cy="80" rx="60" ry="20"
            fill="none" stroke={primaryColor} strokeWidth="2"
            transform="rotate(-35 78 80)" opacity="0.9"/>

          {/* Top Left Orbit Accent Dot */}
          <circle cx="43" cy="33" r="4.5" fill={primaryColor}/>
          <circle cx="43" cy="33" r="2.5" fill={dotFill}/>

          {/* Bottom Right Orbit Accent Dot */}
          <circle cx="118" cy="118" r="3" fill={primaryColor} opacity="0.7"/>

          {/* Outer circle */}
          <circle cx="78" cy="80" r="44" fill="none" stroke={primaryColor} strokeWidth="3.5"/>

          {/* Inner circle */}
          <circle cx="78" cy="80" r="30" fill="none" stroke={primaryColor} strokeWidth="2.5" opacity="0.5"/>

          {/* "LMS" inside the circle */}
          <text x="78" y="86"
            fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
            fontSize="16" fontWeight="900" 
            fill={textColor}
            textAnchor="middle" letterSpacing="0.5">LMS</text>
        </g>

        {showText && (
          <>
            {/* Divider line */}
            <line x1="152" y1="36" x2="152" y2="124"
              stroke={primaryColor} strokeWidth="1.5" opacity="0.3"/>

            {/* "LMS" wordmark */}
            <text x="172" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={textColor} letterSpacing="-1" filter="url(#glow)">LMS</text>

            {/* "Hub" wordmark */}
            <text x="318" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={hubColor} letterSpacing="-1">H</text>

            <text x="364" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={hubColor} letterSpacing="-1">u</text>

            <text x="401" y="107"
              fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
              fontSize="60" fontWeight="900" fill={textColor} letterSpacing="-1">b</text>

            {/* Underline accent */}
            <rect x="318" y="113" width="128" height="2.5" rx="1.2" fill={primaryColor} opacity="0.5"/>
            <circle cx="452" cy="114.5" r="3.5" fill={primaryColor}/>
          </>
        )}
      </svg>
    </div>
  );
}
