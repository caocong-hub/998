"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Target, Wand2 } from "lucide-react";

import { pickRandomCalculusProblems } from "@/lib/personalized-generator/calculus-bank";

type Mode = "recommend" | "generate" | "weak-practice";

const MODE_OPTIONS: { id: Mode; title: string; desc: string }[] = [
  {
    id: "recommend",
    title: "Recommend candidate set (bank)",
    desc: "Randomly generate five practice problems from the calculus bank.",
  },
  {
    id: "generate",
    title: "Generate one new problem (LLM)",
    desc: "Create a fresh problem tailored to the learner profile.",
  },
  {
    id: "weak-practice",
    title: "Weak concepts random bank practice",
    desc: "Surface random practice items for weak concepts.",
  },
];

export default function PersonalizedGeneratorPage() {
  const [mode, setMode] = useState<Mode>("recommend");
  const [minAttempts, setMinAttempts] = useState<number>(2);
  const [topK, setTopK] = useState<number>(3);
  const [generated, setGenerated] = useState<
    { id: string; title: string; stem: string; mode: Mode }[]
  >([]);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateMeta, setGenerateMeta] = useState<{
    source: "llm" | "mock";
    model: string | null;
  } | null>(null);

  const profile = useMemo(
    () => ({
      name: "Learner A (demo)",
      level: "Intermediate",
      strengths: ["Core definitions", "Formula recall"],
      weaknesses: ["Application steps", "Edge cases"],
      recs: [
        "Revisit step-by-step examples with guided prompts.",
        "Focus on error-analysis drills for common mistakes.",
        "Mix 3–5 short practice items before a new concept.",
      ],
    }),
    []
  );

  const handleGenerate = async () => {
    setError(null);

    if (mode === "generate") {
      setLoading(true);
      setGenerateMeta(null);
      try {
        const res = await fetch("/api/personalized-generator/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            profile,
            topic: topic.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : res.status === 401
              ? "Please sign in to generate a problem."
              : "Generation failed. Please try again."
          );
          return;
        }
        const problem = data?.problem as { title?: string; stem?: string } | undefined;
        if (!problem?.title || !problem?.stem) {
          setError("Invalid response from server.");
          return;
        }
        const source = data?.source === "llm" ? "llm" : "mock";
        setGenerateMeta({
          source,
          model: typeof data?.model === "string" ? data.model : null,
        });
        setGenerated([
          {
            id: `p-${Date.now()}-0`,
            title: problem.title,
            stem: problem.stem,
            mode: "generate",
          },
        ]);
      } catch {
        setError("Network error. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setGenerateMeta(null);

    if (mode === "recommend") {
      const picked = pickRandomCalculusProblems(5);
      const t = Date.now();
      setGenerated(
        picked.map((q, idx) => ({
          id: `p-${t}-${idx}-${q.id}`,
          title: `${q.title} · Calculus bank · top k=${topK}, min attempts=${minAttempts}`,
          stem: q.stem,
          mode: "recommend",
        }))
      );
      return;
    }

    const modeLabel = "Weak concept practice";

    const stems = [
      "Apply the core formula to a real-world scenario; explain each substitution step.",
      "Identify the weak step in a multi-stage solution and correct it.",
      "Provide a short numerical example and ask for a boundary-case check.",
      "Offer a common mistake and ask the learner to debug the reasoning.",
      "Create a quick reflection prompt: what changes if one key parameter doubles?",
    ];

    const batch = stems.map((stem, idx) => ({
      id: `p-${Date.now()}-${idx}`,
      title: `${modeLabel} · top k=${topK}, min attempts=${minAttempts}`,
      stem,
      mode,
    }));

    setGenerated(batch);
  };

  const resultsHeading =
    mode === "generate"
      ? generated.length === 0
        ? "Generated problem"
        : `Generated problem (${generated.length})`
      : generated.length === 0
      ? "Latest batch"
      : `Latest batch (${generated.length})`;

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="px-6 py-4 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-violet-600 text-white p-2 rounded-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Personalized Problem Generation
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                Craft questions from learner profile
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 w-full max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        {/* Left rail */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Mode
              </p>
              <h2 className="text-lg font-bold text-slate-900">
                Choose how to generate
              </h2>
            </div>
            <Wand2 size={18} className="text-slate-300" />
          </div>

          <div className="space-y-3">
            {MODE_OPTIONS.map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    active
                      ? "border-violet-600 bg-violet-50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      active ? "text-violet-800" : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
              <span>Weak concept: min attempts</span>
              <span className="text-violet-700">{minAttempts}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              value={minAttempts}
              onChange={(e) => setMinAttempts(Number(e.target.value))}
              className="w-full accent-violet-600"
            />

            <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
              <span>Weak concept: top k</span>
              <span className="text-violet-700">{topK}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>
        </section>

        {/* Right content */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Personalized learning profile
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Adaptive signals and next steps
              </h2>
            </div>
            <Target size={20} className="text-slate-300" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Learner
              </p>
              <p className="text-base font-semibold text-slate-900 mt-1">
                {profile.name}
              </p>
              <p className="text-sm text-slate-500">Level: {profile.level}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Weakness focus
              </p>
              <p className="text-sm text-slate-700">
                {profile.weaknesses.join(", ")}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Min attempts: {minAttempts} · Top k: {topK}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Recommendations
            </p>
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              {profile.recs.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Mode summary
            </p>
            <p className="text-sm text-violet-900 mt-1">
              {mode === "recommend" &&
                "Generate exactly five random calculus-bank problems each time you click Generate."}
              {mode === "generate" &&
                "We will ask LLM to produce one fresh problem matching your profile."}
              {mode === "weak-practice" &&
                "We will pull random practice items targeting weak areas."}
            </p>
          </div>

          {mode === "generate" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Optional topic
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. linear algebra, recursion, a specific chapter…"
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition shadow-lg shadow-violet-200 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Generating…
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </section>
        </div>

        {/* Generated results */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Generated problems
              </p>
              <h2 className="text-lg font-bold text-slate-900">{resultsHeading}</h2>
            </div>
            {mode === "generate" && generateMeta && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    generateMeta.source === "llm"
                      ? "bg-violet-100 text-violet-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {generateMeta.source === "llm" ? "LLM" : "Demo fallback"}
                </span>
                {generateMeta.source === "llm" && generateMeta.model && (
                  <span
                    className="text-[10px] text-slate-500 truncate max-w-[220px]"
                    title={generateMeta.model}
                  >
                    {generateMeta.model}
                  </span>
                )}
              </div>
            )}
          </div>

          {generated.length === 0 ? (
            <p className="text-sm text-slate-500">
              No problems yet. Choose a mode and click Generate to see samples here.
            </p>
          ) : (
            <div className="space-y-3">
              {generated.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {item.mode === "generate"
                        ? "LLM problem"
                        : item.mode === "recommend"
                        ? "Bank recommendation"
                        : "Weak concept practice"}
                    </p>
                    <span className="text-[11px] text-slate-400">#{idx + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                    {item.stem}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

