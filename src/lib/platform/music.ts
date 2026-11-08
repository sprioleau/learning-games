"use client";

let context: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let volume: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let isDucked = false;

/*
  A mellow original electric-piano loop, rendered once so playback never needs
  network requests or synthesis on the interaction path.
*/
function createMusicBuffer(audio: AudioContext) {
  const beatLength = 0.75;
  const chords = [
    [130.81, 164.81, 196, 246.94],
    [110, 130.81, 164.81, 196],
    [87.31, 130.81, 164.81, 220],
    [98, 123.47, 146.83, 196],
  ];
  const result = audio.createBuffer(1, audio.sampleRate * 24, audio.sampleRate);
  const samples = result.getChannelData(0);
  function addNote(frequency: number, startTime: number, strength: number) {
    const start = Math.round(startTime * audio.sampleRate);
    const length = Math.min(
      Math.round(audio.sampleRate * 2.2),
      samples.length - start,
    );
    for (let sample = 0; sample < length; sample++) {
      const time = sample / audio.sampleRate;
      const envelope = Math.min(time / 0.09, 1) * Math.exp(-time * 2.1);
      const phase = 2 * Math.PI * frequency * time;
      samples[start + sample] +=
        strength * envelope * (Math.sin(phase) + 0.12 * Math.sin(phase * 2));
    }
  }
  for (let bar = 0; bar < 8; bar++) {
    const chord = chords[bar % chords.length];
    const start = bar * beatLength * 4;
    chord.forEach((frequency, index) =>
      addNote(frequency, start + index * 0.025, 0.035),
    );
    addNote(chord[2] * 2, start + beatLength * 1.5, 0.025);
    addNote(chord[1] * 2, start + beatLength * 3, 0.02);
  }
  return result;
}

export function prepareBackgroundMusic() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    if (!context || context.state === "closed") {
      context = new window.AudioContext();
      buffer = createMusicBuffer(context);
      volume = context.createGain();
      volume.gain.value = isDucked ? 0.015 : 0.12;
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
      shouldDuck ? 0.015 : 0.12,
      context.currentTime,
      0.08,
    );
  }
}
