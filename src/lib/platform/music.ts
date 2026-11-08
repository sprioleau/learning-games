"use client";

let context: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let volume: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let isDucked = false;

/*
  A small original music-box melody, rendered once into a seamless loop so
  playback never needs network requests or work on the interaction path.
*/
function createMusicBuffer(audio: AudioContext) {
  const beatLength = 0.5;
  const melody = [
    523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25, 783.99,
    1046.5, 783.99, 698.46, 659.25, 587.33, 0, 523.25, 659.25, 783.99, 659.25,
    587.33, 698.46, 880, 698.46, 659.25, 587.33, 523.25, 587.33, 659.25, 587.33,
    523.25, 0,
  ];
  const result = audio.createBuffer(1, audio.sampleRate * 16, audio.sampleRate);
  const samples = result.getChannelData(0);
  melody.forEach((frequency, index) => {
    if (!frequency) return;
    const start = Math.round(index * beatLength * audio.sampleRate);
    const length = Math.min(
      Math.round(audio.sampleRate * 0.7),
      samples.length - start,
    );
    for (let sample = 0; sample < length; sample++) {
      const time = sample / audio.sampleRate;
      const envelope = Math.min(time / 0.02, 1) * Math.exp(-time * 6);
      samples[start + sample] +=
        envelope *
        (Math.sin(2 * Math.PI * frequency * time) +
          0.2 * Math.sin(2 * Math.PI * frequency * 2 * time)) *
        0.24;
    }
  });
  return result;
}

export function prepareBackgroundMusic() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    if (!context || context.state === "closed") {
      context = new window.AudioContext();
      buffer = createMusicBuffer(context);
      volume = context.createGain();
      volume.gain.value = isDucked ? 0.025 : 0.16;
      volume.connect(context.destination);
    }
    if (!source && context.state !== "running")
      void context.resume().catch(() => undefined);
  } catch {
    /* Audio is optional and must never interrupt play. */
  }
}

export function startBackgroundMusic() {
  if (typeof window === "undefined" || !window.AudioContext || document.hidden)
    return;
  try {
    prepareBackgroundMusic();
    if (!context) return;
    if (!source && buffer && volume) {
      source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(volume);
      source.start();
    }
    if (context.state !== "running")
      void context.resume().catch(() => undefined);
  } catch {
    /* Audio is optional and must never interrupt play. */
  }
}

export function pauseBackgroundMusic() {
  if (context?.state === "running")
    void context.suspend().catch(() => undefined);
}

export function setBackgroundMusicDucked(shouldDuck: boolean) {
  isDucked = shouldDuck;
  if (volume && context) {
    volume.gain.setTargetAtTime(
      shouldDuck ? 0.025 : 0.16,
      context.currentTime,
      0.08,
    );
  }
}
