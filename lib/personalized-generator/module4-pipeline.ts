import { isLlmConfigured } from "@/lib/llm/config";
import {
  llmBuildExercises,
  llmBuildProfile,
} from "@/lib/personalized-generator/module4-llm";
import { retrieveTopKSimilarQuestions } from "@/lib/personalized-generator/module4-retrieval";
import type {
  AdaptiveExercise,
  Module4Input,
  Module4Output,
  UpdatedLearnerProfile,
} from "@/lib/personalized-generator/module4-types";

const NEGATIVE_STATES = new Set(["Sad", "Frustrated", "Confused", "Anxious", "Bored"]);

type InputSignals = {
  dominantErrorTags: string[];
  observedStates: string[];
  incorrectCount: number;
  completionRate: number;
  avgResponseTime: number;
  guessedPattern: boolean;
  formulaInversionDetected: boolean;
  concept: string;
  knowledgeTags: string[];
};

function dominantErrorTags(records: Module4Input["question_records"]): string[] {
  const m = new Map<string, number>();
  for (const r of records) {
    for (const t of r.from_practice_record?.error_tags ?? []) {
      m.set(t, (m.get(t) ?? 0) + 1);
    }
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

function calcCompletionRate(records: Module4Input["question_records"]): number {
  if (!records.length) return 0;
  const values = records.map((r) => r.from_practice_record?.completion?.progress ?? 0);
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function collectSignals(input: Module4Input): InputSignals {
  const attempts = input.question_records.flatMap((r) => r.from_practice_record?.attempt_logs ?? []);
  const avgResponseTime = attempts.length
    ? Number(
        (
          attempts.reduce((sum, a) => sum + (typeof a.response_time === "number" ? a.response_time : 0), 0) /
          attempts.length
        ).toFixed(2)
      )
    : 0;
  const guessedPattern = attempts.length >= 2 && attempts.filter((a) => a.is_correct === false).length >= 2;
  const formulaInversionDetected = attempts.some((a) =>
    (a.answer ?? "").toLowerCase().replace(/\s+/g, "").includes("p(a)=n(s)/n(a)")
  );
  const observedStates = input.question_records
    .map((r) => r.module2_to_module4?.state)
    .filter((s): s is string => typeof s === "string");
  const incorrectCount = input.question_records.filter((r) => r.from_practice_record?.correctness === false).length;
  const concept = input.module1_to_module4.node_title || "unknown concept";
  const knowledgeTags = input.module1_to_module4.knowledge_tags ?? [];
  return {
    dominantErrorTags: dominantErrorTags(input.question_records),
    observedStates,
    incorrectCount,
    completionRate: calcCompletionRate(input.question_records),
    avgResponseTime,
    guessedPattern,
    formulaInversionDetected,
    concept,
    knowledgeTags,
  };
}

function buildRuleProfile(input: Module4Input): UpdatedLearnerProfile {
  const ctx = input.module1_to_module4;
  const signals = collectSignals(input);
  const currentDifficulty = Math.max(1, Math.min(5, Number(ctx.difficulty ?? 3)));
  const recommend =
    signals.incorrectCount >= 2 && signals.observedStates.some((s) => NEGATIVE_STATES.has(s))
      ? Math.max(1, currentDifficulty - 1)
      : currentDifficulty;
  const learnerMastery = Number(
    Math.max(0, Math.min(1, Number(ctx.learner_mastery ?? 0.5) - signals.incorrectCount * 0.08)).toFixed(2)
  );

  const summary = `Learner needs support on ${
    signals.dominantErrorTags.slice(0, 2).join(", ") || "core concept understanding"
  } with observed states: ${
    signals.observedStates.join(", ") || "stable"
  }.`;
  return {
    student_id: input.student_id,
    target_concept: ctx.knowledge_tags?.[0] ?? ctx.node_title ?? "unknown_concept",
    learner_status: ctx.learner_status ?? "unknown",
    learner_mastery: learnerMastery,
    weak_points: signals.dominantErrorTags.slice(0, 3).map((t) => ({
      concept: t,
      evidence: [
        `error_tag=${t}`,
        signals.formulaInversionDetected ? "attempt logs show formula inversion" : "practice errors observed",
      ],
    })),
    affective_state_summary: {
      observed_states: signals.observedStates,
      risk_level: signals.observedStates.some((s) => NEGATIVE_STATES.has(s)) ? "high" : "low",
      recommended_support: signals.observedStates.some((s) => NEGATIVE_STATES.has(s))
        ? "Immediate emotional scaffolding and guided examples before independent tasks."
        : "Normal practice with concise hints.",
    },
    adaptation_strategy: {
      next_step: recommend <= 2 ? "review_then_guided_practice" : "continue_practice",
      recommended_difficulty: recommend,
      focus: [
        signals.formulaInversionDetected ? "Correct formula orientation P(A)=n(A)/n(S)" : "Step-by-step application",
        signals.guessedPattern ? "Replace guessing with explicit reasoning" : "Reinforce concept interpretation",
      ],
    },
    user_readable_learning_profile: {
      summary,
      dimension_breakdown: [
        {
          dimension: "Reasoning complexity",
          observation: recommend <= 2 ? "Needs shorter reasoning chains first." : "Can handle moderate chains.",
          evidence: signals.dominantErrorTags[0] ?? "insufficient evidence",
          action: "Use scaffolded questions with explicit steps.",
        },
        {
          dimension: "Amount of calculation",
          observation: signals.avgResponseTime > 20 ? "Reduce time pressure and calculation load." : "Calculation load can be moderate.",
          evidence: `avg_response_time=${signals.avgResponseTime}s; recommended_difficulty=${recommend}`,
          action: "Start from low-load arithmetic substitutions.",
        },
        {
          dimension: "Coherence of wording",
          observation: "Requires concise wording and explicit targets.",
          evidence: `error tags: ${signals.dominantErrorTags.join(", ") || "none"}`,
          action: "Use direct prompts and avoid hidden constraints.",
        },
        {
          dimension: "Affective Readiness",
          observation: signals.observedStates.join(", ") || "stable",
          evidence: signals.observedStates.join(", ") || "no negative affective evidence",
          action: "Provide supportive hints and quick wins.",
        },
      ],
      math_ability_analysis: {
        reasoning_complexity: recommend <= 2 ? "low" : "medium",
        amount_of_calculation: recommend <= 2 ? "minimal" : "moderate",
        coherence_of_wording: "needs simplification",
      },
      additional_evaluation: {
        concept_mastery: learnerMastery < 0.5 ? "emerging" : "developing",
        error_pattern: signals.dominantErrorTags.join(", ") || "none",
        affective_readiness: signals.observedStates.some((s) => NEGATIVE_STATES.has(s)) ? "low" : "moderate",
        learning_rhythm: "short task cycle with immediate feedback",
        next_actions_for_student: "Review one guided example and complete one scaffolded item.",
      },
    },
  };
}

function buildRuleExercises(input: Module4Input, profile: UpdatedLearnerProfile): AdaptiveExercise[] {
  const difficulty = profile.adaptation_strategy.recommended_difficulty;
  const weak = profile.weak_points[0]?.concept ?? "general_review";
  const signals = collectSignals(input);
  const conceptLabel = signals.concept || "the target concept";

  if (signals.formulaInversionDetected) {
    return [
      {
        exercise_id: "ex_adaptive_formula_fix",
        type: "guided_practice",
        difficulty,
        target_weak_point: weak,
        problem: `For ${conceptLabel}, a bag has 3 red and 2 blue marbles. Fill step by step: n(S)=__, n(A for red)=__, then P(red)=n(A)/n(S)=__/__.`,
        standard_answer: "n(S)=5, n(A)=3, P(red)=3/5",
        hint: "Keep favorable outcomes in numerator and total outcomes in denominator.",
        generation_reason:
          "Dynamic rule: attempt logs showed formula inversion, so this exercise enforces numerator/denominator structure.",
      },
    ];
  }
  if (signals.guessedPattern) {
    return [
      {
        exercise_id: "ex_adaptive_reasoning",
        type: "guided_reasoning",
        difficulty,
        target_weak_point: weak,
        problem: `A coin is tossed 3 times. Instead of guessing, list all outcomes, count total outcomes, then compute P(exactly one head).`,
        standard_answer: "Total outcomes = 8; exactly one head outcomes = 3; probability = 3/8",
        hint: "Write the sample space explicitly before calculating.",
        generation_reason:
          "Dynamic rule: multiple failed attempts indicate guessing pattern, so task requires explicit enumeration and reasoning.",
      },
    ];
  }
  return [
    {
      exercise_id: "ex_adaptive_001",
      type: "guided_practice",
      difficulty,
      target_weak_point: weak,
      problem: `For ${conceptLabel}, solve one short probability item and explain each step in one sentence.`,
      standard_answer: "Expected structure: identify sample space, favorable outcomes, then compute ratio.",
      hint: "Use the lesson formula and keep the explanation concise.",
      generation_reason:
        "Dynamic rule fallback generated from concept, weak point, and recommended difficulty.",
    },
  ];
}

function buildOverallReason(input: Module4Input, profile: UpdatedLearnerProfile): string[] {
  const signals = collectSignals(input);
  const reasons = [];
  const allIncorrect =
    input.question_records.length > 0 &&
    input.question_records.every((r) => r.from_practice_record?.correctness === false);
  if (allIncorrect) reasons.push("Evidence: all recent exercises were incorrect, so remediation is prioritized.");
  if (signals.dominantErrorTags.length) {
    reasons.push(`Evidence: dominant error tags = ${signals.dominantErrorTags.join(", ")}.`);
  }
  if (signals.formulaInversionDetected) {
    reasons.push("Evidence: attempt logs contain inverted formula pattern P(A)=n(S)/n(A).");
  }
  const states = profile.affective_state_summary.observed_states;
  if (states.length) reasons.push(`Evidence: emotion signals = ${states.join(", ")}.`);
  reasons.push("Adaptive strategy prioritizes weak-point repair before harder tasks.");
  return reasons;
}

export async function runModule4Pipeline(input: Module4Input): Promise<Module4Output> {
  let profileSource: "llm" | "rule" = "rule";
  let exerciseSource: "llm" | "rule" = "rule";

  let updatedProfile = buildRuleProfile(input);
  if (isLlmConfigured()) {
    try {
      updatedProfile = await llmBuildProfile(input);
      profileSource = "llm";
    } catch {
      updatedProfile = buildRuleProfile(input);
    }
  }

  let generatedExercises = buildRuleExercises(input, updatedProfile);
  if (isLlmConfigured()) {
    try {
      const llmExercises = await llmBuildExercises(input, updatedProfile);
      if (llmExercises.length) {
        generatedExercises = llmExercises;
        exerciseSource = "llm";
      }
    } catch {
      generatedExercises = buildRuleExercises(input, updatedProfile);
    }
  }

  const retrieval = await retrieveTopKSimilarQuestions(generatedExercises[0]?.problem ?? "guided practice", 5, {
    targetConcept: updatedProfile.target_concept,
    weakPoints: updatedProfile.weak_points.map((w) => w.concept),
    knowledgeTags: input.module1_to_module4.knowledge_tags ?? [],
  });

  const total = input.question_records.length;
  const correct = input.question_records.filter((r) => r.from_practice_record?.correctness === true).length;
  const recommended = updatedProfile.adaptation_strategy.recommended_difficulty;

  return {
    source_module: "module4",
    student_id: input.student_id,
    session_id: input.session_id,
    context: {
      lesson_title: input.module1_to_module4.lesson_title,
      target_node_id: input.module1_to_module4.target_node_id,
      node_type: input.module1_to_module4.node_type,
      node_title: input.module1_to_module4.node_title,
      knowledge_tags: input.module1_to_module4.knowledge_tags ?? [],
    },
    module4_to_module1: {
      target_module: "module1",
      summary: {
        total_exercises: total,
        correct_exercises: correct,
        completion_rate: calcCompletionRate(input.question_records),
        dominant_error_tags: dominantErrorTags(input.question_records),
        recommended_node_difficulty: recommended,
        recommended_decision_type: recommended <= 2 ? "guided_remediation" : "practice_insertion",
      },
    },
    updated_learner_profile: updatedProfile,
    generated_adaptive_exercises: generatedExercises,
    similar_questions_top5: retrieval.items,
    overall_generation_reason: { why_these_exercises: buildOverallReason(input, updatedProfile) },
    meta: {
      profile_source: profileSource,
      exercise_source: exerciseSource,
      retrieval_source: retrieval.source,
      retrieval_error: retrieval.error,
    },
  };
}
