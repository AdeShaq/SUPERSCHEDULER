import React, { useState, useEffect } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      let hourInt = parseInt(h, 10);
      const isPm = hourInt >= 12;

      if (hourInt === 0) {
        hourInt = 12;
      } else if (hourInt > 12) {
        hourInt -= 12;
      }

      setHour(hourInt.toString().padStart(2, '0'));
      setMinute(m);
      setAmpm(isPm ? 'PM' : 'AM');
    } else {
        // Reset if value is cleared
        setHour('12');
        setMinute('00');
        setAmpm('AM');
    }
  }, [value]);

  const handleChange = (newHour: string, newMinute: string, newAmpm: string) => {
    let h = parseInt(newHour, 10);
    if (newAmpm === 'PM' && h < 12) h += 12;
    if (newAmpm === 'AM' && h === 12) h = 0;

    const timeString = `${h.toString().padStart(2, '0')}:${newMinute}`;
    onChange(timeString);

    // Update local state for immediate feedback if parent updates async
    setHour(newHour);
    setMinute(newMinute);
    setAmpm(newAmpm);
  };

  return (
    <div className="flex gap-2 items-center bg-black/30 border border-white/10 p-1.5 rounded-lg w-full">
      <select
        value={hour}
        onChange={(e) => handleChange(e.target.value, minute, ampm)}
        className="bg-transparent text-white font-mono text-sm outline-none appearance-none p-1 text-center w-10 cursor-pointer hover:bg-white/5 rounded"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h.toString().padStart(2, '0')} className="bg-gray-900 text-white">
            {h.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-white/50">:</span>
      <select
        value={minute}
        onChange={(e) => handleChange(hour, e.target.value, ampm)}
        className="bg-transparent text-white font-mono text-sm outline-none appearance-none p-1 text-center w-10 cursor-pointer hover:bg-white/5 rounded"
      >
        {Array.from({ length: 60 }, (_, i) => i).map(m => (
          <option key={m} value={m.toString().padStart(2, '0')} className="bg-gray-900 text-white">
            {m.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <button
        onClick={() => handleChange(hour, minute, ampm === 'AM' ? 'PM' : 'AM')}
        className="bg-white/10 hover:bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded ml-auto transition-colors"
      >
        {ampm}
      </button>
    </div>
  );
};

export default TimePicker;
