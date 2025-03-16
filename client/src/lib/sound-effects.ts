const audioContext = new (window.AudioContext || window.webkitAudioContext)();

type SoundEffect = 'chime' | 'bell' | 'success' | 'none';

function createOscillator(frequency: number, type: OscillatorType = 'sine') {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  return oscillator;
}

export async function playSound(effect: SoundEffect) {
  if (effect === 'none') return;

  try {
    switch (effect) {
      case 'chime':
        // Soft chime sound
        const chime = createOscillator(880);
        chime.start();
        chime.stop(audioContext.currentTime + 0.2);
        break;

      case 'bell':
        // Bell-like sound
        const bell1 = createOscillator(440, 'triangle');
        const bell2 = createOscillator(880, 'triangle');
        bell1.start();
        bell2.start();
        bell1.stop(audioContext.currentTime + 0.3);
        bell2.stop(audioContext.currentTime + 0.3);
        break;

      case 'success':
        // Success sound (ascending notes)
        const notes = [440, 554, 659];
        notes.forEach((freq, i) => {
          const osc = createOscillator(freq);
          osc.start(audioContext.currentTime + i * 0.1);
          osc.stop(audioContext.currentTime + (i * 0.1) + 0.1);
        });
        break;
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

export function initializeAudio() {
  // Resume audio context on user interaction
  const resumeAudio = () => {
    audioContext.resume();
    document.removeEventListener('click', resumeAudio);
  };
  document.addEventListener('click', resumeAudio);
}