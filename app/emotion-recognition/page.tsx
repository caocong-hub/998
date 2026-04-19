"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Braces,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Mic,
  Radio,
  Scale,
  Video,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type HealthPayload = {
  ok?: boolean;
  checkpoint_loaded?: boolean;
  iemocap_root?: string;
  checkpoint_path?: string;
  error?: string;
};

type PredictPayload = {
  label: string;
  confidence: number;
  probs: number[];
  entropy: number;
  rms: number;
  latency_ms: number;
  labels_order?: string[];
  weights: { Audio: number; Text: number; Visual: number };
  preview: { frames_base64: string[]; audio_available: boolean };
  utterance: { id: string; role: string; text: string; start: number; end: number };
  session: string;
  video: string;
  utterance_index: number;
};

function actionFromLabel(label: string): string {
  if (label === "Sad" || label === "Angry") return "TRIGGER_INTERVENTION";
  if (label === "Happy") return "INCREASE_DIFFICULTY";
  return "MAINTAIN";
}

export default function EmotionRecognitionPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [videos, setVideos] = useState<{ name: string }[]>([]);
  const [videoMsg, setVideoMsg] = useState<string | null>(null);
  const [video, setVideo] = useState<string>("");

  const [dialogue, setDialogue] = useState<
    { id: string; role: string; text: string; start: number; end: number }[]
  >([]);
  const [utteranceIndex, setUtteranceIndex] = useState(0);

  const [result, setResult] = useState<PredictPayload | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [audioLoadError, setAudioLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHealthError(null);
      setListLoading(true);
      try {
        const resHealth = await fetch("/api/m4/health", { credentials: "include" });
        const healthData = (await resHealth.json().catch(() => ({}))) as HealthPayload;
        if (!resHealth.ok) {
          if (resHealth.status === 401) {
            setHealthError("Please sign in.");
          } else if (resHealth.status === 503) {
            setHealthError(
              typeof healthData.error === "string"
                ? healthData.error
                : "M4 API URL is not configured or the service is unavailable."
            );
          } else {
            setHealthError("Could not reach M4 health endpoint.");
          }
        } else if (!cancelled) {
          setHealth(healthData);
        }

        const resSessions = await fetch("/api/m4/sessions", { credentials: "include" });
        const sessData = await resSessions.json().catch(() => ({}));
        if (!resSessions.ok) {
          if (resSessions.status === 401) setHealthError("Please sign in.");
          else if (resSessions.status === 503 && !cancelled) {
            setHealthError(
              typeof sessData.error === "string"
                ? sessData.error
                : "M4 API URL is not configured or the service is unavailable."
            );
          }
        } else if (!cancelled) {
          const list = Array.isArray(sessData?.sessions)
            ? (sessData.sessions as string[])
            : [];
          setSessions(list);
          setSession((prev) => (prev && list.includes(prev) ? prev : list[0] ?? ""));
        }
      } catch {
        if (!cancelled) setHealthError("Network error loading M4.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setVideoMsg(null);
      try {
        const res = await fetch(
          `/api/m4/sessions/${encodeURIComponent(session)}/videos`,
          { credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          const vids = Array.isArray(data?.videos) ? data.videos : [];
          setVideos(vids);
          setVideo(typeof data?.videos?.[0]?.name === "string" ? data.videos[0].name : "");
          if (typeof data?.message === "string") setVideoMsg(data.message);
          else if (vids.length === 0) {
            setVideoMsg("No .avi files in this session. Add dialog/avi to enable full trimodal preview.");
          }
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !video) {
      setDialogue([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDialogueLoading(true);
      try {
        const q = new URLSearchParams({ video });
        const res = await fetch(
          `/api/m4/sessions/${encodeURIComponent(session)}/dialogue?${q}`,
          { credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));
        const lines = Array.isArray(data?.dialogue) ? data.dialogue : [];
        if (!cancelled) {
          setDialogue(lines);
          setUtteranceIndex(0);
        }
      } finally {
        if (!cancelled) setDialogueLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, video]);

  useEffect(() => {
    setAudioLoadError(false);
  }, [session, video, utteranceIndex]);

  const audioSrc = useMemo(() => {
    if (!session || !video || dialogue.length === 0) return null;
    const q = new URLSearchParams({
      video,
      utterance_index: String(utteranceIndex),
    });
    return `/api/m4/sessions/${encodeURIComponent(session)}/utterance-audio?${q.toString()}`;
  }, [session, video, dialogue.length, utteranceIndex]);

  const runPredict = useCallback(async () => {
    if (!session || !video || dialogue.length === 0) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setResult(null);
    try {
      const res = await fetch("/api/m4/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          session,
          video,
          utterance_index: utteranceIndex,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail;
        const msg =
          typeof detail === "object" && detail !== null && typeof detail.message === "string"
            ? detail.message
            : typeof data?.error === "string"
              ? data.error
              : res.status === 400
                ? "Predict failed (missing video/transcript or bad index)."
                : "Analysis failed.";
        setAnalyzeError(msg);
        return;
      }
      setResult(data as PredictPayload);
    } catch {
      setAnalyzeError("Network error.");
    } finally {
      setAnalyzing(false);
    }
  }, [session, video, dialogue.length, utteranceIndex]);

  const labelOrder = result?.labels_order ?? ["Neutral", "Happy", "Sad", "Angry"];

  const radarData = useMemo(() => {
    if (!result) return [];
    return [
      { subject: "Audio", value: (result.weights.Audio ?? 0) * 100 },
      { subject: "Text", value: (result.weights.Text ?? 0) * 100 },
      { subject: "Visual", value: (result.weights.Visual ?? 0) * 100 },
    ];
  }, [result]);

  const jsonSignal = useMemo(() => {
    if (!result) return null;
    return {
      source: "m4",
      id: result.utterance.id,
      state: result.label,
      action: actionFromLabel(result.label),
    };
  }, [result]);

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Emotion Recognition
            </p>
            <h1 className="text-lg font-bold text-slate-900">IEMOCAP trimodal (M4)</h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto space-y-5">
        {(healthError || (health && health.checkpoint_loaded === false)) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-1">
            {healthError && <p>{healthError}</p>}
            {health && health.checkpoint_loaded === false && (
              <p>
                未找到融合模型权重文件，当前分类头为随机初始化，预测仅供参考。请将训练得到的{" "}
                <code className="text-xs">best_trimodal_model.pth</code> 放到默认路径，或设置环境变量{" "}
                <code className="text-xs">M4_CHECKPOINT_PATH</code> 指向该文件后重启 FastAPI。默认查找路径：
                {typeof health.checkpoint_path === "string" && (
                  <code className="text-xs ml-1 block mt-1 break-all">{health.checkpoint_path}</code>
                )}
                说明见仓库 <code className="text-xs">m4/checkpoints/README.md</code>。
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,400px)] gap-5 items-start">
          {/* Left: Control panel */}
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <LayoutDashboard className="text-indigo-600 shrink-0" size={20} />
                Control Panel
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                  1 — Session
                </p>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-sm text-slate-900"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  disabled={listLoading || sessions.length === 0}
                >
                  {sessions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                  2 — Video (.avi)
                </p>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-sm text-slate-900"
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  disabled={listLoading || videos.length === 0}
                >
                  {videos.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {videoMsg && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-2">
                    {videoMsg}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                  3 — Dialogue segment
                </p>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-sm text-slate-900"
                  value={utteranceIndex}
                  onChange={(e) => setUtteranceIndex(Number(e.target.value))}
                  disabled={dialogueLoading || dialogue.length === 0}
                >
                  {dialogue.map((line, i) => (
                    <option key={`${line.id}-${i}`} value={i}>
                      {i}: [{line.role}] {line.text.slice(0, 48)}
                      {line.text.length > 48 ? "…" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {session && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 font-medium">
                  Loaded: {session}
                </div>
              )}
            </div>
          </aside>

          {/* Center: Input modalities */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-2">
              <Radio className="text-slate-400" size={16} />
              Input modalities
            </p>

            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Video size={14} className="text-slate-400" /> 1 — Visual stream
              </p>
              {result && result.preview?.frames_base64?.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {result.preview.frames_base64.map((b64, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/jpeg;base64,${b64}`}
                        alt={`Frame ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-dashed border-slate-200 aspect-video bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 text-center px-1"
                    >
                      Frame {i + 1}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5">
                Run <strong>Analyze segment</strong> on the right to extract frames from video.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Mic size={14} className="text-slate-400" /> 2 — Audio stream
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-900/95 px-3 py-3">
                {audioSrc ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                      key={audioSrc}
                      src={audioSrc}
                      controls
                      className="w-full h-10"
                      preload="metadata"
                      aria-label="Utterance audio sample"
                      onError={() => setAudioLoadError(true)}
                      onLoadedData={() => setAudioLoadError(false)}
                    />
                    {audioLoadError && (
                      <p className="text-[11px] text-amber-300 mt-2">
                        无本地 wav 切片（需在 IEMOCAP 的 sentences/wav 下提供对应句段音频）。
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Select session, video, and a dialogue line.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-slate-400" /> 3 — Text stream
              </p>
              <div className="min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm space-y-2 max-h-[260px] overflow-y-auto">
                {dialogueLoading && <p className="text-slate-400">Loading transcript…</p>}
                {!dialogueLoading &&
                  dialogue.map((line, i) => {
                    const start = Math.max(0, utteranceIndex - 2);
                    const end = Math.min(dialogue.length, utteranceIndex + 3);
                    if (i < start || i >= end) return null;
                    const active = i === utteranceIndex;
                    return (
                      <div
                        key={`ctx-${line.id}-${i}`}
                        className={`rounded-lg px-3 py-2 ${
                          active
                            ? "bg-sky-100 border-l-4 border-sky-600 text-slate-900 shadow-sm"
                            : "bg-white text-slate-500 border border-slate-100"
                        }`}
                      >
                        <span className="font-semibold mr-1">{active ? "▶" : "·"}</span>
                        {line.text}
                      </div>
                    );
                  })}
                {!dialogueLoading && dialogue.length === 0 && (
                  <p className="text-slate-400">No lines parsed for this video.</p>
                )}
              </div>
            </div>
          </section>

          {/* Right: Fusion output */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <button
              type="button"
              onClick={() => void runPredict()}
              disabled={
                analyzing ||
                !session ||
                !video ||
                dialogue.length === 0 ||
                videos.length === 0
              }
              className="w-full px-4 py-3.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Fusing modalities…
                </>
              ) : (
                <>
                  Analyze segment
                  {dialogue[utteranceIndex]?.id ? ` : ${dialogue[utteranceIndex]!.id}` : ""}
                </>
              )}
            </button>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1">
                Fusion output
              </p>
              {analyzing && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 className="animate-spin" size={14} />
                  Analyzing…
                </span>
              )}
            </div>

            {analyzeError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {analyzeError}
              </div>
            )}

            {result ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Prediction</p>
                    <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {result.label.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Confidence</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {(result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Probability
                  </p>
                  {result.probs.map((p, idx) => {
                    const name = labelOrder[idx] ?? `Class ${idx}`;
                    const isTop = result.label === name;
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-800">
                          <span>{isTop ? <strong>{name}</strong> : name}</span>
                          <span>{(p * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isTop ? "bg-indigo-600" : "bg-slate-400"}`}
                            style={{ width: `${Math.min(100, p * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2 flex items-center gap-1.5">
                    <Scale size={14} className="text-slate-400" />
                    Disambiguation (Weights)
                  </p>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fill: "#94a3b8", fontSize: 10 }}
                        />
                        <Radar
                          name="weight"
                          dataKey="value"
                          stroke="#2563eb"
                          fill="#3b82f6"
                          fillOpacity={0.35}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg border border-slate-100 bg-slate-50">
                    <p className="text-[9px] font-semibold uppercase text-slate-500">Entropy</p>
                    <p className="text-sm font-bold text-slate-900">{result.entropy.toFixed(3)}</p>
                  </div>
                  <div className="p-2 rounded-lg border border-slate-100 bg-slate-50">
                    <p className="text-[9px] font-semibold uppercase text-slate-500">RMS</p>
                    <p className="text-sm font-bold text-slate-900">{result.rms.toFixed(4)}</p>
                  </div>
                  <div className="p-2 rounded-lg border border-slate-100 bg-slate-50">
                    <p className="text-[9px] font-semibold uppercase text-slate-500">Latency</p>
                    <p className="text-sm font-bold text-slate-900">{result.latency_ms.toFixed(0)} ms</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2 flex items-center gap-1.5">
                    <Braces size={14} className="text-slate-400" />
                    JSON Signal
                  </p>
                  <pre className="text-xs bg-slate-900 text-slate-100 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed border border-slate-700">
                    {JSON.stringify(jsonSignal, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Select session, video, and dialogue, then click <strong>Analyze segment</strong>.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
