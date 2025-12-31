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
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  },

  // Single pulse
  playAlarmPulse: () => {
     if (!AudioService.ctx) AudioService.init();
     const ctx = AudioService.ctx!;

     const now = ctx.currentTime;
     const osc = ctx.createOscillator();
     const gain = ctx.createGain();

     osc.type = 'sawtooth';
     // Siren effect
     osc.frequency.setValueAtTime(600, now);
     osc.frequency.linearRampToValueAtTime(800, now + 0.3);
     osc.frequency.linearRampToValueAtTime(600, now + 0.6);

     gain.gain.setValueAtTime(0, now);
     gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
     gain.gain.setValueAtTime(0.3, now + 0.5);
     gain.gain.linearRampToValueAtTime(0, now + 0.6);

     osc.connect(gain);
     gain.connect(ctx.destination);
     osc.start();
     osc.stop(now + 0.6);
  },

  startAlarmLoop: () => {
      if (AudioService.alarmInterval) return; // Already running
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