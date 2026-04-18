"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  GraduationCap,
  ListChecks,
  Loader2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

type Course = { id: string; name: string };

const COURSE_OPTIONS: Course[] = [
  { id: "c-1", name: "Data Structures & Algorithms" },
  { id: "c-2", name: "Database Systems" },
  { id: "c-3", name: "Operating Systems" },
  { id: "c-4", name: "Machine Learning Foundations" },
  { id: "c-5", name: "Computer Networks" },
];

type Recommendation = {
  id: string;
  name: string;
  reason: string;
  score: number;
  details: string;
};

export default function PersonalizedCoursesPage() {
  const [direction, setDirection] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [otherCourses, setOtherCourses] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [suggestCount, setSuggestCount] = useState(3);
  const [results, setResults] = useState<{
    sentiment: string;
    recommendations: Recommendation[];
    scores: { label: string; value: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendMeta, setRecommendMeta] = useState<{
    source: "llm" | "heuristic";
    model: string | null;
  } | null>(null);

  const completedCourseNames = useMemo(
    () =>
      COURSE_OPTIONS.filter((c) => selectedCourses.includes(c.id)).map((c) => c.name),
    [selectedCourses]
  );

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    setRecommendMeta(null);
    try {
      const res = await fetch("/api/personalized-courses/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          direction: direction.trim(),
          completedCourseNames,
          otherCourses: otherCourses.trim(),
          evaluation: evaluation.trim(),
          suggestCount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : res.status === 401
            ? "Please sign in to get recommendations."
            : "Request failed. Please try again."
        );
        return;
      }
      const recs = data?.recommendations as Recommendation[] | undefined;
      const scores = data?.scores as { label: string; value: number }[] | undefined;
      const sentiment = data?.sentiment as string | undefined;
      if (!Array.isArray(recs) || !Array.isArray(scores) || typeof sentiment !== "string") {
        setError("Invalid response from server.");
        return;
      }
      setResults({ sentiment, recommendations: recs, scores });
      setRecommendMeta({
        source: data?.source === "llm" ? "llm" : "heuristic",
        model: typeof data?.model === "string" ? data.model : null,
      });
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="bg-emerald-600 text-white p-2 rounded-lg">
              <GraduationCap size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Personalized Course Suggestion
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                Recommend next courses from your learning history
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
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Left rail: inputs */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Learner inputs
                </p>
                <h2 className="text-lg font-bold text-slate-900">What you’re aiming for</h2>
              </div>
              <ListChecks size={18} className="text-slate-300" />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600">Main direction</label>
              <input
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                placeholder="e.g. ML systems, backend, data platforms..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:bg-white focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600">Completed courses (multi-select)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COURSE_OPTIONS.map((course) => (
                  <label
                    key={course.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${
                      selectedCourses.includes(course.id)
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      className="accent-emerald-600"
                    />
                    <span className="text-slate-800">{course.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600">Other courses</label>
              <input
                value={otherCourses}
                onChange={(e) => setOtherCourses(e.target.value)}
                placeholder="Add any other courses not listed..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:bg-white focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600">Course evaluation text</label>
              <textarea
                value={evaluation}
                onChange={(e) => setEvaluation(e.target.value)}
                placeholder="Paste your feedback or reflection on recent courses..."
                className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:bg-white focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                <span>Number of suggestions</span>
                <span className="text-emerald-700">{suggestCount}</span>
              </div>
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={16} className="text-slate-400" />
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={suggestCount}
                  onChange={(e) => setSuggestCount(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
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
          </section>

          {/* Right: results */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Personalized advice
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  Sentiment & recommendations
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {recommendMeta && (
                  <>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        recommendMeta.source === "llm"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {recommendMeta.source === "llm" ? "LLM" : "Rule-based"}
                    </span>
                    {recommendMeta.source === "llm" && recommendMeta.model && (
                      <span
                        className="text-[10px] text-slate-500 truncate max-w-[200px]"
                        title={recommendMeta.model}
                      >
                        {recommendMeta.model}
                      </span>
                    )}
                  </>
                )}
                <Sparkles size={18} className="text-slate-300" />
              </div>
            </div>

            {results ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Sentiment analysis of your evaluation
                  </p>
                  <p className="text-sm text-emerald-900 mt-1">{results.sentiment}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Top-{results.recommendations.length} recommended courses
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {results.recommendations.map((rec, idx) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">
                            {rec.name}
                          </p>
                          <span className="text-[11px] text-slate-500">#{idx + 1}</span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-1 font-semibold">
                          Score: {rec.score}
                        </p>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                          {rec.reason}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">{rec.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Course details & score breakdown
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {results.scores.map((s) => (
                      <div
                        key={s.label}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50"
                      >
                        <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-1">
                          {s.value} / 100
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Fill in at least one field (direction, completed courses, other courses, or evaluation),
                set suggestion count, then click Generate. With LLM configured you get model-backed
                suggestions; otherwise a deterministic fallback is used.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

