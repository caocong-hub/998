"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type {
  AdaptiveExercise,
  SimilarQuestion,
  UpdatedLearnerProfile,
} from "@/lib/personalized-generator/module4-types";

type ProfileResponse = {
  updated_learner_profile?: UpdatedLearnerProfile;
  meta?: { profile_source?: "llm" | "rule" };
};
type ExerciseResponse = {
  generated_adaptive_exercises?: AdaptiveExercise[];
  overall_generation_reason?: { why_these_exercises: string[] };
  meta?: { exercise_source?: "llm" | "rule" };
};
type SimilarResponse = {
  similar_questions_top5?: SimilarQuestion[];
  retrieval_context?: {
    query_used?: string;
    source?: "embedding-index" | "calculus-bank-fallback";
    error?: string;
    features_used?: {
      target_concept?: string;
      weak_points?: string[];
      knowledge_tags?: string[];
    };
  };
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
  const hasAutoLoadedProfileRef = useRef(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<UpdatedLearnerProfile | null>(null);
  const [profileSource, setProfileSource] = useState<"llm" | "rule" | null>(null);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<AdaptiveExercise | null>(null);
  const [exerciseSource, setExerciseSource] = useState<"llm" | "rule" | null>(null);
  const [overallReasons, setOverallReasons] = useState<string[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [similarData, setSimilarData] = useState<SimilarQuestion[]>([]);
  const [retrievalHint, setRetrievalHint] = useState<string | null>(null);
  const [retrievalContext, setRetrievalContext] = useState<SimilarResponse["retrieval_context"] | null>(null);

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
  const userFeatureItems = useMemo(() => {
    if (!profileData) return [] as Array<{ label: string; value: string }>;
    const pairs: Array<{ label: string; value: string }> = [
      {
        label: "Learner status",
        value: sanitizeDisplayText(profileData.learner_status),
      },
      {
        label: "Learner mastery",
        value:
          typeof profileData.learner_mastery === "number"
            ? String(profileData.learner_mastery)
            : "",
      },
      {
        label: "Weak points",
        value: profileData.weak_points
          .map((w) => sanitizeDisplayText(w.concept))
          .filter(Boolean)
          .join(", "),
      },
      {
        label: "Affective states",
        value: profileData.affective_state_summary.observed_states
          .map((s) => sanitizeDisplayText(s))
          .filter(Boolean)
          .join(", "),
      },
      {
        label: "Risk level",
        value: sanitizeDisplayText(profileData.affective_state_summary.risk_level),
      },
      {
        label: "Recommended difficulty",
        value:
          profileData.adaptation_strategy.recommended_difficulty != null
            ? String(profileData.adaptation_strategy.recommended_difficulty)
            : "",
      },
      {
        label: "Next step",
        value: sanitizeDisplayText(profileData.adaptation_strategy.next_step),
      },
    ];
    return pairs.filter((item) => item.value);
  }, [profileData]);

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

  const onGenerateProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await postJson<ProfileResponse>("/api/personalized-generator/profile", requestBody);
      if (!res.ok || !res.data?.updated_learner_profile) {
        setProfileError(res.status === 401 ? "Please sign in first." : "Failed to generate learner profile.");
        return;
      }
      setProfileData(res.data.updated_learner_profile);
      setProfileSource(res.data.meta?.profile_source ?? null);
    } catch {
      setProfileError("Network error while generating learner profile.");
    } finally {
      setProfileLoading(false);
    }
  }, [requestBody]);

  useEffect(() => {
    if (hasAutoLoadedProfileRef.current) return;
    hasAutoLoadedProfileRef.current = true;
    void onGenerateProfile();
  }, [onGenerateProfile]);

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
      setExerciseSource(res.data?.meta?.exercise_source ?? null);
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
      setRetrievalContext(res.data.retrieval_context ?? null);
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
      <main className="px-4 md:px-6 py-8 w-full max-w-[1200px] mx-auto">
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
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                User Features
              </p>
              {!profileData ? (
                <p className="text-xs text-slate-500">
                  Auto loading profile...
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userFeatureItems.map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-100 p-2">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          {item.label}
                        </p>
                        <p className="text-sm text-slate-800 mt-1 break-words">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {!!overallReasons.length && (
                    <div className="pt-1">
                      <p className="text-xs font-semibold text-slate-600">Decision rationale</p>
                      <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 mt-1">
                        {overallReasons.map((r, i) => (
                          <li key={`feature-reason-${i}`}>{sanitizeDisplayText(r)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
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
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Profile</p>
                <button
                  type="button"
                  onClick={onGenerateProfile}
                  disabled={profileLoading}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  aria-label="Refresh profile"
                  title="Refresh profile"
                >
                  {profileLoading ? <Loader2 className="animate-spin" size={14} /> : <RotateCcw size={14} />}
                </button>
              </div>
              {profileError ? <p className="text-sm text-rose-600">{profileError}</p> : null}
              {profileSource ? (
                <p className="text-xs text-slate-500">Profile source: {profileSource.toUpperCase()}</p>
              ) : null}
              {!profileData ? (
                <p className="text-sm text-slate-500">Profile is loading automatically. You can refresh manually if needed.</p>
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
              {exerciseSource ? (
                <p className="text-xs text-slate-500">Exercise source: {exerciseSource.toUpperCase()}</p>
              ) : null}
              {!exerciseData ? (
                <p className="text-sm text-slate-500">Generate adaptive exercise to see results.</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-900">{sanitizeDisplayText(exerciseData.target_weak_point)}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{sanitizeDisplayText(exerciseData.problem)}</p>
                  <p className="text-sm text-slate-700"><span className="font-semibold">Standard answer:</span> {sanitizeDisplayText(exerciseData.standard_answer)}</p>
                  <p className="text-sm text-slate-700"><span className="font-semibold">Hint:</span> {sanitizeDisplayText(exerciseData.hint)}</p>
                  <p className="text-sm text-slate-700"><span className="font-semibold">Generation reason:</span> {sanitizeDisplayText(exerciseData.generation_reason)}</p>
                </>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Similar Questions Top 5</p>
              {similarError ? <p className="text-sm text-rose-600">{similarError}</p> : null}
              {retrievalHint ? <p className="text-xs text-amber-700">{retrievalHint}</p> : null}
              {retrievalContext ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <p>Retrieval source: {retrievalContext.source ?? "N/A"}</p>
                  <p>Query used: {sanitizeDisplayText(retrievalContext.query_used)}</p>
                  {retrievalContext.features_used ? (
                    <p>
                      Features: concept={sanitizeDisplayText(retrievalContext.features_used.target_concept)}; weak=
                      {(retrievalContext.features_used.weak_points ?? []).join(", ") || "N/A"}; tags=
                      {(retrievalContext.features_used.knowledge_tags ?? []).join(", ") || "N/A"}
                    </p>
                  ) : null}
                </div>
              ) : null}
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
