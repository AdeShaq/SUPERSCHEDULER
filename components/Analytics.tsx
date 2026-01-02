import React, { useMemo } from 'react';
import { Task } from '../types';
import { StorageService } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalyticsProps {
  tasks: Task[];
}

const Analytics: React.FC<AnalyticsProps> = ({ tasks }) => {
  // const tasks = StorageService.getTasks(); // Handled by parent

  const consistencyData = useMemo(() => {
    // Generate data for the last 7 days
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      let totalCompleted = 0;
      tasks.forEach(t => {
        if (t.completedDates.includes(dateStr)) totalCompleted++;
      });

      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'narrow' }), // M, T, W
        completed: totalCompleted,
      });
    }
    return days;
  }, [tasks]);

  const totalCompletions = tasks.reduce((acc, t) => acc + t.completedDates.length, 0);
  // Calculate a "Global Streak"
  const calculateGlobalStreak = () => {
    let streak = 0;
    const today = new Date();
    let d = new Date(today);
    const dateStrToday = d.toISOString().split('T')[0];
    const anyDoneToday = tasks.some(t => t.completedDates.includes(dateStrToday));

    if (!anyDoneToday) {
      d.setDate(d.getDate() - 1);
      const dateStrYest = d.toISOString().split('T')[0];
      const anyDoneYest = tasks.some(t => t.completedDates.includes(dateStrYest));
      if (!anyDoneYest) return 0;
    }

    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      const anyDone = tasks.some(t => t.completedDates.includes(dateStr));
      if (anyDone) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const globalStreak = useMemo(calculateGlobalStreak, [tasks]);
  const activeTasks = tasks.length;

  const heatmapGrid = useMemo(() => {
    const grid = [];
    const today = new Date();
    for (let i = 84; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = tasks.reduce((acc, t) => t.completedDates.includes(dateStr) ? acc + 1 : acc, 0);
      grid.push({ date: dateStr, count });
    }
    return grid;
  }, [tasks]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-white/5';
    if (count === 1) return 'bg-accent/30';
    if (count === 2) return 'bg-accent/60';
    if (count > 2) return 'bg-accent shadow-[0_0_10px_#10b981]';
    return 'bg-white/5';
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full overflow-y-auto no-scrollbar">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white uppercase mb-8 drop-shadow-lg">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 glass-panel bg-accent/5 border border-accent/20 rounded-2xl">
          <p className="text-[10px] font-mono uppercase text-accent mb-2 tracking-widest">Total Actions</p>
          <p className="text-5xl font-bold tracking-tighter text-white drop-shadow-md">{totalCompletions}</p>
        </div>
        <div className="p-6 glass-panel rounded-2xl">
          <p className="text-[10px] font-mono uppercase text-gray-400 mb-2 tracking-widest">Global Streak</p>
          <p className="text-5xl font-bold tracking-tighter text-white">{globalStreak}<span className="text-lg text-gray-500 font-normal ml-1">days</span></p>
        </div>
        <div className="p-6 glass-panel rounded-2xl">
          <p className="text-[10px] font-mono uppercase text-gray-400 mb-2 tracking-widest">Active Protocols</p>
          <p className="text-5xl font-bold tracking-tighter text-white">{activeTasks}</p>
        </div>
      </div>

      <div className="mb-8 p-6 glass-panel rounded-2xl">
        <h3 className="text-xs font-bold uppercase mb-6 tracking-widest text-accent border-b border-white/10 pb-2">7-Day Velocity</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consistencyData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#888' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: 'rgba(0,0,0,0.8)', color: '#fff', border: '1px solid #333', borderRadius: 8, backdropFilter: 'blur(4px)' }}
              />
              <Bar dataKey="completed" barSize={32} radius={[4, 4, 0, 0]}>
                {consistencyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.completed > 0 ? '#10b981' : 'rgba(255,255,255,0.1)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-6 glass-panel rounded-2xl mb-20">
        <h3 className="text-xs font-bold uppercase mb-6 tracking-widest text-accent border-b border-white/10 pb-2">Persistence Map (90 Days)</h3>
        <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
          {heatmapGrid.map((day, i) => (
            <div
              key={i}
              className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${getHeatmapColor(day.count)} transition-all hover:scale-125`}
              title={`${day.date}: ${day.count} actions`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;