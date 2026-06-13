import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Headphones, PenLine, Mic, Loader2, Plus, ArrowRight, Sparkles,
  Target, Landmark,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

type Kind = "listening" | "reading" | "writing" | "speaking" | "sat" | "national_cert";

const KIND_META: Record<Kind, { icon: any; emoji: string; gradient: string; group: "IELTS" | "SAT" | "Milliy" }> = {
  listening: { icon: Headphones, emoji: "🎧", gradient: "from-purple-500/15 via-violet-500/10 to-fuchsia-500/15", group: "IELTS" },
  reading:   { icon: BookOpen,   emoji: "📖", gradient: "from-blue-500/15 via-sky-500/10 to-indigo-500/15", group: "IELTS" },
  writing:   { icon: PenLine,    emoji: "✍️", gradient: "from-orange-500/15 via-amber-500/10 to-yellow-500/15", group: "IELTS" },
  speaking:  { icon: Mic,        emoji: "🗣️", gradient: "from-fuchsia-500/15 via-pink-500/10 to-rose-500/15", group: "IELTS" },
  sat:       { icon: Target,     emoji: "🎯", gradient: "from-violet-500/15 via-purple-500/10 to-indigo-500/15", group: "SAT" },
  national_cert: { icon: Landmark, emoji: "🏛️", gradient: "from-amber-500/15 via-yellow-500/10 to-orange-500/15", group: "Milliy" },
};

const GROUPS: { key: "IELTS" | "SAT" | "Milliy"; titleKey: string; subKey: string; kinds: Kind[] }[] = [
  { key: "IELTS", titleKey: "mocks.groups.ieltsTitle", subKey: "mocks.groups.ieltsSub", kinds: ["listening", "reading", "writing", "speaking"] },
  { key: "SAT",   titleKey: "mocks.groups.satTitle",   subKey: "mocks.groups.satSub",   kinds: ["sat"] },
  { key: "Milliy", titleKey: "mocks.groups.milliyTitle", subKey: "mocks.groups.milliySub", kinds: ["national_cert"] },
];

export default function MockTests({ basePath = "/user" }: { basePath?: string }) {
  const { role } = useAuth();
  const nav = useNavigate();
  const { t } = useTranslation();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = role === "super_admin" || role === "payment_manager";

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("mock_tests")
        .select("kind")
        .eq("is_published", true);
      setTests(data ?? []);
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    tests.forEach((t) => { c[t.kind] = (c[t.kind] ?? 0) + 1; });
    return c;
  }, [tests]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <Badge variant="outline" className="mb-2 px-3 py-1"><Sparkles className="h-3 w-3 mr-1" /> {t("mocks.badge")}</Badge>
          <h1 className="text-3xl md:text-4xl font-display font-bold">{t("mocks.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("mocks.subtitle")}</p>
        </div>
        {canManage && (
          <Button asChild size="lg"><Link to={`${basePath}/mocks/new`}><Plus className="h-4 w-4 mr-2" />{t("mocks.newTest")}</Link></Button>
        )}
      </div>

      {GROUPS.map((group) => (
        <section key={group.key} className="space-y-4">
          <div>
            <h2 className="text-xl md:text-2xl font-display font-bold">{t(group.titleKey)}</h2>
            <p className="text-sm text-muted-foreground">{t(group.subKey)}</p>
          </div>
          <div className={`grid gap-5 ${group.kinds.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {group.kinds.map((k, i) => {
              const meta = KIND_META[k];
              const Icon = meta.icon;
              const count = counts[k] ?? 0;
              return (
                <motion.button
                  key={k}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => nav(`${basePath}/mocks/c/${k}`)}
                  className={`group text-left rounded-2xl p-6 md:p-7 bg-gradient-to-br ${meta.gradient} border border-border/50 hover:shadow-elegant hover:-translate-y-0.5 transition-smooth`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="bg-background/70 backdrop-blur text-xs">
                        {count} {t("mocks.tests")}
                      </Badge>
                      <h3 className="mt-3 text-2xl md:text-3xl font-display font-bold text-primary flex items-center gap-2">
                        {t(`mocks.kind.${k}`)} <span className="text-2xl">{meta.emoji}</span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{t(`mocks.tagline.${k}`)}</p>
                      <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold group-hover:gap-3 transition-all">
                        {t("mocks.start")} <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-background/60 backdrop-blur shrink-0">
                      <Icon className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

