import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Cpu, Loader2, Send } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { Task } from '../types';

interface NeuralInputProps {
    onTaskDetected: (tasks: Partial<Task>[]) => void;
}

const NeuralInput: React.FC<NeuralInputProps> = ({ onTaskDetected }) => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'thinking' | 'success' | 'error'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        setIsProcessing(true);
        setStatus('thinking');

        try {
            const result = await GeminiService.parseTaskCommand(input);
            console.log("Neural Parse Result:", result);


            if (result && Array.isArray(result) && result.length > 0) {
                const tasksToCreate: Partial<Task>[] = result.map(res => {
                    const t: Partial<Task> = {
                        title: res.title,
                        time: res.time,
                        priority: res.priority,
                        recurrence: res.recurrence === 'none'
                            ? { type: 'specific_days', daysOfWeek: [new Date().getDay()] }
                            : res.recurrence === 'daily'
                                ? { type: 'daily' }
                                : { type: 'interval', intervalDays: 7 }
                    };

                    if (res.recurrence === 'weekly' || res.specificDay !== undefined) {
                        t.recurrence = {
                            type: 'specific_days',
                            daysOfWeek: res.specificDay !== undefined ? [res.specificDay] : [new Date().getDay()]
                        };
                    }
                    return t;
                });

                onTaskDetected(tasksToCreate);
                setStatus('success');
                setInput('');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('error');
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-6">
            <div className={`
                relative flex items-center gap-3 p-1 rounded-xl border transition-all duration-300
                ${status === 'thinking' ? 'bg-accent/5 border-accent animate-pulse' : 'bg-black/40 border-white/10 hover:border-white/20'}
                ${status === 'error' ? 'border-red-500/50' : ''}
                ${status === 'success' ? 'border-green-500/50' : ''}
            `}>
                <div className="pl-3 text-accent animate-pulse">
                    {status === 'thinking' ? <Loader2 size={20} className="animate-spin" /> : <Terminal size={20} />}
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={status === 'error' ? "Command Unclear. Retry." : "Enter Neural Command (e.g. 'Coffee at 8am')"}
                        className="w-full bg-transparent border-none outline-none text-white font-mono text-sm placeholder-gray-600 py-3"
                        disabled={isProcessing}
                    />
                    <button
                        type="submit"
                        disabled={!input || isProcessing}
                        className="p-2 text-gray-500 hover:text-accent disabled:opacity-30 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </form>

                {/* Status Indicator Line */}
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-50" />
            </div>

            {/* Helper Text */}
            <div className="flex justify-between px-2 mt-1">
                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">
                    Powered by Gemini 2.0 Flash
                </span>
                {status === 'success' && (
                    <span className="text-[10px] text-green-500 font-mono uppercase tracking-wider animate-bounce">
                        Protocol Accepted
                    </span>
                )}
            </div>
        </div>
    );
};

export default NeuralInput;
