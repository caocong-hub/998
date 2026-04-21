"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import type {
  AdaptiveExercise,
  SimilarQuestion,
  UpdatedLearnerProfile,
} from "@/lib/personalized-generator/module4-types";

type ProfileResponse = { updated_learner_profile?: UpdatedLearnerProfile };
type ExerciseResponse = {
  generated_adaptive_exercises?: AdaptiveExercise[];
  overall_generation_reason?: { why_these_exercises: string[] };
};
type SimilarResponse = {
  similar_questions_top5?: SimilarQuestion[];
};

function sanitizeDisplayText(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\cdots/g, "...")
    .replace(/\\times/g, "x")
    .replace(/\\div/g, "/")
    .replace(/\u200b/g, "")
    .trim();
}

function formatSimilarity(score: number | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) return "N/A";
  return `${(score * 100).toFixed(1)}%`;
}

export default function PersonalizedGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<UpdatedLearnerProfile | null>(null);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<AdaptiveExercise | null>(null);
  const [overallReasons, setOverallReasons] = useState<string[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [similarData, setSimilarData] = useState<SimilarQuestion[]>([]);
  const [retrievalHint, setRetrievalHint] = useState<string | null>(null);

  const profile = useMemo(
    () => ({
      name: "Learner A (demo)",
      level: "Intermediate",
      strengths: ["Core definitions", "Formula recall"],
      weaknesses: ["Application steps", "Edge cases"],
      recs: [
        "Revisit step-by-step examples with guided prompts.",
        "Focus on error-analysis drills for common mistakes.",
        "Mix 3-5 short practice items before a new concept.",
      ],
    }),
    []
  );

  const requestBody = useMemo(() => ({ profile, topic: topic.trim() || undefined }), [profile, topic]);

  async function postJson<T>(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  }

  const onGenerateProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await postJson<ProfileResponse>("/api/personalized-generator/profile", requestBody);
      if (!res.ok || !res.data?.updated_learner_profile) {
        setProfileError(res.status === 401 ? "Please sign in first." : "Failed to generate learner profile.");
        return;
      }
      setProfileData(res.data.updated_learner_profile);
    } catch {
      setProfileError("Network error while generating learner profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const onGenerateExercise = async () => {
    setExerciseLoading(true);
    setExerciseError(null);
    try {
      const res = await postJson<ExerciseResponse>("/api/personalized-generator/exercise", requestBody);
      const first = res.data?.generated_adaptive_exercises?.[0];
      if (!res.ok || !first) {
        setExerciseError(res.status === 401 ? "Please sign in first." : "Failed to generate adaptive exercise.");
        return;
      }
      setExerciseData(first);
      setOverallReasons(res.data?.overall_generation_reason?.why_these_exercises ?? []);
    } catch {
      setExerciseError("Network error while generating adaptive exercise.");
    } finally {
      setExerciseLoading(false);
    }
  };

  const onRetrieveSimilar = async () => {
    setSimilarLoading(true);
    setSimilarError(null);
    try {
      const query = exerciseData?.problem;
      const res = await postJson<SimilarResponse>("/api/personalized-generator/similar", {
        ...requestBody,
        query,
      });
      if (!res.ok || !res.data?.similar_questions_top5) {
        setSimilarError(res.status === 401 ? "Please sign in first." : "Failed to retrieve similar questions.");
        return;
      }
      setSimilarData(res.data.similar_questions_top5);
      setRetrievalHint(!query ? "No generated exercise found, retrieval used fallback query." : null);
    } catch {
      setSimilarError("Network error while retrieving similar questions.");
    } finally {
      setSimilarLoading(false);
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
            <div className="bg-violet-600 text-white p-2 rounded-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Module4 Personalized Generation
              </p>
              <h1 className="text-xl font-bold text-slate-900">Independent Action Workflow</h1>
            </div>
          </div>
        </div>
      </header>
      <main className="px-8 py-8 w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 h-fit">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</p>
            <h2 className="text-lg font-bold text-slate-900">Module4 Controls</h2>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Optional Topic
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. probability basics, linear algebra..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={onGenerateProfile}
              disabled={profileLoading}
              className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {profileLoading ? <Loader2 className="animate-spin" size={16} /> : null}
              Generate Learner Profile
            </button>
            <button
              type="button"
              onClick={onGenerateExercise}
              disabled={exerciseLoading}
              className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {exerciseLoading ? <Loader2 className="animate-spin" size={16} /> : null}
              Generate Adaptive Exercise
            </button>
            <button
              type="button"
              onClick={onRetrieveSimilar}
              disabled={similarLoading}
              className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {similarLoading ? <Loader2 className="animate-spin" size={16} /> : null}
              Retrieve Similar Questions Top 5
            </button>
          </section>
          <section className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Learner Profile</p>
              {profileError ? <p className="text-sm text-rose-600">{profileError}</p> : null}
              {!profileData ? (
                <p className="text-sm text-slate-500">Generate learner profile to see results.</p>
              ) : (
                <>
                  <p className="text-sm text-slate-800">{sanitizeDisplayText(profileData.user_readable_learning_profile.summary)}</p>
                  <div className="space-y-2">
                    {profileData.user_readable_learning_profile.dimension_breakdown.map((item, idx) => (
                      <div key={`${item.dimension}-${idx}`} className="rounded-lg border border-slate-100 p-3">
                        <p className="font-medium text-sm">{item.dimension}</p>
                        <p className="text-sm text-slate-700">Observation: {sanitizeDisplayText(item.observation)}</p>
                        <p className="text-sm text-slate-700">Evidence: {sanitizeDisplayText(item.evidence)}</p>
                        <p className="text-sm text-slate-700">Action: {sanitizeDisplayText(item.action)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Adaptive Exercise</p>
              {exerciseError ? <p className="text-sm text-rose-600">{exerciseError}</p> : null}
              {!exerciseData ? (
                <p className="text-sm text-slate-500">Generate adaptive exercise to see results.</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-900">{sanitizeDisplayText(exerciseData.target_weak_point)}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{sanitizeDisplayText(exerciseData.problem)}</p>
                  <p className="text-sm text-slate-700"><span className="font-semibold">Standard answer:</span> {sanitizeDisplayText(exerciseData.standard_answer)}</p>
                  <p className="text-sm text-slate-700"><span className="font-semibold">Hint:</span> {sanitizeDisplayText(exerciseData.hint)}</p>
                  <p className="text-sm text-slate-700"><span className="font-semibold">Generation reason:</span> {sanitizeDisplayText(exerciseData.generation_reason)}</p>
                  {!!overallReasons.length && (
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                      {overallReasons.map((r, i) => <li key={`${r}-${i}`}>{sanitizeDisplayText(r)}</li>)}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Similar Questions Top 5</p>
              {similarError ? <p className="text-sm text-rose-600">{similarError}</p> : null}
              {retrievalHint ? <p className="text-xs text-amber-700">{retrievalHint}</p> : null}
              {!similarData.length ? (
                <p className="text-sm text-slate-500">Retrieve similar questions to see results.</p>
              ) : (
                <div className="space-y-3">
                  {similarData.map((item) => (
                    <div key={item.question_id} className="p-3 rounded-lg border border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{sanitizeDisplayText(item.question)}</p>
                      <p className="text-xs text-slate-500 mt-1">Similarity: {formatSimilarity(item.similarity_score)}</p>
                      <p className="text-sm text-slate-700 mt-1"><span className="font-semibold">Answer:</span> {sanitizeDisplayText(Array.isArray(item.answer) ? item.answer.join(", ") : item.answer)}</p>
                      <p className="text-sm text-slate-700 mt-1 line-clamp-4"><span className="font-semibold">Step-by-step solution:</span> {sanitizeDisplayText(item.step_by_step_solution_text) || "Unavailable"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
