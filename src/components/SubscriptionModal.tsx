import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2, Zap, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const features = [
    "Cheksiz talabalar va o'qituvchilar",
    "Real-time tahliliy ma'lumotlar",
    "Telegram Bot integratsiyasi",
    "24/7 VIP Qo'llab-quvvatlash",
    "Mobil ilova (iOS & Android)",
    "Avtomatlashtirilgan hisob-faktura",
    "Custom Domain (Sizning brendingiz)",
    "Video darslar uchun cheksiz xotira",
    "Imtihonlar va Testlar konstruktori",
    "AI yordamida natijalarni bashorat qilish"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0 overflow-hidden border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl flex flex-col">
        <DialogHeader className="p-8 pb-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/10 shadow-sm">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Paket Boshqaruvi
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Sizning joriy obuna rejangiz va imkoniyatlar ro'yxati.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 thin-scrollbar">
          <div className="p-6 rounded-xl bg-gradient-to-br from-primary to-purple-700 text-white relative overflow-hidden group shadow-md shadow-primary/10">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Zap className="h-16 w-16" />
            </div>
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Joriy Reja</p>
              <h4 className="text-2xl font-bold tracking-tight">PREMIUM PRO</h4>
              <div className="flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                <CheckCircle2 className="h-3 w-3" /> Faol (31 kun qoldi)
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Imkoniyatlar ro'yxati</h5>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">10 / 10</span>
                <div className="h-1 w-16 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full" />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {features.map((f, i) => (
                <motion.div 
                  key={f}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{f}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
          <Button onClick={onClose} className="w-full h-12 rounded-lg bg-primary text-white font-bold uppercase text-[10px] tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20">
            YOPISH
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
