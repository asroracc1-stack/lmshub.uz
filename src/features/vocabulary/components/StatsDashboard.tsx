import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { DashboardStats } from '../types/vocabulary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Brain, Clock, Zap, Target } from 'lucide-react';

interface StatsDashboardProps {
  stats: DashboardStats | null;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800/50 rounded-3xl" />
        ))}
      </div>
    );
  }

  // Summary widgets data
  const summaries = [
    {
      title: 'Soʻzlar oʻrganildi',
      value: stats.wordsLearned,
      icon: Brain,
      color: 'text-emerald-500 bg-emerald-500/10'
    },
    {
      title: 'Oʻrtacha talaffuz',
      value: `${Math.round(stats.speakingAccuracy)}%`,
      icon: Target,
      color: 'text-amber-500 bg-amber-500/10'
    },
    {
      title: 'Oʻrtacha yozuv',
      value: `${Math.round(stats.writingAccuracy)}%`,
      icon: Award,
      color: 'text-blue-500 bg-blue-500/10'
    },
    {
      title: 'Mashq vaqti',
      value: `${Math.round(stats.minutesStudied)}m`,
      icon: Clock,
      color: 'text-purple-500 bg-purple-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 4-Column Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map((s, idx) => (
          <Card key={idx} className="bg-white/40 dark:bg-[#160e2a]/40 border-slate-100 dark:border-white/5 shadow-md rounded-3xl backdrop-blur-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 leading-none mb-1.5">{s.title}</p>
                <h4 className="text-xl font-black text-slate-800 dark:text-white leading-none">{s.value}</h4>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Acquiring rate (Weekly Speed Bar Chart) */}
        <Card className="bg-white/40 dark:bg-[#160e2a]/40 border-slate-100 dark:border-white/5 shadow-md rounded-3xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-black tracking-tight text-slate-850 dark:text-slate-200">
              Oʻrganish tezligi (soʻz/kun)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.learningSpeedChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    color: '#fff'
                  }} 
                />
                <Bar dataKey="words" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Retention Decay Area Chart */}
        <Card className="bg-white/40 dark:bg-[#160e2a]/40 border-slate-100 dark:border-white/5 shadow-md rounded-3xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-black tracking-tight text-slate-850 dark:text-slate-200">
              Miya eslab qolish darajasi (Retention Rate %)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.retentionRateChart}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    color: '#fff'
                  }}
                />
                <Area type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
