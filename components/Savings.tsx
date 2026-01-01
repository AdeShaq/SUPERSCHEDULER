import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar, CircleX, PiggyBank, History, ArrowLeft, Wallet, CreditCard } from 'lucide-react';
import { SavingsGoal, SavingsLog } from '../types';
import { StorageService } from '../services/storage';

const Savings: React.FC = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [logs, setLogs] = useState<SavingsLog[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<'deposit' | 'withdrawal'>('deposit');

  // New Goal Form
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalFrequency, setNewGoalFrequency] = useState<'daily'|'weekly'|'monthly'|'custom'>('monthly');

  // Log Form
  const [logAmount, setLogAmount] = useState('');
  const [logNote, setLogNote] = useState('');

  useEffect(() => {
    setGoals(StorageService.getSavingsGoals());
    setLogs(StorageService.getSavingsLogs());
  }, []);

  const saveGoals = (updatedGoals: SavingsGoal[]) => {
    setGoals(updatedGoals);
    StorageService.saveSavingsGoals(updatedGoals);
  };

  const saveLogs = (updatedLogs: SavingsLog[]) => {
    setLogs(updatedLogs);
    StorageService.saveSavingsLogs(updatedLogs);
  };

  const createGoal = () => {
    if (!newGoalName || !newGoalTarget) return;

    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      name: newGoalName,
      targetAmount: parseFloat(newGoalTarget),
      currentAmount: 0,
      currency: '$', // Default for now
      frequency: newGoalFrequency,
      createdAt: Date.now()
    };

    saveGoals([...goals, newGoal]);
    setShowCreateModal(false);
    setNewGoalName('');
    setNewGoalTarget('');
    setSelectedGoalId(newGoal.id);
  };

  const handleLog = () => {
      if (!selectedGoalId || !logAmount) return;

      const amount = parseFloat(logAmount);
      const goal = goals.find(g => g.id === selectedGoalId);
      if (!goal) return;

      const newLog: SavingsLog = {
          id: Date.now().toString(),
          goalId: selectedGoalId,
          amount: amount,
          type: logType,
          date: new Date().toISOString(),
          note: logNote
      };

      // Update goal amount
      const updatedGoals = goals.map(g => {
          if (g.id === selectedGoalId) {
              const newAmount = logType === 'deposit'
                  ? g.currentAmount + amount
                  : g.currentAmount - amount;
              return { ...g, currentAmount: newAmount };
          }
          return g;
      });

      saveGoals(updatedGoals);
      saveLogs([newLog, ...logs]);

      setShowLogModal(false);
      setLogAmount('');
      setLogNote('');
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const goalLogs = logs.filter(l => l.goalId === selectedGoalId);

  const calculateProgress = (current: number, target: number) => {
      if (target === 0) return 0;
      return Math.min(100, (current / target) * 100);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-transparent overflow-hidden">
        {/* Sidebar List */}
        <div className={`
            ${selectedGoalId ? 'hidden md:flex' : 'flex'}
            w-full md:w-80
            flex-col border-r border-white/10 transition-all duration-300 glass-panel md:rounded-l-2xl my-2 ml-2
        `}>
            <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/5">
                <h2 className="font-bold uppercase tracking-wider text-xs text-accent">Savings Goals</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-2 hover:bg-accent/20 text-accent rounded-full transition-colors"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative p-2 space-y-2">
                {goals.length === 0 ? (
                    <div className="p-8 text-center text-muted text-xs font-mono uppercase mt-10 opacity-60">
                        No active goals
                    </div>
                ) : (
                    goals.map(goal => {
                        const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
                        return (
                            <div
                                key={goal.id}
                                onClick={() => setSelectedGoalId(goal.id)}
                                className={`p-4 rounded-xl border border-white/5 cursor-pointer transition-all hover:bg-white/5 ${selectedGoalId === goal.id ? 'bg-white/10 border-accent/50' : 'bg-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white text-sm">{goal.name}</h3>
                                    <span className="text-[10px] font-mono text-muted uppercase bg-white/5 px-2 py-0.5 rounded">{goal.frequency}</span>
                                </div>
                                <div className="flex items-end gap-1 mb-2">
                                    <span className="text-xl font-bold text-accent">${goal.currentAmount.toLocaleString()}</span>
                                    <span className="text-xs text-muted mb-1">/ ${goal.targetAmount.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Detail View */}
        <div className={`flex-1 flex flex-col h-full relative animate-in fade-in ${!selectedGoalId ? 'hidden md:flex' : 'flex'} m-2 glass-panel md:rounded-r-2xl border-l-0`}>
            {!selectedGoal ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-muted font-mono uppercase tracking-widest text-xs opacity-50">
                    <PiggyBank size={48} className="mb-4 stroke-1 text-accent opacity-50"/>
                    Select or Create Goal
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                             <button onClick={() => setSelectedGoalId(null)} className="md:hidden text-muted hover:text-white">
                                <ArrowLeft size={24} />
                            </button>
                            <div className="p-3 bg-accent/10 rounded-xl text-accent">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">{selectedGoal.name}</h1>
                                <p className="text-xs text-muted font-mono uppercase tracking-wider">Target: ${selectedGoal.targetAmount.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-2xl border border-white/10 relative overflow-hidden">
                            <div className="relative z-10 flex flex-col items-center justify-center py-4">
                                <span className="text-sm text-emerald-400 font-bold uppercase tracking-widest mb-2">Current Balance</span>
                                <span className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-lg">
                                    ${selectedGoal.currentAmount.toLocaleString()}
                                </span>
                                <div className="mt-6 flex gap-3 w-full max-w-xs">
                                    <button
                                        onClick={() => { setLogType('deposit'); setShowLogModal(true); }}
                                        className="flex-1 py-3 bg-accent text-black font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-emerald-400 transition-colors shadow-lg hover:shadow-emerald-500/20"
                                    >
                                        Deposit
                                    </button>
                                    <button
                                        onClick={() => { setLogType('withdrawal'); setShowLogModal(true); }}
                                        className="flex-1 py-3 bg-white/10 text-white font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-white/20 transition-colors border border-white/10"
                                    >
                                        Withdraw
                                    </button>
                                </div>
                            </div>
                             {/* Background decoration */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                        </div>
                    </div>

                    {/* Logs History */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 flex items-center gap-2 text-muted border-b border-white/5">
                            <History size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Transaction History</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {goalLogs.length === 0 ? (
                                <div className="text-center py-10 text-muted text-xs font-mono uppercase opacity-50">
                                    No transactions recorded
                                </div>
                            ) : (
                                goalLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                    <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${log.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {log.type === 'deposit' ? <TrendingUp size={16} /> : <CreditCard size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white capitalize">{log.note || log.type}</p>
                                                <p className="text-[10px] text-muted font-mono">{new Date(log.date).toLocaleDateString()} • {new Date(log.date).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <span className={`font-mono font-bold ${log.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {log.type === 'deposit' ? '+' : '-'}${log.amount.toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowCreateModal(false)}>
                <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-white/20 shadow-2xl" onClick={e => e.stopPropagation()}>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-6">New Goal</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-mono text-muted uppercase block mb-1">Goal Name</label>
                            <input
                                value={newGoalName}
                                onChange={e => setNewGoalName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none"
                                placeholder="e.g. New Laptop"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-mono text-muted uppercase block mb-1">Target Amount ($)</label>
                            <input
                                type="number"
                                value={newGoalTarget}
                                onChange={e => setNewGoalTarget(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none font-mono"
                                placeholder="1000"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-mono text-muted uppercase block mb-1">Timeframe (Frequency)</label>
                            <select
                                value={newGoalFrequency}
                                onChange={e => setNewGoalFrequency(e.target.value as any)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <button
                            onClick={createGoal}
                            disabled={!newGoalName || !newGoalTarget}
                            className="w-full py-3 bg-accent text-black font-bold uppercase tracking-wider rounded-lg mt-4 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Goal
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Log Modal */}
        {showLogModal && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowLogModal(false)}>
                <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-white/20 shadow-2xl" onClick={e => e.stopPropagation()}>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-6">
                        {logType === 'deposit' ? 'Add Deposit' : 'Withdraw Funds'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-mono text-muted uppercase block mb-1">Amount ($)</label>
                            <input
                                type="number"
                                value={logAmount}
                                onChange={e => setLogAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none font-mono text-xl"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-mono text-muted uppercase block mb-1">Note (Optional)</label>
                            <input
                                value={logNote}
                                onChange={e => setLogNote(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none"
                                placeholder={logType === 'deposit' ? 'Weekly saving...' : 'Emergency...'}
                            />
                        </div>
                        <button
                            onClick={handleLog}
                            disabled={!logAmount}
                            className={`w-full py-3 font-bold uppercase tracking-wider rounded-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed ${logType === 'deposit' ? 'bg-accent text-black hover:bg-emerald-400' : 'bg-red-500 text-white hover:bg-red-600'}`}
                        >
                            Confirm {logType}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Savings;
