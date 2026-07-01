import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StudentAttempt {
  id: string;
  exam: {
    id: string;
    title: string;
    type: string;
  };
  overallBand?: number;
  totalScore?: number;
}

/* ============================================================
   LISTENING — headphone guy with pulsing equalizer + floating notes
   ============================================================ */
function ListeningIllustration({ isDark }: { isDark: boolean }) {
  const glowColor = isDark ? "#10b981" : "#dcfce7";
  const glowOpacity = isDark ? "0.15" : "0.75";

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <style>{`
        .ll-body { animation: ll-sway 3.2s ease-in-out infinite; transform-origin: 200px 260px; }
        .ll-phone { animation: ll-tilt 2.2s ease-in-out infinite; transform-origin: 290px 240px; }
        .ll-cup-l { animation: ll-glow 1.6s ease-in-out infinite; }
        .ll-cup-r { animation: ll-glow 1.6s ease-in-out infinite; animation-delay: .3s; }
        .ll-note { animation: ll-float 3s ease-in-out infinite; }
        .ll-note.d1 { animation-delay: .5s; }
        .ll-note.d2 { animation-delay: 1s; }
        .ll-note.d3 { animation-delay: 1.6s; }
        .ll-note.d4 { animation-delay: 2.2s; }
        .ll-ring { transform-origin: 105px 210px; animation: ll-ring 2s ease-out infinite; }
        .ll-ring.d1 { animation-delay: .6s; }
        .ll-ring.d2 { animation-delay: 1.2s; }
        .ll-eq rect { animation: ll-eq 1s ease-in-out infinite; transform-origin: bottom; }
        .ll-eq rect:nth-child(2){ animation-delay: .1s }
        .ll-eq rect:nth-child(3){ animation-delay: .2s }
        .ll-eq rect:nth-child(4){ animation-delay: .3s }
        .ll-eq rect:nth-child(5){ animation-delay: .15s }
        @keyframes ll-sway { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(1.5deg)} }
        @keyframes ll-tilt { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        @keyframes ll-glow {
          0%,100%{fill:#22c55e; filter:drop-shadow(0 0 0 rgba(34,197,94,0))}
          50%{fill:#4ade80; filter:drop-shadow(0 0 8px rgba(34,197,94,.9))}
        }
        @keyframes ll-float {
          0%{transform:translateY(30px) rotate(-10deg);opacity:0}
          20%{opacity:1}
          100%{transform:translateY(-90px) rotate(20deg);opacity:0}
        }
        @keyframes ll-ring {
          0%{transform:scale(.3);opacity:.9}
          100%{transform:scale(2.2);opacity:0}
        }
        @keyframes ll-eq {
          0%,100%{transform:scaleY(.4)}
          50%{transform:scaleY(1)}
        }
      `}</style>

      {/* soft radial backdrop */}
      <defs>
        <radialGradient id="ll-bg" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={glowColor} stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#ll-bg)" />

      {/* left pulse rings */}
      <g fill="none" stroke="#22c55e" strokeWidth="3">
        <circle className="ll-ring" cx="105" cy="210" r="20" />
        <circle className="ll-ring d1" cx="105" cy="210" r="20" />
        <circle className="ll-ring d2" cx="105" cy="210" r="20" />
      </g>

      {/* floating notes */}
      <g fill="#16a34a">
        <g className="ll-note">
          <circle cx="320" cy="140" r="10" />
          <rect x="329" y="95" width="4" height="48" />
          <path d="M333 95 Q353 100 348 118 Q344 106 333 108 Z" />
        </g>
        <g className="ll-note d1">
          <circle cx="350" cy="180" r="7" />
          <rect x="356" y="145" width="3" height="36" />
        </g>
        <g className="ll-note d2">
          <circle cx="290" cy="100" r="7" />
          <rect x="296" y="65" width="3" height="36" />
          <path d="M299 65 Q315 70 310 84 Q307 74 299 76 Z" />
        </g>
        <g className="ll-note d3">
          <circle cx="335" cy="80" r="5" />
        </g>
        <g className="ll-note d4">
          <circle cx="310" cy="200" r="6" />
          <rect x="315" y="170" width="2.5" height="32" />
        </g>
      </g>

      {/* equalizer bars near ear */}
      <g className="ll-eq" fill="#22c55e">
        <rect x="60" y="180" width="7" height="35" rx="2" />
        <rect x="72" y="170" width="7" height="45" rx="2" />
        <rect x="84" y="160" width="7" height="55" rx="2" />
        <rect x="60" y="230" width="7" height="30" rx="2" />
        <rect x="72" y="230" width="7" height="40" rx="2" />
      </g>

      <g className="ll-body">
        {/* body / jacket */}
        <path d="M110 395 L110 275 Q110 225 200 225 Q290 225 290 275 L290 395 Z" fill="#111827" />
        <path d="M170 225 L200 285 L230 225 Z" fill="#f3f4f6" />
        <rect x="186" y="200" width="28" height="35" fill="#f5b8a0" />

        {/* head */}
        <circle cx="200" cy="155" r="60" fill="#f5b8a0" />
        {/* hair */}
        <path d="M140 155 Q140 88 200 82 Q260 88 260 155 Q260 128 235 118 Q215 104 192 108 Q152 112 140 155Z" fill="#0f172a" />

        {/* headphone band */}
        <path d="M134 152 Q134 82 200 82 Q266 82 266 152" fill="none" stroke="#0f172a" strokeWidth="10" strokeLinecap="round" />
        {/* cups */}
        <rect x="118" y="145" width="28" height="48" rx="9" fill="#0f172a" />
        <rect x="254" y="145" width="28" height="48" rx="9" fill="#0f172a" />
        <rect className="ll-cup-l" x="122" y="155" width="7" height="28" rx="3" fill="#22c55e" />
        <rect className="ll-cup-r" x="269" y="155" width="7" height="28" rx="3" fill="#22c55e" />

        {/* left arm */}
        <path d="M118 280 Q95 320 140 335 L160 325 Q135 315 138 280 Z" fill="#111827" />
        <circle cx="145" cy="330" r="16" fill="#f5b8a0" />

        {/* right arm + phone */}
        <path d="M282 280 Q310 305 290 340 L268 340 Q275 315 262 285 Z" fill="#111827" />
        <circle cx="285" cy="340" r="16" fill="#f5b8a0" />
        <g className="ll-phone">
          <rect x="268" y="228" width="40" height="62" rx="7" fill="#0f172a" />
          <rect x="272" y="232" width="32" height="52" rx="4" fill="#22c55e" opacity=".95" />
          <circle cx="288" cy="255" r="8" fill="#fff" />
          <rect x="278" y="270" width="20" height="3" rx="1" fill="#fff" opacity=".7" />
        </g>
      </g>
    </svg>
  );
}

/* ============================================================
   READING — girl reading with page flip + floating letters
   ============================================================ */
function ReadingIllustration({ isDark }: { isDark: boolean }) {
  const glowColor = isDark ? "#10b981" : "#dcfce7";
  const glowOpacity = isDark ? "0.15" : "0.75";

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <style>{`
        .rr-blob { animation: rr-breathe 4s ease-in-out infinite; transform-origin: 280px 150px; }
        .rr-page { animation: rr-flip 3s ease-in-out infinite; transform-origin: 200px 300px; }
        .rr-eye { animation: rr-scan 2.4s ease-in-out infinite; }
        .rr-letter { animation: rr-rise 3.5s ease-in-out infinite; opacity: 0; }
        .rr-letter.d1 { animation-delay: .7s; }
        .rr-letter.d2 { animation-delay: 1.4s; }
        .rr-letter.d3 { animation-delay: 2.1s; }
        .rr-letter.d4 { animation-delay: 2.8s; }
        .rr-sparkle { animation: rr-sparkle 2s ease-in-out infinite; transform-origin: center; }
        .rr-sparkle.d1 { animation-delay: .6s; }
        .rr-sparkle.d2 { animation-delay: 1.2s; }
        @keyframes rr-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes rr-flip {
          0%,100%{transform:rotateY(0)}
          50%{transform:rotateY(-65deg)}
        }
        @keyframes rr-scan { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
        @keyframes rr-rise {
          0%{transform:translateY(0) rotate(0);opacity:0}
          15%{opacity:1}
          100%{transform:translateY(-120px) rotate(15deg);opacity:0}
        }
        @keyframes rr-sparkle {
          0%,100%{transform:scale(0);opacity:0}
          50%{transform:scale(1);opacity:1}
        }
      `}</style>

      <defs>
        <radialGradient id="rr-bg" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={glowColor} stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#rr-bg)" />

      <circle className="rr-blob" cx="290" cy="150" r="100" fill={isDark ? "rgba(30, 41, 59, 0.3)" : "#e5e7eb"} />

      {/* rising letters */}
      <g fill="#16a34a" fontSize="22" fontWeight="700" fontFamily="Georgia, serif">
        <text className="rr-letter" x="90" y="290">A</text>
        <text className="rr-letter d1" x="130" y="270">b</text>
        <text className="rr-letter d2" x="260" y="290">c</text>
        <text className="rr-letter d3" x="300" y="270">?</text>
        <text className="rr-letter d4" x="180" y="285">!</text>
      </g>

      {/* sparkles */}
      <g fill="#22c55e">
        <g className="rr-sparkle" transform="translate(80,110)">
          <path d="M0 -12 L4 -4 L12 0 L4 4 L0 12 L-4 4 L-12 0 L-4 -4 Z" />
        </g>
        <g className="rr-sparkle d1" transform="translate(360,270)">
          <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" />
        </g>
        <g className="rr-sparkle d2" transform="translate(340,100)">
          <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" />
        </g>
      </g>

      {/* head */}
      <circle cx="200" cy="150" r="58" fill="#f5b8a0" />
      <path d="M142 150 Q142 82 200 78 Q258 82 258 148 Q258 124 235 114 Q215 102 195 106 Q157 112 142 150Z" fill="#0f172a" />
      <path d="M255 138 Q290 165 270 240 Q265 205 248 190 Z" fill="#0f172a" />
      <g className="rr-eye">
        <circle cx="184" cy="154" r="3.5" fill="#0f172a" />
        <circle cx="214" cy="154" r="3.5" fill="#0f172a" />
      </g>
      <path d="M188 178 Q200 186 212 178" stroke="#0f172a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* body */}
      <path d="M95 395 L95 290 Q95 230 200 230 Q305 230 305 290 L305 395 Z" fill="#22c55e" />
      <path d="M95 290 Q70 320 115 340 L160 320 Z" fill="#22c55e" />
      <path d="M305 290 Q330 320 285 340 L240 320 Z" fill="#22c55e" />
      <circle cx="120" cy="335" r="16" fill="#f5b8a0" />
      <circle cx="280" cy="335" r="16" fill="#f5b8a0" />

      {/* book */}
      <path d="M85 285 L200 305 L315 285 L315 370 L200 390 L85 370 Z" fill={isDark ? "#f1f5f9" : "#fff"} stroke="#0f172a" strokeWidth="3.5" />
      <line x1="200" y1="305" x2="200" y2="390" stroke="#0f172a" strokeWidth="3" />
      {/* left page lines */}
      <g stroke="#d1d5db" strokeWidth="2.5">
        <line x1="105" y1="320" x2="185" y2="330" />
        <line x1="105" y1="335" x2="185" y2="345" />
        <line x1="105" y1="350" x2="170" y2="360" />
      </g>
      {/* flipping right page */}
      <g className="rr-page">
        <path d="M200 305 L315 285 L315 370 L200 390 Z" fill={isDark ? "#f8fafc" : "#f9fafb"} stroke="#0f172a" strokeWidth="3" />
        <line x1="220" y1="318" x2="295" y2="308" stroke="#d1d5db" strokeWidth="2.5" />
        <line x1="220" y1="335" x2="295" y2="325" stroke="#d1d5db" strokeWidth="2.5" />
        <line x1="220" y1="352" x2="280" y2="342" stroke="#d1d5db" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

/* ============================================================
   WRITING — desk lamp + writing hand + drawing lines + ink
   ============================================================ */
function WritingIllustration({ isDark }: { isDark: boolean }) {
  const glowColor = isDark ? "#10b981" : "#dcfce7";
  const glowOpacity = isDark ? "0.15" : "0.75";

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <style>{`
        .ww-hand { animation: ww-write 1.5s ease-in-out infinite; transform-origin: 275px 305px; }
        .ww-line { stroke-dasharray: 170; stroke-dashoffset: 170; animation: ww-draw 5s ease-in-out infinite; }
        .ww-line.d1 { animation-delay: 1.5s; }
        .ww-line.d2 { animation-delay: 3s; }
        .ww-glow { animation: ww-glow 2.4s ease-in-out infinite; }
        .ww-ink { animation: ww-ink 1.5s ease-in-out infinite; }
        .ww-idea { animation: ww-idea 3s ease-in-out infinite; transform-origin: center; }
        @keyframes ww-write {
          0%,100%{transform:translate(0,0) rotate(0)}
          25%{transform:translate(-12px,-3px) rotate(-4deg)}
          75%{transform:translate(12px,3px) rotate(5deg)}
        }
        @keyframes ww-draw {
          0%{stroke-dashoffset:170}
          40%,100%{stroke-dashoffset:0}
        }
        @keyframes ww-glow {
          0%,100%{opacity:.2; r:50}
          50%{opacity:.5; r:70}
        }
        @keyframes ww-ink {
          0%,100%{transform:translateY(0);opacity:0}
          50%{transform:translateY(6px);opacity:1}
        }
        @keyframes ww-idea {
          0%,100%{transform:scale(0);opacity:0}
          50%{transform:scale(1);opacity:1}
        }
      `}</style>

      <defs>
        <radialGradient id="ww-bg" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={glowColor} stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#ww-bg)" />

      {/* lamp glow */}
      <circle className="ww-glow" cx="80" cy="105" r="60" fill={isDark ? "rgba(253, 230, 138, 0.12)" : "#fde68a"} />

      {/* lamp */}
      <g>
        <path d="M55 60 L105 60 L92 105 L68 105 Z" fill="#9ca3af" stroke="#0f172a" strokeWidth="3" />
        <line x1="80" y1="105" x2="80" y2="255" stroke="#0f172a" strokeWidth="4" />
        <ellipse cx="80" cy="260" rx="35" ry="7" fill="#6b7280" stroke="#0f172a" strokeWidth="2" />
      </g>

      {/* idea bulb */}
      <g className="ww-idea" transform="translate(300,80)">
        <circle r="16" fill="#fde68a" stroke="#f59e0b" strokeWidth="2.5" />
        <path d="M-4 4 L4 4 L2 10 L-2 10 Z" fill="#f59e0b" />
        <line x1="0" y1="-24" x2="0" y2="-30" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="-12" x2="24" y2="-16" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="-18" y1="-12" x2="-24" y2="-16" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* head */}
      <circle cx="230" cy="130" r="55" fill="#f5b8a0" />
      <path d="M175 130 Q175 65 230 62 Q285 65 285 130 Q285 108 262 100 Q245 88 225 92 Q190 96 175 130Z" fill="#0f172a" />
      <circle cx="215" cy="132" r="3.5" fill="#0f172a" />
      <circle cx="245" cy="132" r="3.5" fill="#0f172a" />
      <path d="M218 152 Q230 158 242 152" stroke="#0f172a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* body */}
      <path d="M140 395 L140 285 Q140 220 230 220 Q320 220 320 285 L320 395 Z" fill="#22c55e" />
      <circle cx="230" cy="255" r="3.5" fill="#0f172a" />
      <circle cx="230" cy="280" r="3.5" fill="#0f172a" />
      <circle cx="230" cy="305" r="3.5" fill="#0f172a" />

      {/* paper */}
      <rect x="105" y="295" width="220" height="90" rx="5" fill={isDark ? "#f1f5f9" : "#fff"} stroke="#0f172a" strokeWidth="3" />
      <line className="ww-line" x1="125" y1="318" x2="305" y2="318" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      <line className="ww-line d1" x1="125" y1="342" x2="305" y2="342" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      <line className="ww-line d2" x1="125" y1="366" x2="255" y2="366" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />

      {/* left arm resting */}
      <path d="M140 290 Q112 325 148 350 L180 335 Z" fill="#22c55e" />
      <circle cx="160" cy="340" r="15" fill="#f5b8a0" />

      {/* right arm + pencil */}
      <g className="ww-hand">
        <path d="M320 285 Q340 310 285 318 L255 305 Z" fill="#22c55e" />
        <circle cx="272" cy="313" r="16" fill="#f5b8a0" />
        <rect x="278" y="265" width="6" height="50" rx="1.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.5" transform="rotate(32 281 290)" />
        <polygon points="306 254 316 268 300 272" fill="#0f172a" transform="rotate(32 308 263)" />
        {/* ink drop */}
        <circle className="ww-ink" cx="308" cy="290" r="3" fill="#0f172a" />
      </g>
    </svg>
  );
}

/* ============================================================
   SPEAKING — person + typing speech bubbles + soundwaves + avatar
   ============================================================ */
function SpeakingIllustration({ isDark }: { isDark: boolean }) {
  const glowColor = isDark ? "#10b981" : "#dcfce7";
  const glowOpacity = isDark ? "0.15" : "0.75";

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <style>{`
        .ss-b1 { animation: ss-pop 3s ease-in-out infinite; transform-origin: 260px 105px; }
        .ss-b2 { animation: ss-pop 3s ease-in-out infinite; animation-delay: .8s; transform-origin: 300px 175px; }
        .ss-b3 { animation: ss-pop 3s ease-in-out infinite; animation-delay: 1.6s; transform-origin: 270px 240px; }
        .ss-dot { animation: ss-dot 1.2s ease-in-out infinite; }
        .ss-dot.d1 { animation-delay: .2s; }
        .ss-dot.d2 { animation-delay: .4s; }
        .ss-wave { transform-origin: 120px 200px; animation: ss-w 1.4s ease-in-out infinite; }
        .ss-wave.d1 { animation-delay: .2s; }
        .ss-wave.d2 { animation-delay: .4s; }
        .ss-wave.d3 { animation-delay: .6s; }
        .ss-avatar { animation: ss-bob 2.4s ease-in-out infinite; transform-origin: 350px 110px; }
        .ss-ring { transform-origin: 350px 110px; animation: ss-ring 2s ease-out infinite; }
        @keyframes ss-pop {
          0%,100%{transform:scale(.5);opacity:0}
          25%,75%{transform:scale(1);opacity:1}
        }
        @keyframes ss-dot {
          0%,100%{opacity:.3;transform:translateY(0)}
          50%{opacity:1;transform:translateY(-3px)}
        }
        @keyframes ss-w {
          0%,100%{transform:scaleX(.4);opacity:.2}
          50%{transform:scaleX(1);opacity:1}
        }
        @keyframes ss-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes ss-ring {
          0%{transform:scale(1);opacity:.7}
          100%{transform:scale(1.6);opacity:0}
        }
      `}</style>

      <defs>
        <radialGradient id="ss-bg" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={glowColor} stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#ss-bg)" />

      {/* sound waves near mouth */}
      <g stroke="#22c55e" strokeWidth="5" fill="none" strokeLinecap="round">
        <path className="ss-wave" d="M105 185 Q90 200 105 215" />
        <path className="ss-wave d1" d="M88 170 Q65 200 88 230" />
        <path className="ss-wave d2" d="M70 155 Q40 200 70 245" />
        <path className="ss-wave d3" d="M52 140 Q15 200 52 260" />
      </g>

      {/* head (back / side) */}
      <circle cx="180" cy="180" r="65" fill="#f5b8a0" />
      <path d="M115 178 Q115 108 180 104 Q245 108 245 178 Q245 148 222 138 Q200 122 178 128 Q130 134 115 178Z" fill="#0f172a" />
      <ellipse cx="126" cy="192" rx="9" ry="14" fill="#e0a088" />

      {/* jacket back */}
      <path d="M85 395 L85 300 Q85 240 180 240 Q275 240 275 300 L275 395 Z" fill="#374151" />
      <path d="M170 240 L180 300 L190 240 Z" fill="#1f2937" />
      <circle cx="180" cy="270" r="3" fill="#111827" />
      <circle cx="180" cy="290" r="3" fill="#111827" />

      {/* speech bubbles */}
      <g>
        <g className="ss-b1">
          <rect x="220" y="80" width="100" height="46" rx="23" fill={isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7"} stroke="#22c55e" strokeWidth="3" />
          <path d="M230 122 L222 138 L240 128 Z" fill={isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7"} stroke="#22c55e" strokeWidth="3" />
          <circle className="ss-dot" cx="245" cy="103" r="4" fill="#22c55e" />
          <circle className="ss-dot d1" cx="265" cy="103" r="4" fill="#22c55e" />
          <circle className="ss-dot d2" cx="285" cy="103" r="4" fill="#22c55e" />
        </g>
        <g className="ss-b2">
          <rect x="255" y="150" width="95" height="46" rx="23" fill="#22c55e" />
          <path d="M265 192 L258 208 L275 198 Z" fill="#22c55e" />
          <rect x="270" y="167" width="65" height="4" rx="2" fill="#fff" />
          <rect x="270" y="178" width="45" height="4" rx="2" fill="#fff" opacity=".85" />
        </g>
        <g className="ss-b3">
          <rect x="225" y="220" width="85" height="42" rx="21" fill={isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7"} stroke="#22c55e" strokeWidth="3" />
          <path d="M235 258 L228 274 L245 264 Z" fill={isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7"} stroke="#22c55e" strokeWidth="3" />
          <rect x="240" y="234" width="55" height="4" rx="2" fill="#22c55e" />
          <rect x="240" y="245" width="38" height="4" rx="2" fill="#22c55e" opacity=".7" />
        </g>
      </g>

      {/* other person avatar */}
      <g>
        <circle className="ss-ring" cx="350" cy="110" r="26" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <g className="ss-avatar">
          <circle cx="350" cy="110" r="26" fill={isDark ? "#1e293b" : "#fff"} stroke="#22c55e" strokeWidth="3" />
          <circle cx="350" cy="103" r="9" fill="#f5b8a0" />
          <path d="M333 128 Q350 112 367 128 Z" fill="#22c55e" />
        </g>
      </g>
    </svg>
  );
}

export default function UserPractice() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/student") ? "/student" : "/user";

  const [, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep API integration active to ensure no functionality breaks
  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const res = await api.get("/student/exams/attempts");
        setAttempts(res.data || []);
      } catch (err) {
        console.error("Failed to load attempts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, []);

  const skills = [
    {
      id: "listening",
      tag: t("practice.listening.tag", "LISTENING"),
      title: t("practice.listening.title", "Eshitish 🎧"),
      desc: t("practice.listening.desc", "Improve your listening"),
      path: `${basePath}/mocks/c/listening`,
      illustration: <ListeningIllustration isDark={isDark} />
    },
    {
      id: "reading",
      tag: t("practice.reading.tag", "READING"),
      title: t("practice.reading.title", "O'qish 📖"),
      desc: t("practice.reading.desc", "Read smarter"),
      path: `${basePath}/mocks/c/reading`,
      illustration: <ReadingIllustration isDark={isDark} />
    },
    {
      id: "writing",
      tag: t("practice.writing.tag", "WRITING"),
      title: t("practice.writing.title", "Yozish ✍️"),
      desc: t("practice.writing.desc", "Write confidently"),
      path: `${basePath}/mocks/c/writing`,
      illustration: <WritingIllustration isDark={isDark} />
    },
    {
      id: "speaking",
      tag: t("practice.speaking.tag", "SPEAKING"),
      title: t("practice.speaking.title", "Gapirish 🎙️"),
      desc: t("practice.speaking.desc", "Speak naturally"),
      isBeta: true,
      path: `${basePath}/speaking`,
      illustration: <SpeakingIllustration isDark={isDark} />
    }
  ];

  return (
    <div className="w-full select-none font-sans py-4 sm:py-6 text-left">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      {loading ? (
        // Skeleton Loader
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn("rounded-[32px] border animate-pulse min-h-[320px]", isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100")} />
          ))}
        </div>
      ) : (
        // Grid cards
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {skills.map((skill, index) => {
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <div className={cn(
                  "group relative overflow-hidden rounded-[32px] p-8 border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between min-h-[320px] text-left",
                  isDark 
                    ? "bg-slate-900/40 border-white/5 shadow-slate-950/20" 
                    : "bg-white/80 border-slate-200/60 shadow-slate-200/5 hover:border-slate-350 backdrop-blur-md"
                )}>
                  {/* BETA Badge */}
                  {skill.isBeta && (
                    <span className="absolute right-6 top-6 z-20 rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white shadow-md select-none">
                      BETA
                    </span>
                  )}

                  {/* SVG Illustration wrapper */}
                  <motion.div 
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4.5 + index, ease: "easeInOut" }}
                    whileHover={{ scale: 1.03, rotate: 1, y: -6 }}
                    className="pointer-events-none absolute -right-4 -bottom-4 top-0 w-[62%] opacity-100 select-none"
                  >
                    {skill.illustration}
                  </motion.div>

                  {/* Left Content Column */}
                  <div className="relative z-10 flex min-h-[260px] flex-col justify-between">
                    <div>
                      {/* tag capsule */}
                      <span className={cn(
                        "inline-block rounded-full px-3 py-1 text-xs font-bold leading-none select-none tracking-wider uppercase",
                        isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-green-50 text-green-700"
                      )}>
                        {skill.tag}
                      </span>

                      {/* Heading */}
                      <h2 className={cn(
                        "mt-6 text-4xl font-extrabold leading-tight tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        {skill.title}
                      </h2>

                      {/* Description */}
                      <p className="mt-2 max-w-[55%] text-sm font-medium text-slate-400 dark:text-slate-400 leading-relaxed">
                        {skill.desc}
                      </p>
                    </div>

                    {/* Start practice 3D green button */}
                    <div className="mt-auto pt-6">
                      <button
                        onClick={() => navigate(skill.path)}
                        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-green-400 via-green-500 to-emerald-600 px-7 py-3.5 font-bold text-white shadow-[0_7px_0_0_#166534,0_10px_20px_-5px_rgba(22,101,52,.5)] ring-1 ring-inset ring-white/20 transition-all duration-150 hover:translate-y-1 hover:shadow-[0_3px_0_0_#166534,0_5px_10px_-2px_rgba(22,101,52,.4)] active:translate-y-[6px] active:shadow-[0_1px_0_0_#166534]"
                      >
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/30 to-transparent" />
                        <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                        <span className="relative tracking-wide drop-shadow-[0_1px_0_rgba(0,0,0,.25)]">
                          {t("practice.startBtn", "Start Practice")}
                        </span>
                        <svg
                          className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
