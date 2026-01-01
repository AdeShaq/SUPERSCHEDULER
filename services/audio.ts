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

  // Single pulse - SIREN UPGRADE
  playAlarmPulse: () => {
    if (!AudioService.ctx) AudioService.init();
    const ctx = AudioService.ctx!;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Dual Oscillator for "Red Alert" dissonance
    osc1.type = 'sawtooth';
    osc2.type = 'square';

    // Siren sweeping up and down aggressively
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.linearRampToValueAtTime(1200, now + 0.4);
    osc1.frequency.linearRampToValueAtTime(600, now + 0.8);

    osc2.frequency.setValueAtTime(605, now); // Slight detune
    osc2.frequency.linearRampToValueAtTime(1210, now + 0.4);
    osc2.frequency.linearRampToValueAtTime(605, now + 0.8);

    // Louder Gain
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.1); // Louder (0.8)
    gain.gain.setValueAtTime(0.8, now + 0.6);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  },

  playNotificationSound: () => {
    if (!AudioService.ctx) AudioService.init();
    const ctx = AudioService.ctx!;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // High-tech Chime (Arpeggio effect)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(1108.73, now + 0.1); // C#6
    osc.frequency.setValueAtTime(1318.51, now + 0.2); // E6

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.4);
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