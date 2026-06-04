import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, BookOpen, Users, ArrowRight } from "lucide-react";

const CARDS = [
  {
    to: "topics",
    label: "Speaking Topics",
    desc: "Mavzular bo'yicha savollarni o'rganib, speaking ko'nikmangizni oshiring",
    badge: "Mavzular",
    icon: BookOpen,
    grad: "from-violet-500/15 via-indigo-500/10 to-purple-500/15",
    btn: "Mavzularni ko'rish",
    btnClass: "bg-gradient-to-r from-violet-500 to-indigo-500 text-white",
    isNew: true,
  },
  {
    to: "partners",
    label: "1:1 Conversation",
    desc: "Real foydalanuvchilar bilan juftlashib, jonli speaking mashq qiling",
    badge: "Jonli suhbat",
    icon: Mic,
    grad: "from-emerald-500/15 via-teal-500/10 to-cyan-500/15",
    btn: "Suhbatni boshlash",
    btnClass: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
    isNew: false,
  },
];

export default function SpeakingHub({ basePath = "/user" }: { basePath?: string }) {
  return (
    <div className="space-y-8">
      <div>
        <Badge variant="outline" className="mb-2 px-3 py-1">Speaking</Badge>
        <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
          Speaking Practice
        </h1>
        <p className="text-muted-foreground mt-1">Mavzularni tanlang, AI bilan mashq qiling yoki real partner bilan gaplashing</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Link to={`${basePath}/speaking/${c.to}`} className="block">
                <Card className={`relative overflow-hidden p-6 h-full bg-gradient-to-br ${c.grad} border-border/50 hover:shadow-elegant hover:-translate-y-0.5 transition-smooth`}>
                  <div className="flex items-start justify-between">
                    <Badge variant="secondary" className="bg-background/70">{c.badge}</Badge>
                    {c.isNew && <Badge className="bg-emerald-500 text-white">NEW</Badge>}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-background/70 backdrop-blur"><Icon className="h-6 w-6 text-primary" /></div>
                    <h3 className="text-xl md:text-2xl font-display font-bold">{c.label}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{c.desc}</p>
                  <div className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold ${c.btnClass}`}>
                    {c.btn} <ArrowRight className="h-4 w-4" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

