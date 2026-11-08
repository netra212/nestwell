"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, Mic, Square, X } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "@/hooks/use-toast";
const VoicePermissionHelp = dynamic(
  () => import("./VoicePermissionHelp").then((m) => m.VoicePermissionHelp),
  { ssr: false },
);
import type { VoiceSearchState } from "@/hooks/useVoiceSearch";
export const VOICE_HINT_KEY = "nestwell.voice-hint-dismissed.v1";
export function VoiceButton({
  voice,
  statusId,
  disabled = false,
}: {
  voice: VoiceSearchState;
  statusId: string;
  disabled?: boolean;
}) {
  const [unsupportedTip, setUnsupportedTip] = useState(false);
  const [hint, setHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(VOICE_HINT_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);
  function dismiss() {
    setHint(false);
    setDismissed(true);
    try {
      localStorage.setItem(VOICE_HINT_KEY, "true");
    } catch {
      /* Voice search still works without storage. */
    }
  }
  if (!voice.supported)
    return (
      <div className="relative shrink-0">
        <span
          tabIndex={0}
          role="group"
          aria-label="Voice search unavailable"
          aria-describedby={
            unsupportedTip ? `${statusId}-unsupported` : undefined
          }
          onFocus={() => setUnsupportedTip(true)}
          onBlur={() => setUnsupportedTip(false)}
          onMouseEnter={() => setUnsupportedTip(true)}
          onMouseLeave={() => setUnsupportedTip(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setUnsupportedTip(false);
          }}
          className="inline-flex rounded-lg"
        >
          <button
            type="button"
            disabled
            aria-label="Voice search isn't supported in this browser."
            className="pointer-events-none flex size-11 items-center justify-center rounded-lg text-muted-foreground opacity-50"
          >
            <Mic className="size-5" aria-hidden="true" />
          </button>
        </span>
        {unsupportedTip && (
          <p
            id={`${statusId}-unsupported`}
            role="tooltip"
            className="absolute top-14 -right-14 z-40 w-64 max-w-[calc(100vw-3rem)] rounded-lg bg-foreground px-3 py-2 text-xs text-background sm:right-0"
          >
            Voice search isn&apos;t supported in this browser.
          </p>
        )}
      </div>
    );

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={
          voice.listening
            ? "Stop voice search"
            : voice.processing
              ? "Processing voice input"
              : "Start voice search"
        }
        aria-pressed={voice.listening}
        aria-busy={voice.processing}
        aria-describedby={`${statusId}${hint ? ` ${statusId}-hint` : ""}`}
        disabled={disabled || voice.processing}
        onClick={() => {
          if (voice.listening) {
            voice.stop();
            return;
          }
          if (!dismissed) setHint(true);
          voice.start();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && hint) {
            event.preventDefault();
            dismiss();
          }
        }}
        className={`relative flex size-11 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${voice.listening ? "bg-primary/10 text-primary" : "text-primary hover:bg-accent"}`}
      >
        {voice.listening && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full ring-2 ring-primary motion-safe:animate-pulse"
          />
        )}
        {voice.processing ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-5 motion-safe:animate-spin"
          />
        ) : voice.listening ? (
          <Square aria-hidden="true" className="size-4 fill-current" />
        ) : (
          <Mic aria-hidden="true" className="size-5" />
        )}
      </button>
      {hint && (
        <div className="absolute top-14 -right-14 sm:right-0 z-40 w-64 max-w-[calc(100vw-3rem)] rounded-xl border bg-white p-4 pr-9 text-xs leading-relaxed text-foreground shadow-lg">
          <p role="tooltip" id={`${statusId}-hint`}>
            Try saying: &apos;3-bed house in London under £600k&apos;
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss voice tip"
            className="absolute top-2 right-2 rounded p-1"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
export function VoiceFeedback({
  voice,
  id,
}: {
  voice: VoiceSearchState;
  id: string;
}) {
  useEffect(() => {
    if (voice.error)
      toast({
        title: "Voice search unavailable",
        description: voice.error.message,
      });
  }, [voice.error]);
  const denied =
    voice.error?.code === "not-allowed" ||
    voice.error?.code === "service-not-allowed";
  return (
    <div className="mt-2 text-sm text-muted-foreground">
      <div
        id={id}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          voice.listening || voice.processing || voice.transcript || voice.error
            ? "rounded-lg bg-white/60 px-3 py-2 text-xs leading-relaxed"
            : "sr-only"
        }
      >
        {voice.error
          ? voice.error.message
          : voice.listening
            ? voice.interimTranscript
              ? `Listening: ${voice.interimTranscript}`
              : "Listening. Speak your property search, then review the text before submitting."
            : voice.processing
              ? "Processing voice input…"
              : voice.transcript
                ? `Transcript: ${voice.transcript}. Review or edit your search, then press Enter or the search button.`
                : ""}
      </div>
      {denied && <VoicePermissionHelp />}
    </div>
  );
}
