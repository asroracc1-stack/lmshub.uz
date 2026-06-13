import { Card } from "@/components/ui/card";
import { Heart, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const DONATION_DATA = {
  cardNumber: "9860 1701 0590 7738",
  cardOwner: "Ahror Fayzullayev"
};

export default function DonationCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useTranslation();

  const copy = () => {
    navigator.clipboard.writeText(DONATION_DATA.cardNumber.replace(/\s/g, ""));
    toast.success(t("userDashboard.donation.toastSuccess"));
  };

  return (
    <Card className={cn(
      "p-5 md:p-8 relative overflow-hidden border rounded-[2rem] shadow-2xl transition-all duration-500",
      isDark 
        ? "bg-slate-900/40 backdrop-blur-md border-white/5" 
        : "bg-white border-slate-100 shadow-slate-200/50"
    )}>
      <div className={cn(
        "absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl",
        isDark ? "bg-purple-500/5" : "bg-purple-500/10"
      )} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center border",
            isDark ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-100"
          )}>
            <Heart className={cn("h-5 w-5", isDark ? "text-purple-400 fill-purple-400/10" : "text-purple-600 fill-purple-600/10")} />
          </div>
          <h3 className={cn("font-display font-black text-lg md:text-xl tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {t("userDashboard.donation.title")}
          </h3>
        </div>
        <p className={cn("text-xs md:text-sm mb-8 font-medium max-w-xl", isDark ? "text-slate-400" : "text-slate-500")}>
          {t("userDashboard.donation.desc")}
        </p>
        
        <div className="grid sm:grid-cols-2 gap-6">
          <div 
            className={cn(
              "rounded-2xl border p-5 group/card cursor-pointer transition-all duration-300",
              isDark 
                ? "bg-slate-950/50 border-white/5 hover:border-white/10 hover:bg-slate-950/80" 
                : "bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-lg hover:shadow-slate-200/40"
            )} 
            onClick={copy}
          >
            <p className={cn("text-[10px] uppercase tracking-[0.2em] font-black mb-3", isDark ? "text-slate-500" : "text-slate-400")}>
              {t("userDashboard.donation.cardNumber")}
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className={cn("font-mono text-lg md:text-xl font-bold tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                {DONATION_DATA.cardNumber}
              </p>
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                isDark ? "bg-white/5 group-hover/card:bg-white/10" : "bg-white group-hover/card:bg-slate-100 shadow-sm"
              )}>
                <Copy className={cn("h-4 w-4", isDark ? "text-slate-500 group-hover/card:text-purple-400" : "text-slate-400 group-hover/card:text-purple-600")} />
              </div>
            </div>
          </div>
          
          <div className={cn(
            "rounded-2xl border p-5 transition-all duration-300",
            isDark ? "bg-slate-950/50 border-white/5" : "bg-slate-50/50 border-slate-100"
          )}>
            <p className={cn("text-[10px] uppercase tracking-[0.2em] font-black mb-3", isDark ? "text-slate-500" : "text-slate-400")}>
              {t("userDashboard.donation.cardOwner")}
            </p>
            <p className={cn("text-lg md:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {DONATION_DATA.cardOwner}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
