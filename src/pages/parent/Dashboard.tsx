import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Coins, Award, Calendar, Heart } from "lucide-react";

interface Child {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
  coins: number;
  avgGrade: number | null;
  attendanceRate: number | null;
}

export default function ParentDashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data: links } = await supabase
        .from("parent_student_links")
        .select("student_id")
        .eq("parent_id", user.id);

      const ids = (links ?? []).map((l: any) => l.student_id);
      if (ids.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, coins")
        .in("id", ids);

      const result: Child[] = [];
      for (const p of profs ?? []) {
        const { data: grades } = await supabase
          .from("grades")
          .select("score, max_score")
          .eq("student_id", p.id);
        const { data: att } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", p.id);

        let avgGrade: number | null = null;
        if (grades && grades.length > 0) {
          const sum = grades.reduce(
            (acc: number, g: any) => acc + (g.score / Math.max(1, g.max_score)) * 100,
            0,
          );
          avgGrade = Math.round(sum / grades.length);
        }
        let attendanceRate: number | null = null;
        if (att && att.length > 0) {
          const present = att.filter((a: any) => a.status === "present").length;
          attendanceRate = Math.round((present / att.length) * 100);
        }
        result.push({
          id: p.id,
          full_name: p.full_name,
          username: p.username,
          avatar_url: p.avatar_url,
          coins: p.coins ?? 0,
          avgGrade,
          attendanceRate,
        });
      }
      setChildren(result);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center shadow-glow">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {t("common.hello")}, {profile?.full_name || profile?.username}
            </h1>
            <p className="text-sm text-muted-foreground">{t("parent.title")}</p>
          </div>
        </div>
      </motion.div>

      {children.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold mb-1">{t("parent.noChildren")}</p>
          <p className="text-sm text-muted-foreground">{t("parent.askAdmin")}</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5 hover:shadow-glow transition-smooth border-2 hover:border-primary/40">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                    {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
                      {(c.full_name || c.username).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.full_name || c.username}</p>
                    <p className="text-xs text-muted-foreground">@{c.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat icon={Coins} label={t("parent.totalCoins")} value={c.coins} accent="text-yellow-500" />
                  <Stat
                    icon={Award}
                    label={t("parent.averageGrade")}
                    value={c.avgGrade !== null ? `${c.avgGrade}%` : "—"}
                    accent="text-primary"
                  />
                  <Stat
                    icon={Calendar}
                    label={t("parent.attendanceRate")}
                    value={c.attendanceRate !== null ? `${c.attendanceRate}%` : "—"}
                    accent="text-emerald-500"
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${accent}`} />
      <p className={`font-bold text-sm ${accent}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground line-clamp-1">{label}</p>
    </div>
  );
}
