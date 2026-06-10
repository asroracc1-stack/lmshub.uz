import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";

interface WeeklyChartProps {
  data: StudentIeltsDashboardDto;
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="p-5 rounded-3xl shadow-sm border-slate-100 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-900">Haftalik natija</h3>
          <Select defaultValue="7">
            <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50 border-slate-200 rounded-full">
              <SelectValue placeholder="Davrni tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">So'nggi 7 kun</SelectItem>
              <SelectItem value="30">So'nggi 30 kun</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weeklyResults} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#64748b" }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#64748b" }} 
                domain={[0, 9]}
                ticks={[0, 2.5, 5, 7.5, 9]}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px' }}
                labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
              />
              <Line type="monotone" name="Reading" dataKey="reading" stroke="#10b981" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="Listening" dataKey="listening" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="Writing" dataKey="writing" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              <Line type="monotone" name="Speaking" dataKey="speaking" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 mt-2 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Eng yaxshi kun</p>
            <p className="text-sm font-bold text-emerald-500">Juma</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">O'rtacha natija</p>
            <p className="text-sm font-bold text-slate-900">72%</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Jami test</p>
            <p className="text-sm font-bold text-slate-900">12 ta</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
