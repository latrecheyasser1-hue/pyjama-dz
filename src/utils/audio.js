// Unified Web Audio Notification Sound with Strict Global Debounce
let lastSoundTimestamp = 0;

export const playNotificationSound = () => {
  const now = Date.now();
  // Prevent any duplicate audio triggers within 2.5 seconds
  if (now - lastSoundTimestamp < 2500) {
    return;
  }
  lastSoundTimestamp = now;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + startTime);
      osc.stop(audioCtx.currentTime + startTime + duration);
    };

    // Pleasant 2-note chime: D5 (587.33Hz) -> A5 (880.00Hz)
    playTone(587.33, 0, 0.12);
    playTone(880.00, 0.12, 0.35);
  } catch (e) {
    console.warn("Audio notification suppressed or blocked by browser:", e);
  }
};
