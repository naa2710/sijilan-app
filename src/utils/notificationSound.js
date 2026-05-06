let audioContext = null;
let lastPlayTimestamp = 0;

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
};

export const primeNotificationAudio = async () => {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch (error) {
      return false;
    }
  }

  return context.state === 'running';
};

export const playNotificationSound = async (variant = 'default') => {
  const now = Date.now();
  if (now - lastPlayTimestamp < 350) return false;

  const context = getAudioContext();
  if (!context) return false;

  await primeNotificationAudio();

  if (context.state !== 'running') return false;

  const presets = {
    default: [
      { frequency: 880, duration: 0.11, delay: 0, gain: 0.12 },
      { frequency: 1174, duration: 0.16, delay: 0.12, gain: 0.14 },
    ],
    coins: [
      { frequency: 1320, duration: 0.07, delay: 0, gain: 0.16 },
      { frequency: 1760, duration: 0.08, delay: 0.08, gain: 0.18 },
      { frequency: 1980, duration: 0.1, delay: 0.18, gain: 0.2 },
    ],
    warning: [
      { frequency: 740, duration: 0.12, delay: 0, gain: 0.14 },
      { frequency: 988, duration: 0.18, delay: 0.14, gain: 0.16 },
    ],
    message: [
      { frequency: 1046, duration: 0.08, delay: 0, gain: 0.14 },
      { frequency: 1318, duration: 0.11, delay: 0.1, gain: 0.16 },
      { frequency: 1567, duration: 0.14, delay: 0.22, gain: 0.18 },
    ],
    approved: [
      { frequency: 880, duration: 0.08, delay: 0, gain: 0.16 },
      { frequency: 1108, duration: 0.1, delay: 0.08, gain: 0.17 },
      { frequency: 1480, duration: 0.14, delay: 0.18, gain: 0.18 },
    ],
    frozen: [
      { frequency: 420, duration: 0.16, delay: 0, gain: 0.18 },
      { frequency: 360, duration: 0.18, delay: 0.18, gain: 0.2 },
    ],
    review: [
      { frequency: 820, duration: 0.09, delay: 0, gain: 0.16 },
      { frequency: 1032, duration: 0.09, delay: 0.11, gain: 0.16 },
      { frequency: 820, duration: 0.12, delay: 0.24, gain: 0.18 },
    ],
  };

  const tones = presets[variant] || presets.default;
  const startAt = context.currentTime + 0.01;

  tones.forEach((tone) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const toneStart = startAt + tone.delay;
    const toneEnd = toneStart + tone.duration;

    oscillator.type = variant === 'coins' ? 'triangle' : (variant === 'message' ? 'square' : 'sine');
    oscillator.frequency.setValueAtTime(tone.frequency, toneStart);

    const toneGain = Number(tone.gain) || 0.12;

    gainNode.gain.setValueAtTime(0.0001, toneStart);
    gainNode.gain.exponentialRampToValueAtTime(toneGain, toneStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  });

  lastPlayTimestamp = now;
  return true;
};
