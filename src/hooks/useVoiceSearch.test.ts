// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useVoiceSearch,
  type BrowserSpeechRecognition,
  type VoiceResultEvent,
} from "./useVoiceSearch";
class Recognition implements BrowserSpeechRecognition {
  static instances: Recognition[] = [];
  lang = "";
  interimResults = false;
  continuous = true;
  maxAlternatives = 5;
  onstart: (() => void) | null = null;
  onresult: ((e: VoiceResultEvent) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    Recognition.instances.push(this);
  }
  result(text: string, final = false) {
    this.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        0: { length: 1, isFinal: final, 0: { transcript: text } },
      },
    });
  }
}
const latest = () => Recognition.instances.at(-1)!;
beforeEach(() => {
  Recognition.instances = [];
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  window.SpeechRecognition = Recognition;
  delete window.webkitSpeechRecognition;
});
afterEach(() => {
  cleanup();
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  vi.useRealTimers();
});
describe("useVoiceSearch", () => {
  it("detects both standard and prefixed APIs and degrades without them", () => {
    delete window.SpeechRecognition;
    let hook = renderHook(() => useVoiceSearch());
    expect(hook.result.current.supported).toBe(false);
    act(() => hook.result.current.start());
    expect(hook.result.current.listening).toBe(false);
    hook.unmount();
    window.webkitSpeechRecognition = Recognition;
    hook = renderHook(() => useVoiceSearch());
    expect(hook.result.current.supported).toBe(true);
  });
  it("configures en-GB and handles interim and final results without submitting", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useVoiceSearch(callback));
    act(() => result.current.start());
    expect(latest()).toMatchObject({
      lang: "en-GB",
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
    });
    expect(result.current.listening).toBe(true);
    act(() => latest().result("three bed"));
    expect(result.current.interimTranscript).toBe("three bed");
    expect(callback).not.toHaveBeenCalled();
    act(() => latest().result("3-bed house in London", true));
    expect(result.current.transcript).toBe("3-bed house in London");
    expect(callback).toHaveBeenCalledExactlyOnceWith("3-bed house in London");
    expect(result.current.listening).toBe(false);
    act(() => latest().onend?.());
    expect(result.current.error).toBeNull();
  });
  it("rebuilds cumulative results and avoids duplicate final callbacks", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useVoiceSearch(callback));
    act(() => result.current.start());
    const event = {
      resultIndex: 1,
      results: {
        length: 2,
        0: { length: 1, isFinal: true, 0: { transcript: "Buy in London" } },
        1: {
          length: 1,
          isFinal: false,
          0: { transcript: "under six hundred" },
        },
      },
    };
    act(() => latest().onresult?.(event));
    expect(result.current.transcript).toBe("Buy in London");
    expect(result.current.interimTranscript).toBe("under six hundred");
    act(() => latest().onresult?.(event));
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it.each([
    "not-allowed",
    "no-speech",
    "network",
    "aborted",
    "audio-capture",
    "service-not-allowed",
  ])("handles %s and allows retry", (code) => {
    const { result } = renderHook(() => useVoiceSearch());
    act(() => result.current.start());
    act(() => latest().onerror?.({ error: code }));
    expect(result.current.error?.code).toBe(code);
    expect(result.current.error?.message.length).toBeGreaterThan(15);
    expect(result.current.listening).toBe(false);
    expect(result.current.processing).toBe(false);
    act(() => result.current.start());
    expect(Recognition.instances).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });
  it("normal stop waits for a final result; typing/discard ignores late events", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useVoiceSearch(callback));
    act(() => result.current.start());
    const original = latest();
    act(() => result.current.stop());
    expect(original.stop).toHaveBeenCalledOnce();
    expect(result.current.processing).toBe(true);
    act(() => original.result("flat in Leeds", true));
    expect(callback).toHaveBeenCalledWith("flat in Leeds");
    act(() => original.onend?.());
    act(() => result.current.start());
    const late = latest().onresult!;
    act(() => result.current.stop(true));
    act(() =>
      late({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, length: 1, 0: { transcript: "late result" } },
        },
      }),
    );
    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.current.processing).toBe(false);
  });
  it("ignores results arriving after onend or unmount", () => {
    const callback = vi.fn();
    const hook = renderHook(() => useVoiceSearch(callback));
    act(() => hook.result.current.start());
    const instance = latest();
    const late = instance.onresult!;
    act(() => instance.onend?.());
    act(() =>
      late({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, length: 1, 0: { transcript: "late" } },
        },
      }),
    );
    expect(callback).not.toHaveBeenCalled();
    act(() => hook.result.current.start());
    const second = latest();
    hook.unmount();
    expect(second.abort).toHaveBeenCalledOnce();
    expect(second.onresult).toBeNull();
  });
  it("times out processing when the browser fails to end", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVoiceSearch());
    act(() => result.current.start());
    act(() => result.current.stop());
    act(() => vi.advanceTimersByTime(8001));
    expect(result.current.processing).toBe(false);
    expect(result.current.error?.code).toBe("no-speech");
  });
  it("clears captured text and errors on reset", () => {
    const { result } = renderHook(() => useVoiceSearch());
    act(() => result.current.start());
    act(() => latest().result("a home", true));
    act(() => result.current.reset());
    expect(result.current.transcript).toBe("");
    expect(result.current.interimTranscript).toBe("");
    expect(result.current.error).toBeNull();
    expect(result.current.listening).toBe(false);
  });
  it("rejects insecure contexts and catches synchronous permission failures", () => {
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
    });
    const { result } = renderHook(() => useVoiceSearch());
    act(() => result.current.start());
    expect(result.current.error?.code).toBe("not-allowed");
    expect(Recognition.instances).toHaveLength(0);
    Object.defineProperty(window, "isSecureContext", {
      value: true,
      configurable: true,
    });
    window.SpeechRecognition = class extends Recognition {
      start = vi.fn(() => {
        throw new DOMException("Blocked", "NotAllowedError");
      });
    };
    act(() => result.current.start());
    expect(result.current.error?.code).toBe("not-allowed");
  });
});
