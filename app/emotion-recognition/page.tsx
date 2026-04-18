"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowLeft,
  Camera,
  Loader2,
  Mic,
  MicOff,
  Play,
  Square,
} from "lucide-react";

type EmotionResult = {
  label: string;
  confidence: number;
};

type AnalyzePayload = {
  top_label: string;
  confidence: number;
  distribution: EmotionResult[];
  short_advice: string;
  entropy: number;
  source: "llm" | "heuristic";
  model: string | null;
};

function captureVideoFrame(video: HTMLVideoElement): string | undefined {
  try {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return undefined;
    const w = Math.min(320, vw);
    const h = Math.round((vh / vw) * w);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.55);
  } catch {
    return undefined;
  }
}

function getSpeechRecognitionCtor(): (new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: Event) => void) | null;
  onerror: (() => void) | null;
}) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => never;
    webkitSpeechRecognition?: new () => never;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ?? null;
}

export default function EmotionRecognitionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const transcriptFinalRef = useRef("");
  const transcriptRef = useRef("");
  const notesRef = useRef("");
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzingRef = useRef(false);

  const [isRunning, setIsRunning] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [rmsDb, setRmsDb] = useState<string>("—");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzePayload | null>(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const pushMini = useCallback(
    (
      active: boolean,
      payload: {
        label: string;
        confidence: number;
        frame?: string;
        source?: "llm" | "heuristic";
        short_advice?: string;
      }
    ) => {
      const data = {
        active,
        label: payload.label,
        confidence: payload.confidence,
        frame: payload.frame,
        source: payload.source,
        short_advice: payload.short_advice,
      };
      try {
        localStorage.setItem("emotion-mini-state", JSON.stringify(data));
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event("emotion-mini"));
    },
    []
  );

  const runAnalyze = useCallback(async () => {
    const transcript = transcriptRef.current.trim();
    const n = notesRef.current.trim();
    if (!transcript && !n) return;
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/emotion/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transcript,
          notes: n,
          locale: "zh-CN",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalyzeError(
          typeof data?.error === "string"
            ? data.error
            : res.status === 401
            ? "Please sign in."
            : "Analysis failed."
        );
        return;
      }
      const top_label = data?.top_label as string | undefined;
      const confidence = data?.confidence as number | undefined;
      const distribution = data?.distribution as EmotionResult[] | undefined;
      if (
        typeof top_label !== "string" ||
        typeof confidence !== "number" ||
        !Array.isArray(distribution)
      ) {
        setAnalyzeError("Invalid server response.");
        return;
      }
      const payload: AnalyzePayload = {
        top_label,
        confidence,
        distribution,
        short_advice: typeof data?.short_advice === "string" ? data.short_advice : "",
        entropy: typeof data?.entropy === "number" ? data.entropy : 0,
        source: data?.source === "llm" ? "llm" : "heuristic",
        model: typeof data?.model === "string" ? data.model : null,
      };
      setResult(payload);

      const frame = videoRef.current
        ? captureVideoFrame(videoRef.current)
        : undefined;
      pushMini(true, {
        label: payload.top_label,
        confidence: payload.confidence,
        frame,
        source: payload.source,
        short_advice: payload.short_advice,
      });
    } catch {
      setAnalyzeError("Network error.");
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  }, [pushMini]);

  const stopRmsLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startRmsLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length) || 1e-6;
      const db = 20 * Math.log10(rms);
      setRmsDb(`${db.toFixed(1)} dB`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const teardownMedia = useCallback(() => {
    stopRmsLoop();
    if (analyzeTimerRef.current) {
      clearInterval(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    transcriptFinalRef.current = "";
    transcriptRef.current = "";
    setLiveTranscript("");

    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopRmsLoop]);

  const handleStop = useCallback(async () => {
    await runAnalyze();
    setIsRunning(false);
    teardownMedia();
    pushMini(false, { label: "", confidence: 0 });
  }, [teardownMedia, runAnalyze, pushMini]);

  const handleStart = useCallback(async () => {
    setMediaError(null);
    setSpeechError(null);
    setAnalyzeError(null);
    transcriptFinalRef.current = "";
    transcriptRef.current = "";
    setLiveTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: true,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      sourceNode.connect(analyser);
      analyserRef.current = analyser;
      startRmsLoop();

      const Ctor = getSpeechRecognitionCtor();
      if (Ctor) {
        const rec = new Ctor();
        rec.lang = "zh-CN";
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: Event) => {
          const ev = e as unknown as {
            resultIndex: number;
            results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
          };
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i]!.isFinal) {
              transcriptFinalRef.current += ev.results[i]![0]!.transcript;
            }
          }
          let interim = "";
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (!ev.results[i]!.isFinal) {
              interim += ev.results[i]![0]!.transcript;
            }
          }
          transcriptRef.current = (
            transcriptFinalRef.current + interim
          ).trim();
          setLiveTranscript(transcriptRef.current);
        };
        rec.onerror = () => {
          setSpeechError("Speech recognition error; you can still type notes.");
        };
        try {
          rec.start();
          recognitionRef.current = rec;
        } catch {
          setSpeechError("Could not start speech recognition.");
        }
      }

      setIsRunning(true);

      analyzeTimerRef.current = setInterval(() => {
        void runAnalyze();
      }, 4000);

      setTimeout(() => void runAnalyze(), 500);

      const v = videoRef.current;
      pushMini(true, {
        label: "Listening…",
        confidence: 0.15,
        frame: v ? captureVideoFrame(v) : undefined,
        source: "heuristic",
      });
    } catch {
      setMediaError(
        "Could not access camera/microphone. Allow permissions or check HTTPS."
      );
    }
  }, [startRmsLoop, runAnalyze, pushMini]);

  useEffect(() => () => teardownMedia(), [teardownMedia]);

  const topEmotion = result
    ? { label: result.top_label, confidence: result.confidence }
    : { label: "—", confidence: 0 };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="px-6 py-4 bg-white border-b flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Emotion Recognition
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                Voice & text learning state (camera preview)
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                情绪标签由语音转写与文字说明经服务端分析得到（可选 LLM），非纯人脸分类。请允许摄像头与麦克风。
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-3 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition flex items-center gap-2"
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Play size={14} />
              Start
            </button>
          )}
        </div>
      </header>

      <main className="px-8 py-8 w-full max-w-7xl mx-auto space-y-6">
        {(mediaError || speechError || analyzeError) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-1">
            {mediaError && <p>{mediaError}</p>}
            {speechError && <p>{speechError}</p>}
            {analyzeError && <p>{analyzeError}</p>}
          </div>
        )}

        <div className="grid lg:grid-cols-[520px_1fr] gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Live capture
                </p>
                <h2 className="text-lg font-bold text-slate-900">
                  Camera & microphone
                </h2>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Camera size={16} />
                {speechSupported ? (
                  <Mic size={16} />
                ) : (
                  <span title="Speech API not supported">
                    <MicOff size={16} />
                  </span>
                )}
              </div>
            </div>

            <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 aspect-video max-h-[320px]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                aria-label="Camera preview"
              />
              {!isRunning && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 text-slate-200 text-sm px-4 text-center">
                  Press Start to open the camera (and mic for levels & speech).
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Live transcript {speechSupported ? "(zh-CN)" : "(type below — browser has no SpeechRecognition)"}
              </p>
              <div className="min-h-[72px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                {liveTranscript || "…"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">
                补充说明（与语音一并提交分析）
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：刚才卡在第 3 步、有点焦虑…"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <button
                type="button"
                onClick={() => void runAnalyze()}
                disabled={
                  analyzing ||
                  (!notes.trim() && !liveTranscript.trim())
                }
                className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50 disabled:pointer-events-none"
              >
                Analyze text now
              </button>
              <p className="text-[11px] text-slate-500 flex-1">
                运行中每约 4 秒自动分析；Stop 时会再分析一次。未开摄像头时也可只填说明并点左侧按钮。
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Audio level (RMS)
              </p>
              <div className="h-24 rounded-xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 flex items-center px-4">
                <div className="w-full h-10 bg-[repeating-linear-gradient(90deg,#e2e8f0_0,#e2e8f0_6px,transparent_6px,transparent_12px)] relative overflow-hidden rounded-md">
                  <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,#6366f1_0%,#6366f1_12%,transparent_35%)] opacity-40 animate-pulse"
                    style={{
                      opacity: isRunning ? 0.45 : 0.15,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Predictions
                </p>
                <h2 className="text-lg font-bold text-slate-900">
                  State & confidence
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {analyzing && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Loader2 className="animate-spin" size={14} />
                    Analyzing…
                  </span>
                )}
                {result && (
                  <>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        result.source === "llm"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {result.source === "llm" ? "LLM" : "Rule-based"}
                    </span>
                    {result.source === "llm" && result.model && (
                      <span
                        className="text-[10px] text-slate-500 truncate max-w-[160px]"
                        title={result.model}
                      >
                        {result.model}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                  Top label
                </p>
                <p className="text-lg font-bold text-indigo-900">
                  {topEmotion.label}
                </p>
              </div>
              <p className="text-sm font-semibold text-indigo-800">
                Confidence: {(topEmotion.confidence * 100).toFixed(1)}%
              </p>
            </div>

            {result?.short_advice && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700">
                {result.short_advice}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Distribution
              </p>
              {result && result.distribution.length > 0 ? (
                <div className="space-y-2">
                  {result.distribution.map((e) => (
                    <div key={e.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                        <span>{e.label}</span>
                        <span>{(e.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{
                            width: `${Math.min(100, e.confidence * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Start session and speak or type notes — results appear after the first analysis.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Uncertainty (entropy)
                </p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {result ? result.entropy.toFixed(2) : "—"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Audio RMS (approx.)
                </p>
                <p className="text-lg font-bold text-slate-900 mt-1">{rmsDb}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
