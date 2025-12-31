import React, { useState } from 'react';
import { ChevronRight, Check, Shield, BarChart2, Calendar } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to EchoTrack",
      desc: "Your personal consistency engine. Build habits, track progress, and secure your thoughts.",
      icon: <div className="w-16 h-16 bg-accent rounded-full animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
    },
    {
      title: "Plan Your Protocols",
      desc: "Set up daily routines or specific day schedules with custom alarms.",
      icon: <Calendar size={64} className="text-accent" />
    },
    {
      title: "Track Analytics",
      desc: "Visualize your consistency with heatmaps and velocity charts.",
      icon: <BarChart2 size={64} className="text-accent" />
    },
    {
      title: "Secure Vault",
      desc: "Write encrypted notes and get AI-powered summaries.",
      icon: <Shield size={64} className="text-accent" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="glass-panel p-8 rounded-2xl max-w-md w-full flex flex-col items-center border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-accent transition-all duration-500 ease-out" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />

        <div className="mb-8 mt-4 scale-100 transition-transform duration-500 ease-spring">
          {steps[step].icon}
        </div>

        <h2 className="text-2xl font-bold text-white mb-3 uppercase tracking-wider animate-fade-in key={step}">
          {steps[step].title}
        </h2>

        <p className="text-gray-400 mb-8 leading-relaxed text-sm animate-fade-in key={step}-desc">
          {steps[step].desc}
        </p>

        <button
          onClick={handleNext}
          className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-4 rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {step === steps.length - 1 ? (
            <>Get Started <Check size={20} strokeWidth={3} /></>
          ) : (
            <>Next <ChevronRight size={20} strokeWidth={3} /></>
          )}
        </button>

        <div className="mt-6 flex gap-2">
            {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-accent' : 'bg-white/10'}`} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
