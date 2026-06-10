import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileText, Crown, User, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";

interface LeaderboardAndHistoryProps {
  data: StudentIeltsDashboardDto;
}

export default function LeaderboardAndHistory({ data }: LeaderboardAndHistoryProps) {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      
      {/* Leaderboard */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="h-full">
        <Card className="p-5 rounded-3xl shadow-sm border-slate-100 h-full flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-slate-900">Peshqadamlar</h3>
            <button className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 hover:underline">
              Barchasini ko'rish <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {data.leaderboard.map((user) => (
              <div 
                key={user.rank} 
                className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${user.isCurrentUser ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50'}`}
              >
                <div className="w-5 text-center shrink-0">
                  <span className={`text-xs font-bold ${user.rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {user.rank}
                  </span>
                </div>
                
                <Avatar className="h-8 w-8 border border-slate-200">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                  <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600 font-semibold">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${user.isCurrentUser ? 'font-bold text-emerald-700' : 'font-medium text-slate-700'}`}>
                    {user.name}
                  </p>
                </div>
                
                <div className="shrink-0 text-right">
                  <p className={`text-xs font-bold ${user.isCurrentUser ? 'text-emerald-600' : 'text-slate-600'}`}>
                    Band {user.bandScore.toFixed(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Recent Tests */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="h-full">
        <Card className="p-5 rounded-3xl shadow-sm border-slate-100 h-full flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-slate-900">So'nggi testlar</h3>
            <button className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 hover:underline">
              Barchasini ko'rish <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {data.recentTests.map((test) => (
              <div key={test.id} className="flex items-center gap-3 p-1">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate mb-0.5">{test.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{test.subtitle}</p>
                </div>
                
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-sm font-bold text-slate-900">{test.score.toFixed(1)}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{test.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Account Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="h-full">
        <Card className="p-5 rounded-3xl shadow-sm border-slate-100 h-full flex flex-col bg-slate-50 relative overflow-hidden">
          <h3 className="font-bold text-slate-900 mb-4 relative z-10">Hisobingiz</h3>

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Crown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Premium</p>
              <p className="text-[10px] text-slate-500">A'zolik turi</p>
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="text-2xl font-bold text-slate-900">{data.takenTestsCount}</p>
              <p className="text-[10px] text-slate-500">Topshirilgan testlar</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{data.overallProgress}%</p>
              <p className="text-[10px] text-slate-500">Umumiy progress</p>
            </div>
          </div>

          <div className="w-full h-1.5 bg-slate-200 rounded-full mb-6 relative z-10 overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${data.overallProgress}%` }} />
          </div>

          <button className="w-full py-2.5 rounded-full border border-purple-200 bg-white text-purple-600 text-xs font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5 mt-auto relative z-10">
            Tarifni yangilash <ArrowUpRight className="h-3 w-3" />
          </button>

          {/* Decorative crown graphic placeholder */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-50 z-0" />
        </Card>
      </motion.div>

    </div>
  );
}
