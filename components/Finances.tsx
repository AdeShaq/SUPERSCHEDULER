import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Plus, Receipt, ArrowUpRight, ArrowDownLeft, Wallet, CreditCard, Trash2 } from 'lucide-react';
import { SavingsGoal, SavingsLog } from '../types';
import { StorageService } from '../services/storage';

const Finances: React.FC = () => {
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [logs, setLogs] = useState<SavingsLog[]>([]);
    const [totalSaved, setTotalSaved] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'goals'>('overview');

    // New Goal Form
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalTarget, setNewGoalTarget] = useState('');
    const [newGoalFrequency, setNewGoalFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'manual'>('manual');

    // Deposit Form
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');
    const [depositAmount, setDepositAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const loadedGoals = StorageService.getSavingsGoals();
        const loadedLogs = StorageService.getSavingsLogs();
        setGoals(loadedGoals);
        setLogs(loadedLogs);

        const total = loadedGoals.reduce((acc, goal) => acc + goal.currentAmount, 0);
        setTotalSaved(total);
    };

    const handleCreateGoal = (e: React.FormEvent) => {
        e.preventDefault();

        let finalTarget = Number(newGoalTarget);
        let finalRecurring = undefined;

        // If recurring style, the input is the "Recurring Amount"
        // and target might be implicit or just tracking momentum.
        // For simplicity in this logic from user request:
        // "Enter amount I want to be depositing... and frequency"
        if (newGoalFrequency !== 'manual') {
            finalRecurring = Number(newGoalTarget); // User input in "Amount" box is the recurring step
            finalTarget = 0; // Or standard infinite
        }

        const newGoal: SavingsGoal = {
            id: Date.now().toString(),
            title: newGoalTitle,
            targetAmount: finalTarget,
            recurringAmount: finalRecurring,
            currentAmount: 0,
            frequency: newGoalFrequency,
            deadline: ''
        };
        const updatedGoals = [...goals, newGoal];
        StorageService.saveSavingsGoals(updatedGoals);
        setGoals(updatedGoals);
        setNewGoalTitle('');
        setNewGoalTarget('');
        setShowAddModal(false);
    };

    const handleDeleteGoal = (goalId: string) => {
        if (window.confirm("Are you sure you want to delete this savings protocol? Data will be securely erased.")) {
            const updatedGoals = goals.filter(g => g.id !== goalId);
            StorageService.saveSavingsGoals(updatedGoals);
            setGoals(updatedGoals);
            // Optional: also delete logs associated with it? 
            // For now, keep logs audit trail or cleanup:
            const updatedLogs = logs.filter(l => l.goalId !== goalId);
            StorageService.saveSavingsLogs(updatedLogs);
            setLogs(updatedLogs);
        }
    };

    const handleTransaction = (type: 'deposit' | 'withdraw') => {
        if (!selectedGoalId || !depositAmount) return;

        const amount = Number(depositAmount);
        const updatedGoals = goals.map(goal => {
            if (goal.id === selectedGoalId) {
                return {
                    ...goal,
                    currentAmount: type === 'deposit'
                        ? goal.currentAmount + amount
                        : Math.max(0, goal.currentAmount - amount),
                    lastLogDate: type === 'deposit' ? new Date().toISOString() : goal.lastLogDate
                };
            }
            return goal;
        });

        const newLog: SavingsLog = {
            id: Date.now().toString(),
            goalId: selectedGoalId,
            amount: amount,
            date: new Date().toISOString(),
            type: type
        };

        const updatedLogs = [newLog, ...logs];

        StorageService.saveSavingsGoals(updatedGoals);
        StorageService.saveSavingsLogs(updatedLogs);

        loadData();
        setDepositAmount('');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Prepare chart data
    const filteredLogs = selectedGoalId
        ? logs.filter(log => log.goalId === selectedGoalId)
        : logs;

    const chartData = filteredLogs
        .slice()
        .reverse()
        .map(log => ({
            timestamp: new Date(log.date).getTime(),
            amount: log.amount,
            type: log.type,
            formattedDate: new Date(log.date).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

    const chartTitle = selectedGoalId
        ? goals.find(g => g.id === selectedGoalId)?.title || 'Transaction History'
        : 'Global Transaction History';

    return (
        <div className="h-full w-full flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tighter text-white flex items-center gap-3">
                        <Wallet className="text-accent" size={32} />
                        CyberVault
                    </h1>
                    <p className="text-xs font-mono text-muted uppercase tracking-widest mt-1">
                        Secure Financial Mainframe
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="glass-button px-4 py-2 flex items-center gap-2 rounded-lg text-xs font-bold uppercase tracking-wider text-accent border-accent/20 hover:bg-accent/10"
                >
                    <Plus size={16} /> New Goal
                </button>
            </div>

            {/* Main Stats Card */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={120} />
                </div>
                <h3 className="text-sm font-mono text-muted uppercase mb-2">Total Assets Encrypted</h3>
                <div className="text-5xl md:text-6xl font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    {formatCurrency(totalSaved)}
                </div>
                <div className="mt-4 flex gap-4">
                    <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2 border-white/5">
                        <ArrowUpRight size={16} className="text-accent" />
                        <span className="text-xs font-bold text-gray-300">
                            + {formatCurrency(logs.filter(l => l.type === 'deposit').reduce((a, b) => a + b.amount, 0))} IN
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Visualizer / Chart */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl min-h-[300px] flex flex-col">
                    <h3 className="text-xs font-mono text-muted uppercase mb-4 flex items-center gap-2">
                        <Receipt size={14} /> {chartTitle}
                    </h3>
                    <div className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {filteredLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                <Receipt size={48} className="mb-2" />
                                <p className="text-xs uppercase font-mono">No transactions recorded</p>
                            </div>
                        ) : (
                            filteredLogs.map(log => {
                                const goal = goals.find(g => g.id === log.goalId);
                                return (
                                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${log.type === 'deposit' ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-500'}`}>
                                                {log.type === 'deposit' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white uppercase">{log.type}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        {new Date(log.date).toLocaleString(undefined, {
                                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                    {!selectedGoalId && goal && (
                                                        <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 rounded uppercase">
                                                            {goal.title}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-mono font-bold ${log.type === 'deposit' ? 'text-accent' : 'text-red-400'}`}>
                                            {log.type === 'deposit' ? '+' : '-'} {formatCurrency(log.amount)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-xs font-mono text-muted uppercase mb-4">Quick Operations</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Value (NGN)</label>
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-mono text-lg focus:outline-none focus:border-accent/50"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Target Protocol</label>
                            <select
                                value={selectedGoalId}
                                onChange={(e) => setSelectedGoalId(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-accent/50 appearance-none"
                            >
                                <option value="">Select Goal...</option>
                                {goals.map(g => (
                                    <option key={g.id} value={g.id}>{g.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => handleTransaction('deposit')}
                                className="bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent py-3 rounded-lg font-bold uppercase text-xs transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowUpRight size={16} /> Deposit
                            </button>
                            <button
                                onClick={() => handleTransaction('withdraw')}
                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 py-3 rounded-lg font-bold uppercase text-xs transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowDownLeft size={16} /> Withdraw
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Goals List */}
            <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-white/10 pb-2">Active Protocols</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                {goals.map(goal => {
                    const params = (goal.currentAmount / goal.targetAmount) * 100;
                    const progress = Math.min(100, params);

                    return (
                        <div
                            key={goal.id}
                            onClick={() => setSelectedGoalId(goal.id === selectedGoalId ? '' : goal.id)}
                            className={`glass-panel p-5 rounded-xl border transition-all group cursor-pointer ${selectedGoalId === goal.id ? 'border-accent bg-accent/5' : 'border-white/5 hover:border-accent/30'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-white uppercase tracking-wider">{goal.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {goal.recurringAmount ? (
                                            <p className="text-[10px] font-mono text-gray-500 uppercase">Step: {formatCurrency(goal.recurringAmount)}</p>
                                        ) : (
                                            <p className="text-[10px] font-mono text-gray-500 uppercase">Target: {formatCurrency(goal.targetAmount || 0)}</p>
                                        )}
                                        <span className="text-[10px] font-mono text-accent bg-accent/10 px-1 rounded uppercase">{goal.frequency}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDeleteGoal(goal.id)}
                                        className="text-gray-600 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <Target size={20} className={`text-gray-600 group-hover:text-accent transition-colors ${progress >= 100 ? 'text-accent animate-pulse' : ''}`} />
                                </div>
                            </div>

                            <div className="mb-2 flex justify-between items-end">
                                <span className="text-2xl font-mono font-bold text-white">{formatCurrency(goal.currentAmount)}</span>
                                <span className="text-xs font-bold text-accent">{progress.toFixed(1)}%</span>
                            </div>

                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent relative"
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]" />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {goals.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-600 border border-dashed border-white/10 rounded-xl">
                        <CreditCard size={48} className="mb-4 opacity-50" />
                        <p className="uppercase font-mono text-sm">No active funding protocols found</p>
                    </div>
                )}
            </div>

            {/* Add Goal Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-accent/20">
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-6">Initialize New Fund</h2>
                        <form onSubmit={handleCreateGoal} className="space-y-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-gray-400 block mb-2">Protocol Name</label>
                                <input
                                    type="text"
                                    value={newGoalTitle}
                                    onChange={(e) => setNewGoalTitle(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-white focus:border-accent outline-none"
                                    placeholder="e.g. Neural Link Upgrade"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs uppercase font-bold text-gray-400 block mb-2">Deposit Frequency</label>
                                <select
                                    value={newGoalFrequency}
                                    onChange={(e) => setNewGoalFrequency(e.target.value as any)}
                                    className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-white focus:border-accent outline-none appearance-none"
                                >
                                    <option value="manual">Manual (Flexible Target)</option>
                                    <option value="daily">Daily Commitment</option>
                                    <option value="weekly">Weekly Commitment</option>
                                    <option value="monthly">Monthly Commitment</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs uppercase font-bold text-gray-400 block mb-2">
                                    {newGoalFrequency === 'manual' ? 'Total Target Amount (NGN)' : 'Recurring Deposit Amount (NGN)'}
                                </label>
                                <input
                                    type="number"
                                    value={newGoalTarget}
                                    onChange={(e) => setNewGoalTarget(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-white focus:border-accent outline-none font-mono"
                                    placeholder={newGoalFrequency === 'manual' ? "Target Budget..." : "Amount per cycle..."}
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 rounded-lg border border-white/10 text-gray-300 font-bold uppercase text-xs hover:bg-white/5"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-lg bg-accent text-black font-bold uppercase text-xs hover:bg-accent/90"
                                >
                                    Initialize
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finances;
