import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Mic,
  Headphones,
  BookOpen,
  PenLine,
  Trophy,
  Users,
  Wallet,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Coins,
  CheckCircle2,
  Activity,
} from "lucide-react";

/**
 * HeroPreview — premium floating CRM/IELTS/AI Speaking/Pack/Analytics
 * preview composition. No stock images. Pure UI built from design tokens.
 */
export default function HeroPreview() {
  const { t } = useTranslation();
  return (
    <div className="relative h-[520px] sm:h-[560px] lg:h-[620px] w-full [perspective:1600px]">
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-secondary/25 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      </div>

      {/* MAIN — IELTS Mock Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateY: -8 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[88%] max-w-[460px] [transform-style:preserve-3d]"
        style={{ transform: "translate(-50%, -50%) rotateX(6deg) rotateY(-8deg)" }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-3xl p-[1.5px] bg-gradient-to-br from-primary/70 via-secondary/50 to-accent/70 shadow-elegant"
        >
          <div className="rounded-3xl glass p-5 backdrop-blur-2xl">
            {/* Window chrome */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-display font-semibold leading-tight">IELTS Mock — Sevara A.</p>
                  <p className="text-[10px] text-muted-foreground">{t("dynamic.heropreview.cambridge_18__test_3")}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              </div>
            </div>

            {/* Big band score */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15 border border-border/50 p-4 mb-3 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("dynamic.heropreview.overall_band")}</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="font-display text-5xl font-bold neon-text leading-none">{t("dynamic.heropreview.75")}</span>
                <span className="text-[11px] text-purple-400 mb-1.5 inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +0.5
                </span>
              </div>
            </div>

            {/* 4 modules */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Headphones, label: "Listening", v: 8.0, c: "primary" },
                { icon: BookOpen, label: "Reading", v: 7.5, c: "secondary" },
                { icon: PenLine, label: "Writing", v: 7.0, c: "accent" },
                { icon: Mic, label: t("dynamic.speakingpartners.speaking"), v: 7.5, c: "purple" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl bg-muted/30 border border-border/40 p-2.5 hover:border-primary/40 transition-smooth"
                >
                  <m.icon
                    className={`h-3.5 w-3.5 mb-1 ${
                      m.c === "primary"
                        ? "text-primary"
                        : m.c === "secondary"
                          ? "text-secondary"
                          : m.c === "accent"
                            ? "text-accent"
                            : "text-purple-400"
                    }`}
                  />
                  <p className="text-[9px] text-muted-foreground truncate">{m.label}</p>
                  <p className="font-display text-sm font-bold">{m.v.toFixed(1)}</p>
                </div>
              ))}
            </div>

            {/* Tiny chart */}
            <div className="mt-3 rounded-xl bg-muted/20 border border-border/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground">{t("dynamic.heropreview.progress__30_kun")}</p>
                <span className="text-[10px] text-purple-400 inline-flex items-center gap-0.5">
                  <Activity className="h-2.5 w-2.5" /> +18%
                </span>
              </div>
              <svg viewBox="0 0 200 50" className="w-full h-12" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hpg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,38 L20,32 L40,34 L60,22 L80,26 L100,16 L120,20 L140,10 L160,14 L180,6 L200,10 L200,50 L0,50 Z"
                  fill="url(#hpg)"
                />
                <path
                  d="M0,38 L20,32 L40,34 L60,22 L80,26 L100,16 L120,20 L140,10 L160,14 L180,6 L200,10"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* TOP-LEFT — AI Speaking */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute top-2 left-0 sm:-left-4 z-20"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[210px] rounded-2xl p-[1px] bg-gradient-to-br from-purple-500/60 via-primary/40 to-secondary/60 shadow-glow"
        >
          <div className="rounded-2xl glass p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-purple-500/20 grid place-items-center">
                  <Mic className="h-4 w-4 text-purple-400" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-purple-500 ring-2 ring-background animate-glow-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate">{t("dynamic.heropreview.ai_speaking__live")}</p>
                <p className="text-[9px] text-muted-foreground">{t("dynamic.heropreview.part_2__cue_card")}</p>
              </div>
            </div>
            <div className="flex items-end gap-[3px] h-8 mb-2">
              {[0.5, 0.8, 0.4, 0.9, 0.6, 0.85, 0.5, 0.75, 0.6, 0.9, 0.4, 0.7, 0.55, 0.85].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [`${h * 80}%`, `${(1 - h) * 60 + 25}%`, `${h * 80}%`] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.06 }}
                  className="w-[3px] rounded-full bg-gradient-to-t from-purple-500 to-primary"
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-muted-foreground">{t("dynamic.heropreview.fluency")}</span>
              <span className="font-semibold text-purple-400">{t("dynamic.heropreview.band_75")}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* TOP-RIGHT — Premium Packs */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.45 }}
        className="absolute top-6 right-0 sm:-right-4 z-20"
      >
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          className="w-[220px] rounded-2xl p-[1px] bg-gradient-to-br from-secondary/60 via-accent/40 to-primary/60 shadow-glow-violet"
        >
          <div className="rounded-2xl glass p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                <p className="text-[11px] font-semibold">{t("dynamic.heropreview.premium_packs")}</p>
              </div>
              <span className="text-[9px] rounded-full bg-secondary/20 text-secondary px-1.5 py-0.5">{t("dynamic.heropreview.3_active")}</span>
            </div>
            {[
              { name: "IELTS Premium", price: "499K", c: "from-primary to-secondary" },
              { name: "SAT Pack", price: "799K", c: "from-secondary to-accent" },
              { name: "National Cert.", price: "299K", c: "from-purple-500 to-primary" },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${p.c}`} />
                  <span className="text-[10px]">{p.name}</span>
                </div>
                <span className="text-[10px] font-semibold text-foreground">{p.price}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* BOTTOM-LEFT — Analytics */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55 }}
        className="absolute bottom-4 left-0 sm:-left-2 z-20"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="w-[200px] rounded-2xl p-[1px] bg-gradient-to-br from-primary/60 to-accent/40 shadow-glow"
        >
          <div className="rounded-2xl glass p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <p className="text-[11px] font-semibold">{t("dynamic.heropreview.active_students")}</p>
              </div>
              <TrendingUp className="h-3 w-3 text-purple-400" />
            </div>
            <p className="font-display text-2xl font-bold neon-text leading-none">{t("dynamic.heropreview.2847")}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{t("dynamic.heropreview.124_bu_hafta")}</p>
            <div className="mt-2 flex items-end gap-1 h-8">
              {[0.4, 0.6, 0.5, 0.75, 0.65, 0.85, 0.95].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h * 100}%` }}
                  className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* BOTTOM-RIGHT — Coins / Ranking */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.65 }}
        className="absolute bottom-8 right-0 sm:-right-2 z-20"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          className="w-[210px] rounded-2xl p-[1px] bg-gradient-to-br from-amber-400/60 via-accent/40 to-secondary/60 shadow-glow-violet"
        >
          <div className="rounded-2xl glass p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-amber-400/20 grid place-items-center">
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold leading-tight">{t("dynamic.achievements.leaderboard")}</p>
                <p className="text-[9px] text-muted-foreground">{t("dynamic.heropreview.haftalik_top")}</p>
              </div>
            </div>
            {[
              { n: "Sevara A.", c: 2480, r: 1, m: "🥇" },
              { n: "Jasur N.", c: 2210, r: 2, m: "🥈" },
              { n: "Madina H.", c: 1980, r: 3, m: "🥉" },
            ].map((u) => (
              <div key={u.n} className="flex items-center justify-between py-1">
                <span className="text-[10px] flex items-center gap-1.5">
                  <span>{u.m}</span> {u.n}
                </span>
                <span className="text-[10px] inline-flex items-center gap-0.5 text-amber-400 font-semibold">
                  <Coins className="h-2.5 w-2.5" /> {u.c}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Floating attendance pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute top-1/2 -right-2 sm:right-4 z-30"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-full glass border border-purple-500/40 px-3 py-1.5 flex items-center gap-1.5 shadow-glow"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-[10px] font-semibold">{t("dynamic.heropreview.attendance__96")}</span>
        </motion.div>
      </motion.div>

      {/* Floating revenue pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="absolute top-[42%] -left-2 sm:left-2 z-30"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="rounded-full glass border border-primary/40 px-3 py-1.5 flex items-center gap-1.5 shadow-glow"
        >
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold">{t("dynamic.heropreview.482k_mrr")}</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
