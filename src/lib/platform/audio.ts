"use client";

let audioContext: AudioContext | null = null;
export type SoundCue = "correct" | "incorrect" | "win";
export function playSound(cue: SoundCue, isEnabled = true) {
  if (!isEnabled || typeof window === "undefined" || !window.AudioContext)
    return;
  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    void context.resume().catch(() => undefined);
    const notes =
      cue === "win"
        ? [523, 659, 784, 1046]
        : cue === "correct"
          ? [523, 784]
          : [260, 220];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = context.currentTime + index * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.25);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* Sound is an enhancement; unavailable audio must not interrupt play. */
  }
}
export function speakWord(
  word: string,
  rate: "gentle" | "normal",
  onUnavailable?: () => void,
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onUnavailable?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = rate === "gentle" ? 0.75 : 0.95;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice =
    voices.find((voice) => voice.lang === "en-US" && voice.localService) ??
    voices.find((voice) => voice.lang === "en-US") ??
    null;
  utterance.onerror = (event) => {
    if (event.error !== "interrupted" && event.error !== "canceled")
      onUnavailable?.();
  };
  window.speechSynthesis.speak(utterance);
}
export function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}
