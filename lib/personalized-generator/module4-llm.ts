import { chatCompletionContent } from "@/lib/teaching-path/llm-client";
import type { Module4Input, UpdatedLearnerProfile, AdaptiveExercise } from "@/lib/personalized-generator/module4-types";

function parseJsonObject(raw: string): unknown {
  const text = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(text);
  return JSON.parse((fence?.[1] ?? text).trim());
}

export async function llmBuildProfile(input: Module4Input): Promise<UpdatedLearnerProfile> {
  const system =
    "You generate strict JSON only for adaptive learning profile. Every conclusion must cite evidence from question_records/module2_to_module4/module1_to_module4.";
  const user = [
    "Return one JSON object for updated_learner_profile fields:",
    "student_id,target_concept,learner_status,learner_mastery,weak_points,affective_state_summary,adaptation_strategy,user_readable_learning_profile",
    "Use English only. Keep recommended_difficulty in [1,5].",
    "If evidence is weak, explicitly say so in evidence strings.",
    `Input: ${JSON.stringify(input)}`,
  ].join("\n");
  const raw = await chatCompletionContent({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return parseJsonObject(raw) as UpdatedLearnerProfile;
}

export async function llmBuildExercises(
  input: Module4Input,
  profile: UpdatedLearnerProfile
): Promise<AdaptiveExercise[]> {
  const system =
    "You generate strict JSON only for adaptive exercises. Exercises must directly target weak points and emotional risk from input evidence.";
  const user = [
    "Return JSON object: {\"exercises\":[...]}",
    "Each exercise keys: exercise_id,type,difficulty,target_weak_point,problem,standard_answer,hint,generation_reason",
    `Use recommended_difficulty=${profile.adaptation_strategy.recommended_difficulty}.`,
    "generation_reason must explicitly include which input fields triggered this exercise.",
    `Input: ${JSON.stringify({ input, profile })}`,
  ].join("\n");
  const raw = await chatCompletionContent({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const parsed = parseJsonObject(raw) as { exercises?: AdaptiveExercise[] } | AdaptiveExercise[];
  if (Array.isArray(parsed)) return parsed;
  return Array.isArray(parsed?.exercises) ? parsed.exercises : [];
}
