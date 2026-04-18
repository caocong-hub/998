"use client";

import { useEffect, useState } from "react";

type MiniState = {
  active: boolean;
  label: string;
  confidence: number;
  frame?: string;
  source?: "llm" | "heuristic";
  short_advice?: string;
};

const SAMPLE_FRAME =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";

const KEY = "emotion-mini-state";

export function EmotionMini() {
  const [state, setState] = useState<MiniState>({
    active: false,
    label: "Happy",
    confidence: 0.42,
    frame: SAMPLE_FRAME,
  });

  const readState = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MiniState;
      setState((prev) => ({
        active: parsed.active ?? prev.active,
        label: parsed.label ?? prev.label,
        confidence:
          typeof parsed.confidence === "number"
            ? parsed.confidence
            : prev.confidence,
        frame: parsed.frame ?? prev.frame,
        source: parsed.source ?? prev.source,
        short_advice: parsed.short_advice ?? prev.short_advice,
      }));
    } catch {
      // ignore malformed data
    }
  };

  useEffect(() => {
    readState();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) readState();
    };
    const onCustom = () => readState();

    window.addEventListener("storage", onStorage);
    window.addEventListener("emotion-mini", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("emotion-mini", onCustom as EventListener);
    };
  }, []);

  if (!state.active) return null;

  return (
    <div className="fixed bottom-4 right-4 w-64 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-40">
      <div className="h-32 w-full relative">
        <img
          src={state.frame || SAMPLE_FRAME}
          alt="Mini camera"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[11px] px-2 py-1 rounded-md font-semibold">
          Live
        </div>
        {state.source && (
          <div className="absolute top-2 right-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-700">
            {state.source === "llm" ? "LLM" : "Rule"}
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-slate-700">{state.label}</p>
        <p className="text-[11px] text-slate-500">
          Confidence {(state.confidence * 100).toFixed(1)}%
        </p>
        {state.short_advice && (
          <p className="text-[10px] text-slate-600 line-clamp-3 leading-snug">
            {state.short_advice}
          </p>
        )}
      </div>
    </div>
  );
}
