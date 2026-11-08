"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface VoiceResult {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}
export interface VoiceResultEvent {
  resultIndex: number;
  results: { length: number; [index: number]: VoiceResult };
}
export interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: VoiceResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}
export type VoiceError = { code: string; message: string };
const messages: Record<string, string> = {
  "not-allowed":
    "Microphone permission was denied. Allow microphone access to use voice search.",
  "service-not-allowed":
    "Speech recognition is blocked by your browser or device settings.",
  "no-speech":
    "No speech was detected. Try again and speak clearly, or type your search.",
  network:
    "Voice search couldn’t connect. Check your connection and try again, or type your search.",
  aborted: "Voice search was interrupted. Try again, or type your search.",
  "audio-capture":
    "No microphone was found. Check your microphone connection and device settings.",
};
export function useVoiceSearch(onFinal?: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<VoiceError | null>(null);
  const recognition = useRef<BrowserSpeechRecognition | null>(null);
  const mounted = useRef(false);
  const active = useRef(false);
  const generation = useRef(0);
  const finalCallback = useRef(onFinal);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    finalCallback.current = onFinal;
  }, [onFinal]);
  const clearDeadline = useCallback(() => {
    if (deadline.current) clearTimeout(deadline.current);
    deadline.current = null;
  }, []);
  const detach = useCallback(() => {
    clearDeadline();
    generation.current++;
    active.current = false;
    const instance = recognition.current;
    recognition.current = null;
    if (instance) {
      instance.onstart = null;
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      instance.onspeechend = null;
      try {
        instance.abort();
      } catch {
        /* Already stopped. */
      }
    }
  }, [clearDeadline]);
  useEffect(() => {
    mounted.current = true;
    setSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
    return () => {
      mounted.current = false;
      detach();
    };
  }, [detach]);
  const stop = useCallback(
    (discard = false) => {
      const instance = recognition.current;
      if (!instance) return;
      if (discard) {
        detach();
        setListening(false);
        setProcessing(false);
        setInterimTranscript("");
        return;
      }
      if (!active.current) return;
      setListening(false);
      setProcessing(true);
      clearDeadline();
      deadline.current = setTimeout(() => {
        detach();
        if (mounted.current) {
          setListening(false);
          setProcessing(false);
          setInterimTranscript("");
          setError({ code: "no-speech", message: messages["no-speech"] });
        }
      }, 8000);
      try {
        instance.stop();
      } catch {
        detach();
        setProcessing(false);
      }
    },
    [detach, clearDeadline],
  );
  const reset = useCallback(() => {
    detach();
    setListening(false);
    setProcessing(false);
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, [detach]);
  const start = useCallback(() => {
    if (!mounted.current || active.current) return;
    const Constructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      setSupported(false);
      return;
    }
    if (window.isSecureContext === false) {
      setError({
        code: "not-allowed",
        message:
          "Voice search requires HTTPS or localhost. Open a secure version of this page, or type your search.",
      });
      return;
    }
    detach();
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    let instance: BrowserSpeechRecognition;
    try {
      instance = new Constructor();
    } catch {
      setError({
        code: "unavailable",
        message: "Voice search couldn’t start. Try again, or type your search.",
      });
      return;
    }
    recognition.current = instance;
    active.current = true;
    const session = generation.current;
    const valid = () => mounted.current && generation.current === session;
    let delivered = "";
    let failed = false;
    instance.lang = "en-GB";
    instance.interimResults = true;
    instance.continuous = false;
    instance.maxAlternatives = 1;
    instance.onstart = () => {
      if (valid()) {
        setListening(true);
        setProcessing(false);
      }
    };
    instance.onspeechend = () => {
      if (valid() && !delivered) stop();
    };
    instance.onresult = (event) => {
      if (!valid()) return;
      let final = "",
        interim = "";
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result[0]?.transcript || "";
        if (result.isFinal) final += `${text} `;
        else interim += `${text} `;
      }
      final = final.trim();
      setInterimTranscript(interim.trim());
      if (final && final !== delivered) {
        delivered = final;
        setTranscript(final);
        setListening(false);
        setProcessing(false);
        detach();
        finalCallback.current?.(final);
      }
    };
    instance.onerror = (event) => {
      if (!valid()) return;
      failed = true;
      clearDeadline();
      setListening(false);
      setProcessing(false);
      setInterimTranscript("");
      setError({
        code: event.error,
        message:
          messages[event.error] ||
          "Voice search couldn’t complete. Try again, or type your search.",
      });
      // Browsers normally emit onend next. Detach immediately so a retry always works.
      detach();
    };
    instance.onend = () => {
      if (!valid()) return;
      detach();
      setListening(false);
      setProcessing(false);
      setInterimTranscript("");
      if (!delivered && !failed)
        setError({ code: "no-speech", message: messages["no-speech"] });
    };
    setListening(true);
    setProcessing(false);
    try {
      instance.start();
    } catch (cause) {
      detach();
      setListening(false);
      setProcessing(false);
      const denied =
        cause instanceof DOMException &&
        ["NotAllowedError", "SecurityError"].includes(cause.name);
      setError(
        denied
          ? { code: "not-allowed", message: messages["not-allowed"] }
          : {
              code: "unavailable",
              message:
                "Voice search couldn’t start. Try again, or type your search.",
            },
      );
    }
  }, [detach, clearDeadline, stop]);
  return {
    supported,
    listening,
    processing,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
export type VoiceSearchState = ReturnType<typeof useVoiceSearch>;
