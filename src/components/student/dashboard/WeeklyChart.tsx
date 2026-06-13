import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";

interface WeeklyChartProps {
  data: StudentIeltsDashboardDto;
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const { t } = useTranslation();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="p-5 rounded-3xl border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-900 dark:text-white">{t("dynamic.weeklychart.haftalik_natija")}</h3>
          <Select defaultValue="7">
            <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50 dark:bg-[#240046]/40 border-slate-200 dark:border-primary/20 rounded-full text-slate-700 dark:text-slate-300">
              <SelectValue placeholder="Davrni tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t("dynamic.weeklychart.so_nggi_7_kun")}</SelectItem>
              <SelectItem value="30">{t("dynamic.weeklychart.so_nggi_30_kun")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weeklyResults} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d1b4e" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                domain={[0, 9]}
                ticks={[0, 2.5, 5, 7.5, 9]}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #3d2060', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)', backgroundColor: '#1B1230', color: '#fff' }}
                itemStyle={{ fontSize: '12px', color: '#c4b5fd' }}
                labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#e2d9f3', marginBottom: '4px' }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
              />
              <Line type="monotone" name="Reading" dataKey="reading" stroke="#9F86C0" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="Listening" dataKey="listening" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="Writing" dataKey="writing" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="Speaking" dataKey="speaking" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 mt-2 border-t border-primary/10 dark:border-primary/10">
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{t("dynamic.weeklychart.eng_yaxshi_kun")}</p>
            <p className="text-sm font-bold text-purple-500 dark:text-primary">{t("dynamic.weeklychart.juma")}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{t("dynamic.weeklychart.o_rtacha_natija")}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{t("dynamic.weeklychart.72")}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{t("dynamic.weeklychart.jami_test")}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{t("dynamic.weeklychart.12_ta")}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
