import React, { useState, useEffect, useRef } from 'react';
import { Calendar, BarChart2, FileText, Settings, CircleX, Terminal, Bell, Clock, AlertOctagon } from 'lucide-react';
import Schedule from './components/Schedule';
import Vault from './components/Vault';
import Analytics from './components/Analytics';
import Onboarding from './components/Onboarding';
import { ViewState, Task } from './types';
import { AudioService } from './services/audio';
import { GeminiService } from './services/geminiService';
import { StorageService } from './services/storage';

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

  const [settings, setSettings] = useState({
      soundEnabled: localStorage.getItem('echoTrack_soundEnabled') !== 'false',
      alarmsEnabled: localStorage.getItem('echoTrack_alarmsEnabled') !== 'false',
      notificationsEnabled: localStorage.getItem('echoTrack_notificationsEnabled') !== 'false',
  });
  
  const lastAlarmMinute = useRef<string | null>(null);
  const audioContextInitialized = useRef<boolean>(false);
  
  // Swipe State
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  // Initialize Audio & Permissions & Loading/Onboarding
  useEffect(() => {
    // Simulate fast loading
    setTimeout(() => {
        const hasOnboarded = localStorage.getItem('echoTrack_onboarded');
        if (!hasOnboarded) {
            setShowOnboarding(true);
        }
        setIsLoading(false);
    }, 1500);

    const initServices = () => {
        if (!audioContextInitialized.current) {
            AudioService.init();
            audioContextInitialized.current = true;
        }
        if ("Notification" in window && Notification.permission !== "granted") {
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

  // Global Time Loop (1 second tick)
  useEffect(() => {
      const tick = () => {
          const now = new Date();
          setCurrentTime(now);
          const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:MM"
          const todayStr = now.toISOString().split('T')[0];
          
          const tasks = StorageService.getTasks();
          
          // 1. Check Alarms
          if (lastAlarmMinute.current !== currentTimeStr && settings.alarmsEnabled) {
              tasks.forEach(task => {
                 if (task.time === currentTimeStr && !task.completedDates.includes(todayStr)) {
                     // Check Day Logic
                     let isActiveDay = true;
                     if (task.recurrence.type === 'specific_days' && task.recurrence.daysOfWeek) {
                         isActiveDay = task.recurrence.daysOfWeek.includes(now.getDay());
                     }
                     
                     if (isActiveDay && !activeAlarmTask) {
                         // TRIGGER ALARM
                         setActiveAlarmTask(task);
                         if (settings.soundEnabled) {
                             AudioService.startAlarmLoop();
                         }
                         
                         if (settings.notificationsEnabled && Notification.permission === "granted") {
                             new Notification("EchoTrack EXECUTE", {
                                 body: `PROTOCOL: ${task.title}`,
                                 requireInteraction: true, // Keep notification open
                                 icon: '/icon.png'
                             });
                         }
                     }
                 }
              });
              lastAlarmMinute.current = currentTimeStr;
          }

          // 2. Update Countdown
          let nearestTaskDiff = Infinity;
          let nearestTask = null;

          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const currentSeconds = now.getSeconds();
          
          tasks.forEach(task => {
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
      };

      const intervalId = setInterval(tick, 1000);
      tick(); // Initial call
      return () => clearInterval(intervalId);
  }, [activeAlarmTask]); // Re-run if alarm state changes

  const dismissAlarm = () => {
      AudioService.stopAlarmLoop();
      setActiveAlarmTask(null);
  };

  const handleGeminiAnalysis = async (tasks: Task[]) => {
    setGeminiResult("Analyzing consistency matrix...");
    const result = await GeminiService.analyzeSchedule(tasks);
    setGeminiResult(result);
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

    const views = [ViewState.SCHEDULE, ViewState.ANALYTICS, ViewState.VAULT];
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
      localStorage.setItem(`echoTrack_${key}`, String(newValue));

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
                        <Clock size={12} className="text-accent animate-pulse"/>
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
                    <Schedule
                        onAnalyze={handleGeminiAnalysis}
                        onOpenSettings={() => setShowSettings(true)}
                    />
                )}
                {view === ViewState.ANALYTICS && <Analytics />}
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
                                            new Notification("EchoTrack TEST", {
                                                body: "System notification channel active.",
                                                icon: '/icon.png'
                                            });
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