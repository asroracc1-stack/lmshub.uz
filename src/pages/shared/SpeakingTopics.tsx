import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, TrendingUp } from "lucide-react";
import { TOPICS } from "./speakingTopicsData";

const DIFF_LABEL = { easy: "Oson", medium: "O'rta", hard: "Qiyin" } as const;
const DIFF_COLOR = {
  easy: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
  medium: "text-amber-700 bg-amber-100 dark:bg-amber-900/30",
  hard: "text-rose-600 bg-rose-100 dark:bg-rose-900/30",
};

export default function SpeakingTopics({ basePath = "/user" }: { basePath?: string }) {
  const nav = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => nav(`${basePath}/speaking`)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Orqaga
        </button>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Speaking Mavzulari</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOPICS.map((t, i) => (
          <motion.div key={t.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link to={`${basePath}/speaking/topics/${t.slug}`}>
              <Card className={`relative p-5 border-b-4 ${t.color} hover:shadow-elegant hover:-translate-y-0.5 transition-smooth h-full flex flex-col gap-3`}>
                <div className={`w-14 h-14 rounded-xl ${t.bg} grid place-items-center text-3xl`}>{t.emoji}</div>
                <h3 className="font-display font-bold text-lg leading-tight">{t.title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">FREE</Badge>
                  <Badge variant="outline" className={`gap-1 ${DIFF_COLOR[t.difficulty]} border-transparent`}>
                    <TrendingUp className="h-3 w-3" /> {DIFF_LABEL[t.difficulty]}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <BookOpen className="h-3 w-3" /> {t.part1.length + 1 + t.part3.length} questions
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.category}</p>
                <div className="text-xs text-muted-foreground mt-auto">
                  <div className="flex justify-between mb-1"><span>Progress</span><span>— / {t.part1.length + 1 + t.part3.length}</span></div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full w-0 bg-primary" /></div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

