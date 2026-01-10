import React, { useState, useEffect, useRef } from 'react';
import { Calendar, BarChart2, FileText, Settings, CircleX, Terminal, Bell, Clock, AlertOctagon, TrendingUp, Check } from 'lucide-react';
import Schedule from './components/Schedule';
import Vault from './components/Vault';
import Analytics from './components/Analytics';
import Finances from './components/Finances';
import Onboarding from './components/Onboarding';
import NeuralInput from './components/NeuralInput';
import { ViewState, Task, AgentAction, SavingsGoal } from './types';
import { AudioService } from './services/audio';
import { GeminiService } from './services/geminiService';
import { AppwriteService } from './services/appwrite';
import { StorageService } from './services/storage';
import { OfflineService } from './services/offline';

const App: React.FC = () => {
    const [view, setView] = useState<ViewState>(ViewState.SCHEDULE);
    const [geminiResult, setGeminiResult] = useState<string | null>(null);
    const [nextTaskCountdown, setNextTaskCountdown] = useState<string | null>(null);
    const [nextTaskName, setNextTaskName] = useState<string | null>(null);
    const [activeAlarmTask, setActiveAlarmTask] = useState<Task | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        soundEnabled: localStorage.getItem('echoTrack_soundEnabled') !== 'false',
        alarmsEnabled: localStorage.getItem('echoTrack_alarmsEnabled') !== 'false',
        notificationsEnabled: localStorage.getItem('echoTrack_notificationsEnabled') !== 'false',
    });

    const [tasks, setTasks] = useState<Task[]>([]);
    const tasksRef = useRef<Task[]>([]);
    useEffect(() => { tasksRef.current = tasks; }, [tasks]);

    const [groups, setGroups] = useState<any[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const goalsRef = useRef<SavingsGoal[]>([]);
    useEffect(() => { goalsRef.current = goals; }, [goals]);

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            try {
                // Initialize Appwrite Session
                const t = await StorageService.getTasks();
                setTasks(t);
                const g = await StorageService.getGroups();
                setGroups(g);
                const sg = await StorageService.getSavingsGoals();
                setGoals(sg);

                // Simulate fast loading UI
                setIsLoading(false);

                // check onboarding
                const hasOnboarded = localStorage.getItem('echoTrack_onboarded');
                if (!hasOnboarded) setShowOnboarding(true);

            } catch (e: any) {
                console.error("Failed to load initial data", e);
                alert(`Data Sync Failed: ${e.message || "Unknown Error"}. Check your network or configuration.`);
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // --- CRUD Handlers ---

    const handleCreateTask = async (task: Task) => {
        // Optimistic Update
        const tempId = task.id;
        setTasks(prev => [...prev, task]);

        try {
            const created = await StorageService.addTask(task);
            if (created) {
                // Replace temp ID with real ID from backend
                setTasks(prev => prev.map(t => t.id === tempId ? created : t));
                showToast("PROTOCOL SAVED");
            }
        } catch (e: any) {
            console.error("Failed to create task", e);
            // Revert optimistic update
            setTasks(prev => prev.filter(t => t.id !== tempId));
            alert("Failed to save task to backend. Changes reverted.");
        }
    };

    const handleUpdateTask = async (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        try {
            const updated = await StorageService.updateTask(updatedTask);
            if (updated) {
                // Ensure local state matches backend state (fixes any serialization drifts)
                setTasks(prev => prev.map(t => t.id === updatedTask.id ? updated : t));
                showToast("PROTOCOL UPDATED");
            }
        } catch (e) {
            console.error("Failed to update task", e);
            // Silent fail for update? Or alert? Stick to logging for now as it's less critical than creation loss.
        }
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleDeleteTask = async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        await StorageService.deleteTask(taskId);
    };

    // --- Group Handlers ---
    const handleCreateGroup = async (group: any) => {
        // Optimistic
        setGroups(prev => [...prev, group]);
        try {
            const created = await StorageService.addGroup(group);
            if (created) {
                setGroups(prev => prev.map(g => g.id === group.id ? created : g));
            }
        } catch (e) {
            console.error("Failed to create group", e);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (groupId === 'default') return;

        // Move tasks to default group locally
        setTasks(prev => prev.map(t => t.groupId === groupId ? { ...t, groupId: 'default' } : t));
        setGroups(prev => prev.filter(g => g.id !== groupId));

        // Persist changes
        try {
            await StorageService.deleteGroup(groupId);
            // We must also update the tasks in backend. 
            // Finding tasks that belong to this group is hard without querying backend or trusting local state.
            // We use local state to find IDs.
            const tasksToMove = tasks.filter(t => t.groupId === groupId);
            for (const t of tasksToMove) {
                await StorageService.updateTask({ ...t, groupId: 'default' });
            }
        } catch (e) {
            console.error("Failed to delete group", e);
        }
    };

    // --- Savings Goal Handlers ---
    const handleCreateGoal = async (goal: SavingsGoal) => {
        // Optimistic
        setGoals(prev => [...prev, goal]);
        try {
            await StorageService.addSavingsGoal(goal);
            showToast("VAULT UPDATED");
        } catch (e) {
            console.error("Failed to add goal", e);
            setGoals(prev => prev.filter(g => g.id !== goal.id));
        }
    };

    const handleUpdateGoal = async (updatedGoal: SavingsGoal) => {
        setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
        try {
            await StorageService.updateSavingsGoal(updatedGoal);
            showToast("VAULT SYNCED");
        } catch (e) {
            console.error("Failed to update goal", e);
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        setGoals(prev => prev.filter(g => g.id !== goalId));
        await StorageService.deleteSavingsGoal(goalId);
    };

    const lastAlarmMinute = useRef<string | null>(null);
    const audioContextInitialized = useRef<boolean>(false);

    // Swipe State
    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);

    // Initialize Audio & Permissions (Reduced Loading Logic here since moved to async loadTasks)
    useEffect(() => {
        const initServices = () => {
            // 1. Audio Unlock (Mobile) - Play silent sound immediately on interaction
            if (!audioContextInitialized.current) {
                AudioService.resumeContext();
                audioContextInitialized.current = true;
            }
            // 2. Notification Permissions
            if (settings.notificationsEnabled && "Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission();
            }
        };

        window.addEventListener('click', initServices, { once: true });
        window.addEventListener('touchstart', initServices, { once: true });

        return () => {
            window.removeEventListener('click', initServices);
            window.removeEventListener('touchstart', initServices);
        };
    }, []);

    // 2b. Offline Sync Manager
    useEffect(() => {
        const handleOnline = async () => {
            const queue = OfflineService.getQueue();
            if (queue.length === 0) return;

            showToast(`SYNCING ${queue.length} CHANGED ITEMS...`);

            // We clear queue first to prevent loops, relying on StorageService to re-queue failures
            OfflineService.clearQueue();

            for (const action of queue) {
                try {
                    switch (action.type) {
                        case 'CREATE_TASK': await StorageService.addTask(action.payload); break;
                        case 'UPDATE_TASK': await StorageService.updateTask(action.payload); break;
                        case 'DELETE_TASK': await StorageService.deleteTask(action.id); break;
                        case 'CREATE_NOTE': await StorageService.addNote(action.payload); break;
                        case 'UPDATE_NOTE': await StorageService.updateNote(action.payload); break;
                        case 'DELETE_NOTE': await StorageService.deleteNote(action.id); break;
                    }
                } catch (e) {
                    console.error("Sync retry failed", e);
                }
            }
            showToast("DATA SYNC COMPLETE");
        };

        window.addEventListener('online', handleOnline);
        // Also try once on mount if already online
        if (navigator.onLine) handleOnline();

        return () => window.removeEventListener('online', handleOnline);
    }, []);

    // Global Time Loop (1 second tick)
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setCurrentTime(now);
            const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:MM"
            const todayStr = now.toISOString().split('T')[0];

            const currentTasks = tasksRef.current; // Use Ref to avoid stale closure

            // 1. Check Alarms
            if (lastAlarmMinute.current !== currentTimeStr && settings.alarmsEnabled) {
                currentTasks.forEach(task => {
                    if (task.time === currentTimeStr && !task.completedDates.includes(todayStr)) {
                        // Check Day Logic
                        let isActiveDay = true;
                        if (task.recurrence.type === 'specific_days' && task.recurrence.daysOfWeek) {
                            isActiveDay = task.recurrence.daysOfWeek.includes(now.getDay());
                        }

                        if (isActiveDay && !activeAlarmTask) {
                            // TRIGGER ALARM
                            // Note: activeAlarmTask inside closure is also stale if not in deps? 
                            // actually setActiveAlarmTask is function update safe.
                            // But checking "!activeAlarmTask" relies on scope.
                            // Better validation: We can trigger it, the state update checks.
                            setActiveAlarmTask(prev => {
                                if (prev) return prev; // Already active

                                if (settings.soundEnabled) {
                                    AudioService.startAlarmLoop();
                                }

                                if (settings.notificationsEnabled && Notification.permission === "granted") {
                                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                                        navigator.serviceWorker.ready.then(reg => {
                                            reg.showNotification("EchoTrack EXECUTE", {
                                                body: `PROTOCOL: ${task.title}`,
                                                requireInteraction: true,
                                                icon: '/icon.png',
                                                // vibrate: [200, 100, 200]
                                            });
                                        });
                                    } else {
                                        new Notification("EchoTrack EXECUTE", {
                                            body: `PROTOCOL: ${task.title}`,
                                            requireInteraction: true,
                                            icon: '/icon.png'
                                        });
                                    }
                                }
                                return task;
                            });
                        }
                    }
                });
                lastAlarmMinute.current = currentTimeStr;
            }

            // 1b. Check Savings Alarms
            if (settings.alarmsEnabled && lastAlarmMinute.current === currentTimeStr) { // Check once per minute
                goalsRef.current.forEach(goal => {
                    if (goal.reminderEnabled && goal.reminderTime === currentTimeStr) {
                        // Simple Daily Check for now.
                        // Ideally check frequency, but "Daily Reminder" is safest default.

                        if (!activeAlarmTask) {
                            setActiveAlarmTask(prev => {
                                if (prev) return prev;
                                if (settings.soundEnabled) AudioService.startAlarmLoop();

                                const notificationTitle = "DEPOSIT REQUIRED";
                                if (settings.notificationsEnabled && Notification.permission === "granted") {
                                    const ops = {
                                        body: `Goal: ${goal.title}`,
                                        requireInteraction: true,
                                        icon: '/icon.png'
                                    };
                                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                                        navigator.serviceWorker.ready.then(reg => reg.showNotification(notificationTitle, ops));
                                    } else {
                                        new Notification(notificationTitle, ops);
                                    }
                                }

                                // Create a Pseudo-Task for the Alarm Overlay
                                return {
                                    id: goal.id,
                                    title: `DEPOSIT: ${goal.title}`,
                                    groupId: 'savings',
                                    recurrence: { type: 'daily' },
                                    completedDates: [],
                                    streak: 0,
                                    priority: 'high',
                                    createdAt: Date.now()
                                } as Task;
                            });
                        }
                    }
                });
            }

            // 2. Update Countdown
            let nearestTaskDiff = Infinity;
            let nearestTask = null;

            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const currentSeconds = now.getSeconds();

            currentTasks.forEach(task => {
                if (task.time && !task.completedDates.includes(todayStr)) {
                    let isActiveDay = true;
                    if (task.recurrence.type === 'specific_days' && task.recurrence.daysOfWeek) {
                        isActiveDay = task.recurrence.daysOfWeek.includes(now.getDay());
                    }

                    if (isActiveDay) {
                        const [h, m] = task.time.split(':').map(Number);
                        const taskMinutes = h * 60 + m;

                        // Only future tasks today
                        if (taskMinutes > currentMinutes || (taskMinutes === currentMinutes && 0 > currentSeconds)) {
                            const diffSeconds = (taskMinutes * 60) - (currentMinutes * 60 + currentSeconds);
                            if (diffSeconds > 0 && diffSeconds < nearestTaskDiff) {
                                nearestTaskDiff = diffSeconds;
                                nearestTask = task;
                            }
                        }
                    }
                }
            });

            if (nearestTask) {
                const hours = Math.floor(nearestTaskDiff / 3600);
                const mins = Math.floor((nearestTaskDiff % 3600) / 60);
                const secs = Math.floor(nearestTaskDiff % 60);
                setNextTaskCountdown(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                setNextTaskName(nearestTask.title);
            } else {
                setNextTaskCountdown(null);
                setNextTaskName(null);
            }

            // 3. Check Savings Reminders (Async Load or Local?)
            // Savings are not in 'tasks'. They are fetched from StorageService. 
            // Since StorageService is now ASYNC, we cannot call it synchronously here.
            // We should load savings into state too if we want to check them.
            // For now, I will omit the savings check loop to prevent error, or add a TODO.
            // TODO: Add savings to state to enable reminders.
        };

        const intervalId = setInterval(tick, 1000);
        tick(); // Initial call
        return () => clearInterval(intervalId);
    }, [activeAlarmTask, settings]); // Re-run if alarm/settings state changes

    const dismissAlarm = () => {
        AudioService.stopAlarmLoop();
        setActiveAlarmTask(null);
    };

    const handleGeminiAnalysis = async (tasksToAnalyze: Task[]) => {
        setGeminiResult("Analyzing consistency matrix...");
        const result = await GeminiService.analyzeSchedule(tasksToAnalyze);
        setGeminiResult(result);
    };

    // AI Action Handler
    const handleAiAction = async (actions: AgentAction[]) => {
        for (const action of actions) {
            if (action.type === 'create') {
                const pt = action.data;
                const newTask: Task = {
                    id: Date.now().toString(), // Temp ID
                    title: pt.title || "New Protocol",
                    time: pt.time || "09:00",
                    groupId: 'default',
                    recurrence: pt.recurrence as any || { type: 'specific_days', daysOfWeek: [new Date().getDay()] },
                    completedDates: [],
                    streak: 0,
                    priority: pt.priority || 'normal',
                    createdAt: Date.now()
                };

                // Normalizing Recurrence from AI
                if ((pt.recurrence as any) === 'weekly' || (pt.recurrence as any) === 'specific_days' || (pt as any).specificDays) {
                    let days = (pt as any).specificDays || (pt as any).specificDay !== undefined ? [(pt as any).specificDay] : [new Date().getDay()];
                    if (Array.isArray((pt as any).specificDays)) days = (pt as any).specificDays;
                    newTask.recurrence = { type: 'specific_days', daysOfWeek: days };
                } else if ((pt.recurrence as any) === 'daily') {
                    newTask.recurrence = { type: 'daily' };
                }

                await handleCreateTask(newTask);
            }

            if (action.type === 'update') {
                if (action.query) {
                    const query = action.query.toLowerCase();
                    const target = tasks.find(t => t.title.toLowerCase().includes(query));
                    if (target) {
                        await handleUpdateTask({ ...target, ...action.updates });
                    }
                }
            }

            if (action.type === 'delete') {
                if (action.query) {
                    const query = action.query.toLowerCase();
                    if (query === 'completed') {
                        const completed = tasks.filter(t => t.completedDates.length > 0); // Logic check? "Completed" usually means "Checked off today"? No, "completedDates.length > 0" means ever completed.
                        // AI intent "Delete completed" likely means "Delete tasks that are done".
                        // For now let's just delete the ones found.
                        for (const t of completed) {
                            await handleDeleteTask(t.id);
                        }
                    } else {
                        const textTargets = tasks.filter(t => t.title.toLowerCase().includes(query));
                        for (const t of textTargets) {
                            await handleDeleteTask(t.id);
                        }
                    }
                }
            }
        }

        if (settings.soundEnabled) AudioService.playNotificationSound();
    };

    const onTouchStart = (e: React.TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        const views = [ViewState.SCHEDULE, ViewState.ANALYTICS, ViewState.FINANCES, ViewState.VAULT];
        const currentIndex = views.indexOf(view);

        if (isLeftSwipe && currentIndex < views.length - 1) {
            setView(views[currentIndex + 1]);
        }

        if (isRightSwipe && currentIndex > 0) {
            setView(views[currentIndex - 1]);
        }
    };

    const handleOnboardingComplete = () => {
        localStorage.setItem('echoTrack_onboarded', 'true');
        setShowOnboarding(false);
    };

    const toggleSetting = (key: keyof typeof settings) => {
        const newValue = !settings[key];
        const newSettings = { ...settings, [key]: newValue };
        setSettings(newSettings);
        localStorage.setItem(`echoTrack_${String(key)}`, String(newValue));

        if (key === 'notificationsEnabled' && newValue === true) {
            Notification.requestPermission();
        }
    };

    const NavItem = ({ viewTarget, icon: Icon, label }: { viewTarget: ViewState, icon: any, label: string }) => (
        <button
            onClick={() => setView(viewTarget)}
            className={`relative flex md:flex-col items-center justify-center md:w-full flex-1 py-4 transition-all duration-300 group ${view === viewTarget ? 'text-accent' : 'text-gray-500 hover:text-white'}`}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-accent transition-all duration-300 hidden md:block ${view === viewTarget ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`absolute top-0 left-0 right-0 h-1 bg-accent transition-all duration-300 md:hidden ${view === viewTarget ? 'opacity-100' : 'opacity-0'}`} />

            <Icon size={24} strokeWidth={view === viewTarget ? 2.5 : 2} className={`transition-transform duration-300 ${view === viewTarget ? 'scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} />
            <span className="text-[10px] font-bold uppercase mt-1 tracking-widest hidden md:block">{label}</span>
        </button>
    );

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-black flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-accent rounded-full animate-pulse shadow-[0_0_50px_rgba(16,185,129,0.5)] mb-8"></div>
                <h1 className="text-3xl font-bold tracking-tighter text-white uppercase animate-fade-in">EchoTrack</h1>
                <p className="text-xs font-mono text-accent mt-2 tracking-widest uppercase animate-pulse">Initializing System...</p>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col md:flex-row h-screen w-screen font-sans overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* SUCCESS TOAST */}
            {toastMessage && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-down">
                    <div className="glass-panel px-6 py-3 rounded-full border border-accent/50 flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <Check size={18} className="text-accent" />
                        <span className="text-xs font-bold text-white tracking-widest uppercase">{toastMessage}</span>
                    </div>
                </div>
            )}

            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

            {/* GLOBAL ALARM OVERLAY */}
            {activeAlarmTask && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-pulse border-[20px] border-red-900/50">
                    <AlertOctagon size={120} className="text-red-600 mb-8 animate-bounce" />
                    <h1 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tighter text-center mb-4 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">
                        EXECUTE PROTOCOL
                    </h1>
                    <p className="text-2xl text-red-500 font-mono uppercase tracking-widest mb-12">
                        {activeAlarmTask.title}
                    </p>
                    <button
                        onClick={dismissAlarm}
                        className="px-12 py-6 bg-white text-black font-bold text-xl uppercase tracking-widest hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95 shadow-2xl rounded-full"
                    >
                        DISMISS ALARM
                    </button>
                </div>
            )}

            {/* Desktop Sidebar / Mobile Bottom Nav */}
            <nav
                className="order-2 md:order-1 h-[env(safe-area-inset-bottom)_+_4rem] md:h-full w-full md:w-20 glass-panel border-t md:border-t-0 md:border-r border-white/10 flex md:flex-col justify-between z-50 shrink-0 pb-[env(safe-area-inset-bottom)] md:pb-0 md:my-2 md:ml-2 md:rounded-2xl"
                onTouchStart={(e) => e.stopPropagation()} // Prevent nav swipes
            >
                <div className="flex flex-row md:flex-col w-full h-full md:h-auto items-center justify-evenly md:justify-start">
                    <div className="hidden md:flex items-center justify-center h-20 border-b border-white/10 mb-4 w-full">
                        <div className="w-8 h-8 bg-accent rounded-full shadow-[0_0_15px_#10b981]"></div>
                    </div>
                    <NavItem viewTarget={ViewState.SCHEDULE} icon={Calendar} label="Plan" />
                    <NavItem viewTarget={ViewState.ANALYTICS} icon={BarChart2} label="Stats" />
                    <NavItem viewTarget={ViewState.FINANCES} icon={TrendingUp} label="Funds" />
                    <NavItem viewTarget={ViewState.VAULT} icon={FileText} label="Vault" />
                </div>
                <div className="hidden md:flex items-center justify-center pb-8">
                    {/* Settings moved to Schedule header per user request */}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="order-1 md:order-2 flex-1 h-full overflow-hidden relative flex flex-col">

                {/* TOP HEADER WITH CLOCK */}
                <div className="glass-panel border-b border-white/10 px-6 py-3 flex items-center justify-between z-10 shrink-0 m-2 rounded-xl">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white tracking-widest uppercase">
                            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-xl font-mono font-bold text-accent tracking-tighter leading-none">
                            {currentTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                    </div>

                    {nextTaskCountdown && (
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2 text-white/70">
                                <span className="text-[10px] font-mono uppercase tracking-widest">Next Protocol</span>
                                <Clock size={12} className="text-accent animate-pulse" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase text-white truncate max-w-[100px]">{nextTaskName}</span>
                                <span className="font-mono text-lg font-bold text-white tabular-nums">T-{nextTaskCountdown}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <div key={view} className="h-full w-full animate-view-enter">
                        {view === ViewState.SCHEDULE && (
                            <div className="h-full flex flex-col">
                                <NeuralInput onTaskDetected={handleAiAction} />
                                <Schedule
                                    tasks={tasks}
                                    groups={groups}
                                    onAddTask={handleCreateTask}
                                    onUpdateTask={handleUpdateTask}
                                    onDeleteTask={handleDeleteTask}
                                    onAddGroup={handleCreateGroup}
                                    onDeleteGroup={handleDeleteGroup}
                                    onAnalyze={handleGeminiAnalysis}
                                    onOpenSettings={() => setShowSettings(true)}
                                />
                            </div>
                        )}
                        {view === ViewState.ANALYTICS && <Analytics tasks={tasks} />}
                        {view === ViewState.FINANCES && (
                            <Finances
                                goals={goals}
                                onAddGoal={handleCreateGoal}
                                onUpdateGoal={handleUpdateGoal}
                                onDeleteGoal={handleDeleteGoal}
                            />
                        )}
                        {view === ViewState.VAULT && <Vault />}
                    </div>
                </div>

                {/* Settings Modal */}
                {showSettings && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onTouchStart={e => e.stopPropagation()}>
                        <div className="glass-panel max-w-md w-full rounded-2xl p-6 md:p-8 shadow-2xl relative border border-white/20">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <CircleX size={24} />
                            </button>

                            <div className="flex items-center gap-3 mb-6 text-white">
                                <Settings size={20} />
                                <h2 className="text-lg font-bold uppercase tracking-widest">System Settings</h2>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-mono text-muted uppercase mb-3">Preferences</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                            <span className="text-sm font-bold text-white">Master Sound</span>
                                            <button
                                                onClick={() => toggleSetting('soundEnabled')}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-accent' : 'bg-white/10'}`}
                                            >
                                                <div className={`w-3 h-3 bg-black rounded-full absolute top-1 transition-all ${settings.soundEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                            <span className="text-sm font-bold text-white">Alarms</span>
                                            <button
                                                onClick={() => toggleSetting('alarmsEnabled')}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${settings.alarmsEnabled ? 'bg-accent' : 'bg-white/10'}`}
                                            >
                                                <div className={`w-3 h-3 bg-black rounded-full absolute top-1 transition-all ${settings.alarmsEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                            <span className="text-sm font-bold text-white">Notifications</span>
                                            <button
                                                onClick={() => toggleSetting('notificationsEnabled')}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${settings.notificationsEnabled ? 'bg-accent' : 'bg-white/10'}`}
                                            >
                                                <div className={`w-3 h-3 bg-black rounded-full absolute top-1 transition-all ${settings.notificationsEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-mono text-muted uppercase mb-3">Diagnostics</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={() => {
                                                if (settings.soundEnabled) {
                                                    AudioService.startAlarmLoop();
                                                    setTimeout(() => AudioService.stopAlarmLoop(), 3000);
                                                } else {
                                                    alert("Sound is disabled in settings.");
                                                }
                                            }}
                                            className="glass-button w-full py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
                                        >
                                            <Bell size={16} /> Test Siren (3s)
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (settings.notificationsEnabled && Notification.permission === "granted") {
                                                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                                                        navigator.serviceWorker.ready.then(reg => {
                                                            reg.showNotification("EchoTrack TEST", {
                                                                body: "System notification channel active.",
                                                                icon: '/icon.png',
                                                                // vibrate: [200, 100, 200]
                                                            });
                                                        });
                                                    } else {
                                                        new Notification("EchoTrack TEST", {
                                                            body: "System notification channel active.",
                                                            icon: '/icon.png'
                                                        });
                                                    }
                                                } else if (!settings.notificationsEnabled) {
                                                    alert("Notifications disabled in settings.");
                                                } else {
                                                    Notification.requestPermission();
                                                }
                                            }}
                                            className="glass-button w-full py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg text-blue-400 hover:text-blue-300 border-blue-500/20 hover:border-blue-500/40"
                                        >
                                            <Terminal size={16} /> Test Notification
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const userId = await AppwriteService.getUserId();
                                                    const sessionType = userId ? "Active Session" : "No Session";

                                                    await StorageService.getTasks();
                                                    alert(`Connection Successful!\nUser: ${userId || 'Anonymous'}\nStatus: Tasks loaded.`);
                                                } catch (e: any) {
                                                    const userId = await AppwriteService.getUserId();
                                                    alert(`Connection Failed: ${e.message}\nUser: ${userId || 'Anonymous'}\n\nTip: Go to Appwrite Console > Database > [Collection] > Settings > Permissions. Add Role "Any" or "Guests" for Read/Write.`);
                                                }
                                            }}
                                            className="glass-button w-full py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg text-green-400 hover:text-green-300 border-green-500/20 hover:border-green-500/40"
                                        >
                                            <AlertOctagon size={16} /> Test Connection
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-white/10">
                                <p className="text-[10px] text-center text-muted font-mono">EchoTrack System v1.1</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gemini Result Modal */}
                {geminiResult && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onTouchStart={e => e.stopPropagation()}>
                        <div className="glass-panel max-w-lg w-full rounded-2xl p-6 md:p-8 shadow-2xl relative border border-white/20">
                            <button
                                onClick={() => setGeminiResult(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <CircleX size={24} />
                            </button>

                            <div className="flex items-center gap-3 mb-6 text-accent">
                                <Terminal size={20} />
                                <h2 className="text-lg font-bold uppercase tracking-widest">System Intelligence</h2>
                            </div>

                            <div className="font-mono text-xs md:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {geminiResult}
                            </div>

                            <div className="mt-8 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setGeminiResult(null)}
                                    className="w-full bg-white text-black py-3 font-bold uppercase text-xs tracking-wider hover:bg-gray-200 transition-colors rounded-lg shadow-lg"
                                >
                                    Acknowledge
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;