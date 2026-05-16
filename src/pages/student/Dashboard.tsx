import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Calendar as CalendarIcon, Coins, Award } from "lucide-react";
import { toast } from "sonner";
import RoleDashboard, { StatCard } from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";
import { useStudentDashboard } from "@/hooks/useOptimizedQueries";

export default function StudentDashboard() {
  const { data, isLoading } = useStudentDashboard();
  const [prevCoins, setPrevCoins] = useState<number | null>(null);
  const [showExplosion, setShowExplosion] = useState(false);

  useEffect(() => {
    if (data?.coins !== undefined) {
      if (prevCoins !== null && data.coins > prevCoins) {
        setShowExplosion(true);
        toast.success(`Tabriklaymiz! Sizga ${data.coins - prevCoins} ta coin sovg'a qilindi! 🪙✨`, {
          description: "SuperAdmin tomonidan rag'batlantirildingiz.",
          duration: 5000,
        });
        setTimeout(() => setShowExplosion(false), 3000);
      }
      setPrevCoins(data.coins);
    }
  }, [data?.coins]);

  const stats: StatCard[] = [
    { label: "Topshirilgan testlar", value: data?.examsTaken || 0, icon: GraduationCap, color: "primary" },
    { label: "O'rtacha ball", value: data?.averageScore || "—", icon: Award, color: "success" },
    { 
      label: "Coinlar", 
      value: (
        <div className="relative">
          {data?.coins || 0}
          {showExplosion && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, scale: 0 }}
                  animate={{ 
                    opacity: 0, 
                    scale: 1.5,
                    x: Math.cos(i * 45) * 40,
                    y: Math.sin(i * 45) * 40
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute text-yellow-500"
                >
                  🪙
                </motion.span>
              ))}
            </motion.div>
          )}
        </div>
      ), 
      icon: Coins, 
      color: "accent" 
    },
    { label: "Keyingi imtihon", value: data?.nextExam || "—", icon: CalendarIcon, color: "secondary" },
  ];

  return (
    <RoleDashboard
      title="Talaba paneli"
      description="Darslaringiz, jadvalingiz va baholaringiz"
      stats={stats}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <h3 className="font-display font-semibold text-lg mb-3">Bugungi jadval</h3>
          <p className="text-sm text-muted-foreground">
            Darslar va vazifalar moduli tez orada ishga tushiriladi.
          </p>
        </Card>
      </motion.div>
    </RoleDashboard>
  );
}
