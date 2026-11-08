"use client";

import { setBackgroundMusicDucked } from "./music";

let audioContext: AudioContext | null = null;
export type SoundCue = "correct" | "incorrect" | "win" | "flip";
let soundBuffers: Record<SoundCue, AudioBuffer> | null = null;
const soundNotes: Record<SoundCue, number[]> = {
  flip: [660],
  correct: [523, 784],
  incorrect: [260, 220],
  win: [523, 659, 784, 1046],
};

function createSoundBuffer(context: AudioContext, cue: SoundCue) {
  const notes = soundNotes[cue];
  const duration = (notes.length - 1) * 0.12 + 0.25;
  const peak = 0.22;
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  notes.forEach((frequency, index) => {
    const start = Math.round(index * 0.12 * context.sampleRate);
    const length = Math.ceil(0.25 * context.sampleRate);
    for (
      let sample = 0;
      sample < length && start + sample < samples.length;
      sample++
    ) {
      const elapsed = sample / context.sampleRate;
      const envelope =
        elapsed < 0.02
          ? (peak * elapsed) / 0.02
          : elapsed < 0.24
            ? peak *
              Math.exp((Math.log(0.001 / peak) * (elapsed - 0.02)) / 0.22)
            : (0.001 * (0.25 - elapsed)) / 0.01;
      samples[start + sample] +=
        Math.sin(2 * Math.PI * frequency * elapsed) * envelope;
    }
  });
  return buffer;
}

/*
  Prepare every effect once. Call this during the first play gesture to unlock
  the audio device before gameplay. Later effects reuse these in-memory samples
  without downloads, decoding, or synthesis on the interaction path.
*/
export function prepareGameAudio() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new window.AudioContext();
      soundBuffers = null;
    }
    if (!soundBuffers) {
      soundBuffers = {
        flip: createSoundBuffer(audioContext, "flip"),
        correct: createSoundBuffer(audioContext, "correct"),
        incorrect: createSoundBuffer(audioContext, "incorrect"),
        win: createSoundBuffer(audioContext, "win"),
      };
    }
    if (audioContext.state !== "running") {
      void audioContext.resume().catch(() => undefined);
    }
  } catch {
    /*
      Unavailable audio must never interrupt a child's game.
    */
  }
}

export function playSound(cue: SoundCue, isEnabled = true) {
  if (!isEnabled) return;
  prepareGameAudio();
  if (!audioContext || !soundBuffers) return;
  try {
    /*
      Sources are single-use Web Audio players; only the lightweight player is
      new per effect. The sound data and audio context stay cached.
    */
    const source = audioContext.createBufferSource();
    source.buffer = soundBuffers[cue];
    source.connect(audioContext.destination);
    source.onended = () => source.disconnect();
    source.start(audioContext.currentTime);
  } catch {
    /*
      Sound is an enhancement; unavailable audio must not interrupt play.
    */
  }
}
export type SpeechOptions = {
  repeatCount?: 1 | 2;
  shouldUseRecording?: boolean;
  recordingPath?: string;
};
let playbackGeneration = 0;
let cancelPendingSpeech: (() => void) | null = null;
const recordedWords = new Map<string, HTMLAudioElement>();

export function warmMathExpression(expression: string) {
  if (typeof window === "undefined") return;
  const match = expression.match(/^\s*(\d+)\s*([+−×÷-])\s*(\d+)\s*$/);
  if (!match) return;
  const operators: Record<string, string> = {
    "+": "plus",
    "−": "minus",
    "-": "minus",
    "×": "times",
    "÷": "divide",
  };
  for (const part of [
    `number-${Number(match[1])}`,
    operators[match[2]],
    `number-${Number(match[3])}`,
  ]) {
    const path = `/assets/audio/parts/${part}.mp3`;
    if (recordedWords.has(path)) continue;
    const audio = new Audio(path);
    audio.preload = "auto";
    audio.load();
    recordedWords.set(path, audio);
  }
}

export function speakMathExpression(
  expression: string,
  rate: "gentle" | "normal",
) {
  const match = expression.match(/^\s*(\d+)\s*([+−×÷-])\s*(\d+)\s*$/);
  if (!match) {
    speakWord(expression, rate);
    return;
  }
  const operators: Record<string, string> = {
    "+": "plus",
    "−": "minus",
    "-": "minus",
    "×": "times",
    "÷": "divide",
  };
  const parts = [
    `number-${Number(match[1])}`,
    operators[match[2]],
    `number-${Number(match[3])}`,
  ];
  stopSpeaking();
  const generation = playbackGeneration;
  let active: HTMLAudioElement | null = null;
  let index = 0;
  setBackgroundMusicDucked(true);
  function cleanup() {
    if (active) {
      active.pause();
      active.onended = null;
      active.onerror = null;
    }
    setBackgroundMusicDucked(false);
  }
  function fallback() {
    if (generation !== playbackGeneration) return;
    cleanup();
    speakWord(expression, rate);
  }
  function playNext() {
    if (generation !== playbackGeneration) return;
    if (index >= parts.length) {
      cleanup();
      return;
    }
    const path = `/assets/audio/parts/${parts[index++]}.mp3`;
    if (!recordedWords.has(path)) recordedWords.set(path, new Audio(path));
    active = recordedWords.get(path)!;
    active.currentTime = 0;
    active.onended = playNext;
    active.onerror = fallback;
    void active.play().catch(fallback);
  }
  cancelPendingSpeech = cleanup;
  playNext();
}

export function warmBingoVoice(words: string[]) {
  if (typeof window === "undefined") return;
  for (const word of words) {
    if (!/^[a-z]+$/.test(word) || recordedWords.has(word)) continue;
    const audio = new Audio(`/assets/audio/bingo/${word}.mp3`);
    audio.preload = "auto";
    audio.load();
    recordedWords.set(word, audio);
  }
}

function getVoiceScore(voice: SpeechSynthesisVoice) {
  const name = `${voice.name} ${voice.voiceURI}`;
  let score = 0;
  if (/natural|neural/i.test(name)) score += 100;
  if (/enhanced|premium|siri/i.test(name)) score += 70;
  if (
    /google.*(?:us|american).*english|samantha|ava|allison|jenny|aria/i.test(
      name,
    )
  )
    score += 35;
  if (voice.default) score += 5;
  if (voice.localService) score += 1;
  return score;
}

function selectVoice(voices: SpeechSynthesisVoice[]) {
  const americanVoices = voices.filter(
    (voice) => voice.lang.replaceAll("_", "-").toLowerCase() === "en-us",
  );
  const englishVoices = americanVoices.length
    ? americanVoices
    : voices.filter((voice) =>
        /^en(?:-|$)/i.test(voice.lang.replaceAll("_", "-")),
      );
  return (
    [...englishVoices].sort(
      (first, second) => getVoiceScore(second) - getVoiceScore(first),
    )[0] ?? null
  );
}

export function speakWord(
  word: string,
  rate: "gentle" | "normal",
  onUnavailable?: () => void,
  options: SpeechOptions = {},
) {
  stopSpeaking();
  if (
    (options.shouldUseRecording || options.recordingPath) &&
    typeof window !== "undefined"
  ) {
    if (options.shouldUseRecording) warmBingoVoice([word]);
    const key = options.recordingPath ?? word;
    if (options.recordingPath && !recordedWords.has(key)) {
      const recording = new Audio(options.recordingPath);
      recording.preload = "auto";
      recordedWords.set(key, recording);
    }
    const audio = recordedWords.get(key);
    if (audio) {
      const generation = playbackGeneration;
      let remaining = options.repeatCount === 2 ? 2 : 1;
      setBackgroundMusicDucked(true);
      function cleanupRecording() {
        audio!.pause();
        audio!.onended = null;
        audio!.onerror = null;
        setBackgroundMusicDucked(false);
      }
      function fallback() {
        if (generation !== playbackGeneration) return;
        cleanupRecording();
        speakWord(word, rate, onUnavailable, {
          repeatCount: options.repeatCount,
        });
      }
      cancelPendingSpeech = cleanupRecording;
      audio.currentTime = 0;
      audio.onended = () => {
        if (--remaining > 0 && generation === playbackGeneration) {
          audio.currentTime = 0;
          void audio.play().catch(fallback);
        } else cleanupRecording();
      };
      audio.onerror = fallback;
      void audio.play().catch(fallback);
      return;
    }
  }
  if (
    typeof window === "undefined" ||
    !window.speechSynthesis ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    onUnavailable?.();
    return;
  }
  const synthesis = window.speechSynthesis;
  const generation = playbackGeneration;
  const repeatCount = options.repeatCount === 2 ? 2 : 1;
  let voicesTimeout: ReturnType<typeof setTimeout> | null = null;
  let repeatTimeout: ReturnType<typeof setTimeout> | null = null;
  let utterance: SpeechSynthesisUtterance | null = null;
  let hasStarted = false;
  let hasFailed = false;

  function cleanup() {
    setBackgroundMusicDucked(false);
    if (voicesTimeout !== null) clearTimeout(voicesTimeout);
    if (repeatTimeout !== null) clearTimeout(repeatTimeout);
    synthesis.removeEventListener?.("voiceschanged", handleVoicesChanged);
    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
    }
    if (generation === playbackGeneration) cancelPendingSpeech = null;
  }
  function fail() {
    if (generation !== playbackGeneration || hasFailed) return;
    hasFailed = true;
    cleanup();
    onUnavailable?.();
  }
  function dispatch(remaining: number, voice: SpeechSynthesisVoice | null) {
    if (generation !== playbackGeneration || hasFailed) return;
    try {
      setBackgroundMusicDucked(true);
      utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.voice = voice;
      utterance.rate = rate === "gentle" ? 0.7 : 0.85;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onerror = (event) => {
        if (generation !== playbackGeneration) return;
        if (event.error === "interrupted" || event.error === "canceled")
          cleanup();
        else fail();
      };
      utterance.onend = () => {
        if (generation !== playbackGeneration) return;
        if (remaining > 1)
          repeatTimeout = setTimeout(() => dispatch(remaining - 1, voice), 400);
        else cleanup();
      };
      synthesis.speak(utterance);
    } catch {
      fail();
    }
  }
  function begin() {
    if (hasStarted || generation !== playbackGeneration) return;
    hasStarted = true;
    if (voicesTimeout !== null) clearTimeout(voicesTimeout);
    synthesis.removeEventListener?.("voiceschanged", handleVoicesChanged);
    try {
      dispatch(repeatCount, selectVoice(synthesis.getVoices()));
    } catch {
      fail();
    }
  }
  function handleVoicesChanged() {
    try {
      if (synthesis.getVoices().length) begin();
    } catch {
      fail();
    }
  }
  cancelPendingSpeech = cleanup;
  try {
    /*
      Some browsers populate voices after the first render. Wait briefly for the
      real voice list, then fall back to the platform's en-US voice if necessary.
    */
    if (
      !synthesis.getVoices().length &&
      typeof synthesis.addEventListener === "function"
    ) {
      synthesis.addEventListener("voiceschanged", handleVoicesChanged);
      voicesTimeout = setTimeout(begin, 650);
    } else begin();
  } catch {
    fail();
  }
}

export function stopSpeaking() {
  playbackGeneration += 1;
  setBackgroundMusicDucked(false);
  cancelPendingSpeech?.();
  cancelPendingSpeech = null;
  try {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  } catch {
    /*
      A platform audio interruption must not prevent a new prompt or navigation.
    */
  }
}
