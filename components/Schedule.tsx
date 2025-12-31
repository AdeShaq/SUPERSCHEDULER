import React, { useState, useEffect } from 'react';
import { Plus, X, Check, Zap, Clock, Trash2, Bell } from 'lucide-react';
import { Task, RecurrenceConfig, ScheduleGroup } from '../types';
import { StorageService } from '../services/storage';
import { AudioService } from '../services/audio';
import TimePicker from './TimePicker';

interface ScheduleProps {
  onAnalyze: (tasks: Task[]) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Schedule: React.FC<ScheduleProps> = ({ onAnalyze }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('default');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceConfig['type']>('daily');
  const [intervalDays, setIntervalDays] = useState<number>(2);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [taskTime, setTaskTime] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
      setTasks(StorageService.getTasks());
      setGroups(StorageService.getGroups());
  };

  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    StorageService.saveTasks(updatedTasks);
  };

  const handleAddGroup = () => {
      if (!newGroupName.trim()) return;
      const newGroup: ScheduleGroup = {
          id: Date.now().toString(),
          name: newGroupName.toUpperCase()
      };
      const updatedGroups = [...groups, newGroup];
      setGroups(updatedGroups);
      StorageService.saveGroups(updatedGroups);
      setNewGroupName('');
      setIsAddingGroup(false);
      setActiveGroupId(newGroup.id);
  };

  const deleteGroup = (id: string) => {
      if (id === 'default') return;
      if (window.confirm("Delete group? Tasks will move to GENERAL.")) {
          const updatedGroups = groups.filter(g => g.id !== id);
          setGroups(updatedGroups);
          StorageService.saveGroups(updatedGroups);
          const updatedTasks = tasks.map(t => t.groupId === id ? { ...t, groupId: 'default' } : t);
          saveTasks(updatedTasks);
          setActiveGroupId('default');
      }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const recurrence: RecurrenceConfig = {
        type: recurrenceType,
        intervalDays: recurrenceType === 'interval' ? intervalDays : undefined,
        daysOfWeek: recurrenceType === 'specific_days' ? selectedDays : undefined
    };
    const task: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      time: taskTime || undefined,
      groupId: activeGroupId,
      recurrence,
      completedDates: [],
      streak: 0,
      priority: 'normal',
      createdAt: Date.now()
    };
    saveTasks([task, ...tasks]);
    setNewTaskTitle('');
    setRecurrenceType('daily');
    setSelectedDays([]);
    setIntervalDays(2);
    setTaskTime('');
    setIsAddingTask(false);
  };

  const toggleDaySelection = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
        setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
        setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  const toggleComplete = (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const isCompletedToday = t.completedDates.includes(today);
        let newCompletedDates = t.completedDates;
        let newStreak = t.streak;

        if (isCompletedToday) {
          newCompletedDates = t.completedDates.filter(d => d !== today);
          newStreak = Math.max(0, newStreak - 1);
        } else {
          newCompletedDates = [...t.completedDates, today];
          newStreak = newStreak + 1;
          AudioService.playCompletion();
        }
        return { ...t, completedDates: newCompletedDates, streak: newStreak, lastCompletedAt: Date.now() };
      }
      return t;
    });
    saveTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    if (window.confirm("Abort Protocol?")) {
        saveTasks(tasks.filter(t => t.id !== id));
    }
  };

  const getRecurrenceLabel = (r: RecurrenceConfig) => {
      if (r.type === 'daily') return 'DAILY';
      if (r.type === 'interval') return `EVERY ${r.intervalDays} DAYS`;
      if (r.type === 'specific_days') return `${r.daysOfWeek?.map(d => DAYS_OF_WEEK[d]).join(' ')}`;
      return 'CUSTOM';
  };

  const isTaskDueToday = (task: Task) => {
      const today = new Date();
      if (task.recurrence.type === 'daily') return true;
      if (task.recurrence.type === 'specific_days') {
          return task.recurrence.daysOfWeek?.includes(today.getDay());
      }
      return true;
  };

  const filteredTasks = tasks.filter(t => t.groupId === activeGroupId);

  return (
    <div className="h-full flex flex-col w-full p-4 sm:p-6 max-w-4xl mx-auto overflow-hidden">
      <header className="flex justify-between items-end mb-6 shrink-0 p-4 glass-panel rounded-xl">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white uppercase font-sans drop-shadow-md">Schedule</h1>
          <p className="text-[10px] md:text-xs font-mono text-accent mt-1 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            Consistency Engine // Active
          </p>
        </div>
        <div className="flex gap-2">
             <button
              onClick={() => onAnalyze(tasks)}
              className="glass-button px-4 py-2 text-white font-mono uppercase hover:text-accent transition-all text-[10px] tracking-widest rounded-lg"
            >
              Analyze
            </button>
            <button
              onClick={() => setIsAddingTask(true)}
              className="px-4 py-2 bg-accent text-black font-bold uppercase hover:bg-accent/90 transition-all text-[10px] tracking-widest rounded-lg flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              <Plus size={14} strokeWidth={3}/> New
            </button>
        </div>
      </header>
      
      {/* Groups Bar - Stop propagation to allow horizontal scroll without switching tabs */}
      <div 
        className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-2 shrink-0"
        onTouchStart={(e) => e.stopPropagation()}
      >
          {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all rounded-lg flex items-center gap-2 border ${activeGroupId === group.id ? 'bg-accent text-black border-accent shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-black/20 text-muted hover:text-white border-white/10 hover:border-white/30 backdrop-blur-sm'}`}
              >
                  {group.name}
                  {group.id !== 'default' && activeGroupId === group.id && (
                      <X size={12} onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }} />
                  )}
              </button>
          ))}
          <button 
            onClick={() => setIsAddingGroup(true)}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-accent transition-colors glass-button rounded-lg"
          >
              <Plus size={16} />
          </button>
      </div>

      {isAddingGroup && (
           <div className="mb-6 p-4 glass-panel rounded-xl animate-slide-up flex gap-3 items-center">
               <input
                autoFocus
                type="text"
                placeholder="GROUP NAME"
                className="bg-transparent border-b border-border focus:border-accent outline-none text-white text-sm font-bold uppercase flex-1 pb-1"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
               />
               <button onClick={handleAddGroup} className="text-xs bg-accent text-black px-4 py-1.5 font-bold uppercase rounded-md shadow-lg">ADD</button>
               <button onClick={() => setIsAddingGroup(false)} className="text-muted hover:text-white"><X size={16}/></button>
           </div>
      )}

      {isAddingTask && (
        <div className="mb-6 p-6 glass-panel border border-white/10 rounded-xl animate-slide-up shadow-2xl z-10 shrink-0">
            <div className="flex justify-between items-start mb-6">
                 <input
                    type="text"
                    placeholder="PROTOCOL NAME"
                    className="text-xl font-bold bg-transparent border-b border-white/10 focus:border-accent focus:outline-none placeholder-gray-600 uppercase w-full text-white pb-2"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    autoFocus
                />
                <button onClick={() => setIsAddingTask(false)} className="text-muted hover:text-white p-1"><X size={18}/></button>
            </div>
          
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-mono uppercase text-accent block mb-3">Recurrence Pattern</label>
                    <div className="flex gap-2 flex-wrap">
                        {(['daily', 'interval', 'specific_days'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setRecurrenceType(type)}
                                className={`px-4 py-2 text-xs font-mono uppercase border rounded-lg transition-all ${recurrenceType === type ? 'bg-accent/10 text-accent border-accent' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
                            >
                                {type === 'specific_days' ? 'Specific Days' : type}
                            </button>
                        ))}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                     <label className="text-[10px] font-mono uppercase text-accent block mb-3">Alarm Time (Optional)</label>
                     <TimePicker value={taskTime} onChange={setTaskTime} />
                  </div>
                </div>

                {recurrenceType === 'interval' && (
                    <div className="animate-fade-in">
                        <label className="text-[10px] font-mono uppercase text-accent block mb-2">Repeat Every (Days)</label>
                        <input 
                            type="number" 
                            min="2" 
                            max="365"
                            value={intervalDays}
                            onChange={(e) => setIntervalDays(parseInt(e.target.value))}
                            className="bg-black/30 border border-white/10 text-white p-2 w-24 rounded-lg font-mono text-sm focus:border-accent outline-none"
                        />
                    </div>
                )}

                {recurrenceType === 'specific_days' && (
                    <div className="animate-fade-in">
                        <label className="text-[10px] font-mono uppercase text-accent block mb-2">Active Days</label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map((day, idx) => (
                                <button
                                    key={day}
                                    onClick={() => toggleDaySelection(idx)}
                                    className={`w-10 h-10 flex items-center justify-center text-xs font-bold rounded-full transition-all ${selectedDays.includes(idx) ? 'bg-accent text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-black/30 border border-white/10 text-gray-500 hover:border-white/30'}`}
                                >
                                    {day[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button onClick={handleAddTask} className="w-full bg-accent text-black py-3.5 font-bold uppercase text-xs tracking-wider hover:bg-accent/90 transition-colors mt-4 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    Initialize Protocol
                </button>
            </div>
        </div>
      )}

      <div className="space-y-3 overflow-y-auto no-scrollbar pb-32 flex-1">
        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted glass-panel rounded-xl border-dashed border-white/10">
            <Clock size={32} className="mb-2 opacity-20" />
            <span className="font-mono text-xs uppercase tracking-widest">No Active Protocols in this Sector</span>
          </div>
        )}
        {filteredTasks.map(task => {
          const today = new Date().toISOString().split('T')[0];
          const isDone = task.completedDates.includes(today);
          const isDue = isTaskDueToday(task);

          return (
            <div 
                key={task.id} 
                className={`group relative p-5 border transition-all duration-300 rounded-xl backdrop-blur-md ${isDone ? 'border-white/5 bg-white/5 opacity-50' : isDue ? 'border-accent/30 bg-accent-glow hover:bg-accent/10 hover:border-accent/50' : 'border-white/5 bg-black/20 opacity-40 hover:opacity-100'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className={`text-lg font-bold uppercase tracking-tight text-white truncate ${isDone ? 'line-through decoration-white/30 text-gray-400' : ''}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-md uppercase whitespace-nowrap">
                        {getRecurrenceLabel(task.recurrence)}
                    </span>
                    {task.time && (
                        <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-accent px-2 py-0.5 rounded-md uppercase whitespace-nowrap flex items-center gap-1">
                            <Bell size={10} /> {task.time}
                        </span>
                    )}
                    <div className="flex items-center text-[10px] font-mono font-bold text-accent gap-1">
                      <Zap size={12} fill="currentColor" />
                      STREAK: {task.streak}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {isDue && (
                      <button
                        onClick={() => toggleComplete(task.id)}
                        className={`w-12 h-12 flex items-center justify-center border transition-all rounded-full ${isDone ? 'bg-accent border-accent text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white/20 hover:border-accent text-transparent hover:text-accent/20 bg-black/20'}`}
                      >
                        <Check size={20} strokeWidth={4} />
                      </button>
                  )}
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Schedule;