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
      { frequency: 880, duration: 0.15, delay: 0, gain: 0.3 },
      { frequency: 1174, duration: 0.2, delay: 0.15, gain: 0.35 },
    ],
    coins: [
      { frequency: 1320, duration: 0.1, delay: 0, gain: 0.4 },
      { frequency: 1760, duration: 0.12, delay: 0.1, gain: 0.4 },
      { frequency: 1980, duration: 0.15, delay: 0.22, gain: 0.45 },
    ],
    warning: [
      { frequency: 740, duration: 0.15, delay: 0, gain: 0.35 },
      { frequency: 988, duration: 0.25, delay: 0.18, gain: 0.4 },
      { frequency: 740, duration: 0.15, delay: 0.45, gain: 0.35 },
    ],
    message: [
      { frequency: 1046, duration: 0.12, delay: 0, gain: 0.35 },
      { frequency: 1318, duration: 0.15, delay: 0.12, gain: 0.4 },
      { frequency: 1567, duration: 0.2, delay: 0.28, gain: 0.45 },
    ],
    approved: [
      { frequency: 988, duration: 0.1, delay: 0, gain: 0.4 },
      { frequency: 1318, duration: 0.12, delay: 0.1, gain: 0.45 },
      { frequency: 1975, duration: 0.2, delay: 0.22, gain: 0.5 },
    ],
    frozen: [
      { frequency: 320, duration: 0.2, delay: 0, gain: 0.4 },
      { frequency: 280, duration: 0.25, delay: 0.25, gain: 0.45 },
    ],
    review: [
      { frequency: 880, duration: 0.12, delay: 0, gain: 0.35 },
      { frequency: 1174, duration: 0.12, delay: 0.15, gain: 0.35 },
      { frequency: 880, duration: 0.15, delay: 0.3, gain: 0.4 },
    ],
  };

  const tones = presets[variant] || presets.default;
  const startAt = context.currentTime + 0.01;

  tones.forEach((tone) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const toneStart = startAt + tone.delay;
    const toneEnd = toneStart + tone.duration;

    // Use louder waveforms for critical things
    if (variant === 'approved' || variant === 'coins') {
       oscillator.type = 'triangle';
    } else if (variant === 'message' || variant === 'warning') {
       oscillator.type = 'square'; // Very loud and clear
    } else {
       oscillator.type = 'sine';
    }
    
    oscillator.frequency.setValueAtTime(tone.frequency, toneStart);

    const toneGain = Number(tone.gain) || 0.15;

    gainNode.gain.setValueAtTime(0.0001, toneStart);
    gainNode.gain.exponentialRampToValueAtTime(toneGain, toneStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.05);
  });

  lastPlayTimestamp = now;
  return true;
};
