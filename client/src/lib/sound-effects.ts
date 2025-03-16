const audioCache = new Map<string, AudioBuffer>();
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const SOUND_EFFECTS = {
  chime: '/sounds/chime.mp3',
  bell: '/sounds/bell.mp3',
  success: '/sounds/success.mp3',
};

async function loadSound(url: string): Promise<AudioBuffer> {
  if (audioCache.has(url)) {
    return audioCache.get(url)!;
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioCache.set(url, audioBuffer);
  return audioBuffer;
}

export async function playSound(effect: keyof typeof SOUND_EFFECTS) {
  try {
    if (!SOUND_EFFECTS[effect]) return;

    const source = audioContext.createBufferSource();
    source.buffer = await loadSound(SOUND_EFFECTS[effect]);
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

export function initializeAudio() {
  // Pre-load all sounds
  Object.values(SOUND_EFFECTS).forEach(loadSound);
}
