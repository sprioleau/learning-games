/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speakWord, stopSpeaking } from "./audio";

class FakeUtterance {
  text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onend: SpeechSynthesisUtterance["onend"] = null;
  onerror: SpeechSynthesisUtterance["onerror"] = null;
  constructor(text: string) {
    this.text = text;
  }
}
function makeVoice(
  name: string,
  lang = "en-US",
  isLocal = true,
): SpeechSynthesisVoice {
  return { name, lang, voiceURI: name, localService: isLocal, default: false };
}
let voices: SpeechSynthesisVoice[];
let events: EventTarget;
const speak = vi.fn<(utterance: SpeechSynthesisUtterance) => void>();
const cancel = vi.fn();
const getVoices = vi.fn(() => voices);
const onUnavailable = vi.fn();
function getUtterance(index = 0) {
  return speak.mock.calls[index][0];
}
function finish(utterance: SpeechSynthesisUtterance) {
  utterance.onend?.call(utterance, {} as SpeechSynthesisEvent);
}
function fail(
  utterance: SpeechSynthesisUtterance,
  error: SpeechSynthesisErrorCode,
) {
  utterance.onerror?.call(utterance, { error } as SpeechSynthesisErrorEvent);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  voices = [makeVoice("Basic US English")];
  events = new EventTarget();
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak,
      cancel,
      getVoices,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    },
  });
});
afterEach(() => {
  stopSpeaking();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("clear spoken word prompts", () => {
  it("prefers a natural US voice over a basic local voice and uses slower natural-pitch speech at full volume", () => {
    const natural = makeVoice(
      "Microsoft Aria Online (Natural)",
      "en-US",
      false,
    );
    voices = [
      makeVoice("Basic US English"),
      makeVoice("Enhanced British", "en-GB"),
      natural,
    ];
    speakWord("cat", "gentle", onUnavailable);
    expect(getUtterance()).toMatchObject({
      text: "cat",
      lang: "en-US",
      voice: natural,
      rate: 0.7,
      pitch: 1,
      volume: 1,
    });
    expect(onUnavailable).not.toHaveBeenCalled();
  });
  it("uses an enhanced US voice when natural voices are unavailable and preserves a clear normal pace", () => {
    const enhanced = makeVoice("Samantha (Enhanced)");
    voices = [makeVoice("Basic US English"), enhanced];
    speakWord("sun", "normal");
    expect(getUtterance()).toMatchObject({ voice: enhanced, rate: 0.85 });
  });
  it("waits for an asynchronously available voice list instead of permanently choosing the basic default", () => {
    voices = [];
    speakWord("hat", "gentle", onUnavailable);
    expect(speak).not.toHaveBeenCalled();
    voices = [makeVoice("Ava Premium")];
    events.dispatchEvent(new Event("voiceschanged"));
    expect(getUtterance().voice).toBe(voices[0]);
    vi.advanceTimersByTime(1000);
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it("falls back to the browser's en-US voice if its voice list never becomes available", () => {
    voices = [];
    speakWord("dog", "gentle", onUnavailable);
    vi.advanceTimersByTime(650);
    expect(getUtterance()).toMatchObject({
      text: "dog",
      lang: "en-US",
      voice: null,
    });
    expect(onUnavailable).not.toHaveBeenCalled();
  });
  it("repeats the word only after the first utterance finishes, with a short listening pause", () => {
    speakWord("map", "gentle", onUnavailable, { repeatCount: 2 });
    expect(speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(speak).toHaveBeenCalledTimes(1);
    finish(getUtterance());
    vi.advanceTimersByTime(399);
    expect(speak).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(speak).toHaveBeenCalledTimes(2);
    expect(getUtterance(1).text).toBe("map");
    finish(getUtterance(1));
    vi.runAllTimers();
    expect(speak).toHaveBeenCalledTimes(2);
  });
  it("cancels a pending repeat when the player moves to another word", () => {
    speakWord("cat", "gentle", onUnavailable, { repeatCount: 2 });
    const first = getUtterance();
    finish(first);
    speakWord("bus", "gentle", onUnavailable);
    vi.runAllTimers();
    expect(speak.mock.calls.map(([utterance]) => utterance.text)).toEqual([
      "cat",
      "bus",
    ]);
    expect(cancel).toHaveBeenCalledTimes(2);
  });
  it("cancels pending voice loading on navigation without speaking a stale prompt", () => {
    voices = [];
    speakWord("fox", "gentle", onUnavailable);
    stopSpeaking();
    voices = [makeVoice("Ava Premium")];
    events.dispatchEvent(new Event("voiceschanged"));
    vi.runAllTimers();
    expect(speak).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
  });
  it("shows the written-word fallback on a genuine speech failure and does not repeat", () => {
    speakWord("pen", "gentle", onUnavailable, { repeatCount: 2 });
    fail(getUtterance(), "not-allowed");
    vi.runAllTimers();
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it("does not treat intentional interruption as a missing speech capability", () => {
    speakWord("hop", "gentle", onUnavailable, { repeatCount: 2 });
    fail(getUtterance(), "interrupted");
    vi.runAllTimers();
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it("provides the written-word fallback if the browser has no speech API", () => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: undefined,
    });
    speakWord("red", "gentle", onUnavailable);
    expect(onUnavailable).toHaveBeenCalledOnce();
  });
});

class FakeSoundContext {
  state: AudioContextState = "suspended";
  sampleRate = 8000;
  currentTime = 7;
  destination = {};
  createBuffer = vi.fn((_channels: number, length: number) => {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples } as unknown as AudioBuffer;
  });
  createBufferSource = vi.fn(() => ({
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    onended: null as (() => void) | null,
  }));
  resume = vi.fn(async () => {
    this.state = "running";
  });
}

describe("prepared game sound effects", () => {
  let soundApi: typeof import("./audio");
  let contexts: FakeSoundContext[];
  beforeEach(async () => {
    vi.resetModules();
    contexts = [];
    vi.stubGlobal(
      "AudioContext",
      class extends FakeSoundContext {
        constructor() {
          super();
          contexts.push(this);
        }
      },
    );
    soundApi = await import("./audio");
  });
  it("prepares all effects once and immediately reuses their samples with fresh players", () => {
    soundApi.prepareGameAudio();
    soundApi.prepareGameAudio();
    expect(contexts).toHaveLength(1);
    const context = contexts[0];
    expect(context.createBuffer).toHaveBeenCalledTimes(4);
    expect(context.resume).toHaveBeenCalledOnce();
    soundApi.playSound("correct");
    soundApi.playSound("incorrect");
    soundApi.playSound("win");
    soundApi.playSound("correct");
    expect(context.createBuffer).toHaveBeenCalledTimes(4);
    const players = context.createBufferSource.mock.results.map(
      (result) => result.value,
    );
    expect(players).toHaveLength(4);
    expect(players[0]).not.toBe(players[3]);
    expect(players[0].buffer).toBe(players[3].buffer);
    expect(
      new Set(players.slice(0, 3).map((player) => player.buffer)).size,
    ).toBe(3);
    for (const player of players) {
      expect(player.start).toHaveBeenCalledWith(7);
      expect(
        player.buffer!.getChannelData(0).some((sample: number) => sample !== 0),
      ).toBe(true);
      player.onended?.();
      expect(player.disconnect).toHaveBeenCalledOnce();
    }
  });
  it("does not initialize or play effects when muted", () => {
    soundApi.playSound("correct", false);
    expect(contexts).toHaveLength(0);
    soundApi.prepareGameAudio();
    soundApi.playSound("win", false);
    expect(contexts[0].createBufferSource).not.toHaveBeenCalled();
  });
  it("rebuilds the cache only when the browser has closed its audio context", () => {
    soundApi.prepareGameAudio();
    contexts[0].state = "closed";
    soundApi.playSound("correct");
    expect(contexts).toHaveLength(2);
    expect(contexts[1].createBuffer).toHaveBeenCalledTimes(4);
    expect(contexts[1].createBufferSource).toHaveBeenCalledOnce();
    expect(contexts[0].createBufferSource).not.toHaveBeenCalled();
  });
});
