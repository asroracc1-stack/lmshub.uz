import { useRef, MouseEvent, ReactNode } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(124, 58, 237, 0.28)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`relative ${className}`}
      style={{ ["--spotlight-color" as any]: spotlightColor }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-80 transition-opacity"
        style={{
          backgroundImage:
            "radial-gradient(500px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--spotlight-color), transparent 45%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
