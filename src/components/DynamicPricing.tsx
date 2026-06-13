import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import SpotlightCard from "@/components/SpotlightCard";
import Magnet from "@/components/Magnet";

interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  priceSuffix: string | null;
  features: string[];
  ctaLabel: string;
  ctaLink: string;
  isPopular: boolean;
  sortOrder: number;
}

function formatPrice(value: number, currency: string) {
  if (value <= 0) return "Custom";
  return new Intl.NumberFormat("uz-UZ").format(value);
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function DynamicPricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/admin/pricing-plans");
        setPlans(
          ((res.data || []) as any[]).map((p) => ({
            ...p,
            features: Array.isArray(p.features) ? p.features : [],
          })),
        );
      } catch (err) {
        console.error("Pricing plans error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section id="pricing" className="container py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="font-display text-3xl md:text-5xl font-bold">
          Sizga mos <span className="neon-text">reja</span>
        </h2>
        <p className="mt-3 text-muted-foreground">Bepul boshlang. Istalgan vaqtda yangilang.</p>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <div className="relative inline-flex items-center rounded-full border border-border/60 bg-card/60 backdrop-blur p-1">
          {(["monthly", "yearly"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setBilling(opt)}
              className={`relative z-10 px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                billing === opt ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt === "monthly" ? "Oylik" : "Yillik"}
              {opt === "yearly" && (
                <span className="ml-2 inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                  -17%
                </span>
              )}
              {billing === opt && (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-gradient-primary shadow-glow"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl glass border border-border/40 h-[420px] animate-pulse" />
            ))
          : plans.map((p, i) => {
              const price = billing === "monthly" ? p.priceMonthly : p.priceYearly;
              const periodSuffix = price > 0 ? `${p.priceSuffix || p.currency}/${billing === "monthly" ? "oy" : "yil"}` : "";
              const Card = (
                <div className="rounded-2xl glass p-6 h-full flex flex-col relative">
                  {p.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary text-primary-foreground text-[11px] font-medium px-3 py-1 shadow-glow whitespace-nowrap">
                      Tavsiya
                    </span>
                  )}
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                  <div className="mt-5 flex items-baseline gap-1.5 min-h-[3.5rem]">
                    <span className="font-display text-4xl font-bold">{formatPrice(price, p.currency)}</span>
                    {periodSuffix && <span className="text-xs text-muted-foreground">{periodSuffix}</span>}
                  </div>
                  <ul className="mt-5 space-y-2 text-sm flex-1">
                    {p.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Magnet padding={70} magnetStrength={4} wrapperClassName="mt-6 block w-full" innerClassName="w-full">
                    <Button asChild variant={p.isPopular ? "hero" : "glass"} className="w-full">
                      <Link to={p.ctaLink || "/auth"}>{p.ctaLabel}</Link>
                    </Button>
                  </Magnet>
                </div>
              );

              return (
                <motion.div
                  key={p.id}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className={`relative rounded-2xl p-[1.5px] ${
                    p.isPopular
                      ? "bg-gradient-to-br from-primary via-secondary to-accent shadow-elegant"
                      : "bg-gradient-to-br from-border/60 to-border/20"
                  }`}
                >
                  {p.isPopular ? (
                    <SpotlightCard className="rounded-2xl" spotlightColor="hsl(var(--primary) / 0.35)">
                      {Card}
                    </SpotlightCard>
                  ) : (
                    Card
                  )}
                </motion.div>
              );
            })}
      </div>
    </section>
  );
}
