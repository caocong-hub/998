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

function completionRate(records: Module4Input["question_records"]): number {
  if (!records.length) return 0;
  const values = records.map((r) => r.from_practice_record?.completion?.progress ?? 0);
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function buildRuleProfile(input: Module4Input): UpdatedLearnerProfile {
  const ctx = input.module1_to_module4;
  const states = input.question_records
    .map((r) => r.module2_to_module4?.state)
    .filter((s): s is string => typeof s === "string");
  const tags = dominantErrorTags(input.question_records);
  const incorrect = input.question_records.filter((r) => r.from_practice_record?.correctness === false).length;
  const currentDifficulty = Math.max(1, Math.min(5, Number(ctx.difficulty ?? 3)));
  const recommend =
    incorrect >= 2 && states.some((s) => NEGATIVE_STATES.has(s))
      ? Math.max(1, currentDifficulty - 1)
      : currentDifficulty;
  const learnerMastery = Number(
    Math.max(0, Math.min(1, Number(ctx.learner_mastery ?? 0.5) - incorrect * 0.08)).toFixed(2)
  );

  const summary = `Learner needs support on ${tags.slice(0, 2).join(", ") || "core concept understanding"} with observed states: ${
    states.join(", ") || "stable"
  }.`;
  return {
    student_id: input.student_id,
    target_concept: ctx.knowledge_tags?.[0] ?? ctx.node_title ?? "unknown_concept",
    learner_status: ctx.learner_status ?? "unknown",
    learner_mastery: learnerMastery,
    weak_points: tags.slice(0, 3).map((t) => ({ concept: t, evidence: [t] })),
    affective_state_summary: {
      observed_states: states,
      risk_level: states.some((s) => NEGATIVE_STATES.has(s)) ? "medium" : "low",
      recommended_support: states.some((s) => NEGATIVE_STATES.has(s))
        ? "guided_practice"
        : "normal_practice",
    },
    adaptation_strategy: {
      next_step: recommend <= 2 ? "review_then_guided_practice" : "continue_practice",
      recommended_difficulty: recommend,
      focus: ["correct formula recall", "step-by-step application"],
    },
    user_readable_learning_profile: {
      summary,
      dimension_breakdown: [
        {
          dimension: "Reasoning complexity",
          observation: "Needs shorter reasoning chains first.",
          evidence: tags[0] ?? "insufficient evidence",
          action: "Use scaffolded questions with explicit steps.",
        },
        {
          dimension: "Amount of calculation",
          observation: "Keep calculations short before increasing complexity.",
          evidence: `recommended difficulty = ${recommend}`,
          action: "Start from low-load arithmetic substitutions.",
        },
        {
          dimension: "Coherence of wording",
          observation: "Requires concise wording and explicit targets.",
          evidence: "Error tags indicate confusion under complex wording.",
          action: "Use direct prompts and avoid hidden constraints.",
        },
        {
          dimension: "Affective Readiness",
          observation: states.join(", ") || "stable",
          evidence: states.join(", ") || "no negative affective evidence",
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
        error_pattern: tags.join(", ") || "none",
        affective_readiness: states.some((s) => NEGATIVE_STATES.has(s)) ? "low" : "moderate",
        learning_rhythm: "short task cycle with immediate feedback",
        next_actions_for_student: "Review one guided example and complete one scaffolded item.",
      },
    },
  };
}

function buildRuleExercises(input: Module4Input, profile: UpdatedLearnerProfile): AdaptiveExercise[] {
  const difficulty = profile.adaptation_strategy.recommended_difficulty;
  const weak = profile.weak_points[0]?.concept ?? "general_review";
  return [
    {
      exercise_id: "ex_adaptive_001",
      type: "guided_practice",
      difficulty,
      target_weak_point: weak,
      problem:
        "A bag contains 3 red marbles and 2 blue marbles. Use P(A)=n(A)/n(S) to find P(red). Show n(S), n(A), then the final ratio.",
      standard_answer: "n(S)=5, n(A)=3, P(red)=3/5",
      hint: "Count all outcomes for denominator, favorable outcomes for numerator.",
      generation_reason: "Rule fallback generated from weak point and recommended difficulty.",
    },
  ];
}

function buildOverallReason(input: Module4Input, profile: UpdatedLearnerProfile): string[] {
  const tags = dominantErrorTags(input.question_records);
  const reasons = [];
  const allIncorrect =
    input.question_records.length > 0 &&
    input.question_records.every((r) => r.from_practice_record?.correctness === false);
  if (allIncorrect) reasons.push("Recent exercises were incorrect.");
  if (tags.length) reasons.push(`Dominant weak points: ${tags.join(", ")}.`);
  const states = profile.affective_state_summary.observed_states;
  if (states.length) reasons.push(`Emotion signals: ${states.join(", ")}.`);
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

  const retrieval = await retrieveTopKSimilarQuestions(
    generatedExercises[0]?.problem ?? "guided practice",
    5
  );

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
        completion_rate: completionRate(input.question_records),
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
