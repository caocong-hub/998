"use client";

import { useState } from "react";
import { ArrowLeft, BrainCircuit, GraduationCap, Loader2, Trash2 } from "lucide-react";
import {
  DEMO_FEEDBACKS,
  FIXED_MATH_COURSE,
  FIXED_MULTIMODAL_EMOTION,
  FIXED_STUDENT_ID,
} from "@/lib/personalized-courses/module3-knowledge";

type ApiResponse = {
  ok: boolean;
  error: string | null;
  source?: string;
  fixedStudent?: { studentId: string; major: string; multimodalEmotion: string };
  input: { feedbackText: string };
  analysis: {
    categoryKey?: string;
    subject: string;
    features: string;
    courses: { name: string; desc: string }[];
    matchedKeywords?: string[];
  }[];
  recommendations: { name: string; desc: string }[];
  explanation?: {
    matchedCategory?: string | null;
    matchedKeywords?: string[];
    rule?: string;
  };
};

export default function PersonalizedCoursesPage() {
  const defaultFeedback = DEMO_FEEDBACKS[0] ?? "";
  const [selectedFeedback, setSelectedFeedback] = useState(DEMO_FEEDBACKS[0] ?? "");
  const [feedbackText, setFeedbackText] = useState(DEMO_FEEDBACKS[0] ?? "");
  const [emotion, setEmotion] = useState(FIXED_MULTIMODAL_EMOTION);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/personalized-courses/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          feedbackText: feedbackText.trim(),
          emotion: emotion.trim(),
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
      if (!Array.isArray(data?.analysis) || !Array.isArray(data?.recommendations)) {
        setError("Invalid response from server.");
        return;
      }
      const normalized = data as ApiResponse;
      setResults({
        ...normalized,
        fixedStudent: {
          studentId: normalized.fixedStudent?.studentId ?? FIXED_STUDENT_ID,
          major: normalized.fixedStudent?.major ?? FIXED_MATH_COURSE,
          multimodalEmotion: emotion.trim() || normalized.fixedStudent?.multimodalEmotion || FIXED_MULTIMODAL_EMOTION,
        },
      });
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setError(null);
    setResults(null);
    setSelectedFeedback(defaultFeedback);
    setFeedbackText(defaultFeedback);
    setEmotion(FIXED_MULTIMODAL_EMOTION);
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Module 3</p>
              <h1 className="text-xl font-bold text-slate-900">
                SA-HGNN Math Recommendation
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-6 py-8 w-full max-w-[1200px] mx-auto space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Input Data</p>
                <h2 className="text-lg font-bold text-slate-900">Student Context & Feedback</h2>
              </div>
              <GraduationCap size={18} className="text-slate-300" />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Student ID</p>
              <p className="text-sm text-slate-900">{FIXED_STUDENT_ID}</p>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Student Major</p>
              <p className="text-sm text-slate-900">{FIXED_MATH_COURSE}</p>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Multimodal Emotion</p>
              <input
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:bg-white focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                placeholder="e.g. Confused, Frustrated, Neutral"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600">Feedback</label>
              <input
                value={selectedFeedback}
                onChange={(e) => {
                  setSelectedFeedback(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                placeholder={defaultFeedback}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600">Learning Feedback Text</label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:bg-white focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Generating...
                  </>
                ) : (
                  "Generate Analysis & Recommendations"
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Clear Data
              </button>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Sentiment Analysis
                </p>
                <h2 className="text-xl font-bold text-slate-900">Analysis Results</h2>
              </div>
              <BrainCircuit size={18} className="text-slate-300" />
            </div>

            {results?.ok && results.analysis.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold">
                    Sentiment Subject
                  </p>
                  <p className="text-sm text-emerald-900 mt-1">{results.analysis[0]?.subject}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                    Sentiment Feature Words
                  </p>
                  <p className="text-sm text-slate-900 mt-1">{results.analysis[0]?.features}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                    Matched Topic Keywords
                  </p>
                  <p className="text-sm text-slate-900 mt-1">
                    {(results.analysis[0]?.matchedKeywords ?? []).join(", ") || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Sentiment Analysis Completed
                </div>
              </div>
            ) : results?.ok === false ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {results.error}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Click the button to run sentiment analysis.
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Output Recommendations
              </p>
              <h2 className="text-xl font-bold text-slate-900">Personalized Math Courses</h2>
            </div>

            {results?.ok && results.recommendations.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Matched Category:</span>{" "}
                    {results.explanation?.matchedCategory ?? "N/A"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Rule:</span>{" "}
                    {results.explanation?.rule ?? "keyword_match + sentiment_features + random_top3_courses"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Source:</span> {results.source ?? "module3-rule-engine"}
                  </p>
                </div>
                {results.recommendations.map((course, index) => (
                  <div key={`${course.name}-${index}`} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">
                      Course {index + 1}: {course.name}
                    </p>
                    <p className="text-sm text-slate-700 mt-2">Description: {course.desc}</p>
                  </div>
                ))}
              </div>
            ) : results?.ok === false ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No recommendation is generated due to invalid feedback text.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Click the button to generate results.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
