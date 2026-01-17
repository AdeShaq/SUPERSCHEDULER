import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Delete, Circle } from 'lucide-react';

interface PinOverlayProps {
    mode: 'unlock' | 'setup' | 'confirm';
    onSuccess: (pin: string) => void;
    onCancel?: () => void;
    existingPin?: string; // For verification during setup/unlock
}

const PinOverlay: React.FC<PinOverlayProps> = ({ mode, onSuccess, onCancel, existingPin }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [confirmPin, setConfirmPin] = useState<string | null>(null); // For setup flow
    const [tempMode, setTempMode] = useState<'setup' | 'confirm'>(mode === 'setup' ? 'setup' : 'confirm'); // Internal mode switch for setup

    useEffect(() => {
        if (mode === 'unlock' && existingPin && input.length === existingPin.length) {
            if (input === existingPin) {
                onSuccess(input);
            } else {
                triggerError();
            }
        }
    }, [input, mode, existingPin, onSuccess]);

    const triggerError = () => {
        setError(true);
        setTimeout(() => {
            setError(false);
            setInput('');
        }, 500);
    };

    const handlePress = (num: number) => {
        if (input.length < 4) {
            setInput(prev => prev + num);
            // If we are in setup/confirm mode and reach 4 digits
            if ((mode === 'setup' || tempMode === 'setup' || tempMode === 'confirm') && (input.length + 1) === 4) {
                handleSetupFlow(input + num);
            }
        }
    };

    const handleSetupFlow = (completedInput: string) => {
        if (mode === 'setup') {
            if (tempMode === 'setup') {
                // First step done, move to confirm
                setTimeout(() => {
                    setConfirmPin(completedInput);
                    setInput('');
                    setTempMode('confirm');
                }, 200);
            } else if (tempMode === 'confirm') {
                // Check match
                if (completedInput === confirmPin) {
                    onSuccess(completedInput);
                } else {
                    alert("PINs did not match. Try again.");
                    setConfirmPin(null);
                    setTempMode('setup');
                    setInput('');
                }
            }
        }
    };

    const handleDelete = () => {
        setInput(prev => prev.slice(0, -1));
    };

    const renderDots = () => (
        <div className="flex justify-center gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
                <div
                    key={i}
                    className={`w-4 h-4 rounded-full border border-accent/20 transition-all duration-300 ${i <= input.length
                            ? (error ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-accent shadow-[0_0_10px_#10b981]')
                            : 'bg-transparent'
                        }`}
                />
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in p-4">
            <div className="max-w-xs w-full">
                <div className="text-center mb-12">
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${error ? 'bg-red-500/20 text-red-500 animate-shake' : 'bg-accent/10 text-accent'}`}>
                        {mode === 'unlock' ? <Lock size={32} /> : <Unlock size={32} />}
                    </div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">
                        {mode === 'unlock' && "Security Clearance"}
                        {mode === 'setup' && tempMode === 'setup' && "Set Access Code"}
                        {mode === 'setup' && tempMode === 'confirm' && "Confirm Code"}
                    </h2>
                    <p className="text-xs font-mono text-gray-500 mt-2 uppercase">
                        {error ? "Access Denied" : "Enter 4-Digit PIN"}
                    </p>
                </div>

                {renderDots()}

                <div className="grid grid-cols-3 gap-6 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handlePress(num)}
                            className="aspect-square rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 text-2xl font-mono font-bold text-white flex items-center justify-center transition-all active:scale-95"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="aspect-square flex items-center justify-center">
                        {onCancel && (
                            <button onClick={onCancel} className="text-gray-500 hover:text-white uppercase text-[10px] font-bold">Cancel</button>
                        )}
                    </div>
                    <button
                        onClick={() => handlePress(0)}
                        className="aspect-square rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 text-2xl font-mono font-bold text-white flex items-center justify-center transition-all active:scale-95"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="aspect-square flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <Delete size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PinOverlay;
