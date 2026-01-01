export const AudioService = {
  ctx: null as AudioContext | null,
  alarmInterval: null as any,

  init: () => {
    if (!AudioService.ctx) {
      AudioService.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  },

  playCompletion: () => {
    if (!AudioService.ctx) AudioService.init();
    const ctx = AudioService.ctx!;
    
    if (ctx.state === 'suspended') ctx.resume();

    // Glassy Ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  },

  // Richer Alarm Pulse
  playAlarmPulse: () => {
     if (!AudioService.ctx) AudioService.init();
     const ctx = AudioService.ctx!;

     if (ctx.state === 'suspended') {
         ctx.resume();
     }

     const now = ctx.currentTime;

     // Oscillator 1 (Main High Siren)
     const osc1 = ctx.createOscillator();
     const gain1 = ctx.createGain();
     osc1.type = 'square'; // Piercing
     osc1.frequency.setValueAtTime(880, now);
     osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.4);
     osc1.frequency.exponentialRampToValueAtTime(880, now + 0.8);

     gain1.gain.setValueAtTime(0, now);
     gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
     gain1.gain.setValueAtTime(0.3, now + 0.6);
     gain1.gain.linearRampToValueAtTime(0, now + 0.8);

     // Oscillator 2 (Lower Harmony/Dissonance)
     const osc2 = ctx.createOscillator();
     const gain2 = ctx.createGain();
     osc2.type = 'sawtooth';
     osc2.frequency.setValueAtTime(440, now);
     osc2.frequency.exponentialRampToValueAtTime(880, now + 0.4);
     osc2.frequency.exponentialRampToValueAtTime(440, now + 0.8);

     gain2.gain.setValueAtTime(0, now);
     gain2.gain.linearRampToValueAtTime(0.3, now + 0.05);
     gain2.gain.setValueAtTime(0.3, now + 0.6);
     gain2.gain.linearRampToValueAtTime(0, now + 0.8);

     osc1.connect(gain1);
     osc2.connect(gain2);
     gain1.connect(ctx.destination);
     gain2.connect(ctx.destination);

     osc1.start();
     osc2.start();
     osc1.stop(now + 0.8);
     osc2.stop(now + 0.8);
  },

  startAlarmLoop: () => {
      if (AudioService.alarmInterval) return; // Already running

      if (AudioService.ctx && AudioService.ctx.state === 'suspended') {
          AudioService.ctx.resume();
      }

      AudioService.playAlarmPulse();
      AudioService.alarmInterval = setInterval(() => {
          AudioService.playAlarmPulse();
      }, 1000);
  },

  stopAlarmLoop: () => {
      if (AudioService.alarmInterval) {
          clearInterval(AudioService.alarmInterval);
          AudioService.alarmInterval = null;
      }
  }
};
